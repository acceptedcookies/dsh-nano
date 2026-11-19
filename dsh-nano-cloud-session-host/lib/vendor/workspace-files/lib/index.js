import { posix, win32 } from "node:path";
import z from "@deepseek-ai/schemastery";
import { Remote, RemoteError, TypertRemoteService, principalOf } from "@deepseek-ai/dsh-typert-protocol";
import { Deque } from "@deepseek-ai/dsh-deque";
import { readRipgrepLines, spawnRipgrep } from "@deepseek-ai/dsh-util-ripgrep";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sshClientArgs } from "../../session-controller/lib/index.js";
//#region lib/types/changes.js
/**
* Target-scoped filesystem watches and `fs/observed` invalidations for `changes`.
* Each generation sends `ready` after watcher initialization, then reads current
* target metadata for matching queued and live invalidations.
*/
/** Owns target watches, instrumented observations, and every open `changes` generation. */
var WorkspaceChangeFeed = class {
	ctx;
	followers = /* @__PURE__ */ new Set();
	/** @param ctx - Host context carrying the filesystem the observations come from. */
	constructor(ctx) {
		this.ctx = ctx;
		ctx.on("fs/observed", (target, observation) => {
			for (const follower of this.followers) follower.push([target, observation]);
		});
		ctx.effect(() => async () => {
			const followers = [...this.followers];
			await Promise.all(followers.map((follower) => follower.close()));
			this.followers.clear();
		}, "workspace-files.changes");
	}
	/**
	* Open one target watch; directory targets remain inside `workspaceRoot`.
	* @param workspaceRoot - the session's workspace root path.
	* @param path - target path, resolved relative to the workspace root; Host metadata determines its type.
	* @param signal - generation cancellation.
	* @returns `ready` after watching starts, then current metadata for target invalidations.
	*/
	async *follow(workspaceRoot, path, signal) {
		signal.throwIfAborted();
		const follower = new ChangeFollower(() => {
			signal.removeEventListener("abort", cancel);
			this.followers.delete(follower);
		});
		signal = AbortSignal.any([signal, follower.controller.signal]);
		const aborted = () => signal.aborted;
		const cancel = () => {
			follower.close().catch((error) => {
				this.ctx.logger.error(error);
			});
		};
		signal.addEventListener("abort", cancel, { once: true });
		this.followers.add(follower);
		let unwatch;
		try {
			const root = await this.ctx.fs.resolve(workspaceRoot, { signal }).catch((error) => {
				if (aborted()) return void 0;
				throw error;
			});
			if (root === void 0 || aborted() || follower.isClosed) return;
			const target = await this.ctx.fs.resolve(path, {
				cwd: workspaceRoot,
				signal
			}).catch((error) => {
				if (aborted()) return void 0;
				throw error;
			});
			if (target === void 0 || aborted()) return;
			const stat = async () => {
				const info = await this.ctx.fs.stat(target, signal).catch((error) => {
					if (aborted()) return void 0;
					throw error;
				});
				if (info?.type === "directory" && !this.ctx.fs.contains(root, target)) throw new RemoteError("workspace-file/outside-workspace", "Directory is outside the workspace", { path });
				return info;
			};
			await stat();
			if (aborted()) return;
			try {
				unwatch = await this.ctx.fs.watch(target, (error) => {
					if (error !== void 0) follower.fail(error);
					else if (!follower.isClosed) follower.push([target]);
				}, signal);
				if (follower.error !== void 0) throw follower.error;
			} catch (error) {
				if (aborted() && follower.error === void 0) return;
				const failure = follower.error ?? error;
				throw new RemoteError("workspace-file/watch-unsupported", failure instanceof Error ? failure.message : String(failure), { path });
			}
			follower.initialized.resolve(unwatch);
			if (aborted()) return;
			yield { kind: "ready" };
			for await (const [observed] of follower.read()) {
				if (observed.targetKey !== target.targetKey) continue;
				const info = await stat();
				if (aborted()) return;
				const absolutePath = this.ctx.fs.processPath(target);
				yield {
					kind: "change",
					change: info !== void 0 ? {
						absolutePath,
						version: info.version
					} : {
						absolutePath,
						absent: true
					}
				};
			}
		} finally {
			follower.initialized.resolve(unwatch);
			await follower.close();
		}
	}
};
/** One generation's queue: observations wait here until its consumer pulls them. */
var ChangeFollower = class {
	release;
	controller = new AbortController();
	initialized = Promise.withResolvers();
	error;
	queue = new Deque();
	wake;
	closed = false;
	closing;
	constructor(release) {
		this.release = release;
	}
	/** Whether this generation has stopped accepting invalidations. */
	get isClosed() {
		return this.closed;
	}
	push(observed) {
		if (this.closed) return;
		this.queue.pushBack(observed);
		this.wake?.();
	}
	close() {
		if (this.closing !== void 0) return this.closing;
		this.closed = true;
		this.closing = this.initialized.promise.then((unwatch) => unwatch?.()).finally(this.release);
		this.controller.abort();
		this.wake?.();
		return this.closing;
	}
	fail(error) {
		this.error = error;
		this.controller.abort();
	}
	/** Drain until closed or aborted; anything still queued then is dropped with the generation. */
	async *read() {
		while (!this.closed) {
			const observed = this.queue.popFront();
			if (observed !== void 0) {
				yield observed;
				continue;
			}
			await new Promise((resolve) => {
				this.wake = resolve;
			});
			this.wake = void 0;
		}
		if (this.error !== void 0) throw this.error;
	}
};
//#endregion
//#region lib/types/search.js
/** Workspace-relative name and path discovery through packaged ripgrep. */
/** VCS metadata never contributes files or inferred directories. */
const VCS_NAMES = [
	".git",
	".svn",
	".hg",
	".bzr",
	".jj",
	".sl"
];
/** Quote names as literal rg glob components, not patterns. */
function exclusion(path) {
	const literal = path.replace(/[\\*?\[\]{}!]/g, "\\$&");
	return `--glob=!${path.includes("/") ? "/" : ""}${literal}`;
}
/**
* Match names, or relative paths for queries containing `/`, without case.
* Directories derive only from listed files; empty directories and links are
* absent. Results sort by depth, then path, after scanning the bounded file set.
* Native ignore handling and read failures belong to rg: exit 2 reports partial
* results; launch and other execution failures reject with a RemoteError.
* @param subprocess - the composed process spawner, co-located with the filesystem.
* @param spec - validated root, query, filters and process budgets.
* @param signal - cancellation; rejection preserves its exact reason.
* @returns bounded shallow-first matches and independent truncation/incompleteness flags.
*/
async function searchWorkspace(subprocess, spec, signal) {
	const timeout = new AbortController();
	const timer = setTimeout(() => {
		timeout.abort(new RemoteError("workspace-file/search-failed", "Workspace file search timed out; narrow the workspace or increase search.timeoutMs", {}));
	}, spec.timeoutMs);
	const combined = AbortSignal.any([signal, timeout.signal]);
	const needle = spec.query.toLowerCase();
	const byPath = spec.query.includes("/");
	const entries = /* @__PURE__ */ new Map();
	const admit = (path, type) => {
		const name = path.slice(path.lastIndexOf("/") + 1);
		if ((byPath ? path : name).toLowerCase().includes(needle)) entries.set(path, {
			path,
			type
		});
	};
	try {
		combined.throwIfAborted();
		let run;
		let stderr = "";
		try {
			const handle = await spawnRipgrep(subprocess, {
				argv: [
					"--files",
					"--sort=path",
					"--null",
					"--path-separator=/",
					...spec.includeHidden ? ["--hidden"] : [],
					...spec.respectGitignore ? [] : ["--no-ignore"],
					...[...VCS_NAMES, ...spec.excludedPaths].map(exclusion)
				],
				cwd: spec.cwd,
				stdio: {
					stdin: "ignore",
					stdout: "pipe",
					stderr: { maxBytes: spec.stderrMaxBytes }
				},
				graceMs: spec.graceMs,
				signal: combined
			});
			let listed = 0;
			run = await readRipgrepLines(handle, "\0", (path) => {
				if (listed === spec.maxEntries) return false;
				admit(path, "file");
				let end = path.lastIndexOf("/");
				while (end !== -1) {
					admit(path.slice(0, end), "directory");
					end = path.lastIndexOf("/", end - 1);
				}
				listed += 1;
				return true;
			});
			stderr = handle.collected.stderr?.readFrom(0).text.trim() ?? "";
		} catch (cause) {
			signal.throwIfAborted();
			timeout.signal.throwIfAborted();
			throw new RemoteError("workspace-file/search-failed", "Could not launch or read workspace file search; the subprocess provider must be able to execute the packaged ripgrep binary", {}, { cause });
		}
		const { outcome, stopped } = run;
		combined.throwIfAborted();
		if (!stopped && (outcome.signal !== null || outcome.exitCode !== 0 && outcome.exitCode !== 1 && outcome.exitCode !== 2)) throw new RemoteError("workspace-file/search-failed", `Workspace file search exited with code ${outcome.exitCode} and signal ${outcome.signal}; check the subprocess provider${stderr.length > 0 ? `: ${stderr}` : ""}`, {});
		const matches = [...entries.values()].sort((a, b) => {
			return a.path.split("/").length - b.path.split("/").length || (a.path < b.path ? -1 : 1);
		});
		return {
			matches: matches.slice(0, spec.maxResults),
			truncated: matches.length > spec.maxResults,
			incomplete: stopped || outcome.exitCode === 2
		};
	} finally {
		clearTimeout(timer);
	}
}
//#endregion
//#region lib/types/external-ssh.js
/**
* Read-only file access for granted external Sessions over SSH.
*
* The transport is a fixed `/usr/bin/ssh` invocation — BatchMode, the
* operator's own known-hosts file, no agent or forwarding — running one
* fixed Python stdlib helper with the request on stdin as JSON. Nothing a
* browser or provider supplies reaches a remote shell: the only variable
* argv content is the grant's verified endpoint, user, key, and root.
*
* The helper anchors every walk at the grant root with directory FDs and
* O_NOFOLLOW on each component, so a symlink — intermediate or final — a
* special file, `..`, or an absolute path can never escape the root.
*/
const execFileAsync = promisify(execFile);
/** Fixed remote helper: read-only, fd-anchored, stdlib only. */
const HELPER_B64 = Buffer.from(String.raw`import base64, json, os, stat, sys

NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
NONBLOCK = getattr(os, "O_NONBLOCK", 0)
DIR = os.O_RDONLY | os.O_DIRECTORY | NOFOLLOW
FILE = os.O_RDONLY | NOFOLLOW | NONBLOCK

def fail(kind, message):
    json.dump({"ok": False, "error": {"kind": kind, "message": message}}, sys.stdout)
    sys.exit(0)

def descend(fd, name):
    if name in ("", ".", "..") or "/" in name or "\x00" in name:
        fail("confined", "illegal path component")
    try:
        child = os.open(name, DIR, dir_fd=fd)
    except FileNotFoundError:
        fail("not-found", name)
    except OSError as error:
        fail("io", str(error))
    os.close(fd)
    return child

def anchor(root):
    # Walk the approved root component by component from "/" so a symlink
    # anywhere inside it is refused instead of followed, and the process
    # never leaves the anchor via chdir.
    if not root.startswith("/") or "\x00" in root:
        fail("confined", "root must be an absolute path")
    fd = os.open("/", DIR)
    for name in root.split("/"):
        if name not in ("", "."):
            fd = descend(fd, name)
    return fd

def components(path):
    if path in ("", "/"):
        return []
    if path.startswith("/") or "\x00" in path:
        fail("confined", "path must stay inside the root")
    parts = path.split("/")
    if any(part in ("", ".", "..") for part in parts):
        fail("confined", "path must stay inside the root")
    return parts

def leaf(fd, name, flags):
    if name in ("", ".", "..") or "/" in name or "\x00" in name:
        fail("confined", "illegal path component")
    try:
        child = os.open(name, flags, dir_fd=fd)
    except FileNotFoundError:
        fail("not-found", name)
    except OSError as error:
        fail("io", str(error))
    os.close(fd)
    return child

def main():
    request = json.load(sys.stdin)
    max_bytes = int(request.get("maxBytes", 1 << 20))
    max_entries = int(request.get("maxEntries", 500))
    root = anchor(request["root"])
    parts = components(request.get("path", ""))
    op = request["op"]
    if op == "stat":
        fd = root
        for name in parts[:-1] if parts else []:
            fd = descend(fd, name)
        if parts:
            fd = leaf(fd, parts[-1], FILE)
        info = os.fstat(fd)
        json.dump({"ok": True, "result": {
            "kind": "directory" if stat.S_ISDIR(info.st_mode) else ("file" if stat.S_ISREG(info.st_mode) else "other"),
            "size": info.st_size, "mtime": int(info.st_mtime * 1000), "dev": info.st_dev, "ino": info.st_ino}}, sys.stdout)
    elif op == "list":
        fd = root
        for name in parts:
            fd = descend(fd, name)
        entries = []
        for name in sorted(os.listdir(fd)):
            try:
                info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            except OSError:
                continue
            kind = "directory" if stat.S_ISDIR(info.st_mode) else ("file" if stat.S_ISREG(info.st_mode) else "other")
            entries.append({"name": name, "kind": kind, "size": info.st_size, "mtime": int(info.st_mtime * 1000)})
        json.dump({"ok": True, "result": {"entries": entries[:max_entries], "truncated": len(entries) > max_entries}}, sys.stdout)
    elif op == "bytes":
        if not parts:
            fail("not-file", "target is not a regular file")
        fd = root
        for name in parts[:-1]:
            fd = descend(fd, name)
        fd = leaf(fd, parts[-1], FILE)
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            fail("not-file", "target is not a regular file")
        offset = int(request.get("offset") or 0)
        length = request.get("length")
        if length is None:
            if info.st_size - offset > max_bytes:
                fail("too-large", "file exceeds the complete-read limit")
            want = max_bytes
        else:
            want = min(int(length), max_bytes)
        os.lseek(fd, offset, os.SEEK_SET)
        data = b""
        while len(data) < want:
            chunk = os.read(fd, min(65536, want - len(data)))
            if not chunk:
                break
            data += chunk
        json.dump({"ok": True, "result": {
            "bytes": base64.b64encode(data).decode("ascii"), "eof": offset + len(data) >= info.st_size,
            "size": info.st_size, "mtime": int(info.st_mtime * 1000), "dev": info.st_dev, "ino": info.st_ino}}, sys.stdout)
    else:
        fail("invalid", "unknown op")

main()
`, "utf8").toString("base64");
/** One bounded non-PTY SSH read; the request body is JSON on stdin, never argv. */
async function invoke(grant, request, signal) {
	const child = execFileAsync("/usr/bin/ssh", [...sshClientArgs(grant), `python3 -c 'exec(__import__("base64").b64decode("${HELPER_B64}").decode())'`], {
		timeout: 3e4,
		maxBuffer: 8 * 1024 * 1024,
		signal,
		env: { PATH: "/usr/bin:/bin" }
	});
	child.child.stdin?.end(JSON.stringify({
		root: grant.root,
		...request
	}));
	const { stdout } = await child;
	const parsed = JSON.parse(stdout);
	if (parsed.ok === true && parsed.result !== void 0) return parsed.result;
	const kind = parsed.error?.kind;
	if (kind === "not-found") throw new RemoteError("workspace-file/not-found", String(parsed.error?.message ?? "not found"), { path: String(request.path ?? "") });
	if (kind === "confined") throw new RemoteError("workspace-file/outside-workspace", String(parsed.error?.message ?? "outside workspace"), { path: String(request.path ?? "") });
	if (kind === "not-file") throw new RemoteError("workspace-file/not-regular-file", String(parsed.error?.message ?? "not a regular file"), {
		path: String(request.path ?? ""),
		kind: "other"
	});
	if (kind === "too-large") throw new RemoteError("workspace-file/too-large", String(parsed.error?.message ?? "too large"), {
		path: String(request.path ?? ""),
		limit: 0
	});
	throw new RemoteError("workspace-file/external-unavailable", `external workspace read failed: ${String(parsed.error?.message ?? "unknown")}`, {});
}
/**
* Bind the read-only SSH backend to one verified grant. The returned backend
* reads only through the grant; it has no local filesystem and no fallback.
* @param grant - the exact binding approved for this external Session id.
*/
function createExternalFileBackend(grant) {
	return {
		stat: (path, signal) => invoke(grant, {
			op: "stat",
			path
		}, signal),
		list: (path, maxEntries, signal) => invoke(grant, {
			op: "list",
			path,
			maxEntries
		}, signal),
		bytes: async (path, range, maxBytes, signal) => {
			const result = await invoke(grant, {
				op: "bytes",
				path,
				maxBytes,
				offset: range.offset ?? 0,
				length: range.length
			}, signal);
			return {
				...result,
				data: new Uint8Array(Buffer.from(result.bytes, "base64"))
			};
		}
	};
}
//#endregion
//#region lib/types/index.js
/**
* Workspace file service: read-only file previews, workspace directory
* listings, workspace-wide name and path search, and the
* filesystem-observation change feed, exposed as `workspaceFiles`.
*
* File reads follow the composed filesystem's read access, including paths
* outside the workspace. The selected Session header supplies the base for
* relative paths, with the sandbox policy root as its no-cwd fallback, not a
* read-containment restriction. Directory listings, searches, and change
* observations remain workspace-scoped; a search reports workspace-relative
* paths. File-kind checks and configured read caps apply to
* every preview; this service exposes no mutations.
*
* A page is cut from `streamText`, which decodes and rejects non-UTF-8 as it
* goes, so the file is read only up to the first character past the page and
* never held whole in memory; the NUL scan runs on the page itself.
*
* This is NOT modelled on `session.openWorkspacePath`. That endpoint hands a
* path to the local opener and leaves the effect on the machine; this one sends
* file content across the wire, which is a different level of exposure.
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** The byte text never carries: its presence marks a page as binary. */
const NUL = String.fromCharCode(0);
/** Refuse anything the wire schema admits as a number but a window cannot use: only safe integers index a file. */
function integerAtLeast(value, min, name) {
	if (!Number.isSafeInteger(value) || value < min) throw new RemoteError("gateway/bad-request", `${name} must be a safe integer of at least ${min}`, {});
	return value;
}
/**
* Cut lines `offset` through `offset + limit - 1` from decoded chunks, stopping
* at the first character past the page so the rest of the file is never read.
* Lines before the page are counted, not kept, and the page is refused the
* moment its bytes exceed `maxBytes`, so one giant line cannot grow memory past
* the cap either.
*/
async function cutPage(chunks, offset, limit, maxBytes, path) {
	const last = offset + limit - 1;
	const lines = [];
	let current = "";
	let bytes = 0;
	let lineNumber = 1;
	const admit = (size) => {
		bytes += size;
		if (bytes > maxBytes) throw new RemoteError("workspace-file/too-large", `lines ${offset}-${last} of "${path}" exceed the ${maxBytes} byte cap`, {
			path,
			limit: maxBytes
		});
	};
	const complete = () => {
		if (lines.length > 0) admit(1);
		lines.push(current);
		current = "";
	};
	for await (const chunk of chunks) {
		let position = 0;
		while (position < chunk.length) {
			if (lineNumber > last) return {
				text: lines.join("\n"),
				lines: lines.length,
				eof: false
			};
			const newline = chunk.indexOf("\n", position);
			const segment = newline === -1 ? chunk.slice(position) : chunk.slice(position, newline);
			if (lineNumber >= offset) {
				admit(Buffer.byteLength(segment, "utf8"));
				current += segment;
			}
			if (newline === -1) break;
			if (lineNumber >= offset) complete();
			lineNumber += 1;
			position = newline + 1;
		}
	}
	if (current.length > 0) complete();
	return {
		text: lines.join("\n"),
		lines: lines.length,
		eof: true
	};
}
/**
* Workspace path of `target` relative to `root`, derived from the two canonical
* `file:` URIs so the answer is `/`-joined on every platform. Empty for the root.
*/
function workspacePathOf(rootUrl, targetUrl) {
	const root = new URL(rootUrl).pathname.replace(/\/+$/, "");
	const target = new URL(targetUrl).pathname;
	if (target === root) return "";
	return target.slice(root.length + 1).split("/").map(decodeURIComponent).join("/");
}
/** Strip the resolved child target: the wire carries names and metadata only. */
function directoryEntry(child) {
	return {
		name: child.name,
		type: child.type,
		...child.size === void 0 ? {} : { size: child.size }
	};
}
/** Host Remote file reads and workspace directory observations over the composed filesystem. */
let WorkspaceFiles = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _read_decorators;
	let _readBytes_decorators;
	let _stat_decorators;
	let _list_decorators;
	let _search_decorators;
	let _changes_decorators;
	return class WorkspaceFiles extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_read_decorators = [Remote];
			_readBytes_decorators = [Remote];
			_stat_decorators = [Remote];
			_list_decorators = [Remote];
			_search_decorators = [Remote];
			_changes_decorators = [Remote({ mode: "stream" })];
			__esDecorate(this, null, _read_decorators, {
				kind: "method",
				name: "read",
				static: false,
				private: false,
				access: {
					has: (obj) => "read" in obj,
					get: (obj) => obj.read
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readBytes_decorators, {
				kind: "method",
				name: "readBytes",
				static: false,
				private: false,
				access: {
					has: (obj) => "readBytes" in obj,
					get: (obj) => obj.readBytes
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _stat_decorators, {
				kind: "method",
				name: "stat",
				static: false,
				private: false,
				access: {
					has: (obj) => "stat" in obj,
					get: (obj) => obj.stat
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _search_decorators, {
				kind: "method",
				name: "search",
				static: false,
				private: false,
				access: {
					has: (obj) => "search" in obj,
					get: (obj) => obj.search
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _changes_decorators, {
				kind: "method",
				name: "changes",
				static: false,
				private: false,
				access: {
					has: (obj) => "changes" in obj,
					get: (obj) => obj.changes
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		config = __runInitializers(this, _instanceExtraInitializers);
		static inject = [
			"fs",
			"sandboxPolicy",
			"sessions",
			"typert"
		];
		static Config = z.object({
			maxBytes: z.number().step(1).min(1).default(2 * 1024 * 1024),
			maxFileBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER - 1).default(32 * 1024 * 1024),
			maxLines: z.number().step(1).min(1).default(5e3),
			maxEntries: z.number().step(1).min(1).default(2e3),
			search: z.object({
				maxResults: z.number().step(1).min(1).default(512),
				maxEntries: z.number().step(1).min(1).default(1e5),
				graceMs: z.number().step(1).min(1).max(2147483647).default(3e3),
				timeoutMs: z.number().step(1).min(1).max(2147483647).default(3e4),
				stderrMaxBytes: z.number().step(1).min(1).default(65536)
			})
		});
		feed;
		/**
		* @param ctx - Host context carrying the filesystem and the sandbox policy.
		* @param config - deployment caps on one page, one listing, or one search.
		*/
		constructor(ctx, config) {
			super(ctx, "workspaceFiles");
			this.config = config;
			this.feed = new WorkspaceChangeFeed(ctx);
			ctx.inject(["sessions", "typert"], (scope) => {
				scope.typert.lookups.register("workspaceFileScope", {
					parameter: "workspaceFileScope",
					wire: "workspaceFileScopeId",
					resource: "session",
					hostTypeSymbol: "@deepseek-ai/dsh-api-workspace-files#WorkspaceFileScope",
					wireTypeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
					resolve: async (sessionId) => {
						if (sessionId.startsWith("external:")) {
							const controller = scope.get("sessionController");
							const bound = controller?.externalSessions?.grantOf(sessionId);
							if (controller === void 0 || bound === void 0) return void 0;
							return {
								sessionId,
								workspaceRoot: bound.grant.root,
								external: {
									backend: createExternalFileBackend(bound.grant),
									signal: bound.entry.signal,
									current: () => controller.externalSessions.current(sessionId, bound.entry)
								}
							};
						}
						const live = scope.sessions.get(sessionId)?.header;
						const stored = live === void 0 ? await scope.get("sessionPersistence")?.stat(sessionId) : void 0;
						const header = live ?? stored?.header;
						if (header === void 0) return void 0;
						return {
							sessionId,
							workspaceRoot: header.cwd ?? scope.sandboxPolicy.workspaceRoot
						};
					}
				});
			});
		}
		/**
		* Route an external scope into its granted backend.
		* @returns the bound external context, or `undefined` for local scopes.
		* @throws RemoteError `session/not-found` for every non-owner caller —
		*   external resources are owner-only, so a peer cannot probe a granted id.
		*/
		externalScope(workspaceFileScope) {
			if (workspaceFileScope.external === void 0) return void 0;
			if (principalOf(this.ctx.invocation) !== void 0) throw new RemoteError("session/not-found", `session "${workspaceFileScope.sessionId}" not found`, { sessionId: workspaceFileScope.sessionId });
			return workspaceFileScope.external;
		}
		/**
		* Run one external read against the merged caller-plus-lifetime signal and
		* refuse to publish a result the revoke raced past.
		*/
		async externalGuarded(workspaceFileScope, signal, run) {
			const external = this.externalScope(workspaceFileScope);
			if (external === void 0) throw new RemoteError("session/not-found", `session "${workspaceFileScope.sessionId}" not found`, { sessionId: workspaceFileScope.sessionId });
			if (external.signal.aborted || !external.current()) throw new RemoteError("session/not-found", `session "${workspaceFileScope.sessionId}" not found`, { sessionId: workspaceFileScope.sessionId });
			signal.throwIfAborted();
			const result = await run(external, AbortSignal.any([signal, external.signal]));
			if (!external.current()) throw new RemoteError("session/not-found", `session "${workspaceFileScope.sessionId}" not found`, { sessionId: workspaceFileScope.sessionId });
			return result;
		}
		/**
		* Wire path projected to the helper's root-relative form: absolute paths
		* must sit under the grant root, relative ones pass through for the
		* helper's own component checks.
		* @param workspaceFileScope - the granted external scope.
		* @param path - absolute path or workspace-relative path on the wire.
		* @returns path relative to the grant root, empty for the root itself.
		* @throws RemoteError `workspace-file/outside-workspace` when absolute and outside.
		*/
		static externalRelative(workspaceFileScope, path) {
			if (!path.startsWith("/")) return path;
			const root = workspaceFileScope.workspaceRoot.replace(/\/+$/, "");
			if (path === root) return "";
			if (path.startsWith(`${root}/`)) return path.slice(root.length + 1);
			throw new RemoteError("workspace-file/outside-workspace", `"${path}" is outside the workspace`, { path });
		}
		/** The path a wire caller supplied, projected to the grant root for the `absolutePath` field. */
		static externalPath(workspaceFileScope, path) {
			const relative = WorkspaceFiles.externalRelative(workspaceFileScope, path);
			return relative === "" ? workspaceFileScope.workspaceRoot : `${workspaceFileScope.workspaceRoot}/${relative}`;
		}
		/** Opaque version from the helper's identity facts; mtime changes invalidate readers. */
		static externalVersion(stat) {
			return `${stat.dev}:${stat.ino}:${stat.mtime}`;
		}
		/**
		* Read one page of lines from a UTF-8 file readable by the filesystem backend.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - absolute path or path relative to the workspace root; files outside it are allowed.
		* @param range - the line window; omitted fields take the page defaults.
		* @param signal - caller cancellation.
		* @returns the page, the file's version at the stat before it, and whether it reaches the last line.
		*/
		async read(workspaceFileScope, path, range, signal) {
			if (workspaceFileScope.external !== void 0) {
				const { offset, limit } = this.resolvePage(range);
				return this.externalGuarded(workspaceFileScope, signal, async (external, merged) => {
					const raw = await external.backend.bytes(WorkspaceFiles.externalRelative(workspaceFileScope, path), {}, this.config.maxFileBytes, merged);
					const decoded = new TextDecoder("utf-8", { fatal: false }).decode(raw.data);
					if (decoded.includes(NUL)) throw new RemoteError("workspace-file/not-text", `"${path}" contains NUL bytes`, { path });
					const all = decoded.split("\n");
					const start = Math.min(offset - 1, all.length);
					const pageLines = all.slice(start, start + limit);
					return {
						absolutePath: WorkspaceFiles.externalPath(workspaceFileScope, path),
						version: WorkspaceFiles.externalVersion(raw),
						bytes: raw.size,
						offset,
						text: pageLines.join("\n"),
						lines: pageLines.length,
						eof: start + pageLines.length >= all.length
					};
				});
			}
			const { offset, limit } = this.resolvePage(range);
			const { target, info } = await this.locateFile(workspaceFileScope, path, signal);
			const page = await this.cutPage(target, offset, limit, signal, path);
			if (page.text.includes(NUL)) throw new RemoteError("workspace-file/not-text", `"${path}" contains NUL bytes`, { path });
			return {
				...this.statOf(target, info),
				offset,
				text: page.text,
				lines: page.lines,
				eof: page.eof
			};
		}
		/**
		* Read a complete regular file or one byte range without text decoding.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - target path, absolute or workspace-relative; relative to the base file's directory when provided.
		* @param options - optional base file and range; without a range the complete-file cap applies.
		* @param signal - caller cancellation.
		* @returns native bytes with the file's version and size at the preceding stat, byte offset, and EOF marker.
		*/
		async readBytes(workspaceFileScope, path, options, signal) {
			const window = options.range === void 0 ? void 0 : this.resolveWindow(options.range, path);
			if (workspaceFileScope.external !== void 0) {
				const window = options.range === void 0 ? {
					offset: 0,
					length: this.config.maxBytes
				} : this.resolveWindow(options.range, path);
				return this.externalGuarded(workspaceFileScope, signal, async (external, merged) => {
					const read = await external.backend.bytes(WorkspaceFiles.externalRelative(workspaceFileScope, path), options.range === void 0 ? {} : window, this.config.maxFileBytes, merged);
					return {
						absolutePath: WorkspaceFiles.externalPath(workspaceFileScope, path),
						version: WorkspaceFiles.externalVersion(read),
						bytes: read.size,
						offset: options.range?.offset ?? 0,
						data: read.data,
						eof: read.eof
					};
				});
			}
			const resolved = options.baseFile === void 0 ? path : await this.relativePath(workspaceFileScope, options.baseFile, path, signal);
			const { target, info } = await this.locateFile(workspaceFileScope, resolved, signal);
			if (window !== void 0) {
				const { offset, length } = window;
				const data = await this.ctx.fs.readByteRange(target, window, signal);
				const eof = info.size === void 0 ? data.length < length : offset + data.length >= info.size;
				return {
					...this.statOf(target, info),
					offset,
					data,
					eof
				};
			}
			const limit = this.config.maxFileBytes;
			const data = await this.ctx.fs.readBytes(target, signal, limit).catch((cause) => {
				if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "FS_TOO_LARGE") throw new RemoteError("workspace-file/too-large", `"${path}" exceeds the ${limit} byte full-file cap`, {
					path,
					limit
				}, { cause });
				throw cause;
			});
			return {
				...this.statOf(target, info),
				offset: 0,
				data,
				eof: true
			};
		}
		/**
		* Report one regular file's identity, version, and size without its content.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - absolute path or path relative to the workspace root; files outside it are allowed.
		* @param signal - caller cancellation.
		* @returns the file's absolute path, current version, and byte size.
		*/
		async stat(workspaceFileScope, path, signal) {
			if (workspaceFileScope.external !== void 0) return this.externalGuarded(workspaceFileScope, signal, async (external, merged) => {
				const info = await external.backend.stat(WorkspaceFiles.externalRelative(workspaceFileScope, path), merged);
				if (info.kind !== "file") throw new RemoteError("workspace-file/not-regular-file", `"${path}" is a ${info.kind}`, {
					path,
					kind: info.kind
				});
				return {
					absolutePath: WorkspaceFiles.externalPath(workspaceFileScope, path),
					version: WorkspaceFiles.externalVersion(info),
					bytes: info.size
				};
			});
			const { target, info } = await this.locateFile(workspaceFileScope, path, signal);
			return this.statOf(target, info);
		}
		/**
		* List the direct children of one directory inside the Session's workspace.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - workspace path, absolute or relative to the workspace root.
		* @param signal - caller cancellation.
		* @returns the directory's children in the backend's stable name order, bounded by the entry cap.
		*/
		async list(workspaceFileScope, path, signal) {
			if (workspaceFileScope.external !== void 0) return this.externalGuarded(workspaceFileScope, signal, async (external, merged) => {
				const listing = await external.backend.list(WorkspaceFiles.externalRelative(workspaceFileScope, path), this.config.maxEntries, merged);
				return {
					path: path.replace(/^\/+/, ""),
					entries: listing.entries.map((entry) => ({
						name: entry.name,
						type: entry.kind === "other" ? "other" : entry.kind,
						...entry.kind === "file" ? { size: entry.size } : {}
					})),
					truncated: listing.truncated
				};
			});
			const { root, workspaceRoot, entry } = await this.inspect(workspaceFileScope, path, signal);
			if (entry.type !== "directory" && entry.type !== "symlink") throw new RemoteError("workspace-file/not-directory", `"${path}" is a ${entry.type}`, {
				path,
				kind: entry.type
			});
			const target = await this.confine(root, workspaceRoot, path, signal);
			if (entry.type === "symlink") {
				if ((await this.ctx.fs.stat(target, signal))?.type !== "directory") throw new RemoteError("workspace-file/not-directory", `"${path}" does not resolve to a directory`, {
					path,
					kind: "symlink"
				});
			}
			const children = await this.ctx.fs.listDir(target, signal);
			return {
				path: workspacePathOf(this.ctx.fs.fileUrl(root), this.ctx.fs.fileUrl(target)),
				entries: children.slice(0, this.config.maxEntries).map(directoryEntry),
				truncated: children.length > this.config.maxEntries
			};
		}
		/**
		* Search files and their inferred ancestor directories with packaged ripgrep.
		* Native ignore rules apply unless disabled; VCS metadata, symlinks and empty
		* directories are absent. Within the bounded set of listed files, matches
		* sort by depth, then workspace-relative path.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param request - the query, literal exclusions, and hidden/ignore switches.
		* @param signal - caller cancellation, forwarded to the subprocess; rejection preserves its reason.
		* @returns matches capped by search.maxResults; incomplete marks excess rg files or exit 2.
		* @throws RemoteError `gateway/bad-request`: the query is blank.
		* @throws RemoteError `workspace-file/not-found`: the workspace root does not exist.
		* @throws RemoteError `workspace-file/not-directory`: the workspace root is not a directory.
		* @throws RemoteError `workspace-file/search-failed`: subprocess is missing, rg cannot launch or execute, or the search times out.
		*/
		async search(workspaceFileScope, request, signal) {
			const query = request.query.trim();
			if (query.length === 0) throw new RemoteError("gateway/bad-request", "query must not be blank", {});
			signal.throwIfAborted();
			if (workspaceFileScope.external !== void 0) {
				this.externalScope(workspaceFileScope);
				throw new RemoteError("workspace-file/search-failed", "search is unavailable on external workspaces; use list and read", {});
			}
			const { workspaceRoot } = workspaceFileScope;
			const root = await this.ctx.fs.resolve(workspaceRoot, { signal });
			const info = await this.ctx.fs.stat(root, signal);
			if (info === void 0) throw new RemoteError("workspace-file/not-found", `no entry at "${workspaceRoot}"`, { path: workspaceRoot });
			if (info.type !== "directory") throw new RemoteError("workspace-file/not-directory", `"${workspaceRoot}" is a ${info.type}`, {
				path: workspaceRoot,
				kind: info.type
			});
			const subprocess = this.ctx.get("subprocess");
			if (subprocess === void 0) throw new RemoteError("workspace-file/search-failed", "Workspace file search requires a subprocess provider", {});
			return searchWorkspace(subprocess, {
				cwd: this.ctx.fs.processPath(root),
				query,
				excludedPaths: request.excludedPaths,
				includeHidden: request.includeHidden,
				respectGitignore: request.respectGitignore,
				...this.config.search
			}, signal);
		}
		/**
		* Watch one file or a directory's direct entries in the Session's filesystem.
		* Files use the backend's read authority; directories remain workspace-scoped.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - target path; the Host determines its type and confines directories to the workspace.
		* @param signal - generation cancellation.
		* @returns `ready` once the target watch is active, then current metadata for queued and live invalidations.
		* @throws RemoteError when watching is unavailable or a directory is outside the workspace.
		*/
		changes(workspaceFileScope, path, signal) {
			if (workspaceFileScope.external !== void 0) {
				this.externalScope(workspaceFileScope);
				throw new RemoteError("workspace-file/watch-unsupported", "watching is unavailable on external workspaces; relist to refresh", { path });
			}
			return this.feed.follow(workspaceFileScope.workspaceRoot, path, signal);
		}
		async relativePath(scope, baseFile, path, signal) {
			const relative = path.replace(/\\/g, "/");
			if (relative.length === 0 || relative.startsWith("/") || /^[a-z][a-z\d+.-]*:/iu.test(relative) || relative.includes(NUL)) throw new RemoteError("gateway/bad-request", "path must be relative when baseFile is provided", {});
			const { target } = await this.locateFile(scope, baseFile, signal);
			const absolute = this.ctx.fs.processPath(target);
			const paths = absolute.startsWith("/") ? posix : win32;
			return paths.resolve(paths.dirname(absolute), relative);
		}
		/** Apply the page defaults and caps here, so the request never carries them implicitly. */
		resolvePage(range) {
			const offset = range.offset === void 0 ? 1 : integerAtLeast(range.offset, 1, "offset");
			const limit = range.limit === void 0 ? this.config.maxLines : integerAtLeast(range.limit, 1, "limit");
			if (limit > this.config.maxLines) throw new RemoteError("gateway/bad-request", `limit must be at most ${this.config.maxLines}`, {});
			return {
				offset,
				limit
			};
		}
		/** Apply the byte-window defaults and cap; a window above the cap is refused, not shortened. */
		resolveWindow(range, path) {
			const offset = range.offset === void 0 ? 0 : integerAtLeast(range.offset, 0, "offset");
			const length = range.length === void 0 ? this.config.maxBytes : integerAtLeast(range.length, 1, "length");
			if (offset + length > Number.MAX_SAFE_INTEGER) throw new RemoteError("gateway/bad-request", "offset plus length must stay a safe integer", {});
			if (length > this.config.maxBytes) throw new RemoteError("workspace-file/too-large", `${length} bytes of "${path}" exceed the ${this.config.maxBytes} byte cap`, {
				path,
				limit: this.config.maxBytes
			});
			return {
				offset,
				length
			};
		}
		/**
		* Inspect the requested path itself before resolution follows its final
		* component. Directory containment is checked separately by `list`.
		*/
		async inspect(workspaceFileScope, path, signal) {
			if (path.length === 0) throw new RemoteError("gateway/bad-request", "path is required", {});
			const { workspaceRoot } = workspaceFileScope;
			const root = await this.ctx.fs.resolve(workspaceRoot, { signal });
			const entry = await this.ctx.fs.lstat(path, { cwd: workspaceRoot }, signal);
			if (entry === void 0) throw new RemoteError("workspace-file/not-found", `no entry at "${path}"`, { path });
			return {
				root,
				workspaceRoot,
				entry
			};
		}
		/** Resolve an inspected path and refuse it unless the workspace contains it. */
		async confine(root, workspaceRoot, path, signal) {
			const target = await this.ctx.fs.resolve(path, {
				cwd: workspaceRoot,
				signal
			});
			if (!this.ctx.fs.contains(root, target)) throw new RemoteError("workspace-file/outside-workspace", `"${path}" is outside the workspace`, { path });
			return target;
		}
		/**
		* All gates for a regular file, ending in the one stat that names its version
		* and size. The stat re-checks what `lstat` saw: the file may have gone or
		* changed kind in between.
		*/
		async locateFile(workspaceFileScope, path, signal) {
			const { workspaceRoot, entry } = await this.inspect(workspaceFileScope, path, signal);
			if (entry.type !== "file") throw new RemoteError("workspace-file/not-regular-file", `"${path}" is a ${entry.type}`, {
				path,
				kind: entry.type
			});
			const target = await this.ctx.fs.resolve(path, {
				cwd: workspaceRoot,
				signal
			});
			const info = await this.ctx.fs.stat(target, signal);
			if (info === void 0) throw new RemoteError("workspace-file/not-found", `no entry at "${path}"`, { path });
			if (info.type !== "file") throw new RemoteError("workspace-file/not-regular-file", `"${path}" is a ${info.type}`, {
				path,
				kind: info.type
			});
			return {
				target,
				info
			};
		}
		statOf(target, info) {
			return {
				absolutePath: this.ctx.fs.processPath(target),
				version: info.version,
				...info.size === void 0 ? {} : { bytes: info.size }
			};
		}
		/** Stream the file as text and cut the page, classifying the backend's non-text refusal. */
		async cutPage(target, offset, limit, signal, path) {
			try {
				return await cutPage(await this.ctx.fs.streamText(target, signal), offset, limit, this.config.maxBytes, path);
			} catch (error) {
				if (isNotTextRefusal(error)) throw new RemoteError("workspace-file/not-text", `"${path}" is not UTF-8 text`, { path }, { cause: error });
				throw error;
			}
		}
	};
})();
/**
* The backend's non-text refusal, recognized by its code alone: the error class
* belongs to whichever `dsh-fs` instance the provider loaded, so no class
* identity is shared across the package boundary.
*/
function isNotTextRefusal(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "FS_NOT_TEXT";
}
//#endregion
export { WorkspaceFiles, WorkspaceFiles as default };

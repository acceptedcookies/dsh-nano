window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/client/index.js
  var import_react8 = __toESM(__require("react"), 1);

  // src/client/body.js
  var import_react6 = __toESM(__require("react"), 1);

  // src/client/dialogs.js
  var import_react = __toESM(__require("react"), 1);
  var { useEffect, useRef } = import_react.default;
  function useDialogFocus(ref, onEscape) {
    useEffect(() => {
      const node = ref.current;
      if (node === null) return void 0;
      const previous = document.activeElement;
      const focusable = () => [...node.querySelectorAll('input, textarea, button, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled && item.offsetParent !== null);
      const first = focusable()[0];
      first?.focus();
      const onKey = (event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onEscape();
          return;
        }
        if (event.key !== "Tab") return;
        const items = focusable();
        if (items.length === 0) return;
        const head = items[0];
        const tail = items[items.length - 1];
        if (event.shiftKey && document.activeElement === head) {
          event.preventDefault();
          tail.focus();
        } else if (!event.shiftKey && document.activeElement === tail) {
          event.preventDefault();
          head.focus();
        }
      };
      node.addEventListener("keydown", onKey);
      return () => {
        node.removeEventListener("keydown", onKey);
        if (previous instanceof HTMLElement) previous.focus();
      };
    }, [ref, onEscape]);
  }
  function Dialog({ copy, title, children, confirmDisabled, busy, error, onConfirm, onCancel, confirmLabel }) {
    const ref = useRef(null);
    useDialogFocus(ref, onCancel);
    return import_react.default.createElement(
      "div",
      { className: "nxe-mask", role: "presentation", onMouseDown: (event) => {
        if (event.target === event.currentTarget) onCancel();
      } },
      import_react.default.createElement(
        "div",
        {
          className: "nxe-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": title,
          ref
        },
        import_react.default.createElement("h2", null, title),
        children,
        error === void 0 ? null : import_react.default.createElement("p", { className: "nxe-dialog-error", role: "alert" }, error),
        import_react.default.createElement(
          "div",
          { className: "nxe-dialog-actions" },
          import_react.default.createElement("button", { type: "button", className: "nxe-btn", onClick: onCancel }, copy.cancel),
          // The confirming button is last and never the initially focused element: the input takes focus.
          import_react.default.createElement("button", {
            type: "button",
            className: "nxe-btn",
            "data-primary": "true",
            disabled: confirmDisabled === true || busy === true,
            onClick: onConfirm
          }, confirmLabel ?? copy.confirm)
        )
      )
    );
  }
  function CommitDialog({ copy, files, busy, error, onConfirm, onCancel }) {
    const [message, setMessage] = import_react.default.useState("");
    const empty = message.trim() === "";
    return import_react.default.createElement(
      Dialog,
      {
        copy,
        title: copy.commitTitle,
        confirmLabel: copy.commit,
        confirmDisabled: empty,
        busy,
        error,
        onConfirm: () => onConfirm(message),
        onCancel
      },
      import_react.default.createElement("p", null, copy.commitBody(files.length)),
      import_react.default.createElement("ul", { className: "nxe-dialog-changed" }, files.slice(0, 40).map((file) => import_react.default.createElement("li", { key: file.path, title: file.path }, `${file.status} ${file.path}`))),
      import_react.default.createElement("label", { htmlFor: "nxe-commit-message", style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, copy.commitMessage),
      import_react.default.createElement("textarea", {
        id: "nxe-commit-message",
        value: message,
        placeholder: copy.commitPlaceholder,
        onChange: (event) => setMessage(event.currentTarget.value)
      })
    );
  }
  function RenameDialog({ copy, currentName, busy, error, onConfirm, onCancel }) {
    const [name, setName] = import_react.default.useState(currentName);
    const invalid = name.trim() === "";
    return import_react.default.createElement(
      Dialog,
      {
        copy,
        title: copy.renameTitle,
        busy,
        error,
        confirmDisabled: invalid,
        onConfirm: () => onConfirm(name),
        onCancel
      },
      import_react.default.createElement("p", null, copy.renameBody(currentName)),
      import_react.default.createElement("input", {
        type: "text",
        value: name,
        spellCheck: false,
        autoComplete: "off",
        onChange: (event) => setName(event.currentTarget.value),
        onKeyDown: (event) => {
          if (event.key === "Enter" && !invalid) {
            event.preventDefault();
            onConfirm(name);
          }
        }
      })
    );
  }

  // src/client/accessory.js
  var import_react2 = __toESM(__require("react"), 1);
  function createAccessory(api) {
    return function Accessory({ entry }) {
      const copy = api.copy();
      const status = api.statusOf(entry.path);
      const ignored = api.ignoredOf(entry.path);
      const link = api.linkOf(entry.path);
      const isFile = entry.meta?.kind !== "directory";
      const folderStatus = isFile ? void 0 : api.folderStatusOf(entry.path);
      const showGit = api.showGit() && !ignored;
      return import_react2.default.createElement(
        "span",
        { className: "nxe-acc" },
        link === void 0 ? null : import_react2.default.createElement("span", {
          className: "nxe-acc-link",
          title: link ? copy.symlinkOutside : copy.symlinkBadge,
          "aria-label": link ? copy.symlinkOutside : copy.symlinkBadge,
          "data-nxe-symlink": link ? "outside" : "inside"
        }, import_react2.default.createElement(
          "svg",
          {
            viewBox: "0 0 24 24",
            width: 11,
            height: 11,
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 2,
            strokeLinecap: "round",
            "aria-hidden": "true"
          },
          import_react2.default.createElement("path", { d: "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" }),
          import_react2.default.createElement("path", { d: "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" })
        )),
        showGit && status !== void 0 ? import_react2.default.createElement("span", {
          className: "nxe-acc-letter",
          "data-status": status,
          title: api.statusLabel(status),
          "aria-label": api.statusLabel(status)
        }, status) : null,
        // A folder reports the strongest status anywhere below it; the dot stays visible when collapsed.
        showGit && folderStatus !== void 0 ? import_react2.default.createElement("span", {
          className: "nxe-acc-dot",
          "data-status": folderStatus,
          title: api.statusLabel(folderStatus),
          "aria-label": api.statusLabel(folderStatus)
        }) : null,
        ignored && api.showIgnoredBadge() ? import_react2.default.createElement("span", { className: "nxe-acc-ignored", title: copy.ignoredBadge }, copy.ignoredBadge) : null,
        isFile && api.showOpenButton() ? import_react2.default.createElement("button", {
          type: "button",
          className: "nxe-open nxe-tool",
          tabIndex: -1,
          title: copy.openFile,
          "aria-label": `${copy.openFile} ${entry.name}`,
          "data-nxe-open": entry.path,
          onClick: (event) => {
            event.stopPropagation();
            api.open(entry);
          }
        }, import_react2.default.createElement(
          "svg",
          {
            viewBox: "0 0 24 24",
            width: 12,
            height: 12,
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            "aria-hidden": "true"
          },
          import_react2.default.createElement("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
          import_react2.default.createElement("path", { d: "M15 3h6v6" }),
          import_react2.default.createElement("path", { d: "M10 14 21 3" })
        )) : null
      );
    };
  }

  // src/client/statusbar.js
  var import_react3 = __toESM(__require("react"), 1);

  // src/client/format.js
  function formatBytes(bytes) {
    if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KiB", "MiB", "GiB", "TiB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const rounded = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/u, "");
    return `${rounded} ${units[unit]}`;
  }
  function formatAheadBehind(ahead, behind) {
    const parts = [];
    if (Number.isFinite(ahead) && ahead > 0) parts.push(`\u2191${ahead}`);
    if (Number.isFinite(behind) && behind > 0) parts.push(`\u2193${behind}`);
    return parts.join(" ");
  }

  // src/client/statusbar.js
  var import_dsh_client_ui_primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
  function StatusBar(props) {
    const { copy, git, stats, statsState, prefs, onCommit, onRetryStats } = props;
    if (!prefs.showStatusBar) return null;
    const left = [];
    if (git === null || git === void 0) {
      left.push(import_react3.default.createElement(
        "span",
        { key: "norepo", className: "nxe-branch", "data-nxe-git": "none" },
        import_react3.default.createElement(import_dsh_client_ui_primitives.IconBranchOutlineRegular, { width: 14, height: 14, opacity: 0.5 }),
        import_react3.default.createElement("span", { className: "nxe-branch-name" }, copy.notRepo)
      ));
    } else {
      const name = git.detached ? copy.detached : git.branch ?? copy.detached;
      left.push(import_react3.default.createElement(
        "span",
        {
          key: "branch",
          className: "nxe-branch",
          "data-nxe-git": "ready",
          "data-detached": String(git.detached === true),
          title: git.detached ? copy.branchTooltipDetached : git.upstream === null ? name : copy.branchTooltip(name, git.upstream)
        },
        import_react3.default.createElement(import_dsh_client_ui_primitives.IconBranchOutlineRegular, { width: 14, height: 14 }),
        import_react3.default.createElement("span", { className: "nxe-branch-name", "data-nxe-branch": git.branch ?? "" }, name)
      ));
      if (git.upstream !== null && git.upstream !== void 0) {
        const pair = formatAheadBehind(git.ahead, git.behind);
        if (pair !== "") left.push(import_react3.default.createElement("span", { key: "ab", className: "nxe-ab", title: copy.aheadBehindTooltip(git.ahead, git.behind) }, pair));
      }
      const dirty = (git.files?.length ?? 0) > 0;
      left.push(import_react3.default.createElement("button", {
        key: "commit",
        type: "button",
        className: "nxe-commit",
        disabled: !dirty,
        title: dirty ? copy.commitTooltip : copy.commitTooltipNone,
        "data-nxe-commit": "true",
        onClick: onCommit
      }, copy.commit));
    }
    const right = [];
    if (statsState === "loading") right.push(import_react3.default.createElement("span", { key: "loading" }, copy.statsLoading));
    else if (statsState === "failed") right.push(import_react3.default.createElement("button", { key: "retry", type: "button", className: "nxe-retry", onClick: onRetryStats }, copy.statsFailed));
    else if (stats !== void 0 && stats !== null) {
      const tooltip = `${copy.statsTooltip(stats.files, stats.directories, formatBytes(stats.bytes))}${stats.truncated ? ` \xB7 ${copy.truncated}` : ""}${prefs.statsExcludeGit ? ` \xB7 ${copy.statsExcludeGit}` : ""}`;
      right.push(import_react3.default.createElement(
        "span",
        { key: "files", title: tooltip, "data-nxe-stats": "true" },
        `${stats.files}${stats.truncated ? "+" : ""} \xB7 ${stats.directories} \xB7 ${formatBytes(stats.bytes)}`
      ));
    }
    return import_react3.default.createElement(
      "footer",
      { className: "nxe-status", "data-nxe-status": "true" },
      import_react3.default.createElement("div", { className: "nxe-status-left" }, left),
      import_react3.default.createElement("div", { className: "nxe-status-right" }, right)
    );
  }

  // src/client/menu.js
  var import_react4 = __toESM(__require("react"), 1);
  var { useCallback, useEffect: useEffect2, useRef: useRef2, useState } = import_react4.default;
  function RowMenu({ menu, copy, onCopyRelative, onRename, onClose }) {
    const ref = useRef2(null);
    const [active, setActive] = useState(0);
    const items = menu === null ? [] : [
      { id: "copy-relative", label: copy.copyRelative, run: onCopyRelative },
      ...menu.kind === "file" ? [{ id: "rename", label: copy.rename, run: onRename }] : [{ id: "rename", label: copy.rename, run: onRename }]
    ];
    useEffect2(() => {
      if (menu === null) return void 0;
      setActive(0);
      const onPointer = (event) => {
        if (ref.current !== null && !ref.current.contains(event.target)) onClose();
      };
      const onKey = (event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActive((i) => (i + 1) % items.length);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActive((i) => (i - 1 + items.length) % items.length);
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const item = items[active];
          onClose();
          item?.run(menu.target);
        }
      };
      document.addEventListener("pointerdown", onPointer, true);
      document.addEventListener("keydown", onKey, true);
      return () => {
        document.removeEventListener("pointerdown", onPointer, true);
        document.removeEventListener("keydown", onKey, true);
      };
    }, [menu, active, items, onClose]);
    if (menu === null) return null;
    return import_react4.default.createElement("div", {
      className: "nxe-menu",
      role: "menu",
      ref,
      style: { left: `${menu.x}px`, top: `${menu.y}px` },
      "data-nxe-menu": "true"
    }, items.map((item, index) => import_react4.default.createElement("button", {
      key: item.id,
      type: "button",
      role: "menuitem",
      className: "nxe-menu-item",
      "data-active": String(index === active),
      onMouseEnter: () => setActive(index),
      onClick: () => {
        onClose();
        item.run(menu.target);
      }
    }, item.label)));
  }

  // src/client/body.js
  var primitives = __toESM(__require("@deepseek-ai/dsh-client-ui-primitives"), 1);

  // src/client/tree.js
  var import_react5 = __toESM(__require("react"), 1);

  // src/client/paths.js
  function absoluteOf(root, path) {
    const base = trimSlash(root);
    const value = String(path ?? "").replace(/\\/gu, "/");
    if (value === "") return base;
    if (value.startsWith("/") || /^[A-Za-z]:\//u.test(value)) return trimSlash(value);
    return `${base === "/" ? "" : base}/${value}`.replace(/\/{2,}/gu, "/");
  }
  function treeKeyOf(root, path) {
    return trimSlash(absoluteOf(root, path));
  }
  function isInside(root, candidate) {
    const base = trimSlash(root);
    const target = trimSlash(candidate);
    if (base === target) return true;
    return target.startsWith(base === "/" ? "/" : `${base}/`);
  }
  function relativeTo2(root, absolute) {
    const base = trimSlash(root);
    const target = trimSlash(absolute);
    if (target === base) return "";
    return isInside(base, target) ? target.slice(base === "/" ? 1 : base.length + 1) : target;
  }
  function parentOf(absolute) {
    const trimmed = trimSlash(absolute);
    const cut = trimmed.lastIndexOf("/");
    return cut <= 0 ? "/" : trimmed.slice(0, cut);
  }
  function basenameOf(absolute) {
    const trimmed = trimSlash(absolute);
    const cut = trimmed.lastIndexOf("/");
    return cut === -1 ? trimmed : trimmed.slice(cut + 1);
  }
  function trimSlash(path) {
    const normalized = String(path ?? "").replace(/\\/gu, "/");
    const trimmed = normalized.replace(/\/+$/u, "");
    if (trimmed === "") return normalized.startsWith("/") ? "/" : "";
    return trimmed;
  }

  // src/client/tree.js
  var { useCallback: useCallback2, useEffect: useEffect3, useMemo, useRef: useRef3, useState: useState2 } = import_react5.default;
  function useTree(options) {
    const { sessionId, root, request, prefs, onListed } = options;
    const [levels, setLevels] = useState2(() => /* @__PURE__ */ new Map());
    const [expanded, setExpanded] = useState2(() => /* @__PURE__ */ new Set());
    const [selected, setSelected] = useState2(null);
    const [pending, setPending] = useState2(null);
    const [token, setToken] = useState2(0);
    const alive = useRef3(true);
    const listed = useRef3(onListed);
    listed.current = onListed;
    useEffect3(() => () => {
      alive.current = false;
    }, []);
    const loadLevel = useCallback2(async (path, silent = false) => {
      const key = treeKeyOf(root, path);
      if (!silent) {
        setLevels((current) => {
          const next = new Map(current);
          const previous = next.get(key);
          if (previous === void 0) next.set(key, { loading: true, entries: [] });
          return next;
        });
      }
      const result = await request("/list", {
        sessionId,
        path,
        followSymlinks: prefs.followSymlinks,
        allowOutsideWorkspace: prefs.allowOutsideWorkspace
      });
      if (!alive.current) return;
      setLevels((current) => {
        const next = new Map(current);
        const previous = next.get(key);
        if (result.ok) {
          next.set(key, {
            entries: result.entries,
            truncated: result.truncated === true,
            outside: result.outside === true,
            // Keep an already-known failure of one child level; a child's own state lives under its own key.
            failed: previous?.failed === true && previous.entries?.length > 0 ? previous.failed : false
          });
        } else {
          next.set(key, { entries: previous?.entries ?? [], failed: true, message: result.message, code: result.code });
        }
        return next;
      });
      listed.current?.(path, result.ok ? result.entries.map((entry) => entry.name) : []);
    }, [root, sessionId, request, prefs.followSymlinks, prefs.allowOutsideWorkspace]);
    useEffect3(() => {
      if (root === void 0) return;
      setLevels(/* @__PURE__ */ new Map());
      void loadLevel(root);
    }, [root, token, loadLevel]);
    const refresh = useCallback2(async () => {
      setToken((value) => value + 1);
    }, []);
    const refreshLevel = useCallback2((path) => loadLevel(path, true), [loadLevel]);
    const toggle = useCallback2((path, open) => {
      const key = treeKeyOf(root, path);
      setExpanded((current) => {
        const next = new Set(current);
        if (open) next.add(key);
        else next.delete(key);
        return next;
      });
      if (open && levels.get(key) === void 0) void loadLevel(path);
    }, [root, levels, loadLevel]);
    const knownEmpty = useCallback2((path) => {
      const key = treeKeyOf(root, path);
      setLevels((current) => {
        if (current.has(key)) return current;
        const next = new Map(current);
        next.set(key, { entries: [] });
        return next;
      });
    }, [root]);
    const forget = useCallback2((path) => {
      const key = treeKeyOf(root, path);
      setLevels((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    }, [root]);
    const collapseUnder = useCallback2((path) => {
      const key = treeKeyOf(root, path);
      setExpanded((current) => {
        const next = /* @__PURE__ */ new Set();
        for (const item of current) if (item !== key && !item.startsWith(`${key}/`)) next.add(item);
        return next;
      });
      setLevels((current) => {
        const next = /* @__PURE__ */ new Map();
        for (const [itemKey, level] of current) if (itemKey !== key && !itemKey.startsWith(`${key}/`)) next.set(itemKey, level);
        return next;
      });
    }, [root]);
    const entries = useMemo(() => {
      const list = [];
      for (const [levelKey, level] of levels) {
        for (const entry of level.entries ?? []) {
          const path = levelKey === "" ? entry.name : `${levelKey}/${entry.name}`;
          list.push({ ...entry, path });
        }
      }
      return list;
    }, [levels]);
    const directories = useMemo(() => {
      const states = {};
      for (const [key, level] of levels) {
        if (level.loading === true && (level.entries?.length ?? 0) === 0) states[key] = { loading: true };
        else if (level.failed === true) states[key] = { failure: level.message };
        else if (level.truncated === true) states[key] = { truncated: true };
      }
      return states;
    }, [levels]);
    return {
      levels,
      entries,
      directories,
      expanded: [...expanded],
      selected,
      setSelected,
      toggle,
      pending,
      setPending,
      refresh,
      refreshLevel,
      loadLevel,
      forget,
      collapseUnder,
      knownEmpty
    };
  }

  // src/client/names.js
  var FILE_SUFFIX = ".md";
  function nextName(kind, siblings) {
    const base = kind === "file" ? "untitled" : "new-folder";
    const taken = new Set((siblings ?? []).map((entry) => String(entry.name ?? "").toLowerCase()));
    const compose = (index) => kind === "file" ? `${base}${index === 1 ? "" : `-${index}`}${FILE_SUFFIX}` : `${base}${index === 1 ? "" : `-${index}`}`;
    for (let index = 1; index < 1e4; index += 1) {
      const candidate = compose(index);
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    throw new Error("cannot find an unused name");
  }
  function checkName(name, copy) {
    const trimmed = String(name ?? "").trim();
    if (trimmed === "") return { ok: false, message: copy.nameEmpty };
    if (trimmed === "." || trimmed === "..") return { ok: false, message: copy.invalidName };
    if (/[/\\\0]/u.test(trimmed)) return { ok: false, message: copy.nameSlash };
    return { ok: true, name: trimmed };
  }

  // src/client/body.js
  var { useCallback: useCallback3, useEffect: useEffect4, useMemo: useMemo2, useRef: useRef4, useState: useState3 } = import_react6.default;
  var DOUBLE_CLICK_MS = 400;
  var SEVERITY = ["U", "D", "M", "A", "R", "?"];
  function ExplorerBody(props) {
    const { useTabInfo, sessionId, useSessions, renderSlot, renderFactorySlot, useContextMenu, nxe } = props;
    const { tab, panel } = useTabInfo();
    const cwd = useSessions((sessions) => sessions.byId[sessionId]?.cwd);
    const copy = nxe.copy;
    const prefs = nxe.prefs;
    const [git, setGit] = useState3(null);
    const [gitError, setGitError] = useState3(void 0);
    const [stats, setStats] = useState3(null);
    const [statsState, setStatsState] = useState3("idle");
    const [dialog, setDialog] = useState3(null);
    const [busy, setBusy] = useState3(false);
    const [dialogError, setDialogError] = useState3(void 0);
    const [outsideAllowed, setOutsideAllowed] = useState3(() => /* @__PURE__ */ new Set());
    const [linkNote, setLinkNote] = useState3(void 0);
    const lastPress = useRef4({ path: "", at: 0 });
    const prefsRef = useRef4(prefs);
    prefsRef.current = prefs;
    const request = useCallback3(async (path, body) => {
      try {
        const response = await fetch(`/nano-explorer-extra${path}`, {
          method: body === void 0 ? "GET" : "POST",
          headers: body === void 0 ? void 0 : { "content-type": "application/json" },
          body: body === void 0 ? void 0 : JSON.stringify(body),
          credentials: "same-origin",
          cache: "no-store"
        });
        const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        if (!response.ok) return { ok: false, message: payload?.error ?? `HTTP ${response.status}` };
        return { ok: true, ...payload };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    }, []);
    const markIgnored = useCallback3(async (directory, names) => {
      if (!prefsRef.current.showGitStatus || !Array.isArray(names) || names.length === 0) return;
      const result = await request("/ignored", { sessionId, paths: names });
      if (!result.ok || !Array.isArray(result.ignored) || result.ignored.length === 0) return;
      setIgnoredSet((current) => {
        const next = new Set(current);
        const base = relativeTo2(cwd ?? "", directory);
        for (const name of result.ignored) next.add(base === "" ? name : `${base}/${name}`);
        return next;
      });
    }, [request, sessionId, cwd]);
    const tree = useTree({
      sessionId,
      root: cwd,
      request,
      prefs: { ...prefs, allowOutsideWorkspace: prefs.allowOutsideWorkspace || outsideAllowed.size > 0 },
      onListed: (path, names) => {
        void markIgnored(path, names);
      }
    });
    const refreshGit = useCallback3(async () => {
      if (cwd === void 0) return;
      if (!prefsRef.current.showGitStatus) {
        setGit(null);
        setGitError(void 0);
        return;
      }
      const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}`);
      if (!result.ok) {
        setGitError(result.message);
        return;
      }
      setGit(result.git ?? null);
      setGitError(result.gitError);
    }, [cwd, sessionId, request]);
    const refreshStats = useCallback3(async () => {
      if (cwd === void 0) return;
      setStatsState("loading");
      const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&only=stats`);
      if (!result.ok) {
        setStatsState("failed");
        return;
      }
      setStats(result.stats ?? null);
      setStatsState("ok");
    }, [cwd, sessionId, request]);
    useEffect4(() => {
      void refreshGit();
    }, [refreshGit]);
    useEffect4(() => {
      void refreshStats();
    }, [refreshStats]);
    const statsTimer = useRef4(0);
    const queueStats = useCallback3(() => {
      window.clearTimeout(statsTimer.current);
      statsTimer.current = window.setTimeout(() => {
        void refreshStats();
      }, 2e3);
    }, [refreshStats]);
    useEffect4(() => () => window.clearTimeout(statsTimer.current), []);
    const changed = useMemo2(() => Array.isArray(git?.files) ? git.files : [], [git]);
    const changedByPath = useMemo2(() => {
      const map = /* @__PURE__ */ new Map();
      for (const file of changed) map.set(file.path, file.status);
      return map;
    }, [changed]);
    const [ignoredSet, setIgnoredSet] = useState3(() => /* @__PURE__ */ new Set());
    const checkoutRoot = git?.root;
    const statusKeyOf = useCallback3((key) => {
      if (checkoutRoot === void 0 || checkoutRoot === null) return void 0;
      const absolute = absoluteOf(cwd ?? "", key);
      return relativeTo2(checkoutRoot, absolute);
    }, [checkoutRoot, cwd]);
    const ignoredOf = useCallback3((key) => {
      const relative = statusKeyOf(key);
      if (relative === void 0) return false;
      if (ignoredSet.has(relative)) return true;
      const parts = relative.split("/");
      for (let index = parts.length - 1; index > 0; index -= 1) {
        if (ignoredSet.has(parts.slice(0, index).join("/"))) return true;
      }
      return false;
    }, [ignoredSet, statusKeyOf]);
    const statusOf = useCallback3((key) => {
      const relative = statusKeyOf(key);
      return relative === void 0 ? void 0 : changedByPath.get(relative);
    }, [changedByPath, statusKeyOf]);
    const openEntry = useCallback3((entry) => {
      const absolute = absoluteOf(cwd ?? "", entry.path);
      const address = `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${absolute.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
      if (panel.isFloating) tab.actions.openResource(address);
      else tab.actions.openResource(address, { paneId: panel.id });
    }, [cwd, sessionId, tab.actions, panel.id, panel.isFloating]);
    const [revealState, setRevealState] = useState3("unknown");
    useEffect4(() => {
      let live = true;
      void (async () => {
        try {
          const response = await fetch("/open-in-app/apps", { credentials: "same-origin", cache: "no-store" });
          if (!response.ok) {
            if (live) setRevealState("unavailable");
            return;
          }
          const body = await response.json();
          const apps = Array.isArray(body.apps) ? body.apps : [];
          const manager = apps.find((id) => ["finder", "explorer", "filemanager", "dolphin", "nautilus"].includes(id));
          if (live) setRevealState(manager === void 0 ? "unavailable" : manager);
        } catch {
          if (live) setRevealState("unavailable");
        }
      })();
      return () => {
        live = false;
      };
    }, []);
    const revealDirectory = useCallback3(async () => {
      if (cwd === void 0 || revealState === "unknown" || revealState === "unavailable") return;
      try {
        const response = await fetch("/open-in-app/open", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ app: revealState, path: cwd }),
          credentials: "same-origin"
        });
        if (!response.ok) setLinkNote(`open failed: HTTP ${String(response.status)}`);
      } catch (error) {
        setLinkNote(error instanceof Error ? error.message : String(error));
      }
    }, [cwd, revealState]);
    const create = useCallback3(async (kind) => {
      if (cwd === void 0) return;
      const directory = directoryForCreate(tree, cwd);
      const siblings = siblingsAt(tree, cwd, directory);
      const name = nextName(kind, siblings);
      const result = await request(kind === "file" ? "/create-file" : "/create-folder", { sessionId, directory, name });
      if (!result.ok) {
        setLinkNote(result.message);
        return;
      }
      await tree.refreshLevel(directory);
      const created = absoluteOf(cwd, `${relativeTo2(cwd, directory) === "" ? "" : `${relativeTo2(cwd, directory)}/`}${name}`);
      tree.setSelected(created);
      tree.setPending({ path: treeKeyOf(cwd, created), name, kind, fresh: true });
      if (kind === "folder") {
        tree.knownEmpty(created);
        tree.toggle(created, true);
      }
      queueStats();
    }, [cwd, sessionId, request, tree, queueStats]);
    const doRename = useCallback3(async (entry, name) => {
      if (cwd === void 0) return;
      const absolute = absoluteOf(cwd, entry.path);
      const kind = entry.meta?.kind === "directory" ? "directory" : "file";
      setBusy(true);
      setDialogError(void 0);
      const result = await request("/rename", { sessionId, path: absolute, name, kind });
      setBusy(false);
      if (!result.ok) {
        setDialogError(result.message);
        return;
      }
      setDialog(null);
      const parent = parentOf(absolute);
      await tree.refreshLevel(parent);
      if (kind === "directory") tree.collapseUnder(absolute);
      tree.setSelected(absoluteOf(cwd, `${relativeTo2(cwd, parent) === "" ? "" : `${relativeTo2(cwd, parent)}/`}${name.trim()}`));
      queueStats();
    }, [cwd, sessionId, request, tree, queueStats]);
    const doCommit = useCallback3(async (message) => {
      setBusy(true);
      setDialogError(void 0);
      const result = await request("/commit", { sessionId, message });
      setBusy(false);
      if (!result.ok) {
        setDialogError(result.message);
        return;
      }
      setDialog(null);
      await tree.refresh();
      await refreshGit();
      await refreshStats();
    }, [sessionId, request, tree, refreshGit, refreshStats]);
    const copyPath = useCallback3(async (absolute, relative) => {
      try {
        await navigator.clipboard.writeText(relative ? relative : absolute);
        setLinkNote(copy.copied);
        window.setTimeout(() => setLinkNote(void 0), 1600);
      } catch (error) {
        setLinkNote(error instanceof Error ? error.message : String(error));
      }
    }, [copy.copied]);
    const [menu, setMenu] = useState3(null);
    const rowTriggerProps = useCallback3((entry, kind) => ({
      onContextMenu: (event) => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ x: event.clientX, y: event.clientY, kind, target: { path: entry.path, name: entry.name } });
      }
    }), []);
    const folderStatusOf = useCallback3((key) => {
      const relative = statusKeyOf(key);
      if (relative === void 0) return void 0;
      const prefix = relative === "" ? "" : `${relative}/`;
      let best;
      let bestRank = -1;
      for (const [path, status] of changedByPath) {
        if (prefix !== "" && !path.startsWith(prefix)) continue;
        const rank = SEVERITY.indexOf(status);
        if (rank > bestRank) {
          bestRank = rank;
          best = status;
        }
      }
      return best;
    }, [changedByPath, statusKeyOf]);
    const accessory = useMemo2(() => createAccessory({
      copy: () => copy,
      statusOf,
      ignoredOf,
      folderStatusOf,
      linkOf: (key) => tree.levels.get(treeKeyOf(cwd ?? "", key))?.outside === true ? true : void 0,
      showGit: () => prefs.showGitStatus,
      showIgnoredBadge: () => prefs.showIgnoredBadge,
      showOpenButton: () => prefs.showOpenButton,
      statusLabel: (status) => nxe.statusLabel(copy, status),
      open: (entry) => openEntry(entry)
    }), [copy, statusOf, ignoredOf, tree.levels, cwd, prefs.showGitStatus, prefs.showIgnoredBadge, prefs.showOpenButton, nxe, openEntry]);
    const factoryOptions = useMemo2(() => ({ slots: { accessory }, fallback: null }), [accessory]);
    if (cwd === void 0) {
      return import_react6.default.createElement("div", { className: "nxe-row-note", "data-nxe": "true" }, copy.noWorkspace);
    }
    const entries = tree.entries.map((entry) => ({
      path: entry.path,
      name: entry.name,
      meta: {
        kind: entry.type === "directory" ? "directory" : entry.type === "file" ? "file" : "other",
        ...entry.symlink === true ? { link: true } : {},
        ...entry.outside === true ? { outside: true } : {},
        ...ignoredOf(entry.path) ? { hidden: true } : {}
      }
    }));
    const content = renderFactorySlot("sidebar.files.tree", {
      root: treeKeyOf(cwd, cwd),
      entries,
      expanded: tree.expanded,
      directories: tree.directories,
      current: tree.selected === null ? void 0 : treeKeyOf(cwd, tree.selected),
      // `entry.path` is already the absolute tree key: the tree joins each level key with its child
      // name, so re-resolving it against the root would build `<root>/<root>/<name>` and the level
      // would never be found — which is what made every folder refuse to expand.
      onToggle: (entry) => tree.toggle(entry.path, !tree.expanded.includes(entry.path)),
      onOpen: (entry) => {
        tree.setSelected(entry.path);
        const now = Date.now();
        const previous = lastPress.current;
        const second = previous.path === entry.path && now - previous.at <= DOUBLE_CLICK_MS;
        lastPress.current = { path: entry.path, at: now };
        const open = second ? prefsRef.current.openPreviewOnDoubleClick : prefsRef.current.openPreviewOnClick;
        if (open) openEntry(entry);
      },
      rowTriggerProps,
      canOpen: () => true
    }, factoryOptions);
    useEffect4(() => {
      const handler = (target) => {
        setDialogError(void 0);
        setDialog({ kind: "rename", entry: { path: target.path, name: basenameOf(target.path), meta: { kind: target.kind } } });
      };
      nxe.setRenameHandler(handler);
      return () => nxe.setRenameHandler(void 0);
    }, [nxe]);
    const commitPending = useCallback3(async (nextNameValue) => {
      const pendingEntry = tree.pending;
      if (pendingEntry === null) return;
      const check = checkName(nextNameValue, copy);
      if (!check.ok) {
        setLinkNote(check.message);
        return;
      }
      setLinkNote(void 0);
      tree.setPending(null);
      if (check.name === pendingEntry.name) return;
      const absolute = absoluteOf(cwd ?? "", pendingEntry.path);
      const result = await request("/rename", { sessionId, path: absolute, name: check.name, kind: pendingEntry.kind === "folder" ? "directory" : "file" });
      if (!result.ok) {
        setLinkNote(result.message);
        return;
      }
      const parent = parentOf(absolute);
      await tree.refreshLevel(parent);
      const renamed = absoluteOf(cwd ?? "", `${relativeTo2(cwd ?? "", parent) === "" ? "" : `${relativeTo2(cwd ?? "", parent)}/`}${check.name}`);
      if (pendingEntry.kind === "folder") tree.knownEmpty(renamed);
      tree.setSelected(renamed);
      queueStats();
    }, [tree, copy, cwd, request, sessionId, queueStats]);
    const onTreeKeyDown = useCallback3((event) => {
      if (tree.pending !== null) return;
      if (event.key === "F2" && tree.selected !== null) {
        event.preventDefault();
        setDialogError(void 0);
        setDialog({ kind: "rename", entry: { path: tree.selected, name: basenameOf(tree.selected), meta: { kind: tree.levels.has(tree.selected) ? "directory" : "file" } } });
        return;
      }
      const selected = tree.selected;
      if (selected === null) return;
      const key = treeKeyOf(cwd ?? "", selected);
      const isDirectory = tree.levels.has(key) || tree.expanded.includes(key);
      if (event.key === " ") {
        if (!isDirectory) return;
        event.preventDefault();
        tree.toggle(selected, !tree.expanded.includes(key));
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (isDirectory) {
        tree.toggle(selected, !tree.expanded.includes(key));
        return;
      }
      openEntry({ path: key, name: basenameOf(selected), meta: { kind: "file" } });
    }, [tree, cwd, openEntry]);
    const dialogNode = dialog === null ? null : dialog.kind === "commit" ? import_react6.default.createElement(CommitDialog, {
      copy,
      files: changed,
      busy,
      error: dialogError,
      onConfirm: doCommit,
      onCancel: () => {
        setDialog(null);
        setDialogError(void 0);
      }
    }) : import_react6.default.createElement(RenameDialog, {
      copy,
      currentName: dialog.entry.name,
      busy,
      error: dialogError,
      onConfirm: (name) => doRename(dialog.entry, name),
      onCancel: () => {
        setDialog(null);
        setDialogError(void 0);
      }
    });
    return import_react6.default.createElement(
      "div",
      { className: "nxe-root", "data-nxe": "true", "data-theme": nxe.scheme() },
      import_react6.default.createElement(
        "div",
        { className: "nxe-header" },
        import_react6.default.createElement("span", { className: "nxe-path", title: cwd, "data-nxe-path": "true" }, cwd),
        import_react6.default.createElement(ToolButton, { label: copy.newFile, onClick: () => {
          void create("file");
        } }, iconFilePlus()),
        import_react6.default.createElement(ToolButton, { label: copy.newFolder, onClick: () => {
          void create("folder");
        } }, iconFolderPlus()),
        import_react6.default.createElement(ToolButton, {
          label: copy.rename,
          disabled: tree.selected === null,
          onClick: () => {
            const target = tree.selected;
            if (target === null) return;
            setDialogError(void 0);
            setDialog({ kind: "rename", entry: { path: target, name: basenameOf(target), meta: { kind: tree.levels.has(target) ? "directory" : "file" } } });
          }
        }, iconRename()),
        import_react6.default.createElement(ToolButton, { label: copy.revealDirectory, disabled: revealState === "unavailable", onClick: () => {
          void revealDirectory();
        } }, iconReveal()),
        import_react6.default.createElement(ToolButton, { label: copy.reload, onClick: () => {
          void tree.refresh();
          void refreshGit();
          void refreshStats();
        } }, iconRefresh())
      ),
      linkNote === void 0 ? null : import_react6.default.createElement("p", { className: "nxe-row-note", role: "status" }, linkNote),
      gitError === void 0 ? null : import_react6.default.createElement("p", { className: "nxe-row-note nxe-note-error" }, gitError),
      tree.pending === null ? null : import_react6.default.createElement(
        "div",
        { className: "nxe-inline", "data-nxe-inline": "true" },
        import_react6.default.createElement("label", { className: "nxe-inline-label", htmlFor: "nxe-inline-name" }, copy.renameTitle),
        import_react6.default.createElement("input", {
          id: "nxe-inline-name",
          className: "nxe-inline-input",
          type: "text",
          defaultValue: tree.pending.name,
          autoFocus: true,
          spellCheck: false,
          autoComplete: "off",
          onKeyDown: (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitPending(event.currentTarget.value);
            } else if (event.key === "Escape") {
              event.preventDefault();
              tree.setPending(null);
              setLinkNote(void 0);
            }
          },
          onBlur: (event) => {
            void commitPending(event.currentTarget.value);
          }
        })
      ),
      import_react6.default.createElement("div", { className: "nxe-tree", "data-nxe-tree": "true", onKeyDown: onTreeKeyDown }, content),
      import_react6.default.createElement(StatusBar, {
        copy,
        git,
        stats,
        statsState,
        prefs,
        onCommit: () => {
          setDialogError(void 0);
          setDialog({ kind: "commit" });
        },
        onRetryStats: () => {
          void refreshStats();
        }
      }),
      dialogNode,
      import_react6.default.createElement(RowMenu, {
        menu,
        copy,
        onClose: () => setMenu(null),
        onCopyRelative: (target) => {
          void copyPath(absoluteOf(cwd ?? "", target.path), relativeTo2(cwd ?? "", absoluteOf(cwd ?? "", target.path)));
        },
        onRename: (target) => {
          setMenu(null);
          setDialogError(void 0);
          setDialog({ kind: "rename", entry: { ...target, meta: { kind: menu?.kind === "directory" ? "directory" : "file" } } });
        }
      })
    );
  }
  function ToolButton({ label, onClick, children, disabled }) {
    return import_react6.default.createElement("button", {
      type: "button",
      className: "nxe-tool",
      title: label,
      "aria-label": label,
      onClick,
      disabled: disabled === true
    }, children);
  }
  function directoryForCreate(tree, cwd) {
    const selected = tree.selected;
    if (selected === null) return cwd;
    const key = treeKeyOf(cwd, selected);
    if (tree.levels.has(key)) return key;
    return parentOf(key);
  }
  function siblingsAt(tree, cwd, directory) {
    const level = tree.levels.get(treeKeyOf(cwd, directory));
    return level?.entries ?? [];
  }
  var IconPlus = primitives.IconPlusOutlineRegular;
  var IconFolder = primitives.IconFolderCloseRegular;
  var IconEdit = primitives.IconEditOutlineRegular;
  var IconRefresh = primitives.IconRefreshOutlineRegular;
  function iconFilePlus() {
    return import_react6.default.createElement(IconPlus, { width: 16, height: 16 });
  }
  function iconFolderPlus() {
    return import_react6.default.createElement(IconFolder, { width: 16, height: 16 });
  }
  function iconRefresh() {
    return import_react6.default.createElement(IconRefresh, { width: 16, height: 16 });
  }
  function iconRename() {
    return import_react6.default.createElement(IconEdit, { width: 16, height: 16 });
  }
  function iconReveal() {
    return import_react6.default.createElement(
      "svg",
      { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      import_react6.default.createElement("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
      import_react6.default.createElement("path", { d: "M12 11v6M9 14l3-3 3 3" })
    );
  }

  // src/client/i18n.js
  var COPY = {
    zh: {
      typeLabel: "\u6587\u4EF6",
      typeDescription: "\u6D4F\u89C8\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u5E26 Git \u72B6\u6001\u4E0E\u63D0\u4EA4\u3002",
      newFile: "\u65B0\u5EFA\u6587\u4EF6",
      newFolder: "\u65B0\u5EFA\u6587\u4EF6\u5939",
      reload: "\u5237\u65B0",
      revealDirectory: "\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00",
      loading: "\u52A0\u8F7D\u4E2D\u2026",
      empty: "\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684",
      truncated: "\u6761\u76EE\u592A\u591A\uFF0C\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206",
      noWorkspace: "\u8FD9\u4E2A\u4F1A\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",
      rename: "\u91CD\u547D\u540D",
      copyRelative: "\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",
      copyAbsolute: "\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",
      copyFailed: "\u590D\u5236\u5931\u8D25",
      renameFailed: "\u91CD\u547D\u540D\u5931\u8D25",
      copied: "\u5DF2\u590D\u5236",
      openFile: "\u6253\u5F00",
      renameTitle: "\u91CD\u547D\u540D",
      renameBody: (name) => `\u628A\u300C${name}\u300D\u6539\u6210\uFF1A`,
      nameEmpty: "\u540D\u5B57\u4E0D\u80FD\u4E3A\u7A7A",
      nameSlash: "\u540D\u5B57\u4E0D\u80FD\u5305\u542B / \u6216 \\",
      nameTaken: "\u8FD9\u4E2A\u540D\u5B57\u5DF2\u7ECF\u88AB\u5360\u7528",
      invalidName: "\u540D\u5B57\u65E0\u6548",
      cancel: "\u53D6\u6D88",
      confirm: "\u786E\u5B9A",
      commit: "\u63D0\u4EA4",
      commitTooltip: "\u63D0\u4EA4\u5168\u90E8\u66F4\u6539",
      commitTooltipNone: "\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",
      commitTooltipBusy: "\u6B63\u5728\u63D0\u4EA4\u2026",
      branchTooltip: (branch, upstream) => `\u5F53\u524D\u5206\u652F ${branch}\uFF0C\u8DDF\u8E2A ${upstream}`,
      branchTooltipDetached: "\u5F53\u524D\u5904\u4E8E\u6E38\u79BB HEAD \u72B6\u6001",
      aheadBehindTooltip: (ahead, behind) => `\u5F85\u63A8\u9001 ${ahead} \u4E2A\u63D0\u4EA4\uFF0C\u5F85\u62C9\u53D6 ${behind} \u4E2A`,
      commitTitle: "\u63D0\u4EA4\u66F4\u6539",
      commitBody: (files) => `\u5C06\u63D0\u4EA4 ${files} \u4E2A\u6587\u4EF6\u7684\u66F4\u6539\u3002`,
      commitMessage: "\u63D0\u4EA4\u8BF4\u660E",
      commitPlaceholder: "\u63CF\u8FF0\u8FD9\u6B21\u66F4\u6539\u2026",
      commitEmpty: "\u8BF7\u586B\u5199\u63D0\u4EA4\u8BF4\u660E",
      none: "\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539",
      notRepo: "\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93",
      detached: "\u6E38\u79BB HEAD",
      gitOff: "Git \u72B6\u6001\u5DF2\u5173\u95ED",
      statsLoading: "\u7EDF\u8BA1\u4E2D\u2026",
      statsFailed: "\u7EDF\u8BA1\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5",
      statsTooltip: (files, dirs, bytes) => `${files} \u4E2A\u6587\u4EF6\uFF0C${dirs} \u4E2A\u6587\u4EF6\u5939\uFF0C\u5171 ${bytes}`,
      statsExcludeGit: "\u4E0D\u542B .git",
      symlinkOutside: "\u6307\u5411\u5DE5\u4F5C\u533A\u5916\uFF0C\u9ED8\u8BA4\u4E0D\u8DDF\u968F",
      openAnyway: "\u4ECD\u7136\u6253\u5F00",
      symlinkBadge: "\u8F6F\u94FE\u63A5",
      ignoredBadge: "\u5DF2\u5FFD\u7565",
      folderRenameRefresh: "\u6587\u4EF6\u5939\u5DF2\u6539\u540D\uFF0C\u5B50\u8DEF\u5F84\u5DF2\u66F4\u65B0",
      settingsTitle: "\u6587\u4EF6\u6D4F\u89C8\u5668\u589E\u5F3A",
      settingsDescription: "\u8FD9\u4E9B\u5F00\u5173\u53EA\u5F71\u54CD\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u663E\u793A\u3002",
      settingsOpenOnClick: "\u5355\u51FB\u6253\u5F00\u9884\u89C8",
      settingsOpenOnClickHint: "\u5173\u95ED\u65F6\u5355\u51FB\u53EA\u9009\u4E2D\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8\u76EE\u5F55\u3002",
      settingsOpenOnDoubleClick: "\u53CC\u51FB\u6253\u5F00\u9884\u89C8",
      settingsShowOpenButton: "\u884C\u5C3E\u663E\u793A\u6253\u5F00\u6309\u94AE",
      settingsFollowSymlinks: "\u8DDF\u968F\u5DE5\u4F5C\u533A\u5185\u7684\u8F6F\u94FE\u63A5",
      settingsAllowOutside: "\u5141\u8BB8\u8D8A\u8FC7\u5DE5\u4F5C\u533A\u8FB9\u754C\u5217\u76EE\u5F55",
      settingsAllowOutsideHint: "\u5F00\u542F\u540E\u53EF\u4EE5\u6D4F\u89C8\u6307\u5411\u5DE5\u4F5C\u533A\u5916\u7684\u76EE\u5F55\u3002\u5199\u5165\u4ECD\u7136\u88AB\u9650\u5236\u5728\u5DE5\u4F5C\u533A\u5185\u3002",
      settingsShowIgnoredBadge: "\u663E\u793A\u88AB\u5FFD\u7565\u6761\u76EE\u7684\u89D2\u6807",
      settingsShowGit: "\u5728\u6811\u4E0A\u663E\u793A Git \u72B6\u6001",
      settingsShowStatusBar: "\u663E\u793A\u5E95\u90E8\u72B6\u6001\u680F",
      settingsStatsExcludeGit: "\u7EDF\u8BA1\u65F6\u6392\u9664 .git",
      settingsNoOpenPath: "\u5355\u51FB\u548C\u53CC\u51FB\u90FD\u5173\u95ED\u65F6\uFF0C\u53EA\u80FD\u7528 Enter \u6216\u884C\u5C3E\u6309\u94AE\u6253\u5F00\u6587\u4EF6\u3002",
      statusModified: "\u5DF2\u4FEE\u6539",
      statusAdded: "\u65B0\u589E",
      statusDeleted: "\u5DF2\u5220\u9664",
      statusRenamed: "\u91CD\u547D\u540D",
      statusConflicted: "\u51B2\u7A81",
      statusUntracked: "\u672A\u8DDF\u8E2A"
    },
    en: {
      typeLabel: "Files",
      typeDescription: "Browse the workspace with Git status and commits.",
      newFile: "New file",
      newFolder: "New folder",
      reload: "Reload",
      revealDirectory: "Reveal in file manager",
      loading: "Loading\u2026",
      empty: "This folder is empty",
      truncated: "Too many entries; only some are shown",
      noWorkspace: "This session has no working directory",
      rename: "Rename",
      copyRelative: "Copy relative path",
      copyAbsolute: "Copy absolute path",
      copyFailed: "Copy failed",
      renameFailed: "Rename failed",
      copied: "Copied",
      openFile: "Open",
      renameTitle: "Rename",
      renameBody: (name) => `Rename \u201C${name}\u201D to:`,
      nameEmpty: "The name cannot be empty",
      nameSlash: "The name cannot contain / or \\",
      nameTaken: "That name is already used here",
      invalidName: "Invalid name",
      cancel: "Cancel",
      confirm: "OK",
      commit: "Commit",
      commitTooltip: "Commit all changes",
      commitTooltipNone: "Nothing to commit",
      commitTooltipBusy: "Committing\u2026",
      branchTooltip: (branch, upstream) => `On ${branch}, tracking ${upstream}`,
      branchTooltipDetached: "Detached HEAD",
      aheadBehindTooltip: (ahead, behind) => `${ahead} to push, ${behind} to pull`,
      commitTitle: "Commit changes",
      commitBody: (files) => `This commits changes in ${files} file(s).`,
      commitMessage: "Commit message",
      commitPlaceholder: "Describe this change\u2026",
      commitEmpty: "Enter a commit message",
      none: "Nothing to commit",
      notRepo: "Not a Git repository",
      detached: "Detached HEAD",
      gitOff: "Git status is off",
      statsLoading: "Counting\u2026",
      statsFailed: "Counting failed, click to retry",
      statsTooltip: (files, dirs, bytes) => `${files} files, ${dirs} folders, ${bytes}`,
      statsExcludeGit: "excluding .git",
      symlinkOutside: "Points outside the workspace; not followed by default",
      openAnyway: "Open anyway",
      symlinkBadge: "Symbolic link",
      ignoredBadge: "Ignored",
      folderRenameRefresh: "Folder renamed; child paths updated",
      settingsTitle: "Explorer Extra",
      settingsDescription: "These switches only affect how this browser shows the tree.",
      settingsOpenOnClick: "Open a preview on single click",
      settingsOpenOnClickHint: "When off, a single click only selects the row.",
      settingsOpenOnDoubleClick: "Open a preview on double click",
      settingsShowOpenButton: "Show an open button at the row end",
      settingsFollowSymlinks: "Follow symbolic links inside the workspace",
      settingsAllowOutside: "Allow listing outside the workspace",
      settingsAllowOutsideHint: "Lets you browse directories outside the workspace. Writes stay inside it.",
      settingsShowIgnoredBadge: "Show a badge on ignored entries",
      settingsShowGit: "Show Git status in the tree",
      settingsShowStatusBar: "Show the bottom status bar",
      settingsStatsExcludeGit: "Exclude .git from the totals",
      settingsNoOpenPath: "With both clicks off, use Enter or the row button to open a file.",
      statusModified: "Modified",
      statusAdded: "Added",
      statusDeleted: "Deleted",
      statusRenamed: "Renamed",
      statusConflicted: "Conflicted",
      statusUntracked: "Untracked"
    }
  };
  function languageOf(language) {
    return typeof language === "string" && language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  function copyFor(language) {
    return COPY[languageOf(language)];
  }
  function statusLabel(copy, status) {
    return {
      M: copy.statusModified,
      A: copy.statusAdded,
      D: copy.statusDeleted,
      R: copy.statusRenamed,
      U: copy.statusConflicted,
      "?": copy.statusUntracked
    }[status] ?? status;
  }

  // src/client/prefs.js
  var KEY = "dsh-nano-explorer-extra:prefs.v1";
  var DEFAULT_PREFS = {
    openPreviewOnClick: false,
    openPreviewOnDoubleClick: true,
    showOpenButton: true,
    followSymlinks: true,
    allowOutsideWorkspace: false,
    showIgnoredBadge: false,
    showGitStatus: true,
    showStatusBar: true,
    statsExcludeGit: true
  };
  function record(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function normalizePrefs(raw) {
    const source = record(raw) ? raw : {};
    const result = {};
    for (const [key, fallback] of Object.entries(DEFAULT_PREFS)) {
      result[key] = typeof source[key] === "boolean" ? source[key] : fallback;
    }
    return result;
  }
  function readPrefs() {
    try {
      const raw = window.localStorage?.getItem(KEY);
      return raw === null || raw === void 0 ? { ...DEFAULT_PREFS } : normalizePrefs(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }
  function writePrefs(prefs) {
    try {
      window.localStorage?.setItem(KEY, JSON.stringify(prefs));
    } catch {
    }
  }

  // src/client/settings.js
  var import_react7 = __toESM(__require("react"), 1);
  function Row({ label, hint, checked, onChange, warn }) {
    return import_react7.default.createElement(
      "div",
      { className: "nxe-settings-row" },
      import_react7.default.createElement(
        "div",
        null,
        import_react7.default.createElement("div", { className: "nxe-settings-label" }, label),
        hint === void 0 ? null : import_react7.default.createElement("div", { className: "nxe-settings-hint" }, hint),
        warn === true ? import_react7.default.createElement("p", { className: "nxe-warn" }, hint) : null
      ),
      import_react7.default.createElement("button", {
        type: "button",
        className: "nxe-switch",
        role: "switch",
        "aria-checked": checked,
        "aria-label": label,
        "data-on": String(checked),
        onClick: () => onChange(!checked)
      })
    );
  }
  function SettingsPage({ copy, prefs, setPref }) {
    const bothOff = prefs.openPreviewOnClick === false && prefs.openPreviewOnDoubleClick === false;
    return import_react7.default.createElement(
      "div",
      { className: "nxe-settings", "data-nxe-settings": "true" },
      import_react7.default.createElement("p", { className: "nxe-settings-hint" }, copy.settingsDescription),
      import_react7.default.createElement(Row, {
        label: copy.settingsOpenOnClick,
        hint: copy.settingsOpenOnClickHint,
        checked: prefs.openPreviewOnClick,
        onChange: (value) => setPref("openPreviewOnClick", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsOpenOnDoubleClick,
        checked: prefs.openPreviewOnDoubleClick,
        onChange: (value) => setPref("openPreviewOnDoubleClick", value)
      }),
      bothOff ? import_react7.default.createElement("p", { className: "nxe-warn" }, copy.settingsNoOpenPath) : null,
      import_react7.default.createElement(Row, {
        label: copy.settingsShowOpenButton,
        checked: prefs.showOpenButton,
        onChange: (value) => setPref("showOpenButton", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsFollowSymlinks,
        checked: prefs.followSymlinks,
        onChange: (value) => setPref("followSymlinks", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsAllowOutside,
        hint: copy.settingsAllowOutsideHint,
        checked: prefs.allowOutsideWorkspace,
        onChange: (value) => setPref("allowOutsideWorkspace", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsShowIgnoredBadge,
        checked: prefs.showIgnoredBadge,
        onChange: (value) => setPref("showIgnoredBadge", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsShowGit,
        checked: prefs.showGitStatus,
        onChange: (value) => setPref("showGitStatus", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsShowStatusBar,
        checked: prefs.showStatusBar,
        onChange: (value) => setPref("showStatusBar", value)
      }),
      import_react7.default.createElement(Row, {
        label: copy.settingsStatsExcludeGit,
        checked: prefs.statsExcludeGit,
        onChange: (value) => setPref("statsExcludeGit", value)
      })
    );
  }

  // src/client/styles.js
  var STYLE = `
[data-nxe] {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  /* The sidebar inherits the shell's 16px body size; a file tree reads at the shipped 13px scale. */
  font-size: 13px; line-height: 18px;
}
[data-nxe] .nxe-tree button { font-size: 13px; line-height: 18px; }
[data-nxe] .nxe-tree [data-files-path] { font-size: 13px; }

/* Git status palette: DSH has no Git semantic colors, so this plugin owns them,
   with a separately tuned value per theme rather than one value at two opacities. */
[data-nxe] {
  --nxe-git-modified: #bf8700;
  --nxe-git-added: #1a7f37;
  --nxe-git-deleted: #cf222e;
  --nxe-git-renamed: #0969da;
  --nxe-git-conflicted: #bc4c00;
  --nxe-git-untracked: #1a7f37;
  --nxe-ignored-opacity: .5;
}
[data-nxe][data-theme="dark"] {
  --nxe-git-modified: #d9a63b;
  --nxe-git-added: #4ac26b;
  --nxe-git-deleted: #f85149;
  --nxe-git-renamed: #58a6ff;
  --nxe-git-conflicted: #f0883e;
  --nxe-git-untracked: #3fb950;
  --nxe-ignored-opacity: .55;
}

.nxe-header {
  display: flex; align-items: center; gap: 4px;
  /* The shipped files page insets its header by 16px left and 6px right; the tree and the status bar
     below reuse the same pair so the tab, the path, the rows, and the footer share one left edge. */
  padding: 6px 8px 6px 16px; border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.nxe-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-tool { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nxe-tool:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nxe-tool:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

.nxe-tree { flex: 1; min-height: 0; overflow: auto; padding: 4px 8px 4px 16px; }
.nxe-tree [data-custom-tree] { height: auto; }

.nxe-row-note { padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-note-error { color: var(--dsw-alias-danger, #cf222e); }
.nxe-note-action { margin-left: 6px; border: 0; background: transparent; color: var(--dsw-alias-link); cursor: pointer; font: inherit; text-decoration: underline; }

/* Row decorations injected through the tree Factory's accessory seat. */
.nxe-acc {
  display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;
  /* The shipped accessory wrapper is content-sized; without an explicit width its own flex context
     collapses a width-only child (the folder dot) to zero, so the mark never renders. */
  flex: 0 0 auto; min-width: 14px;
}
.nxe-acc-letter {
  font-size: 11px; font-weight: 700; line-height: 1; letter-spacing: .02em;
  /* A tinted pill keeps the letter readable over hover, selection, and the ignored fade. */
  padding: 1px 4px; border-radius: var(--dsw-radius-xs);
}
.nxe-acc-letter[data-status] { min-width: 14px; text-align: center; }
.nxe-acc-letter[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-letter[data-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-letter[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-letter[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-letter[data-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-letter[data-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-link { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.nxe-acc-ignored { font: 400 9px/1 var(--dsw-font-family); color: var(--dsw-alias-label-tertiary); border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-xs); padding: 1px 3px; }
.nxe-open { display: none; }
[data-nxe-hover] .nxe-open, [data-nxe-focus] .nxe-open { display: inline-flex; }

/* Status bar: the composer's metadata line is the reference for size, line height, ink and padding. */
.nxe-status {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  /* No separator rule: the composer footer reads as a quiet row under the content, not a bordered
     strip, and the tree above already ends with its own inset. The block padding gives the row the
     same clearance from the panel edge that the composer gives its metadata line. */
  box-sizing: border-box; padding: 4px 8px 6px 16px;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
  color: var(--dsw-alias-label-tertiary);
}
.nxe-status-left, .nxe-status-right { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nxe-status-right { font-variant-numeric: tabular-nums; }
.nxe-branch, .nxe-commit, .nxe-ab, .nxe-status-stat {
  display: inline-flex; align-items: center; gap: 6px;
  box-sizing: border-box; padding: 1px 8px;
  border: none; border-radius: var(--dsw-radius-sm);
  background: transparent; color: inherit;
  font: inherit; font-variant-numeric: tabular-nums; line-height: inherit; white-space: nowrap;
}
.nxe-branch svg { width: 14px; height: 14px; flex: none; }
.nxe-branch { min-width: 0; }
.nxe-branch-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.nxe-branch[data-detached="true"] { color: var(--dsw-alias-label-tertiary); }
.nxe-ab { color: var(--dsw-alias-label-tertiary); }
button.nxe-commit { cursor: pointer; }
@media (hover: hover) {
  button.nxe-commit:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
.nxe-commit:disabled { opacity: .55; cursor: default; }
.nxe-commit:focus-visible, .nxe-branch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }
.nxe-status-sep { color: var(--dsw-alias-border-l3); }
.nxe-retry {
  border: 0; background: transparent; color: var(--dsw-alias-link); cursor: pointer;
  font: inherit; font-variant-numeric: tabular-nums; padding: 1px 8px; border-radius: var(--dsw-radius-sm);
}

/* Dialog, matching the DSH modal material: translucent mask, no blur. */
.nxe-mask { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: var(--dsw-alias-bg-mask-1, rgba(0,0,0,.45)); }
.nxe-mask[hidden] { display: none !important; }
.nxe-dialog { width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 64px); overflow: auto; border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-prominent); padding: 16px; }
.nxe-dialog h2 { margin: 0 0 8px; font-size: 14px; font-weight: 600; }
.nxe-dialog p { margin: 0 0 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog textarea, .nxe-dialog input { width: 100%; box-sizing: border-box; border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; padding: 6px 8px; }
.nxe-dialog textarea { min-height: 84px; resize: vertical; }
.nxe-dialog textarea:focus, .nxe-dialog input:focus { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 0; }
.nxe-dialog-error { margin: 8px 0 0; font-size: 12px; color: var(--dsw-alias-danger, #cf222e); }
.nxe-dialog-changed { margin: 6px 0 0; padding: 0; list-style: none; max-height: 120px; overflow: auto; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.nxe-dialog-changed li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nxe-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.nxe-btn { border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); padding: 5px 12px; font: inherit; cursor: pointer; }
.nxe-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-btn[data-primary="true"] { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); color: var(--dsw-alias-label-primary-foreground, #fff); border-color: transparent; }
.nxe-btn:disabled { opacity: .5; cursor: default; }
.nxe-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 1px; }

/* Settings page. */
.nxe-settings { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.nxe-settings-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.nxe-settings-row:last-child { border-bottom: 0; }
.nxe-settings-label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.nxe-settings-hint { margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.nxe-switch { position: relative; flex: none; width: 34px; height: 18px; border-radius: 999px; border: 0; background: var(--dsw-alias-border-l3); cursor: pointer; transition: background .12s ease; }
.nxe-switch[data-on="true"] { background: var(--dsw-alias-brand-primary, var(--dsw-alias-link)); }
.nxe-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .12s ease; }
.nxe-switch[data-on="true"]::after { transform: translateX(16px); }
.nxe-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: 2px; }
.nxe-switch { corner-shape: round; }
.nxe-warn { margin: 0; padding: 8px; border: .5px solid var(--dsw-alias-warn, #bc4c00); border-radius: var(--dsw-radius-sm); font-size: 12px; color: var(--dsw-alias-label-secondary); }

@media (hover: hover) {
  .nxe-tree [data-custom-tree] button:hover .nxe-open { display: inline-flex; }
}

/* Row-level Git colour, the way VS Code's source-control view tints a changed entry.
   The shared tree does not expose the row name element to its accessory, so the tint is selected
   from the sibling accessory that carries the status letter: the :has() selector keeps the row itself untouched. */
[data-nxe] .nxe-tree li[data-files-entry]:has(.nxe-acc-letter[data-status="M"]) > div > button > span { color: var(--nxe-git-modified); }
[data-nxe] .nxe-tree li[data-files-entry]:has(.nxe-acc-letter[data-status="A"]) > div > button > span { color: var(--nxe-git-added); }
[data-nxe] .nxe-tree li[data-files-entry]:has(.nxe-acc-letter[data-status="?"]) > div > button > span { color: var(--nxe-git-untracked); }
[data-nxe] .nxe-tree li[data-files-entry]:has(.nxe-acc-letter[data-status="D"]) > div > button > span { color: var(--nxe-git-deleted); }
[data-nxe] .nxe-tree li[data-files-entry]:has(.nxe-acc-letter[data-status="R"]) > div > button > span { color: var(--nxe-git-renamed); }
[data-nxe] .nxe-tree li[data-files-entry]:has(.nxe-acc-letter[data-status="U"]) > div > button > span { color: var(--nxe-git-conflicted); }


/* One row geometry for every entry.
   The shipped tree pads directory buttons 4px more than file buttons to make room for a chevron it
   never draws, so a folder icon and a file icon below it sat on different x positions. This plugin
   draws the chevron, so it takes the same 20px gutter on every row and both kinds of icon line up. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button {
  position: relative;
  padding-left: 20px;
  gap: 6px;
}
[data-nxe] .nxe-tree li[data-files-entry] > div > button::before {
  content: "";
  position: absolute; left: 6px; top: 50%;
  width: 5px; height: 5px; margin-top: -2.5px;
  border-right: 1.4px solid currentColor; border-bottom: 1.4px solid currentColor;
  transform: rotate(-45deg); transform-origin: center;
  transition: transform .12s ease; opacity: .75;
  visibility: hidden;
}
/* Only a directory carries a disclosure state. */
[data-nxe] .nxe-tree li[data-files-entry="directory"] > div > button::before { visibility: visible; }
[data-nxe] .nxe-tree li[data-files-entry="directory"] > div > button[aria-expanded="true"]::before {
  transform: rotate(45deg);
}
@media (prefers-reduced-motion: reduce) {
  [data-nxe] .nxe-tree li[data-files-entry] > div > button::before { transition: none; }
}

/* A folder's summary dot: present whenever anything below it changed, visible while collapsed. */
.nxe-acc-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.nxe-acc-dot[data-status="M"] { color: var(--nxe-git-modified); }
.nxe-acc-dot[data-status="A"] { color: var(--nxe-git-added); }
.nxe-acc-dot[data-status="D"] { color: var(--nxe-git-deleted); }
.nxe-acc-dot[data-status="R"] { color: var(--nxe-git-renamed); }
.nxe-acc-dot[data-status="U"] { color: var(--nxe-git-conflicted); }
.nxe-acc-dot[data-status="?"] { color: var(--nxe-git-untracked); }
.nxe-acc-dot { corner-shape: round; }

/* Row menu: a floating list anchored at the gesture point, on the shared menu material. */
.nxe-menu {
  position: fixed; z-index: 70; min-width: 168px; padding: 4px;
  border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-prominent); display: flex; flex-direction: column;
}
.nxe-menu-item {
  display: block; width: 100%; text-align: left; border: 0; background: transparent;
  color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px;
  padding: 6px 10px; border-radius: var(--dsw-radius-sm); cursor: pointer;
}
.nxe-menu-item[data-active="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.nxe-menu-item:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, var(--dsw-alias-link)); outline-offset: -2px; }

/* One right rail for status marks. The shipped accessory is as wide as its content, so a folder's
   dot and a file's letter landed on different x positions; a fixed-width rail with its content pushed
   to the end puts every mark on one vertical line. */
[data-nxe] .nxe-tree li[data-files-entry] > div > button + div {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 22px;
  padding-right: 10px;
}
[data-nxe] .nxe-tree li[data-files-entry] > div > button + div:empty { display: none; }
`;

  // src/client/index.js
  var { createElement, useCallback: useCallback4, useEffect: useEffect5, useState: useState4 } = import_react8.default;
  var inject = ["slots", "locale", "sidebarRightTabs", "sidebarRight", "sessions", "contextMenus", "theme"];
  var NS = "nanoExplorerExtra";
  var FILES_KIND = "files";
  var OWN_ID = "nano-explorer-extra";
  var renameRequest = { handler: void 0 };
  function createPrefStore() {
    let current = readPrefs();
    const listeners = /* @__PURE__ */ new Set();
    return {
      get: () => current,
      set: (next) => {
        current = next;
        writePrefs(current);
        for (const listener of listeners) listener();
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  }
  function apply(ctx) {
    const style = document.createElement("style");
    style.dataset.nxeStyle = "true";
    style.textContent = STYLE;
    document.head.append(style);
    ctx.effect(() => () => style.remove());
    const store = createPrefStore();
    if (typeof window !== "undefined") window.__nxeContextMenus = ctx.contextMenus;
    (window.__nxeMenuDiag ||= []).push({
      hasService: typeof ctx.contextMenus === "object" && ctx.contextMenus !== null,
      hasOpen: typeof ctx.contextMenus?.open === "function",
      hasRegister: typeof ctx.contextMenus?.register === "function",
      kinds: (() => {
        try {
          return [...ctx.contextMenus.registeredKinds.getSnapshot() ?? []];
        } catch {
          return null;
        }
      })()
    });
    const cwdOf = (sessionId) => ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
    const requestRename = (target) => {
      renameRequest.handler?.(target);
    };
    const languageOf2 = () => ctx.locale.getSnapshot().active;
    const schemeOf = () => ctx.theme.getTheme().colorScheme === "light" ? "light" : "dark";
    const face = () => ({
      copy: copyFor(languageOf2()),
      prefs: store.get(),
      scheme: schemeOf,
      statusLabel,
      onListed: () => {
      },
      /** The open page lends its rename dialog to the row menus. */
      setRenameHandler: (handler) => {
        renameRequest.handler = handler;
      }
    });
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: OWN_ID,
      kind: FILES_KIND,
      priority: "extension",
      title: () => copyFor(languageOf2()).typeLabel,
      guide: [{
        id: "explorer",
        order: 10,
        title: () => copyFor(languageOf2()).typeLabel,
        description: () => copyFor(languageOf2()).typeDescription
      }]
    }), "nano-explorer-extra: files type");
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: OWN_ID,
      inject: () => ({ nxe: face() })
    }, ExplorerBody)), "nano-explorer-extra: files body");
    for (const target of ["file", "directory"]) {
      ctx.effect(() => ctx.contextMenus.register({
        id: `nano-explorer-extra.${target}`,
        target,
        order: 900,
        resolve: async (value) => {
          const copy = copyFor(languageOf2());
          const root = value.sessionId === void 0 ? void 0 : cwdOf(value.sessionId);
          const relative = root === void 0 ? value.path : relativeTo(root, value.path);
          return [
            {
              id: "copy-relative",
              icon: { key: "nano-explorer-extra.copy-relative" },
              label: copy.copyRelative,
              failureLabel: copy.copyFailed,
              run: () => copyText(relative)
            },
            {
              id: "rename",
              icon: { key: "nano-explorer-extra.rename" },
              label: copy.rename,
              failureLabel: copy.renameFailed,
              run: () => requestRename?.({ path: value.path, kind: target === "directory" ? "directory" : "file" })
            }
          ];
        }
      }), `nano-explorer-extra: ${target} menu`);
    }
    ctx.slots.inject("contextMenu.icon", () => {
      const disposers = [
        ctx.slots.register({ name: "contextMenu.icon", key: "nano-explorer-extra.copy-relative" }, CopyRelativeIcon),
        ctx.slots.register({ name: "contextMenu.icon", key: "nano-explorer-extra.rename" }, RenameIcon)
      ];
      return () => {
        for (const dispose of disposers) dispose();
      };
    });
    ctx.effect(() => ctx.locale.register(NS, {
      zh: { title: COPY.zh.settingsTitle, description: COPY.zh.settingsDescription },
      en: { title: COPY.en.settingsTitle, description: COPY.en.settingsDescription }
    }), "nano-explorer-extra: dictionaries");
    ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
      name: "settings.section",
      id: OWN_ID,
      order: 40,
      locale: NS,
      label: () => copyFor(languageOf2()).settingsTitle
    }, function ExplorerSettings() {
      const [prefs, setPrefs] = useState4(() => store.get());
      useEffect5(() => store.subscribe(() => setPrefs(store.get())), []);
      const setPref = useCallback4((key, value) => store.set({ ...store.get(), [key]: value }), []);
      return createElement(SettingsPage, { copy: copyFor(languageOf2()), prefs, setPref });
    })), "nano-explorer-extra: settings section");
  }
  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
    } catch {
    }
  }
  function CopyRelativeIcon() {
    return createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: 16,
        height: 16,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
      },
      createElement("path", { d: "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" }),
      createElement("path", { d: "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" })
    );
  }
  function RenameIcon() {
    return createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: 16,
        height: 16,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
      },
      createElement("path", { d: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" }),
      createElement("path", { d: "M13.5 6.5 17.5 10.5" })
    );
  }

	exports.apply = apply;
	exports.inject = inject;
		return module.exports;
	}
});

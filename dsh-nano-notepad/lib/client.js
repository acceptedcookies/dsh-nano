window.__ModuleLoader__.load({
	id: "dsh-nano-notepad",
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
  var import_react = __toESM(__require("react"), 1);

  // src/client/db.js
  var DB_NAME = "dsh-nano-notepad";
  var DB_VERSION = 1;
  var CHANNEL = "dsh-nano-notepad";
  var DEFAULT_SETTINGS = {
    saveDelayMs: 800,
    commitIntervalSec: 60,
    versionLimit: 50,
    imageLimitBytes: 5 * 1024 * 1024,
    defaultView: "rendered",
    theme: "dark"
  };
  var IMAGE_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
  function record(value) {
    return typeof value === "object" && value !== null;
  }
  function normalizeSettings(config) {
    const source = record(config) ? config : {};
    const number = (key, fallback, min, max) => {
      const value = source[key];
      if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return fallback;
      return value;
    };
    return {
      saveDelayMs: number("saveDelayMs", DEFAULT_SETTINGS.saveDelayMs, 200, 5e3),
      commitIntervalSec: number("commitIntervalSec", DEFAULT_SETTINGS.commitIntervalSec, 15, 3600),
      versionLimit: number("versionLimit", DEFAULT_SETTINGS.versionLimit, 5, 500),
      imageLimitBytes: number("imageLimitBytes", DEFAULT_SETTINGS.imageLimitBytes, 256 * 1024, 20 * 1024 * 1024),
      defaultView: source.defaultView === "source" ? "source" : "rendered",
      theme: source.theme === "light" || source.theme === "system" ? source.theme : "dark"
    };
  }
  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("notepad database request failed"));
    });
  }
  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(void 0);
      transaction.onabort = () => reject(transaction.error ?? new Error("notepad database transaction aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("notepad database transaction failed"));
    });
  }
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("nodes")) {
          const nodes = db.createObjectStore("nodes", { keyPath: "id" });
          nodes.createIndex("parentId", "parentId", { unique: false });
        }
        if (!db.objectStoreNames.contains("versions")) {
          const versions = db.createObjectStore("versions", { keyPath: "id" });
          versions.createIndex("fileCreated", ["fileId", "createdAt"], { unique: false });
        }
        if (!db.objectStoreNames.contains("images")) {
          const images = db.createObjectStore("images", { keyPath: "id" });
          images.createIndex("sha256", "sha256", { unique: true });
        }
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "id" });
        if (!db.objectStoreNames.contains("ui")) db.createObjectStore("ui", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("notepad database failed to open"));
    });
  }
  function validateName(name) {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.includes("/") || trimmed.includes("\\")) {
      throw new Error("notepad name is empty or contains a slash");
    }
    return trimmed;
  }
  function fileName(name) {
    const trimmed = validateName(name);
    return trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
  }
  function taken(siblings, name) {
    const wanted = name.toLowerCase();
    return siblings.some((node) => node.name.toLowerCase() === wanted);
  }
  function nextUntitled(siblings) {
    if (!taken(siblings, "untitled.md")) return "untitled.md";
    for (let index = 2; index < 1e4; index += 1) {
      const name = `untitled-${index}.md`;
      if (!taken(siblings, name)) return name;
    }
    throw new Error("notepad cannot find an unused untitled name");
  }
  async function readAll(db, storeName) {
    const transaction = db.transaction(storeName, "readonly");
    const rows = await requestToPromise(transaction.objectStore(storeName).getAll());
    await transactionDone(transaction);
    return rows;
  }
  async function loadSnapshot(db) {
    const [nodes, settingsRows, uiRows] = await Promise.all([
      readAll(db, "nodes"),
      readAll(db, "settings"),
      readAll(db, "ui")
    ]);
    const settings = normalizeSettings(settingsRows[0]);
    const ui = uiRows[0] ?? { id: "ui", open: false, tabs: [] };
    return { nodes, settings, ui };
  }
  async function siblingsOf(db, parentId) {
    const nodes = await readAll(db, "nodes");
    return nodes.filter((node) => node.parentId === parentId);
  }
  async function createNode(db, kind, parentId, name) {
    const siblings = await siblingsOf(db, parentId);
    const finalName = kind === "file" ? fileName(name) : validateName(name);
    if (taken(siblings, finalName)) throw new Error("notepad name is already used in this folder");
    const now = Date.now();
    const node = {
      id: crypto.randomUUID(),
      parentId,
      kind,
      name: finalName,
      createdAt: now,
      updatedAt: now,
      ...kind === "file" ? { draft: "" } : {}
    };
    const transaction = db.transaction("nodes", "readwrite");
    transaction.objectStore("nodes").put(node);
    await transactionDone(transaction);
    return node;
  }
  async function renameNode(db, id, name) {
    const transaction = db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    const node = await requestToPromise(store.get(id));
    if (!node) throw new Error("notepad item no longer exists");
    const finalName = node.kind === "file" ? fileName(name) : validateName(name);
    const siblings = await siblingsOf(db, node.parentId);
    if (siblings.some((item) => item.id !== id && item.name.toLowerCase() === finalName.toLowerCase())) {
      transaction.abort();
      throw new Error("notepad name is already used in this folder");
    }
    node.name = finalName;
    node.updatedAt = Date.now();
    store.put(node);
    await transactionDone(transaction);
    return node;
  }
  function descendantIds(nodes, id) {
    const result = [];
    const visit = (current) => {
      for (const node of nodes) {
        if (node.parentId !== current) continue;
        result.push(node.id);
        if (node.kind === "folder") visit(node.id);
      }
    };
    visit(id);
    return result;
  }
  async function moveNode(db, id, parentId) {
    const nodes = await readAll(db, "nodes");
    const node = nodes.find((item) => item.id === id);
    if (!node) throw new Error("notepad item no longer exists");
    if (parentId !== null && !nodes.some((item) => item.id === parentId && item.kind === "folder")) {
      throw new Error("notepad destination folder no longer exists");
    }
    if (parentId === id || descendantIds(nodes, id).includes(parentId)) {
      throw new Error("notepad cannot move a folder into itself");
    }
    const siblings = nodes.filter((item) => item.parentId === parentId && item.id !== id);
    if (taken(siblings, node.name)) throw new Error("notepad name is already used in this folder");
    node.parentId = parentId;
    node.updatedAt = Date.now();
    const transaction = db.transaction("nodes", "readwrite");
    transaction.objectStore("nodes").put(node);
    await transactionDone(transaction);
    return node;
  }
  function imageIdsIn(markdown) {
    return [...markdown.matchAll(/notepad-image:([0-9a-f-]{36})/gu)].map((match) => match[1]);
  }
  async function dropOrphanImages(store, live) {
    const images = await requestToPromise(store.getAll());
    for (const image of images) {
      if (!live.has(image.id)) store.delete(image.id);
    }
  }
  async function deleteNode(db, id) {
    const nodes = await readAll(db, "nodes");
    const target = nodes.find((item) => item.id === id);
    if (!target) return;
    const ids = /* @__PURE__ */ new Set([id, ...descendantIds(nodes, id)]);
    const removedFiles = nodes.filter((node) => ids.has(node.id) && node.kind === "file").map((node) => node.id);
    const transaction = db.transaction(["nodes", "versions", "images"], "readwrite");
    const nodeStore = transaction.objectStore("nodes");
    const versionStore = transaction.objectStore("versions");
    const imageStore = transaction.objectStore("images");
    for (const nodeId of ids) nodeStore.delete(nodeId);
    const versions = await requestToPromise(versionStore.getAll());
    const removedVersions = versions.filter((version) => removedFiles.includes(version.fileId));
    for (const version of removedVersions) versionStore.delete(version.id);
    const remaining = versions.filter((version) => !removedFiles.includes(version.fileId));
    const live = /* @__PURE__ */ new Set();
    for (const node of nodes) {
      if (node.kind !== "file" || ids.has(node.id)) continue;
      for (const imageId of imageIdsIn(node.draft ?? "")) live.add(imageId);
    }
    for (const version of remaining) {
      for (const imageId of version.imageIds ?? []) live.add(imageId);
    }
    await dropOrphanImages(imageStore, live);
    await transactionDone(transaction);
  }
  async function versionsOf(db, fileId) {
    const transaction = db.transaction("versions", "readonly");
    const rows = await requestToPromise(transaction.objectStore("versions").index("fileCreated").getAll(IDBKeyRange.bound([fileId, 0], [fileId, Number.MAX_SAFE_INTEGER])));
    await transactionDone(transaction);
    return rows.sort((left, right) => right.createdAt - left.createdAt);
  }
  async function commitVersion(db, fileId, markdown, reason, limit) {
    const transaction = db.transaction(["nodes", "versions", "images"], "readwrite");
    const nodeStore = transaction.objectStore("nodes");
    const versionStore = transaction.objectStore("versions");
    const node = await requestToPromise(nodeStore.get(fileId));
    if (!node || node.kind !== "file") {
      transaction.abort();
      throw new Error("notepad file no longer exists");
    }
    const rows = await requestToPromise(versionStore.index("fileCreated").getAll(IDBKeyRange.bound([fileId, 0], [fileId, Number.MAX_SAFE_INTEGER])));
    const newest = rows.reduce((best, row) => best === void 0 || row.createdAt > best.createdAt ? row : best, void 0);
    if (newest?.markdown === markdown) {
      transaction.abort();
      return null;
    }
    const version = {
      id: crypto.randomUUID(),
      fileId,
      createdAt: Date.now(),
      reason,
      markdown,
      imageIds: imageIdsIn(markdown)
    };
    versionStore.put(version);
    node.draft = markdown;
    node.updatedAt = version.createdAt;
    nodeStore.put(node);
    const kept = [...rows, version].sort((left, right) => left.createdAt - right.createdAt);
    const automatic = kept.filter((row) => row.reason === "interval");
    const overflow = kept.length - limit;
    const drop = /* @__PURE__ */ new Set();
    if (overflow > 0) {
      for (const row of automatic) {
        if (drop.size >= overflow) break;
        drop.add(row.id);
      }
    }
    if (kept.length - drop.size > limit) {
      for (const row of kept) {
        if (kept.length - drop.size <= limit) break;
        if (row.reason !== "interval") drop.add(row.id);
      }
    }
    for (const id of drop) versionStore.delete(id);
    await transactionDone(transaction);
    await pruneImages(db);
    return version;
  }
  async function pruneImages(db) {
    const transaction = db.transaction(["nodes", "versions", "images"], "readwrite");
    const nodes = await requestToPromise(transaction.objectStore("nodes").getAll());
    const versions = await requestToPromise(transaction.objectStore("versions").getAll());
    const live = /* @__PURE__ */ new Set();
    for (const node of nodes) {
      if (node.kind === "file") for (const id of imageIdsIn(node.draft ?? "")) live.add(id);
    }
    for (const version of versions) for (const id of version.imageIds ?? []) live.add(id);
    await dropOrphanImages(transaction.objectStore("images"), live);
    await transactionDone(transaction);
  }
  async function saveDraft(db, fileId, draft) {
    const transaction = db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    const node = await requestToPromise(store.get(fileId));
    if (!node || node.kind !== "file") {
      transaction.abort();
      throw new Error("notepad file no longer exists");
    }
    if (node.draft === draft) {
      transaction.abort();
      return node;
    }
    node.draft = draft;
    node.updatedAt = Date.now();
    store.put(node);
    await transactionDone(transaction);
    return node;
  }
  async function clearContent(db) {
    const transaction = db.transaction(["nodes", "versions", "images"], "readwrite");
    transaction.objectStore("nodes").clear();
    transaction.objectStore("versions").clear();
    transaction.objectStore("images").clear();
    await transactionDone(transaction);
  }
  async function writeSettings(db, settings) {
    const transaction = db.transaction("settings", "readwrite");
    transaction.objectStore("settings").put({ id: "settings", ...normalizeSettings(settings) });
    await transactionDone(transaction);
  }
  async function writeUi(db, ui) {
    const transaction = db.transaction("ui", "readwrite");
    transaction.objectStore("ui").put({ ...ui, id: "ui" });
    await transactionDone(transaction);
  }
  async function sha256(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return {
      bytes,
      hex: [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("")
    };
  }
  function toBase64(bytes) {
    let text = "";
    const chunk = 32768;
    for (let index = 0; index < bytes.length; index += chunk) {
      text += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }
    return btoa(text);
  }
  async function storeImage(db, blob, limit) {
    if (!IMAGE_TYPES.has(blob.type)) throw new Error("notepad accepts png, jpeg, gif, and webp images");
    if (blob.size > limit) throw new Error("notepad image is larger than the configured limit");
    const hashed = await sha256(blob);
    const transaction = db.transaction("images", "readwrite");
    const store = transaction.objectStore("images");
    const existing = await requestToPromise(store.index("sha256").get(hashed.hex));
    if (existing) {
      await transactionDone(transaction);
      return existing;
    }
    const image = {
      id: crypto.randomUUID(),
      mime: blob.type,
      base64: toBase64(hashed.bytes),
      sha256: hashed.hex,
      byteLength: hashed.bytes.byteLength,
      createdAt: Date.now()
    };
    store.put(image);
    await transactionDone(transaction);
    return image;
  }
  async function imagesById(db, ids) {
    const unique = [...new Set(ids)];
    const transaction = db.transaction("images", "readonly");
    const store = transaction.objectStore("images");
    const rows = await Promise.all(unique.map((id) => requestToPromise(store.get(id))));
    await transactionDone(transaction);
    return new Map(rows.filter(Boolean).map((row) => [row.id, row]));
  }
  async function counts(db) {
    const [nodes, versions, images] = await Promise.all([
      readAll(db, "nodes"),
      readAll(db, "versions"),
      readAll(db, "images")
    ]);
    return {
      files: nodes.filter((node) => node.kind === "file").length,
      versions: versions.length,
      images: images.length
    };
  }

  // src/client/markdown.js
  var ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  function escapeHtml(value) {
    return value.replace(/[&<>"]/gu, (char) => ESCAPE[char]);
  }
  function renderMarkdown(markdown, images) {
    const lines = markdown.replace(/\r\n/gu, "\n").split("\n");
    const html = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (line.trim() === "") {
        index += 1;
        continue;
      }
      const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
      if (heading) {
        const level = heading[1].length;
        html.push(`<h${level}>${inline(heading[2], images)}</h${level}>`);
        index += 1;
        continue;
      }
      if (line.startsWith("> ")) {
        const quoted = [];
        while (index < lines.length && lines[index].startsWith("> ")) {
          quoted.push(lines[index].slice(2));
          index += 1;
        }
        html.push(`<blockquote><p>${quoted.map((item) => inline(item, images)).join("<br>")}</p></blockquote>`);
        continue;
      }
      if (/^[-*]\s+/u.test(line)) {
        const items = [];
        while (index < lines.length && /^[-*]\s+/u.test(lines[index])) {
          const checked = /^[-*]\s+\[( |x)\]\s+(.*)$/u.exec(lines[index]);
          if (checked) {
            const mark = checked[1] === "x" ? "checked" : "";
            items.push(`<li><input type="checkbox" disabled ${mark}>${inline(checked[2], images)}</li>`);
          } else {
            items.push(`<li>${inline(lines[index].replace(/^[-*]\s+/u, ""), images)}</li>`);
          }
          index += 1;
        }
        html.push(`<ul>${items.join("")}</ul>`);
        continue;
      }
      if (/^\d+\.\s+/u.test(line)) {
        const items = [];
        while (index < lines.length && /^\d+\.\s+/u.test(lines[index])) {
          items.push(`<li>${inline(lines[index].replace(/^\d+\.\s+/u, ""), images)}</li>`);
          index += 1;
        }
        html.push(`<ol>${items.join("")}</ol>`);
        continue;
      }
      const paragraph = [];
      while (index < lines.length && lines[index].trim() !== "" && !blockStart(lines[index])) {
        paragraph.push(lines[index]);
        index += 1;
      }
      html.push(`<p>${paragraph.map((item) => inline(item, images)).join("<br>")}</p>`);
    }
    return html.join("");
  }
  function blockStart(line) {
    return /^(#{1,3})\s+/u.test(line) || line.startsWith("> ") || /^[-*]\s+/u.test(line) || /^\d+\.\s+/u.test(line);
  }
  function inline(text, images) {
    const pattern = /!\[([^\]]*)\]\(notepad-image:([0-9a-f-]{36})\)|!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*/gu;
    let result = "";
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      result += escapeHtml(text.slice(cursor, match.index));
      if (match[2]) {
        const image = images.get(match[2]);
        result += image ? `<img alt="${escapeHtml(match[1])}" src="data:${image.mime};base64,${image.base64}">` : `<span class="missing-image">${escapeHtml(match[2])}</span>`;
      } else if (match[4]) {
        const src = escapeHtml(match[4]);
        result += `<img alt="${escapeHtml(match[3])}" src="${src}">`;
      } else if (match[6]) {
        const href = escapeHtml(match[6]);
        result += `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(match[5])}</a>`;
      } else if (match[7]) {
        result += `<code>${escapeHtml(match[7])}</code>`;
      } else if (match[8]) {
        result += `<strong>${escapeHtml(match[8])}</strong>`;
      } else if (match[9]) {
        result += `<del>${escapeHtml(match[9])}</del>`;
      } else if (match[10]) {
        result += `<em>${escapeHtml(match[10])}</em>`;
      }
      cursor = match.index + match[0].length;
    }
    return result + escapeHtml(text.slice(cursor));
  }
  function applyFormat(markdown, start, end, kind) {
    const selected = markdown.slice(start, end);
    const wrap = (before, after = before) => ({
      text: markdown.slice(0, start) + before + (selected || "text") + after + markdown.slice(end),
      cursor: start + before.length
    });
    if (kind === "bold") return wrap("**");
    if (kind === "italic") return wrap("*");
    if (kind === "strike") return wrap("~~");
    if (kind === "code") return wrap("`");
    if (kind === "link") return wrap("[", "](https://)");
    const lineStart = markdown.lastIndexOf("\n", start - 1) + 1;
    const prefix = {
      paragraph: "",
      h1: "# ",
      h2: "## ",
      h3: "### ",
      bullet: "- ",
      numbered: "1. ",
      task: "- [ ] ",
      quote: "> "
    }[kind];
    if (prefix === void 0) return { text: markdown, cursor: start };
    return {
      text: markdown.slice(0, lineStart) + prefix + markdown.slice(lineStart),
      cursor: start + prefix.length
    };
  }

  // src/client/panel.js
  var STYLE = `
.np-layer { position: absolute; inset: 0; pointer-events: none; z-index: 30; }
.np-entry, .np-window { pointer-events: auto; position: absolute; }
.np-entry { width: 36px; height: 36px; border: 0; border-radius: 10px; background: #3a3a3a; color: #fff; cursor: grab; }
.np-entry:active { cursor: grabbing; }
.np-entry svg { width: 18px; height: 18px; display: block; margin: auto; }
.np-tip { position: absolute; right: 44px; top: 4px; white-space: nowrap; background: #fff; color: #222; border-radius: 8px; padding: 4px 8px; font: 12px/1.4 sans-serif; }
.np-window { width: min(920px, calc(100% - 48px)); height: min(640px, calc(100% - 48px)); display: flex; flex-direction: column; background: #1e1e1e; color: #e8e8e8; border-radius: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.45); overflow: hidden; font: 13px/1.5 sans-serif; }
.np-window[data-theme="light"] { background: #f7f7f5; color: #222; }
.np-tabs { display: flex; align-items: center; gap: 6px; padding: 8px; cursor: grab; }
.np-tab { border: 0; background: transparent; color: inherit; padding: 4px 8px; border-bottom: 2px solid transparent; }
.np-tab[data-active="true"] { border-bottom-color: currentColor; }
.np-body { display: flex; min-height: 0; flex: 1; }
.np-tree { width: 210px; overflow: auto; border-right: 1px solid rgba(127,127,127,.3); padding: 8px; }
.np-editor { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.np-path, .np-toolbar, .np-status { display: flex; gap: 6px; align-items: center; padding: 6px 8px; }
.np-path { font-family: ui-monospace, monospace; font-size: 12px; opacity: .75; }
.np-path span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-toolbar button, .np-tree button, .np-status button, .np-tabs button, .np-dialog button { border: 0; background: transparent; color: inherit; border-radius: 6px; padding: 3px 6px; cursor: pointer; }
.np-toolbar button:hover, .np-tree button:hover, .np-status button:hover { background: rgba(127,127,127,.2); }
.np-write, .np-read { flex: 1; min-height: 0; margin: 0 8px 8px; }
.np-write { width: calc(100% - 16px); resize: none; border: 0; outline: 0; background: transparent; color: inherit; font: 14px/1.6 ui-monospace, monospace; }
.np-read { overflow: auto; padding: 8px 12px; }
.np-read img { max-width: 100%; }
.np-read .missing-image { border: 1px dashed currentColor; padding: 2px 4px; }
.np-node { display: flex; width: 100%; text-align: left; }
.np-node[data-active="true"] { background: rgba(127,127,127,.25); }
.np-dialog { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; pointer-events: auto; }
.np-card { width: min(420px, calc(100% - 32px)); background: #2a2a2a; color: #eee; border-radius: 12px; padding: 16px; }
.np-window[data-theme="light"] .np-card { background: #fff; color: #222; }
.np-card label { display: block; margin: 8px 0; }
.np-card input, .np-card select { margin-left: 8px; }
.np-versions { max-height: 240px; overflow: auto; }
.np-error { color: #ffb4b4; padding: 0 8px 8px; }
.np-slash { position: absolute; left: 230px; bottom: 72px; background: #2a2a2a; border-radius: 8px; padding: 6px; display: flex; flex-wrap: wrap; gap: 4px; max-width: 360px; }
.np-window[data-theme="light"] .np-slash { background: #fff; }
`;
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z"></path><path d="M14 3.5V8h4.5"></path></svg>';
  function must(root, selector) {
    const node = root.querySelector(selector);
    if (!(node instanceof HTMLElement)) throw new Error(`notepad missing ${selector}`);
    return node;
  }
  function mountNotepad(host, defaults) {
    host.innerHTML = `<div class="np-layer"><button class="np-entry" type="button">${ICON}<span class="np-tip" hidden></span></button><section class="np-window" hidden></section></div>`;
    const layer = must(host, ".np-layer");
    const entry = must(host, ".np-entry");
    const tip = must(host, ".np-tip");
    const panel = must(host, ".np-window");
    panel.innerHTML = `
    <div class="np-tabs"><button type="button" data-action="tree">\u6536\u8D77</button><div class="np-tablist"></div><button type="button" data-action="new-file">+</button><span style="flex:1"></span><button type="button" data-action="theme">\u4E3B\u9898</button><button type="button" data-action="settings">\u8BBE\u7F6E</button><button type="button" data-action="close">\u6536\u56DE</button></div>
    <div class="np-body">
      <aside class="np-tree"><div><button type="button" data-action="new-folder">\u65B0\u5EFA\u6587\u4EF6\u5939</button><button type="button" data-action="new-file">\u65B0\u5EFA\u6587\u4EF6</button><button type="button" data-action="rename">\u91CD\u547D\u540D</button><button type="button" data-action="delete">\u5220\u9664</button></div><div class="np-nodes" data-root="true"></div></aside>
      <div class="np-editor">
        <div class="np-path"><span class="np-pathname"></span><button type="button" data-action="view">\u6E32\u67D3</button><button type="button" data-action="copy">\u590D\u5236\u8DEF\u5F84</button><button type="button" data-action="history">\u5386\u53F2\u7248\u672C</button><button type="button" data-action="settings">\u8BBE\u7F6E</button><button type="button" data-action="close">\u6536\u56DE</button></div>
        <div class="np-toolbar">${["paragraph", "h1", "h2", "h3", "bold", "italic", "strike", "bullet", "numbered", "task", "quote", "link"].map((kind) => `<button type="button" data-format="${kind}">${kind}</button>`).join("")}<button type="button" data-action="image">\u56FE\u7247</button></div>
        <textarea class="np-write" placeholder="Write markdown... Type / for blocks."></textarea>
        <div class="np-slash" hidden></div>
        <div class="np-read" hidden></div>
        <div class="np-error" hidden></div>
      </div>
    </div>
    <div class="np-dialog" hidden><div class="np-card"></div></div>
    <input class="np-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
  `;
    const style = document.createElement("style");
    style.textContent = STYLE;
    host.append(style);
    const state = {
      db: (
        /** @type {IDBDatabase | null} */
        null
      ),
      nodes: (
        /** @type {any[]} */
        []
      ),
      settings: defaults,
      ui: { id: "ui", open: false, tabs: (
        /** @type {string[]} */
        []
      ), currentId: (
        /** @type {string | null} */
        null
      ), entryX: null, entryY: null, panelX: null, panelY: null },
      view: defaults.defaultView,
      slash: false,
      saveTimer: (
        /** @type {number | undefined} */
        void 0
      ),
      commitTimer: (
        /** @type {number | undefined} */
        void 0
      ),
      dirty: false
    };
    const write = () => (
      /** @type {HTMLTextAreaElement} */
      must(panel, ".np-write")
    );
    const current = () => state.nodes.find((node) => node.id === state.ui.currentId && node.kind === "file");
    function showError(error) {
      const node = must(panel, ".np-error");
      node.hidden = false;
      const full = error?.name === "QuotaExceededError";
      node.textContent = full ? "\u7A7A\u95F4\u4E0D\u591F\uFF0C\u8FD9\u6B21\u6CA1\u6709\u5199\u5165\u3002" : error instanceof Error ? error.message : String(error);
    }
    function pathOf(id) {
      const names = [];
      let cursor = state.nodes.find((node) => node.id === id);
      const guard = /* @__PURE__ */ new Set();
      while (cursor && !guard.has(cursor.id)) {
        guard.add(cursor.id);
        names.unshift(cursor.name);
        cursor = state.nodes.find((node) => node.id === cursor.parentId);
      }
      return `/${names.join("/")}`;
    }
    function place(node, x, y, fallbackRight) {
      const bounds = layer.getBoundingClientRect();
      const width = node.offsetWidth || 36;
      const height = node.offsetHeight || 36;
      const left = x ?? Math.max(8, bounds.width - width - (fallbackRight ?? 24));
      const top = y ?? Math.max(8, bounds.height - height - 24);
      node.style.left = `${Math.min(Math.max(8, left), Math.max(8, bounds.width - width - 8))}px`;
      node.style.top = `${Math.min(Math.max(8, top), Math.max(8, bounds.height - height - 8))}px`;
    }
    function renderTree() {
      const box = must(panel, ".np-nodes");
      const lines = [];
      const visit = (parentId, depth) => {
        for (const node of state.nodes.filter((item) => item.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))) {
          lines.push(`<button class="np-node" type="button" draggable="true" data-id="${node.id}" data-active="${node.id === state.ui.currentId}" style="padding-left:${8 + depth * 14}px">${node.kind === "folder" ? "\u25B8 " : ""}${node.name}</button>`);
          if (node.kind === "folder") visit(node.id, depth + 1);
        }
      };
      visit(null, 0);
      box.innerHTML = lines.join("");
    }
    function renderTabs() {
      const box = must(panel, ".np-tablist");
      box.innerHTML = state.ui.tabs.map((id) => {
        const node = state.nodes.find((item) => item.id === id);
        if (!node) return "";
        return `<button class="np-tab" type="button" data-tab="${id}" data-active="${id === state.ui.currentId}">${node.name} <span data-close="${id}">\xD7</span></button>`;
      }).join("");
    }
    async function renderBody() {
      const file = current();
      must(panel, ".np-pathname").textContent = file ? pathOf(file.id) : "\u672A\u6253\u5F00\u6587\u4EF6";
      const source = write();
      const read = must(panel, ".np-read");
      if (!file) {
        source.value = "";
        source.disabled = true;
        read.hidden = true;
        return;
      }
      source.disabled = state.db === null;
      if (document.activeElement !== source && !state.dirty) source.value = file.draft ?? "";
      const rendered = state.view === "rendered";
      source.hidden = rendered;
      read.hidden = !rendered;
      must(panel, '[data-action="view"]').textContent = rendered ? "\u6E90\u7801" : "\u6E32\u67D3";
      if (!rendered || state.db === null) return;
      const images = await imagesById(state.db, imageIdsIn(file.draft ?? ""));
      const markdown = file.draft ?? "";
      read.innerHTML = markdown === "" ? '<p class="np-placeholder">Write markdown... Type / for blocks.</p>' : renderMarkdown(markdown, images);
    }
    function render() {
      panel.hidden = !state.ui.open;
      panel.dataset.theme = state.settings.theme === "system" ? matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : state.settings.theme;
      renderTree();
      renderTabs();
      void renderBody();
      requestAnimationFrame(() => {
        place(entry, state.ui.entryX, state.ui.entryY, 72);
        place(panel, state.ui.panelX, state.ui.panelY, 80);
      });
    }
    async function persistUi() {
      if (state.db) await writeUi(state.db, state.ui);
    }
    function openFile(id) {
      if (!state.ui.tabs.includes(id)) state.ui.tabs.push(id);
      state.ui.currentId = id;
      state.ui.open = true;
      state.dirty = false;
      render();
      void persistUi();
    }
    function selectedParent() {
      const selected = state.nodes.find((node) => node.id === state.ui.currentId);
      return selected?.kind === "folder" ? selected.id : selected?.parentId ?? null;
    }
    async function add(kind) {
      if (!state.db) return;
      const parentId = selectedParent();
      const siblings = state.nodes.filter((node2) => node2.parentId === parentId);
      const name = kind === "file" ? nextUntitled(siblings) : `folder-${siblings.length + 1}`;
      const node = await createNode(state.db, kind, parentId, name);
      state.nodes.push(node);
      if (kind === "file") openFile(node.id);
      else {
        state.ui.currentId = node.id;
        render();
      }
      channel?.postMessage({ type: "changed" });
    }
    function askName(title, initial, done) {
      dialog(`<h3>${title}</h3><input name="node-name" value="${initial.replace(/"/gu, "&quot;")}"><button type="button" data-go="cancel">\u53D6\u6D88</button><button type="button" data-go="ok">\u786E\u5B9A</button>`, (card, close) => {
        const input = card.querySelector('[name="node-name"]');
        input.focus();
        card.addEventListener("click", (event) => {
          const action = event.target instanceof HTMLElement ? event.target.dataset.go : void 0;
          if (action === "cancel") close();
          if (action === "ok") {
            close();
            void done(input.value).catch(showError);
          }
        });
      });
    }
    function scheduleSave() {
      state.dirty = true;
      window.clearTimeout(state.saveTimer);
      state.saveTimer = window.setTimeout(() => {
        const file = current();
        if (!file || !state.db) return;
        const draft = write().value;
        file.draft = draft;
        void saveDraft(state.db, file.id, draft).then(() => {
          state.dirty = false;
          channel?.postMessage({ type: "changed", fileId: file.id });
        }).catch(showError);
      }, state.settings.saveDelayMs);
    }
    async function commit(reason) {
      const file = current();
      if (!file || !state.db) return null;
      if (state.dirty) {
        file.draft = write().value;
        await saveDraft(state.db, file.id, file.draft);
        state.dirty = false;
      }
      const text = file.draft ?? "";
      if (text === "" && reason === "interval") return null;
      return commitVersion(state.db, file.id, text, reason, state.settings.versionLimit);
    }
    async function forget(id) {
      if (!state.db) return;
      await deleteNode(state.db, id);
      const removed = /* @__PURE__ */ new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const node of state.nodes) {
          if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
            removed.add(node.id);
            grew = true;
          }
        }
      }
      state.nodes = state.nodes.filter((node) => !removed.has(node.id));
      state.ui.tabs = state.ui.tabs.filter((tab) => !removed.has(tab));
      if (state.ui.currentId && removed.has(state.ui.currentId)) state.ui.currentId = state.ui.tabs.at(-1) ?? null;
      render();
      void persistUi();
      channel?.postMessage({ type: "changed" });
    }
    async function clearCurrentFile() {
      const file = current();
      if (!file || !state.db) return;
      file.draft = "";
      write().value = "";
      state.dirty = false;
      await commit("manual");
      render();
    }
    function armCommit() {
      window.clearInterval(state.commitTimer);
      state.commitTimer = window.setInterval(() => {
        if (state.ui.open) void commit("interval").catch(showError);
      }, state.settings.commitIntervalSec * 1e3);
    }
    function dialog(html, setup) {
      const mask = must(panel, ".np-dialog");
      const card = must(panel, ".np-card");
      card.innerHTML = html;
      mask.hidden = false;
      setup(card, () => {
        mask.hidden = true;
      });
    }
    function openSettings() {
      const values = state.settings;
      dialog(`<h3>\u4FBF\u7B7E\u8BBE\u7F6E</h3>
      <label>\u81EA\u52A8\u4FDD\u5B58\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09<input name="saveDelayMs" type="number" min="200" max="5000" value="${values.saveDelayMs}"></label>
      <label>\u81EA\u52A8\u63D0\u4EA4\u95F4\u9694\uFF08\u79D2\uFF09<input name="commitIntervalSec" type="number" min="15" max="3600" value="${values.commitIntervalSec}"></label>
      <label>\u6BCF\u4E2A\u6587\u4EF6\u4FDD\u7559\u7248\u672C\u6570<input name="versionLimit" type="number" min="5" max="500" value="${values.versionLimit}"></label>
      <label>\u5355\u5F20\u56FE\u7247\u4E0A\u9650\uFF08\u5B57\u8282\uFF09<input name="imageLimitBytes" type="number" min="262144" max="20971520" value="${values.imageLimitBytes}"></label>
      <label>\u6253\u5F00\u6587\u4EF6\u65F6\u7684\u89C6\u56FE<select name="defaultView"><option value="rendered">\u6E32\u67D3</option><option value="source">\u6E90\u7801</option></select></label>
      <label>\u6D6E\u7A97\u4E3B\u9898<select name="theme"><option value="dark">\u6DF1\u8272</option><option value="light">\u6D45\u8272</option><option value="system">\u8DDF\u968F\u5E94\u7528</option></select></label>
      <p class="np-usage"></p>
      <button type="button" data-go="save-version">\u4FDD\u5B58\u7248\u672C</button>
      <button type="button" data-go="clear-file">\u6E05\u7A7A\u5F53\u524D\u6587\u4EF6</button>
      <button type="button" data-go="reset-position">\u91CD\u7F6E\u4F4D\u7F6E</button>
      <button type="button" data-go="clear">\u6E05\u7A7A\u5168\u90E8\u5185\u5BB9</button>
      <button type="button" data-go="close">\u5173\u95ED</button>`, (card, close) => {
        card.querySelector('[name="defaultView"]').value = values.defaultView;
        card.querySelector('[name="theme"]').value = values.theme;
        if (state.db) void counts(state.db).then(async (value) => {
          const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
          must(card, ".np-usage").textContent = `\u6587\u4EF6 ${value.files}\uFF0C\u7248\u672C ${value.versions}\uFF0C\u56FE\u7247 ${value.images}\uFF0C\u5DF2\u7528 ${estimate.usage ?? "\u672A\u77E5"} \u5B57\u8282`;
        });
        card.addEventListener("click", (event) => {
          const action = event.target instanceof HTMLElement ? event.target.dataset.go : void 0;
          if (action === "close") close();
          if (action === "save-version") void commit("manual").catch(showError);
          if (action === "clear-file") void clearCurrentFile().catch(showError);
          if (action === "reset-position") {
            state.ui.entryX = null;
            state.ui.entryY = null;
            state.ui.panelX = null;
            state.ui.panelY = null;
            render();
            void persistUi();
          }
          if (action === "clear") confirmClear(close);
        });
        card.addEventListener("change", () => {
          const next = {};
          for (const input of card.querySelectorAll("input, select")) next[input.name] = input.type === "number" ? Number(input.value) : input.value;
          const merged = { ...state.settings };
          let rejected = false;
          for (const [key, value] of Object.entries(next)) {
            const trial = normalizeSettings({ ...state.settings, [key]: value });
            if (trial[key] === value) merged[key] = value;
            else rejected = true;
          }
          state.settings = merged;
          for (const input of card.querySelectorAll("input, select")) input.value = merged[input.name];
          if (rejected) showError(new Error("notepad kept the previous valid setting"));
          if (state.db) void writeSettings(state.db, merged).catch(showError);
          armCommit();
          render();
        });
      });
    }
    function confirmClear(closeSettings) {
      dialog('<h3>\u6E05\u7A7A\u5168\u90E8\u5185\u5BB9</h3><p>\u6587\u4EF6\u5939\u3001\u6587\u4EF6\u3001\u5386\u53F2\u7248\u672C\u548C\u56FE\u7247\u90FD\u4F1A\u5220\u9664\u3002\u6570\u636E\u53EA\u5728\u8FD9\u53F0\u6D4F\u89C8\u5668\u7684\u8FD9\u4E2A\u7F51\u7AD9\u91CC\uFF0C\u5220\u9664\u540E\u4E0D\u80FD\u6062\u590D\u3002</p><button type="button" data-go="cancel">\u53D6\u6D88</button><button type="button" data-go="confirm">\u5220\u9664\u5168\u90E8</button>', (card, close) => {
        card.querySelector('[data-go="cancel"]').focus();
        card.addEventListener("click", (event) => {
          const action = event.target instanceof HTMLElement ? event.target.dataset.go : void 0;
          if (action === "cancel") close();
          if (action === "confirm" && state.db) {
            void clearContent(state.db).then(() => {
              state.nodes = [];
              state.ui.tabs = [];
              state.ui.currentId = null;
              close();
              closeSettings();
              render();
            }).catch(showError);
          }
        });
      });
    }
    async function openHistory() {
      const file = current();
      if (!file || !state.db) return;
      const versions = await versionsOf(state.db, file.id);
      const reasons = { interval: "\u81EA\u52A8", manual: "\u624B\u52A8", restore: "\u56DE\u9000" };
      const rows = versions.map((version) => `<button type="button" data-version="${version.id}">${new Date(version.createdAt).toLocaleString()} \xB7 ${reasons[version.reason] ?? version.reason} \xB7 ${version.markdown.length}</button>`).join("");
      dialog(`<h3>\u5386\u53F2\u7248\u672C</h3><div class="np-versions">${rows || "<p>\u8FD8\u6CA1\u6709\u7248\u672C</p>"}</div><button type="button" data-go="close">\u5173\u95ED</button>`, (card, close) => {
        card.addEventListener("click", (event) => {
          const target = event.target instanceof HTMLElement ? event.target : null;
          if (target?.dataset.go === "close") close();
          const id = target?.dataset.version;
          const version = versions.find((item) => item.id === id);
          if (!version) return;
          dialog(`<h3>\u9884\u89C8 ${new Date(version.createdAt).toLocaleString()}</h3><pre>${version.markdown.replace(/[&<>]/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char])}</pre><button type="button" data-go="back">\u8FD4\u56DE</button><button type="button" data-go="restore">\u56DE\u9000\u5230\u8FD9\u4E00\u7248</button>`, (preview, closePreview) => {
            preview.addEventListener("click", (previewEvent) => {
              const action = previewEvent.target instanceof HTMLElement ? previewEvent.target.dataset.go : void 0;
              if (action === "back") closePreview();
              if (action === "restore") {
                write().value = version.markdown;
                const live = current();
                if (live) live.draft = version.markdown;
                void commit("restore").then(() => {
                  closePreview();
                  close();
                  render();
                }).catch(showError);
              }
            });
          });
        });
      });
    }
    function drag(node, onEnd) {
      let startX = 0;
      let startY = 0;
      let originX = 0;
      let originY = 0;
      let moved = false;
      const move = (event) => {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.hypot(dx, dy) > 4) moved = true;
        place(node, originX + dx, originY + dy);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        onEnd(moved, node.offsetLeft, node.offsetTop);
      };
      node.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, a") && event.target !== node) return;
        startX = event.clientX;
        startY = event.clientY;
        originX = node.offsetLeft;
        originY = node.offsetTop;
        moved = false;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
    }
    drag(entry, (moved, x, y) => {
      if (moved) {
        state.ui.entryX = x;
        state.ui.entryY = y;
        void persistUi();
        return;
      }
      state.ui.open = !state.ui.open;
      render();
      void persistUi();
      if (state.ui.open) write().focus();
    });
    const tree = must(panel, ".np-tree");
    tree.addEventListener("dragstart", (event) => {
      const row = event.target instanceof HTMLElement ? event.target.closest("[data-id]") : null;
      if (!row || !event.dataTransfer) return;
      event.dataTransfer.setData("text/plain", row.dataset.id ?? "");
      event.dataTransfer.effectAllowed = "move";
    });
    tree.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    tree.addEventListener("drop", (event) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/plain");
      if (!id || !state.db) return;
      const row = event.target instanceof HTMLElement ? event.target.closest("[data-id]") : null;
      const target = row ? state.nodes.find((node) => node.id === row.dataset.id) : null;
      const parentId = target ? target.kind === "folder" ? target.id : target.parentId : null;
      void moveNode(state.db, id, parentId).then((moved) => {
        const node = state.nodes.find((item) => item.id === id);
        if (node) node.parentId = moved.parentId;
        render();
        channel?.postMessage({ type: "changed" });
      }).catch(showError);
    });
    drag(must(panel, ".np-tabs"), (moved, x, y) => {
      if (!moved) return;
      state.ui.panelX = x;
      state.ui.panelY = y;
      void persistUi();
    });
    panel.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      const action = target.dataset.action;
      if (action === "close") {
        state.ui.open = false;
        render();
        void persistUi();
      }
      if (action === "settings") openSettings();
      if (action === "theme") {
        state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
        if (state.db) void writeSettings(state.db, state.settings);
        render();
      }
      if (action === "new-file") void add("file").catch(showError);
      if (action === "new-folder") void add("folder").catch(showError);
      if (action === "rename" && state.ui.currentId) {
        const node = state.nodes.find((item) => item.id === state.ui.currentId);
        if (node && state.db) askName("\u91CD\u547D\u540D", node.name, async (name) => {
          const renamed = await renameNode(state.db, node.id, name);
          Object.assign(node, renamed);
          render();
        });
      }
      if (action === "delete" && state.ui.currentId && state.db) {
        const id2 = state.ui.currentId;
        const node = state.nodes.find((item) => item.id === id2);
        const nested = state.nodes.some((item) => item.parentId === id2);
        if (node?.kind === "folder" && nested) {
          dialog('<h3>\u5220\u9664\u6587\u4EF6\u5939</h3><p>\u8FD9\u4E2A\u6587\u4EF6\u5939\u91CC\u8FD8\u6709\u6587\u4EF6\u6216\u5B50\u6587\u4EF6\u5939\u3002\u786E\u8BA4\u540E\u4F1A\u4E00\u5E76\u5220\u9664\uFF0C\u5305\u62EC\u5B83\u4EEC\u7684\u5386\u53F2\u7248\u672C\u3002</p><button type="button" data-go="cancel">\u53D6\u6D88</button><button type="button" data-go="confirm">\u5220\u9664</button>', (card, close) => {
            card.querySelector('[data-go="cancel"]').focus();
            card.addEventListener("click", (click) => {
              const choice = click.target instanceof HTMLElement ? click.target.dataset.go : void 0;
              if (choice === "cancel") close();
              if (choice === "confirm") {
                close();
                void forget(id2);
              }
            });
          });
        } else void forget(id2);
      }
      if (action === "clear-file") void clearCurrentFile().catch(showError);
      if (action === "tree") {
        const column = must(panel, ".np-tree");
        const hidden = column.dataset.collapsed === "true";
        column.dataset.collapsed = hidden ? "false" : "true";
        column.style.display = hidden ? "" : "none";
        target.textContent = hidden ? "\u6536\u8D77" : "\u6587\u4EF6";
      }
      if (action === "view") {
        state.view = state.view === "rendered" ? "source" : "rendered";
        void renderBody();
      }
      if (action === "copy") void navigator.clipboard?.writeText(must(panel, ".np-pathname").textContent ?? "");
      if (action === "history") void openHistory().catch(showError);
      if (action === "image") must(panel, ".np-file").click();
      const format = target.dataset.format;
      if (format) {
        const source = write();
        const applied = applyFormat(source.value, source.selectionStart, source.selectionEnd, format);
        source.value = applied.text;
        source.setSelectionRange(applied.cursor, applied.cursor);
        scheduleSave();
      }
      const tab = target.dataset.tab ?? target.dataset.close;
      if (target.dataset.close) {
        state.ui.tabs = state.ui.tabs.filter((id2) => id2 !== target.dataset.close);
        if (state.ui.currentId === target.dataset.close) state.ui.currentId = state.ui.tabs.at(-1) ?? null;
        render();
        void persistUi();
      } else if (target.dataset.tab) openFile(tab);
      const id = target.dataset.id;
      if (id) {
        const node = state.nodes.find((item) => item.id === id);
        if (node?.kind === "file") openFile(id);
        else {
          state.ui.currentId = id;
          render();
        }
      }
    });
    const slashKinds = ["paragraph", "h1", "h2", "h3", "bold", "italic", "strike", "bullet", "numbered", "task", "quote", "link"];
    const slashMenu = must(panel, ".np-slash");
    slashMenu.innerHTML = [...slashKinds, "image"].map((kind) => `<button type="button" data-slash="${kind}">${kind}</button>`).join("");
    function slashOpen() {
      const source = write();
      const before = source.value.slice(0, source.selectionStart);
      return before.endsWith("\n/") || before === "/";
    }
    write().addEventListener("input", () => {
      state.slash = slashOpen();
      slashMenu.hidden = !state.slash;
      scheduleSave();
    });
    function insertSlash(kind) {
      const source = write();
      source.setRangeText("", source.selectionStart - 1, source.selectionStart);
      state.slash = false;
      slashMenu.hidden = true;
      const applied = applyFormat(source.value, source.selectionStart, source.selectionStart, kind);
      source.value = applied.text;
      source.setSelectionRange(applied.cursor, applied.cursor);
      scheduleSave();
    }
    write().addEventListener("keydown", (event) => {
      if (!state.slash) return;
      if (event.key === "Escape") {
        state.slash = false;
        slashMenu.hidden = true;
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      insertSlash("bullet");
    });
    slashMenu.addEventListener("click", (event) => {
      const kind = event.target instanceof HTMLElement ? event.target.dataset.slash : void 0;
      if (kind === "image") must(panel, ".np-file").click();
      else if (kind) insertSlash(kind);
      state.slash = false;
      slashMenu.hidden = true;
    });
    panel.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLElement) || event.target.closest(".np-slash")) return;
      if (state.slash && event.target !== write()) {
        state.slash = false;
        slashMenu.hidden = true;
      }
    });
    must(panel, ".np-file").addEventListener("change", (event) => {
      const input = (
        /** @type {HTMLInputElement} */
        event.target
      );
      const file = input.files?.[0];
      input.value = "";
      if (!file || !state.db) return;
      void storeImage(state.db, file, state.settings.imageLimitBytes).then((image) => {
        const source = write();
        source.setRangeText(`![${file.name}](notepad-image:${image.id})`, source.selectionStart, source.selectionEnd, "end");
        scheduleSave();
      }).catch(showError);
    });
    function insertStoredImage(file) {
      if (!state.db) return;
      void storeImage(state.db, file, state.settings.imageLimitBytes).then((image) => {
        const source = write();
        source.setRangeText(`![${file.name || "image"}](notepad-image:${image.id})`, source.selectionStart, source.selectionEnd, "end");
        state.view = "source";
        scheduleSave();
        void renderBody();
      }).catch(showError);
    }
    panel.addEventListener("dragover", (event) => {
      if ([...event.dataTransfer?.files ?? []].some((file) => file.type.startsWith("image/"))) event.preventDefault();
    });
    panel.addEventListener("drop", (event) => {
      const image = [...event.dataTransfer?.files ?? []].find((file) => file.type.startsWith("image/"));
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      insertStoredImage(image);
    });
    panel.addEventListener("paste", (event) => {
      const image = [...event.clipboardData?.files ?? []].find((file) => file.type.startsWith("image/"));
      if (!image || !state.db) return;
      event.preventDefault();
      void storeImage(state.db, image, state.settings.imageLimitBytes).then((stored) => {
        const source = write();
        source.setRangeText(`![image](notepad-image:${stored.id})`, source.selectionStart, source.selectionEnd, "end");
        scheduleSave();
      }).catch(showError);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void commit("interval").catch(showError);
    });
    window.addEventListener("resize", () => render());
    const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(CHANNEL) : null;
    channel?.addEventListener("message", (event) => {
      if (state.dirty && event.data?.fileId === state.ui.currentId) {
        showError(new Error("\u5176\u4ED6\u6807\u7B7E\u9875\u5DF2\u66F4\u65B0\u8FD9\u4E2A\u6587\u4EF6"));
        return;
      }
      if (state.db) void loadSnapshot(state.db).then((snapshot) => {
        state.nodes = snapshot.nodes;
        state.settings = { ...defaults, ...snapshot.settings };
        render();
      });
    });
    const api = {
      toggle() {
        state.ui.open = !state.ui.open;
        render();
        void persistUi();
        if (state.ui.open) write().focus();
      },
      setShortcut(label, keys) {
        entry.title = label;
        entry.setAttribute("aria-label", label);
        if (keys) entry.setAttribute("aria-keyshortcuts", keys);
        tip.textContent = label;
      },
      failed(error) {
        state.db = null;
        write().disabled = true;
        showError(error);
      }
    };
    entry.addEventListener("pointerenter", () => {
      tip.hidden = false;
    });
    entry.addEventListener("pointerleave", () => {
      tip.hidden = true;
    });
    void openDatabase().then(async (db) => {
      state.db = db;
      const snapshot = await loadSnapshot(db);
      state.nodes = snapshot.nodes;
      state.settings = { ...defaults, ...snapshot.settings };
      state.ui = { ...state.ui, ...snapshot.ui, tabs: snapshot.ui.tabs ?? [] };
      state.view = state.settings.defaultView;
      armCommit();
      render();
      void navigator.storage?.persist?.();
    }).catch((error) => api.failed(error));
    render();
    return api;
  }

  // src/client/index.js
  var inject = ["slots", "shortcuts"];
  var SHORTCUT = {
    id: "notepad.toggle",
    defaults: {
      "web:macos": { code: "KeyA", modifiers: ["primary", "alt", "shift"] },
      "web:windows": { code: "KeyA", modifiers: ["primary", "alt"] }
    }
  };
  function shortcutLabel(ctx) {
    const entry = ctx.shortcuts.catalog.getSnapshot().find((item) => item.id === SHORTCUT.id);
    const keys = entry?.keys?.join(ctx.shortcuts.platform === "windows" ? " + " : "") ?? "";
    return {
      text: keys ? `Show \u4FBF\u7B7E (${keys})` : "Show \u4FBF\u7B7E",
      aria: entry?.aria
    };
  }
  function apply(ctx, config = {}) {
    const defaults = normalizeSettings(config);
    let api;
    ctx.slots.inject("shell.overlay", () => ctx.slots.register({
      name: "shell.overlay",
      id: "nano-notepad",
      order: 40,
      inject: () => ({
        defaults,
        label: () => shortcutLabel(ctx).text,
        shortcutKeys: () => shortcutLabel(ctx).aria,
        subscribeShortcut: (listener) => ctx.shortcuts.catalog.subscribe(listener),
        ready: (next) => {
          api = next;
        }
      })
    }, function Notepad({ defaults: initial, label, shortcutKeys, subscribeShortcut, ready }) {
      const ref = import_react.default.useRef(null);
      import_react.default.useEffect(() => {
        const element = ref.current;
        if (!element) return void 0;
        const mounted = mountNotepad(element, initial);
        mounted.setShortcut(label(), shortcutKeys());
        ready(mounted);
        const stop = subscribeShortcut(() => mounted.setShortcut(label(), shortcutKeys()));
        return () => {
          stop();
          ready(void 0);
          element.replaceChildren();
        };
      }, []);
      return import_react.default.createElement("div", { ref, "data-nano-notepad": "root" });
    }));
    ctx.effect(() => ctx.shortcuts.register({
      id: SHORTCUT.id,
      label: () => "Show \u4FBF\u7B7E",
      aliases: ["notepad", "nano notepad"],
      defaults: SHORTCUT.defaults,
      regions: ["page", "editable"],
      modals: [],
      resolve: ({ modal }) => modal !== null ? { status: "pass" } : { status: "handled", run: () => api?.toggle() }
    }));
  }

	exports.apply = apply;
	exports.inject = inject;
		return module.exports;
	}
});

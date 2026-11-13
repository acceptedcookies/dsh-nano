window.__ModuleLoader__.load({
	id: "dsh-nano-kitesurf",
	factory: (require) => {
var __kitesurfExport = (() => {
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
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../packages/dsh-nano-ui/src/dialog.js
  function NanoDialog({ copy, title, description, confirmLabel, confirmDisabled, busy, error, danger, footer, maxHeight, width, region, onConfirm, onCancel, children }) {
    return import_react.default.createElement(import_dsh_client_ui_primitives.Modal, {
      open: true,
      onClose: onCancel,
      title,
      description,
      closeLabel: copy.cancel,
      className: [
        "nano-dialog-card",
        maxHeight === void 0 ? "" : "nano-dialog-capped",
        width === void 0 ? "" : "nano-dialog-sized",
        region === void 0 ? "" : "nano-dialog-regioned"
      ].filter(Boolean).join(" "),
      contentClassName: "nano-dialog-content",
      footer: footer ?? import_react.default.createElement(
        import_react.default.Fragment,
        null,
        import_react.default.createElement(import_dsh_client_ui_primitives.Button, { variant: "outline", className: "nano-modal-action", onClick: onCancel }, copy.cancel),
        import_react.default.createElement(import_dsh_client_ui_primitives.Button, {
          variant: danger ? "outline" : "primary",
          className: danger ? "nano-modal-action nano-modal-danger" : "nano-modal-action",
          disabled: confirmDisabled === true || busy === true,
          onClick: onConfirm
        }, confirmLabel ?? copy.confirm)
      )
    }, children, error === void 0 ? null : import_react.default.createElement("p", { className: "nano-dialog-error", role: "alert" }, error));
  }
  var import_react, import_dsh_client_ui_primitives;
  var init_dialog = __esm({
    "../packages/dsh-nano-ui/src/dialog.js"() {
      import_react = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
    }
  });

  // ../packages/dsh-nano-ui/src/menu.js
  function NanoMenu({ menu, actions, onClose, width = 208, maxHeight, theme, z }) {
    const ref = useRef(null);
    const [active, setActive] = useState(0);
    const items = menu === null ? [] : actions;
    const count = items.length;
    const latest = useRef(items);
    latest.current = items;
    const openedAt = menu === null ? null : menu.openedAt;
    useEffect(() => {
      if (openedAt !== null) setActive(0);
    }, [openedAt]);
    useEffect(() => {
      if (menu === null) return void 0;
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
          setActive((i) => (i + 1) % count);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActive((i) => (i - 1 + count) % count);
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          onClose();
          latest.current[active]?.run();
        }
      };
      document.addEventListener("pointerdown", onPointer, true);
      document.addEventListener("keydown", onKey, true);
      return () => {
        document.removeEventListener("pointerdown", onPointer, true);
        document.removeEventListener("keydown", onKey, true);
      };
    }, [menu, active, count, onClose]);
    if (menu === null || count === 0) return null;
    const height = count * 28 + 8;
    const left = Math.min(menu.x, (window.innerWidth || width) - width - 8);
    const top = Math.min(menu.y, (window.innerHeight || height) - height - 8);
    return import_react2.default.createElement("div", {
      className: "nano-menu",
      role: "menu",
      ref,
      style: {
        position: "fixed",
        left: `${Math.max(8, left)}px`,
        top: `${Math.max(8, top)}px`,
        minWidth: `${width}px`,
        ...typeof z === "number" ? { zIndex: String(Math.round(z)) } : {},
        ...typeof maxHeight === "number" ? { maxHeight: `${Math.round(maxHeight)}px`, overflowY: "auto", overscrollBehavior: "contain" } : {}
      },
      "data-nano-menu": "true",
      /* Undefined is dropped by React, so an owner that follows the shell simply omits it. */
      "data-nano-theme": theme
    }, items.map((item, index) => import_react2.default.createElement(NanoMenuItem, {
      key: item.id,
      item,
      index,
      active: index === active,
      onHover: setActive,
      onRun: onClose
    })));
  }
  function NanoMenuItem({ item, index, active, onHover, onRun }) {
    return import_react2.default.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        className: "nano-menu-item",
        "data-active": String(active),
        "data-tone": item.tone ?? "default",
        onMouseEnter: () => onHover(index),
        onClick: () => {
          onRun();
          item.run();
        }
      },
      item.icon === void 0 ? null : import_react2.default.createElement("span", { className: "nano-menu-icon", "aria-hidden": "true" }, item.icon),
      import_react2.default.createElement("span", { className: "nano-menu-label" }, item.label)
    );
  }
  var import_react2, useCallback, useEffect, useRef, useState;
  var init_menu = __esm({
    "../packages/dsh-nano-ui/src/menu.js"() {
      import_react2 = __toESM(__require("react"), 1);
      ({ useCallback, useEffect, useRef, useState } = import_react2.default);
    }
  });

  // ../packages/dsh-nano-ui/src/toast.js
  function NanoToast({ text }) {
    if (text === void 0 || text === null) return null;
    return import_react3.default.createElement("div", { className: "nano-toast", role: "status", "aria-live": "polite", "data-nano-toast": "true" }, text);
  }
  var import_react3;
  var init_toast = __esm({
    "../packages/dsh-nano-ui/src/toast.js"() {
      import_react3 = __toESM(__require("react"), 1);
    }
  });

  // ../packages/dsh-nano-ui/src/dom.js
  function openNanoDialog(options) {
    const host = document.createElement("div");
    host.className = "nano-dialog-host";
    document.body.appendChild(host);
    const maxKey = "--nano-dlg-max";
    const maxValue = typeof options.maxHeight === "number" ? `${Math.round(options.maxHeight)}px` : null;
    if (maxValue !== null) document.documentElement.style.setProperty(maxKey, maxValue);
    const heightKey = "--nano-dlg-h";
    const heightValue = typeof options.fixedHeight === "number" ? `${Math.round(options.fixedHeight)}px` : null;
    if (heightValue !== null) document.documentElement.style.setProperty(heightKey, heightValue);
    const wantsRegion = options.region instanceof DOMRect;
    const wantsWidth = typeof options.width === "number";
    let theme = options.theme;
    const wantsTheme = theme === "light" || theme === "dark";
    let layerEl = (
      /** @type {HTMLElement | null} */
      null
    );
    const wantsZ = typeof options.z === "number";
    const observer = wantsRegion || wantsWidth || wantsTheme || wantsZ ? new MutationObserver(() => {
      for (const card of document.querySelectorAll(".nano-dialog-card")) {
        if (card instanceof HTMLElement === false || card.dataset.nanoBound === "1") continue;
        const layer = card.parentElement;
        if (!(layer instanceof HTMLElement)) continue;
        card.dataset.nanoBound = "1";
        if (wantsZ) layer.style.zIndex = String(Math.round(options.z));
        if (wantsTheme) {
          layerEl = layer;
          layer.setAttribute("data-nano-theme", theme);
        }
        if (heightValue !== null) card.classList.add("nano-dialog-fixed");
        if (wantsWidth) layer.style.setProperty("--nano-dlg-w", `${Math.round(options.width)}px`);
        if (wantsRegion) {
          const r = options.region;
          layer.classList.add("nano-regioned");
          Object.assign(layer.style, {
            position: "fixed",
            top: `${r.top}px`,
            left: `${r.left}px`,
            right: "auto",
            bottom: "auto",
            boxSizing: "border-box",
            width: `${r.width}px`,
            height: `${r.height}px`,
            padding: "12px",
            borderRadius: "var(--dsw-radius-panel, 28px)",
            overflow: "hidden"
          });
        }
      }
    }) : null;
    observer?.observe(document.body, { childList: true });
    const root = (0, import_client.createRoot)(host);
    const close = () => {
      observer?.disconnect();
      root.unmount();
      host.remove();
      if (maxValue !== null && document.documentElement.style.getPropertyValue(maxKey) === maxValue) {
        document.documentElement.style.removeProperty(maxKey);
      }
      if (heightValue !== null && document.documentElement.style.getPropertyValue(heightKey) === heightValue) {
        document.documentElement.style.removeProperty(heightKey);
      }
    };
    root.render(import_react4.default.createElement(NanoDialog, { ...options, onCancel: () => {
      options.onCancel?.();
      close();
    } }));
    const setTheme = (next) => {
      if (next !== "light" && next !== "dark") return;
      theme = next;
      if (layerEl !== null && layerEl.isConnected) layerEl.setAttribute("data-nano-theme", next);
    };
    return { close, setTheme };
  }
  function openNanoMenu(options) {
    const host = document.createElement("div");
    host.className = "nano-menu-host";
    document.body.appendChild(host);
    const root = (0, import_client.createRoot)(host);
    const close = () => {
      root.unmount();
      host.remove();
    };
    const r = options.anchor;
    const x = r.left !== void 0 ? r.left : r.x;
    const y = (r.bottom !== void 0 ? r.bottom : (r.y ?? 0) + (r.height ?? 0)) + (options.gap ?? 0);
    root.render(import_react4.default.createElement(NanoMenu, {
      menu: { x, y, openedAt: Date.now() },
      actions: options.items ?? [],
      width: options.width,
      maxHeight: options.maxHeight,
      theme: options.theme,
      z: options.z,
      onClose: close
    }));
    return { close };
  }
  var import_react4, import_client;
  var init_dom = __esm({
    "../packages/dsh-nano-ui/src/dom.js"() {
      import_react4 = __toESM(__require("react"), 1);
      import_client = __require("react-dom/client");
      init_dialog();
      init_menu();
    }
  });

  // ../packages/dsh-nano-ui/src/tabs.js
  function nanoTabs({ items, value, onChange, label }) {
    const seq = ++nanoTabsSeq;
    const el = document.createElement("div");
    el.className = "nano-tabs";
    el.setAttribute("role", "tablist");
    if (label) el.setAttribute("aria-label", label);
    const tabs = items.map((item) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "nano-tab";
      tab.id = `nano-tab-${seq}-${item.value}`;
      tab.setAttribute("role", "tab");
      tab.textContent = item.label;
      const panelId = `nano-tabpanel-${seq}-${item.value}`;
      tab.setAttribute("aria-controls", panelId);
      item.panel.id = panelId;
      item.panel.setAttribute("role", "tabpanel");
      item.panel.setAttribute("aria-labelledby", tab.id);
      el.append(tab);
      return { item, tab };
    });
    let current = (
      /** @type {string | undefined} */
      void 0
    );
    function select(next, { focus = false } = {}) {
      const entry = tabs.find((entry2) => entry2.item.value === next);
      if (!entry) return;
      current = entry.item.value;
      for (const candidate of tabs) {
        const active = candidate === entry;
        candidate.tab.setAttribute("aria-selected", String(active));
        candidate.tab.tabIndex = active ? 0 : -1;
        candidate.item.panel.hidden = !active;
      }
      if (focus) {
        entry.tab.focus();
        entry.tab.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      onChange?.(entry.item.value);
    }
    el.addEventListener("click", (event) => {
      const tab = event.target instanceof Element ? event.target.closest(".nano-tab") : null;
      const entry = tabs.find((candidate) => candidate.tab === tab);
      if (entry) select(entry.item.value);
    });
    el.addEventListener("keydown", (event) => {
      const tab = event.target instanceof Element ? event.target.closest(".nano-tab") : null;
      const index = tabs.findIndex((candidate) => candidate.tab === tab);
      if (index < 0) return;
      let next;
      switch (event.key) {
        case "ArrowLeft":
          next = (index + tabs.length - 1) % tabs.length;
          break;
        case "ArrowRight":
          next = (index + 1) % tabs.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
      select(tabs[next].item.value, { focus: true });
    });
    select(value, { focus: false });
    return { el, select, value: () => current };
  }
  var nanoTabsSeq;
  var init_tabs = __esm({
    "../packages/dsh-nano-ui/src/tabs.js"() {
      nanoTabsSeq = 0;
    }
  });

  // ../packages/dsh-nano-ui/src/styles.js
  var NANO_STYLES;
  var init_styles = __esm({
    "../packages/dsh-nano-ui/src/styles.js"() {
      NANO_STYLES = `
/* \u2500\u2500 anchored popup menu (NanoMenu, NanoMenuItem) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* \u2500\u2500 type tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Every shared surface reads from --nano-* custom properties so an owning
   plugin (e.g. the notepad) can retune typography by declaring them once on its
   own root. Each falls back to the shell default so nano-ui stays self-contained. */
.nano-menu { position: fixed; box-sizing: border-box; padding: 4px; display: flex; flex-direction: column; gap: 1px; z-index: 30;
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 12px);
  box-shadow: var(--dsw-elevation-prominent); backdrop-filter: var(--dsw-menu-backdrop-filter);
  font-family: var(--nano-font-family, inherit);
  font-size: var(--nano-font-size, inherit);
  line-height: var(--nano-line-height, inherit); }
.nano-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm, 8px); padding: 6px 8px;
  font: inherit; text-align: left; cursor: pointer; }
.nano-menu-item[data-active="true"], .nano-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nano-menu-item[data-tone="danger"] { color: var(--dsw-alias-label-error, #e5534b); }
.nano-menu-item[data-tone="danger"][data-active="true"] { background: color-mix(in oklab, var(--dsw-alias-label-error, #e5534b) 14%, transparent); }
.nano-menu-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.nano-menu-icon svg { display: block; width: 14px; height: 14px; }
.nano-menu-item[data-active="true"] .nano-menu-icon { color: inherit; }
.nano-menu-check { display: inline-flex; color: inherit; }
.nano-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* \u2500\u2500 transient toast (NanoToast) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-toast { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 40;
  padding: 6px 12px; border-radius: var(--dsw-radius-sm, 8px); font-size: var(--nano-toast-size, 12px);
  background: var(--dsw-alias-tooltip-bg, #43454a); color: var(--dsw-alias-tooltip-label, #f9fafb);
  box-shadow: var(--dsw-elevation-prominent); pointer-events: none; }
@keyframes nano-toast-in { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
.nano-toast { animation: nano-toast-in .12s ease; }

/* \u2500\u2500 shared dialog helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-dialog-host { position: fixed; inset: 0; z-index: 50; pointer-events: none;
  /* This host is only the React mount point \u2014 NanoDialog/Modal portals the card
     into document.body at a separate layer. Leaving pointer-events on here
     makes the empty fullscreen host sit above its own card and eat every click. */
  font-family: var(--nano-font-family, inherit);
  font-size: var(--nano-font-size, inherit);
  line-height: var(--nano-line-height, inherit); }
/* The Modal portals straight into document.body, outside .nano-dialog-host, so
   the card itself must consume the owner tokens \u2014 not the host.
   The color declaration is deliberate: inheritance would otherwise carry the
   host's computed ink onto the card, and an owner whose scheme differs from the
   host (light notepad inside a dark shell) would paint near-white text on the
   card's light surface. Resolving the token here keeps ink and surface paired. */
.nano-dialog-card { font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); line-height: var(--nano-line-height, inherit); color: var(--dsw-alias-label-primary); }
/* The Modal title is a hashed class \u2014 size it and the description through the
   shared tokens so dialogs read at the same scale as the owning surface. */
.nano-dialog-card [class*="title"], .nano-dialog-card [class*="title_"] { font-size: var(--nano-title-size, inherit); }
.nano-dialog-card [class*="description"], .nano-dialog-card [class*="description_"] { font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-label-secondary); }
/* Shell Button defaults to its own size; pull dialog actions down to the owner
   scale too so the whole card reads at one size. */
.nano-dialog-card button { font-size: var(--nano-font-size, inherit); font-family: var(--nano-font-family, inherit); }
.nano-dialog-error { margin: 8px 0 0; font-size: var(--nano-desc-size, 12px); color: var(--dsw-alias-danger, #cf222e); }
/* Height cap (e.g. 80% of the owning overlay): the card's own overflow:hidden
   clips nothing because the body becomes the flex child that scrolls. The last
   content child is .body \u2014 target it structurally since the class is hashed. */
.nano-dialog-capped { max-height: var(--nano-dlg-max) !important; }
/* Card width follows the owning overlay (e.g. 60% of the floating window) with
   a floor so a narrow window still leaves a readable dialog. The value itself
   is set per dialog on the portal layer (see openNanoDialog). */
.nano-dialog-sized { width: clamp(320px, var(--nano-dlg-w, 380px), 100%) !important; }
/* A tabbed dialog owns a fixed height so switching panels never resizes the
   card under the pointer. The variable is set per dialog (see openNanoDialog). */
.nano-dialog-card { height: var(--nano-dlg-h, auto); }

.nano-dialog-content { display: flex; flex-direction: column; flex: 1; min-height: 0; }
/* The shell Modal's body carries margin-top:20px on top of the header's own
   12px padding-bottom, so a title-only dialog floats its first row ~32px
   below the heading. Pull it back to the header's rhythm. */
.nano-dialog-card [class*="_body_"] { margin-top: 8px; }
/* The shell Button has no danger variant, so a destructive confirm was plain text
   with no hover. Keep the outline metrics and paint the warning color ourselves. */
.nano-modal-action.nano-modal-danger {
  color: var(--dsw-alias-state-error-primary, #f25a5a);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-state-error-primary, #f25a5a);
  transition: background-color .12s ease, color .12s ease, box-shadow .12s ease;
}
@media (hover: hover) {
  .nano-modal-action.nano-modal-danger:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover-danger, rgba(242, 90, 90, .15));
    color: var(--dsw-alias-state-error-secondary, #f25a5a);
    box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-state-error-secondary, #f25a5a);
  }
}
.nano-dialog-content > div:last-child { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* Fixed-height tabbed dialog: the shell's body stops scrolling; the card's
   injected body becomes a flex column and its panels own the scroll. */
.nano-dialog-fixed .nano-dialog-content > div:last-child { overflow: hidden; }
.nano-dialog-fixed .np-dlg-body { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }

/* \u2500\u2500 tab strip (nanoTabs) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Follows the DSH settings mobile pattern: one row of pill cells that scroll
   horizontally past the edge instead of wrapping. Sticky so the strip stays
   reachable while a long tab panel scrolls. */
.nano-tabs { position: relative; z-index: 2; display: flex; gap: 2px;
  margin: 0; padding: 4px; border-radius: var(--dsw-radius-md, 10px);
  /* Opaque track: a translucent token lets scrolling panel text show through. */
  background: var(--dsw-alias-bg-layer-1, #202020); overflow-x: auto; scrollbar-width: none;
  font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); }
.nano-tabs::-webkit-scrollbar { display: none; }
/* Equal-width cells fill the strip; horizontal scrolling only kicks in when
   the strip itself is narrower than the labels (mobile / narrow window). */
.nano-tab { flex: 1 1 0; min-width: 0; display: inline-flex; align-items: center; justify-content: center;
  height: 28px; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-sm, 8px);
  background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; cursor: pointer;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (hover: hover) {
  .nano-tab:hover:not([aria-selected="true"]) { color: var(--dsw-alias-label-primary); }
}
/* Selected tab is an inverted solid pill \u2014 the only bright element in the
   strip, so the active section is unmistakable at a glance (and in both
   themes, since both tokens invert together). */
.nano-tab[aria-selected="true"] {
  background: var(--dsw-alias-label-primary, #f7f8f8);
  color: var(--dsw-alias-bg-layer-1, #191919);
  font-weight: 600;
  box-shadow: var(--dsw-elevation-soft);
  position: relative;
}
.nano-tab[aria-selected="true"]::after { content: ''; position: absolute; left: 22%; right: 22%; bottom: -3px;
  height: 2px; border-radius: 1px; background: var(--dsw-alias-focus-ring, #4c9aff); }
.nano-tab:focus-visible { outline: 2px solid var(--dsw-alias-focus-ring, #4c9aff); outline-offset: -2px; }
`;
    }
  });

  // ../packages/dsh-nano-ui/index.js
  var dsh_nano_ui_exports = {};
  __export(dsh_nano_ui_exports, {
    NANO_STYLES: () => NANO_STYLES,
    NanoDialog: () => NanoDialog,
    NanoMenu: () => NanoMenu,
    NanoMenuItem: () => NanoMenuItem,
    NanoToast: () => NanoToast,
    nanoTabs: () => nanoTabs,
    openNanoDialog: () => openNanoDialog,
    openNanoMenu: () => openNanoMenu
  });
  var init_dsh_nano_ui = __esm({
    "../packages/dsh-nano-ui/index.js"() {
      init_dialog();
      init_menu();
      init_toast();
      init_dom();
      init_tabs();
      init_styles();
    }
  });

  // ../packages/dsh-performance-review/src/state.js
  function percentile(values, p) {
    if (!Array.isArray(values) || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return sorted[index];
  }
  function createSpanRow() {
    return { n: 0, window: [], reservoir: [] };
  }
  function recordSpanSample(row, ms, cap = RESERVOIR_CAP) {
    row.n += 1;
    row.window.push(ms);
    if (row.reservoir.length < cap) row.reservoir.push(ms);
    else {
      const slot = Math.floor(Math.random() * row.n);
      if (slot < cap) row.reservoir[slot] = ms;
    }
  }
  function createCollectorState() {
    return {
      startedAt: 0,
      /** Finalized interactions, oldest first, capped at INTERACTION_CAP. */
      interactions: [],
      /** interactionId → open interaction accumulator {start,duration,target,windowEnd}. */
      pendingInteractions: /* @__PURE__ */ new Map(),
      /** [{start,end,pluginId,name}] — both sync and settled-async spans. */
      spanEvents: [],
      /** [{at,ms,pluginId,name}] — one entry per track callback. */
      trackEvents: [],
      loafCount: 0,
      blockingMs: 0,
      forcedLayoutMs: 0,
      nanoScriptMs: 0,
      // scripts whose URL names ≥1 nano package and ≥2 nano packages (combined only)
      nanoLoafCount: 0,
      nanoBlockingMs: 0,
      /** pluginId → script ms on single-nano-package URLs (uniquely attributable). */
      pluginScriptMs: /* @__PURE__ */ new Map(),
      resources: {
        nanoClientJsBytes: 0,
        comboResources: 0,
        totalJsBytes: 0
      },
      counts: /* @__PURE__ */ new Map()
      // name → n (page-level count())
    };
  }
  function createStructure() {
    return {
      rootErrors: 0,
      badNames: 0,
      overflowSpans: 0,
      overflowUsage: 0,
      observerErrors: 0,
      // A single observe() can fail silently (e.g. LoAF unsupported) while the
      // other two succeed. `observerErrors` only fires when ALL fail; this
      // counter makes a partial observer install visible (A5 / §10.4.6).
      observersMissing: 0,
      hostWriteErrors: 0
    };
  }
  function createPluginRow() {
    return {
      meta: { version: null, implantedAt: null },
      own: { interactions: [] },
      // durations of plugin-owned interactions (window)
      native: { spanMs: [], trackMs: [] },
      // per-native-interaction totals (window)
      samples: { spans: 0, callbacks: 0 },
      // counts inside native windows (window)
      spans: /* @__PURE__ */ new Map(),
      // name → createSpanRow()
      tracks: /* @__PURE__ */ new Map(),
      // name → {kind,callbacks,live,callbackMs}
      usage: /* @__PURE__ */ new Map(),
      // name → n (cumulative, cleared by resetCounters)
      profiler: { commits: 0, durations: [] }
    };
  }
  function ensurePlugin(plugins, pluginId) {
    let row = plugins.get(pluginId);
    if (row === void 0) {
      row = createPluginRow();
      plugins.set(pluginId, row);
    }
    return row;
  }
  function spanRowFor(row, structure, name) {
    if (!NAME_RE.test(name)) {
      structure.badNames += 1;
      return null;
    }
    let span = row.spans.get(name);
    if (span === void 0) {
      if (row.spans.size >= MAX_SPAN_KEYS) {
        structure.overflowSpans += 1;
        return null;
      }
      span = createSpanRow();
      row.spans.set(name, span);
    }
    return span;
  }
  function usageAdd(row, structure, name, n) {
    if (!NAME_RE.test(name)) {
      structure.badNames += 1;
      return false;
    }
    if (!row.usage.has(name) && row.usage.size >= MAX_USAGE_KEYS) {
      structure.overflowUsage += 1;
      return false;
    }
    row.usage.set(name, (row.usage.get(name) ?? 0) + n);
    return true;
  }
  function trackRowFor(row, structure, name, kind) {
    if (!NAME_RE.test(name)) {
      structure.badNames += 1;
      return null;
    }
    let track = row.tracks.get(name);
    if (track === void 0) {
      if (row.tracks.size >= MAX_SPAN_KEYS) {
        structure.overflowSpans += 1;
        return null;
      }
      track = { kind, callbacks: 0, live: 0, callbackMs: 0 };
      row.tracks.set(name, track);
    }
    return track;
  }
  function nanoPackagesInUrl(url) {
    if (typeof url !== "string" || url.length === 0) return [];
    const found = [];
    const re = /dsh-nano-[a-z0-9-]+/g;
    let match;
    while ((match = re.exec(url)) !== null) {
      if (!found.includes(match[0])) found.push(match[0]);
    }
    return found;
  }
  function packageNameToPluginId(packageName) {
    if (typeof packageName !== "string") return null;
    const match = /^dsh-nano-([a-z0-9-]+)$/.exec(packageName);
    return match === null ? null : `nano-${match[1]}`;
  }
  function targetBucket(descriptor) {
    if (descriptor == null || typeof descriptor !== "object") return "other";
    const attrs = descriptor.attrs ?? {};
    const has = (key) => attrs[key] !== void 0 && attrs[key] !== null;
    if (has("data-composer") || has("data-chat-input")) return "composer-textarea";
    if (has("data-nano-notepad")) return "notepad-panel";
    if (has("data-nano-model-selector")) return "model-trigger";
    if (has("data-nxe")) return "files-row";
    if (has("data-nano-shared-workspace")) return "shared-row";
    if (has("data-row-key") || has("data-sidebar-row")) return "sidebar-row";
    if (descriptor.tag === "TEXTAREA") return "composer-textarea";
    return "other";
  }
  function roundMs(value) {
    return value == null ? null : Math.round(value * 10) / 10;
  }
  var LIB_VERSION, REPORT_VERSION, NAME_RE, MAX_SPAN_KEYS, MAX_USAGE_KEYS, INTERACTION_CAP, RESERVOIR_CAP, EVENT_DURATION_THRESHOLD, WINDOW_PAD_BEFORE_MS, WINDOW_PAD_AFTER_MS;
  var init_state = __esm({
    "../packages/dsh-performance-review/src/state.js"() {
      LIB_VERSION = "0.1.0";
      REPORT_VERSION = 1;
      NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
      MAX_SPAN_KEYS = 32;
      MAX_USAGE_KEYS = 32;
      INTERACTION_CAP = 50;
      RESERVOIR_CAP = 64;
      EVENT_DURATION_THRESHOLD = 16;
      WINDOW_PAD_BEFORE_MS = 1;
      WINDOW_PAD_AFTER_MS = 8;
    }
  });

  // ../packages/dsh-performance-review/src/aggregate.js
  function pushInteraction(collector, interaction) {
    collector.interactions.push(interaction);
    while (collector.interactions.length > INTERACTION_CAP) collector.interactions.shift();
  }
  function interactionSamples(interaction, spanEvents, trackEvents) {
    const wStart = interaction.start - WINDOW_PAD_BEFORE_MS;
    const wEnd = interaction.start + interaction.duration + WINDOW_PAD_AFTER_MS;
    const samples = {};
    const bucket = (pluginId) => {
      let entry = samples[pluginId];
      if (entry === void 0) {
        entry = { spans: 0, callbacks: 0, spanMs: 0, trackMs: 0, spanAfterWindow: false };
        samples[pluginId] = entry;
      }
      return entry;
    };
    const intervals = /* @__PURE__ */ new Map();
    for (const event of spanEvents) {
      if (event.start <= wEnd && event.end >= wStart) {
        const entry = bucket(event.pluginId);
        entry.spans += 1;
        if (event.end > wEnd) entry.spanAfterWindow = true;
        const lo = Math.max(event.start, wStart);
        const hi = Math.min(event.end, wEnd);
        if (hi > lo) {
          let list = intervals.get(event.pluginId);
          if (list === void 0) {
            list = [];
            intervals.set(event.pluginId, list);
          }
          list.push([lo, hi]);
        }
      }
    }
    for (const [pluginId, list] of intervals) {
      list.sort((a, b) => a[0] - b[0]);
      let merged = 0;
      let [curLo, curHi] = list[0];
      for (let i = 1; i < list.length; i += 1) {
        const [lo, hi] = list[i];
        if (lo > curHi) {
          merged += curHi - curLo;
          curLo = lo;
          curHi = hi;
        } else if (hi > curHi) curHi = hi;
      }
      merged += curHi - curLo;
      bucket(pluginId).spanMs = merged;
    }
    for (const event of trackEvents) {
      if (event.at >= wStart && event.at <= wEnd) {
        const entry = bucket(event.pluginId);
        entry.callbacks += 1;
        entry.trackMs += event.ms;
      }
    }
    return samples;
  }
  function hostSpanObject(hostSnapshot, pluginId) {
    const out = {};
    const source = hostSnapshot?.plugins?.[pluginId]?.spans;
    if (source == null) return out;
    for (const [name, row] of Object.entries(source)) {
      const samples = Array.isArray(row.samples) ? row.samples : [];
      out[name] = {
        n: row.n ?? samples.length,
        p50: roundMs(percentile(samples, 0.5)),
        p95: roundMs(percentile(samples, 0.95))
      };
    }
    return out;
  }
  function buildReport(input) {
    const { collector, plugins, structure } = input;
    const notes = [];
    const durations = collector.interactions.map((ix) => ix.duration);
    const part = (key) => roundMs(percentile(
      collector.interactions.map((ix) => ix[key]).filter((v) => typeof v === "number"),
      0.95
    ));
    const page = {
      nativeInpP75: roundMs(percentile(durations, 0.75)),
      nativeInpCount: durations.length,
      nativeInpDurationThreshold: EVENT_DURATION_THRESHOLD,
      inputDelayP95: part("inputDelay"),
      processingP95: part("processing"),
      presentationP95: part("presentation"),
      loafCount: collector.loafCount,
      blockingMs: roundMs(collector.blockingMs),
      forcedLayoutMs: roundMs(collector.forcedLayoutMs),
      nanoCombined: {
        scriptMs: roundMs(collector.nanoScriptMs),
        loafCount: collector.nanoLoafCount,
        blockingMs: roundMs(collector.nanoBlockingMs),
        clientJsBytes: collector.resources.nanoClientJsBytes,
        comboResources: collector.resources.comboResources
      },
      resources: {
        nanoClientJsBytes: collector.resources.nanoClientJsBytes,
        totalJsBytes: collector.resources.totalJsBytes
      }
    };
    const pluginOut = {};
    for (const [pluginId, row] of plugins) {
      const ownDurations = row.own.interactions;
      const spans = {};
      for (const [name, span] of row.spans) spans[name] = spanStats(span);
      const tracks = {};
      for (const [name, track] of row.tracks) {
        tracks[name] = {
          kind: track.kind,
          callbacks: track.callbacks,
          live: track.live,
          callbackMs: roundMs(track.callbackMs),
          totalCallbacks: track.totalCallbacks ?? track.callbacks,
          totalCallbackMs: roundMs(track.totalCallbackMs ?? track.callbackMs)
        };
      }
      const usage = {};
      for (const [name, n] of row.usage) usage[name] = n;
      pluginOut[pluginId] = {
        meta: {
          version: row.meta.version ?? null,
          implantedAt: row.meta.implantedAt ?? null,
          implanted: true
        },
        own: {
          inpP75: roundMs(percentile(ownDurations, 0.75)),
          inpCount: ownDurations.length
        },
        native: {
          spanMsP95: roundMs(percentile(row.native.spanMs, 0.95)),
          trackMsP95: roundMs(percentile(row.native.trackMs, 0.95)),
          samples: { spans: row.samples.spans, callbacks: row.samples.callbacks }
        },
        spans,
        tracks,
        usage,
        hostSpan: hostSpanObject(input.hostSnapshot, pluginId),
        profiler: {
          commits: row.profiler.commits,
          commitP95: roundMs(percentile(row.profiler.durations, 0.95))
        },
        // Uniquely-attributable script ms live on the collector (single-nano-
        // package URLs only), NOT on the plugin row. Reading row.scriptMs here
        // used to return a field that was never written (§10.4.3 / A3).
        scriptMs: roundMs(collector.pluginScriptMs.get(pluginId) ?? 0)
      };
    }
    const counts = {};
    for (const [name, n] of collector.counts) counts[name] = n;
    const afterWindow = collector.interactions.some((ix) => Object.values(ix.samples ?? {}).some((sample) => sample.spanAfterWindow));
    if (afterWindow) {
      notes.push("spanAfterWindow: \u6709\u5F02\u6B65 span \u5728\u4EA4\u4E92\u7A97\u53E3\u7ED3\u675F\u540E\u624D settle\uFF0C\u4ECD\u6309\u8D77\u70B9\u5212\u5165\u8BE5\u7A97\u53E3\u3002");
    }
    if (collector.nanoBlockingMs > 0) {
      notes.push("nanoBlockingMs \u6309\u6574\u6761 LoAF \u6761\u76EE\u5F52\u5E76\uFF1B\u542B\u975E nano \u811A\u672C\u7684\u5E27\u4F1A\u628A\u90A3\u90E8\u5206\u65F6\u95F4\u4E00\u5E76\u8BA1\u5165\u3002");
    }
    if (durations.length > 0 && durations.length < 8) {
      notes.push(`nativeInpCount=${durations.length} < 8\uFF1Ap75 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u4F5C\u9884\u7B97\u5224\u65AD\uFF1B\u8FD9\u4E0D\u662F web-vitals INP\u3002`);
    }
    notes.push("Event Timing \u4E09\u6BB5\uFF1AinputDelay=\u4E3B\u7EBF\u7A0B\u5FD9/\u6392\u961F\uFF0Cprocessing=\u4E8B\u4EF6\u5904\u7406\u5668\uFF0Cpresentation=\u7B49\u4E0B\u4E00\u6B21\u7ED8\u5236\u3002\u9875\u7EA7 nativeInpP75 \u542B presentation\uFF0C\u5C5E\u73AF\u5883\u7EA7\u8BFB\u6570\uFF0C\u4E0D\u6284\u8FDB\u63D2\u4EF6\u884C\uFF08spec \xA75.1\uFF09\uFF1B\u63D2\u4EF6\u9884\u7B97\u4EE5 inputDelayP95/processingP95 \u4E0E native.spanMsP95/trackMsP95 \u4E3A\u51C6\u3002");
    notes.push("lab \u7684 composer-type \u7528 CDP \u5408\u6210\u6309\u952E\uFF08page.keyboard.type\uFF09\uFF0C\u62AC\u8D77\u7684\u662F presentation \u6BB5\uFF1B\u8BFB\u6570\u6807\u6CE8\u4E3A synthetic input\uFF0C\u4E0D\u7B49\u540C\u771F\u5B9E\u7528\u6237 INP\u3002");
    notes.push("nanoCombined.scriptMs \u53EA\u7EDF\u8BA1 >50ms \u957F\u5E27\u91CC >5ms \u7684\u811A\u672C\u6761\u76EE\uFF0C\u4E0D\u662F\u603B\u811A\u672C\u8017\u65F6\uFF1B\u5FEB\u800C\u9891\u7E41\u7684\u811A\u672C\u5DE5\u4F5C\u4E0D\u53EF\u89C1\u3002");
    notes.push("nanoCombined.blockingMs \u628A\u300C\u542B\u4EFB\u4E00 nano \u811A\u672C\u300D\u7684\u6574\u6761 LoAF blockingDuration \u8BA1\u5165\uFF0C\u542B\u975E nano \u90E8\u5206\uFF0C\u5C5E\u8FC7\u5EA6\u5F52\u56E0\u3002");
    notes.push("nanoCombined.clientJsBytes \u662F\u6240\u6709 dsh-nano-* \u5305 combo \u7684 encodedBodySize \u5408\u8BA1\uFF0C\u4E0D\u662F\u5355\u4E2A\u63D2\u4EF6\u7684\u4F53\u79EF\u3002");
    if (collector.pluginScriptMs.size === 0) {
      notes.push("\u9010\u5305 scriptMs \u5168\u4E3A 0\uFF1Acombo URL \u542B\u591A\u4E2A\u5305\u540D\uFF0C\u5355\u5305 URL \u6781\u5C11\u51FA\u73B0\uFF1B\u6309 \xA73.1 \u4E0D\u4E88\u62C6\u5206\u3002");
    }
    return {
      version: REPORT_VERSION,
      meta: {
        generatedAt: input.meta?.generatedAt ?? null,
        scenario: input.meta?.scenario ?? null,
        arm: input.meta?.arm ?? "on",
        dshVersion: input.meta?.dshVersion ?? null,
        chromeMajor: input.meta?.chromeMajor ?? null,
        observerVersion: input.meta?.observerVersion ?? null,
        contributors: input.meta?.contributors ?? [],
        gitSha: input.meta?.gitSha ?? null,
        labels: input.meta?.labels ?? {}
      },
      enabled: input.enabled === true,
      loafSupported: input.loafSupported !== false,
      page,
      plugins: pluginOut,
      counts,
      structure: { ...structure },
      notes
    };
  }
  function mergeHostSnapshot(report, hostSnapshot) {
    if (hostSnapshot == null || typeof hostSnapshot !== "object") return report;
    for (const [pluginId, plugin] of Object.entries(report.plugins ?? {})) {
      const source = hostSnapshot.plugins?.[pluginId]?.spans;
      if (source == null) continue;
      const merged = { ...plugin.hostSpan ?? {} };
      for (const [name, row] of Object.entries(source)) {
        const samples = Array.isArray(row.samples) ? row.samples : [];
        merged[name] = {
          n: row.n ?? samples.length,
          p50: roundMs(percentile(samples, 0.5)),
          p95: roundMs(percentile(samples, 0.95))
        };
      }
      plugin.hostSpan = merged;
    }
    report.structure = {
      ...report.structure ?? {},
      hostWriteErrors: (report.structure?.hostWriteErrors ?? 0) + (hostSnapshot.structure?.hostWriteErrors ?? 0)
    };
    report.meta = {
      ...report.meta ?? {},
      hostSinceStart: hostSnapshot.sinceStart ?? null,
      hostWrittenAt: hostSnapshot.writtenAt ?? null,
      hostEnabled: hostSnapshot.enabled ?? null,
      hostWindow: hostSnapshot.window === true
    };
    return report;
  }
  var spanStats;
  var init_aggregate = __esm({
    "../packages/dsh-performance-review/src/aggregate.js"() {
      init_state();
      spanStats = (row) => ({
        n: row.n,
        windowN: row.window.length,
        p50: roundMs(percentile(row.window, 0.5)),
        p95: roundMs(percentile(row.window, 0.95)),
        maxMs: roundMs(row.window.length === 0 ? null : Math.max(...row.window))
      });
    }
  });

  // ../packages/dsh-performance-review/src/client.js
  var client_exports = {};
  __export(client_exports, {
    LIB_VERSION: () => LIB_VERSION,
    bucketForElement: () => bucketForElement,
    createPerfReview: () => createPerfReview,
    ensurePerfReview: () => ensurePerfReview,
    firstVisibleRoot: () => firstVisibleRoot,
    isUsableRoot: () => isUsableRoot,
    pickOwner: () => pickOwner,
    readEnabledFlag: () => readEnabledFlag
  });
  function readEnabledFlag(env) {
    if (env.forceEnabled !== void 0) return env.forceEnabled === true;
    try {
      if (env.localStorage?.getItem?.("dsh-perf-review") === "1") return true;
    } catch {
    }
    try {
      const search = env.location?.search ?? "";
      if (/(?:^|[?&])perf-review=1(?:&|$)/.test(search)) return true;
    } catch {
    }
    return false;
  }
  function bucketForElement(el, attrs) {
    let node = el;
    let depth = 0;
    while (node != null && typeof node === "object" && depth < 12) {
      const descriptor = { tag: node.tagName, attrs: {} };
      for (const name of attrs) {
        try {
          if (typeof node.hasAttribute === "function" && node.hasAttribute(name)) {
            descriptor.attrs[name] = true;
          }
        } catch {
        }
      }
      const bucket = targetBucket(descriptor);
      if (bucket !== "other") return bucket;
      node = node.parentElement ?? null;
      depth += 1;
    }
    return targetBucket({ tag: el?.tagName, attrs: {} });
  }
  function isUsableRoot(element, hiddenScope = null) {
    if (element == null || typeof element !== "object") return false;
    if (element.isConnected === false) return false;
    if (element.hidden === true) return false;
    try {
      if (typeof element.closest === "function" && element.closest(HIDDEN_SELECTOR) !== null) {
        return false;
      }
    } catch {
    }
    if (hiddenScope != null) {
      if (hiddenScope.hidden === true) return false;
      try {
        if (typeof hiddenScope.closest === "function" && hiddenScope.closest(HIDDEN_SELECTOR) !== null) {
          return false;
        }
      } catch {
      }
    }
    return true;
  }
  function firstVisibleRoot(elements, scopeOf = null) {
    for (const element of elements ?? []) {
      const scope = scopeOf === null ? null : scopeOf(element);
      if (isUsableRoot(element, scope)) return element;
    }
    return null;
  }
  function pickOwner(plugins, target, structure) {
    let chosen = null;
    for (const [pluginId, row] of plugins) {
      if (typeof row._root !== "function") continue;
      let root;
      try {
        root = row._root();
      } catch {
        structure.rootErrors += 1;
        continue;
      }
      if (root == null) continue;
      let hit = false;
      try {
        hit = contains(root, target);
      } catch {
        structure.rootErrors += 1;
        continue;
      }
      if (!hit) continue;
      if (chosen === null) {
        chosen = { pluginId, root };
        continue;
      }
      try {
        if (contains(chosen.root, root) && root !== chosen.root) chosen = { pluginId, root };
      } catch {
        structure.rootErrors += 1;
      }
    }
    return chosen?.pluginId ?? "native";
  }
  function createPerfReview(env = {}) {
    const perf2 = env.performance ?? globalThis.performance;
    const structure = createStructure();
    const plugins = /* @__PURE__ */ new Map();
    const contributors = [];
    let collector = createCollectorState();
    if (env.localStorage === void 0) {
      try {
        if (typeof localStorage !== "undefined") env = { ...env, localStorage };
      } catch {
      }
    }
    if (env.location === void 0) {
      try {
        if (typeof location !== "undefined") env = { ...env, location };
      } catch {
      }
    }
    let enabled = env.forceEnabled !== void 0 ? env.forceEnabled === true : null;
    let observers = null;
    let loafSupported = true;
    let hostSnapshotProvider = env.hostSnapshotProvider ?? null;
    let hostSnapshotCache = null;
    let hostSnapshotTimer = null;
    let finalizeTimer = null;
    collector.startedAt = now(perf2);
    const pushCapped = (array, cap, item) => {
      array.push(item);
      while (array.length > cap) array.shift();
    };
    const eventParts = (entry) => {
      const start = entry.startTime ?? 0;
      const duration = entry.duration ?? 0;
      const ps = typeof entry.processingStart === "number" && entry.processingStart > 0 ? entry.processingStart : start;
      const pe = typeof entry.processingEnd === "number" && entry.processingEnd >= ps ? entry.processingEnd : ps;
      return {
        inputDelay: Math.max(0, ps - start),
        processing: Math.max(0, pe - ps),
        presentation: Math.max(0, duration - (pe - start))
      };
    };
    const absorbEventEntry = (entry) => {
      const id = entry.interactionId ?? 0;
      if (id === 0) return;
      const key = String(id);
      let pending = collector.pendingInteractions.get(key);
      if (pending === void 0) {
        pending = {
          interactionId: id,
          start: entry.startTime,
          duration: entry.duration ?? 0,
          target: entry.target ?? null,
          ...eventParts(entry)
        };
        collector.pendingInteractions.set(key, pending);
        return;
      }
      pending.start = Math.min(pending.start, entry.startTime);
      if ((entry.duration ?? 0) >= pending.duration) {
        pending.duration = entry.duration ?? 0;
        pending.target = entry.target ?? pending.target;
        Object.assign(pending, eventParts(entry));
      }
    };
    const finalizeDue = (cutoff) => {
      for (const [key, pending] of collector.pendingInteractions) {
        const windowEnd = pending.start + pending.duration + WINDOW_PAD_AFTER_MS;
        if (windowEnd > cutoff) continue;
        collector.pendingInteractions.delete(key);
        const owner = pickOwner(plugins, pending.target, structure);
        const bucket = bucketForElement(pending.target, BUCKET_ATTRS);
        const samples = interactionSamples(pending, collector.spanEvents, collector.trackEvents);
        pushInteraction(collector, {
          interactionId: pending.interactionId,
          start: pending.start,
          duration: pending.duration,
          inputDelay: pending.inputDelay ?? 0,
          processing: pending.processing ?? 0,
          presentation: pending.presentation ?? 0,
          owner,
          bucket,
          samples
        });
        const row = plugins.get(owner);
        if (row !== void 0 && owner !== "native") {
          row.own.interactions.push(pending.duration);
          continue;
        }
        for (const [pluginId, sample] of Object.entries(samples)) {
          const targetRow = plugins.get(pluginId);
          if (targetRow === void 0) continue;
          targetRow.samples.spans += sample.spans;
          targetRow.samples.callbacks += sample.callbacks;
          if (sample.spanMs > 0) targetRow.native.spanMs.push(sample.spanMs);
          if (sample.trackMs > 0) targetRow.native.trackMs.push(sample.trackMs);
        }
      }
      const keepAfter = now(perf2) - 6e4;
      collector.spanEvents = collector.spanEvents.filter((event) => event.end >= keepAfter);
      collector.trackEvents = collector.trackEvents.filter((event) => event.at >= keepAfter);
    };
    const absorbLoafEntry = (entry) => {
      collector.loafCount += 1;
      collector.blockingMs += entry.blockingDuration ?? 0;
      let nanoInFrame = false;
      for (const script of entry.scripts ?? []) {
        collector.forcedLayoutMs += script.forcedStyleAndLayoutDuration ?? 0;
        const packages = nanoPackagesInUrl(script.sourceURL ?? "");
        if (packages.length === 0) continue;
        nanoInFrame = true;
        if (packages.length === 1) {
          const pluginId = packageNameToPluginId(packages[0]);
          if (pluginId !== null) {
            collector.pluginScriptMs.set(
              pluginId,
              (collector.pluginScriptMs.get(pluginId) ?? 0) + (script.duration ?? 0)
            );
          }
        } else {
          collector.nanoScriptMs += script.duration ?? 0;
        }
      }
      if (nanoInFrame) {
        collector.nanoLoafCount += 1;
        collector.nanoBlockingMs += entry.blockingDuration ?? 0;
      }
    };
    const absorbResourceEntry = (entry) => {
      const name = entry.name ?? "";
      const isJs = entry.initiatorType === "script" || /\.js(?:[?&]|$)/.test(name);
      if (!isJs) return;
      const bytes = entry.encodedBodySize ?? 0;
      collector.resources.totalJsBytes += bytes;
      if (nanoPackagesInUrl(name).length === 0) return;
      collector.resources.nanoClientJsBytes += bytes;
      if (name.includes("/plugins/??")) collector.resources.comboResources += 1;
    };
    const installObservers = () => {
      if (observers !== null) return;
      observers = { installed: true };
      const ObserverCtor = env.PerformanceObserver ?? globalThis.PerformanceObserver;
      if (typeof ObserverCtor !== "function") {
        loafSupported = false;
        structure.observerErrors += 1;
        return;
      }
      const tryObserve = (types, handler) => {
        try {
          const observer = new ObserverCtor((list) => {
            try {
              for (const entry of list.getEntries()) handler(entry);
              finalizeDue(now(perf2));
            } catch {
              structure.observerErrors += 1;
            }
          });
          observer.observe({ type: types, buffered: true, durationThreshold: EVENT_DURATION_THRESHOLD });
          return observer;
        } catch {
          structure.observersMissing += 1;
          return null;
        }
      };
      observers.event = tryObserve("event", absorbEventEntry);
      observers.loaf = tryObserve("long-animation-frame", absorbLoafEntry);
      if (observers.loaf === null) loafSupported = false;
      observers.resource = tryObserve("resource", absorbResourceEntry);
      if (observers.event === null && observers.loaf === null && observers.resource === null) {
        structure.observerErrors += 1;
      }
    };
    const startFinalizeSweep = () => {
      if (finalizeTimer !== null) return;
      const setIntervalRef = env.setInterval ?? globalThis.setInterval;
      if (typeof setIntervalRef !== "function") return;
      finalizeTimer = setIntervalRef(() => {
        try {
          finalizeDue(now(perf2));
        } catch {
          structure.observerErrors += 1;
        }
      }, 250);
      if (typeof finalizeTimer?.unref === "function") finalizeTimer.unref();
    };
    const decideEnabled = () => {
      if (enabled === null) enabled = readEnabledFlag(env);
      if (enabled === true && observers === null) {
        installObservers();
        startFinalizeSweep();
      }
      return enabled;
    };
    const recordSpan = (row, pluginId, name, t0, t1) => {
      const span = spanRowFor(row, structure, name);
      if (span === null) return;
      recordSpanSample(span, t1 - t0);
      pushCapped(collector.spanEvents, SPAN_EVENT_CAP, { start: t0, end: t1, pluginId, name });
      try {
        perf2.measure?.(`nano:${pluginId}:${name}`, { start: t0, end: t1 });
      } catch {
      }
    };
    const makeApi = (pluginId, row) => ({
      /** span(name, fn) → fn()'s return; promises timed to settle (spec §6.3). */
      span(name, fn) {
        if (!NAME_RE.test(name)) {
          structure.badNames += 1;
          return fn();
        }
        const t0 = now(perf2);
        let result;
        try {
          result = fn();
        } catch (error) {
          recordSpan(row, pluginId, name, t0, now(perf2));
          throw error;
        }
        if (isPromiseLike(result)) {
          return result.finally(() => recordSpan(row, pluginId, name, t0, now(perf2)));
        }
        recordSpan(row, pluginId, name, t0, now(perf2));
        return result;
      },
      /**
       * track(kind, name, opts) → handle.
       *   wrap(fn)      — counts callbacks + ms into the window
       *   attach(n=1)   — live += n (observer observed / interval started / rAF loop armed)
       *   detach(n=1)   — live -= n
       *   resetLive()   — live = 0 (observer disconnect covers every observed node)
       */
      track(kind, name, _opts = {}) {
        const track = trackRowFor(row, structure, name, kind);
        return {
          name,
          kind,
          wrap(fn) {
            if (track === null) return fn;
            return (...args) => {
              const t0 = now(perf2);
              try {
                return fn(...args);
              } finally {
                const ms = now(perf2) - t0;
                track.callbacks += 1;
                track.totalCallbacks = (track.totalCallbacks ?? 0) + 1;
                track.callbackMs += ms;
                track.totalCallbackMs = (track.totalCallbackMs ?? 0) + ms;
                pushCapped(collector.trackEvents, TRACK_EVENT_CAP, { at: t0, ms, pluginId, name });
              }
            };
          },
          attach(n = 1) {
            if (track !== null) track.live += n;
          },
          detach(n = 1) {
            if (track !== null) track.live = Math.max(0, track.live - n);
          },
          resetLive() {
            if (track !== null) track.live = 0;
          }
        };
      },
      /** count(name, n) — usage.<name> for this plugin plus page-level counts. */
      count(name, n = 1) {
        if (usageAdd(row, structure, name, n)) {
          collector.counts.set(name, (collector.counts.get(name) ?? 0) + n);
        }
      },
      /**
       * profiler(Component) — wraps with <React.Profiler id="nano:<pluginId>:root">.
       * React comes from impl.react at join (it's an external in every bundle).
       */
      profiler(Component) {
        const React6 = row._react;
        if (React6 == null || typeof React6.Profiler !== "function") return Component;
        const capture = (...args) => {
          const actualDuration = args[2];
          row.profiler.commits += 1;
          row.profiler.durations.push(actualDuration ?? 0);
          while (row.profiler.durations.length > PROFILER_SAMPLE_CAP) row.profiler.durations.shift();
        };
        return function PerfReviewProfiler(props) {
          return React6.createElement(
            React6.Profiler,
            { id: `nano:${pluginId}:root`, onRender: capture },
            React6.createElement(Component, props)
          );
        };
      }
    });
    const disabledApi = () => ({
      span(_name, fn) {
        return fn();
      },
      track(_kind, name) {
        return { name, kind: _kind, wrap: (fn) => fn, attach() {
        }, detach() {
        }, resetLive() {
        } };
      },
      count() {
      },
      profiler(Component) {
        return Component;
      }
    });
    const join = (pluginId, impl = {}) => {
      decideEnabled();
      const row = ensurePlugin(plugins, pluginId);
      contributors.push({ pluginId, libVersion: impl.libVersion ?? LIB_VERSION });
      if (impl.version != null) row.meta.version = impl.version;
      if (row.meta.implantedAt == null) row.meta.implantedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (typeof impl.root === "function") row._root = impl.root;
      if (impl.react != null) row._react = impl.react;
      if (!enabled) return disabledApi();
      return makeApi(pluginId, row);
    };
    const resetWindow = () => {
      const counts = collector.counts;
      const resources = collector.resources;
      collector = createCollectorState();
      collector.counts = counts;
      collector.resources = resources;
      collector.startedAt = now(perf2);
      for (const row of plugins.values()) {
        row.own.interactions = [];
        row.native.spanMs = [];
        row.native.trackMs = [];
        row.samples = { spans: 0, callbacks: 0 };
        for (const span of row.spans.values()) span.window = [];
        for (const track of row.tracks.values()) {
          track.callbacks = 0;
          track.callbackMs = 0;
        }
        row.profiler.durations = [];
      }
    };
    const configure = (opts = {}) => {
      if (typeof opts.hostSnapshotProvider === "function") {
        hostSnapshotProvider = opts.hostSnapshotProvider;
        return;
      }
      if (typeof opts.hostSnapshotUrl !== "string") return;
      if (hostSnapshotProvider !== null || hostSnapshotTimer !== null || enabled !== true) return;
      const fetchRef = env.fetch ?? globalThis.fetch;
      const setIntervalRef = env.setInterval ?? globalThis.setInterval;
      if (typeof fetchRef !== "function" || typeof setIntervalRef !== "function") return;
      const pull = () => {
        try {
          Promise.resolve(fetchRef(opts.hostSnapshotUrl, { credentials: "same-origin", cache: "no-store" })).then((response) => response?.json?.()).then((snapshot) => {
            if (snapshot !== null && typeof snapshot === "object") hostSnapshotCache = snapshot;
          }).catch(() => {
          });
        } catch {
        }
      };
      pull();
      hostSnapshotTimer = setIntervalRef(pull, 5e3);
      if (typeof hostSnapshotTimer?.unref === "function") hostSnapshotTimer.unref();
    };
    const setHostSnapshotProvider = (fn) => {
      hostSnapshotProvider = typeof fn === "function" ? fn : null;
    };
    const resetCounters = () => {
      collector.counts.clear();
      for (const row of plugins.values()) row.usage.clear();
    };
    const report = (meta = {}, hostSnapshot = null) => {
      finalizeDue(now(perf2) + 6e4);
      const contributorsSeen = [];
      const seen = /* @__PURE__ */ new Set();
      for (const c of contributors) {
        const key = `${c.pluginId}@${c.libVersion}`;
        if (seen.has(key)) continue;
        seen.add(key);
        contributorsSeen.push(c);
      }
      const navigatorRef = env.navigator ?? globalThis.navigator;
      const chrome = /Chrome\/(\d+)/.exec(navigatorRef?.userAgent ?? "");
      const snapshot = hostSnapshot ?? (typeof hostSnapshotProvider === "function" ? hostSnapshotProvider() : hostSnapshotCache);
      const result = buildReport({
        meta: {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          chromeMajor: chrome === null ? null : Number(chrome[1]),
          observerVersion: LIB_VERSION,
          contributors: contributorsSeen,
          ...meta
        },
        collector,
        plugins,
        structure,
        hostSnapshot: snapshot ?? null,
        enabled: enabled === true,
        loafSupported
      });
      if (snapshot != null) mergeHostSnapshot(result, snapshot);
      resetWindow();
      return result;
    };
    return {
      join,
      report,
      configure,
      setHostSnapshotProvider,
      reset: resetWindow,
      resetCounters,
      /** test/diagnostic accessors — not part of the implant contract. */
      _state: () => ({ collector, plugins, structure, enabled, loafSupported, contributors }),
      _finalizeDue: finalizeDue,
      _absorbEventEntry: absorbEventEntry,
      _absorbLoafEntry: absorbLoafEntry,
      _absorbResourceEntry: absorbResourceEntry,
      libVersion: LIB_VERSION
    };
  }
  function ensurePerfReview(env = {}) {
    const global = env.global ?? globalThis;
    if (global.__perfReview == null) global.__perfReview = createPerfReview(env);
    return global.__perfReview;
  }
  var TRACK_EVENT_CAP, SPAN_EVENT_CAP, PROFILER_SAMPLE_CAP, now, isPromiseLike, BUCKET_ATTRS, HIDDEN_SELECTOR, contains;
  var init_client = __esm({
    "../packages/dsh-performance-review/src/client.js"() {
      init_state();
      init_aggregate();
      TRACK_EVENT_CAP = 4096;
      SPAN_EVENT_CAP = 4096;
      PROFILER_SAMPLE_CAP = 128;
      now = (perf2) => perf2.now();
      isPromiseLike = (value) => value !== null && typeof value === "object" && typeof value.then === "function";
      BUCKET_ATTRS = [
        "data-composer",
        "data-chat-input",
        "data-nano-notepad",
        "data-nano-model-selector",
        "data-nxe",
        "data-nano-shared-workspace",
        "data-row-key",
        "data-sidebar-row"
      ];
      HIDDEN_SELECTOR = '[hidden],[aria-hidden="true"]';
      contains = (parent, child) => {
        if (parent == null || child == null) return false;
        if (parent === child) return true;
        return typeof parent.contains === "function" ? parent.contains(child) : false;
      };
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        ensurePerfReview();
      }
    }
  });

  // src/client/i18n.js
  var i18n_exports = {};
  __export(i18n_exports, {
    copyFor: () => copyFor
  });
  function copyFor(language) {
    return String(language || "").toLowerCase().startsWith("zh") ? COPY.zh : COPY.en;
  }
  var COPY;
  var init_i18n = __esm({
    "src/client/i18n.js"() {
      COPY = {
        zh: {
          typeLabel: "Kitesurf",
          typeDescription: "\u5728\u5BB9\u5668\u91CC\u6D4F\u89C8\u9875\u9762\uFF0C\u5E76\u5728\u753B\u9762\u4E0A\u70B9\u9009\u5143\u7D20",
          addressPlaceholder: "\u8F93\u5165 HTTP(S) \u5730\u5740",
          addressAria: "\u9875\u9762\u5730\u5740",
          back: "\u540E\u9000",
          forward: "\u524D\u8FDB",
          refresh: "\u5237\u65B0",
          go: "\u524D\u5F80",
          annotate: "\u6807\u6CE8",
          annotateTitle: "\u6807\u6CE8\u3002\u6309\u4F4F Shift \u62D6\u4E00\u6761\u7BAD\u5934",
          history: "\u6700\u8FD1\u5730\u5740",
          settings: "\u8BBE\u7F6E",
          noteAria: "\u5199\u7ED9 composer \u7684\u5907\u6CE8",
          notePlaceholder: "\u8FD9\u4E00\u5904\u8981\u6539\u4EC0\u4E48",
          noteSend: "\u52A0\u5165\u6807\u6CE8",
          injectContext: "\u6CE8\u5165\u5230 composer",
          copyContext: "\u590D\u5236\u4E0A\u4E0B\u6587",
          inputContext: "\u8F93\u5165\u5907\u6CE8",
          copied: "\u4E0A\u4E0B\u6587\u5DF2\u590D\u5236",
          envTitle: "\u73AF\u5883\u81EA\u68C0",
          envPlugin: "\u63D2\u4EF6",
          envEngine: "\u5F15\u64CE",
          envContainer: "\u5BB9\u5668",
          envPorts: "\u7AEF\u53E3",
          prepareEnv: "\u4E00\u952E\u51C6\u5907\u73AF\u5883",
          preparingEnv: "\u6B63\u5728\u51C6\u5907\u2026",
          prepareDone: "\u73AF\u5883\u5DF2\u5C31\u7EEA",
          prepareFailed: "\u51C6\u5907\u5931\u8D25\uFF0C\u89C1\u4E0B\u65B9\u8BCA\u65AD",
          copyDiag: "\u590D\u5236\u8BCA\u65AD\u4FE1\u606F",
          diagCopied: "\u8BCA\u65AD\u4FE1\u606F\u5DF2\u590D\u5236",
          envHint: "\u4F9D\u6B21\u68C0\u67E5\u5BB9\u5668\u3001\u7AEF\u53E3\u3001\u5F15\u64CE\u5065\u5EB7\u5E76\u81EA\u52A8\u4FEE\u590D",
          noteEmpty: "\u53EF\u76F4\u63A5\u6CE8\u5165\uFF0C\u65E0\u9700\u586B\u5199",
          opening: "\u6B63\u5728\u6253\u5F00\u9875\u9762",
          engineDown: "\u5F15\u64CE\u6CA1\u6709\u5E94\u7B54",
          engineMismatch: "\u8BE5\u5730\u5740\u4E0A\u8FD0\u884C\u7684\u4E0D\u662F Kitesurf",
          emptyHint: "\u8F93\u5165 HTTP(S) \u5730\u5740\u5F00\u59CB\u6D4F\u89C8",
          pinsCount: "\u6761\u5F85\u53D1\u9001\u6807\u6CE8",
          pinsFull: "\uFF08\u5DF2\u8FBE\u4E0A\u9650\uFF0C\u65E7\u6807\u6CE8\u5C06\u88AB\u4E22\u5F03\uFF09",
          sendAll: "\u53D1\u9001\u5168\u90E8\u6807\u6CE8",
          undoPin: "\u64A4\u9500\u4E0A\u4E00\u6761\u6807\u6CE8",
          hintBar: "\u70B9\u9009 \xB7 Shift+\u591A\u9009 \xB7 Alt+\u692D\u5706 \xB7 Shift+\u7BAD\u5934 \xB7 \u2191\u2193 \u7236/\u5B50 \xB7 \u53CC\u51FB\u6539\u6587\u5B57 \xB7 Esc \u9000\u51FA",
          startEngine: "\u542F\u52A8\u5F15\u64CE",
          clearPins: "\u6E05\u7A7A\u5168\u90E8\u6807\u6CE8",
          editAria: "\u628A\u8FD9\u6BB5\u6587\u5B57\u5199\u56DE\u5143\u7D20",
          editPlaceholder: "\u6539\u8FD9\u91CC\u7684\u6587\u5B57\u2026",
          editSend: "\u5199\u56DE\u5143\u7D20",
          stalePage: "\u9875\u9762\u5DF2\u53D8\u5316\uFF0C\u753B\u9762\u5DF2\u5237\u65B0\u2014\u2014\u8BF7\u91CD\u65B0\u70B9\u9009",
          settingsTitle: "\u6D4F\u89C8\u8BBE\u7F6E",
          settingsDesc: "\u53EA\u4F5C\u7528\u4E8E\u8FD9\u4E00\u6B21\u5F15\u64CE\u8FDB\u7A0B\u3002\u89C6\u53E3\u7528\u6765\u6309\u624B\u673A\u3001\u5E73\u677F\u3001\u684C\u9762\u770B\u540C\u4E00\u9875\u3002\u5F15\u64CE\u5730\u5740\u6539\u52A8\u5373\u65F6\u751F\u6548\u3002",
          cancel: "\u53D6\u6D88",
          save: "\u4FDD\u5B58",
          close: "\u5173\u95ED",
          uaLabel: "User-Agent",
          uaPlaceholder: "\u7559\u7A7A\u5219\u4F7F\u7528\u5F15\u64CE\u9ED8\u8BA4",
          originLabel: "\u5F15\u64CE\u5730\u5740",
          mcpLabel: "MCP \u7AEF\u53E3",
          viewportLabel: "\u89C6\u53E3",
          viewportDefault: "\u9ED8\u8BA4",
          viewportDesktop: "\u684C\u9762 1280",
          viewportTablet: "\u5E73\u677F 768",
          viewportPhone: "\u624B\u673A 390",
          saved: "\u8BBE\u7F6E\u5DF2\u4FDD\u5B58",
          emptyTitle: "\u5F00\u59CB\u6D4F\u89C8",
          emptyBody: "\u5728\u4E0A\u65B9\u5730\u5740\u680F\u8F93\u5165\u7F51\u5740\uFF0CKitesurf \u4F1A\u5728\u5BB9\u5668\u91CC\u6253\u5F00\u5B83\uFF1B\u968F\u540E\u70B9\u300C\u6807\u6CE8\u300D\u5728\u753B\u9762\u4E0A\u70B9\u9009\u5143\u7D20\u3002",
          emptyTry: "\u8BD5\u8BD5 example.com",
          errorTitle: "\u5F15\u64CE\u6CA1\u6709\u5E94\u7B54",
          errorBody: "\u5BB9\u5668\u91CC\u7684 Kitesurf \u6CA1\u6709\u54CD\u5E94\u3002\u5148\u542F\u52A8\u5F15\u64CE\uFF1B\u82E5\u5DF2\u542F\u52A8\uFF0C\u6253\u5F00\u8BBE\u7F6E\u786E\u8BA4\u5F15\u64CE\u5730\u5740\u3002",
          retry: "\u91CD\u8BD5",
          resumeEngine: "\u6062\u590D\u5F15\u64CE",
          diagnose: "\u8BCA\u65AD\u4FE1\u606F"
        },
        en: {
          typeLabel: "Kitesurf",
          typeDescription: "Browse pages in the container and pick elements on the picture",
          addressPlaceholder: "Enter an HTTP(S) address",
          addressAria: "Page URL",
          back: "Back",
          forward: "Forward",
          refresh: "Refresh",
          go: "Go",
          annotate: "Annotate",
          annotateTitle: "Annotate. Hold Shift and drag to draw an arrow",
          history: "Recent addresses",
          settings: "Settings",
          noteAria: "Note for the composer",
          notePlaceholder: "What should change here",
          noteSend: "Add note",
          injectContext: "Insert into composer",
          copyContext: "Copy context",
          inputContext: "Add a note",
          copied: "Context copied",
          envTitle: "Environment",
          envPlugin: "Plugin",
          envEngine: "Engine",
          envContainer: "Container",
          envPorts: "Ports",
          prepareEnv: "Prepare environment",
          preparingEnv: "Preparing\u2026",
          prepareDone: "Environment ready",
          prepareFailed: "Prepare failed \u2014 see diagnostics",
          copyDiag: "Copy diagnostics",
          diagCopied: "Diagnostics copied",
          envHint: "Checks container, ports and engine health, then repairs automatically",
          noteEmpty: "Insert without typing",
          opening: "Opening page",
          engineDown: "Engine is not answering",
          engineMismatch: "The origin answered but is not Kitesurf",
          emptyHint: "Enter an HTTP(S) address to start browsing",
          pinsCount: "notes pending",
          pinsFull: " (at cap \u2014 oldest dropped)",
          sendAll: "Send all notes",
          undoPin: "Undo last note",
          hintBar: "Click \xB7 Shift+multi \xB7 Alt+ellipse \xB7 Shift+arrow \xB7 \u2191\u2193 parent/child \xB7 double-click edit \xB7 Esc exit",
          startEngine: "Start engine",
          clearPins: "Clear all notes",
          editAria: "Write this text back into the element",
          editPlaceholder: "Edit this text\u2026",
          editSend: "Write back",
          stalePage: "Page changed \u2014 frame refreshed, pick again",
          settingsTitle: "Browser settings",
          settingsDesc: "Applies to this engine process only. Viewport previews the same page as phone, tablet, or desktop. Engine-address changes take effect immediately.",
          cancel: "Cancel",
          save: "Save",
          close: "Close",
          uaLabel: "User-Agent",
          uaPlaceholder: "Leave empty for engine default",
          originLabel: "Engine origin",
          mcpLabel: "MCP port",
          viewportLabel: "Viewport",
          viewportDefault: "Default",
          viewportDesktop: "Desktop 1280",
          viewportTablet: "Tablet 768",
          viewportPhone: "Phone 390",
          saved: "Settings saved",
          emptyTitle: "Start browsing",
          emptyBody: "Type a URL above \u2014 Kitesurf opens it inside the container. Then hit Annotate and pick elements on the page.",
          emptyTry: "Try example.com",
          errorTitle: "Engine is not answering",
          errorBody: "Kitesurf inside the container is not responding. Start the engine; if it is already started, open Settings and check the engine address.",
          retry: "Retry",
          resumeEngine: "Resume engine",
          diagnose: "Diagnostics"
        }
      };
    }
  });

  // src/shared/note.js
  var note_exports = {};
  __export(note_exports, {
    batchNote: () => batchNote,
    designNote: () => designNote,
    multiNote: () => multiNote
  });
  function designNote(element, extra = {}) {
    const source = element && typeof element === "object" ? element : {};
    const lines = ["[kitesurf]"];
    const url = cleanLine(extra.url, 180);
    if (url) lines.push(`url: ${url}`);
    if (source.tag === "area") lines.push("mark: area");
    else if (source.tag === "ellipse") lines.push("mark: ellipse");
    else if (source.tag === "arrow") lines.push("mark: arrow");
    else {
      const selector = cleanLine(source.selector || source.tag, 160);
      if (selector) lines.push(`el: ${selector}`);
    }
    const pageRoot = source.tag === "html" || source.tag === "body";
    if (pageRoot) lines.push("hit: page root");
    const isMark = source.tag === "area" || source.tag === "ellipse" || source.tag === "arrow";
    const text = pageRoot || isMark ? "" : cleanLine(source.text, TEXT_BUDGET);
    if (text) lines.push(`text: ${text}`);
    const alt = pageRoot ? "" : cleanLine(source.alt, 80);
    if (alt) lines.push(`alt: ${alt}`);
    const src = cleanLine(source.src, 120);
    if (src && !src.startsWith("data:")) lines.push(`src: ${src}`);
    const line = source.tag === "arrow" ? lineOf(source) : "";
    if (line) lines.push(`line: ${line}`);
    const box = source.tag === "arrow" ? "" : boxLine(source.box);
    if (box) lines.push(`box: ${box}`);
    const css = cssLine(source.style);
    if (css) lines.push(`css: ${css}`);
    if (source.tag === "iframe") lines.push("limit: iframe script is not inspected");
    if (Array.isArray(source.componentStack) && source.componentStack.length) {
      lines.push(`stack: ${source.componentStack.slice(-4).join(" \u2192 ")}`);
    } else {
      lines.push("stack: none");
    }
    const comment = cleanLine(extra.comment, 160);
    if (comment) lines.push(`ask: ${comment}`);
    let note = lines.join("\n");
    if (note.length > NOTE_BUDGET) note = `${note.slice(0, NOTE_BUDGET - 1)}\u2026`;
    return note;
  }
  function multiNote(elements, extra = {}) {
    const list = (Array.isArray(elements) ? elements : []).filter((item) => item && typeof item === "object");
    if (list.length <= 1) return designNote(list[0], extra);
    const lines = ["[kitesurf]", `els: ${list.length}`];
    const url = cleanLine(extra.url, 180);
    if (url) lines.push(`url: ${url}`);
    for (let index = 0; index < list.length; index += 1) {
      const source = list[index];
      const selector = cleanLine(source.selector || source.tag, 140);
      if (selector) lines.push(`el${index + 1}: ${selector}`);
      const text = cleanLine(source.text, 60);
      if (text) lines.push(`text${index + 1}: ${text}`);
      const box = boxLine(source.box);
      if (box) lines.push(`box${index + 1}: ${box}`);
    }
    const comment = cleanLine(extra.comment, 160);
    if (comment) lines.push(`ask: ${comment}`);
    let note = lines.join("\n");
    if (note.length > NOTE_BUDGET * 2) note = `${note.slice(0, NOTE_BUDGET * 2 - 1)}\u2026`;
    return note;
  }
  function batchNote(notes) {
    const items = (Array.isArray(notes) ? notes : []).filter((item) => typeof item === "string" && item.startsWith("[kitesurf]")).slice(0, 8);
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    let body = `[kitesurf batch ${items.length}]
` + items.map((item, index) => `#${index + 1}
${item}`).join("\n");
    if (body.length > 1600) body = `${body.slice(0, 1599)}\u2026`;
    return body;
  }
  function cleanLine(value, max) {
    if (typeof value !== "string") return "";
    const text = value.replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
  }
  function lineOf(source) {
    const from = source.from;
    const to = source.to;
    if (!from || !to) return "";
    const ax = Math.round(Number(from.x) || 0);
    const ay = Math.round(Number(from.y) || 0);
    const bx = Math.round(Number(to.x) || 0);
    const by = Math.round(Number(to.y) || 0);
    return `${ax},${ay} ${bx},${by}`;
  }
  function boxLine(box) {
    if (!box || typeof box !== "object") return "";
    const x = Math.round(Number(box.x) || 0);
    const y = Math.round(Number(box.y) || 0);
    const w = Math.round(Number(box.width) || 0);
    const h2 = Math.round(Number(box.height) || 0);
    if (w <= 0 || h2 <= 0) return `${x},${y} empty`;
    return `${x},${y} ${w}x${h2}`;
  }
  function cssLine(style) {
    if (!style || typeof style !== "object") return "";
    const parts = [];
    for (const key of STYLE_ORDER) {
      const value = style[key];
      if (typeof value !== "string" || value.trim() === "") continue;
      const compact = value.replace(/\s+/g, " ").trim();
      if (key === "position" && compact === "static") continue;
      if (key === "backgroundColor" && /^(transparent|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(compact)) continue;
      parts.push(`${key}=${compact}`);
    }
    return parts.join("; ");
  }
  var STYLE_ORDER, NOTE_BUDGET, TEXT_BUDGET;
  var init_note = __esm({
    "src/shared/note.js"() {
      STYLE_ORDER = ["color", "backgroundColor", "fontSize", "fontFamily", "display", "position"];
      NOTE_BUDGET = 640;
      TEXT_BUDGET = 80;
    }
  });

  // src/shared/shot-point.js
  var shot_point_exports = {};
  __export(shot_point_exports, {
    contentFrame: () => contentFrame,
    shotPoint: () => shotPoint
  });
  function shotPoint(box, natural, click) {
    if (!box || !natural || !click) return null;
    if (box.width <= 0 || box.height <= 0 || natural.width <= 0 || natural.height <= 0) return null;
    const scale = Math.min(box.width / natural.width, box.height / natural.height);
    const drawnWidth = natural.width * scale;
    const drawnHeight = natural.height * scale;
    const offsetX = (box.width - drawnWidth) / 2;
    const offsetY = (box.height - drawnHeight) / 2;
    const x = (click.x - offsetX) / scale;
    const y = (click.y - offsetY) / scale;
    if (x < 0 || y < 0 || x >= natural.width || y >= natural.height) return null;
    return { x: Math.round(x), y: Math.round(y) };
  }
  function contentFrame(element, natural) {
    if (!element || !natural || element.width <= 0 || element.height <= 0 || natural.width <= 0 || natural.height <= 0) return null;
    const scale = Math.min(element.width / natural.width, element.height / natural.height);
    const width = natural.width * scale;
    const height = natural.height * scale;
    return {
      left: (element.width - width) / 2,
      top: (element.height - height) / 2,
      width,
      height,
      scale
    };
  }
  var init_shot_point = __esm({
    "src/shared/shot-point.js"() {
    }
  });

  // src/client/index.js
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject
  });
  var React5 = __require("react");
  var primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
  var { openNanoDialog: openNanoDialog2, openNanoMenu: openNanoMenu2, NANO_STYLES: NANO_STYLES2, NanoToast: NanoToast2 } = (init_dsh_nano_ui(), __toCommonJS(dsh_nano_ui_exports));
  var { ensurePerfReview: ensurePerfReview2, LIB_VERSION: LIB_VERSION2 } = (init_client(), __toCommonJS(client_exports));
  var { copyFor: copyFor2 } = (init_i18n(), __toCommonJS(i18n_exports));
  var { batchNote: batchNote2, designNote: designNote2, multiNote: multiNote2 } = (init_note(), __toCommonJS(note_exports));
  var { contentFrame: contentFrame2, shotPoint: shotPoint2 } = (init_shot_point(), __toCommonJS(shot_point_exports));
  var h = React5.createElement;
  var STATUS = "/nano-kitesurf/status";
  var OPEN = "/nano-kitesurf/open";
  var SHOT = "/nano-kitesurf/shot";
  var PICK = "/nano-kitesurf/pick";
  var EDIT = "/nano-kitesurf/edit";
  var SETTINGS = "/nano-kitesurf/settings";
  var HISTORY = "/nano-kitesurf/history";
  var PORTS = "/nano-kitesurf/ports";
  var RECOVER = "/nano-kitesurf/recover";
  var DIAGNOSTICS = "/nano-kitesurf/diagnostics";
  var CONTEXT = "/nano-kitesurf/context";
  var KITE = "/nano-kitesurf/kite";
  var KIND = "kitesurf";
  var OWN_ID = "nano-kitesurf";
  var MAX_PINS = 8;
  var perfReview = ensurePerfReview2();
  perfReview.configure({ hostSnapshotUrl: "/nano-kitesurf/perf-review/host?mode=snapshot" });
  var perf = perfReview.join(OWN_ID, {
    // Baked at build time by scripts/build-client.mjs `define`; the fallback
    // keeps an unbundled src/ loadable in tests.
    version: true ? "0.1.0" : "0.0.0",
    libVersion: LIB_VERSION2,
    react: React5,
    root: () => document.querySelector("[data-nks-workspace]")
  });
  var STYLE = `
.nks-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;flex:auto;display:flex;font:var(--dsw-font-xxs-12);container-type:inline-size}
.nks-toolbar{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:4px;height:38px;padding:5px 6px;display:flex}
.nks-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:transparent;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}
.nks-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool:disabled{color:var(--dsw-alias-label-tertiary,rgba(207,211,214,.55));opacity:.45;cursor:default}
.nks-tool:disabled:hover{background:transparent}
.nks-tool:focus-visible,.nks-address:focus-visible{outline:2px solid var(--dsw-alias-link);outline-offset:1px}
.nks-tool[aria-pressed="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-link) 18%,transparent)}
.nks-address-box{flex:auto;min-width:0;position:relative}
.nks-address{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 32px 0 9px}
.nks-address::placeholder{color:var(--dsw-alias-label-tertiary)}
.nks-go{visibility:hidden;opacity:0;position:absolute;top:0;right:0}
.nks-address-box:focus-within .nks-go,.nks-address-box[data-dirty="true"] .nks-go{visibility:visible;opacity:1}
.nks-frame{position:relative;flex:auto;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.nks-frame img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
.nks-empty{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.nks-empty-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-link,#2f6fed);border:.5px solid var(--dsw-alias-border-l2)}
.nks-empty-title{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13,var(--dsw-font-xxs-12));font-weight:600}
.nks-empty-body{max-width:340px;line-height:1.55}
.nks-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:2px}
.nks-empty-link{color:var(--dsw-alias-link,#2f6fed);cursor:pointer;background:none;border:0;font:inherit;padding:0;text-decoration:underline;text-underline-offset:2px}
.nks-empty-meta{font:var(--dsw-font-xxxs-11);opacity:.75;word-break:break-all;max-width:340px}
.nks-box{position:absolute;border:1.5px solid var(--dsw-alias-link,#2f6fed);box-shadow:0 0 0 1px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.55);pointer-events:none}
.nks-box[data-kind="ellipse"]{border-radius:50%}
.nks-box[data-kind="hover"]{border-style:dashed;opacity:.75}
.nks-pin-dot{position:absolute;width:18px;height:18px;margin-left:-9px;margin-top:-9px;color:#fff;font:var(--dsw-font-xxxs-11);line-height:18px;text-align:center;background:var(--dsw-alias-link,#2f6fed);box-shadow:0 0 0 1.5px rgba(0,0,0,.45),0 1px 4px rgba(0,0,0,.4);border-radius:50%;pointer-events:auto;cursor:pointer;user-select:none}
.nks-pin-dot:hover{background:var(--dsw-alias-fill-error,#d5455c);transform:scale(1.15)}
.nks-hint{flex:none;padding:3px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:6px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-hint-text{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-start-btn{height:30px;padding:0 14px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);cursor:pointer}
.nks-start-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-inspector{flex:none;padding:3px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;gap:10px;overflow:hidden;border-top:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.nks-inspector b{font-weight:500;color:var(--dsw-alias-label-secondary)}
.nks-inspector span{overflow:hidden;text-overflow:ellipsis;max-width:170px}
.nks-note{position:absolute;z-index:2;display:flex;gap:4px;align-items:center;padding:4px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-elevation-soft)}
.nks-note-actions{display:flex;gap:2px;align-items:center}
.nks-note-form{display:flex;gap:4px;align-items:center}
.nks-note input{width:220px;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 8px}
.nks-pins{flex:none;padding:2px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:4px}
.nks-busy{position:absolute;left:0;right:0;top:0;height:2px;overflow:hidden;z-index:3}
.nks-busy::before{content:"";display:block;width:35%;height:100%;background:var(--dsw-alias-link,#2f6fed);animation:nks-beat 1s ease-in-out infinite}
@keyframes nks-beat{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
.nks-settings-body{display:flex;flex-direction:column;gap:8px}
.nks-env{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:6px}
.nks-env-title{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);text-transform:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.nks-env-row{display:flex;justify-content:space-between;gap:10px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-env-row b{font-weight:500;color:var(--dsw-alias-label-secondary);flex:none}
.nks-env-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;unicode-bidi:plaintext}
.nks-env-ok{color:var(--dsw-alias-fill-success,#3fb950)}
.nks-env-bad{color:var(--dsw-alias-fill-error,#d5455c)}
.nks-env-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.nks-env-note{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);line-height:1.5}
.nks-settings-body label{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11)}
.nks-choices{display:flex;gap:4px}
.nks-choice{height:28px;padding:0 10px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);background:transparent;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);cursor:pointer}
.nks-choice[aria-checked="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-link,#2f6fed) 22%,transparent);box-shadow:inset 0 0 0 1px var(--dsw-alias-link,#2f6fed)}
.nks-choice[aria-checked="true"]::before{content:"\u2713 ";font-weight:600}
/* Narrow split pane: a 286px rail cannot hold 7 tools + an address bar.
   Keep navigation + address + annotate; fold history/settings into the
   overflow affordance is out of scope for CSS, so they shrink and the
   placeholder switches to a short form. */
@container (max-width: 400px){
  .nks-toolbar{gap:2px;padding:5px 4px}
  .nks-tool{width:26px;height:26px}
  .nks-address{padding:0 4px 0 7px;font-size:11px}
  .nks-address::placeholder{color:transparent}
  .nks-address-box::after{content:"\u7F51\u5740";position:absolute;left:8px;top:6px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);pointer-events:none}
  .nks-address-box:focus-within::after,.nks-address-box[data-dirty="true"]::after{content:none}
  .nks-go{display:none}
  .nks-pins{gap:2px}
  .nks-hint-text{font-size:10px}
}
/* Frame: never letterbox into a black void \u2014 a subtle checker makes the
   dead area read as "canvas", and the picture is centred by object-position. */
.nks-frame{background-image:linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%),linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%);background-size:16px 16px;background-position:0 0,8px 8px}
`;
  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {})
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        const error = new Error(payload.error || payload.reason || `request failed (${response.status})`);
        error.errorId = payload.errorId || payload.reason || "kitesurf.unknown";
        throw error;
      }
      return payload;
    });
  }
  function frameOf(image) {
    if (!image || !image.naturalWidth) return null;
    return contentFrame2(
      { width: image.clientWidth, height: image.clientHeight },
      { width: image.naturalWidth, height: image.naturalHeight }
    );
  }
  function elementBox(element) {
    if (!element) return null;
    const box = element.box;
    if (box && typeof box.width === "number" && (box.width > 0 || box.height > 0)) return box;
    if (element.tag === "arrow" && element.from && element.to) {
      const x = Math.min(element.from.x, element.to.x);
      const y = Math.min(element.from.y, element.to.y);
      const width = Math.max(Math.abs(element.to.x - element.from.x), 4);
      const height = Math.max(Math.abs(element.to.y - element.from.y), 4);
      return { x, y, width, height };
    }
    return null;
  }
  function insertComposerNote(text) {
    const root = document.querySelector("[data-composer-input]");
    const editor = root?.__lexicalEditor;
    if (!editor || typeof editor.getEditorState !== "function" || typeof editor.parseEditorState !== "function") {
      throw new Error("composer input is not editable");
    }
    const current = editor.getEditorState().toJSON();
    current.root.children = [...current.root.children || [], {
      children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "paragraph",
      version: 1
    }];
    editor.setEditorState(editor.parseEditorState(JSON.stringify(current)));
  }
  function selectRadio(group, value) {
    if (!group) return;
    group.dataset.value = value;
    const buttons = [...group.querySelectorAll("button")];
    for (const button of buttons) {
      const on = button.dataset.choice === value;
      button.setAttribute("aria-checked", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    }
  }
  function BrowserPane({ copy, languageOf, schemeOf }) {
    const [status, setStatus] = React5.useState(null);
    const [pageUrl, setPageUrl] = React5.useState("");
    const [draftUrl, setDraftUrl] = React5.useState("");
    const [history, setHistory] = React5.useState([]);
    const [shot, setShot] = React5.useState(null);
    const [shotMime, setShotMime] = React5.useState("image/webp");
    const [shotMeta, setShotMeta] = React5.useState(null);
    const [annotate, setAnnotate] = React5.useState(false);
    const [pick, setPick] = React5.useState(null);
    const [pins, setPins] = React5.useState([]);
    const [draftBox, setDraftBox] = React5.useState(null);
    const [draftKind, setDraftKind] = React5.useState(null);
    const [comment, setComment] = React5.useState("");
    const [editing, setEditing] = React5.useState(false);
    const [composing, setComposing] = React5.useState(false);
    const [toast, setToast] = React5.useState(null);
    const [busy, setBusy] = React5.useState(false);
    const [hover, setHover] = React5.useState(null);
    const [frame, setFrame] = React5.useState(null);
    const toastTimer = React5.useRef(0);
    const frameRef = React5.useRef(null);
    const dragRef = React5.useRef(null);
    const busyRef = React5.useRef(false);
    const dialogOpenRef = React5.useRef(false);
    const hoverTimerRef = React5.useRef(0);
    const clickTimerRef = React5.useRef(0);
    const lastDblClickRef = React5.useRef(0);
    const annotateRef = React5.useRef(false);
    const pickRef = React5.useRef(null);
    const pinsRef = React5.useRef([]);
    const commentRef = React5.useRef("");
    const editingRef = React5.useRef(false);
    const shotMetaRef = React5.useRef(null);
    const sendPickRef = React5.useRef(null);
    annotateRef.current = annotate;
    pickRef.current = pick;
    pinsRef.current = pins;
    commentRef.current = comment;
    editingRef.current = editing;
    shotMetaRef.current = shotMeta;
    const addressFocusedRef = React5.useRef(false);
    React5.useEffect(() => {
      if (pageUrl && !addressFocusedRef.current) setDraftUrl(pageUrl);
    }, [pageUrl]);
    const refreshStatus = React5.useCallback(() => {
      return fetch(STATUS).then((response) => response.json()).then((payload) => {
        setStatus(payload);
        return payload;
      }).catch((cause) => {
        const fallback = { ok: false, error: cause.message };
        setStatus(fallback);
        return fallback;
      });
    }, []);
    React5.useEffect(() => {
      refreshStatus().then(async (statusPayload) => {
        if (!statusPayload?.ok) return;
        try {
          const fit = frameSize();
          const shotPayload = await post(SHOT, { format: "webp", ...fit ? { fit } : {} });
          setShot(shotPayload.data);
          setShotMime(shotPayload.mimeType || "image/webp");
          setShotMeta({ url: shotPayload.url || "", scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || "", viewport: shotPayload.viewport?.width ?? null, at: Date.now() });
          if (shotPayload.url && shotPayload.url !== "about:blank") setPageUrl(shotPayload.url);
        } catch {
        }
      });
    }, []);
    React5.useEffect(() => {
      const onKey = (event) => {
        if (dialogOpenRef.current) return;
        const meta = event.metaKey || event.ctrlKey;
        if (meta && event.shiftKey && event.code === "KeyD") {
          event.preventDefault();
          setAnnotate((value) => !value);
          return;
        }
        if (meta && !event.shiftKey && event.code === "KeyZ") {
          if (!annotateRef.current || pinsRef.current.length === 0) return;
          event.preventDefault();
          setPins((current) => current.slice(0, -1));
          return;
        }
        if (meta && event.code === "KeyL") {
          const open = pickRef.current;
          if (!open?.elements?.length) return;
          event.preventDefault();
          sendPickRef.current?.(true);
          return;
        }
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && annotateRef.current && pickRef.current) {
          const elements = pickRef.current.elements || [];
          const last = elements[elements.length - 1];
          const selector = event.key === "ArrowUp" ? last?.parentSel : last?.childSel;
          if (selector) {
            event.preventDefault();
            post(PICK, { selector, preview: true }).then((payload) => {
              const element = payload.pick?.elements?.[0] ?? payload.pick?.element;
              if (element) {
                setPick((current) => ({ elements: [...(current?.elements ?? []).slice(0, -1), element], anchor: current?.anchor ?? null }));
              }
            }).catch(() => {
            });
          }
          return;
        }
        if (event.key === "Escape") {
          if (dragRef.current) {
            endDrag();
            return;
          }
          if (pickRef.current) {
            setPick(null);
            setEditing(false);
            return;
          }
          if (annotateRef.current) setAnnotate(false);
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
    React5.useEffect(() => {
      const phase = status?.kite?.phase;
      if (phase && phase !== "running" && shot) {
        setShot(null);
        setPick(null);
        setPins([]);
        setShotMeta(null);
      }
    }, [status?.kite?.phase]);
    React5.useEffect(() => {
      const element = frameRef.current;
      if (!element || typeof ResizeObserver === "undefined") return void 0;
      let timer = 0;
      let last = "";
      const observer = new ResizeObserver(() => {
        const size = frameSize();
        if (!size) return;
        const key = `${size.width}x${size.height}`;
        if (key === last) return;
        const previous = last;
        last = key;
        if (!previous) return;
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (!busyRef.current) reloadShot(0, { keepPick: true }).catch(() => {
          });
        }, 220);
      });
      observer.observe(element);
      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    }, []);
    React5.useEffect(() => {
      const onFocus = () => {
        if (!busyRef.current) reloadShot(0, { keepPick: true }).catch(() => {
        });
      };
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }, []);
    React5.useLayoutEffect(() => {
      const element = frameRef.current;
      if (!element) return void 0;
      const measure = () => setFrame(frameOf(element.querySelector("img")));
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      const image = element.querySelector("img");
      image?.addEventListener("load", measure);
      measure();
      return () => {
        observer.disconnect();
        image?.removeEventListener("load", measure);
      };
    }, [shot]);
    function showError(cause) {
      const errorId = cause?.errorId || "kitesurf.unknown";
      const message = cause instanceof Error ? cause.message : String(cause);
      setToast(`${errorId} ${message}`);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 4e3);
      refreshStatus();
    }
    function showToast(text) {
      setToast(text);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2e3);
    }
    async function run(work) {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await work();
      } catch (cause) {
        showError(cause);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    }
    function remember(url) {
      setPageUrl(url);
      setHistory((current) => [url, ...current.filter((item) => item !== url)].slice(0, 8));
    }
    async function navigate(url) {
      await perf.span("navigate", async () => {
        await post(OPEN, { url });
      });
      const fit = frameSize();
      const shotPayload = await post(SHOT, { format: "webp", ...fit ? { fit } : {} });
      setShot(shotPayload.data);
      setShotMime(shotPayload.mimeType || "image/webp");
      setShotMeta({ url: shotPayload.url || "", scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || "", viewport: shotPayload.viewport?.width ?? null, at: Date.now() });
      setPick(null);
      remember(url);
    }
    function frameSize() {
      const element = frameRef.current;
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width < 320 || height < 240) return null;
      return { width, height };
    }
    async function reloadShot(scroll, options = {}) {
      const fit = frameSize();
      const shotPayload = await post(SHOT, {
        format: "webp",
        ...scroll ? { scroll } : {},
        ...fit ? { fit } : {}
      });
      setShot(shotPayload.data);
      setShotMime(shotPayload.mimeType || "image/webp");
      setShotMeta({ url: shotPayload.url || "", scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || "", viewport: shotPayload.viewport?.width ?? null, at: Date.now() });
      if (shotPayload.url && shotPayload.url !== "about:blank") setPageUrl(shotPayload.url);
      if (options.keepPick !== true) setPick(null);
    }
    async function historyNav(delta) {
      const moved = await post(HISTORY, { delta });
      if (moved.url) {
        setPageUrl(moved.url);
        setDraftUrl(moved.url);
      }
      await reloadShot();
    }
    async function onSubmitAddress(event) {
      event.preventDefault();
      if (!draftUrl.trim()) return;
      event.currentTarget.querySelector("input")?.blur();
      await run(() => navigate(draftUrl));
    }
    function framePoint(event) {
      const image = frameRef.current?.querySelector("img");
      if (!image) return null;
      const rect = image.getBoundingClientRect();
      return shotPoint2(
        { x: 0, y: 0, width: rect.width, height: rect.height },
        { width: image.naturalWidth, height: image.naturalHeight },
        { x: event.clientX - rect.left, y: event.clientY - rect.top }
      );
    }
    function onPointerDown(event) {
      if (!annotate || event.button !== 0) return;
      const point = framePoint(event);
      if (!point) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = { ...point, moved: false, kind: event.shiftKey ? "arrow" : event.altKey ? "ellipse" : "box" };
      setDraftKind(dragRef.current.kind);
      setDraftBox({ x: point.x, y: point.y, width: 0, height: 0 });
    }
    function onPointerMove(event) {
      const start = dragRef.current;
      if (start) {
        const point2 = framePoint(event);
        if (!point2) return;
        const width = Math.abs(point2.x - start.x);
        const height = Math.abs(point2.y - start.y);
        if (width > 4 || height > 4) start.moved = true;
        setDraftBox({ x: Math.min(start.x, point2.x), y: Math.min(start.y, point2.y), width, height });
        return;
      }
      if (!annotate || !shot || busyRef.current || pickRef.current) return;
      if (hoverTimerRef.current) return;
      hoverTimerRef.current = window.setTimeout(() => {
        hoverTimerRef.current = 0;
      }, 90);
      const point = framePoint(event);
      if (!point) {
        setHover(null);
        return;
      }
      post(PICK, { x: point.x, y: point.y, preview: true }).then((payload) => setHover(elementBox(payload.pick?.elements?.[0] ?? payload.pick?.element))).catch(() => setHover(null));
    }
    function endDrag() {
      dragRef.current = null;
      setDraftBox(null);
      setDraftKind(null);
    }
    async function onPointerUp(event) {
      const start = dragRef.current;
      if (!start) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
      const point = framePoint(event);
      if (!point) {
        setDraftBox(null);
        setDraftKind(null);
        return;
      }
      const width = Math.abs(point.x - start.x);
      const height = Math.abs(point.y - start.y);
      if (!start.moved || width < 8 && height < 8) {
        setDraftBox(null);
        setDraftKind(null);
        const toComposer = event.altKey && !pickRef.current;
        const wasShift = event.shiftKey;
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = window.setTimeout(() => {
          clickTimerRef.current = 0;
          if (editingRef.current || Date.now() - lastDblClickRef.current < 600) return;
          run(async () => {
            const payload = await post(PICK, { x: start.x, y: start.y });
            const element = payload.pick?.elements?.[0] ?? payload.pick?.element;
            if (!element) return;
            const meta = shotMetaRef.current;
            const pickPage = payload.pick || {};
            const drifted = meta && pickPage.url && pickPage.url !== meta.url;
            const scrolled = meta && !drifted && Math.abs((pickPage.scrollY || 0) - (meta.scrollY || 0)) > 8;
            const retargeted = meta && pickPage.targetId && meta.targetId && pickPage.targetId !== meta.targetId;
            const reViewed = meta && pickPage.viewport && meta.viewport != null && pickPage.viewport.width !== meta.viewport;
            if (drifted || scrolled || retargeted || reViewed) {
              await reloadShot();
              showToast(copy.stalePage);
              return;
            }
            if (wasShift && pickRef.current) {
              setPick((current) => ({ ...current, elements: [...current.elements, element] }));
              return;
            }
            if (toComposer) {
              sendPick(true, element);
              return;
            }
            setPick({ elements: [element], anchor: { x: point.x, y: point.y } });
          });
        }, 240);
        return;
      }
      setDraftBox(null);
      setDraftKind(null);
      if (start.kind === "arrow") {
        setPick({
          elements: [{
            tag: "arrow",
            text: "",
            from: { x: Math.round(start.x), y: Math.round(start.y) },
            to: { x: Math.round(point.x), y: Math.round(point.y) },
            style: {},
            componentStack: null
          }],
          anchor: { x: point.x, y: point.y }
        });
        return;
      }
      setPick({
        elements: [{
          tag: start.kind === "ellipse" ? "ellipse" : "area",
          selector: "area",
          text: "",
          box: {
            x: Math.round(Math.min(start.x, point.x)),
            y: Math.round(Math.min(start.y, point.y)),
            width: Math.round(width),
            height: Math.round(height)
          },
          style: {},
          componentStack: null
        }],
        anchor: { x: point.x, y: point.y }
      });
    }
    function onPointerCancel() {
      endDrag();
    }
    function onWheel(event) {
      if (!shot || busyRef.current || dragRef.current) return;
      const delta = event.deltaY;
      if (Math.abs(delta) < 8) return;
      run(() => reloadShot(delta));
    }
    function onDoubleClick(event) {
      if (!annotate) return;
      event.preventDefault();
      lastDblClickRef.current = Date.now();
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = 0;
      const open = pickRef.current;
      const element = open?.elements?.[open.elements.length - 1];
      if (element?.selector) {
        setEditing(true);
        setComment(element.text || "");
        return;
      }
      const point = framePoint(event);
      if (!point) return;
      run(async () => {
        const payload = await post(PICK, { x: point.x, y: point.y });
        const picked = payload.pick?.elements?.[0] ?? payload.pick?.element;
        if (!picked?.selector) return;
        setPick({ elements: [picked], anchor: { x: point.x, y: point.y } });
        setEditing(true);
        setComment(picked.text || "");
      });
    }
    function sendPick(toComposer, element) {
      const open = element ? { elements: [element], anchor: null } : pickRef.current;
      if (!open?.elements?.length) return;
      try {
        const note = open.elements.length > 1 ? multiNote2(open.elements, { url: pageUrl, comment: commentRef.current }) : designNote2(open.elements[0], { url: pageUrl, comment: commentRef.current });
        if (toComposer) {
          insertComposerNote(note);
        } else {
          setPins((current) => [...current, { text: note, anchor: open.anchor ?? null, shot }].slice(-MAX_PINS));
        }
        setComment("");
        setPick(null);
      } catch (cause) {
        showError(cause);
      }
    }
    sendPickRef.current = sendPick;
    function noteOf(element) {
      const open = element ? { elements: [element] } : pickRef.current;
      if (!open?.elements?.length) return null;
      return open.elements.length > 1 ? multiNote2(open.elements, { url: pageUrl, comment: commentRef.current }) : designNote2(open.elements[0], { url: pageUrl, comment: commentRef.current });
    }
    async function injectNote() {
      const note = noteOf();
      if (!note) return;
      const element = pickRef.current?.elements?.[0] || null;
      const label = element ? `${element.tag || "element"}${element.text ? " \xB7 " + element.text.slice(0, 24) : ""}` : "selection";
      try {
        const saved = await post(CONTEXT, { text: note, packet: element, label });
        insertComposerNote(saved.chip || `\u27E6kitesurf:${saved.id}\u27E7`);
        setComment("");
        setComposing(false);
        setPick(null);
        showToast(`\u5DF2\u6CE8\u5165 ${saved.chip}\uFF08${saved.bytes} B\uFF0C\u5B8C\u6574\u4E0A\u4E0B\u6587\u53EF\u7528 /context?id=${saved.id} \u53D6\u56DE\uFF09`);
      } catch (cause) {
        showError(cause);
      }
    }
    async function copyNote() {
      const note = noteOf();
      if (!note) return;
      try {
        await navigator.clipboard.writeText(note);
        showToast(copy.copied);
      } catch {
        try {
          const area = document.createElement("textarea");
          area.value = note;
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
          showToast(copy.copied);
        } catch (cause) {
          showError(cause);
        }
      }
    }
    function pinNote() {
      const note = noteOf();
      if (!note) return;
      try {
        setPins((current) => [...current, { text: note, anchor: pickRef.current?.anchor ?? null, shot }].slice(-MAX_PINS));
        setComment("");
        setComposing(false);
        setPick(null);
      } catch (cause) {
        showError(cause);
      }
    }
    function onSend(event) {
      event?.preventDefault();
      const open = pickRef.current;
      if (editing && open?.elements?.length) {
        const element = open.elements[open.elements.length - 1];
        const text = commentRef.current;
        setEditing(false);
        run(async () => {
          await post(EDIT, { selector: element.selector, text });
          await reloadShot();
          setPick(null);
        });
        return;
      }
      if (event?.shiftKey) pinNote();
      else injectNote();
    }
    function onSendAll() {
      if (pins.length === 0) return;
      try {
        insertComposerNote(batchNote2(pins.map((pin) => pin.text)));
        setPins([]);
      } catch (cause) {
        showError(cause);
      }
    }
    async function oneClickPrepare() {
      await run(async () => {
        try {
          const response = await post(RECOVER, {});
          const after = await refreshStatus();
          if (after?.ok !== false) await reloadShot(0, { keepPick: true });
          else if (response?.ports) showToast(`${copy.prepareFailed}`);
          else showToast(copy.prepareDone);
        } catch (cause) {
          showError(cause);
        }
      });
    }
    function onStartEngine() {
      run(async () => {
        const fresh = await refreshStatus();
        const phase = fresh?.kite?.phase;
        if (phase === "running") return;
        const action = phase === "suspended" ? "resume" : "start";
        await post(KITE, { action });
        await reloadShot();
      });
    }
    async function onRefresh() {
      if (!pageUrl) return;
      await run(() => navigate(pageUrl));
    }
    function openHistory(event) {
      if (!history.length) return;
      const rect = event.currentTarget.getBoundingClientRect();
      openNanoMenu2({
        anchor: { left: rect.left, bottom: rect.bottom },
        items: history.map((url) => ({
          id: url,
          label: url,
          run: () => {
            setDraftUrl(url);
            run(() => navigate(url));
          }
        })),
        theme: schemeOf?.(),
        maxHeight: 8 * 28 + 8
      });
    }
    const pickBoxes = pick?.elements ? pick.elements.map((element) => elementBox(element)).filter(Boolean) : [];
    const allBoxes = draftBox ? [{ box: draftBox, kind: draftKind === "ellipse" ? "ellipse" : "draft" }] : [
      ...pickBoxes.map((box, index) => ({ box, kind: pick?.elements?.[index]?.tag === "ellipse" ? "ellipse" : "pick" })),
      ...hover && !pick ? [{ box: hover, kind: "hover" }] : []
    ];
    const overlays = frame ? allBoxes.map(({ box, kind }) => ({
      kind,
      left: frame.left + box.x * frame.scale,
      top: frame.top + box.y * frame.scale,
      width: Math.max(box.width * frame.scale, 2),
      height: Math.max(box.height * frame.scale, 2)
    })) : [];
    const hasPage = !!shot && !!shotMeta?.url && shotMeta.url !== "about:blank";
    const anchor = pick?.anchor;
    const pickAnchor = overlays.find((o) => o.kind === "pick" || o.kind === "ellipse") || (frame && anchor ? { left: frame.left + anchor.x * frame.scale, top: frame.top + anchor.y * frame.scale, width: 0, height: 0 } : null) || (frame ? { left: frame.left + 16, top: frame.top + 16, width: 0, height: 0 } : null);
    const arrowGlyph = (dir) => h("svg", {
      width: 16,
      height: 16,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true
    }, h("path", { d: dir === "back" ? "M10 3 L5 8 L10 13" : "M6 3 L11 8 L6 13" }));
    const glyph = (name) => {
      if (name === "back" || name === "forward") return arrowGlyph(name);
      const Icon = {
        history: primitives.IconClockOutlineRegular,
        refresh: primitives.IconRefreshOutlineRegular,
        go: primitives.IconLinkOutlineRegular,
        annotate: primitives.IconEditOutlineRegular,
        settings: primitives.IconSettingsOutlineRegular,
        send: primitives.IconRightUpOutlineRegular,
        undo: primitives.IconCloseOutlineRegular,
        exit: primitives.IconCloseOutlineRegular,
        clear: primitives.IconDeleteOutlineRegular || primitives.IconCloseOutlineRegular,
        edit: primitives.IconEditOutlineRegular || primitives.IconRightUpOutlineRegular,
        copy: primitives.IconCopyOutlineRegular || primitives.IconEditOutlineRegular
      }[name];
      return h(Icon, { width: 16, height: 16, "aria-hidden": true });
    };
    function EnvPanel() {
      const [snap, setSnap] = React5.useState(null);
      const [busyLocal, setBusyLocal] = React5.useState(false);
      const [note, setNote] = React5.useState("");
      React5.useEffect(() => {
        let alive = true;
        fetch(PORTS).then((r) => r.json()).then((data) => {
          if (alive) setSnap(data);
        }).catch(() => {
        });
        return () => {
          alive = false;
        };
      }, []);
      async function prepare() {
        setBusyLocal(true);
        setNote(copy.preparingEnv);
        try {
          const response = await fetch(RECOVER, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
          const result = await response.json().catch(() => ({}));
          const ports = result.ports || await fetch(PORTS).then((r) => r.json()).catch(() => null);
          setSnap(ports);
          setNote(result.ok ? copy.prepareDone : copy.prepareFailed);
          await refreshStatus();
          await reloadShot(0, { keepPick: true }).catch(() => {
          });
        } catch (cause) {
          setNote(`${copy.prepareFailed}: ${cause?.message || cause}`);
        } finally {
          setBusyLocal(false);
        }
      }
      async function copyDiagnostics() {
        try {
          const data = await fetch(DIAGNOSTICS).then((r) => r.json());
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          showToast(copy.diagCopied);
        } catch (cause) {
          showError(cause);
        }
      }
      const engine = snap?.effective?.httpBase || "\u2014";
      const container = snap?.container?.state || "\u2014";
      const portRow = snap?.ports?.engine ? `${snap.ports.engine.port} \xB7 ${snap.ports.engine.heldBy === "this-container" ? "\u672C\u63D2\u4EF6\u5BB9\u5668" : snap.ports.engine.heldBy === "other" ? "\u88AB\u5176\u4ED6\u7A0B\u5E8F\u5360\u7528" : "\u7A7A\u95F2"}` : "\u2014";
      const healthy = snap?.healthy === true;
      return h(
        "div",
        { className: "nks-env", "data-nks-env": "1" },
        h(
          "div",
          { className: "nks-env-title" },
          copy.envTitle,
          h("span", { className: healthy ? "nks-env-ok" : "nks-env-bad" }, healthy ? "\u25CF OK" : "\u25CF \u5F02\u5E38")
        ),
        h("div", { className: "nks-env-row" }, h("b", null, copy.envPlugin), h("span", null, status?.buildId || "\u2014")),
        h("div", { className: "nks-env-row" }, h("b", null, copy.envEngine), h("span", null, engine)),
        h("div", { className: "nks-env-row" }, h("b", null, copy.envContainer), h("span", null, container)),
        h("div", { className: "nks-env-row" }, h("b", null, copy.envPorts), h("span", null, portRow)),
        h(
          "div",
          { className: "nks-env-actions" },
          h("button", { type: "button", className: "nks-start-btn", "data-nks-prepare": "1", disabled: busyLocal, onClick: prepare }, busyLocal ? copy.preparingEnv : copy.prepareEnv),
          h("button", { type: "button", className: "nks-start-btn", "data-nks-copy-diag": "1", onClick: copyDiagnostics }, copy.copyDiag)
        ),
        h("div", { className: "nks-env-note" }, note || copy.envHint)
      );
    }
    function openSettings() {
      if (dialogOpenRef.current) return;
      dialogOpenRef.current = true;
      const region = document.querySelector("[data-nks-workspace]")?.getBoundingClientRect();
      let close = () => {
      };
      let current = { userAgent: "", viewportWidth: "", httpBase: "", mcpPort: "" };
      const dialog = openNanoDialog2({
        copy: { cancel: copy.cancel, confirm: copy.save, close: copy.close },
        title: copy.settingsTitle,
        description: copy.settingsDesc,
        width: 420,
        region,
        // openNanoDialog already closes itself after onCancel — closing here
        // again would double root.unmount()/host.remove() (S3-3).
        onCancel: () => {
          dialogOpenRef.current = false;
        },
        onConfirm: () => save(),
        children: h(
          "form",
          {
            className: "nks-settings-body",
            onSubmit: (event) => {
              event.preventDefault();
              save();
            }
          },
          h(EnvPanel, null),
          h("label", { htmlFor: "nks-ua" }, copy.uaLabel),
          h("input", { id: "nks-ua", className: "nks-address", autoFocus: true, placeholder: copy.uaPlaceholder }),
          h("label", { htmlFor: "nks-origin" }, copy.originLabel),
          h("input", { id: "nks-origin", className: "nks-address", placeholder: "http://127.0.0.1:8787", inputMode: "url", spellCheck: false, autoComplete: "off" }),
          h("label", { htmlFor: "nks-mcp" }, copy.mcpLabel),
          h("input", { id: "nks-mcp", className: "nks-address", inputMode: "numeric", placeholder: "8799" }),
          h("span", { id: "nks-viewport-label" }, copy.viewportLabel),
          h("div", {
            id: "nks-viewport",
            className: "nks-choices",
            role: "radiogroup",
            "aria-labelledby": "nks-viewport-label",
            "data-value": "default",
            onKeyDown: (event) => {
              const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const values = [...event.currentTarget.querySelectorAll("button")].map((b) => b.dataset.choice);
              const index = Math.max(0, values.indexOf(event.currentTarget.dataset.value));
              const next = event.key === "Home" ? values[0] : event.key === "End" ? values[values.length - 1] : values[(index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + values.length) % values.length];
              selectRadio(event.currentTarget, next);
              event.currentTarget.querySelector(`[data-choice="${next}"]`)?.focus();
            }
          }, [
            ["default", copy.viewportDefault],
            ["1280", copy.viewportDesktop],
            ["768", copy.viewportTablet],
            ["390", copy.viewportPhone]
          ].map(([value, label]) => h("button", {
            key: value,
            type: "button",
            role: "radio",
            "aria-checked": value === "default" ? "true" : "false",
            tabIndex: value === "default" ? 0 : -1,
            "data-choice": value,
            className: "nks-choice",
            onClick: (event) => selectRadio(event.currentTarget.parentElement, value)
          }, label))),
          h("button", { type: "submit", style: { display: "none" }, "aria-hidden": "true", tabIndex: -1 })
        )
      });
      close = () => {
        dialogOpenRef.current = false;
        dialog.close();
      };
      function save() {
        const nextAgent = document.getElementById("nks-ua")?.value ?? "";
        const choice = document.getElementById("nks-viewport")?.dataset.value ?? "default";
        const nextOrigin = (document.getElementById("nks-origin")?.value ?? "").trim();
        const nextPort = (document.getElementById("nks-mcp")?.value ?? "").trim();
        run(async () => {
          const settingsPatch = {};
          if (nextAgent !== current.userAgent) settingsPatch.userAgent = nextAgent;
          const nextWidth = choice === "default" ? "" : choice;
          if (nextWidth !== current.viewportWidth) {
            settingsPatch.viewport = choice === "default" ? null : { width: Number(choice) };
          }
          if (Object.keys(settingsPatch).length) await post(SETTINGS, settingsPatch);
          const kitePatch = {};
          if (nextOrigin && nextOrigin !== current.httpBase) kitePatch.httpBase = nextOrigin;
          if (nextPort && nextPort !== String(current.mcpPort)) kitePatch.mcpPort = nextPort;
          if (Object.keys(kitePatch).length) await post(KITE, { action: "configure", ...kitePatch });
          close();
          showToast(copy.saved);
          refreshStatus();
        });
      }
      refreshStatus().then((fresh) => {
        current = {
          userAgent: fresh?.userAgent ?? "",
          viewportWidth: fresh?.viewport?.width ? String(fresh.viewport.width) : "",
          httpBase: fresh?.kite?.httpBase ?? "",
          mcpPort: fresh?.kite?.mcpPort != null ? String(fresh.kite.mcpPort) : ""
        };
        const ua = document.getElementById("nks-ua");
        if (ua) ua.value = current.userAgent;
        const originInput = document.getElementById("nks-origin");
        if (originInput) originInput.value = current.httpBase;
        const mcp = document.getElementById("nks-mcp");
        if (mcp) mcp.value = current.mcpPort;
        selectRadio(document.getElementById("nks-viewport"), current.viewportWidth || "default");
      });
    }
    return h(
      "section",
      {
        className: "nks-root",
        "data-nano-kitesurf": "1",
        "data-nks-workspace": "1"
      },
      h(
        "form",
        { className: "nks-toolbar", onSubmit: onSubmitAddress },
        h("button", { type: "button", className: "nks-tool", "data-nks-back": "1", "aria-label": copy.back, title: copy.back, disabled: busy || !hasPage, onClick: () => run(() => historyNav(-1)) }, glyph("back")),
        h("button", { type: "button", className: "nks-tool", "data-nks-forward": "1", "aria-label": copy.forward, title: copy.forward, disabled: busy || !hasPage, onClick: () => run(() => historyNav(1)) }, glyph("forward")),
        h("button", { type: "button", className: "nks-tool", "data-nks-reload": "1", "aria-label": copy.refresh, title: copy.refresh, disabled: busy, onClick: onRefresh }, glyph("refresh")),
        h(
          "span",
          { className: "nks-address-box", "data-dirty": draftUrl ? "true" : "false" },
          h("input", {
            className: "nks-address",
            "aria-label": copy.addressAria,
            placeholder: copy.addressPlaceholder,
            inputMode: "url",
            spellCheck: false,
            autoComplete: "off",
            value: draftUrl,
            onChange: (event) => setDraftUrl(event.target.value),
            onFocus: () => {
              addressFocusedRef.current = true;
            },
            onBlur: () => {
              addressFocusedRef.current = false;
            }
          }),
          h("button", { type: "submit", className: "nks-tool nks-go", "aria-label": copy.go, disabled: busy }, glyph("go"))
        ),
        h("button", { type: "button", className: "nks-tool", "data-nks-history": "1", "aria-label": copy.history, title: copy.history, disabled: busy || !history.length, onClick: openHistory }, glyph("history")),
        h("button", {
          type: "button",
          className: "nks-tool",
          "data-nks-annotate": "1",
          "aria-pressed": annotate ? "true" : "false",
          "aria-label": copy.annotate,
          title: copy.annotateTitle,
          onClick: () => setAnnotate((value) => !value)
        }, glyph("annotate")),
        h("button", { type: "button", className: "nks-tool", "data-nks-settings": "1", "aria-label": copy.settings, title: copy.settings, onClick: openSettings }, glyph("settings"))
      ),
      pins.length ? h(
        "div",
        { className: "nks-pins", "data-nks-pins": String(pins.length), "aria-live": "polite" },
        `${pins.length} ${copy.pinsCount}${pins.length === MAX_PINS ? copy.pinsFull : ""}`,
        h("button", { type: "button", className: "nks-tool", "data-nks-undo-pin": "1", "aria-label": copy.undoPin, onClick: () => setPins((current) => current.slice(0, -1)) }, glyph("undo")),
        h("button", { type: "button", className: "nks-tool", "data-nks-clear-pins": "1", "aria-label": copy.clearPins, onClick: () => setPins([]) }, glyph("clear")),
        h("button", { type: "button", className: "nks-tool", "data-nks-send-all": "1", "aria-label": copy.sendAll, onClick: onSendAll }, glyph("send"))
      ) : null,
      annotate && hasPage ? h(
        "div",
        { className: "nks-hint", "data-nks-hint": "1" },
        h("span", { className: "nks-hint-text" }, copy.hintBar),
        h("button", { type: "button", className: "nks-tool", "data-nks-exit-annotate": "1", "aria-label": copy.annotate, onClick: () => setAnnotate(false) }, glyph("exit"))
      ) : null,
      h(
        "div",
        {
          ref: frameRef,
          className: "nks-frame",
          "data-nks-frame": "1",
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel,
          onDoubleClick,
          onWheel,
          style: { cursor: annotate ? "crosshair" : "default" }
        },
        busy ? h("div", { className: "nks-busy", "data-nks-loading": "1", role: "progressbar", "aria-label": copy.opening }) : null,
        hasPage ? h("img", {
          alt: "",
          draggable: false,
          src: `data:${shotMime || "image/webp"};base64,${shot}`,
          style: { pointerEvents: annotate ? "none" : "auto" }
        }) : h(
          "div",
          { className: "nks-empty", "data-nks-empty": "" },
          // One container, one column: the old layout rendered an absolutely
          // positioned .nks-start on top of a flex-centred .nks-empty, which
          // painted the opaque Start button straight over the error text
          // ("引启动引擎答"). Everything below is a single vertical stack.
          h("div", { className: "nks-empty-icon" }, glyph("annotate")),
          h(
            "div",
            { className: "nks-empty-title" },
            busy ? copy.opening : status?.engineMismatch === true ? copy.engineMismatch : status?.ok === false ? copy.errorTitle : copy.emptyTitle
          ),
          !busy && status?.ok !== false && !status?.engineMismatch ? h("div", { className: "nks-empty-body" }, copy.emptyBody) : null,
          !busy && status?.ok === false && !status?.engineMismatch ? h("div", { className: "nks-empty-body" }, copy.errorBody) : null,
          !busy && status?.ok === false ? h(
            "div",
            { className: "nks-empty-actions" },
            // Ordinary users get ONE button: it reconciles phase, adopts or
            // repairs the port, starts/resumes the container and polls health.
            h("button", {
              type: "button",
              className: "nks-start-btn nks-primary",
              "data-nks-start-engine": "1",
              "data-nks-prepare": "1",
              onClick: oneClickPrepare
            }, status?.kite?.phase === "running" ? copy.resumeEngine : copy.prepareEnv),
            h("button", { type: "button", className: "nks-start-btn", "data-nks-diagnose": "1", onClick: () => run(() => refreshStatus()) }, copy.retry),
            h("button", { type: "button", className: "nks-start-btn", "data-nks-open-settings": "1", onClick: openSettings }, copy.settings)
          ) : null,
          !busy && status?.ok !== false && !status?.engineMismatch ? h(
            "div",
            { className: "nks-empty-actions" },
            h("button", { type: "button", className: "nks-empty-link", "data-nks-try": "1", onClick: () => {
              setDraftUrl("https://example.com");
              run(() => navigate("https://example.com"));
            } }, copy.emptyTry)
          ) : null,
          status?.ok === false ? h("div", { className: "nks-empty-meta" }, `${status?.lastError?.errorId || status?.errorId || "kitesurf.engine.failed"} \xB7 ${status?.httpBase || ""}`) : null,
          status?.ok === false ? h("div", { className: "nks-empty-meta" }, status?.lastError?.error || status?.error || "") : null
        ),
        overlays.map((box, index) => h("div", {
          key: index,
          className: "nks-box",
          "data-nks-box": box.kind,
          "data-kind": box.kind === "ellipse" ? "ellipse" : box.kind === "hover" ? "hover" : void 0,
          style: { left: box.left, top: box.top, width: box.width, height: box.height }
        })),
        // Numbered pin dots stay over their shot until the shot changes; a
        // refreshed page clears them with the old pixels.
        frame ? pins.filter((pin) => pin.anchor && pin.shot === shot).map((pin, index) => h("div", {
          key: `pin-${index}`,
          className: "nks-pin-dot",
          "data-nks-pin-dot": String(index + 1),
          title: pin.text?.slice(0, 60) || "",
          onPointerDown: (event) => event.stopPropagation(),
          // Click a dot to drop that queued note — index is inside the filtered
          // subset so remove by identity, not position.
          onClick: (event) => {
            event.stopPropagation();
            setPins((current) => current.filter((item) => item !== pin));
          },
          style: { left: frame.left + pin.anchor.x * frame.scale, top: frame.top + pin.anchor.y * frame.scale }
        }, String(index + 1))) : null,
        pickAnchor && pick ? h(
          "div",
          {
            className: "nks-note",
            "data-nks-note": "1",
            onClick: (event) => event.stopPropagation(),
            onPointerDown: (event) => event.stopPropagation(),
            onPointerMove: (event) => event.stopPropagation(),
            onPointerUp: (event) => event.stopPropagation(),
            style: {
              left: Math.max(8, Math.min(pickAnchor.left, Math.max(8, (frameRef.current?.clientWidth || 320) - 260))),
              top: pickAnchor.top + pickAnchor.height + 8 > (frameRef.current?.clientHeight || 0) - 44 ? Math.max(8, pickAnchor.top - 44) : pickAnchor.top + pickAnchor.height + 8
            }
          },
          pick.elements.length > 1 ? h("span", { "data-nks-multi": String(pick.elements.length) }, `\xD7${pick.elements.length}`) : null,
          editing ? h(
            "form",
            { className: "nks-note-form", onSubmit: onSend },
            h("input", {
              "aria-label": copy.editAria,
              "data-nks-comment": "1",
              value: comment,
              placeholder: copy.editPlaceholder,
              autoFocus: true,
              onChange: (event) => setComment(event.target.value)
            }),
            h("button", { type: "submit", className: "nks-tool", "data-nks-send": "1", "aria-label": copy.editSend }, glyph("edit"))
          ) : null,
          !editing ? composing ? h(
            "form",
            { className: "nks-note-form", onSubmit: onSend },
            h("input", {
              "aria-label": copy.noteAria,
              "data-nks-comment": "1",
              value: comment,
              placeholder: copy.notePlaceholder,
              autoFocus: true,
              onChange: (event) => setComment(event.target.value)
            }),
            h("button", { type: "submit", className: "nks-tool", "data-nks-send": "1", title: copy.injectContext, "aria-label": copy.injectContext }, glyph("send"))
          ) : h(
            "div",
            { className: "nks-note-actions" },
            h("button", {
              type: "button",
              className: "nks-tool",
              "data-nks-send": "1",
              title: copy.injectContext,
              "aria-label": copy.injectContext,
              onClick: (event) => {
                if (event.shiftKey) pinNote();
                else injectNote();
              }
            }, glyph("send")),
            h("button", { type: "button", className: "nks-tool", "data-nks-copy-note": "1", title: copy.copyContext, "aria-label": copy.copyContext, onClick: copyNote }, glyph("copy")),
            h("button", { type: "button", className: "nks-tool", "data-nks-compose": "1", title: copy.inputContext, "aria-label": copy.inputContext, onClick: () => setComposing(true) }, glyph("annotate"))
          ) : null
        ) : null
      ),
      // Inspector strip: the picked element's live computed styles under the
      // frame — Cursor's design-mode sidebar reduced to one readable row.
      pick?.elements?.[0] && pick.elements[0].style && Object.keys(pick.elements[0].style).length ? h(
        "div",
        { className: "nks-inspector", "data-nks-inspector": "1" },
        h("span", null, h("b", null, pick.elements[0].selector || pick.elements[0].tag)),
        pick.elements[0].style.color ? h("span", null, `color ${pick.elements[0].style.color}`) : null,
        pick.elements[0].style.fontSize ? h("span", null, `font ${pick.elements[0].style.fontSize}`) : null,
        pick.elements[0].style.fontFamily ? h("span", null, pick.elements[0].style.fontFamily.split(",")[0].replace(/["']/g, "")) : null,
        pick.elements[0].style.display ? h("span", null, pick.elements[0].style.display) : null,
        pick.elements[0].box ? h("span", null, `${Math.round(pick.elements[0].box.width)}\xD7${Math.round(pick.elements[0].box.height)}`) : null,
        Array.isArray(pick.elements[0].componentStack) && pick.elements[0].componentStack.length ? h(
          "span",
          { "data-nks-stack": "1", title: pick.elements[0].componentStack.join(" \u2192 ") },
          `\u269B ${pick.elements[0].componentStack.slice(-3).join(" \u2192 ")}`
        ) : null
      ) : null,
      toast ? h(NanoToast2, { text: toast }) : null,
      pick?.elements?.length ? h("pre", {
        "data-nks-pick": "1",
        style: { display: "none" }
      }, pick.elements.length > 1 ? multiNote2(pick.elements, { url: pageUrl, comment }) : designNote2(pick.elements[0], { url: pageUrl, comment })) : null
    );
  }
  var inject = ["slots", "sidebarRightTabs", "locale", "theme"];
  function apply(ctx) {
    const style = document.createElement("style");
    style.dataset.nksStyle = "true";
    style.textContent = NANO_STYLES2 + STYLE;
    document.head.append(style);
    ctx.effect(() => () => style.remove());
    const languageOf = () => ctx.locale?.getSnapshot?.().active ?? "zh";
    const schemeOf = () => ctx.theme?.getTheme?.().colorScheme === "light" ? "light" : "dark";
    const copy = () => copyFor2(languageOf());
    const Pane = () => h(BrowserPane, { copy: copy(), languageOf, schemeOf });
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: OWN_ID,
      kind: KIND,
      priority: "extension",
      keepMounted: true,
      multiple: false,
      title: () => copy().typeLabel,
      guide: [{
        id: "kitesurf",
        order: 40,
        title: () => copy().typeLabel,
        description: () => copy().typeDescription
      }]
    }));
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: OWN_ID
    }, Pane)));
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
      name: "sidebar.right.pane.tab.title",
      key: OWN_ID
    }, function KitesurfTitle() {
      return copy().typeLabel;
    })));
  }
  return __toCommonJS(index_exports);
})();
		return __kitesurfExport;
	}
});

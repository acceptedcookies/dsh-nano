window.__ModuleLoader__.load({
	id: "dsh-nano-local-sandbox",
	factory: (require) => {
var __dnlsClient = (() => {
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

  // src/client/index.jsx
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject
  });
  var import_react16 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives11 = __require("@deepseek-ai/dsh-client-ui-primitives");

  // ../packages/dsh-nano-ui/src/version.js
  var VERSION = "0.2.1";

  // ../packages/dsh-nano-ui/src/layers.js
  var NANO_LAYER = Object.freeze({
    shellSlot: 20,
    hostModal: 1e3,
    hostPortal: 1100,
    menu: 1100,
    window: 1200,
    windowRaised: 1210,
    overlay: 10,
    local1: 1,
    local2: 2,
    local3: 3,
    local4: 4,
    local5: 5,
    local6: 6,
    local7: 7
  });
  var NANO_SPACE = Object.freeze([4, 8, 12, 16, 20, 24]);
  var kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  var LAYER_CSS = `:root {
${Object.entries(NANO_LAYER).map(([name, value]) => `  --nano-layer-${kebab(name)}: ${value};`).join("\n")}
${NANO_SPACE.map((value, index) => `  --nano-space-${index + 1}: ${value}px;`).join("\n")}
}`;

  // ../packages/dsh-nano-ui/src/styles.js
  var NANO_STYLES = `/* dsh-nano-ui@${VERSION} */
${LAYER_CSS}
[data-nano-scheme="light"] { color-scheme: light; }
[data-nano-scheme="dark"] { color-scheme: dark; }

/* \u2500\u2500 main-window dialog (NanoDialog over the host Modal) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-dialog-card { color: var(--dsw-alias-label-primary); }
.nano-dialog-card.nano-dialog-w-480 { width: min(480px, 100%); }
.nano-dialog-card.nano-dialog-w-560 { width: min(560px, 100%); }
.nano-dialog-card.nano-dialog-w-720 { width: min(720px, 100%); }
.nano-dialog-body { display: flex; flex-direction: column; gap: var(--nano-space-2); min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nano-dialog-error { margin: var(--nano-space-2) 0 0; font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-state-error-primary); }
/* The host Button has no danger variant: keep the outline metrics, paint the error state. */
.nano-modal-action.nano-modal-danger {
  color: var(--dsw-alias-state-error-primary);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width) var(--dsw-alias-state-error-primary);
  transition: background-color .12s ease, color .12s ease, box-shadow .12s ease;
}
@media (hover: hover) {
  .nano-modal-action.nano-modal-danger:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover-danger);
    color: var(--dsw-alias-state-error-secondary);
    box-shadow: inset 0 0 0 var(--dsh-hairline-width) var(--dsw-alias-state-error-secondary);
  }
}

/* \u2500\u2500 window overlay (NanoWindowDialog) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Positioned against the owner container; the owner layer may be pointer-events:none,
   so the overlay turns hit-testing back on. */
.nano-overlay { position: absolute; inset: 0; z-index: var(--nano-layer-overlay); box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; padding: var(--nano-space-3); pointer-events: auto;
  font-family: var(--nano-font-family, inherit); font-size: var(--nano-font-size, inherit); line-height: var(--nano-line-height, inherit); }
.nano-overlay-mask { position: absolute; inset: 0; background: var(--dsw-alias-bg-mask-1); border-radius: inherit; }
.nano-wdlg { position: relative; box-sizing: border-box; display: flex; flex-direction: column; gap: var(--nano-space-3);
  width: min(380px, 100%); max-height: 100%; padding: var(--nano-space-5); outline: none;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg);
  box-shadow: var(--dsw-elevation-prominent); }
.nano-wdlg-head { display: flex; align-items: center; justify-content: space-between; gap: var(--nano-space-2); }
.nano-wdlg-title { margin: 0; font-size: var(--nano-title-size, 1.1em); font-weight: 600; }
.nano-wdlg-desc { margin: 0; font-size: var(--nano-desc-size, inherit); color: var(--dsw-alias-label-secondary); }
.nano-wdlg-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: var(--nano-space-2); overflow-y: auto; overscroll-behavior: contain; }
.nano-wdlg-foot { display: flex; justify-content: flex-end; gap: var(--nano-space-2); }
.nano-wdlg button { font-family: inherit; }

/* \u2500\u2500 menus (host Menu) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-anchor { position: absolute; z-index: var(--nano-layer-menu); width: 0; height: 0; }
.nano-cap-120 { max-height: 120px; }
.nano-cap-160 { max-height: 160px; }
.nano-cap-200 { max-height: 200px; }
.nano-cap-240 { max-height: 240px; }
.nano-cap-320 { max-height: 320px; }
.nano-cap-400 { max-height: 400px; }
.nano-cap-480 { max-height: 480px; }

/* \u2500\u2500 panels behind a SegmentedControl (NanoTabs) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-panes { display: flex; flex-direction: column; gap: var(--nano-space-2); height: 100%; min-height: 0; }
.nano-pane { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nano-pane[hidden] { display: none; }

/* \u2500\u2500 toolbar / empty state / window shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.nano-toolbar { display: flex; align-items: center; gap: var(--nano-space-1); min-height: 36px; padding: 0 var(--nano-space-2);
  border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l1); }
.nano-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--nano-space-2);
  padding: var(--nano-space-6); text-align: center; color: var(--dsw-alias-label-secondary); }
.nano-empty-icon { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.nano-empty-title { margin: 0; color: var(--dsw-alias-label-primary); font-weight: 600; }
.nano-empty-desc { margin: 0; }
.nano-window { position: relative; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-panel);
  box-shadow: var(--dsw-elevation-panel); }
.nano-window-floating { position: fixed; z-index: var(--nano-layer-window); }
.nano-window-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.nano-window-body { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; }

/* Generic panel skeleton (\xA76.3): scrollable layout, sections, fact grid. */
.nano-panel { box-sizing: border-box; block-size: 100%; min-block-size: 0; overflow: auto;
  padding: var(--nano-space-3); color: var(--dsw-alias-label-primary); overflow-wrap: anywhere;
  font: var(--dsw-font-s-14); }
.nano-panes > .nano-toolbar { flex: none; flex-wrap: wrap; font: var(--dsw-font-xs-13); }
.nano-panel-header, .nano-panel-section { display: grid; gap: var(--nano-space-2); margin-block-end: var(--nano-space-3); }
.nano-panel-header h2, .nano-panel-section h3 { margin: 0; font: var(--dsw-font-s-14); font-weight: 500; }
.nano-panel-header p { margin: 0; color: var(--dsw-alias-label-secondary); }
.nano-panel-kicker { font-size: var(--nano-desc-size, inherit); }
.nano-panel-section { padding-block: var(--nano-space-2); font: var(--dsw-font-s-14); }
.nano-panel-section > p { margin: 0; }
.nano-panel th { font: var(--dsw-font-xs-13); color: var(--dsw-alias-label-secondary); }
.nano-panel-section > pre { min-inline-size: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.nano-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: var(--nano-space-2); margin: 0; }
.nano-facts dt { color: var(--dsw-alias-label-secondary); }
.nano-facts dd { margin: 0; font-weight: 500; }
/* Card surface for a fact block. Host has no bordered card; layer-2 on the base, hairline, radius-lg. */
.nano-card { box-sizing: border-box; padding: var(--nano-space-3); background: var(--dsw-alias-bg-layer-2);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); }
/* Label on the left, control on the right, hairline between rows. */
.nano-split { display: flex; align-items: center; justify-content: space-between; gap: var(--nano-space-2); min-height: 32px;
  border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3); }
.nano-split-label { color: var(--dsw-alias-label-primary); }
.nano-split-control { flex: none; }
/* Usage track: 3px rail, fill only when a measurement exists. */
.nano-meter { display: grid; gap: 4px; }
.nano-meter-label { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.nano-meter-track { display: block; height: 3px; background: var(--dsw-alias-border-l3); }
.nano-meter-fill { display: block; height: 3px; background: var(--dsw-alias-state-business-primary); }
.nano-table { width: max-content; max-width: 100%; border-collapse: collapse; }
.nano-table th, .nano-table td { padding: 4px 16px 4px 0; text-align: left; white-space: nowrap; font: var(--dsw-font-xxxs-11); color: var(--dsw-alias-label-secondary); font-weight: 400; }
.nano-table th { color: var(--dsw-alias-label-tertiary); border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3); }
.nano-panel .nano-toolbar { flex-wrap: wrap; }
.nano-panel .nano-panes { height: auto; }
.nano-panel .nano-pane { overflow: visible; }
@media (pointer: coarse) {
  .nano-panel input,
  .nano-facts dt,
  .nano-facts dd { font-size: max(1em, 16px); }
  .nano-facts dd { font-weight: 500; }
}
`;

  // ../packages/dsh-nano-ui/src/dialog.js
  var import_react = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
  var h = import_react.default.createElement;
  var DIALOG_WIDTHS = Object.freeze([380, 480, 560, 720]);
  var DIALOG_HEIGHTS = Object.freeze([480, 560, 640]);
  var DIALOG_CHROME = 136;
  function preset(list, value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
    return list.find((step) => step >= value) ?? list[list.length - 1];
  }
  function bodyStyle({ maxHeight, fixedHeight }) {
    const style = {};
    const fixed = preset(DIALOG_HEIGHTS, fixedHeight);
    if (fixed !== void 0) style.height = `${fixed - DIALOG_CHROME}px`;
    if (typeof maxHeight === "number" && Number.isFinite(maxHeight)) style.maxHeight = `${Math.max(120, Math.round(maxHeight) - DIALOG_CHROME)}px`;
    return style;
  }
  function actionRow({ copy, confirmLabel, confirmDisabled, busy, danger, onConfirm, onCancel }) {
    return h(
      import_react.default.Fragment,
      null,
      h(import_dsh_client_ui_primitives.Button, { variant: "outline", className: "nano-modal-action", onClick: onCancel }, copy.cancel),
      h(import_dsh_client_ui_primitives.Button, {
        variant: danger ? "outline" : "primary",
        className: danger ? "nano-modal-action nano-modal-danger" : "nano-modal-action",
        disabled: confirmDisabled === true || busy === true,
        onClick: onConfirm
      }, confirmLabel ?? copy.confirm)
    );
  }
  function NanoDialog({ copy, title, description, confirmLabel, confirmDisabled, busy, error, danger, footer, width, maxHeight, fixedHeight, className, onConfirm, onCancel, children }) {
    const w = preset(DIALOG_WIDTHS, width);
    return h(import_dsh_client_ui_primitives.Modal, {
      open: true,
      onClose: onCancel,
      title,
      description,
      closeLabel: copy.close ?? copy.cancel,
      className: ["nano-dialog-card", w === void 0 || w === DIALOG_WIDTHS[0] ? "" : `nano-dialog-w-${w}`, className ?? ""].filter(Boolean).join(" "),
      footer: footer ?? actionRow({ copy, confirmLabel, confirmDisabled, busy, danger, onConfirm, onCancel })
    }, h(
      "div",
      { className: "nano-dialog-body", style: bodyStyle({ maxHeight, fixedHeight }) },
      children,
      error === void 0 ? null : h("p", { className: "nano-dialog-error", role: "alert" }, error)
    ));
  }

  // ../packages/dsh-nano-ui/src/overlay.js
  var import_react2 = __toESM(__require("react"), 1);
  var import_react_dom = __require("react-dom");
  var import_dsh_client_ui_primitives2 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var h2 = import_react2.default.createElement;
  function assertContainer(container, who) {
    if (!(container instanceof HTMLElement) || !container.isConnected) {
      throw new Error(`dsh-nano-ui: ${who} needs a container element attached to the document; overlays never fall back to document.body`);
    }
  }

  // ../packages/dsh-nano-ui/src/menu.js
  var import_react3 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives3 = __require("@deepseek-ai/dsh-client-ui-primitives");

  // ../packages/dsh-nano-ui/src/menu-model.js
  var MENU_CAPS = Object.freeze([120, 160, 200, 240, 320, 400, 480]);
  function capClass(maxHeight) {
    if (typeof maxHeight !== "number" || !Number.isFinite(maxHeight)) return void 0;
    const cap = [...MENU_CAPS].reverse().find((step) => step <= maxHeight) ?? MENU_CAPS[0];
    return `nano-cap-${cap}`;
  }
  function toHostItems(actions) {
    return actions.map((action) => action?.separator === true ? { type: "separator", id: action.id } : { id: action.id, label: action.label, icon: action.icon, danger: action.tone === "danger", disabled: action.disabled === true });
  }

  // ../packages/dsh-nano-ui/src/menu.js
  var h3 = import_react3.default.createElement;
  function NanoMenu({ menu, actions, onClose, width = 208, maxHeight, portal = true, direction }) {
    if (menu === null || menu === void 0 || actions.length === 0) return null;
    const onSelect = (id) => {
      const action = actions.find((candidate) => candidate?.separator !== true && candidate?.id === id);
      onClose();
      action?.run?.();
    };
    const list = h3(import_dsh_client_ui_primitives3.Menu, {
      open: true,
      items: toHostItems(actions),
      onSelect,
      onClose,
      side: direction === "up" ? "top" : "bottom",
      portal,
      /* The running host places a portaled list with CSS anchor positioning on
       * `anchorPoint` ({x,y} viewport pixels) and does not read `getAnchorRect`.
       * Without the point, the list anchors to this wrapper's own child, which
       * sits wherever the caller rendered <NanoMenu> — for the files row menu
       * that is the bottom of the pane, not the pointer. `getAnchorRect` stays
       * for a host that positions from a DOMRect instead. */
      anchorPoint: portal ? { x: menu.x, y: menu.y } : void 0,
      getAnchorRect: portal ? () => new DOMRect(menu.x, menu.y, menu.width ?? 0, menu.height ?? 0) : void 0,
      listClassName: capClass(maxHeight)
    }, h3("div", { "aria-hidden": "true", style: { width: `${width}px`, height: 0 } }));
    if (portal) return list;
    return h3("span", { className: "nano-anchor", style: { left: `${menu.x}px`, top: `${menu.y}px` } }, list);
  }

  // ../packages/dsh-nano-ui/src/tabs.js
  var import_react4 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives4 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var h4 = import_react4.default.createElement;
  function NanoTabs({ items, value, onChange, label, className }) {
    const [inner, setInner] = import_react4.default.useState(() => value ?? items[0]?.value);
    const id = `nano-seg-${import_react4.default.useId().replaceAll(":", "")}`;
    const current = value ?? inner;
    const select = (next) => {
      if (value === void 0) setInner(next);
      onChange?.(next);
    };
    return h4(
      "div",
      { className: ["nano-panes", className ?? ""].filter(Boolean).join(" ") },
      h4(import_dsh_client_ui_primitives4.SegmentedControl, { id, value: current, label, options: items.map((item) => ({ value: item.value, label: item.label })), onChange: select }),
      items.map((item) => h4("div", {
        key: item.value,
        id: `${id}-${item.value}-panel`,
        role: "tabpanel",
        className: "nano-pane",
        "aria-labelledby": `${id}-${item.value}`,
        hidden: item.value !== current
      }, item.content))
    );
  }

  // ../packages/dsh-nano-ui/src/dom.js
  var import_react5 = __toESM(__require("react"), 1);
  var import_client = __require("react-dom/client");
  var HOST_MENU_GAP = 4;
  function mount(parent) {
    const host = document.createElement("div");
    parent.appendChild(host);
    const root = (0, import_client.createRoot)(host);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      root.unmount();
      host.remove();
    };
    return { host, root, close };
  }
  function openNanoMenu(options) {
    const { container } = options;
    if (container !== void 0) assertContainer(container, "openNanoMenu");
    const { host, root, close } = mount(container ?? document.body);
    const r = options.anchor;
    const left = r.left ?? r.x ?? 0;
    const top = r.top ?? r.y ?? 0;
    const right = r.right ?? left + (r.width ?? 0);
    const bottom = r.bottom ?? top + (r.height ?? 0);
    const gap = options.gap ?? 0;
    const up = options.direction === "up";
    let menu;
    if (container === void 0) {
      const extra = Math.max(0, gap - HOST_MENU_GAP);
      menu = { x: left, y: up ? top - extra : top, width: right - left, height: bottom - top + extra };
    } else {
      const box = (host.offsetParent ?? container).getBoundingClientRect();
      const scroller = host.offsetParent ?? container;
      menu = {
        x: left - box.left - scroller.clientLeft + scroller.scrollLeft,
        y: (up ? top - gap : bottom + gap) - box.top - scroller.clientTop + scroller.scrollTop
      };
    }
    root.render(import_react5.default.createElement(NanoMenu, {
      menu,
      actions: options.items ?? [],
      width: options.width,
      maxHeight: options.maxHeight,
      direction: options.direction,
      portal: container === void 0,
      onClose: close
    }));
    return { close };
  }

  // ../packages/dsh-nano-ui/src/button.js
  var import_react6 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives5 = __require("@deepseek-ai/dsh-client-ui-primitives");
  function IconButton({ icon, variant = "ghost", size = "sm", ...rest }) {
    const label = rest["aria-label"];
    if (typeof label !== "string" || label.trim() === "") throw new TypeError("dsh-nano-ui: IconButton needs an aria-label");
    return import_react6.default.createElement(import_dsh_client_ui_primitives5.Button, { variant, size, icon, title: label, ...rest });
  }

  // ../packages/dsh-nano-ui/src/empty.js
  var import_react7 = __toESM(__require("react"), 1);
  var h5 = import_react7.default.createElement;
  function EmptyState({ icon, title, description, action, className }) {
    return h5(
      "div",
      { className: ["nano-empty", className ?? ""].filter(Boolean).join(" ") },
      icon === void 0 ? null : h5("span", { className: "nano-empty-icon", "aria-hidden": "true" }, icon),
      h5("p", { className: "nano-empty-title" }, title),
      description === void 0 ? null : h5("p", { className: "nano-empty-desc" }, description),
      action ?? null
    );
  }

  // ../packages/dsh-nano-ui/src/panel.js
  var import_react8 = __toESM(__require("react"), 1);
  var h6 = import_react8.default.createElement;
  function FactGrid({ items }) {
    return h6(
      "dl",
      { className: "nano-facts" },
      (items ?? []).map((item, index) => h6(
        "div",
        { key: index },
        h6("dt", null, item.label),
        h6("dd", null, item.value ?? "\u2014")
      ))
    );
  }
  function SplitRow({ label, children }) {
    return h6(
      "div",
      { className: "nano-split" },
      h6("span", { className: "nano-split-label" }, label),
      h6("span", { className: "nano-split-control" }, children)
    );
  }
  function Meter({ label, text, value }) {
    const width = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
    return h6(
      "div",
      { className: "nano-meter" },
      h6("span", { className: "nano-meter-label" }, `${label} ${text ?? ""}`),
      width === null ? null : h6(
        "span",
        { className: "nano-meter-track" },
        h6("span", { className: "nano-meter-fill", style: { width: `${width}%` } })
      )
    );
  }

  // src/client/managed.js
  var CONTRACT_VERSION = "dnls.control/1";
  var CONTRACT_HEADER = "x-dnls-contract";
  var CONTRACT_META = "dnls/contract";
  var PREFIX = "/nano-local-sandbox/";
  var CONTRACT_PATH = `${PREFIX}contract`;
  var SANDBOX_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var INSPECT_WINDOWS = /* @__PURE__ */ new Set(["24h", "7d", "30d"]);
  var PATH_CAPS = /* @__PURE__ */ new Map([
    [`${PREFIX}sandboxes`, "sandbox.list"],
    [`${PREFIX}inspect`, "sandbox.inspect"],
    [`${PREFIX}processes`, "sandbox.processes"],
    [`${PREFIX}lifecycle`, "sandbox.lifecycle"],
    [`${PREFIX}operations`, "sandbox.operations"],
    [`${PREFIX}status`, "dnls.status"],
    [`${PREFIX}control`, "dnls.control"],
    [`${PREFIX}logs`, "dnls.logs"]
  ]);
  var CONTROL_ACTIONS = /* @__PURE__ */ new Set(["takeover", "release"]);
  function refuse(code, message) {
    const error = new Error(message);
    error.errorId = `dnls.client.${code}`;
    error.restricted = true;
    throw error;
  }
  function createTicket() {
    let seq = 0;
    let alive = true;
    return {
      take() {
        seq += 1;
        const mine = seq;
        return () => alive && seq === mine;
      },
      kill() {
        alive = false;
        seq += 1;
      }
    };
  }
  var assertSandboxId = (sandboxId) => {
    if (typeof sandboxId !== "string" || !SANDBOX_ID.test(sandboxId)) {
      refuse("target", "a sandboxId uuid is required");
    }
  };
  function createDnlsClient({ fetch: impl, origin } = {}) {
    const doFetch = impl ?? globalThis.fetch?.bind(globalThis);
    if (typeof doFetch !== "function") throw new Error("dnls client requires fetch");
    const base = new URL(origin ?? globalThis.location?.origin);
    if (!base.origin || base.origin === "null") throw new Error("dnls client requires an origin");
    let contract = null;
    const announced = (capabilityId) => {
      if (!contract) refuse("discovery", "contract discovery has not run");
      if (!contract.capabilities.includes(capabilityId)) {
        refuse("capability", `${capabilityId} is not announced`);
      }
    };
    async function request(path, { method = "GET", query, body, signal, sandboxId, envelope = "dnls" } = {}) {
      if (!path.startsWith(PREFIX) || path.includes("..")) refuse("path", `unexpected path ${path}`);
      const url = new URL(path, base);
      if (url.origin !== base.origin) refuse("origin", "requests stay on the pane origin");
      for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== void 0 && value !== null) url.searchParams.set(key, String(value));
      }
      const res = await doFetch(url.href, {
        method,
        credentials: "same-origin",
        redirect: "error",
        headers: {
          [CONTRACT_HEADER]: CONTRACT_VERSION,
          accept: "application/json",
          ...body !== void 0 ? { "content-type": "application/json" } : {}
        },
        body: body === void 0 ? void 0 : JSON.stringify(body),
        signal
      });
      const parsed = await res.json().catch(() => null);
      if (!res.ok) {
        const error = new Error(parsed?.error ?? `request failed (${res.status})`);
        error.errorId = parsed?.errorId ?? "dnls.client.http";
        error.status = res.status;
        throw error;
      }
      if (parsed === null || typeof parsed !== "object") refuse("shape", "malformed response body");
      if (envelope === "jsonrpc") return parsed;
      if (res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION) refuse("contract", "response contract header mismatch");
      if (parsed.contractVersion !== CONTRACT_VERSION) refuse("contract", "response contract mismatch");
      if (sandboxId && parsed.sandboxId !== sandboxId) {
        refuse("target", "response names a different sandbox");
      }
      if (parsed.ok === false) {
        const error = new Error(parsed.error ?? "request failed");
        error.errorId = parsed.errorId ?? "dnls.client.refused";
        throw error;
      }
      return parsed;
    }
    async function mcp(name, args, { signal, sandboxId } = {}) {
      announced(name);
      const parsed = await request(`${PREFIX}mcp`, {
        method: "POST",
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name,
            arguments: args,
            _meta: { [CONTRACT_META]: CONTRACT_VERSION }
          }
        },
        signal,
        envelope: "jsonrpc"
      });
      if (parsed?.jsonrpc !== "2.0" || parsed.id !== 1) refuse("mcp", "invalid jsonrpc envelope");
      const result = parsed?.result;
      if (!result || typeof result !== "object") refuse("mcp", "missing mcp result");
      const out = result.structuredContent;
      if (result.isError === true) {
        const error = new Error(out?.error ?? out?.errorId ?? `${name} refused`);
        error.errorId = out?.errorId ?? "dnls.client.mcp";
        error.status = Number.isInteger(out?.status) ? out.status : null;
        throw error;
      }
      if (out?.contractVersion !== CONTRACT_VERSION) {
        refuse("contract", "response contract mismatch");
      }
      if (sandboxId && out.sandboxId !== sandboxId) {
        refuse("target", "response names a different sandbox");
      }
      return out ?? {};
    }
    return {
      /** The only request that runs before discovery; resets announced caps. */
      async discover({ signal } = {}) {
        contract = null;
        const res = await doFetch(new URL(CONTRACT_PATH, base).href, {
          method: "GET",
          credentials: "same-origin",
          redirect: "error",
          headers: { accept: "application/json" },
          signal
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION || body?.contractVersion !== CONTRACT_VERSION || !Array.isArray(body.capabilities)) {
          refuse("contract", "unknown control contract");
        }
        contract = { capabilities: body.capabilities };
        return contract;
      },
      capabilities: () => contract ? [...contract.capabilities] : null,
      /** Per-capability gate: `sandbox.instance.stop` is advertised
       * independently of `sandbox.instance.create` — the pane enables only
       * the actions the provider actually announced. */
      supports: (capabilityId) => contract?.capabilities.includes(capabilityId) === true,
      /** Flat `sandbox.list` payload: `{envs, rows, total, complete}`. */
      async listSandboxes({ signal } = {}) {
        const cap = PATH_CAPS.get(`${PREFIX}sandboxes`);
        announced(cap);
        const body = await request(`${PREFIX}sandboxes`, { signal });
        if (!Array.isArray(body.rows)) refuse("shape", "invalid sandbox list");
        return { envs: body.envs, rows: body.rows, total: body.total, complete: body.complete };
      },
      async inspect(sandboxId, { window: usageWindow = "24h", signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}inspect`));
        if (usageWindow !== null && !INSPECT_WINDOWS.has(usageWindow)) refuse("params", "unknown usage window");
        return request(`${PREFIX}inspect`, {
          query: usageWindow === null ? { sandboxId } : { sandboxId, window: usageWindow },
          signal,
          sandboxId
        });
      },
      async processes(sandboxId, { limit, signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}processes`));
        return request(`${PREFIX}processes`, {
          query: { sandboxId, ...Number.isInteger(limit) ? { limit } : {} },
          signal,
          sandboxId
        });
      },
      /** Object lifecycle POST. `create` is target-none: it must not carry a selector. */
      async lifecycle({ action, sandboxId, name, profileId, requestId, args: extra, signal } = {}) {
        announced(PATH_CAPS.get(`${PREFIX}lifecycle`));
        announced(`sandbox.instance.${action}`);
        if (typeof requestId !== "string" || requestId.length === 0) refuse("params", "requestId required");
        const body = { ...extra ?? {}, action, requestId };
        const query = {};
        if (action === "create") {
          if (sandboxId !== void 0) refuse("target", "create never carries a selector");
          if (typeof name !== "string" || name.length === 0) refuse("params", "name required");
          body.name = name;
          if (profileId !== void 0) body.profileId = profileId;
        } else {
          assertSandboxId(sandboxId);
          query.sandboxId = sandboxId;
        }
        const answer = await request(`${PREFIX}lifecycle`, { method: "POST", query, body, signal, sandboxId });
        if (typeof answer.operationId !== "string" || answer.operationId.length === 0) {
          refuse("receipt", "missing operation receipt");
        }
        if (action === "create" && !SANDBOX_ID.test(answer.sandboxId ?? "")) {
          refuse("receipt", "create answered without a valid sandboxId");
        }
        return answer;
      },
      /** Exact operation read by sandboxId + operationId on the paired route. */
      async readOperation(sandboxId, operationId, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (typeof operationId !== "string" || operationId.length === 0) {
          refuse("params", "operationId required");
        }
        announced(PATH_CAPS.get(`${PREFIX}operations`));
        const answer = await request(`${PREFIX}operations`, {
          query: { sandboxId, operationId },
          signal,
          sandboxId
        });
        if (answer.operationId !== operationId) refuse("target", "response names a different operation");
        return answer;
      },
      /** Authorized profiles via the `sandbox.profile.list` MCP tool. */
      async listProfiles({ signal } = {}) {
        const out = await mcp("sandbox.profile.list", {}, { signal });
        if (!Array.isArray(out.profiles)) refuse("shape", "invalid profile list");
        return out.profiles;
      },
      /** Targeted engine status page (kitesurf profile): the pane reads only
       * whitelisted fields, never page/url/credential material. */
      async logs(sandboxId, { tail = 20, signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}logs`));
        const bounded = Number.isInteger(tail) && tail >= 1 && tail <= 200 ? tail : 20;
        return request(`${PREFIX}logs`, { query: { sandboxId, tail: bounded }, signal, sandboxId });
      },
      async status(sandboxId, { signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}status`));
        return request(`${PREFIX}status`, { query: { sandboxId }, signal, sandboxId });
      },
      /** Shared-engine HITL control: GET reads writer/humanHold; POST is
       * limited to takeover|release — there is no arbitrary action. */
      async control(sandboxId, action, { signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}control`));
        if (action === void 0) {
          return request(`${PREFIX}control`, { query: { sandboxId }, signal, sandboxId });
        }
        if (!CONTROL_ACTIONS.has(action)) refuse("params", `unknown control action ${action}`);
        return request(`${PREFIX}control`, {
          method: "POST",
          query: { sandboxId },
          body: { action },
          signal,
          sandboxId
        });
      },
      /** This principal's terminals on one sandbox — `{sandboxId, terminals}`. */
      async terminalList(sandboxId, { signal } = {}) {
        assertSandboxId(sandboxId);
        const out = await mcp("term.session.list", { sandboxId }, { signal, sandboxId });
        if (!Array.isArray(out.terminals)) refuse("shape", "invalid terminal list");
        return out;
      },
      /** Create-only terminal spawn: `{sandboxId, terminalId}` — never an
       * attach, and the caller supplies the pane/open correlation ids. */
      async terminalCreate(sandboxId, { service, paneId, openId } = {}, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (typeof paneId !== "string" || !paneId || typeof openId !== "string" || !openId) {
          refuse("params", "paneId and openId are required");
        }
        const args = { sandboxId, paneId, openId };
        if (service !== void 0) args.service = service;
        const out = await mcp("term.session.create", args, { signal, sandboxId });
        if (typeof out.terminalId !== "string" || !SANDBOX_ID.test(out.terminalId)) {
          refuse("receipt", "terminal create answered without a valid terminalId");
        }
        return out;
      },
      /** Resize an owned terminal worker. Does not create or attach. */
      async terminalResize(sandboxId, terminalId, cols, rows, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (!SANDBOX_ID.test(terminalId ?? "")) refuse("params", "terminalId required");
        if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2 || cols > 512 || rows > 512) {
          refuse("params", "cols and rows out of range");
        }
        return mcp("term.session.resize", { sandboxId, terminalId, cols, rows }, { signal, sandboxId });
      },
      /** Confirmed close of an owned terminal worker. */
      async terminalClose(sandboxId, terminalId, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (!SANDBOX_ID.test(terminalId ?? "")) refuse("params", "terminalId required");
        return mcp("term.session.close", { sandboxId, terminalId }, { signal, sandboxId });
      },
      /** Desired resources: `{expectedRevision, overrides:{cpus?,memoryBytes?}}`. */
      async saveRevision(sandboxId, { expectedRevision, overrides } = {}, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (!Number.isInteger(expectedRevision) || expectedRevision < 0) refuse("params", "expectedRevision required");
        if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) refuse("params", "overrides required");
        return mcp("sandbox.revision.save", { sandboxId, expectedRevision, overrides }, { signal, sandboxId });
      },
      /** Idle timeout in whole minutes on the wire as milliseconds. */
      async configureIdle(sandboxId, idleTimeoutMs, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (!Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs < 0) refuse("params", "idleTimeoutMs out of range");
        return mcp("sandbox.idle.configure", { sandboxId, idleTimeoutMs }, { signal, sandboxId });
      }
    };
  }

  // src/client/i18n.js
  var EN = {
    localeTag: "en",
    typeLabel: "Sandboxes",
    typeDescription: "Managed local sandboxes: list, monitor and control.",
    workbench: "Sandbox workbench",
    loading: "Loading\u2026",
    refresh: "Refresh",
    retry: "Retry",
    failed: "Could not load sandboxes",
    back: "Back to sandboxes",
    more: "More actions",
    details: "Details",
    none: "\u2014",
    emptyTitle: "No sandboxes yet",
    emptyHint: "Create one from an installed profile.",
    listPartial: "Some environments did not answer; the list may be incomplete.",
    // shell
    overview: "Overview",
    drawerToggle: "Sandbox list",
    statusLabel: "Status",
    system: "System",
    envs: "Environments",
    envAnswered: "{env} answered",
    envSilent: "{env} did not answer",
    sandboxesCount: "{running} running \xB7 {stopped} stopped \xB7 {attention} need attention",
    quota: "Quota",
    quotaLine: "{profile} {used}/{max}",
    sampling: "Sampling",
    samplingLine: "{valid}/{expected} min ({window})",
    terminalsTotal: "Terminals",
    healthLabel: "Health",
    servicesHealthy: "{healthy}/{total} healthy",
    servicesUnchecked: "{total} \xB7 unchecked",
    lastOperation: "Last operation",
    idleHeld: { stopped: "Stopped, not counting", operation: "Operation in progress, not counting", terminal: "Terminal open, not counting", use: "In use, not counting", other: "Not counting" },
    idleActive: "Active, not counting",
    idleWatching: "Counting idle time",
    idleSleepIn: "Sleeps in {n} min",
    lastActivity: "Last activity",
    activeNow: "Now",
    driver: "Driven by",
    activation: "Activation",
    driverUnknown: "Could not read",
    apps: "Apps",
    appOpen: "Open",
    appsHint: "Installed tabs that can open this sandbox. Each opens in a new pane.",
    dockLabel: "Terminal dock",
    dockButton: "Terminals {n}",
    dockPick: "Pick a sandbox from the list to see its terminals.",
    localTerminal: "Local terminal",
    localTerminalNote: "Local terminal, not inside the sandbox",
    localTerminalOpen: "Open local terminal",
    localTerminalFailed: "The host has no local terminal tab.",
    newPane: "Opens in a new pane",
    // states
    state: { running: "Running", stopped: "Stopped", failed: "Failed", missing: "Missing", creating: "Creating", starting: "Starting", unknown: "Unknown" },
    opState: { accepted: "accepted", running: "running", succeeded: "succeeded", failed: "failed", indeterminate: "indeterminate", cancelled: "cancelled" },
    action: { create: "Create", start: "Start", stop: "Stop", restart: "Restart", recreate: "Recreate", remove: "Remove" },
    opStep: {
      dispatch: "Dispatched",
      verify: "Verified",
      already: "Already in that state",
      cancelled: "Cancelled",
      authorize: "Not authorized",
      precheck: "Pre-check",
      "image-precheck": "Image pre-check",
      "pre-inspect": "Pre-check observation",
      "pre-missing": "Container missing",
      "pre-mismatch": "Object mismatch",
      "stop-verify": "Stop verification",
      "remove-precheck": "Removal pre-check",
      "remove-verify": "Removal verification",
      "idle-proof-lost": "Idle evidence lost"
    },
    footRunning: "{running} running \xB7 {stopped} stopped",
    footAttention: "{count} need attention",
    cores: "{n} cores",
    pendingApply: "changes pending",
    containerMissing: "container missing",
    // create
    create: "New sandbox",
    createTitle: "New sandbox",
    createName: "Name",
    createNameHint: "Lowercase letters, digits and dashes.",
    createProfile: "Profile",
    createSubmit: "Create",
    creating: "Creating\u2026",
    noProfiles: "No profiles are installed for this environment.",
    profileNotReady: "not ready",
    profileFacts: "Version {version} \xB7 up to {max} sandboxes",
    // usage
    usage: "Usage",
    usageFleet: "Total across sandboxes with samples",
    usageCpu: "CPU",
    usageMemory: "Memory",
    usageWindow: "Window",
    window24: "24h",
    window7: "7d",
    window30: "30d",
    meanPeak: "mean {mean} \xB7 peak {peak}",
    coverage: "{valid}/{expected} min sampled",
    noSamples: "No samples in this window.",
    notSampling: "Not sampling while stopped",
    lastMinute: "last full minute",
    stateMinutes: "Minutes by state",
    usageDenied: "Usage history is not available to this principal.",
    // detail header
    profile: "Profile",
    revision: "Revision",
    revisionPending: "{applied} applied \xB7 {desired} saved",
    idleSleep: "Auto sleep",
    idleOff: "Off",
    idleAfter: "After {n} min",
    terminals: "Terminals",
    drivers: "Drivers",
    observed: "Observed",
    allocated: "Allocated",
    openIn: "Open in {name}",
    workspaceUnavailable: "No installed tab can open this sandbox.",
    // tabs
    tabs: "Sandbox sections",
    tabMonitor: "Monitor",
    tabTerminals: "Terminals",
    tabServices: "Services",
    tabLogs: "Logs",
    tabActivity: "Activity",
    tabSettings: "Settings",
    // monitor
    processes: "Guest processes",
    processesEmpty: "No guest processes reported.",
    processesTruncated: "Showing the first {n}; the provider truncated the list.",
    procPid: "PID",
    procName: "Name",
    procState: "State",
    procRss: "RSS",
    deployment: "Deployment",
    imageDigest: "Image",
    verifiedAt: "Verified",
    storage: "Storage",
    readOnly: "read-only",
    readWrite: "read-write",
    // terminals
    terminalNew: "New terminal",
    terminalOpen: "Open",
    terminalClose: "Close terminal",
    terminalCloseTitle: "Close terminal",
    terminalCloseBody: "Close terminal {id}? Its shell process ends; output that was not saved is lost.",
    terminalCloseUnavailable: "The shell did not answer, so closing could not be confirmed. If the sandbox restarted since it opened, the shell is already gone.",
    terminalLabel: "Shell {id}",
    termState: { pending: "starting", active: "active", ended: "ended", unknown: "unknown" },
    terminalsEmpty: "No terminals are open on this sandbox.",
    terminalsDenied: "Terminals are not available to this principal.",
    terminalsStopped: "Start the sandbox to open a terminal.",
    terminalUnavailable: "No installed tab can open terminals.",
    terminalsHint: "Terminals open through the host in a new pane. Closing that tab only detaches; Close terminal ends the shell.",
    // services
    services: "Services",
    servicesEmpty: "This profile declares no services.",
    unpublished: "not published",
    health: { healthy: "healthy", unhealthy: "unhealthy", unknown: "unchecked" },
    probeTitle: "Live health",
    probe: "Check now",
    probing: "Checking\u2026",
    probeHealthy: "All planes healthy",
    probeDegraded: "Degraded: {planes}",
    probeAt: "Checked {at}",
    probeStopped: "Start the sandbox to check its engine.",
    plane: { container: "Container", engine: "Engine", page: "Page", dom: "DOM", bridge: "Bridge", terminal: "Terminal" },
    planeState: {
      running: "running",
      stopped: "stopped",
      missing: "missing",
      unknown: "unknown",
      cdp: "CDP ready",
      "http-only": "HTTP only",
      down: "down",
      up: "up",
      none: "no page",
      blank: "blank page",
      open: "page open",
      ready: "ready",
      failed: "failed",
      absent: "none",
      listening: "listening",
      "policy-stale": "policy stale"
    },
    logsTail: "Last {n} lines",
    planeSkipped: "skipped",
    manualControl: "Manual control",
    manualHeld: "Held by an operator",
    manualFree: "Agents may write",
    takeover: "Take over",
    release: "Release",
    // logs
    logs: "Engine logs",
    logsLines: "Lines",
    logsEmpty: "The engine wrote no log lines.",
    logsStopped: "Logs are read from the running container.",
    copy: "Copy",
    copied: "Copied",
    wrapOn: "Wrap lines",
    wrapOff: "Unwrap lines",
    // activity
    receipts: "Requests from this page",
    receiptLine: "{action} \xB7 {state}",
    receiptId: "Operation {id}",
    recheck: "Check again",
    receiptHint: "Status is read back by operation id; a request is never sent twice.",
    lookup: "Look up an operation",
    lookupPlaceholder: "Operation id",
    lookupGo: "Look up",
    lookupMissing: "No operation with this id on this sandbox.",
    history: "Operation history",
    historyEmpty: "No operations recorded yet.",
    // settings
    power: "Power",
    powerState: "Power",
    restartRow: "Restart",
    idleMinutes: "Auto sleep (minutes, 0 = off)",
    save: "Save",
    saved: "Saved",
    resources: "Resources",
    resourcesHint: "Saving records a new revision. Recreate applies it.",
    cpus: "CPUs",
    memoryMiB: "Memory (MiB)",
    current: "now {value}",
    savedRevision: "Saved revision {revision}. Recreate to apply it.",
    applyNow: "Recreate to apply",
    wholeNumber: "Enter a whole number.",
    nothingToSave: "Nothing changed.",
    configDenied: "Settings are read-only for this principal.",
    danger: "Danger zone",
    recreateRow: "Replace the container and keep the state volume",
    removeRow: "Remove the sandbox; the state volume stays on disk",
    // confirmations
    cancel: "Cancel",
    close: "Close",
    confirm: "Confirm",
    confirmTitle: { stop: "Stop sandbox", restart: "Restart sandbox", recreate: "Recreate sandbox", remove: "Remove sandbox" },
    confirmBody: {
      stop: "Stop {name}? Open terminals and running work are interrupted. The sandbox keeps its id, ports and volume.",
      restart: "Restart {name}? Open terminals and running work are interrupted.",
      recreate: "Recreate {name}? The container is replaced and verified again. Terminals are interrupted; the state volume is kept.",
      remove: "Remove {name}? The record and container go away. The state volume on disk is kept, not wiped."
    },
    acknowledge: {
      stop: "I understand terminals are interrupted",
      restart: "I understand terminals are interrupted",
      recreate: "I understand the container is replaced",
      remove: "I understand the sandbox record is removed"
    }
  };
  var ZH = {
    localeTag: "zh-CN",
    typeLabel: "\u6C99\u7BB1",
    typeDescription: "\u6258\u7BA1\u672C\u5730\u6C99\u7BB1\uFF1A\u5217\u8868\u3001\u76D1\u63A7\u4E0E\u63A7\u5236\u3002",
    workbench: "\u6C99\u7BB1\u5DE5\u4F5C\u53F0",
    loading: "\u52A0\u8F7D\u4E2D\u2026",
    refresh: "\u5237\u65B0",
    retry: "\u91CD\u8BD5",
    failed: "\u6C99\u7BB1\u5217\u8868\u52A0\u8F7D\u5931\u8D25",
    back: "\u8FD4\u56DE\u6C99\u7BB1\u5217\u8868",
    more: "\u66F4\u591A\u64CD\u4F5C",
    details: "\u67E5\u770B\u8BE6\u60C5",
    none: "\u2014",
    emptyTitle: "\u8FD8\u6CA1\u6709\u6C99\u7BB1",
    emptyHint: "\u4ECE\u5DF2\u5B89\u88C5\u7684 profile \u65B0\u5EFA\u4E00\u4E2A\u3002",
    listPartial: "\u6709\u73AF\u5883\u672A\u5E94\u7B54\uFF0C\u5217\u8868\u53EF\u80FD\u4E0D\u5B8C\u6574\u3002",
    overview: "\u603B\u89C8",
    drawerToggle: "\u6C99\u7BB1\u5217\u8868",
    statusLabel: "\u72B6\u6001",
    system: "\u7CFB\u7EDF",
    envs: "\u73AF\u5883",
    envAnswered: "{env} \u5DF2\u5E94\u7B54",
    envSilent: "{env} \u672A\u5E94\u7B54",
    sandboxesCount: "{running} \u8FD0\u884C \xB7 {stopped} \u505C\u6B62 \xB7 {attention} \u9700\u5904\u7406",
    quota: "\u914D\u989D",
    quotaLine: "{profile} {used}/{max}",
    sampling: "\u91C7\u6837",
    samplingLine: "{valid}/{expected} \u5206\u949F\uFF08{window}\uFF09",
    terminalsTotal: "\u7EC8\u7AEF",
    healthLabel: "\u5065\u5EB7",
    servicesHealthy: "{healthy}/{total} \u5065\u5EB7",
    servicesUnchecked: "{total} \u4E2A \xB7 \u672A\u68C0\u67E5",
    lastOperation: "\u6700\u8FD1\u64CD\u4F5C",
    idleHeld: { stopped: "\u5DF2\u505C\u6B62\uFF0C\u4E0D\u8BA1\u65F6", operation: "\u64CD\u4F5C\u8FDB\u884C\u4E2D\uFF0C\u4E0D\u8BA1\u65F6", terminal: "\u7EC8\u7AEF\u6253\u5F00\u4E2D\uFF0C\u4E0D\u8BA1\u65F6", use: "\u4F7F\u7528\u4E2D\uFF0C\u4E0D\u8BA1\u65F6", other: "\u4E0D\u8BA1\u65F6" },
    idleActive: "\u6709\u6D3B\u52A8\uFF0C\u4E0D\u8BA1\u65F6",
    idleWatching: "\u95F2\u7F6E\u8BA1\u65F6\u4E2D",
    idleSleepIn: "{n} \u5206\u949F\u540E\u4F11\u7720",
    lastActivity: "\u6700\u8FD1\u6D3B\u52A8",
    activeNow: "\u73B0\u5728",
    driver: "\u9A71\u52A8\u65B9",
    activation: "\u6FC0\u53D1\u72B6\u6001",
    driverUnknown: "\u8BFB\u53D6\u5931\u8D25",
    apps: "\u5E94\u7528",
    appOpen: "\u6253\u5F00",
    appsHint: "\u5DF2\u5B89\u88C5\u3001\u80FD\u6253\u5F00\u8FD9\u4E2A\u6C99\u7BB1\u7684\u9875\u7B7E\uFF0C\u5404\u81EA\u5728\u65B0\u5206\u680F\u6253\u5F00\u3002",
    dockLabel: "\u7EC8\u7AEF\u575E",
    dockButton: "\u7EC8\u7AEF {n}",
    dockPick: "\u5728\u5DE6\u4FA7\u5217\u8868\u9009\u62E9\u4E00\u4E2A\u6C99\u7BB1\u540E\u663E\u793A\u5B83\u7684\u7EC8\u7AEF\u3002",
    localTerminal: "\u672C\u673A\u7EC8\u7AEF",
    localTerminalNote: "\u672C\u673A\u7EC8\u7AEF\uFF0C\u4E0D\u5728\u6C99\u7BB1\u5185",
    localTerminalOpen: "\u6253\u5F00\u672C\u673A\u7EC8\u7AEF",
    localTerminalFailed: "\u5BBF\u4E3B\u6CA1\u6709\u53EF\u7528\u7684\u672C\u673A\u7EC8\u7AEF\u9875\u7B7E\u3002",
    newPane: "\u5728\u65B0\u5206\u680F\u6253\u5F00",
    state: { running: "\u8FD0\u884C\u4E2D", stopped: "\u5DF2\u505C\u6B62", failed: "\u5931\u8D25", missing: "\u7F3A\u5931", creating: "\u521B\u5EFA\u4E2D", starting: "\u542F\u52A8\u4E2D", unknown: "\u672A\u77E5" },
    opState: { accepted: "\u5DF2\u53D7\u7406", running: "\u6267\u884C\u4E2D", succeeded: "\u6210\u529F", failed: "\u5931\u8D25", indeterminate: "\u7ED3\u679C\u672A\u77E5", cancelled: "\u5DF2\u53D6\u6D88" },
    action: { create: "\u521B\u5EFA", start: "\u542F\u52A8", stop: "\u505C\u6B62", restart: "\u91CD\u542F", recreate: "\u91CD\u5EFA", remove: "\u79FB\u9664" },
    opStep: {
      dispatch: "\u5DF2\u6D3E\u53D1",
      verify: "\u5DF2\u6838\u9A8C",
      already: "\u5DF2\u5904\u4E8E\u8BE5\u72B6\u6001",
      cancelled: "\u5DF2\u53D6\u6D88",
      authorize: "\u672A\u83B7\u6388\u6743",
      precheck: "\u9884\u68C0",
      "image-precheck": "\u955C\u50CF\u9884\u68C0",
      "pre-inspect": "\u9884\u68C0\u89C2\u6D4B",
      "pre-missing": "\u5BB9\u5668\u7F3A\u5931",
      "pre-mismatch": "\u5BF9\u8C61\u4E0D\u7B26",
      "stop-verify": "\u505C\u6B62\u6838\u9A8C",
      "remove-precheck": "\u79FB\u9664\u9884\u68C0",
      "remove-verify": "\u79FB\u9664\u6838\u9A8C",
      "idle-proof-lost": "\u95F2\u7F6E\u8BC1\u636E\u4E22\u5931"
    },
    footRunning: "{running} \u8FD0\u884C \xB7 {stopped} \u505C\u6B62",
    footAttention: "{count} \u9700\u5904\u7406",
    cores: "{n} \u6838",
    pendingApply: "\u6709\u5F85\u5E94\u7528\u7684\u4FEE\u6539",
    containerMissing: "\u5BB9\u5668\u7F3A\u5931",
    create: "\u65B0\u5EFA\u6C99\u7BB1",
    createTitle: "\u65B0\u5EFA\u6C99\u7BB1",
    createName: "\u540D\u79F0",
    createNameHint: "\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u4E0E\u77ED\u6A2A\u7EBF\u3002",
    createProfile: "Profile",
    createSubmit: "\u521B\u5EFA",
    creating: "\u521B\u5EFA\u4E2D\u2026",
    noProfiles: "\u6B64\u73AF\u5883\u6CA1\u6709\u5DF2\u5B89\u88C5\u7684 profile\u3002",
    profileNotReady: "\u672A\u5C31\u7EEA",
    profileFacts: "\u7248\u672C {version} \xB7 \u6700\u591A {max} \u4E2A\u6C99\u7BB1",
    usage: "\u7528\u91CF",
    usageFleet: "\u6709\u6837\u672C\u6C99\u7BB1\u7684\u5408\u8BA1",
    usageCpu: "CPU",
    usageMemory: "\u5185\u5B58",
    usageWindow: "\u65F6\u95F4\u8303\u56F4",
    window24: "24 \u5C0F\u65F6",
    window7: "7 \u5929",
    window30: "30 \u5929",
    meanPeak: "\u5747\u503C {mean} \xB7 \u5CF0\u503C {peak}",
    coverage: "{valid}/{expected} \u5206\u949F\u6709\u6837\u672C",
    noSamples: "\u6B64\u65F6\u95F4\u8303\u56F4\u5185\u6CA1\u6709\u6837\u672C\u3002",
    notSampling: "\u505C\u6B62\u671F\u95F4\u4E0D\u91C7\u6837",
    lastMinute: "\u6700\u8FD1\u4E00\u4E2A\u5B8C\u6574\u5206\u949F",
    stateMinutes: "\u5404\u72B6\u6001\u5206\u949F\u6570",
    usageDenied: "\u6B64\u8EAB\u4EFD\u65E0\u6743\u8BFB\u53D6\u7528\u91CF\u5386\u53F2\u3002",
    profile: "Profile",
    revision: "\u4FEE\u8BA2",
    revisionPending: "\u5DF2\u5E94\u7528 {applied} \xB7 \u5DF2\u4FDD\u5B58 {desired}",
    idleSleep: "\u95F2\u7F6E\u4F11\u7720",
    idleOff: "\u5173\u95ED",
    idleAfter: "{n} \u5206\u949F\u540E",
    terminals: "\u7EC8\u7AEF",
    drivers: "\u9A71\u52A8",
    observed: "\u89C2\u6D4B\u4E8E",
    allocated: "\u5206\u914D",
    openIn: "\u5728 {name} \u4E2D\u6253\u5F00",
    workspaceUnavailable: "\u6CA1\u6709\u5DF2\u5B89\u88C5\u7684\u9875\u7B7E\u53EF\u4EE5\u6253\u5F00\u8FD9\u4E2A\u6C99\u7BB1\u3002",
    tabs: "\u6C99\u7BB1\u5206\u533A",
    tabMonitor: "\u76D1\u63A7",
    tabTerminals: "\u7EC8\u7AEF",
    tabServices: "\u670D\u52A1",
    tabLogs: "\u65E5\u5FD7",
    tabActivity: "\u6D3B\u52A8",
    tabSettings: "\u8BBE\u7F6E",
    processes: "\u6765\u5BBE\u8FDB\u7A0B",
    processesEmpty: "\u6CA1\u6709\u6765\u5BBE\u8FDB\u7A0B\u8BB0\u5F55\u3002",
    processesTruncated: "\u4EC5\u663E\u793A\u524D {n} \u4E2A\uFF0Cprovider \u5DF2\u622A\u65AD\u5217\u8868\u3002",
    procPid: "PID",
    procName: "\u540D\u79F0",
    procState: "\u72B6\u6001",
    procRss: "RSS",
    deployment: "\u90E8\u7F72",
    imageDigest: "\u955C\u50CF",
    verifiedAt: "\u9A8C\u8BC1\u4E8E",
    storage: "\u5B58\u50A8",
    readOnly: "\u53EA\u8BFB",
    readWrite: "\u8BFB\u5199",
    terminalNew: "\u65B0\u5EFA\u7EC8\u7AEF",
    terminalOpen: "\u6253\u5F00",
    terminalClose: "\u5173\u95ED\u7EC8\u7AEF",
    terminalCloseTitle: "\u5173\u95ED\u7EC8\u7AEF",
    terminalCloseBody: "\u5173\u95ED\u7EC8\u7AEF {id}\uFF1F\u5176 shell \u8FDB\u7A0B\u4F1A\u7ED3\u675F\uFF0C\u672A\u4FDD\u5B58\u7684\u8F93\u51FA\u4F1A\u4E22\u5931\u3002",
    terminalCloseUnavailable: "\u7EC8\u7AEF\u8FDB\u7A0B\u6CA1\u6709\u54CD\u5E94\uFF0C\u65E0\u6CD5\u786E\u8BA4\u5DF2\u5173\u95ED\u3002\u5982\u679C\u5B83\u6253\u5F00\u540E\u6C99\u7BB1\u91CD\u542F\u8FC7\uFF0C\u8FD9\u4E2A shell \u5DF2\u7ECF\u4E0D\u5728\u4E86\u3002",
    terminalLabel: "Shell {id}",
    termState: { pending: "\u542F\u52A8\u4E2D", active: "\u6D3B\u52A8", ended: "\u5DF2\u7ED3\u675F", unknown: "\u672A\u77E5" },
    terminalsEmpty: "\u8FD9\u4E2A\u6C99\u7BB1\u4E0A\u6CA1\u6709\u6253\u5F00\u7684\u7EC8\u7AEF\u3002",
    terminalsDenied: "\u6B64\u8EAB\u4EFD\u65E0\u6743\u4F7F\u7528\u7EC8\u7AEF\u3002",
    terminalsStopped: "\u542F\u52A8\u6C99\u7BB1\u540E\u624D\u80FD\u6253\u5F00\u7EC8\u7AEF\u3002",
    terminalUnavailable: "\u6CA1\u6709\u5DF2\u5B89\u88C5\u7684\u9875\u7B7E\u53EF\u4EE5\u6253\u5F00\u7EC8\u7AEF\u3002",
    terminalsHint: "\u7EC8\u7AEF\u7ECF\u5BBF\u4E3B\u5728\u65B0\u5206\u680F\u6253\u5F00\u3002\u5173\u95ED\u90A3\u4E2A\u9875\u7B7E\u53EA\u662F\u65AD\u5F00\uFF1B\u300C\u5173\u95ED\u7EC8\u7AEF\u300D\u624D\u4F1A\u7ED3\u675F shell\u3002",
    services: "\u670D\u52A1",
    servicesEmpty: "\u8FD9\u4E2A profile \u6CA1\u6709\u58F0\u660E\u670D\u52A1\u3002",
    unpublished: "\u672A\u53D1\u5E03",
    health: { healthy: "\u5065\u5EB7", unhealthy: "\u5F02\u5E38", unknown: "\u672A\u68C0\u67E5" },
    probeTitle: "\u5B9E\u65F6\u5065\u5EB7",
    probe: "\u7ACB\u5373\u68C0\u67E5",
    probing: "\u68C0\u67E5\u4E2D\u2026",
    probeHealthy: "\u5404\u5E73\u9762\u5747\u5065\u5EB7",
    probeDegraded: "\u964D\u7EA7\uFF1A{planes}",
    probeAt: "\u68C0\u67E5\u4E8E {at}",
    probeStopped: "\u542F\u52A8\u6C99\u7BB1\u540E\u624D\u80FD\u68C0\u67E5\u5F15\u64CE\u3002",
    plane: { container: "\u5BB9\u5668", engine: "\u5F15\u64CE", page: "\u9875\u9762", dom: "DOM", bridge: "\u6865", terminal: "\u7EC8\u7AEF" },
    planeState: {
      running: "\u8FD0\u884C\u4E2D",
      stopped: "\u5DF2\u505C\u6B62",
      missing: "\u7F3A\u5931",
      unknown: "\u672A\u77E5",
      cdp: "CDP \u5C31\u7EEA",
      "http-only": "\u4EC5 HTTP",
      down: "\u4E0D\u53EF\u8FBE",
      up: "\u5728\u7EBF",
      none: "\u65E0\u9875\u9762",
      blank: "\u7A7A\u767D\u9875",
      open: "\u5DF2\u6253\u5F00",
      ready: "\u5C31\u7EEA",
      failed: "\u5931\u8D25",
      absent: "\u65E0",
      listening: "\u76D1\u542C\u4E2D",
      "policy-stale": "\u7B56\u7565\u8FC7\u671F"
    },
    logsTail: "\u6700\u8FD1 {n} \u884C",
    planeSkipped: "\u5DF2\u8DF3\u8FC7",
    manualControl: "\u4EBA\u5DE5\u63A5\u7BA1",
    manualHeld: "\u5DF2\u7531\u64CD\u4F5C\u8005\u63A5\u7BA1",
    manualFree: "\u5141\u8BB8 agent \u5199\u5165",
    takeover: "\u63A5\u7BA1",
    release: "\u91CA\u653E",
    logs: "\u5F15\u64CE\u65E5\u5FD7",
    logsLines: "\u884C\u6570",
    logsEmpty: "\u5F15\u64CE\u6CA1\u6709\u8F93\u51FA\u65E5\u5FD7\u3002",
    logsStopped: "\u65E5\u5FD7\u4ECE\u8FD0\u884C\u4E2D\u7684\u5BB9\u5668\u8BFB\u53D6\u3002",
    copy: "\u590D\u5236",
    copied: "\u5DF2\u590D\u5236",
    wrapOn: "\u81EA\u52A8\u6362\u884C",
    wrapOff: "\u53D6\u6D88\u6362\u884C",
    receipts: "\u672C\u9875\u53D1\u51FA\u7684\u8BF7\u6C42",
    receiptLine: "{action} \xB7 {state}",
    receiptId: "\u64CD\u4F5C {id}",
    recheck: "\u91CD\u65B0\u67E5\u8BE2",
    receiptHint: "\u6309\u64CD\u4F5C\u53F7\u8BFB\u56DE\u72B6\u6001\uFF0C\u540C\u4E00\u8BF7\u6C42\u4E0D\u4F1A\u91CD\u53D1\u3002",
    lookup: "\u6309\u64CD\u4F5C\u53F7\u67E5\u8BE2",
    lookupPlaceholder: "\u64CD\u4F5C\u53F7",
    lookupGo: "\u67E5\u8BE2",
    lookupMissing: "\u8FD9\u4E2A\u6C99\u7BB1\u4E0A\u6CA1\u6709\u8BE5\u64CD\u4F5C\u53F7\u3002",
    history: "\u64CD\u4F5C\u5386\u53F2",
    historyEmpty: "\u8FD8\u6CA1\u6709\u64CD\u4F5C\u8BB0\u5F55\u3002",
    power: "\u7535\u6E90",
    powerState: "\u7535\u6E90",
    restartRow: "\u91CD\u542F",
    idleMinutes: "\u95F2\u7F6E\u4F11\u7720\uFF08\u5206\u949F\uFF0C0 \u4E3A\u5173\u95ED\uFF09",
    save: "\u4FDD\u5B58",
    saved: "\u5DF2\u4FDD\u5B58",
    resources: "\u8D44\u6E90",
    resourcesHint: "\u4FDD\u5B58\u4F1A\u8BB0\u5F55\u4E00\u4E2A\u65B0\u4FEE\u8BA2\uFF0C\u91CD\u5EFA\u540E\u751F\u6548\u3002",
    cpus: "CPU \u6838\u6570",
    memoryMiB: "\u5185\u5B58\uFF08MiB\uFF09",
    current: "\u5F53\u524D {value}",
    savedRevision: "\u5DF2\u4FDD\u5B58\u4FEE\u8BA2 {revision}\uFF0C\u91CD\u5EFA\u540E\u751F\u6548\u3002",
    applyNow: "\u91CD\u5EFA\u4EE5\u5E94\u7528",
    wholeNumber: "\u8BF7\u8F93\u5165\u6574\u6570\u3002",
    nothingToSave: "\u6CA1\u6709\u6539\u52A8\u3002",
    configDenied: "\u6B64\u8EAB\u4EFD\u5BF9\u8BBE\u7F6E\u53EA\u8BFB\u3002",
    danger: "\u5371\u9669\u64CD\u4F5C",
    recreateRow: "\u66FF\u6362\u5BB9\u5668\uFF0C\u4FDD\u7559\u72B6\u6001\u5377",
    removeRow: "\u79FB\u9664\u6C99\u7BB1\uFF0C\u78C1\u76D8\u4E0A\u7684\u72B6\u6001\u5377\u4FDD\u7559",
    cancel: "\u53D6\u6D88",
    close: "\u5173\u95ED",
    confirm: "\u786E\u8BA4",
    confirmTitle: { stop: "\u505C\u6B62\u6C99\u7BB1", restart: "\u91CD\u542F\u6C99\u7BB1", recreate: "\u91CD\u5EFA\u6C99\u7BB1", remove: "\u79FB\u9664\u6C99\u7BB1" },
    confirmBody: {
      stop: "\u505C\u6B62 {name}\uFF1F\u6253\u5F00\u7684\u7EC8\u7AEF\u548C\u8FDB\u884C\u4E2D\u7684\u5DE5\u4F5C\u4F1A\u4E2D\u65AD\u3002\u6C99\u7BB1\u4FDD\u7559 ID\u3001\u7AEF\u53E3\u548C\u5377\u3002",
      restart: "\u91CD\u542F {name}\uFF1F\u6253\u5F00\u7684\u7EC8\u7AEF\u548C\u8FDB\u884C\u4E2D\u7684\u5DE5\u4F5C\u4F1A\u4E2D\u65AD\u3002",
      recreate: "\u91CD\u5EFA {name}\uFF1F\u5BB9\u5668\u4F1A\u88AB\u66FF\u6362\u5E76\u91CD\u65B0\u9A8C\u8BC1\uFF0C\u7EC8\u7AEF\u4F1A\u4E2D\u65AD\uFF0C\u72B6\u6001\u5377\u4FDD\u7559\u3002",
      remove: "\u79FB\u9664 {name}\uFF1F\u8BB0\u5F55\u548C\u5BB9\u5668\u4F1A\u88AB\u79FB\u9664\uFF0C\u78C1\u76D8\u4E0A\u7684\u72B6\u6001\u5377\u4FDD\u7559\u3001\u4E0D\u64E6\u9664\u3002"
    },
    acknowledge: {
      stop: "\u6211\u4E86\u89E3\u7EC8\u7AEF\u4F1A\u4E2D\u65AD",
      restart: "\u6211\u4E86\u89E3\u7EC8\u7AEF\u4F1A\u4E2D\u65AD",
      recreate: "\u6211\u4E86\u89E3\u5BB9\u5668\u4F1A\u88AB\u66FF\u6362",
      remove: "\u6211\u4E86\u89E3\u6C99\u7BB1\u8BB0\u5F55\u4F1A\u88AB\u79FB\u9664"
    }
  };
  function copyFor(language) {
    return language === "zh" ? ZH : EN;
  }
  function fill(template, params) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ""));
  }

  // src/host/terminal-resource.js
  var ENV = /^[a-z][a-z0-9-]{0,15}$/;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var ENV_SRC = ENV.source.slice(1, -1);
  var UUID_SRC = UUID.source.slice(1, -1);
  var prefix = "dsh-resource://sandbox-terminal/";
  var sandboxPrefix = "dsh-resource://sandbox/";
  var SANDBOX_ADDRESS = new RegExp(`^dsh-resource://sandbox/(${ENV_SRC})/(${UUID_SRC})$`);
  function terminalAddress({ envId, sandboxId, terminalId }) {
    if (![envId, sandboxId, terminalId].every((v) => typeof v === "string") || !ENV.test(envId) || !UUID.test(sandboxId) || !UUID.test(terminalId)) throw new TypeError("invalid sandbox terminal reference");
    return `${prefix}${envId}/${sandboxId}/${terminalId}`;
  }
  function sandboxAddress({ envId, sandboxId }) {
    if (typeof envId !== "string" || typeof sandboxId !== "string" || !ENV.test(envId) || !UUID.test(sandboxId)) throw new TypeError("invalid sandbox reference");
    return `${sandboxPrefix}${envId}/${sandboxId}`;
  }
  function openResourceAddress({ candidates, openResource, address }) {
    if (typeof candidates !== "function" || typeof openResource !== "function") return false;
    if ((candidates(address) ?? []).length === 0) return false;
    return openResource(address) !== false;
  }

  // src/client/styles.js
  var STYLE = `
.dnls-pane{height:100%;min-height:0}
.dnls-view{box-sizing:border-box;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13)}
.dnls-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:var(--nano-space-4);padding:var(--nano-space-3)}
.dnls-section{display:flex;flex-direction:column;gap:var(--nano-space-2);min-width:0}
.dnls-section-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px;padding:0 var(--nano-space-1)}
.dnls-section-title{margin:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-strong-13)}
.dnls-plate{display:flex;flex-direction:column;gap:var(--nano-space-3);min-width:0;padding:var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg)}
.dnls-group{display:flex;flex-direction:column;min-width:0;padding:0 var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg)}
.dnls-plate>.dnls-group{padding:0;background:transparent;border:0;border-radius:0}
.dnls-group>.nano-split{flex-wrap:wrap;min-height:40px;padding-block:var(--nano-space-1)}
.dnls-group>.nano-split:last-child{border-bottom:0}
.dnls-head-card{display:flex;flex-direction:column;gap:var(--nano-space-3);padding:var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,var(--dsw-alias-bg-layer-2));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg)}
.dnls-object-head{flex:none;display:flex;flex-direction:column;gap:var(--nano-space-3);padding:var(--nano-space-3) var(--nano-space-3) 0}
.dnls-head-name{display:flex;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-head-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-head-meta{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-head-foot{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-page-head{display:flex;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px;padding:0 var(--nano-space-1)}
.dnls-page-title{margin:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-procs{display:flex;flex-direction:column;min-width:0}
.dnls-procs [data-disclosure-row]{min-height:28px}
.dnls-proc-meta{flex:none;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);font-family:var(--dsh-font-family-code)}
.dnls-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr));gap:var(--nano-space-3)}
.dnls-cards{display:flex;flex-direction:column;gap:var(--nano-space-2)}
.dnls-card{display:flex;flex-direction:column;gap:var(--nano-space-3);min-width:0;padding:var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);cursor:pointer}
.dnls-card:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,var(--dsw-alias-bg-layer-2))}
.dnls-card:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dnls-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-card-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-card-state{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-card-tail{display:flex;flex:none;align-items:center;gap:var(--nano-space-1);margin-left:auto}
.dnls-apps{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2)}
.dnls-dock-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px}
.dnls-muted{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxs-12)}
.dnls-inline{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-detail.nano-panes{padding:var(--nano-space-2) var(--nano-space-3) var(--nano-space-3)}
.dnls-detail>*:first-child{flex:none}
.dnls-detail>.nano-pane{display:flex;flex-direction:column;gap:var(--nano-space-4);padding-top:var(--nano-space-2)}
.dnls-detail>.nano-pane[hidden]{display:none}
.dnls-chart{display:flex;flex-direction:column;gap:var(--nano-space-1)}
.dnls-chart-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--nano-space-2);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-history{display:block;width:100%;height:48px;color:var(--dsw-alias-state-business-primary)}
.dnls-row-copy{display:flex;flex-direction:column;min-width:0}
.dnls-row-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-term{display:flex;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-mono{font-family:var(--dsh-font-family-code);font-size:var(--dsh-code-font-size)}
.dnls-field{display:flex;flex-direction:column;gap:var(--nano-space-1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-grow{display:grid;grid-template-columns:minmax(0,1fr);flex:1 1 12rem;min-width:0}
.dnls-num{display:grid;grid-template-columns:minmax(0,1fr);width:6.5rem}
.dnls-label{display:flex;flex-direction:column;gap:2px;min-width:0}
.dnls-log{max-height:360px;overflow:auto;border-radius:var(--dsw-radius-md)}
`;

  // src/client/shell.jsx
  var import_react9 = __toESM(__require("react"), 1);
  var h7 = import_react9.default.createElement;
  var DOCK_MIN = 120;
  function WorkbenchShell({ label, bar, drawer, dock, status, children }) {
    return h7(
      "section",
      { className: "dnls-shell", "data-dnls-shell": "1" },
      h7("div", { className: "dnls-shell-bar", role: "toolbar", "aria-label": label }, bar),
      h7("div", { className: "dnls-shell-body" }, children),
      drawer ?? null,
      dock ?? null,
      status ?? null
    );
  }
  function ShellToggle({ icon, label, title, open, onClick }) {
    return h7("button", {
      type: "button",
      className: "dnls-shell-toggle",
      "data-dnls-drawer-toggle": "1",
      "aria-pressed": open ? "true" : "false",
      "aria-expanded": open ? "true" : "false",
      "aria-label": label,
      title: label,
      onClick
    }, icon, h7("span", { className: "dnls-shell-toggle-text" }, title));
  }
  function TabDrawer({ open, label, head, onClose, children }) {
    const ref = import_react9.default.useRef(null);
    import_react9.default.useEffect(() => {
      if (!open) return void 0;
      const onKey = (event) => {
        if (event.key === "Escape") onClose?.();
      };
      const onDown = (event) => {
        const target = event.target;
        if (ref.current?.contains(target)) return;
        if (typeof target?.closest === "function" && target.closest("[data-dnls-drawer-toggle]")) return;
        onClose?.();
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("pointerdown", onDown);
      return () => {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("pointerdown", onDown);
      };
    }, [open, onClose]);
    return h7(
      "nav",
      {
        ref,
        className: "dnls-drawer",
        "data-dnls-drawer-state": open ? "open" : "closed",
        "aria-label": label,
        "aria-hidden": open ? void 0 : true
      },
      head ? h7("div", { className: "dnls-drawer-head" }, head) : null,
      h7("div", { className: "dnls-drawer-list" }, children)
    );
  }
  function DrawerRow({ current, onClick, mark, label, meta }) {
    return h7(
      "button",
      {
        type: "button",
        className: "dnls-drawer-row",
        "aria-current": current ? "page" : void 0,
        onClick
      },
      mark ? h7("span", { className: "dnls-drawer-mark" }, mark) : null,
      h7(
        "span",
        { className: "dnls-drawer-copy" },
        h7("span", { className: "dnls-drawer-label" }, label),
        meta ? h7("span", { className: "dnls-drawer-meta" }, meta) : null
      )
    );
  }
  function StatusBar({ label, children, actions = [] }) {
    return h7(
      "footer",
      { className: "dnls-statusbar", "aria-label": label },
      h7("span", { className: "dnls-statusbar-text" }, children),
      h7("span", { className: "dnls-statusbar-actions" }, actions.map((action) => (
        /* nano-ui-exempt: 宿主 Button 最小档 28px，26px 状态条里的 20px 文字按钮没有对应档；度量照 DNK .nks-status button。 */
        h7("button", {
          key: action.id,
          type: "button",
          className: "dnls-statusbar-btn",
          "aria-pressed": action.pressed === void 0 ? void 0 : action.pressed ? "true" : "false",
          "aria-expanded": action.expanded === void 0 ? void 0 : action.expanded ? "true" : "false",
          disabled: action.disabled === true,
          onClick: action.onClick
        }, action.label)
      )))
    );
  }
  function clampHeight(shell, height) {
    const limit = Math.max(DOCK_MIN, Math.floor((shell?.clientHeight ?? 480) * 0.7));
    return Math.min(limit, Math.max(DOCK_MIN, Math.round(height)));
  }
  function Dock({ label, height, onCommit, children }) {
    const ref = import_react9.default.useRef(null);
    import_react9.default.useLayoutEffect(() => {
      if (ref.current) ref.current.style.height = `${height}px`;
    }, [height]);
    const drag = (event) => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      const node = ref.current;
      const shell = node?.closest(".dnls-shell");
      const startY = event.clientY;
      const startH = node?.getBoundingClientRect().height ?? height;
      const move = (ev) => {
        if (node) node.style.height = `${clampHeight(shell, startH + (startY - ev.clientY))}px`;
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        onCommit?.(clampHeight(shell, startH + (startY - ev.clientY)));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    return h7(
      "div",
      { ref, className: "dnls-dock", role: "region", "aria-label": label },
      h7("div", {
        className: "dnls-dock-grip",
        role: "separator",
        "aria-orientation": "horizontal",
        "aria-label": label,
        onPointerDown: drag
      }),
      h7("div", { className: "dnls-dock-body" }, children)
    );
  }
  var SHELL_STYLE = `
.dnls-shell{position:relative;box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:var(--dsw-font-xs-13)}
.dnls-shell-bar{position:relative;z-index:var(--nano-layer-local3);box-sizing:border-box;display:flex;flex:none;align-items:center;gap:var(--nano-space-2);height:38px;padding:5px 6px;border-bottom:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3)}
.dnls-shell-toggle{display:inline-flex;flex:0 1 auto;align-items:center;gap:5px;min-width:0;max-width:60%;height:28px;margin-left:4px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-markdown-tag);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);font-size:var(--dsh-content-font-size-secondary,13px);white-space:nowrap;cursor:pointer}
.dnls-shell-toggle:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dnls-shell-toggle:focus-visible,.dnls-drawer-row:focus-visible,.dnls-statusbar-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dnls-shell-toggle[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link) 14%,var(--dsw-alias-markdown-tag))}
.dnls-shell-toggle-text{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dnls-shell-spacer{flex:1 1 auto;min-width:0}
.dnls-shell-body{position:relative;display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.dnls-drawer{position:absolute;z-index:var(--nano-layer-local4);top:44px;left:10px;bottom:36px;width:216px;max-width:calc(100% - 20px);box-sizing:border-box;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-2);border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);box-shadow:var(--dsw-elevation-prominent);transform:translateX(calc(-100% - 12px));visibility:hidden;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease),visibility 0s linear var(--ds-transition-duration-slow,.32s)}
.dnls-drawer[data-dnls-drawer-state="open"]{transform:none;visibility:visible;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease)}
@starting-style{.dnls-drawer[data-dnls-drawer-state="open"]{transform:translateX(calc(-100% - 12px))}}
@media (prefers-reduced-motion:reduce){.dnls-drawer,.dnls-drawer[data-dnls-drawer-state="open"]{transition:none}}
.dnls-drawer-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:var(--nano-space-2);height:30px;padding:0 10px;border-bottom:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11)}
.dnls-drawer-list{display:flex;flex-direction:column;gap:2px;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:var(--nano-space-1)}
.dnls-drawer-row{display:flex;align-items:center;gap:7px;width:100%;box-sizing:border-box;min-height:30px;margin:0;padding:4px 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer}
.dnls-drawer-row:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dnls-drawer-row[aria-current="page"]{background:var(--dsw-alias-markdown-tag);color:var(--dsw-alias-label-primary)}
.dnls-drawer-mark{display:inline-flex;flex:none}
.dnls-drawer-copy{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
.dnls-drawer-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnls-drawer-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-drawer-sep{height:0;margin:var(--nano-space-1) 4px;border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3)}
.dnls-statusbar{position:relative;z-index:var(--nano-layer-local3);flex:none;display:flex;align-items:center;gap:var(--nano-space-2);height:26px;padding:0 10px;border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-statusbar-text{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnls-statusbar-actions{flex:none;display:flex;align-items:center;gap:var(--nano-space-1)}
.dnls-statusbar-btn{height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;cursor:pointer}
.dnls-statusbar-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dnls-statusbar-btn[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link) 22%,transparent);color:var(--dsw-alias-label-primary)}
.dnls-statusbar-btn:disabled{opacity:.45;cursor:default}
.dnls-dock{position:relative;z-index:var(--nano-layer-local6);flex:none;display:flex;flex-direction:column;min-height:120px;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2)}
.dnls-dock-grip{position:absolute;left:0;right:0;top:-3px;height:7px;cursor:row-resize;touch-action:none}
.dnls-dock-grip:hover{background:color-mix(in srgb,var(--dsw-alias-link) 35%,transparent)}
.dnls-dock-body{display:flex;flex-direction:column;gap:var(--nano-space-2);flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:var(--nano-space-2) var(--nano-space-3)}
`;

  // src/client/fleet.jsx
  var import_react13 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives8 = __require("@deepseek-ai/dsh-client-ui-primitives");

  // src/client/format.js
  function formatBytes(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return null;
    if (value >= 1 << 30) return `${(value / (1 << 30)).toFixed(1)} GiB`;
    if (value >= 1 << 20) return `${(value / (1 << 20)).toFixed(1)} MiB`;
    return `${Math.round(value / 1024)} KiB`;
  }
  function serviceAddress(service) {
    if (service?.published !== true) return null;
    if (typeof service.hostAddress !== "string" || service.hostAddress === "") return null;
    if (!Number.isInteger(service.hostPort)) return null;
    return `${service.hostAddress}:${service.hostPort}`;
  }

  // src/client/model.js
  var DOT = {
    running: "done",
    stopped: "idle",
    failed: "error",
    missing: "warning",
    creating: "ongoing",
    starting: "ongoing"
  };
  var OP_DOT = {
    accepted: "ongoing",
    running: "ongoing",
    succeeded: "done",
    failed: "error",
    indeterminate: "warning",
    cancelled: "idle"
  };
  var SETTLED = /* @__PURE__ */ new Set(["succeeded", "failed", "indeterminate", "cancelled"]);
  var stateText = (copy, state) => copy.state[state] ?? copy.state.unknown;
  var opText = (copy, state) => copy.opState[state] ?? state ?? copy.none;
  var actionText = (copy, action) => copy.action[action] ?? action ?? copy.none;
  var stepText = (copy, step) => step ? copy.opStep[step] ?? step : null;
  var nameOf = (row) => row?.name ?? row?.sandboxId ?? "";
  var shortId = (id) => typeof id === "string" ? id.slice(0, 8) : "";
  var needsAttention = (row) => row?.observedState === "failed" || row?.observedState === "missing";
  var pendingRevision = (row) => Number.isInteger(row?.desiredRevision) && row.desiredRevision > (row.appliedRevision ?? 0);
  function cores(value, digits = 2) {
    return typeof value === "number" && Number.isFinite(value) ? Number(value).toFixed(digits) : null;
  }
  function when(copy, value) {
    const ms = typeof value === "number" ? value : Date.parse(value ?? "");
    if (!Number.isFinite(ms)) return null;
    try {
      return new Intl.DateTimeFormat(copy.localeTag, { dateStyle: "short", timeStyle: "short" }).format(ms);
    } catch {
      return null;
    }
  }
  function whole(text) {
    const trimmed = String(text ?? "").trim();
    if (trimmed === "") return null;
    return /^\d+$/.test(trimmed) ? Number(trimmed) : void 0;
  }
  function ratio(measured, allocated) {
    return typeof measured === "number" && typeof allocated === "number" && allocated > 0 ? Math.max(0, Math.min(100, measured / allocated * 100)) : null;
  }
  function sizeLine(copy, row) {
    const cpus = row?.resources?.cpus;
    const memory = formatBytes(row?.resources?.memoryBytes);
    if (cpus == null && memory == null) return null;
    return [cpus == null ? null : copy.cores.replace("{n}", String(cpus)), memory].filter(Boolean).join(" \xB7 ");
  }
  function serviceHealth(services) {
    const list = Array.isArray(services) ? services : [];
    return {
      total: list.length,
      healthy: list.filter((service) => service?.health === "healthy").length,
      checked: list.filter((service) => service?.health === "healthy" || service?.health === "unhealthy").length
    };
  }
  function serviceHealthText(copy, services) {
    const { total, healthy, checked } = serviceHealth(services);
    if (total === 0) return copy.none;
    if (checked === 0) return fillText(copy.servicesUnchecked, { total });
    return fillText(copy.servicesHealthy, { healthy, total });
  }
  function lastOperationText(copy, row, detail) {
    const timeline = Array.isArray(detail?.operations) ? detail.operations : [];
    const last = timeline.length ? timeline[timeline.length - 1] : null;
    if (last) {
      const at = when(copy, last.finishedAt ?? last.at);
      return [`${actionText(copy, last.action)} \xB7 ${opText(copy, last.state)}`, at].filter(Boolean).join(" \xB7 ");
    }
    const op = row?.operation;
    if (!op?.state) return copy.none;
    return [opText(copy, op.state), stepText(copy, op.step)].filter(Boolean).join(" \xB7 ");
  }
  function minutesUntil(iso, now) {
    const at = Date.parse(iso ?? "");
    if (!Number.isFinite(at)) return null;
    return Math.max(0, Math.ceil((at - now) / 6e4));
  }
  function idleStatusText(copy, idle, now = Date.now()) {
    if (!idle?.state) return copy.none;
    if (idle.state === "off") return copy.idleOff;
    if (idle.state === "held") return copy.idleHeld[idle.reason] ?? copy.idleHeld.other;
    if (idle.state === "active") return copy.idleActive;
    if (idle.state === "watching") {
      const left = minutesUntil(idle.sleepAt, now);
      return left == null ? copy.idleWatching : fillText(copy.idleSleepIn, { n: left });
    }
    return copy.none;
  }
  function lastActivityText(copy, idle) {
    if (idle?.state === "watching") return when(copy, idle.idleSince) ?? copy.none;
    if (idle?.state === "held" || idle?.state === "active") return copy.activeNow;
    return copy.none;
  }
  function driverText(copy, control, running) {
    if (!running) return copy.none;
    if (control?.error) return copy.driverUnknown;
    const hold = control?.state?.humanHold;
    if (!control?.state) return copy.none;
    return hold?.active ? copy.manualHeld : copy.manualFree;
  }
  var fillText = (template, params) => String(template).replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ""));
  function pointsOf(usage, metric, unit, valueKey) {
    if (usage?.[metric]?.unit !== unit || !Array.isArray(usage.history)) return [];
    return usage.history.flatMap((bin) => typeof bin?.at === "number" && typeof bin[valueKey] === "number" && Number.isFinite(bin[valueKey]) ? [{ at: bin.at, value: bin[valueKey] }] : []);
  }
  function combine(usages, metric, unit, valueKey) {
    let expected = 0;
    let valid = 0;
    let objects = 0;
    const byAt = /* @__PURE__ */ new Map();
    for (const usage of usages) {
      const facts = usage?.[metric];
      if (!facts || facts.unit !== unit) continue;
      objects += 1;
      expected += Number(facts.expected) || 0;
      valid += Number(facts.valid) || 0;
      for (const point of pointsOf(usage, metric, unit, valueKey)) {
        byAt.set(point.at, (byAt.get(point.at) ?? 0) + point.value);
      }
    }
    const points = [...byAt.entries()].sort((a, b) => a[0] - b[0]).map(([at, value]) => ({ at, value }));
    const values = points.map((point) => point.value);
    return {
      objects,
      expected,
      valid,
      points,
      mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      peak: values.length ? Math.max(...values) : null
    };
  }

  // src/client/parts.jsx
  var import_react11 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives6 = __require("@deepseek-ai/dsh-client-ui-primitives");

  // src/client/history.jsx
  var import_react10 = __toESM(__require("react"), 1);
  var h8 = import_react10.default.createElement;
  function segments(points) {
    const deltas = [];
    for (let i = 1; i < points.length; i++) deltas.push(points[i].at - points[i - 1].at);
    const positive = deltas.filter((delta) => delta > 0);
    if (positive.length === 0) return [];
    const ordered = [...positive].sort((a, b) => a - b);
    const stride = ordered[Math.floor(ordered.length / 2)];
    const groups = [];
    let current = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (points[i].at - points[i - 1].at > stride * 1.5) {
        if (current.length > 1) groups.push(current);
        current = [points[i]];
      } else current.push(points[i]);
    }
    if (current.length > 1) groups.push(current);
    return groups;
  }
  function HistoryLine({ points }) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const groups = segments(points);
    if (groups.length === 0) return null;
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const first = points[0].at;
    const last = points[points.length - 1].at;
    const width = last - first || 1;
    const d = groups.map((group) => group.map((point, index) => {
      const x = (point.at - first) / width * 240;
      const y = 46 - (point.value - min) / span * 40;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ")).join(" ");
    return h8("svg", {
      className: "dnls-history",
      viewBox: "0 0 240 48",
      preserveAspectRatio: "none",
      "aria-hidden": "true"
    }, h8("path", {
      d,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.25",
      vectorEffect: "non-scaling-stroke"
    }));
  }

  // src/client/parts.jsx
  var h9 = import_react11.default.createElement;
  function Section({ title, aside, children }) {
    return h9(
      "section",
      { className: "dnls-section" },
      h9(
        "div",
        { className: "dnls-section-head" },
        h9("h3", { className: "dnls-section-title" }, title),
        aside ? h9("div", { className: "dnls-inline" }, aside) : null
      ),
      h9("div", { className: "dnls-plate" }, children)
    );
  }
  function handlersFor(host, address) {
    if (typeof address !== "string") return [];
    try {
      return host.handlers(address) ?? [];
    } catch {
      return [];
    }
  }
  function handlerTitle(handler, address, fallback) {
    try {
      const title = typeof handler?.title === "function" ? handler.title(address) : handler?.title;
      return typeof title === "string" && title !== "" ? title : fallback;
    } catch {
      return fallback;
    }
  }
  function handlerIcon(handler) {
    const Icon = Array.isArray(handler?.guide) ? handler.guide.find((entry) => entry?.icon)?.icon : null;
    return h9(Icon ?? import_dsh_client_ui_primitives6.PluginArtworkDefault, { size: 16 });
  }
  function AppList({ copy, host, address, compact, onError }) {
    const handlers = handlersFor(host, address);
    const open = (handler) => {
      if (host.openResource(address, { kind: handler.kind, preferNewPane: true }) !== true) onError?.(new Error(copy.workspaceUnavailable));
    };
    if (handlers.length === 0) return compact ? null : h9(Muted, null, copy.workspaceUnavailable);
    if (compact) {
      return h9(
        "span",
        { className: "dnls-apps", onClick: (event) => event.stopPropagation(), onKeyDown: (event) => event.stopPropagation() },
        handlers.map((handler) => {
          const title = handlerTitle(handler, address, copy.none);
          return h9(import_dsh_client_ui_primitives6.Button, {
            key: handler.id ?? handler.kind,
            variant: "outline",
            size: "sm",
            icon: handlerIcon(handler),
            title: copy.newPane,
            "aria-label": `${copy.appOpen} ${title}`,
            onClick: () => open(handler)
          }, title);
        })
      );
    }
    return h9(Group, null, handlers.map((handler) => {
      const title = handlerTitle(handler, address, copy.none);
      return h9(SplitRow, {
        key: handler.id ?? handler.kind,
        label: h9("span", { className: "dnls-term" }, handlerIcon(handler), h9("span", null, title))
      }, h9(import_dsh_client_ui_primitives6.Button, {
        variant: "outline",
        size: "sm",
        title: copy.newPane,
        "aria-label": `${copy.appOpen} ${title}`,
        onClick: () => open(handler)
      }, copy.appOpen));
    }));
  }
  function Group({ children }) {
    return h9("div", { className: "dnls-group" }, children);
  }
  function Muted({ children }) {
    return h9("p", { className: "dnls-muted" }, children);
  }
  function ErrorLine({ error }) {
    if (!error) return null;
    const message = typeof error === "string" ? error : error.message;
    const id = typeof error === "object" && typeof error.errorId === "string" ? error.errorId : null;
    return h9("p", { className: "dnls-error", role: "alert" }, id && id !== message ? `${message} (${id})` : message);
  }
  function WindowControl({ copy, value, onChange }) {
    return h9(import_dsh_client_ui_primitives6.SegmentedControl, {
      label: copy.usageWindow,
      value,
      onChange,
      options: [
        { value: "24h", label: copy.window24 },
        { value: "7d", label: copy.window7 },
        { value: "30d", label: copy.window30 }
      ]
    });
  }
  function Chart({ copy, label, series, format }) {
    return h9(
      "div",
      { className: "dnls-chart" },
      h9(
        "div",
        { className: "dnls-chart-head" },
        h9("span", null, label, " \xB7 ", series.mean == null ? copy.noSamples : fill(copy.meanPeak, { mean: format(series.mean), peak: format(series.peak) })),
        h9("span", null, fill(copy.coverage, { valid: series.valid, expected: series.expected }))
      ),
      h9(HistoryLine, { points: series.points })
    );
  }
  function UsageCharts({ copy, usages }) {
    const cpu = combine(usages, "cpu", "core", "cpuCores");
    const memory = combine(usages, "memory", "bytes", "memoryBytes");
    if (cpu.objects === 0 && memory.objects === 0) return h9(Muted, null, copy.noSamples);
    return h9(
      import_react11.default.Fragment,
      null,
      h9(Chart, { copy, label: copy.usageCpu, series: cpu, format: (value) => fill(copy.cores, { n: cores(value) }) }),
      h9(Chart, { copy, label: copy.usageMemory, series: memory, format: (value) => formatBytes(value) ?? copy.none })
    );
  }
  function StateMinutes({ copy, usage }) {
    const states = usage?.states;
    if (!states || typeof states !== "object") return null;
    const parts = Object.entries(states).filter(([, minutes]) => Number.isFinite(minutes) && minutes > 0).map(([state, minutes]) => `${stateText(copy, state)} ${minutes}`);
    return parts.length ? h9(Muted, null, `${copy.stateMinutes}: ${parts.join(" \xB7 ")}`) : null;
  }
  function ReceiptList({ copy, receipts, onRecheck, showName }) {
    return receipts.map((receipt) => {
      const settled = SETTLED.has(receipt.state);
      const line = fill(copy.receiptLine, { action: actionText(copy, receipt.action), state: opText(copy, receipt.state) });
      return h9(SplitRow, {
        key: receipt.operationId,
        label: h9(
          "span",
          { className: "dnls-term" },
          h9(import_dsh_client_ui_primitives6.StateDot, { state: OP_DOT[receipt.state] ?? "idle" }),
          h9(import_dsh_client_ui_primitives6.TextShimmer, { active: !settled }, showName ? `${receipt.name} \xB7 ${line}` : line),
          h9("span", { className: "dnls-muted dnls-mono" }, shortId(receipt.operationId)),
          receipt.error ? h9("span", { className: "dnls-error" }, receipt.error) : null
        )
      }, h9(import_dsh_client_ui_primitives6.Button, {
        variant: "ghost",
        size: "sm",
        disabled: receipt.checking === true,
        onClick: () => onRecheck(receipt)
      }, copy.recheck));
    });
  }

  // src/client/dialogs.jsx
  var import_react12 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives7 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var h10 = import_react12.default.createElement;
  var profileIdOf = (profile) => typeof profile === "string" ? profile : profile?.profileId ?? profile?.id ?? "";
  function CreateDialog({ copy, profiles, busy, error, onCancel, onSubmit }) {
    const [name, setName] = import_react12.default.useState("");
    const ready = (profiles ?? []).filter((profile) => profile?.ready !== false);
    const [profileId, setProfileId] = import_react12.default.useState("");
    const chosen = profileId || profileIdOf(ready[0]);
    const facts = (profiles ?? []).find((profile) => profileIdOf(profile) === chosen);
    return h10(
      NanoDialog,
      {
        copy,
        title: copy.createTitle,
        confirmLabel: busy ? copy.creating : copy.createSubmit,
        confirmDisabled: busy || name.trim() === "" || chosen === "",
        busy,
        onCancel,
        onConfirm: () => onSubmit({ name: name.trim(), profileId: chosen })
      },
      h10(
        "label",
        { className: "dnls-field" },
        copy.createName,
        h10(import_dsh_client_ui_primitives7.Input, { value: name, "aria-label": copy.createName, autoFocus: true, onChange: (event) => setName(event.target.value) })
      ),
      h10(Muted, null, copy.createNameHint),
      h10(
        "div",
        { className: "dnls-field" },
        copy.createProfile,
        profiles == null ? h10(Muted, null, copy.loading) : profiles.length === 0 ? h10(Muted, null, copy.noProfiles) : h10(import_dsh_client_ui_primitives7.SegmentedControl, {
          label: copy.createProfile,
          value: chosen,
          onChange: setProfileId,
          options: profiles.map((profile) => {
            const id = profileIdOf(profile);
            return { value: id, label: profile?.ready === false ? `${id} \xB7 ${copy.profileNotReady}` : id, disabled: profile?.ready === false };
          })
        })
      ),
      facts && (facts.version != null || facts.maxInstances != null) ? h10(Muted, null, fill(copy.profileFacts, { version: facts.version ?? copy.none, max: facts.maxInstances ?? copy.none })) : null,
      h10(ErrorLine, { error })
    );
  }
  function LifecycleConfirm({ copy, request, busy, onCancel, onConfirm }) {
    const [acknowledged, setAcknowledged] = import_react12.default.useState(false);
    const { action, target } = request;
    return h10(import_dsh_client_ui_primitives7.RiskConfirmation, {
      open: true,
      title: copy.confirmTitle[action],
      description: fill(copy.confirmBody[action], { name: target.name }),
      acknowledgeLabel: copy.acknowledge[action],
      acknowledged,
      onAcknowledgedChange: setAcknowledged,
      confirmLabel: copy.action[action],
      cancelLabel: copy.cancel,
      closeLabel: copy.close,
      disabled: busy,
      onCancel,
      onConfirm
    });
  }

  // src/client/fleet.jsx
  var h11 = import_react13.default.createElement;
  var HEALTH_TONE = { healthy: "success", unhealthy: "danger" };
  function addressOf(row) {
    try {
      return sandboxAddress({ envId: row.envId, sandboxId: row.sandboxId });
    } catch {
      return null;
    }
  }
  function SystemPlate({ copy, rows, envs, complete, profiles, usages, usageWindow }) {
    const running = rows.filter((row) => row.observedState === "running").length;
    const stopped = rows.filter((row) => row.observedState === "stopped").length;
    const attention = rows.filter(needsAttention).length;
    const terminals = rows.reduce((sum, row) => sum + (Number.isInteger(row.visibleTerminalCount) ? row.visibleTerminalCount : 0), 0);
    const envText = Array.isArray(envs) && envs.length > 0 ? envs.map((env) => fill(env.complete === false ? copy.envSilent : copy.envAnswered, { env: env.envId })).join(" \xB7 ") : complete ? copy.none : copy.listPartial;
    const quota = Array.isArray(profiles) ? profiles.filter((profile) => Number.isInteger(profile?.maxInstances)).map((profile) => {
      const id = profileIdOf(profile);
      return fill(copy.quotaLine, { profile: id, used: rows.filter((row) => row.profileId === id).length, max: profile.maxInstances });
    }).join(" \xB7 ") : "";
    const cpu = usages ? combine(usages, "cpu", "core", "cpuCores") : null;
    const sampling = cpu && cpu.expected > 0 ? fill(copy.samplingLine, { valid: cpu.valid, expected: cpu.expected, window: copy[`window${usageWindow === "24h" ? "24" : usageWindow === "7d" ? "7" : "30"}`] }) : copy.none;
    return h11(
      Section,
      { title: copy.system },
      h11(FactGrid, { items: [
        { label: copy.envs, value: envText },
        { label: copy.typeLabel, value: fill(copy.sandboxesCount, { running, stopped, attention }) },
        { label: copy.quota, value: quota || copy.none },
        { label: copy.sampling, value: sampling },
        { label: copy.terminalsTotal, value: String(terminals) }
      ] })
    );
  }
  function SandboxCard({ copy, host, row, detail, control, busy, supports, onOpen, onMenu, onStart, onError }) {
    const running = row.observedState === "running";
    const stopped = row.observedState === "stopped";
    const minute = running ? row.lastMinute : null;
    const own = (event) => event.target === event.currentTarget;
    const stop = (event) => event.stopPropagation();
    const idle = detail?.idle;
    return h11(
      "div",
      {
        className: "dnls-card",
        role: "button",
        tabIndex: 0,
        "data-dnls-card": row.sandboxId,
        "aria-label": `${nameOf(row)} \xB7 ${stateText(copy, row.observedState)}`,
        onClick: () => onOpen(row),
        onKeyDown: (event) => {
          if (!own(event) || event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onOpen(row);
        }
      },
      h11(
        "div",
        { className: "dnls-card-head" },
        h11(import_dsh_client_ui_primitives8.StateDot, { state: DOT[row.observedState] ?? "idle" }),
        h11("span", { className: "dnls-card-name" }, nameOf(row)),
        h11("span", { className: "dnls-card-state" }, stateText(copy, row.observedState)),
        HEALTH_TONE[row.health] ? h11(import_dsh_client_ui_primitives8.Tag, { tone: HEALTH_TONE[row.health] }, copy.health[row.health]) : null,
        pendingRevision(row) ? h11(import_dsh_client_ui_primitives8.Tag, { tone: "neutral" }, copy.pendingApply) : null,
        h11(
          "span",
          { className: "dnls-card-tail", onClick: stop, onKeyDown: stop },
          stopped && supports("sandbox.instance.start") ? h11(import_dsh_client_ui_primitives8.Button, { variant: "outline", size: "sm", disabled: busy, onClick: () => onStart(row) }, copy.action.start) : null,
          h11(IconButton, {
            icon: h11(import_dsh_client_ui_primitives8.IconEllipsisOutlineRegular, { size: 16 }),
            "aria-label": `${copy.more} \xB7 ${nameOf(row)}`,
            onClick: (event) => onMenu(event, row)
          })
        )
      ),
      minute ? h11(
        "div",
        { className: "dnls-meters" },
        h11(Meter, {
          label: copy.usageCpu,
          text: `${cores(minute.cpuCores) ?? copy.none} / ${fill(copy.cores, { n: row.resources?.cpus ?? copy.none })}`,
          value: ratio(minute.cpuCores, row.resources?.cpus)
        }),
        h11(Meter, {
          label: copy.usageMemory,
          text: `${formatBytes(minute.memoryBytes) ?? copy.none} / ${formatBytes(row.resources?.memoryBytes) ?? copy.none}`,
          value: ratio(minute.memoryBytes, row.resources?.memoryBytes)
        })
      ) : h11(Muted, null, [
        row.observedState === "missing" ? copy.containerMissing : running ? copy.noSamples : copy.notSampling,
        sizeLine(copy, row)
      ].filter(Boolean).join(" \xB7 ")),
      h11(FactGrid, { items: [
        { label: copy.services, value: serviceHealthText(copy, row.services) },
        { label: copy.terminals, value: String(row.visibleTerminalCount ?? copy.none) },
        { label: copy.activation, value: [idleStatusText(copy, idle), driverText(copy, control, running)].filter(Boolean).join(" \xB7 ") },
        { label: copy.lastOperation, value: lastOperationText(copy, row, detail) }
      ] }),
      h11(AppList, { copy, host, address: addressOf(row), compact: true, onError })
    );
  }
  function FleetView({
    copy,
    api,
    host,
    rows,
    envs,
    complete,
    phase,
    error,
    busy,
    supports,
    receipts,
    refreshKey,
    onRetry,
    onCreate,
    onOpen,
    onMenu,
    onStart,
    onRecheck,
    onError
  }) {
    const [usageWindow, setUsageWindow] = import_react13.default.useState("24h");
    const [details, setDetails] = import_react13.default.useState({});
    const [controls, setControls] = import_react13.default.useState({});
    const [usages, setUsages] = import_react13.default.useState(null);
    const [profiles, setProfiles] = import_react13.default.useState(null);
    const ticket = import_react13.default.useRef(null);
    if (!ticket.current) ticket.current = createTicket();
    import_react13.default.useEffect(() => () => ticket.current.kill(), []);
    const canListProfiles = supports("sandbox.profile.list");
    import_react13.default.useEffect(() => {
      if (!canListProfiles) return;
      let live = true;
      api.listProfiles().then((list2) => {
        if (live) setProfiles(list2);
      }, () => {
        if (live) setProfiles([]);
      });
      return () => {
        live = false;
      };
    }, [refreshKey, canListProfiles]);
    import_react13.default.useEffect(() => {
      if (!rows || rows.length === 0) return;
      const ok = ticket.current.take();
      (async () => {
        const nextDetails = {};
        const nextControls = {};
        const found = [];
        for (const row of rows) {
          if (supports("sandbox.inspect")) {
            try {
              const body2 = await api.inspect(row.sandboxId, { window: usageWindow });
              nextDetails[row.sandboxId] = body2;
              if (body2?.usage) found.push(body2.usage);
            } catch {
              try {
                nextDetails[row.sandboxId] = await api.inspect(row.sandboxId, { window: null });
              } catch {
              }
            }
          }
          if (row.observedState === "running" && supports("dnls.control")) {
            try {
              const body2 = await api.control(row.sandboxId);
              nextControls[row.sandboxId] = { state: body2.control };
            } catch (caught) {
              nextControls[row.sandboxId] = { error: caught };
            }
          }
          if (!ok()) return;
        }
        setDetails(nextDetails);
        setControls(nextControls);
        setUsages(found);
      })();
    }, [rows, usageWindow]);
    const list = rows ?? [];
    const recent = receipts.slice(0, 3);
    let body;
    if (phase === "loading" && !rows) body = h11(EmptyState, { title: copy.loading });
    else if (phase === "failed" && !rows) {
      body = h11(EmptyState, {
        title: copy.failed,
        description: error?.message,
        action: h11(import_dsh_client_ui_primitives8.Button, { variant: "outline", onClick: onRetry }, copy.retry)
      });
    } else if (list.length === 0) {
      body = h11(EmptyState, {
        icon: h11(import_dsh_client_ui_primitives8.PluginArtworkDefault, { size: 40 }),
        title: copy.emptyTitle,
        description: copy.emptyHint,
        action: supports("sandbox.instance.create") ? h11(import_dsh_client_ui_primitives8.Button, { variant: "primary", onClick: onCreate }, copy.create) : void 0
      });
    } else {
      body = h11(
        import_react13.default.Fragment,
        null,
        h11(SystemPlate, { copy, rows: list, envs, complete, profiles, usages, usageWindow }),
        h11(
          "section",
          { className: "dnls-section" },
          h11(
            "div",
            { className: "dnls-cards", "data-dnls-list": "1" },
            list.map((row) => h11(SandboxCard, {
              key: row.sandboxId,
              copy,
              host,
              row,
              busy,
              supports,
              detail: details[row.sandboxId],
              control: controls[row.sandboxId],
              onOpen,
              onMenu,
              onStart,
              onError
            }))
          ),
          !complete ? h11(Muted, null, copy.listPartial) : null
        ),
        supports("sandbox.inspect") ? h11(
          Section,
          {
            title: copy.usage,
            aside: h11(WindowControl, { copy, value: usageWindow, onChange: setUsageWindow })
          },
          h11(Muted, null, copy.usageFleet),
          usages == null ? h11(Muted, null, copy.loading) : h11(UsageCharts, { copy, usages })
        ) : null
      );
    }
    return h11(
      "div",
      { className: "dnls-view", "data-dnls-view": "fleet" },
      h11(
        "div",
        { className: "dnls-scroll" },
        h11(
          "div",
          { className: "dnls-page-head" },
          h11("h2", { className: "dnls-page-title" }, copy.typeLabel),
          supports("sandbox.instance.create") ? h11(import_dsh_client_ui_primitives8.Button, {
            variant: "primary",
            size: "sm",
            disabled: busy,
            icon: h11(import_dsh_client_ui_primitives8.IconPlusOutlineRegular, { size: 14 }),
            onClick: onCreate
          }, copy.create) : null
        ),
        rows ? h11(ErrorLine, { error }) : null,
        recent.length > 0 ? h11(Section, { title: copy.receipts }, h11(Group, null, h11(ReceiptList, { copy, receipts: recent, onRecheck, showName: true }))) : null,
        body
      )
    );
  }

  // src/client/sandbox.jsx
  var import_react14 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives9 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var h12 = import_react14.default.createElement;
  var PLANES = ["container", "engine", "bridge", "page", "dom", "terminal"];
  var HEALTH_TONE2 = { healthy: "success", unhealthy: "danger" };
  var PROC_DOT = { R: "done", Z: "error", T: "warning" };
  var DANGER = "nano-modal-action nano-modal-danger";
  var ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
  function useTickets() {
    const ref = import_react14.default.useRef(null);
    if (!ref.current) ref.current = {};
    import_react14.default.useEffect(() => () => {
      for (const ticket of Object.values(ref.current)) ticket.kill();
    }, []);
    return (key) => {
      if (!ref.current[key]) ref.current[key] = createTicket();
      return ref.current[key].take();
    };
  }
  function idleText(copy, configuration) {
    const ms = configuration?.idleTimeoutMs;
    if (!Number.isFinite(ms) || ms <= 0) return copy.idleOff;
    return fill(copy.idleAfter, { n: Math.round(ms / 6e4) });
  }
  function MonitorTab({ copy, target, detail, running, usageWindow, setUsageWindow, procs, host, address, onError }) {
    const minute = running ? detail?.lastMinute ?? target.lastMinute : null;
    const cpus = target.resources?.cpus;
    const memory = target.resources?.memoryBytes;
    const usage = detail?.usage;
    const sortedProcs = procs?.list ? [...procs.list].sort((a, b) => (b.rssBytes ?? 0) - (a.rssBytes ?? 0)) : [];
    return h12(
      import_react14.default.Fragment,
      null,
      h12(
        Section,
        { title: copy.apps, aside: h12("span", { className: "dnls-muted" }, copy.newPane) },
        h12(AppList, { copy, host, address, onError })
      ),
      h12(
        Section,
        { title: copy.allocated, aside: h12("span", { className: "dnls-muted" }, running ? copy.lastMinute : copy.notSampling) },
        h12(Meter, {
          label: copy.usageCpu,
          text: `${cores(minute?.cpuCores) ?? copy.none} / ${fill(copy.cores, { n: cpus ?? copy.none })}`,
          value: ratio(minute?.cpuCores, cpus)
        }),
        h12(Meter, {
          label: copy.usageMemory,
          text: `${formatBytes(minute?.memoryBytes) ?? copy.none} / ${formatBytes(memory) ?? copy.none}`,
          value: ratio(minute?.memoryBytes, memory)
        })
      ),
      h12(
        Section,
        { title: copy.usage, aside: h12(WindowControl, { copy, value: usageWindow, onChange: setUsageWindow }) },
        detail == null ? h12(Muted, null, copy.loading) : usage ? h12(import_react14.default.Fragment, null, h12(UsageCharts, { copy, usages: [usage] }), h12(StateMinutes, { copy, usage })) : h12(Muted, null, copy.usageDenied)
      ),
      h12(
        Section,
        { title: copy.processes, aside: procs?.list ? h12("span", { className: "dnls-muted" }, String(procs.list.length)) : null },
        !running ? h12(Muted, null, copy.notSampling) : procs == null ? h12(Muted, null, copy.loading) : procs.error ? h12(ErrorLine, { error: procs.error }) : sortedProcs.length === 0 ? h12(Muted, null, copy.processesEmpty) : h12(
          import_react14.default.Fragment,
          null,
          h12("div", { className: "dnls-procs" }, sortedProcs.map((proc) => h12(import_dsh_client_ui_primitives9.DisclosureRow, {
            key: proc.pid,
            icon: h12(import_dsh_client_ui_primitives9.StateDot, { state: PROC_DOT[proc.state] ?? "idle" }),
            title: proc.name ?? String(proc.pid),
            expandable: false,
            headerAccessory: h12("span", { className: "dnls-proc-meta" }, `${proc.pid} \xB7 ${formatBytes(proc.rssBytes) ?? copy.none}`)
          }))),
          procs.truncated ? h12(Muted, null, fill(copy.processesTruncated, { n: sortedProcs.length })) : null
        )
      ),
      h12(
        Section,
        { title: copy.deployment },
        detail == null ? h12(Muted, null, copy.loading) : h12(
          Group,
          null,
          h12(
            SplitRow,
            { label: copy.imageDigest },
            typeof detail.applied?.imageDigest === "string" ? h12("span", { className: "dnls-mono", title: detail.applied.imageDigest }, detail.applied.imageDigest.slice(0, 19)) : copy.none
          ),
          h12(SplitRow, { label: copy.verifiedAt }, when(copy, detail.applied?.verifiedAt) ?? copy.none),
          h12(SplitRow, { label: copy.observed }, when(copy, detail.observedAt) ?? copy.none)
        )
      ),
      Array.isArray(detail?.mounts) && detail.mounts.length > 0 ? h12(Section, { title: copy.storage }, h12(
        Group,
        null,
        detail.mounts.map((mount2, index) => h12(SplitRow, {
          key: `${mount2.target}:${index}`,
          label: h12("span", { className: "dnls-mono" }, mount2.target ?? copy.none)
        }, `${mount2.type ?? ""} \xB7 ${mount2.readOnly ? copy.readOnly : copy.readWrite}`))
      )) : null
    );
  }
  function planeDot(plane) {
    if (plane?.skipped) return "idle";
    if (plane?.ok === true) return "done";
    if (plane?.ok === false) return "error";
    return "idle";
  }
  function ServicesTab({ copy, detail, running, probe, control, canProbe, canControl, busy, onProbe, onControl }) {
    const services = Array.isArray(detail?.services) ? detail.services : [];
    const status = probe?.result;
    const degraded = Array.isArray(status?.degraded) ? status.degraded : [];
    return h12(
      import_react14.default.Fragment,
      null,
      h12(
        Section,
        { title: copy.services },
        detail == null ? h12(Muted, null, copy.loading) : services.length === 0 ? h12(Muted, null, copy.servicesEmpty) : h12(Group, null, services.map((service) => {
          const address = serviceAddress(service);
          const role = service.role && service.role !== service.serviceId ? `${service.role} \xB7 ` : "";
          return h12(SplitRow, {
            key: service.serviceId,
            label: h12(
              "span",
              { className: "dnls-row-copy" },
              h12("span", { className: "dnls-mono" }, service.serviceId),
              h12("span", { className: "dnls-row-meta" }, `${role}${service.containerPort ?? copy.none}/${service.protocol ?? "tcp"}`)
            )
          }, h12(
            "span",
            { className: "dnls-inline" },
            address ? h12("span", { className: "dnls-mono" }, address) : h12("span", { className: "dnls-muted" }, copy.unpublished),
            // Only a recorded verdict earns a tag; live state is the probe below.
            HEALTH_TONE2[service.health] ? h12(import_dsh_client_ui_primitives9.Tag, { tone: HEALTH_TONE2[service.health] }, copy.health[service.health]) : null
          ));
        }))
      ),
      canProbe ? h12(
        Section,
        {
          title: copy.probeTitle,
          aside: h12(
            import_dsh_client_ui_primitives9.Button,
            { variant: "outline", size: "sm", disabled: !running || probe?.busy, onClick: onProbe },
            probe?.busy ? copy.probing : copy.probe
          )
        },
        !running ? h12(Muted, null, copy.probeStopped) : probe?.error ? h12(ErrorLine, { error: probe.error }) : status ? h12(
          import_react14.default.Fragment,
          null,
          h12(
            "div",
            { className: "dnls-inline" },
            h12(
              import_dsh_client_ui_primitives9.Tag,
              { tone: status.healthy ? "success" : "danger" },
              status.healthy ? copy.probeHealthy : fill(copy.probeDegraded, { planes: degraded.map((p) => copy.plane[p] ?? p).join(", ") })
            ),
            h12("span", { className: "dnls-muted" }, fill(copy.probeAt, { at: when(copy, status.observedAt) ?? copy.none }))
          ),
          h12(Group, null, PLANES.filter((key) => status.planes?.[key]).map((key) => {
            const plane = status.planes[key];
            return h12(SplitRow, {
              key,
              label: h12("span", { className: "dnls-term" }, h12(import_dsh_client_ui_primitives9.StateDot, { state: planeDot(plane) }), copy.plane[key] ?? key)
            }, h12("span", { className: "dnls-muted" }, plane.skipped ? copy.planeSkipped : copy.planeState[plane.state] ?? plane.state ?? copy.none));
          }))
        ) : null
      ) : null,
      canControl ? h12(
        Section,
        { title: copy.manualControl },
        control?.error ? h12(ErrorLine, { error: control.error }) : control?.state == null ? h12(Muted, null, running ? copy.loading : copy.probeStopped) : h12(Group, null, h12(SplitRow, {
          label: h12(
            "span",
            { className: "dnls-term" },
            h12(import_dsh_client_ui_primitives9.StateDot, { state: control.state.humanHold?.active ? "warning" : "done" }),
            control.state.humanHold?.active ? copy.manualHeld : copy.manualFree
          )
        }, h12(import_dsh_client_ui_primitives9.Button, {
          variant: "outline",
          size: "sm",
          disabled: busy || control.busy,
          onClick: () => onControl(control.state.humanHold?.active ? "release" : "takeover")
        }, control.state.humanHold?.active ? copy.release : copy.takeover)))
      ) : null
    );
  }
  function LogsTab({ copy, running, logs, onTail, onReload }) {
    return h12(
      Section,
      {
        title: copy.logs,
        aside: h12(
          import_react14.default.Fragment,
          null,
          h12(import_dsh_client_ui_primitives9.SegmentedControl, {
            label: copy.logsLines,
            value: String(logs.tail),
            onChange: (value) => onTail(Number(value)),
            options: [{ value: "50", label: "50" }, { value: "100", label: "100" }, { value: "200", label: "200" }]
          }),
          h12(IconButton, { icon: h12(import_dsh_client_ui_primitives9.IconRefreshOutlineRegular, { size: 16 }), "aria-label": copy.refresh, disabled: !running || logs.busy, onClick: onReload })
        )
      },
      !running ? h12(Muted, null, copy.logsStopped) : logs.error ? h12(ErrorLine, { error: logs.error }) : logs.text == null ? h12(Muted, null, copy.loading) : logs.text.trim() === "" ? h12(Muted, null, copy.logsEmpty) : h12(
        "div",
        { className: "dnls-log" },
        h12(import_dsh_client_ui_primitives9.CodeBlock, {
          code: logs.text.replace(ANSI, "").replace(/\n$/, ""),
          lang: "text",
          wrap: true,
          copyLabel: copy.copy,
          copiedLabel: copy.copied,
          toolbarLabels: { codeLabel: fill(copy.logsTail, { n: logs.tail }), wrapLabel: copy.wrapOn, unwrapLabel: copy.wrapOff }
        })
      )
    );
  }
  function ActivityTab({ copy, detail, receipts, lookup, setLookup, onLookup, onRecheck }) {
    const operations = Array.isArray(detail?.operations) ? [...detail.operations].reverse() : [];
    return h12(
      import_react14.default.Fragment,
      null,
      receipts.length > 0 ? h12(
        Section,
        { title: copy.receipts },
        h12(Group, null, h12(ReceiptList, { copy, receipts, onRecheck })),
        h12(Muted, null, copy.receiptHint)
      ) : null,
      h12(
        Section,
        { title: copy.lookup },
        h12(
          "div",
          { className: "dnls-inline" },
          h12(
            "span",
            { className: "dnls-grow" },
            h12(import_dsh_client_ui_primitives9.Input, {
              value: lookup.text,
              placeholder: copy.lookupPlaceholder,
              "aria-label": copy.lookupPlaceholder,
              onChange: (event) => setLookup({ ...lookup, text: event.target.value })
            })
          ),
          h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: lookup.busy || lookup.text.trim() === "", onClick: onLookup }, copy.lookupGo)
        ),
        lookup.error ? h12(ErrorLine, { error: lookup.error }) : null,
        lookup.result ? h12(Group, null, h12(SplitRow, {
          label: h12(
            "span",
            { className: "dnls-term" },
            h12(import_dsh_client_ui_primitives9.StateDot, { state: OP_DOT[lookup.result.state] ?? "idle" }),
            fill(copy.receiptLine, { action: actionText(copy, lookup.result.action), state: opText(copy, lookup.result.state) })
          )
        }, h12("span", { className: "dnls-muted" }, [stepText(copy, lookup.result.step), when(copy, lookup.result.finishedAt ?? lookup.result.at)].filter(Boolean).join(" \xB7 ")))) : null
      ),
      h12(
        Section,
        { title: copy.history },
        detail == null ? h12(Muted, null, copy.loading) : operations.length === 0 ? h12(Muted, null, copy.historyEmpty) : h12(Group, null, operations.map((op, index) => h12(SplitRow, {
          key: `${op.action}:${op.at ?? index}`,
          label: h12(
            "span",
            { className: "dnls-term" },
            h12(import_dsh_client_ui_primitives9.StateDot, { state: OP_DOT[op.state] ?? "idle" }),
            fill(copy.receiptLine, { action: actionText(copy, op.action), state: opText(copy, op.state) })
          )
        }, h12("span", { className: "dnls-muted" }, when(copy, op.finishedAt ?? op.at) ?? copy.none))))
      )
    );
  }
  function SettingsTab({ copy, target, detail, running, busy, supports, draft, setDraft, onAction, onSaveIdle, onSaveResources }) {
    const configuration = detail?.configuration;
    const field = (key, label) => h12(import_dsh_client_ui_primitives9.Input, {
      value: draft[key],
      "aria-label": label,
      inputMode: "numeric",
      onChange: (event) => setDraft({ ...draft, [key]: event.target.value, message: null })
    });
    const num = (key, label) => h12("span", { className: "dnls-num" }, field(key, label));
    const labelled = (label, value) => h12(
      "span",
      { className: "dnls-label" },
      h12("span", null, label),
      h12("span", { className: "dnls-muted" }, fill(copy.current, { value }))
    );
    if (detail == null) return h12(Muted, null, copy.loading);
    return h12(
      import_react14.default.Fragment,
      null,
      h12(Section, { title: copy.power }, h12(
        Group,
        null,
        running ? h12(SplitRow, { label: copy.powerState }, h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: busy || !supports("sandbox.instance.stop"), onClick: () => onAction("stop") }, copy.action.stop)) : h12(SplitRow, { label: copy.powerState }, h12(import_dsh_client_ui_primitives9.Button, { variant: "primary", size: "sm", disabled: busy || !supports("sandbox.instance.start"), onClick: () => onAction("start") }, copy.action.start)),
        running ? h12(
          SplitRow,
          { label: copy.restartRow },
          h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: busy || !supports("sandbox.instance.restart"), onClick: () => onAction("restart") }, copy.action.restart)
        ) : null,
        configuration && supports("sandbox.idle.configure") ? h12(
          SplitRow,
          { label: labelled(copy.idleMinutes, idleText(copy, configuration)) },
          h12(
            "span",
            { className: "dnls-inline" },
            num("idle", copy.idleMinutes),
            h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: busy, onClick: onSaveIdle }, copy.save)
          )
        ) : null
      )),
      configuration && supports("sandbox.revision.save") ? h12(
        Section,
        { title: copy.resources },
        h12(Muted, null, copy.resourcesHint),
        h12(
          Group,
          null,
          h12(SplitRow, { label: labelled(copy.cpus, target.resources?.cpus ?? copy.none) }, num("cpus", copy.cpus)),
          h12(SplitRow, { label: labelled(copy.memoryMiB, formatBytes(target.resources?.memoryBytes) ?? copy.none) }, num("memory", copy.memoryMiB))
        ),
        h12(
          "div",
          { className: "dnls-inline" },
          h12(import_dsh_client_ui_primitives9.Button, { variant: "primary", size: "sm", disabled: busy, onClick: onSaveResources }, copy.save),
          pendingRevision(detail) && supports("sandbox.instance.recreate") ? h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: busy, onClick: () => onAction("recreate") }, copy.applyNow) : null
        )
      ) : null,
      !configuration ? h12(Muted, null, copy.configDenied) : null,
      draft.message ? h12(draft.error ? ErrorLine : Muted, draft.error ? { error: draft.message } : null, draft.error ? void 0 : draft.message) : null,
      h12(Section, { title: copy.danger }, h12(
        Group,
        null,
        h12(
          SplitRow,
          { label: copy.recreateRow },
          h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", className: DANGER, disabled: busy || !supports("sandbox.instance.recreate"), onClick: () => onAction("recreate") }, `${copy.action.recreate}\u2026`)
        ),
        h12(
          SplitRow,
          { label: copy.removeRow },
          h12(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", className: DANGER, disabled: busy || !supports("sandbox.instance.remove"), onClick: () => onAction("remove") }, `${copy.action.remove}\u2026`)
        )
      ))
    );
  }
  function SandboxView({
    copy,
    api,
    row,
    host,
    busy,
    supports,
    receipts,
    refreshKey,
    outerError,
    onAction,
    onRecheck,
    onWrite
  }) {
    const sandboxId = row.sandboxId;
    const take = useTickets();
    const [tick, setTick] = import_react14.default.useState(0);
    const [tab, setTab] = import_react14.default.useState("monitor");
    const [usageWindow, setUsageWindow] = import_react14.default.useState("24h");
    const [detail, setDetail] = import_react14.default.useState(null);
    const [error, setError] = import_react14.default.useState(null);
    const [procs, setProcs] = import_react14.default.useState(null);
    const [probe, setProbe] = import_react14.default.useState(null);
    const [control, setControl] = import_react14.default.useState(null);
    const [logs, setLogs] = import_react14.default.useState({ tail: 100, text: null });
    const [lookup, setLookup] = import_react14.default.useState({ text: "" });
    const [draft, setDraft] = import_react14.default.useState({ cpus: "", memory: "", idle: "" });
    const target = detail ? { ...row, ...detail } : row;
    const observed = target.observedState;
    const running = observed === "running";
    const reload = () => setTick((value) => value + 1);
    import_react14.default.useEffect(() => {
      const ok = take("detail");
      (async () => {
        try {
          let body;
          try {
            body = await api.inspect(sandboxId, { window: usageWindow });
          } catch (caught) {
            if (caught?.status !== 403) throw caught;
            body = await api.inspect(sandboxId, { window: null });
          }
          if (!ok()) return;
          setDetail(body);
          setError(null);
        } catch (caught) {
          if (ok()) setError(caught);
        }
      })();
    }, [sandboxId, usageWindow, refreshKey, tick]);
    import_react14.default.useEffect(() => {
      const cfg = detail?.configuration;
      setDraft((prev) => prev.touched ? prev : {
        cpus: cfg?.overrides?.cpus == null ? "" : String(cfg.overrides.cpus),
        memory: cfg?.overrides?.memoryBytes == null ? "" : String(Math.round(cfg.overrides.memoryBytes / (1024 * 1024))),
        idle: cfg?.idleTimeoutMs == null ? "" : String(Math.round(cfg.idleTimeoutMs / 6e4))
      });
    }, [detail?.configuration]);
    import_react14.default.useEffect(() => {
      if (tab !== "monitor" || !running || !supports("sandbox.processes")) return;
      const ok = take("procs");
      (async () => {
        try {
          const body = await api.processes(sandboxId, { limit: 200 });
          if (ok()) setProcs({ list: body.processes ?? [], truncated: body.truncated === true });
        } catch (caught) {
          if (ok()) setProcs({ error: caught });
        }
      })();
    }, [sandboxId, tab, running, refreshKey, tick]);
    import_react14.default.useEffect(() => {
      if (!running || !supports("dnls.control")) {
        setControl(null);
        return;
      }
      const ok = take("control");
      (async () => {
        try {
          const body = await api.control(sandboxId);
          if (ok()) setControl({ state: body.control });
        } catch (caught) {
          if (ok()) setControl({ error: caught });
        }
      })();
    }, [sandboxId, running, refreshKey, tick]);
    import_react14.default.useEffect(() => {
      if (tab !== "logs" || !running || !supports("dnls.logs")) return;
      const ok = take("logs");
      setLogs((prev) => ({ ...prev, busy: true }));
      (async () => {
        try {
          const body = await api.logs(sandboxId, { tail: logs.tail });
          if (ok()) setLogs((prev) => ({ ...prev, busy: false, error: null, text: typeof body.text === "string" ? body.text : "" }));
        } catch (caught) {
          if (ok()) setLogs((prev) => ({ ...prev, busy: false, error: caught }));
        }
      })();
    }, [tab, sandboxId, running, logs.tail, tick]);
    import_react14.default.useEffect(() => {
      setProbe(null);
      setControl(null);
      setProcs(null);
    }, [sandboxId]);
    async function runProbe() {
      setProbe((prev) => ({ ...prev, busy: true, error: null }));
      try {
        const result = await api.status(sandboxId);
        setProbe({ result });
      } catch (caught) {
        setProbe({ error: caught });
      }
    }
    async function runControl(action) {
      setControl((prev) => ({ ...prev, busy: true }));
      try {
        const body = await api.control(sandboxId, action);
        const read = body?.control ? body : await api.control(sandboxId);
        setControl({ state: read.control });
      } catch (caught) {
        setControl((prev) => ({ ...prev, busy: false, error: caught }));
      }
    }
    async function runLookup() {
      const operationId = lookup.text.trim();
      setLookup({ text: lookup.text, busy: true });
      try {
        const result = await api.readOperation(sandboxId, operationId);
        setLookup({ text: lookup.text, result });
      } catch (caught) {
        setLookup({ text: lookup.text, error: caught?.status === 404 ? copy.lookupMissing : caught });
      }
    }
    async function saveIdle() {
      const minutes = whole(draft.idle);
      if (minutes === void 0 || minutes === null) {
        setDraft({ ...draft, message: copy.wholeNumber, error: true });
        return;
      }
      await onWrite(async () => {
        await api.configureIdle(sandboxId, minutes * 6e4);
        setDraft({ ...draft, touched: false, message: copy.saved, error: false });
        reload();
      }, (caught) => setDraft({ ...draft, message: caught.message, error: true }));
    }
    async function saveResources() {
      const cpus = whole(draft.cpus);
      const memory = whole(draft.memory);
      if (cpus === void 0 || memory === void 0) {
        setDraft({ ...draft, message: copy.wholeNumber, error: true });
        return;
      }
      const overrides = {};
      if (cpus !== null) overrides.cpus = cpus;
      if (memory !== null) overrides.memoryBytes = memory * 1024 * 1024;
      if (Object.keys(overrides).length === 0) {
        setDraft({ ...draft, message: copy.nothingToSave, error: false });
        return;
      }
      await onWrite(async () => {
        const out = await api.saveRevision(sandboxId, { expectedRevision: detail?.desiredRevision ?? 0, overrides });
        const revision = out?.desiredRevision ?? out?.revision ?? (detail?.desiredRevision ?? 0) + 1;
        setDraft({ ...draft, touched: false, message: fill(copy.savedRevision, { revision }), error: false });
        reload();
      }, (caught) => setDraft({ ...draft, message: caught.message, error: true }));
    }
    const lifecycleTarget = { sandboxId, name: nameOf(target), envId: target.envId, desiredRevision: detail?.desiredRevision ?? row.desiredRevision, observedState: observed };
    const act = (action) => onAction(action, lifecycleTarget);
    let objectAddress = null;
    try {
      objectAddress = sandboxAddress({ envId: target.envId, sandboxId });
    } catch {
      objectAddress = null;
    }
    const mine = receipts.filter((receipt) => receipt.sandboxId === sandboxId);
    const drivers = Array.isArray(target.drivers) && target.drivers.length > 0 ? target.drivers.join(" \xB7 ") : copy.none;
    const tabs = [
      { value: "monitor", label: copy.tabMonitor, content: tab === "monitor" ? h12(MonitorTab, { copy, target, detail, running, usageWindow, setUsageWindow, procs, host, address: objectAddress, onError: setError }) : null },
      { value: "services", label: copy.tabServices, content: tab === "services" ? h12(ServicesTab, {
        copy,
        detail,
        running,
        probe,
        control,
        busy,
        canProbe: supports("dnls.status"),
        canControl: supports("dnls.control"),
        onProbe: runProbe,
        onControl: runControl
      }) : null },
      supports("dnls.logs") ? { value: "logs", label: copy.tabLogs, content: tab === "logs" ? h12(LogsTab, {
        copy,
        running,
        logs,
        onTail: (tail) => setLogs((prev) => ({ ...prev, tail, text: null })),
        onReload: reload
      }) : null } : null,
      { value: "activity", label: copy.tabActivity, content: tab === "activity" ? h12(ActivityTab, {
        copy,
        detail,
        receipts: mine,
        lookup,
        setLookup,
        onLookup: runLookup,
        onRecheck
      }) : null },
      { value: "settings", label: copy.tabSettings, content: tab === "settings" ? h12(SettingsTab, {
        copy,
        target,
        detail,
        running,
        busy,
        supports,
        draft,
        setDraft: (next) => setDraft({ ...next, touched: true }),
        onAction: act,
        onSaveIdle: saveIdle,
        onSaveResources: saveResources
      }) : null }
    ].filter(Boolean);
    const idle = detail?.idle;
    const revisionText = pendingRevision(target) ? fill(copy.revisionPending, { applied: target.appliedRevision ?? 0, desired: target.desiredRevision }) : String(target.appliedRevision ?? copy.none);
    return h12(
      "div",
      { className: "dnls-view", "data-dnls-view": "sandbox" },
      h12(
        "div",
        { className: "dnls-object-head" },
        h12(ErrorLine, { error: error ?? outerError }),
        h12(
          "div",
          { className: "dnls-head-card", "data-dnls-status": observed ?? "unknown" },
          h12(
            "div",
            { className: "dnls-head-name" },
            h12(import_dsh_client_ui_primitives9.StateDot, { state: DOT[observed] ?? "idle" }),
            h12("span", { className: "dnls-head-title" }, nameOf(target)),
            HEALTH_TONE2[target.health] ? h12(import_dsh_client_ui_primitives9.Tag, { tone: HEALTH_TONE2[target.health] }, copy.health[target.health]) : null,
            pendingRevision(target) ? h12(import_dsh_client_ui_primitives9.Tag, { tone: "neutral" }, copy.pendingApply) : null
          ),
          h12(
            "div",
            { className: "dnls-head-meta" },
            [stateText(copy, observed), sizeLine(copy, target), target.profileId].filter(Boolean).join(" \xB7 ")
          ),
          running && target.lastMinute ? h12(
            "div",
            { className: "dnls-meters" },
            h12(Meter, {
              label: copy.usageCpu,
              text: `${cores(target.lastMinute.cpuCores) ?? copy.none} / ${fill(copy.cores, { n: target.resources?.cpus ?? copy.none })}`,
              value: ratio(target.lastMinute.cpuCores, target.resources?.cpus)
            }),
            h12(Meter, {
              label: copy.usageMemory,
              text: `${formatBytes(target.lastMinute.memoryBytes) ?? copy.none} / ${formatBytes(target.resources?.memoryBytes) ?? copy.none}`,
              value: ratio(target.lastMinute.memoryBytes, target.resources?.memoryBytes)
            })
          ) : null,
          h12(FactGrid, { items: [
            { label: copy.driver, value: driverText(copy, control, running) },
            { label: copy.idleSleep, value: detail ? idleStatusText(copy, idle) : copy.none },
            { label: copy.lastActivity, value: lastActivityText(copy, idle) },
            { label: copy.lastOperation, value: lastOperationText(copy, target, detail) },
            { label: copy.services, value: serviceHealthText(copy, target.services) },
            // The list row is re-read after every dock create/close; the inspect detail is not.
            { label: copy.terminals, value: String(row.visibleTerminalCount ?? target.visibleTerminalCount ?? copy.none) }
          ] }),
          h12("div", { className: "dnls-head-foot" }, [
            `${copy.revision} ${revisionText}`,
            `${copy.drivers} ${drivers}`,
            `${copy.observed} ${when(copy, target.observedAt) ?? copy.none}`
          ].join(" \xB7 "))
        )
      ),
      h12(NanoTabs, { className: "dnls-detail", label: copy.tabs, value: tab, onChange: setTab, items: tabs })
    );
  }

  // src/client/dock.jsx
  var import_react15 = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives10 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var h13 = import_react15.default.createElement;
  var PROBE_TERMINAL = "00000000-0000-4000-8000-000000000000";
  function LocalTerminal({ copy, host, onError }) {
    return h13(Group, null, h13(SplitRow, {
      label: h13(
        "span",
        { className: "dnls-term" },
        h13(import_dsh_client_ui_primitives10.PluginArtworkTerminal, { size: 16 }),
        h13(
          "span",
          { className: "dnls-label" },
          h13("span", null, copy.localTerminal),
          h13("span", { className: "dnls-muted", "data-dnls-local-note": "1" }, copy.localTerminalNote)
        )
      )
    }, h13(import_dsh_client_ui_primitives10.Button, {
      variant: "outline",
      size: "sm",
      title: copy.newPane,
      onClick: () => {
        if (host.openLocalTerminal() !== true) onError(new Error(copy.localTerminalFailed));
      }
    }, copy.localTerminalOpen)));
  }
  function TerminalDock({ copy, api, host, paneId, row, supports, busy, refreshKey, onWrite, onChanged }) {
    const [terms, setTerms] = import_react15.default.useState(null);
    const [error, setError] = import_react15.default.useState(null);
    const [closing, setClosing] = import_react15.default.useState(null);
    const [closeError, setCloseError] = import_react15.default.useState(void 0);
    const ticket = import_react15.default.useRef(null);
    if (!ticket.current) ticket.current = createTicket();
    import_react15.default.useEffect(() => () => ticket.current.kill(), []);
    const sandboxId = row?.sandboxId ?? null;
    const running = row?.observedState === "running";
    let probe = null;
    if (row) {
      try {
        probe = terminalAddress({ envId: row.envId, sandboxId, terminalId: PROBE_TERMINAL });
      } catch {
        probe = null;
      }
    }
    const sandboxHandlers = handlersFor(host, probe).length > 0;
    const load = import_react15.default.useCallback(async () => {
      const ok = ticket.current.take();
      if (!sandboxId) {
        setTerms(null);
        return;
      }
      if (!supports("term.session.list")) {
        setTerms({ denied: true });
        return;
      }
      if (!running) {
        setTerms({ list: [] });
        return;
      }
      try {
        const out = await api.terminalList(sandboxId);
        if (ok()) setTerms({ list: out.terminals });
      } catch (caught) {
        if (ok()) setTerms(caught?.status === 403 ? { denied: true } : { error: caught });
      }
    }, [sandboxId, running]);
    import_react15.default.useEffect(() => {
      load();
    }, [sandboxId, running, refreshKey]);
    function openTerm(term) {
      let address = typeof term?.address === "string" ? term.address : null;
      if (!address) {
        try {
          address = terminalAddress({ envId: row.envId, sandboxId, terminalId: term.terminalId });
        } catch {
          address = null;
        }
      }
      if (!address || host.openResource(address, { preferNewPane: true }) !== true) setError(new Error(copy.terminalUnavailable));
    }
    async function createTerm() {
      await onWrite(async () => {
        const out = await api.terminalCreate(sandboxId, { paneId, openId: crypto.randomUUID() });
        const listed = await api.terminalList(sandboxId);
        setTerms({ list: listed.terminals });
        setError(null);
        if (sandboxHandlers) openTerm(listed.terminals.find((item) => item.terminalId === out.terminalId) ?? out);
      }, setError);
      onChanged?.();
    }
    async function closeTerm() {
      const term = closing;
      await onWrite(async () => {
        await api.terminalClose(sandboxId, term.terminalId);
        setClosing(null);
        await load();
      }, (caught) => {
        setCloseError(caught?.status === 503 ? copy.terminalCloseUnavailable : caught?.message ?? String(caught));
        load();
      });
      onChanged?.();
    }
    if (!row) {
      return h13(
        import_react15.default.Fragment,
        null,
        h13(Muted, null, copy.dockPick),
        h13(LocalTerminal, { copy, host, onError: setError }),
        h13(ErrorLine, { error })
      );
    }
    const list = terms?.list ?? [];
    const canCreate = supports("term.session.create") && !terms?.denied && sandboxHandlers;
    const canClose = supports("term.session.close");
    let body;
    if (terms?.denied) body = h13(Muted, null, copy.terminalsDenied);
    else if (terms == null) body = h13(Muted, null, copy.loading);
    else if (terms.error) body = h13(ErrorLine, { error: terms.error });
    else if (list.length === 0) body = h13(Muted, null, running ? copy.terminalsEmpty : copy.terminalsStopped);
    else {
      body = h13(Group, null, list.map((term) => h13(SplitRow, {
        key: term.terminalId,
        label: h13(
          "span",
          { className: "dnls-term" },
          h13(import_dsh_client_ui_primitives10.StateDot, { state: term.state === "active" ? "done" : "idle" }),
          h13("span", { className: "dnls-mono" }, fill(copy.terminalLabel, { id: shortId(term.terminalId) })),
          term.state ? h13(import_dsh_client_ui_primitives10.Tag, { tone: "neutral" }, copy.termState[term.state] ?? term.state) : null
        )
      }, h13(
        "span",
        { className: "dnls-inline" },
        term.state === "active" && sandboxHandlers ? h13(import_dsh_client_ui_primitives10.Button, { variant: "ghost", size: "sm", title: copy.newPane, onClick: () => openTerm(term) }, copy.terminalOpen) : null,
        canClose && term.state !== "ended" ? h13(IconButton, {
          icon: h13(import_dsh_client_ui_primitives10.IconTrashOutlineRegular, { size: 16 }),
          "aria-label": `${copy.terminalClose} ${shortId(term.terminalId)}`,
          disabled: busy,
          onClick: () => {
            setCloseError(void 0);
            setClosing(term);
          }
        }) : null
      ))));
    }
    return h13(
      import_react15.default.Fragment,
      null,
      h13(
        "div",
        { className: "dnls-dock-head" },
        h13("span", { className: "dnls-section-title" }, `${copy.terminals} \xB7 ${nameOf(row)}`),
        canCreate ? h13(import_dsh_client_ui_primitives10.Button, {
          variant: "primary",
          size: "sm",
          disabled: busy || !running,
          icon: h13(import_dsh_client_ui_primitives10.IconPlusOutlineRegular, { size: 14 }),
          onClick: createTerm
        }, copy.terminalNew) : null
      ),
      h13(ErrorLine, { error }),
      body,
      sandboxHandlers ? terms?.denied ? null : h13(Muted, null, copy.terminalsHint) : h13(import_react15.default.Fragment, null, h13(Muted, null, copy.terminalUnavailable), h13(LocalTerminal, { copy, host, onError: setError })),
      closing ? h13(NanoDialog, {
        copy,
        title: copy.terminalCloseTitle,
        confirmLabel: copy.terminalClose,
        danger: true,
        busy,
        error: closeError,
        onCancel: () => setClosing(null),
        onConfirm: closeTerm
      }, h13("p", { className: "dnls-muted" }, fill(copy.terminalCloseBody, { id: shortId(closing.terminalId) }))) : null
    );
  }

  // src/client/index.jsx
  var h14 = import_react16.default.createElement;
  var KIND = "dnls-sandbox";
  var CONFIRMED = /* @__PURE__ */ new Set(["stop", "restart", "recreate", "remove"]);
  var POLL_MS = 1500;
  var POLL_TRIES = 40;
  var DOCK_DEFAULT = 220;
  var pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function reading(copy, row) {
    if (row?.observedState === "running" && row.lastMinute) {
      const cpu = cores(row.lastMinute.cpuCores) ?? copy.none;
      const mem = formatBytes(row.lastMinute.memoryBytes) ?? copy.none;
      return `CPU ${cpu}/${row.resources?.cpus ?? copy.none} \xB7 ${mem}/${formatBytes(row.resources?.memoryBytes) ?? copy.none}`;
    }
    if (row?.observedState === "missing") return copy.containerMissing;
    return null;
  }
  function DnlsPane({ sessionId, copy, host }) {
    const paneId = import_react16.default.useId();
    const clientRef = import_react16.default.useRef(null);
    const listTicket = import_react16.default.useRef(null);
    if (!listTicket.current) listTicket.current = createTicket();
    const alive = import_react16.default.useRef(true);
    const writeLock = import_react16.default.useRef(false);
    const [phase, setPhase] = import_react16.default.useState("loading");
    const [error, setError] = import_react16.default.useState(null);
    const [list, setList] = import_react16.default.useState(null);
    const [boot, setBoot] = import_react16.default.useState(0);
    const [selected, setSelected] = import_react16.default.useState(null);
    const [refreshKey, setRefreshKey] = import_react16.default.useState(0);
    const [receipts, setReceipts] = import_react16.default.useState([]);
    const [confirm, setConfirm] = import_react16.default.useState(null);
    const [create, setCreate] = import_react16.default.useState(null);
    const [busy, setBusy] = import_react16.default.useState(false);
    const [drawer, setDrawer] = import_react16.default.useState(false);
    const [dock, setDock] = import_react16.default.useState(0);
    const [dockHeight, setDockHeight] = import_react16.default.useState(DOCK_DEFAULT);
    const closeDrawer = import_react16.default.useCallback(() => setDrawer(false), []);
    import_react16.default.useEffect(() => () => {
      alive.current = false;
      listTicket.current.kill();
    }, []);
    const supports = (id) => clientRef.current?.supports(id) === true;
    const api = clientRef.current;
    const loadList = import_react16.default.useCallback(async () => {
      const ok = listTicket.current.take();
      try {
        const client = clientRef.current ?? createDnlsClient();
        clientRef.current = client;
        if (!client.capabilities()) await client.discover();
        const out = await client.listSandboxes();
        if (!ok()) return;
        setList(out);
        setPhase("ready");
        setError(null);
      } catch (caught) {
        if (!ok()) return;
        setError(caught);
        setPhase((prev) => prev === "ready" ? "ready" : "failed");
      }
    }, []);
    import_react16.default.useEffect(() => {
      if (sessionId) loadList();
    }, [sessionId, boot, loadList]);
    if (!sessionId) return null;
    const rows = list?.rows ?? null;
    const current = selected ? (rows ?? []).find((row) => row.sandboxId === selected.sandboxId) ?? selected : null;
    const refresh = () => {
      setBoot((value) => value + 1);
      setRefreshKey((value) => value + 1);
    };
    const patchReceipt = (operationId, patch) => setReceipts((all2) => all2.map((item) => item.operationId === operationId ? { ...item, ...patch } : item));
    async function readBack(receipt) {
      patchReceipt(receipt.operationId, { checking: true, error: null });
      try {
        const op = await clientRef.current.readOperation(receipt.sandboxId, receipt.operationId);
        patchReceipt(receipt.operationId, { checking: false, state: op.state, settled: SETTLED.has(op.state) });
        return op.state;
      } catch (caught) {
        patchReceipt(receipt.operationId, { checking: false, error: caught.message });
        return null;
      }
    }
    async function follow(receipt) {
      for (let attempt = 0; attempt < POLL_TRIES && alive.current; attempt += 1) {
        await pause(POLL_MS);
        if (!alive.current) return;
        const state = await readBack(receipt);
        if (state === null) return;
        if (SETTLED.has(state)) {
          refresh();
          return;
        }
      }
    }
    async function recheck(receipt) {
      const state = await readBack(receipt);
      if (state && SETTLED.has(state)) refresh();
    }
    async function write(task, onError) {
      if (writeLock.current) return;
      writeLock.current = true;
      setBusy(true);
      try {
        await task();
      } catch (caught) {
        (onError ?? setError)(caught);
      } finally {
        writeLock.current = false;
        setBusy(false);
      }
    }
    async function dispatch(action, target, fields = {}) {
      await write(async () => {
        const answer = await clientRef.current.lifecycle({
          action,
          sandboxId: action === "create" ? void 0 : target.sandboxId,
          name: action === "create" ? fields.name : void 0,
          profileId: action === "create" ? fields.profileId : void 0,
          requestId: crypto.randomUUID(),
          args: action === "recreate" ? { expectedRevision: target.desiredRevision ?? 0, preserveVolume: true, interruptTerminals: true } : void 0
        });
        const receipt = {
          operationId: answer.operationId,
          sandboxId: answer.sandboxId ?? target.sandboxId,
          action,
          name: action === "create" ? fields.name : target.name,
          state: answer.state ?? "accepted",
          settled: SETTLED.has(answer.state)
        };
        setReceipts((all2) => [receipt, ...all2].slice(0, 20));
        setConfirm(null);
        setCreate(null);
        setError(null);
        if (action === "remove" && selected?.sandboxId === target.sandboxId) setSelected(null);
        refresh();
        if (!receipt.settled) follow(receipt);
      }, (caught) => {
        setConfirm(null);
        if (action === "create") setCreate((prev) => prev ? { ...prev, error: caught } : prev);
        else setError(caught);
      });
    }
    function ask(action, target) {
      if (CONFIRMED.has(action)) setConfirm({ action, target });
      else dispatch(action, target);
    }
    async function openCreate() {
      setCreate({ profiles: null });
      try {
        const profiles = supports("sandbox.profile.list") ? await clientRef.current.listProfiles() : [];
        setCreate((prev) => prev ? { ...prev, profiles } : prev);
      } catch (caught) {
        setCreate((prev) => prev ? { ...prev, profiles: [], error: caught } : prev);
      }
    }
    function choose(row) {
      setSelected({ sandboxId: row.sandboxId, envId: row.envId, name: row.name });
      setError(null);
      setDrawer(false);
    }
    function unchoose() {
      setSelected(null);
      setError(null);
      setDrawer(false);
    }
    const rowTarget = (row) => ({
      sandboxId: row.sandboxId,
      envId: row.envId,
      name: nameOf(row),
      desiredRevision: row.desiredRevision,
      observedState: row.observedState
    });
    function openMenu(event, target) {
      event.stopPropagation();
      const running2 = target.observedState === "running";
      const can = (action) => !busy && supports(`sandbox.instance.${action}`);
      const items = [
        selected ? null : { id: "details", label: copy.details, run: () => choose(target) },
        selected ? null : { id: "power", separator: true },
        running2 ? { id: "stop", label: copy.action.stop, disabled: !can("stop"), run: () => ask("stop", target) } : { id: "start", label: copy.action.start, disabled: !can("start"), run: () => ask("start", target) },
        running2 ? { id: "restart", label: copy.action.restart, disabled: !can("restart"), run: () => ask("restart", target) } : null,
        { id: "danger", separator: true },
        { id: "recreate", label: `${copy.action.recreate}\u2026`, disabled: !can("recreate"), run: () => ask("recreate", target) },
        { id: "remove", label: `${copy.action.remove}\u2026`, tone: "danger", disabled: !can("remove"), run: () => ask("remove", target) }
      ].filter(Boolean);
      openNanoMenu({ anchor: event.currentTarget.getBoundingClientRect(), width: 200, items });
    }
    const all = rows ?? [];
    const running = all.filter((row) => row.observedState === "running").length;
    const stopped = all.filter((row) => row.observedState === "stopped").length;
    const attention = all.filter(needsAttention).length;
    const terminalCount = current ? current.visibleTerminalCount ?? 0 : all.reduce((sum, row) => sum + (Number.isInteger(row.visibleTerminalCount) ? row.visibleTerminalCount : 0), 0);
    const view = current ? h14(SandboxView, {
      key: current.sandboxId,
      copy,
      api,
      row: current,
      host,
      busy,
      supports,
      receipts,
      refreshKey,
      outerError: error,
      onAction: ask,
      onRecheck: recheck,
      onWrite: write
    }) : h14(FleetView, {
      copy,
      api,
      host,
      rows,
      envs: list?.envs,
      complete: list?.complete !== false,
      phase,
      error,
      busy,
      supports,
      receipts,
      refreshKey,
      onRetry: refresh,
      onCreate: openCreate,
      onOpen: choose,
      onMenu: (event, row) => openMenu(event, rowTarget(row)),
      onStart: (row) => ask("start", rowTarget(row)),
      onRecheck: recheck,
      onError: setError
    });
    const bar = h14(
      import_react16.default.Fragment,
      null,
      // The dashboard entry is always visible, at any nesting depth; the drawer's
      // overview row is the same destination in the vertical list.
      h14(IconButton, {
        icon: h14(import_dsh_client_ui_primitives11.IconLayersOutlineRegular, { size: 16 }),
        "aria-label": copy.overview,
        title: copy.back,
        disabled: !current,
        onClick: unchoose
      }),
      h14(ShellToggle, {
        icon: h14(import_dsh_client_ui_primitives11.IconPanelLeftOutlineRegular, { size: 16 }),
        label: copy.drawerToggle,
        title: copy.typeLabel,
        open: drawer,
        onClick: () => setDrawer((open) => !open)
      }),
      h14("span", { className: "dnls-shell-spacer" }),
      h14(IconButton, {
        icon: h14(import_dsh_client_ui_primitives11.IconRefreshOutlineRegular, { size: 16 }),
        "aria-label": copy.refresh,
        disabled: phase === "loading" && !rows,
        onClick: refresh
      }),
      current ? h14(IconButton, {
        icon: h14(import_dsh_client_ui_primitives11.IconEllipsisOutlineRegular, { size: 16 }),
        "aria-label": copy.more,
        onClick: (event) => openMenu(event, rowTarget(current))
      }) : null
    );
    const drawerNode = h14(
      TabDrawer,
      {
        open: drawer,
        label: copy.drawerToggle,
        onClose: closeDrawer,
        head: h14(import_react16.default.Fragment, null, h14("span", null, copy.typeLabel), h14("span", null, String(list?.total ?? all.length)))
      },
      h14(DrawerRow, {
        current: !current,
        onClick: unchoose,
        label: copy.overview,
        meta: rows ? fill(copy.sandboxesCount, { running, stopped, attention }) : null
      }),
      all.length > 0 ? h14("div", { className: "dnls-drawer-sep", role: "presentation" }) : null,
      all.map((row) => h14(DrawerRow, {
        key: row.sandboxId,
        current: current?.sandboxId === row.sandboxId,
        onClick: () => choose(row),
        mark: h14(import_dsh_client_ui_primitives11.StateDot, { state: DOT[row.observedState] ?? "idle" }),
        label: nameOf(row),
        meta: [stateText(copy, row.observedState), reading(copy, row)].filter(Boolean).join(" \xB7 ")
      }))
    );
    const statusText = current ? [stateText(copy, current.observedState), reading(copy, current), current.profileId].filter(Boolean).join(" \xB7 ") : rows ? fill(copy.sandboxesCount, { running, stopped, attention }) : copy.loading;
    const status = h14(
      StatusBar,
      {
        label: copy.statusLabel,
        actions: [{
          id: "terminals",
          label: fill(copy.dockButton, { n: terminalCount }),
          pressed: dock > 0,
          expanded: dock > 0,
          onClick: () => setDock((open) => open > 0 ? 0 : 1)
        }]
      },
      current ? h14(import_dsh_client_ui_primitives11.StateDot, { state: DOT[current.observedState] ?? "idle" }) : null,
      h14("span", null, statusText)
    );
    const dockNode = dock > 0 ? h14(
      Dock,
      { label: copy.dockLabel, height: dockHeight, onCommit: setDockHeight },
      h14(TerminalDock, { copy, api, host, paneId, row: current, supports, busy, refreshKey, onWrite: write, onChanged: loadList })
    ) : null;
    return h14(
      "div",
      { className: "dnls-pane", "data-dnls-pane": "1" },
      h14("style", null, NANO_STYLES, SHELL_STYLE, STYLE),
      h14(WorkbenchShell, { label: copy.workbench, bar, drawer: drawerNode, dock: dockNode, status }, view),
      create ? h14(CreateDialog, {
        copy,
        profiles: create.profiles,
        busy,
        error: create.error,
        onCancel: () => setCreate(null),
        onSubmit: (fields) => dispatch("create", {}, fields)
      }) : null,
      confirm ? h14(LifecycleConfirm, {
        copy,
        request: confirm,
        busy,
        onCancel: () => setConfirm(null),
        onConfirm: () => dispatch(confirm.action, confirm.target)
      }) : null
    );
  }
  var inject = ["slots", "sidebarRightTabs", "sidebarRight", "locale"];
  function apply(ctx) {
    const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith("zh") === true;
    const copy = () => copyFor(zh() ? "zh" : "en");
    const host = {
      handlers: (address) => ctx.sidebarRightTabs?.candidates?.(address),
      openResource: (address, options) => {
        try {
          return openResourceAddress({
            candidates: (value) => ctx.sidebarRightTabs?.candidates?.(value),
            openResource: (value) => ctx.sidebarRight?.openResource?.(value, options),
            address
          });
        } catch {
          return false;
        }
      },
      // The host's own shell tab: it runs on this machine, never in a sandbox.
      openLocalTerminal: () => {
        try {
          ctx.sidebarRight.openTab("terminal", { preferNewPane: true });
          return true;
        } catch {
          return false;
        }
      }
    };
    const Pane = (props) => h14(DnlsPane, { sessionId: props.sessionId, copy: copy(), host });
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: KIND,
      kind: KIND,
      priority: "extension",
      keepMounted: true,
      multiple: false,
      title: () => copy().typeLabel,
      guide: [{
        id: KIND,
        order: 45,
        title: () => copy().typeLabel,
        description: () => copy().typeDescription
      }]
    }));
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: KIND
    }, Pane)));
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
      name: "sidebar.right.pane.tab.title",
      key: KIND
    }, function DnlsTitle() {
      return copy().typeLabel;
    })));
  }
  return __toCommonJS(index_exports);
})();
/*! dsh-nano-ui@0.2.1 */
		return __dnlsClient;
	}
});

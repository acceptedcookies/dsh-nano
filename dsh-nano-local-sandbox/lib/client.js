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

  // ../packages/dsh-nano-ui/src/version.js
  var VERSION;
  var init_version = __esm({
    "../packages/dsh-nano-ui/src/version.js"() {
      VERSION = "0.2.1";
    }
  });

  // ../packages/dsh-nano-ui/src/layers.js
  var NANO_LAYER, NANO_SPACE, kebab, LAYER_CSS;
  var init_layers = __esm({
    "../packages/dsh-nano-ui/src/layers.js"() {
      NANO_LAYER = Object.freeze({
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
      NANO_SPACE = Object.freeze([4, 8, 12, 16, 20, 24]);
      kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      LAYER_CSS = `:root {
${Object.entries(NANO_LAYER).map(([name, value]) => `  --nano-layer-${kebab(name)}: ${value};`).join("\n")}
${NANO_SPACE.map((value, index) => `  --nano-space-${index + 1}: ${value}px;`).join("\n")}
}`;
    }
  });

  // ../packages/dsh-nano-ui/src/styles.js
  var NANO_STYLES;
  var init_styles = __esm({
    "../packages/dsh-nano-ui/src/styles.js"() {
      init_layers();
      init_version();
      NANO_STYLES = `/* dsh-nano-ui@${VERSION} */
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
    }
  });

  // ../packages/dsh-nano-ui/catalog/tokens.json
  var schemes;
  var init_tokens = __esm({
    "../packages/dsh-nano-ui/catalog/tokens.json"() {
      schemes = {
        dark: {
          "--dsw-alias-bg-base": "#151517",
          "--dsw-alias-bg-document-preview": "#151517",
          "--dsw-alias-bg-layer-1": "#232324",
          "--dsw-alias-bg-layer-2": "#2c2c2e",
          "--dsw-alias-bg-layer-3": "#353638",
          "--dsw-alias-bg-mask-1": "#00000080",
          "--dsw-alias-bg-mask-2": "#0003",
          "--dsw-alias-bg-mask-drop": "#272730b3",
          "--dsw-alias-bg-module-platform": "#353638",
          "--dsw-alias-bg-multi-select": "#212123",
          "--dsw-alias-bg-overlay": "#61666b",
          "--dsw-alias-bg-skeleton": "#ffffff14",
          "--dsw-alias-border-inverted": "#ffffff0f",
          "--dsw-alias-border-inverted2": "#ffffff14",
          "--dsw-alias-border-l1": "#ffffff0f",
          "--dsw-alias-border-l2": "#ffffff1f",
          "--dsw-alias-border-l2-darkmode-thin": "#ffffff0f",
          "--dsw-alias-border-l3": "#ffffff29",
          "--dsw-alias-border-l4": "#fff3",
          "--dsw-alias-brand-primary": "#f9fafb",
          "--dsw-alias-brand-primary-invert": "#f9fafb",
          "--dsw-alias-brand-primary-new-colorprimary-new-color": "#5686fe",
          "--dsw-alias-brand-text": "#f9fafb",
          "--dsw-alias-button-contrast-fill": "#f9fafb",
          "--dsw-alias-button-elevated-fill": "#43454a",
          "--dsw-alias-button-floating-fill": "#2c2c2e",
          "--dsw-alias-button-floating-hover": "#353638",
          "--dsw-alias-button-ghost-active-border": "#81858c",
          "--dsw-alias-button-ghost-active-fill": "#43454a",
          "--dsw-alias-button-ghost-active-hover": "#61666b",
          "--dsw-alias-button-info-fill": "#7aaaff",
          "--dsw-alias-button-info-hover": "#4176e6",
          "--dsw-alias-button-primary-dimmed": "#43454a",
          "--dsw-alias-button-primary-fill": "#f9fafb",
          "--dsw-alias-button-primary-hover": "#ebeef2",
          "--dsw-alias-code-diff-added": "#22c55e1f",
          "--dsw-alias-code-diff-deleted": "#f25a5a1f",
          "--dsw-alias-file-diff-added-bg": "#1f3124",
          "--dsw-alias-file-diff-added-gutter": "#132016",
          "--dsw-alias-file-diff-added-marker": "#41c977",
          "--dsw-alias-file-diff-deleted-bg": "#3c1f1b",
          "--dsw-alias-file-diff-deleted-gutter": "#28130e",
          "--dsw-alias-file-diff-deleted-marker": "#fa423e",
          "--dsw-alias-illustration-background": "#2c2c2e",
          "--dsw-alias-illustration-backing": "#43454a",
          "--dsw-alias-illustration-detail": "#81858c",
          "--dsw-alias-illustration-inset": "#43454a",
          "--dsw-alias-illustration-shadow": "#43454a",
          "--dsw-alias-illustration-surface": "#61666b",
          "--dsw-alias-interactive-bg-active": "#ffffff24",
          "--dsw-alias-interactive-bg-hover": "#ffffff14",
          "--dsw-alias-interactive-bg-hover-accent": "#ffffff3d",
          "--dsw-alias-interactive-bg-hover-danger": "#f25a5a26",
          "--dsw-alias-interactive-bg-hover-solid": "#353638",
          "--dsw-alias-label-caption": "#81858c",
          "--dsw-alias-label-deep-diving": "color-mix(in srgb, #5686fe 55%, #adb2b8)",
          "--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, #93c5fd 65%, #7aaaff)",
          "--dsw-alias-label-dimmed": "#43454a",
          "--dsw-alias-label-document-preview": "#cfd3d6",
          "--dsw-alias-label-primary": "#f9fafb",
          "--dsw-alias-label-primary-bluish": "#f9fafb",
          "--dsw-alias-label-primary-dimmed": "#ebeef2",
          "--dsw-alias-label-primary-foreground": "#0f1115",
          "--dsw-alias-label-primary-inverted": "#353638",
          "--dsw-alias-label-secondary": "#cfd3d6",
          "--dsw-alias-label-shimmer": "color-mix(in srgb, #fff 45%, transparent)",
          "--dsw-alias-label-tertiary": "#adb2b8",
          "--dsw-alias-link": "#7aaaff",
          "--dsw-alias-markdown-citation": "#353638",
          "--dsw-alias-markdown-code-block": "#1b1b1c",
          "--dsw-alias-markdown-code-block-banner": "#2c2c2e",
          "--dsw-alias-markdown-code-segment-selected": "#353638",
          "--dsw-alias-markdown-code-segment-unselected": "#1b1b1c",
          "--dsw-alias-markdown-inline-code": "#292929",
          "--dsw-alias-markdown-placeholder": "#2c2c2e",
          "--dsw-alias-markdown-tag": "#2c2c2e",
          "--dsw-alias-menu-group-header-fill": "#303136f0",
          "--dsw-alias-menu-icon": "#ebeef2",
          "--dsw-alias-onboarding-card-fill": "color-mix(in srgb, #2c2c2e 80%, transparent)",
          "--dsw-alias-onboarding-checkbox-border": "#ffffff1f",
          "--dsw-alias-onboarding-secondary-fill": "#48494c",
          "--dsw-alias-scrollbar-bg-l1": "#3c3c3d",
          "--dsw-alias-scrollbar-bg-l2": "#545557",
          "--dsw-alias-scrollbar-hover-l1": "#545557",
          "--dsw-alias-scrollbar-hover-l2": "#65676b",
          "--dsw-alias-settings-card-fill": "#2c2c2e",
          "--dsw-alias-settings-card-stroke": "#fff3",
          "--dsw-alias-state-business-primary": "#7aaaff",
          "--dsw-alias-state-business-tertiary": "#34415b",
          "--dsw-alias-state-done-primary": "#a78bfa",
          "--dsw-alias-state-error-primary": "#f25a5a",
          "--dsw-alias-state-idle-primary": "#545557",
          "--dsw-alias-state-success-tertiary": "#233c2c",
          "--dsw-alias-state-warn-tertiary": "#27241f",
          "--dsw-alias-switch-thumb": "#adb2b8",
          "--dsw-alias-toast-bg": "#43454a",
          "--dsw-alias-tooltip-bg": "#43454a",
          "--dsw-alias-tooltip-key-bg": "color-mix(in srgb, #43454a, white 18%)",
          "--dsw-alias-turn-trigger-bg": "#ffffff14",
          "--dsw-alias-turn-trigger-bg-hover": "#ffffff24",
          "--dsw-elevation-panel": "0 0 0 .5px #fff3, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
          "--dsw-elevation-prominent": "0 0 0 .5px #fff3, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
          "--dsw-elevation-soft": "0 0 0 .5px #fff3, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
          "--dsw-elevation-stroke": "0 0 0 .5px #fff3",
          "--dsw-elevation-stroke-color": "#fff3",
          "--dsw-linear-gradient-think": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
          "--dsw-linear-think-select": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
          "--dsw-menu-surface-fill": "#303136a3",
          "--dsw-specific-bubble": "#2c2c2e",
          "--dsw-specific-bubble-highlight": "#43454a",
          "--dsw-specific-input-major": "#2c2c2e",
          "--dsw-specific-login-input": "#1b1b1c",
          "--dsw-specific-menu": "#303136a3",
          "--dsw-specific-selector": "#353638",
          "--dsw-specific-sidebar-fill": "#1b1b1c",
          "--dsw-specific-sidebar-nav-item-active": "#43454a",
          "--dsw-specific-sidebar-nav-item-active-accent": "#353638",
          "--dsw-specific-tip": "#353638",
          "--dsw-static-neutral-bluish-60": "#f9fafb"
        },
        light: {
          "--dsw-alias-bg-base": "#fff",
          "--dsw-alias-bg-document-preview": "#ebeef2",
          "--dsw-alias-bg-layer-1": "#fff",
          "--dsw-alias-bg-layer-2": "#fff",
          "--dsw-alias-bg-layer-3": "#fff",
          "--dsw-alias-bg-mask-1": "#0000003d",
          "--dsw-alias-bg-mask-2": "#0000001f",
          "--dsw-alias-bg-mask-drop": "#ffffffb3",
          "--dsw-alias-bg-module-platform": "#f5f6f7",
          "--dsw-alias-bg-multi-select": "#f5f6f7",
          "--dsw-alias-bg-overlay": "#e9ecf2",
          "--dsw-alias-bg-skeleton": "#0000000a",
          "--dsw-alias-border-inverted": "#0000",
          "--dsw-alias-border-inverted2": "#0000",
          "--dsw-alias-border-l1": "#0000000a",
          "--dsw-alias-border-l2": "#0000001a",
          "--dsw-alias-border-l2-darkmode-thin": "#0000001a",
          "--dsw-alias-border-l3": "#0000001f",
          "--dsw-alias-border-l4": "#00000029",
          "--dsw-alias-brand-primary": "#0f1115",
          "--dsw-alias-brand-primary-invert": "#0f1115",
          "--dsw-alias-brand-primary-new-colorprimary-new-color": "#4176e6",
          "--dsw-alias-brand-text": "#0f1115",
          "--dsw-alias-button-contrast-fill": "#61666b",
          "--dsw-alias-button-elevated-fill": "#fff",
          "--dsw-alias-button-floating-fill": "#fff",
          "--dsw-alias-button-floating-hover": "#f1f3f5",
          "--dsw-alias-button-ghost-active-border": "#979da6",
          "--dsw-alias-button-ghost-active-fill": "#ebeef2",
          "--dsw-alias-button-ghost-active-hover": "#e9ecf2",
          "--dsw-alias-button-info-fill": "#4176e6",
          "--dsw-alias-button-info-hover": "#7aaaff",
          "--dsw-alias-button-primary-dimmed": "#ebeef2",
          "--dsw-alias-button-primary-fill": "#0f1115",
          "--dsw-alias-button-primary-hover": "#43454a",
          "--dsw-alias-code-diff-added": "#22c55e14",
          "--dsw-alias-code-diff-deleted": "#ec131314",
          "--dsw-alias-file-diff-added-bg": "#e6f4e7",
          "--dsw-alias-file-diff-added-gutter": "#edf7ed",
          "--dsw-alias-file-diff-added-marker": "#01a241",
          "--dsw-alias-file-diff-deleted-bg": "#fce6e2",
          "--dsw-alias-file-diff-deleted-gutter": "#fdece9",
          "--dsw-alias-file-diff-deleted-marker": "#ba2723",
          "--dsw-alias-illustration-background": "#f5f7fa",
          "--dsw-alias-illustration-backing": "#cad2db",
          "--dsw-alias-illustration-detail": "#cad2db",
          "--dsw-alias-illustration-inset": "#edf0f4",
          "--dsw-alias-illustration-shadow": "#edf0f4",
          "--dsw-alias-illustration-surface": "#edf0f4",
          "--dsw-alias-interactive-bg-active": "#2631481a",
          "--dsw-alias-interactive-bg-hover": "#2631480f",
          "--dsw-alias-interactive-bg-hover-accent": "#26314824",
          "--dsw-alias-interactive-bg-hover-danger": "#ec13130d",
          "--dsw-alias-interactive-bg-hover-solid": "#f1f3f5",
          "--dsw-alias-label-caption": "#adb2b8",
          "--dsw-alias-label-deep-diving": "color-mix(in srgb, #4176e6 70%, #172554)",
          "--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, #4176e6 30%, #172554)",
          "--dsw-alias-label-dimmed": "#e1e5ee",
          "--dsw-alias-label-document-preview": "#61666b",
          "--dsw-alias-label-primary": "#0f1115",
          "--dsw-alias-label-primary-bluish": "#0e3074",
          "--dsw-alias-label-primary-dimmed": "#151517",
          "--dsw-alias-label-primary-foreground": "#fff",
          "--dsw-alias-label-primary-inverted": "#fff",
          "--dsw-alias-label-secondary": "#61666b",
          "--dsw-alias-label-shimmer": "color-mix(in srgb, #000 30%, transparent)",
          "--dsw-alias-label-tertiary": "#81858c",
          "--dsw-alias-link": "#4176e6",
          "--dsw-alias-markdown-citation": "#ebeef2",
          "--dsw-alias-markdown-code-block": "#f9fafb",
          "--dsw-alias-markdown-code-block-banner": "#f9fafb",
          "--dsw-alias-markdown-code-segment-selected": "#fff",
          "--dsw-alias-markdown-code-segment-unselected": "#f1f3f5",
          "--dsw-alias-markdown-inline-code": "#fafafa",
          "--dsw-alias-markdown-placeholder": "#f5f6f7",
          "--dsw-alias-markdown-tag": "#f1f3f5",
          "--dsw-alias-menu-group-header-fill": "#f8f9faf0",
          "--dsw-alias-menu-icon": "#353638",
          "--dsw-alias-onboarding-card-fill": "color-mix(in srgb, #fff 80%, transparent)",
          "--dsw-alias-onboarding-checkbox-border": "color-mix(in srgb, #0f1115 20%, transparent)",
          "--dsw-alias-onboarding-secondary-fill": "#fff",
          "--dsw-alias-scrollbar-bg-l1": "#e5e5e5",
          "--dsw-alias-scrollbar-bg-l2": "#e5e5e5",
          "--dsw-alias-scrollbar-hover-l1": "#d4d4d4",
          "--dsw-alias-scrollbar-hover-l2": "#d4d4d4",
          "--dsw-alias-settings-card-fill": "#fff",
          "--dsw-alias-settings-card-stroke": "#00000029",
          "--dsw-alias-state-business-primary": "#4176e6",
          "--dsw-alias-state-business-tertiary": "#e4edfd",
          "--dsw-alias-state-done-primary": "#7c3aed",
          "--dsw-alias-state-error-primary": "#ec1313",
          "--dsw-alias-state-idle-primary": "#d4d4d4",
          "--dsw-alias-state-success-tertiary": "#e6faed",
          "--dsw-alias-state-warn-tertiary": "#fef5e7",
          "--dsw-alias-switch-thumb": "#fff",
          "--dsw-alias-toast-bg": "#353638",
          "--dsw-alias-tooltip-bg": "#2c2c2e",
          "--dsw-alias-tooltip-key-bg": "color-mix(in srgb, #2c2c2e, white 18%)",
          "--dsw-alias-turn-trigger-bg": "#f9fafb",
          "--dsw-alias-turn-trigger-bg-hover": "#2631480f",
          "--dsw-elevation-panel": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
          "--dsw-elevation-prominent": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
          "--dsw-elevation-soft": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
          "--dsw-elevation-stroke": "0 0 0 .5px #00000029",
          "--dsw-elevation-stroke-color": "#00000029",
          "--dsw-linear-gradient-think": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
          "--dsw-linear-think-select": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
          "--dsw-menu-surface-fill": "#fcfdfeb3",
          "--dsw-specific-bubble": "#edf3fe",
          "--dsw-specific-bubble-highlight": "#d3e2ff",
          "--dsw-specific-input-major": "#fff",
          "--dsw-specific-login-input": "#f9fafb",
          "--dsw-specific-menu": "#fcfdfeb3",
          "--dsw-specific-selector": "#f5f6f7",
          "--dsw-specific-sidebar-fill": "#f9fafb",
          "--dsw-specific-sidebar-nav-item-active": "#ebeef2",
          "--dsw-specific-sidebar-nav-item-active-accent": "#e4edfd",
          "--dsw-specific-tip": "#f5f6f7",
          "--dsw-static-neutral-bluish-60": "#f5f6f7"
        }
      };
    }
  });

  // ../packages/dsh-nano-ui/src/theme-scheme.js
  function hostScheme(theme) {
    try {
      const snapshot = theme?.getTheme?.();
      const value = snapshot?.active?.colorScheme ?? snapshot?.colorScheme;
      return value === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  }
  function resolveScheme({ pin, theme } = {}) {
    if (pin === "light" || pin === "dark") return pin;
    return hostScheme(theme);
  }
  function schemeDeclarations({ schemes: schemes2, scheme, host }) {
    if (scheme === host) return [];
    const table = schemes2?.[scheme];
    if (table === void 0 || table === null) throw new Error(`dsh-nano-ui: catalog has no "${scheme}" scheme table`);
    return Object.entries(table);
  }
  var init_theme_scheme = __esm({
    "../packages/dsh-nano-ui/src/theme-scheme.js"() {
    }
  });

  // ../packages/dsh-nano-ui/src/theme.js
  function createThemeScope({ theme, element, pin, subscribe }) {
    if (!(element instanceof HTMLElement)) throw new TypeError("dsh-nano-ui: createThemeScope needs an owner element");
    let current = pin;
    let scheme = resolveScheme({ pin: current, theme });
    let written = [];
    let disposed = false;
    const clear = () => {
      for (const name of written) element.style.removeProperty(name);
      written = [];
    };
    const apply2 = () => {
      if (disposed) return;
      scheme = resolveScheme({ pin: current, theme });
      clear();
      for (const [name, value] of schemeDeclarations({ schemes, scheme, host: hostScheme(theme) })) {
        element.style.setProperty(name, value);
        written.push(name);
      }
      element.setAttribute("data-nano-scheme", scheme);
    };
    apply2();
    const unsubscribe = typeof subscribe === "function" ? subscribe(apply2) : void 0;
    return {
      scheme: () => scheme,
      refresh: apply2,
      setPin: (next) => {
        current = next === "light" || next === "dark" ? next : void 0;
        apply2();
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        if (typeof unsubscribe === "function") unsubscribe();
        clear();
        element.removeAttribute("data-nano-scheme");
      }
    };
  }
  var init_theme = __esm({
    "../packages/dsh-nano-ui/src/theme.js"() {
      init_tokens();
      init_theme_scheme();
    }
  });

  // ../packages/dsh-nano-ui/catalog/icons.json
  var sprite;
  var init_icons = __esm({
    "../packages/dsh-nano-ui/catalog/icons.json"() {
      sprite = {
        from: "rc.3",
        glyphs: [
          "agent-preset-outline",
          "alarm-clock-outline",
          "api-outline",
          "apps-add-compact-outline",
          "apps-add-outline",
          "archive-check-outline",
          "archive-off-outline",
          "archive-outline",
          "branch-outline",
          "browse-outline",
          "check-circle-fill",
          "check-circle-outline",
          "check-outline",
          "checklist-outline",
          "chevron-down-outline",
          "chevron-left-outline",
          "chevron-right-outline",
          "chevron-up-outline",
          "chevrons-up-down-outline",
          "clock-outline",
          "close-circle-fill",
          "close-fill",
          "close-outline",
          "code-outline",
          "compact-outline",
          "compare-split-outline",
          "context-injection-outline",
          "copy-outline",
          "cordis-plugin-outline",
          "dark-outline",
          "data-outline",
          "database-outline",
          "deliver-doc",
          "dislike-fill",
          "dislike-outline",
          "download-outline",
          "drag-handle-outline",
          "edit-outline",
          "ellipsis-outline",
          "enhance-outline",
          "eye-off-outline",
          "eye-outline",
          "flat-list-outline",
          "folder-close",
          "folder-open",
          "folder-open-outline",
          "followsystem-outline",
          "fullscreen-outline",
          "gauge-outline",
          "globe-outline",
          "goal-outline",
          "info-outline",
          "inspect-outline",
          "layers-outline",
          "light-outline",
          "like-fill",
          "like-outline",
          "link-outline",
          "list-pen-outline",
          "loading-outline",
          "microphone-outline",
          "new-chat-outline",
          "nowrap-fill",
          "panel-left-outline",
          "paper-plane-outline",
          "paperclip-outline",
          "pause-outline",
          "personalization-outline",
          "pin-fill",
          "pin-outline",
          "plan-outline",
          "play-outline",
          "plugin-pinwheel-outline",
          "plus-outline",
          "project-add-outline",
          "question-outline",
          "queue-outline",
          "refresh-outline",
          "right-up-outline",
          "save-outline",
          "search-outline",
          "send-outline",
          "settings-outline",
          "share-outline",
          "shield-outline",
          "skill-outline",
          "sliders-two-outline",
          "stop-fill",
          "think-outline",
          "trash-outline",
          "tree-corner",
          "triangle-right-fill",
          "unarchive-outline",
          "upload-outline",
          "user-outline",
          "users-outline",
          "warning-outline",
          "warning-triangle-outline",
          "workspace-tree-outline",
          "wrap-fill",
          "wrap-lines-outline"
        ],
        weights: [
          "medium",
          "regular"
        ]
      };
    }
  });

  // ../packages/dsh-nano-ui/src/icon-markup.js
  function spriteMarkup(glyph, weight = "regular", size = 16) {
    if (typeof glyph !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(glyph)) throw new TypeError(`dsh-nano-ui: bad sprite glyph "${glyph}"`);
    if (!SPRITE_WEIGHTS.includes(weight)) throw new TypeError(`dsh-nano-ui: bad sprite weight "${weight}"`);
    const id = `dsw-icon-${glyph}-${weight}`;
    return `<svg width="${size}" height="${size}" data-icon="${id}" aria-hidden="true"><use href="#${id}"/></svg>`;
  }
  function isSpriteGlyph(sprite2, glyph, weight = "regular") {
    return sprite2?.glyphs?.includes(glyph) === true && sprite2?.weights?.includes(weight) === true;
  }
  var SPRITE_WEIGHTS;
  var init_icon_markup = __esm({
    "../packages/dsh-nano-ui/src/icon-markup.js"() {
      SPRITE_WEIGHTS = Object.freeze(["regular", "medium"]);
    }
  });

  // ../packages/dsh-nano-ui/src/icons.js
  function icon(name) {
    const component = /^Icon[A-Z]/.test(name) ? primitives[name] : void 0;
    if (component === void 0) throw new Error(`dsh-nano-ui: the host exports no icon "${name}"`);
    return component;
  }
  function iconMarkup(glyph, weight = "regular", size = 16) {
    if (!isSpriteGlyph(sprite, glyph, weight) && !warned.has(`${glyph}-${weight}`)) {
      warned.add(`${glyph}-${weight}`);
      console.warn(`dsh-nano-ui: sprite glyph "${glyph}-${weight}" is not in the catalog`);
    }
    return spriteMarkup(glyph, weight, size);
  }
  var primitives, warned;
  var init_icons2 = __esm({
    "../packages/dsh-nano-ui/src/icons.js"() {
      primitives = __toESM(__require("@deepseek-ai/dsh-client-ui-primitives"), 1);
      init_icons();
      init_icon_markup();
      warned = /* @__PURE__ */ new Set();
    }
  });

  // ../packages/dsh-nano-ui/src/dialog.js
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
  var import_react, import_dsh_client_ui_primitives, h, DIALOG_WIDTHS, DIALOG_HEIGHTS, DIALOG_CHROME;
  var init_dialog = __esm({
    "../packages/dsh-nano-ui/src/dialog.js"() {
      import_react = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
      h = import_react.default.createElement;
      DIALOG_WIDTHS = Object.freeze([380, 480, 560, 720]);
      DIALOG_HEIGHTS = Object.freeze([480, 560, 640]);
      DIALOG_CHROME = 136;
    }
  });

  // ../packages/dsh-nano-ui/src/overlay.js
  function assertContainer(container, who) {
    if (!(container instanceof HTMLElement) || !container.isConnected) {
      throw new Error(`dsh-nano-ui: ${who} needs a container element attached to the document; overlays never fall back to document.body`);
    }
  }
  function NanoWindowDialog({ container, copy, title, description, confirmLabel, confirmDisabled, busy, error, danger, footer, width, maxHeight, fixedHeight, className, onConfirm, onCancel, children }) {
    const cardRef = import_react2.default.useRef(null);
    (0, import_dsh_client_ui_primitives2.useModalLayer)(cardRef, true, onCancel);
    if (container !== void 0) assertContainer(container, "NanoWindowDialog");
    const style = {};
    if (typeof width === "number") style.width = `min(${Math.round(width)}px, 100%)`;
    if (typeof maxHeight === "number") style.maxHeight = `min(${Math.round(maxHeight)}px, 100%)`;
    if (typeof fixedHeight === "number") style.height = `min(${Math.round(fixedHeight)}px, 100%)`;
    const overlay = h2(
      "div",
      { className: "nano-overlay", role: "presentation" },
      h2("div", { className: "nano-overlay-mask", "aria-hidden": "true", onClick: onCancel }),
      h2(
        "div",
        {
          ref: cardRef,
          tabIndex: -1,
          role: "dialog",
          "aria-modal": "true",
          "aria-label": title,
          className: ["nano-wdlg", className ?? ""].filter(Boolean).join(" "),
          style
        },
        h2(
          "div",
          { className: "nano-wdlg-head" },
          h2("h2", { className: "nano-wdlg-title" }, title),
          h2(import_dsh_client_ui_primitives2.Button, { variant: "ghost", size: "sm", icon: h2(import_dsh_client_ui_primitives2.IconCloseOutlineRegular, { size: 14 }), "aria-label": copy.close ?? copy.cancel, onClick: onCancel })
        ),
        description === void 0 || description === "" ? null : h2("p", { className: "nano-wdlg-desc" }, description),
        h2(
          "div",
          { className: "nano-wdlg-body" },
          children,
          error === void 0 ? null : h2("p", { className: "nano-dialog-error", role: "alert" }, error)
        ),
        h2(
          "div",
          { className: "nano-wdlg-foot" },
          footer ?? actionRow({ copy, confirmLabel, confirmDisabled, busy, danger, onConfirm, onCancel })
        )
      )
    );
    return container === void 0 ? overlay : (0, import_react_dom.createPortal)(overlay, container);
  }
  var import_react2, import_react_dom, import_dsh_client_ui_primitives2, h2;
  var init_overlay = __esm({
    "../packages/dsh-nano-ui/src/overlay.js"() {
      import_react2 = __toESM(__require("react"), 1);
      import_react_dom = __require("react-dom");
      import_dsh_client_ui_primitives2 = __require("@deepseek-ai/dsh-client-ui-primitives");
      init_dialog();
      h2 = import_react2.default.createElement;
    }
  });

  // ../packages/dsh-nano-ui/src/menu-model.js
  function menuHeight(items) {
    let height = 8;
    for (const item of items) height += item?.separator === true ? 9 : 28;
    return height;
  }
  function capClass(maxHeight) {
    if (typeof maxHeight !== "number" || !Number.isFinite(maxHeight)) return void 0;
    const cap = [...MENU_CAPS].reverse().find((step) => step <= maxHeight) ?? MENU_CAPS[0];
    return `nano-cap-${cap}`;
  }
  function toHostItems(actions) {
    return actions.map((action) => action?.separator === true ? { type: "separator", id: action.id } : { id: action.id, label: action.label, icon: action.icon, danger: action.tone === "danger", disabled: action.disabled === true });
  }
  var MENU_CAPS;
  var init_menu_model = __esm({
    "../packages/dsh-nano-ui/src/menu-model.js"() {
      MENU_CAPS = Object.freeze([120, 160, 200, 240, 320, 400, 480]);
    }
  });

  // ../packages/dsh-nano-ui/src/menu.js
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
  var import_react3, import_dsh_client_ui_primitives3, h3;
  var init_menu = __esm({
    "../packages/dsh-nano-ui/src/menu.js"() {
      import_react3 = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives3 = __require("@deepseek-ai/dsh-client-ui-primitives");
      init_menu_model();
      h3 = import_react3.default.createElement;
    }
  });

  // ../packages/dsh-nano-ui/src/toast.js
  function NanoToast({ text, anchor, tone, icon: icon2, actions, holdMs, onDone }) {
    if (text === void 0 || text === null || text === "") return null;
    return import_react4.default.createElement(import_dsh_client_ui_primitives4.Toast, { key: String(text), text, anchor: anchor ?? void 0, tone, icon: icon2, actions, holdMs, onDone: onDone ?? noop });
  }
  var import_react4, import_dsh_client_ui_primitives4, noop;
  var init_toast = __esm({
    "../packages/dsh-nano-ui/src/toast.js"() {
      import_react4 = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives4 = __require("@deepseek-ai/dsh-client-ui-primitives");
      noop = () => {
      };
    }
  });

  // ../packages/dsh-nano-ui/src/mount.js
  function mountNano(el, Component, props = {}) {
    if (!(el instanceof Element)) throw new TypeError("dsh-nano-ui: mountNano needs an element");
    const root = (0, import_client.createRoot)(el);
    let current = { ...props };
    let mounted = true;
    root.render(import_react5.default.createElement(Component, current));
    return {
      update: (next) => {
        if (!mounted) return;
        current = { ...current, ...next };
        root.render(import_react5.default.createElement(Component, current));
      },
      unmount: () => {
        if (!mounted) return;
        mounted = false;
        root.unmount();
      }
    };
  }
  var import_react5, import_client;
  var init_mount = __esm({
    "../packages/dsh-nano-ui/src/mount.js"() {
      import_react5 = __toESM(__require("react"), 1);
      import_client = __require("react-dom/client");
    }
  });

  // ../packages/dsh-nano-ui/src/tabs.js
  function nanoTabs({ items, value, onChange, label }) {
    const id = `nano-seg-${++seq}`;
    const el = document.createElement("div");
    for (const item of items) {
      item.panel.id = `${id}-${item.value}-panel`;
      item.panel.setAttribute("role", "tabpanel");
      item.panel.setAttribute("aria-labelledby", `${id}-${item.value}`);
    }
    let current;
    const strip = mountNano(el, import_dsh_client_ui_primitives5.SegmentedControl, {
      id,
      value,
      label,
      options: items.map((item) => ({ value: item.value, label: item.label })),
      onChange: (next) => select(next)
    });
    function select(next) {
      if (!items.some((item) => item.value === next)) return;
      current = next;
      for (const item of items) item.panel.hidden = item.value !== next;
      strip.update({ value: next });
      onChange?.(next);
    }
    select(value);
    return { el, select, value: () => current };
  }
  function NanoTabs({ items, value, onChange, label, className }) {
    const [inner, setInner] = import_react6.default.useState(() => value ?? items[0]?.value);
    const id = `nano-seg-${import_react6.default.useId().replaceAll(":", "")}`;
    const current = value ?? inner;
    const select = (next) => {
      if (value === void 0) setInner(next);
      onChange?.(next);
    };
    return h4(
      "div",
      { className: ["nano-panes", className ?? ""].filter(Boolean).join(" ") },
      h4(import_dsh_client_ui_primitives5.SegmentedControl, { id, value: current, label, options: items.map((item) => ({ value: item.value, label: item.label })), onChange: select }),
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
  var import_react6, import_dsh_client_ui_primitives5, h4, seq;
  var init_tabs = __esm({
    "../packages/dsh-nano-ui/src/tabs.js"() {
      import_react6 = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives5 = __require("@deepseek-ai/dsh-client-ui-primitives");
      init_mount();
      h4 = import_react6.default.createElement;
      seq = 0;
    }
  });

  // ../packages/dsh-nano-ui/src/dom.js
  function mount(parent) {
    const host = document.createElement("div");
    parent.appendChild(host);
    const root = (0, import_client2.createRoot)(host);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      root.unmount();
      host.remove();
    };
    return { host, root, close };
  }
  function openNanoDialog(options) {
    const { container, ...props } = options;
    if (container !== void 0) assertContainer(container, "openNanoDialog");
    const { root, close } = mount(container ?? document.body);
    const onCancel = () => {
      options.onCancel?.();
      close();
    };
    root.render(import_react7.default.createElement(container === void 0 ? NanoDialog : NanoWindowDialog, { ...props, onCancel }));
    return { close };
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
    root.render(import_react7.default.createElement(NanoMenu, {
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
  var import_react7, import_client2, HOST_MENU_GAP;
  var init_dom = __esm({
    "../packages/dsh-nano-ui/src/dom.js"() {
      import_react7 = __toESM(__require("react"), 1);
      import_client2 = __require("react-dom/client");
      init_dialog();
      init_menu();
      init_overlay();
      HOST_MENU_GAP = 4;
    }
  });

  // ../packages/dsh-nano-ui/src/button.js
  function IconButton({ icon: icon2, variant = "ghost", size = "sm", ...rest }) {
    const label = rest["aria-label"];
    if (typeof label !== "string" || label.trim() === "") throw new TypeError("dsh-nano-ui: IconButton needs an aria-label");
    return import_react8.default.createElement(import_dsh_client_ui_primitives6.Button, { variant, size, icon: icon2, title: label, ...rest });
  }
  var import_react8, import_dsh_client_ui_primitives6;
  var init_button = __esm({
    "../packages/dsh-nano-ui/src/button.js"() {
      import_react8 = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives6 = __require("@deepseek-ai/dsh-client-ui-primitives");
    }
  });

  // ../packages/dsh-nano-ui/src/toolbar.js
  function Toolbar({ label, className, children }) {
    return import_react9.default.createElement("div", { role: "toolbar", "aria-label": label, className: ["nano-toolbar", className ?? ""].filter(Boolean).join(" ") }, children);
  }
  var import_react9;
  var init_toolbar = __esm({
    "../packages/dsh-nano-ui/src/toolbar.js"() {
      import_react9 = __toESM(__require("react"), 1);
    }
  });

  // ../packages/dsh-nano-ui/src/empty.js
  function EmptyState({ icon: icon2, title, description, action, className }) {
    return h5(
      "div",
      { className: ["nano-empty", className ?? ""].filter(Boolean).join(" ") },
      icon2 === void 0 ? null : h5("span", { className: "nano-empty-icon", "aria-hidden": "true" }, icon2),
      h5("p", { className: "nano-empty-title" }, title),
      description === void 0 ? null : h5("p", { className: "nano-empty-desc" }, description),
      action ?? null
    );
  }
  var import_react10, h5;
  var init_empty = __esm({
    "../packages/dsh-nano-ui/src/empty.js"() {
      import_react10 = __toESM(__require("react"), 1);
      h5 = import_react10.default.createElement;
    }
  });

  // ../packages/dsh-nano-ui/src/window.js
  function useNanoWindow() {
    return import_react11.default.useContext(WindowContext);
  }
  function FloatingWindow({ theme, pin, subscribe, title, actions, onClose, closeLabel, floating, className, style, children }) {
    const ref = import_react11.default.useRef(null);
    const scope = import_react11.default.useRef(null);
    const [element, setElement] = import_react11.default.useState(null);
    import_react11.default.useLayoutEffect(() => {
      const next = createThemeScope({ theme, element: ref.current, pin, subscribe });
      scope.current = next;
      setElement(ref.current);
      return () => {
        next.dispose();
        scope.current = null;
      };
    }, [theme, subscribe]);
    import_react11.default.useLayoutEffect(() => {
      scope.current?.setPin(pin);
    }, [pin]);
    return h6(
      "section",
      {
        ref,
        "aria-label": title,
        className: ["nano-window", floating ? "nano-window-floating" : "", className ?? ""].filter(Boolean).join(" "),
        style
      },
      h6(
        Toolbar,
        { label: title },
        h6("span", { className: "nano-window-title" }, title),
        actions ?? null,
        onClose === void 0 ? null : h6(IconButton, { icon: h6(import_dsh_client_ui_primitives7.IconCloseOutlineRegular, { size: 14 }), "aria-label": closeLabel ?? "Close", onClick: onClose })
      ),
      h6("div", { className: "nano-window-body" }, h6(WindowContext.Provider, { value: element }, children))
    );
  }
  var import_react11, import_dsh_client_ui_primitives7, h6, WindowContext;
  var init_window = __esm({
    "../packages/dsh-nano-ui/src/window.js"() {
      import_react11 = __toESM(__require("react"), 1);
      import_dsh_client_ui_primitives7 = __require("@deepseek-ai/dsh-client-ui-primitives");
      init_button();
      init_theme();
      init_toolbar();
      h6 = import_react11.default.createElement;
      WindowContext = import_react11.default.createContext(null);
    }
  });

  // ../packages/dsh-nano-ui/src/panel.js
  function PanelLayout({ title, kicker, description, actions, children, className, ...rest }) {
    return h7(
      "section",
      { className: className ? `nano-panel ${className}` : "nano-panel", ...rest },
      h7(
        "header",
        { className: "nano-panel-header" },
        kicker ? h7("p", { className: "nano-panel-kicker" }, kicker) : null,
        h7("h2", null, title),
        description ? h7("p", null, description) : null,
        actions ? h7("div", null, actions) : null
      ),
      children
    );
  }
  function PanelSection({ title, children }) {
    return h7(
      "section",
      { className: "nano-panel-section" },
      title ? h7("h3", null, title) : null,
      children
    );
  }
  function FactGrid({ items }) {
    return h7(
      "dl",
      { className: "nano-facts" },
      (items ?? []).map((item, index) => h7(
        "div",
        { key: index },
        h7("dt", null, item.label),
        h7("dd", null, item.value ?? "\u2014")
      ))
    );
  }
  var import_react12, h7;
  var init_panel = __esm({
    "../packages/dsh-nano-ui/src/panel.js"() {
      import_react12 = __toESM(__require("react"), 1);
      h7 = import_react12.default.createElement;
    }
  });

  // ../packages/dsh-nano-ui/index.js
  var dsh_nano_ui_exports = {};
  __export(dsh_nano_ui_exports, {
    EmptyState: () => EmptyState,
    FactGrid: () => FactGrid,
    FloatingWindow: () => FloatingWindow,
    IconButton: () => IconButton,
    NANO_LAYER: () => NANO_LAYER,
    NANO_SPACE: () => NANO_SPACE,
    NANO_STYLES: () => NANO_STYLES,
    NanoDialog: () => NanoDialog,
    NanoMenu: () => NanoMenu,
    NanoTabs: () => NanoTabs,
    NanoToast: () => NanoToast,
    NanoWindowDialog: () => NanoWindowDialog,
    PanelLayout: () => PanelLayout,
    PanelSection: () => PanelSection,
    Toolbar: () => Toolbar,
    VERSION: () => VERSION,
    createThemeScope: () => createThemeScope,
    icon: () => icon,
    iconMarkup: () => iconMarkup,
    menuHeight: () => menuHeight,
    mountNano: () => mountNano,
    nanoTabs: () => nanoTabs,
    openNanoDialog: () => openNanoDialog,
    openNanoMenu: () => openNanoMenu,
    resolveScheme: () => resolveScheme,
    useNanoWindow: () => useNanoWindow
  });
  var init_dsh_nano_ui = __esm({
    "../packages/dsh-nano-ui/index.js"() {
      init_version();
      init_layers();
      init_styles();
      init_theme();
      init_icons2();
      init_dialog();
      init_overlay();
      init_menu();
      init_toast();
      init_tabs();
      init_dom();
      init_mount();
      init_button();
      init_toolbar();
      init_empty();
      init_window();
      init_panel();
    }
  });

  // src/client/managed.js
  var managed_exports = {};
  __export(managed_exports, {
    CONTRACT_HEADER: () => CONTRACT_HEADER,
    CONTRACT_META: () => CONTRACT_META,
    CONTRACT_VERSION: () => CONTRACT_VERSION,
    createDnlsClient: () => createDnlsClient,
    createTicket: () => createTicket
  });
  function refuse(code, message) {
    const error = new Error(message);
    error.errorId = `dnls.client.${code}`;
    error.restricted = true;
    throw error;
  }
  function createTicket() {
    let seq2 = 0;
    let alive = true;
    return {
      take() {
        seq2 += 1;
        const mine = seq2;
        return () => alive && seq2 === mine;
      },
      kill() {
        alive = false;
        seq2 += 1;
      }
    };
  }
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
  var CONTRACT_VERSION, CONTRACT_HEADER, CONTRACT_META, PREFIX, CONTRACT_PATH, SANDBOX_ID, INSPECT_WINDOWS, PATH_CAPS, CONTROL_ACTIONS, assertSandboxId;
  var init_managed = __esm({
    "src/client/managed.js"() {
      CONTRACT_VERSION = "dnls.control/1";
      CONTRACT_HEADER = "x-dnls-contract";
      CONTRACT_META = "dnls/contract";
      PREFIX = "/nano-local-sandbox/";
      CONTRACT_PATH = `${PREFIX}contract`;
      SANDBOX_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      INSPECT_WINDOWS = /* @__PURE__ */ new Set(["24h", "7d", "30d"]);
      PATH_CAPS = /* @__PURE__ */ new Map([
        [`${PREFIX}sandboxes`, "sandbox.list"],
        [`${PREFIX}inspect`, "sandbox.inspect"],
        [`${PREFIX}processes`, "sandbox.processes"],
        [`${PREFIX}lifecycle`, "sandbox.lifecycle"],
        [`${PREFIX}operations`, "sandbox.operations"],
        [`${PREFIX}status`, "dnls.status"],
        [`${PREFIX}control`, "dnls.control"],
        [`${PREFIX}logs`, "dnls.logs"]
      ]);
      CONTROL_ACTIONS = /* @__PURE__ */ new Set(["takeover", "release"]);
      assertSandboxId = (sandboxId) => {
        if (typeof sandboxId !== "string" || !SANDBOX_ID.test(sandboxId)) {
          refuse("target", "a sandboxId uuid is required");
        }
      };
    }
  });

  // src/client/i18n.js
  var i18n_exports = {};
  __export(i18n_exports, {
    copyFor: () => copyFor,
    fill: () => fill
  });
  function copyFor(language) {
    return language === "zh" ? ZH : EN;
  }
  function fill(template, params) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ""));
  }
  var EN, ZH;
  var init_i18n = __esm({
    "src/client/i18n.js"() {
      EN = {
        localeTag: "en",
        typeLabel: "Sandboxes",
        typeDescription: "Managed local sandboxes: overview and lifecycle control.",
        overview: "Overview",
        control: "Control",
        loading: "Loading\u2026",
        refresh: "Refresh",
        retry: "Retry",
        failed: "Request failed",
        empty: "No managed sandboxes are visible to this session.",
        emptyTitle: "No sandboxes",
        emptyHint: "Create one from an installed profile to get started.",
        pick: "Select a sandbox to control it",
        back: "Back to sandboxes",
        backToMonitor: "Back to resource monitor",
        allObjects: "All",
        lastMinuteHint: "Last complete minute \xB7 Used / allocated. A dash means no reading.",
        allocation: "Allocated: {cpu} cores \xB7 {memory}",
        searchPlaceholder: "Filter sandboxes",
        create: "Create sandbox",
        createTitle: "Create a sandbox",
        createName: "Name",
        createProfile: "Profile",
        createSubmit: "Create",
        creating: "Creating\u2026",
        noProfiles: "No installable profiles were listed.",
        profileNotReady: "not ready",
        listShort: "{shown}/{total} visible",
        listPartial: "scope incomplete",
        fieldName: "Name",
        fieldProfile: "Profile",
        fieldEnv: "Environment",
        fieldState: "Observed state",
        fieldRevision: "Revision",
        fieldServices: "Services",
        fieldGeneration: "Generation",
        fieldSandboxId: "Sandbox id",
        desiredRev: "desired",
        appliedRev: "applied",
        health: "Health",
        observedAt: "Observed at",
        opLatest: "Latest operation",
        none: "\u2014",
        // detail tabs
        tabOverview: "Resource monitor",
        tabServices: "Services & tools",
        tabSettings: "Settings",
        // overview tab
        resources: "Resources",
        resCpus: "CPUs",
        resMemory: "Memory",
        usageStates: "States",
        usageMemory: "Memory",
        usageCpu: "CPU",
        stateRunning: "running",
        stateStopped: "stopped",
        stateFailed: "failed",
        stateMissing: "missing",
        expected: "expected",
        valid: "valid",
        mean: "mean",
        peak: "peak",
        details: "Details",
        deployment: "Deployment",
        appliedDigest: "Image digest",
        appliedVerified: "Verified at",
        network: "Network",
        netGateway: "Host gateway",
        netAddress: "Container address",
        storage: "Storage",
        storeVolume: "State volume proven",
        processes: "Show processes",
        processesHide: "Hide processes",
        processesEmpty: "No guest processes reported.",
        // lifecycle
        start: "Start",
        stop: "Stop",
        restart: "Restart",
        recreate: "Recreate",
        remove: "Remove",
        confirmTitle: "Confirm {action}",
        confirmBody: "Run {action} on sandbox {name}? This interrupts its terminals and in-flight work; the state volume is preserved.",
        confirmBodyRemove: "Remove sandbox {name}? The record is destroyed; the state volume on disk is kept, not wiped.",
        confirmGo: "Confirm",
        cancel: "Cancel",
        close: "Close",
        // activity
        activity: "Activity",
        opAccepted: "Operation accepted",
        opState: "Operation {operationId}: {state}",
        opRecheck: "Recheck operation",
        opPending: "pending \u2014 press recheck; the request is never resent automatically",
        // services tab
        servicePublication: "Host publication",
        serviceHealth: "Probe",
        engineProbe: "Engine",
        engineState: "Engine state",
        bridgeState: "Bridge",
        engineUnavailable: "Engine status is not announced for this sandbox.",
        openWorkspace: "Open design workspace",
        openWorkspaceHint: "Select the same sandbox inside Kitesurf.",
        workspaceMissing: "The Kitesurf tab type is not installed.",
        humanHold: "Manual control",
        humanHoldActive: "held by an operator",
        humanHoldFree: "free for writers",
        takeover: "Take over",
        release: "Release",
        terminals: "Terminals",
        terminalsList: "List terminals",
        terminalsEmpty: "No live terminals on this sandbox.",
        terminalsDenied: "Terminals are unavailable under this shared identity.",
        terminalCreate: "New terminal",
        terminalCreateFor: "New {service} terminal",
        terminalOpen: "Open",
        terminalClose: "Close",
        terminalCloseConfirm: "Close terminal {id}? Its worker is reaped.",
        terminalUnavailable: "No terminal tab type is registered to open it.",
        // settings tab
        config: "Desired resources",
        configCpus: "CPUs",
        configMemory: "Memory (MiB)",
        configSave: "Save desired resources",
        configSaved: "Saved revision {revision} \u2014 apply it with Recreate when ready.",
        configUnobserved: "not configured",
        idle: "Idle policy",
        idleMinutes: "Idle timeout (minutes)",
        idleSave: "Save idle policy",
        idleSaved: "Idle policy saved.",
        danger: "Danger zone",
        recreateConfirmTitle: "Recreate sandbox",
        recreateConfirmBody: "Recreate {name}? The container is replaced and verified; terminals and in-flight work are interrupted. The state volume is preserved.",
        recreateAcknowledge: "I understand the sandbox will be replaced",
        removeConfirmTitle: "Remove sandbox",
        removeConfirmBody: "Remove {name}? Its record and live container go away; the state volume on disk is kept.",
        removeAcknowledge: "I understand the record is destroyed",
        apply: "Apply",
        // dashboard
        fleetTitle: "Sandbox overview",
        fleetStats: "{running} running \xB7 {stopped} stopped \xB7 {attention} need attention",
        faceUnverified: "not yet verified",
        faceUnverifiedHint: "Observation pending \u2014 state unverified",
        revPending: "Saved revision {rev} awaits deployment verification.",
        revisionPair: "Applied revision {applied} \xB7 Saved revision {saved}. Recreate to apply.",
        reviewSettings: "Review settings",
        saveNoChange: "Saving does not change the running configuration.",
        profileSeats: "{count} visible / {limit} profile slots",
        guestProcesses: "Guest processes",
        draftInvalid: "Enter a whole number",
        serviceColumn: "Service",
        workbenchTitle: "Sandbox workbench",
        envKicker: "Environment / {env}",
        visibleWord: "visible",
        faceRunning: "Operating \u2014 live sampling",
        faceStopped: "Stopped",
        samplingStopped: "Sampling stopped",
        lastMinute: "last completed minute",
        unknown: "\u2014",
        coresUnit: "cores",
        pendingConfig: "Saved configuration pending apply",
        servicesVerified: "verified services",
        chartMean: "mean",
        chartPeak: "peak",
        samplesWord: "samples",
        noSamples: "No samples in this window.",
        chartFrom: "from",
        chartTo: "to",
        unpublished: "unpublished",
        cfgPendingCpu: "CPU: allocated {cur} cores, saved {saved} cores \u2014 not yet applied",
        cfgPendingMem: "Memory: allocated {cur}, saved {saved} \u2014 not yet applied",
        allocated: "allocated",
        measured: "measured",
        opStates: { accepted: "accepted", running: "running", succeeded: "succeeded", failed: "failed", indeterminate: "indeterminate", cancelled: "cancelled" },
        fleetAttention: "Needs attention",
        healthUnverified: "Service health not yet verified",
        opLine: "{action} \xB7 {state}",
        opIdLine: "Operation {operationId}",
        timeline: "Recent operations",
        guestCwd: "Guest cwd",
        protocol: "Protocol",
        persistence: "Persistence",
        persistVolume: "State volume persists across recreate",
        stateUnknown: "unknown",
        stateCreating: "creating",
        stateStarting: "starting",
        idleHint: "leave blank to keep the current policy",
        startConfirmTitle: "Start sandbox",
        startConfirmBody: "Start {name} and resume its declared services?",
        stopConfirmTitle: "Stop sandbox",
        restartConfirmTitle: "Restart sandbox",
        lifecycleAcknowledge: "I understand this interrupts terminals and in-flight work",
        closeConfirmTitle: "Close terminal",
        searchMiss: "No sandboxes match the filter.",
        clearFilter: "Clear filter",
        configNotAuthorized: "read-only \u2014 desired configuration is not authorized for this principal",
        usageNotAuthorized: "usage history is not authorized for this principal",
        capacity: "Capacity",
        opsOlder: "Older operations",
        readLogs: "Read logs",
        logsTitle: "Engine logs",
        procsTruncated: "list truncated by the provider",
        readOnly: "read-only",
        sessionRequired: "This pane needs a mounted session."
      };
      ZH = {
        localeTag: "zh-CN",
        typeLabel: "\u6C99\u7BB1",
        typeDescription: "\u6258\u7BA1\u672C\u5730\u6C99\u7BB1\uFF1A\u603B\u89C8\u4E0E\u751F\u547D\u5468\u671F\u63A7\u5236\u3002",
        overview: "\u603B\u89C8",
        control: "\u63A7\u5236",
        loading: "\u52A0\u8F7D\u4E2D\u2026",
        refresh: "\u5237\u65B0",
        retry: "\u91CD\u8BD5",
        failed: "\u8BF7\u6C42\u5931\u8D25",
        empty: "\u5F53\u524D\u4F1A\u8BDD\u770B\u4E0D\u5230\u4EFB\u4F55\u6258\u7BA1\u6C99\u7BB1\u3002",
        emptyTitle: "\u6682\u65E0\u6C99\u7BB1",
        emptyHint: "\u4ECE\u5DF2\u5B89\u88C5\u7684 profile \u521B\u5EFA\u4E00\u4E2A\u5373\u53EF\u5F00\u59CB\u3002",
        pick: "\u9009\u62E9\u4E00\u4E2A\u6C99\u7BB1\u540E\u8FDB\u884C\u63A7\u5236",
        back: "\u8FD4\u56DE\u6C99\u7BB1\u5217\u8868",
        backToMonitor: "\u8FD4\u56DE\u8D44\u6E90\u76D1\u63A7",
        allObjects: "\u5168\u90E8",
        lastMinuteHint: "\u6700\u8FD1\u4E00\u4E2A\u5B8C\u6574\u5206\u949F \xB7 \u5B9E\u6D4B\u7528\u91CF / \u5206\u914D\u91CF\uFF1B\u6A2A\u7EBF\u8868\u793A\u6CA1\u6709\u8BFB\u6570\u3002",
        allocation: "\u5F53\u524D\u5206\u914D\uFF1A{cpu} \u6838 \xB7 {memory}",
        searchPlaceholder: "\u7B5B\u9009\u6C99\u7BB1",
        create: "\u521B\u5EFA\u6C99\u7BB1",
        createTitle: "\u521B\u5EFA\u6C99\u7BB1",
        createName: "\u540D\u79F0",
        createProfile: "Profile",
        createSubmit: "\u521B\u5EFA",
        creating: "\u521B\u5EFA\u4E2D\u2026",
        noProfiles: "\u6CA1\u6709\u5217\u51FA\u53EF\u5B89\u88C5\u7684 profile\u3002",
        profileNotReady: "\u672A\u5C31\u7EEA",
        listShort: "\u53EF\u89C1 {shown}/{total}",
        listPartial: "\u8303\u56F4\u4E0D\u5B8C\u6574",
        fieldName: "\u540D\u79F0",
        fieldProfile: "Profile",
        fieldEnv: "\u73AF\u5883",
        fieldState: "\u89C2\u6D4B\u72B6\u6001",
        fieldRevision: "\u4FEE\u8BA2",
        fieldServices: "\u670D\u52A1",
        fieldGeneration: "\u4E16\u4EE3",
        fieldSandboxId: "\u6C99\u7BB1 ID",
        desiredRev: "\u671F\u671B",
        appliedRev: "\u5DF2\u5E94\u7528",
        health: "\u5065\u5EB7\u5EA6",
        observedAt: "\u89C2\u6D4B\u65F6\u95F4",
        opLatest: "\u6700\u8FD1\u64CD\u4F5C",
        none: "\u2014",
        tabOverview: "\u8D44\u6E90\u76D1\u63A7",
        tabServices: "\u670D\u52A1\u4E0E\u5DE5\u5177",
        tabSettings: "\u8BBE\u7F6E",
        resources: "\u8D44\u6E90",
        resCpus: "CPU \u6838\u6570",
        resMemory: "\u5185\u5B58",
        usageStates: "\u72B6\u6001\u5206\u5E03",
        usageMemory: "\u5185\u5B58",
        usageCpu: "CPU",
        stateRunning: "\u8FD0\u884C",
        stateStopped: "\u505C\u6B62",
        stateFailed: "\u5931\u8D25",
        stateMissing: "\u7F3A\u5931",
        expected: "\u5E94\u6709",
        valid: "\u6709\u6548",
        mean: "\u5747\u503C",
        peak: "\u5CF0\u503C",
        details: "\u8BE6\u60C5",
        deployment: "\u90E8\u7F72",
        appliedDigest: "\u955C\u50CF\u6458\u8981",
        appliedVerified: "\u9A8C\u8BC1\u65F6\u95F4",
        network: "\u7F51\u7EDC",
        netGateway: "\u5BBF\u4E3B\u7F51\u5173",
        netAddress: "\u5BB9\u5668\u5730\u5740",
        storage: "\u5B58\u50A8",
        storeVolume: "\u72B6\u6001\u5377\u5DF2\u8BC1\u5B9E",
        processes: "\u67E5\u770B\u8FDB\u7A0B",
        processesHide: "\u6536\u8D77\u8FDB\u7A0B",
        processesEmpty: "\u6CA1\u6709\u6765\u5BBE\u8FDB\u7A0B\u8BB0\u5F55\u3002",
        start: "\u542F\u52A8",
        stop: "\u505C\u6B62",
        restart: "\u91CD\u542F",
        recreate: "\u91CD\u5EFA",
        remove: "\u79FB\u9664",
        confirmTitle: "\u786E\u8BA4{action}",
        confirmBody: "\u5BF9\u6C99\u7BB1 {name} \u6267\u884C {action}\uFF1F\u4F1A\u4E2D\u65AD\u5176\u7EC8\u7AEF\u4E0E\u8FDB\u884C\u4E2D\u7684\u5DE5\u4F5C\uFF0C\u72B6\u6001\u5377\u4FDD\u7559\u3002",
        confirmBodyRemove: "\u79FB\u9664\u6C99\u7BB1 {name}\uFF1F\u8BB0\u5F55\u5C06\u88AB\u9500\u6BC1\uFF0C\u78C1\u76D8\u4E0A\u7684\u72B6\u6001\u5377\u4FDD\u7559\u4E0D\u64E6\u9664\u3002",
        confirmGo: "\u786E\u8BA4",
        cancel: "\u53D6\u6D88",
        close: "\u5173\u95ED",
        activity: "\u6D3B\u52A8",
        opAccepted: "\u64CD\u4F5C\u5DF2\u53D7\u7406",
        opState: "\u64CD\u4F5C {operationId}\uFF1A{state}",
        opRecheck: "\u91CD\u67E5\u64CD\u4F5C",
        opPending: "\u5904\u7406\u4E2D\u2014\u2014\u8BF7\u70B9\u91CD\u67E5\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u8BF7\u6C42",
        servicePublication: "\u5BBF\u4E3B\u673A\u53D1\u5E03",
        serviceHealth: "\u63A2\u9488",
        engineProbe: "\u5F15\u64CE",
        engineState: "\u5F15\u64CE\u72B6\u6001",
        bridgeState: "\u6865\u63A5",
        engineUnavailable: "\u6B64\u6C99\u7BB1\u672A\u5BA3\u544A\u5F15\u64CE\u72B6\u6001\u9762\u3002",
        openWorkspace: "\u6253\u5F00\u8BBE\u8BA1\u5DE5\u4F5C\u533A",
        openWorkspaceHint: "\u5728 Kitesurf \u4E2D\u663E\u5F0F\u9009\u62E9\u540C\u4E00\u4E2A\u6C99\u7BB1\u3002",
        workspaceMissing: "\u672A\u5B89\u88C5 Kitesurf \u9875\u7B7E\u7C7B\u578B\u3002",
        humanHold: "\u4EBA\u5DE5\u63A5\u7BA1",
        humanHoldActive: "\u5DF2\u7531\u64CD\u4F5C\u8005\u63A5\u7BA1",
        humanHoldFree: "\u5BF9\u5199\u5165\u65B9\u5F00\u653E",
        takeover: "\u63A5\u7BA1",
        release: "\u91CA\u653E",
        terminals: "\u7EC8\u7AEF",
        terminalsList: "\u5217\u51FA\u7EC8\u7AEF",
        terminalsEmpty: "\u6B64\u6C99\u7BB1\u4E0A\u6CA1\u6709\u5B58\u6D3B\u7EC8\u7AEF\u3002",
        terminalsDenied: "\u5171\u4EAB\u8EAB\u4EFD\u4E0B\u7EC8\u7AEF\u4E0D\u53EF\u7528\u3002",
        terminalCreate: "\u65B0\u5EFA\u7EC8\u7AEF",
        terminalCreateFor: "\u65B0\u5EFA {service} \u7EC8\u7AEF",
        terminalOpen: "\u6253\u5F00",
        terminalClose: "\u5173\u95ED",
        terminalCloseConfirm: "\u5173\u95ED\u7EC8\u7AEF {id}\uFF1F\u5176 worker \u5C06\u88AB\u56DE\u6536\u3002",
        terminalUnavailable: "\u6CA1\u6709\u53EF\u6253\u5F00\u5B83\u7684\u7EC8\u7AEF\u9875\u7B7E\u7C7B\u578B\u3002",
        config: "\u671F\u671B\u8D44\u6E90",
        configCpus: "CPU \u6838\u6570",
        configMemory: "\u5185\u5B58\uFF08MiB\uFF09",
        configSave: "\u4FDD\u5B58\u671F\u671B\u8D44\u6E90",
        configSaved: "\u5DF2\u4FDD\u5B58\u4FEE\u8BA2 {revision}\u2014\u2014\u5C31\u7EEA\u540E\u7528\u91CD\u5EFA\u5E94\u7528\u3002",
        configUnobserved: "\u672A\u914D\u7F6E",
        idle: "\u95F2\u7F6E\u7B56\u7565",
        idleMinutes: "\u95F2\u7F6E\u8D85\u65F6\uFF08\u5206\u949F\uFF09",
        idleSave: "\u4FDD\u5B58\u95F2\u7F6E\u7B56\u7565",
        idleSaved: "\u95F2\u7F6E\u7B56\u7565\u5DF2\u4FDD\u5B58\u3002",
        danger: "\u5371\u9669\u533A",
        recreateConfirmTitle: "\u91CD\u5EFA\u6C99\u7BB1",
        recreateConfirmBody: "\u91CD\u5EFA {name}\uFF1F\u5BB9\u5668\u5C06\u88AB\u66FF\u6362\u5E76\u91CD\u65B0\u9A8C\u8BC1\uFF0C\u7EC8\u7AEF\u4E0E\u8FDB\u884C\u4E2D\u7684\u5DE5\u4F5C\u4F1A\u4E2D\u65AD\uFF0C\u72B6\u6001\u5377\u4FDD\u7559\u3002",
        recreateAcknowledge: "\u6211\u4E86\u89E3\u6C99\u7BB1\u5C06\u88AB\u66FF\u6362",
        removeConfirmTitle: "\u79FB\u9664\u6C99\u7BB1",
        removeConfirmBody: "\u79FB\u9664 {name}\uFF1F\u5176\u8BB0\u5F55\u4E0E\u8FD0\u884C\u4E2D\u7684\u5BB9\u5668\u5C06\u88AB\u79FB\u9664\uFF0C\u78C1\u76D8\u4E0A\u7684\u72B6\u6001\u5377\u4FDD\u7559\u3002",
        removeAcknowledge: "\u6211\u4E86\u89E3\u8BB0\u5F55\u5C06\u88AB\u9500\u6BC1",
        apply: "\u5E94\u7528",
        // dashboard
        fleetTitle: "\u6C99\u7BB1\u603B\u89C8",
        fleetStats: "{running} \u8FD0\u884C \xB7 {stopped} \u505C\u6B62 \xB7 {attention} \u9700\u8981\u6CE8\u610F",
        faceUnverified: "\u5C1A\u672A\u9A8C\u8BC1",
        faceUnverifiedHint: "\u7B49\u5F85\u89C2\u6D4B\u2014\u2014\u72B6\u6001\u672A\u9A8C\u8BC1",
        revPending: "\u5DF2\u4FDD\u5B58\u4FEE\u8BA2 {rev} \u7B49\u5F85\u90E8\u7F72\u9A8C\u8BC1\u3002",
        revisionPair: "\u5DF2\u5E94\u7528\u4FEE\u8BA2 {applied} \xB7 \u5DF2\u4FDD\u5B58\u4FEE\u8BA2 {saved}\u3002\u91CD\u5EFA\u540E\u751F\u6548\u3002",
        reviewSettings: "\u67E5\u770B\u914D\u7F6E",
        saveNoChange: "\u4FDD\u5B58\u4E0D\u6539\u53D8\u5F53\u524D\u8FD0\u884C\u914D\u7F6E\u3002",
        profileSeats: "\u53EF\u89C1 {count} \u4E2A\uFF0C\u4E0A\u9650 {limit} \u4E2A",
        guestProcesses: "\u6765\u5BBE\u8FDB\u7A0B",
        draftInvalid: "\u8BF7\u8F93\u5165\u6574\u6570",
        serviceColumn: "\u670D\u52A1",
        workbenchTitle: "\u6C99\u7BB1\u5DE5\u4F5C\u53F0",
        envKicker: "\u8FD0\u884C\u73AF\u5883 / {env}",
        visibleWord: "\u53EF\u89C1",
        faceRunning: "\u8FD0\u884C\u4E2D\u2014\u2014\u5B9E\u65F6\u91C7\u6837",
        faceStopped: "\u5DF2\u505C\u6B62",
        samplingStopped: "\u5DF2\u505C\u6B62\u91C7\u6837",
        lastMinute: "\u6700\u8FD1\u4E00\u4E2A\u5B8C\u6574\u5206\u949F",
        unknown: "\u2014",
        coresUnit: "\u6838",
        pendingConfig: "\u6709\u5F85\u5E94\u7528\u7684\u914D\u7F6E",
        servicesVerified: "\u5DF2\u9A8C\u8BC1\u670D\u52A1",
        chartMean: "\u5747\u503C",
        chartPeak: "\u5CF0\u503C",
        samplesWord: "\u4E2A\u91C7\u6837",
        noSamples: "\u6B64\u7A97\u53E3\u6CA1\u6709\u91C7\u6837\u3002",
        chartFrom: "\u4ECE",
        chartTo: "\u5230",
        unpublished: "\u672A\u53D1\u5E03",
        cfgPendingCpu: "CPU\uFF1A\u5F53\u524D {cur} \u6838\uFF0C\u5DF2\u4FDD\u5B58 {saved} \u6838\uFF0C\u5C1A\u672A\u5E94\u7528",
        cfgPendingMem: "\u5185\u5B58\uFF1A\u5F53\u524D {cur}\uFF0C\u5DF2\u4FDD\u5B58 {saved}\uFF0C\u5C1A\u672A\u5E94\u7528",
        allocated: "\u5206\u914D",
        measured: "\u5B9E\u6D4B",
        opStates: { accepted: "\u5DF2\u63A5\u53D7", running: "\u6267\u884C\u4E2D", succeeded: "\u6210\u529F", failed: "\u5931\u8D25", indeterminate: "\u7ED3\u679C\u672A\u77E5", cancelled: "\u5DF2\u53D6\u6D88" },
        fleetAttention: "\u9700\u8981\u5173\u6CE8",
        healthUnverified: "\u670D\u52A1\u5065\u5EB7\u5C1A\u672A\u9A8C\u8BC1",
        opLine: "{action} \xB7 {state}",
        opIdLine: "\u64CD\u4F5C {operationId}",
        timeline: "\u6700\u8FD1\u64CD\u4F5C",
        guestCwd: "\u6765\u5BBE\u5DE5\u4F5C\u76EE\u5F55",
        protocol: "\u534F\u8BAE",
        persistence: "\u6301\u4E45\u5316",
        persistVolume: "\u72B6\u6001\u5377\u5728\u91CD\u5EFA\u95F4\u4FDD\u7559",
        stateUnknown: "\u672A\u77E5",
        stateCreating: "\u521B\u5EFA\u4E2D",
        stateStarting: "\u542F\u52A8\u4E2D",
        idleHint: "\u7559\u7A7A\u5219\u4FDD\u7559\u5F53\u524D\u7B56\u7565",
        startConfirmTitle: "\u542F\u52A8\u6C99\u7BB1",
        startConfirmBody: "\u542F\u52A8 {name} \u5E76\u6062\u590D\u5176\u58F0\u660E\u7684\u670D\u52A1\uFF1F",
        stopConfirmTitle: "\u505C\u6B62\u6C99\u7BB1",
        restartConfirmTitle: "\u91CD\u542F\u6C99\u7BB1",
        lifecycleAcknowledge: "\u6211\u4E86\u89E3\u8FD9\u4F1A\u4E2D\u65AD\u7EC8\u7AEF\u4E0E\u8FDB\u884C\u4E2D\u7684\u5DE5\u4F5C",
        closeConfirmTitle: "\u5173\u95ED\u7EC8\u7AEF",
        searchMiss: "\u6CA1\u6709\u5339\u914D\u7B5B\u9009\u7684\u6C99\u7BB1\u3002",
        clearFilter: "\u6E05\u9664\u7B5B\u9009",
        configNotAuthorized: "\u53EA\u8BFB\u2014\u2014\u6B64 principal \u672A\u83B7\u671F\u671B\u914D\u7F6E\u6388\u6743",
        usageNotAuthorized: "\u6B64 principal \u672A\u83B7\u7528\u91CF\u5386\u53F2\u6388\u6743",
        capacity: "\u5BB9\u91CF",
        opsOlder: "\u66F4\u65E9\u7684\u64CD\u4F5C",
        readLogs: "\u8BFB\u53D6\u65E5\u5FD7",
        logsTitle: "\u5F15\u64CE\u65E5\u5FD7",
        procsTruncated: "provider \u5DF2\u622A\u65AD\u6B64\u5217\u8868",
        readOnly: "\u53EA\u8BFB",
        sessionRequired: "\u6B64\u9762\u677F\u9700\u8981\u4E00\u4E2A\u5DF2\u6302\u8F7D\u7684\u4F1A\u8BDD\u3002"
      };
    }
  });

  // src/client/format.js
  var format_exports = {};
  __export(format_exports, {
    DASH: () => DASH,
    formatBytes: () => formatBytes,
    formatCores: () => formatCores,
    serviceAddress: () => serviceAddress,
    serviceLine: () => serviceLine,
    serviceSummary: () => serviceSummary
  });
  function formatBytes(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return null;
    if (value >= 1 << 30) return `${(value / (1 << 30)).toFixed(1)} GiB`;
    if (value >= 1 << 20) return `${(value / (1 << 20)).toFixed(1)} MiB`;
    return `${Math.round(value / 1024)} KiB`;
  }
  function formatCores(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return null;
    return `${Number(value).toFixed(3)} cores`;
  }
  function serviceAddress(service) {
    if (service?.published !== true) return null;
    if (typeof service.hostAddress !== "string" || service.hostAddress === "") return null;
    if (!Number.isInteger(service.hostPort)) return null;
    return `${service.hostAddress}:${service.hostPort}`;
  }
  function serviceLine(service) {
    if (!service || typeof service.serviceId !== "string") return null;
    const head = `${service.serviceId}:${service.containerPort}${service.protocol ? ` ${service.protocol}` : ""}`;
    const addr = serviceAddress(service);
    return [head, addr ? `\u2192 ${addr}` : null, service.health ?? null].filter(Boolean).join(" ");
  }
  function serviceSummary(services) {
    if (!Array.isArray(services)) return "";
    return services.map((entry) => typeof entry === "string" ? entry : entry?.serviceId).filter((id) => typeof id === "string" && id.length > 0).join(", ");
  }
  var DASH;
  var init_format = __esm({
    "src/client/format.js"() {
      DASH = "\u2014";
    }
  });

  // src/host/terminal-resource.js
  var terminal_resource_exports = {};
  __export(terminal_resource_exports, {
    managementAvailability: () => managementAvailability,
    terminalAddress: () => terminalAddress,
    terminalGesture: () => terminalGesture
  });
  function terminalAddress({ envId, sandboxId, terminalId }) {
    if (![envId, sandboxId, terminalId].every((v) => typeof v === "string") || !ENV.test(envId) || !UUID.test(sandboxId) || !UUID.test(terminalId)) throw new TypeError("invalid sandbox terminal reference");
    return `${prefix}${envId}/${sandboxId}/${terminalId}`;
  }
  function terminalGesture({ envId, sandboxId, paneId, openId, service }, { create, canOpen, navigate }) {
    if (!ENV.test(envId) || !UUID.test(sandboxId) || !paneId || !openId) throw new TypeError("invalid create intent");
    let issued;
    const issue = () => issued ??= Promise.resolve().then(async () => {
      const ref = await create({ sandboxId, paneId, openId, ...service === void 0 ? {} : { service } });
      if (ref?.sandboxId !== sandboxId) throw new Error("sandbox reference mismatch");
      return terminalAddress({ envId, sandboxId, terminalId: ref.terminalId });
    });
    return {
      createOnly: issue,
      async open() {
        if (!issued && canOpen() !== true) return { state: "handler-unavailable" };
        const address = await issue();
        try {
          if (canOpen() !== true || await navigate(address) === false) return { state: "created-not-connected", address };
          return { state: "navigation-requested", address };
        } catch {
          return { state: "created-not-connected", address };
        }
      }
    };
  }
  var ENV, UUID, prefix, managementAvailability;
  var init_terminal_resource = __esm({
    "src/host/terminal-resource.js"() {
      ENV = /^[a-z][a-z0-9-]{0,15}$/;
      UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      prefix = "dsh-resource://sandbox-terminal/";
      managementAvailability = () => ({
        available: false,
        managementApi: true,
        dependency: "\u5BBF\u4E3B\u4F9D\u8D56\uFF1A\u5F53\u524D [dsh\u5DE5\u4F5C\u53F0] \u7684\u9875\u7B7E\u9700\u8981\u5DF2\u6302\u8F7D\u7684 session\uFF0C\u4E0D\u80FD\u63D0\u4F9B\u65E0 session \u7684\u6C99\u7BB1\u9875\u3002"
      });
    }
  });

  // src/client/instruments.jsx
  var instruments_exports = {};
  __export(instruments_exports, {
    MetricChart: () => MetricChart,
    SandboxRow: () => SandboxRow
  });
  function MetricChart({ title, bins, unit, range, summary, tone, copy }) {
    const W = 320;
    const H = 64;
    const start = bins.length ? num(bins[0].at) ?? Date.parse(bins[0]?.at ?? "") : null;
    const end = num(summary?.end) ?? null;
    const peak = num(summary?.peak);
    const mean = num(summary?.mean);
    const valid = num(summary?.valid) ?? bins.filter((b) => num(b.value) != null).length;
    const expected = num(summary?.expected) ?? bins.length;
    const span = start != null && end != null && end > start ? end - start : null;
    const scale = peak != null && peak > 0 ? peak : 1;
    const fmt = (v) => unit === "MiB" ? `${Math.round(v)}` : Number(v).toFixed(2);
    const aria = `${title} ${range}: ${valid}/${expected} ${copy.samplesWord}`;
    return h8(
      React13.Fragment,
      null,
      h8(
        "div",
        null,
        title,
        " \xB7 ",
        mean != null ? h8("span", null, `${copy.chartMean} ${fmt(mean)} ${unit}`) : null,
        peak != null ? h8("span", null, ` \xB7 ${copy.chartPeak} ${fmt(peak)} ${unit}`) : null,
        h8(primitives2.Tag, { tone: "quiet" }, `${valid}/${expected} ${copy.samplesWord}`)
      ),
      bins.length === 0 || span == null || !bins.some((b) => num(b.value) !== null) ? h8("p", null, copy.noSamples) : h8(
        React13.Fragment,
        null,
        h8(
          "svg",
          {
            width: "100%",
            height: 32,
            viewBox: `0 0 ${W} ${H}`,
            preserveAspectRatio: "none",
            role: "img",
            "aria-label": aria
          },
          h8("line", { x1: 0, y1: H - 1, x2: W, y2: H - 1, stroke: "var(--dsw-alias-border-l2)" }),
          bins.map((bin, i) => {
            const at = num(bin.at) ?? Date.parse(bin.at ?? "");
            const minutes = num(bin.minutes) ?? 1;
            if (!Number.isFinite(at)) return null;
            const x = (at - start) / span * W;
            const w = Math.max(1, minutes * 6e4 / span * W);
            const v = num(bin.value);
            if (v == null) return null;
            const height = Math.max(2, Math.round(v / scale * (H - 14)));
            return h8("rect", {
              key: at ?? i,
              x,
              y: v === 0 ? H - 2 : H - 1 - height,
              width: Math.max(1, w - 1),
              height: v === 0 ? 1 : height,
              // a real zero is a baseline hairline
              fill: tone
            });
          })
        )
      )
    );
  }
  function SandboxRow({ entry, copy, onSelect, disabled, formatBytes: formatBytes3, stateLabel: stateLabel2 }) {
    const pending = Number.isInteger(entry.desiredRevision) && Number.isInteger(entry.appliedRevision) && entry.desiredRevision !== entry.appliedRevision;
    const running = entry.observedState === "running";
    const note = pending ? copy.pendingConfig : ["failed", "indeterminate"].includes(entry.operation?.state) ? copy.opStates[entry.operation.state] : null;
    const alloc = entry.resources ?? {};
    const cpu = num(entry.lastMinute?.cpuCores);
    const meter = (label, used, max) => Number.isFinite(used) && Number.isFinite(max) && max > 0 && used <= max ? h8("div", null, h8("meter", { min: 0, max, value: used, "aria-label": label })) : null;
    return h8(
      "tr",
      null,
      h8(
        "td",
        null,
        h8(Button4, {
          variant: "ghost",
          size: "md",
          "data-dnls-row": entry.sandboxId,
          icon: h8(primitives2.StateDot, { state: running ? "done" : entry.observedState === "stopped" ? "idle" : "warning" }),
          disabled,
          onClick: () => onSelect(entry.sandboxId)
        }, entry.name ?? entry.sandboxId),
        h8(
          "div",
          null,
          h8(primitives2.Tag, { tone: "quiet" }, stateLabel2(entry.observedState)),
          note ? h8(primitives2.Tag, { tone: "warning" }, note) : null,
          running && entry.services?.some((s) => s.published === true) ? h8(
            primitives2.Tag,
            { tone: "quiet" },
            `${copy.servicesVerified} ${entry.services.filter((s) => s.published === true).length}`
          ) : null
        )
      ),
      h8(
        "td",
        { align: "right" },
        `${cpu === null ? "\u2014" : Number(cpu.toFixed(2))} / ${alloc.cpus ?? "\u2014"}`,
        meter(copy.usageCpu, cpu, alloc.cpus)
      ),
      h8(
        "td",
        { align: "right" },
        `${formatBytes3(entry.lastMinute?.memoryBytes) ?? "\u2014"} / ${formatBytes3(alloc.memoryBytes) ?? "\u2014"}`,
        meter(copy.usageMemory, entry.lastMinute?.memoryBytes, alloc.memoryBytes)
      )
    );
  }
  var React13, primitives2, h8, Button4, num;
  var init_instruments = __esm({
    "src/client/instruments.jsx"() {
      React13 = __require("react");
      primitives2 = __require("@deepseek-ai/dsh-client-ui-primitives");
      h8 = React13.createElement;
      Button4 = primitives2.Button;
      num = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
    }
  });

  // src/client/index.jsx
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject
  });
  var React14 = __require("react");
  var primitives3 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var { Toolbar: Toolbar2, IconButton: IconButton2, EmptyState: EmptyState2, NanoTabs: NanoTabs2, NanoDialog: NanoDialog2, NANO_STYLES: NANO_STYLES2, PanelSection: PanelSection2 } = (init_dsh_nano_ui(), __toCommonJS(dsh_nano_ui_exports));
  var { createDnlsClient: createDnlsClient2, createTicket: createTicket2 } = (init_managed(), __toCommonJS(managed_exports));
  var { copyFor: copyFor2, fill: fill2 } = (init_i18n(), __toCommonJS(i18n_exports));
  var { formatBytes: formatBytes2, serviceAddress: serviceAddress2 } = (init_format(), __toCommonJS(format_exports));
  var { terminalAddress: terminalAddress2 } = (init_terminal_resource(), __toCommonJS(terminal_resource_exports));
  var { MetricChart: MetricChart2, SandboxRow: SandboxRow2 } = (init_instruments(), __toCommonJS(instruments_exports));
  var h9 = React14.createElement;
  var KIND = "dnls-sandbox";
  var Button5 = primitives3.Button;
  var RiskConfirmation = primitives3.RiskConfirmation;
  var DisclosureRow = primitives3.DisclosureRow;
  var InfoIcon = primitives3.IconInfoOutlineRegular;
  var STATE_KEYS = {
    running: "stateRunning",
    stopped: "stateStopped",
    failed: "stateFailed",
    missing: "stateMissing",
    creating: "stateCreating",
    starting: "stateStarting"
  };
  var stateLabel = (copy, state) => copy[STATE_KEYS[state]] ?? copy.stateUnknown;
  function Facts({ items }) {
    return h9("table", null, h9("tbody", null, items.map(({ label, value }) => h9("tr", { key: label }, h9("td", null, label), h9("td", null, value ?? "\u2014")))));
  }
  function tool(label, Icon, onClick, disabled = false) {
    return h9(IconButton2, { icon: Icon ? h9(Icon, { size: 16 }) : null, "aria-label": label, onClick, disabled });
  }
  function DnlsPane({ sessionId, copy, host }) {
    const [view, setView] = React14.useState("overview");
    const [phase, setPhase] = React14.useState("loading");
    const [error, setError] = React14.useState(null);
    const [rows, setRows] = React14.useState(null);
    const [total, setTotal] = React14.useState(null);
    const [complete, setComplete] = React14.useState(true);
    const [envIds, setEnvIds] = React14.useState(null);
    const [search, setSearch] = React14.useState("");
    const [fleetFilter, setFleetFilter] = React14.useState("all");
    const [selection, setSelection] = React14.useState(null);
    const [detail, setDetail] = React14.useState(null);
    const [detailError, setDetailError] = React14.useState(null);
    const [usageWindow, setUsageWindow] = React14.useState("24h");
    const [usageDenied, setUsageDenied] = React14.useState(false);
    const [procs, setProcs] = React14.useState(null);
    const [procsBusy, setProcsBusy] = React14.useState(false);
    const [confirm, setConfirm] = React14.useState(null);
    const [acknowledged, setAcknowledged] = React14.useState(false);
    const [receipt, setReceipt] = React14.useState(null);
    const [opBody, setOpBody] = React14.useState(null);
    const [busy, setBusy] = React14.useState(false);
    const [createOpen, setCreateOpen] = React14.useState(false);
    const [profiles, setProfiles] = React14.useState(null);
    const [profilesFailed, setProfilesFailed] = React14.useState(false);
    const [createName, setCreateName] = React14.useState("");
    const [createProfile, setCreateProfile] = React14.useState("");
    const [engine, setEngine] = React14.useState(null);
    const [hold, setHold] = React14.useState(null);
    const [terms, setTerms] = React14.useState(null);
    const [termBusy, setTermBusy] = React14.useState(false);
    const [detailsOpen, setDetailsOpen] = React14.useState(false);
    const [historyOpen, setHistoryOpen] = React14.useState(false);
    const [receiptOpen, setReceiptOpen] = React14.useState(false);
    const [detailTab, setDetailTab] = React14.useState("overview");
    const [settingsOpen, setSettingsOpen] = React14.useState(false);
    const [dangerOpen, setDangerOpen] = React14.useState(false);
    const [processSort, setProcessSort] = React14.useState({ field: "rssBytes", descending: true });
    const lastPick = React14.useRef(null);
    const root = React14.useRef(null);
    const [svcOpen, setSvcOpen] = React14.useState(null);
    const fmtTime = (iso) => {
      const ms = typeof iso === "number" ? iso : Date.parse(iso ?? "");
      if (!Number.isFinite(ms)) return "\u2014";
      try {
        return new Intl.DateTimeFormat(copy.localeTag ?? "en", { dateStyle: "short", timeStyle: "short" }).format(ms);
      } catch {
        return iso;
      }
    };
    const [cfgCpus, setCfgCpus] = React14.useState("");
    const [cfgMem, setCfgMem] = React14.useState("");
    const [idleMin, setIdleMin] = React14.useState("");
    const [settingsMsg, setSettingsMsg] = React14.useState(null);
    const [bootSeq, setBootSeq] = React14.useState(0);
    const [profileCaps, setProfileCaps] = React14.useState(/* @__PURE__ */ new Map());
    const [logs, setLogs] = React14.useState(null);
    const [logsBusy, setLogsBusy] = React14.useState(false);
    const channels = React14.useRef({});
    const clientRef = React14.useRef(null);
    const writeLock = React14.useRef(false);
    const nameId = React14.useId();
    const paneId = React14.useId();
    const ticket = (key) => {
      const map = channels.current;
      if (!map[key]) map[key] = createTicket2();
      return map[key].take();
    };
    const invalidate = (...keys) => {
      for (const key of keys) channels.current[key]?.take();
    };
    const killAll = () => {
      for (const channel of Object.values(channels.current)) channel.kill();
      channels.current = {};
    };
    const client = () => clientRef.current;
    const supports = (cap) => client()?.supports?.(cap) === true;
    const run = React14.useCallback(async (work, stale) => {
      try {
        await work();
      } catch (cause) {
        if (!stale || stale()) setError(cause);
      }
    }, []);
    const loadList = React14.useCallback(() => {
      const stale = ticket("list");
      setError(null);
      run(async () => {
        const list = await client().listSandboxes();
        if (!stale()) return;
        setRows(list.rows);
        setTotal(list.total);
        setComplete(list.complete !== false);
        setEnvIds((list.envs ?? []).map((e) => typeof e === "string" ? e : e?.envId).filter(Boolean));
      }, stale);
    }, [run]);
    React14.useEffect(() => {
      if (!sessionId) return void 0;
      channels.current = {};
      writeLock.current = false;
      setPhase("loading");
      setError(null);
      setRows(null);
      setTotal(null);
      setSelection(null);
      setView("overview");
      setSettingsOpen(false);
      setCreateOpen(false);
      setConfirm(null);
      setSearch("");
      setFleetFilter("all");
      setProfileCaps(/* @__PURE__ */ new Map());
      setDetail(null);
      setDetailError(null);
      setProcs(null);
      setProcsBusy(false);
      setEngine(null);
      setHold(null);
      setTerms(null);
      setTermBusy(false);
      setReceipt(null);
      setOpBody(null);
      setBusy(false);
      const instance = createDnlsClient2({});
      clientRef.current = instance;
      const stale = ticket("list");
      (async () => {
        try {
          await instance.discover();
          if (!stale()) return;
          const list = await instance.listSandboxes();
          if (!stale()) return;
          setRows(list.rows);
          setTotal(list.total);
          setComplete(list.complete !== false);
          setEnvIds((list.envs ?? []).map((e) => typeof e === "string" ? e : e?.envId).filter(Boolean));
          setPhase("ready");
          instance.listProfiles?.().then((list2) => {
            if (!stale()) return;
            setProfileCaps(new Map((list2 ?? []).map((p) => [p.id, p.maxInstances]).filter(([, v]) => Number.isInteger(v))));
          }).catch(() => {
          });
        } catch (cause) {
          if (stale()) {
            setError(cause);
            setPhase("failed");
          }
        }
      })();
      return () => {
        killAll();
        clientRef.current = null;
      };
    }, [sessionId, bootSeq, run]);
    function choose(sandboxId) {
      if (writeLock.current) return;
      const found = (rows ?? []).find((entry) => entry.sandboxId === sandboxId);
      if (!found) return;
      lastPick.current = found.sandboxId;
      invalidate("detail", "process", "operation", "profiles", "engine", "term", "settings", "logs");
      setSelection({ sandboxId: found.sandboxId, name: found.name ?? found.sandboxId, envId: found.envId });
      setDetailTab("overview");
      setSettingsOpen(false);
      setSvcOpen(null);
      setDetail(null);
      setDetailError(null);
      setProcs(null);
      setConfirm(null);
      setAcknowledged(false);
      setOpBody(null);
      setReceipt(null);
      setError(null);
      setProcsBusy(false);
      setEngine(null);
      setHold(null);
      setTerms(null);
      setTermBusy(false);
      setLogs(null);
      setLogsBusy(false);
      setDetailsOpen(false);
      setHistoryOpen(false);
      setSettingsMsg(null);
      setUsageDenied(false);
      setView("control");
    }
    function unchoose() {
      if (writeLock.current || opPending) return;
      invalidate("detail", "process", "operation", "engine", "term", "settings", "logs");
      setSelection(null);
      setDetail(null);
      setDetailError(null);
      setReceipt(null);
      setOpBody(null);
      setConfirm(null);
      setEngine(null);
      setHold(null);
      setTerms(null);
      setTermBusy(false);
      setLogs(null);
      setLogsBusy(false);
      setUsageDenied(false);
      setView("overview");
    }
    React14.useEffect(() => {
      if (view === "control") {
        root.current?.querySelector("[role=toolbar] button")?.focus();
        return;
      }
      if (view !== "overview" || !lastPick.current) return;
      const button = Array.from(root.current?.querySelectorAll("[data-dnls-row]") ?? []).find((el) => el.dataset.dnlsRow === lastPick.current);
      button?.focus();
      lastPick.current = null;
    }, [view]);
    const loadDetail = React14.useCallback(() => {
      if (!selection || !client()) return;
      const target = selection.sandboxId;
      const stale = ticket("detail");
      setDetail(null);
      setDetailError(null);
      setUsageDenied(false);
      setError(null);
      (async () => {
        try {
          let answer;
          try {
            answer = await client().inspect(target, { window: usageWindow });
          } catch (cause) {
            if (cause?.status !== 403) throw cause;
            answer = await client().inspect(target, { window: null });
            if (stale()) setUsageDenied(true);
          }
          if (!stale()) return;
          setDetail(answer);
        } catch (cause) {
          if (stale()) setDetailError(cause);
        }
      })();
    }, [selection?.sandboxId, usageWindow]);
    React14.useEffect(() => {
      if (selection && view === "control") loadDetail();
      return void 0;
    }, [selection?.sandboxId, view, usageWindow, loadDetail]);
    React14.useEffect(() => {
      const cfg = detail?.configuration;
      if (!cfg) return;
      setCfgCpus(cfg.overrides?.cpus != null ? String(cfg.overrides.cpus) : "");
      setCfgMem(cfg.overrides?.memoryBytes != null ? String(Math.round(cfg.overrides.memoryBytes / (1024 * 1024))) : "");
      setIdleMin(cfg.idleTimeoutMs != null ? String(Math.round(cfg.idleTimeoutMs / 6e4)) : "");
    }, [detail?.configuration]);
    function refresh() {
      if (phase === "failed") {
        setBootSeq((n) => n + 1);
        return;
      }
      if (view === "control" && selection) loadDetail();
      else loadList();
    }
    function submitLifecycle(action, { sandboxId, name, profileId, args } = {}) {
      if (writeLock.current) return;
      writeLock.current = true;
      const stale = ticket("write");
      setBusy(true);
      setError(null);
      run(async () => {
        const body = await client().lifecycle({
          action,
          requestId: crypto.randomUUID(),
          sandboxId,
          name,
          profileId,
          args
        });
        if (!stale()) return;
        invalidate("operation");
        const record = { operationId: body.operationId, sandboxId: sandboxId ?? body.sandboxId, action };
        setReceipt(record);
        setReceiptOpen(false);
        setConfirm(null);
        setAcknowledged(false);
        setCreateOpen(false);
        setSettingsOpen(false);
        setOpBody(body);
        loadList();
      }, stale).finally(() => {
        writeLock.current = false;
        if (stale()) setBusy(false);
      });
    }
    function recheck() {
      if (!receipt?.operationId || !receipt.sandboxId || !client()) return;
      const record = receipt;
      const stale = ticket("operation");
      run(async () => {
        const body = await client().readOperation(record.sandboxId, record.operationId);
        if (!stale()) return;
        setOpBody(body);
        if (body.state !== "succeeded") return;
        loadList();
        if (selection?.sandboxId === record.sandboxId && view === "control") {
          invalidate("process", "engine", "term", "logs");
          setProcs(null);
          setProcsBusy(false);
          setEngine(null);
          setHold(null);
          setTerms(null);
          setTermBusy(false);
          setLogs(null);
          setLogsBusy(false);
          loadDetail();
        }
      }, stale);
    }
    function loadLogs() {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("logs");
      setLogsBusy(true);
      setLogs(null);
      setError(null);
      (async () => {
        try {
          const body = await client().logs(target, { tail: 20 });
          if (!stale()) return;
          setLogs({ text: typeof body?.text === "string" ? body.text.slice(0, 64 * 1024) : "" });
        } catch (cause) {
          if (stale()) setLogs({ error: cause });
        } finally {
          if (stale()) setLogsBusy(false);
        }
      })();
    }
    function loadProcesses() {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("process");
      setProcsBusy(true);
      setError(null);
      run(async () => {
        const body = await client().processes(target);
        if (!stale()) return;
        setProcs(body);
      }, stale).finally(() => {
        if (stale()) setProcsBusy(false);
      });
    }
    function probeEngine() {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("engine");
      setEngine(null);
      setHold(null);
      setError(null);
      run(async () => {
        const status = await client().status(target);
        if (!stale()) return;
        setEngine(status);
        if (supports("dnls.control")) {
          try {
            const control2 = await client().control(target);
            if (stale()) setHold(control2);
          } catch {
            if (stale()) setHold(null);
          }
        }
      }, stale);
    }
    function setHumanHold(active) {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("engine");
      setError(null);
      run(async () => {
        await client().control(target, active ? "takeover" : "release");
        if (!stale()) return;
        const control2 = await client().control(target);
        if (stale()) setHold(control2);
      }, stale);
    }
    function openKitesurf() {
      if (host?.kitesurf?.() !== true) {
        setError(new Error(copy.workspaceMissing));
        return;
      }
      host?.openKitesurf?.();
    }
    function loadTerminals() {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("term");
      setTermBusy(true);
      setTerms(null);
      setError(null);
      (async () => {
        try {
          const out = await client().terminalList(target);
          if (!stale()) return;
          setTerms({ list: out.terminals });
        } catch (cause) {
          if (!stale()) return;
          setTerms(cause?.status === 403 ? { denied: true } : { error: cause });
        } finally {
          if (stale()) setTermBusy(false);
        }
      })();
    }
    function createTerminal(serviceId) {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("term");
      setTermBusy(true);
      setError(null);
      (async () => {
        try {
          await client().terminalCreate(target, {
            service: serviceId,
            paneId,
            openId: crypto.randomUUID()
          });
          if (!stale()) return;
          const out = await client().terminalList(target);
          if (stale()) setTerms({ list: out.terminals });
        } catch (cause) {
          if (stale()) setTerms({ error: cause });
        } finally {
          if (stale()) setTermBusy(false);
        }
      })();
    }
    function closeTerminal(terminalId) {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("term");
      setTermBusy(true);
      setConfirm(null);
      setAcknowledged(false);
      setError(null);
      (async () => {
        try {
          await client().terminalClose(target, terminalId);
          if (!stale()) return;
          const out = await client().terminalList(target);
          if (stale()) setTerms({ list: out.terminals });
        } catch (cause) {
          if (stale()) setTerms({ error: cause });
        } finally {
          if (stale()) setTermBusy(false);
        }
      })();
    }
    function openTerminal(term) {
      if (!selection || !host?.openTerminal) return;
      const envId = detail?.envId ?? selection.envId;
      try {
        const address = terminalAddress2({ envId, sandboxId: selection.sandboxId, terminalId: term.terminalId });
        if (term.address !== address || host.openTerminal(address) !== true) setError(new Error(copy.terminalUnavailable));
      } catch (cause) {
        setError(cause);
      }
    }
    function openCreate() {
      setCreateOpen(true);
      setProfiles(null);
      setProfilesFailed(false);
      const stale = ticket("profiles");
      run(async () => {
        try {
          const list = await client().listProfiles();
          if (!stale()) return;
          setProfiles(list);
          if (list.length === 1 && list[0].ready !== false) setCreateProfile(list[0].id);
        } catch (cause) {
          if (!stale()) return;
          setProfiles([]);
          setProfilesFailed(true);
          throw cause;
        }
      }, stale);
    }
    function openSettings() {
      setDangerOpen(false);
      setSettingsMsg(null);
      setSettingsOpen(true);
    }
    function writeSettings(work) {
      if (writeLock.current || opPending) return;
      writeLock.current = true;
      setBusy(true);
      const current = ticket("settings");
      setSettingsMsg(null);
      setError(null);
      run(async () => {
        const message = await work();
        if (!current()) return;
        setSettingsMsg(message);
        loadDetail();
        loadList();
      }, current).finally(() => {
        if (!current()) return;
        writeLock.current = false;
        setBusy(false);
      });
    }
    function saveResources() {
      if (!selection || !detail?.configuration) return;
      const overrides = Object.fromEntries(Object.entries(detail.configuration.overrides ?? {}).filter(([, v]) => v != null));
      if (cfgCpus.trim() !== "") {
        const cpus = Number(cfgCpus);
        if (!Number.isInteger(cpus) || cpus < 1) {
          setError(new Error(copy.failed));
          return;
        }
        overrides.cpus = cpus;
      }
      if (cfgMem.trim() !== "") {
        const mem = Number(cfgMem);
        if (!Number.isInteger(mem) || mem < 1) {
          setError(new Error(copy.failed));
          return;
        }
        overrides.memoryBytes = mem * 1024 * 1024;
      }
      const target = selection.sandboxId;
      writeSettings(async () => {
        const out = await client().saveRevision(target, {
          expectedRevision: detail.desiredRevision ?? 0,
          overrides
        });
        return fill2(copy.configSaved, { revision: out.desiredRevision?.revision ?? "?" });
      });
    }
    function saveIdle() {
      if (!selection || !detail?.configuration) return;
      if (idleMin.trim() === "") return;
      const minutes = Number(idleMin);
      if (!Number.isInteger(minutes) || minutes < 0) {
        setError(new Error(copy.failed));
        return;
      }
      const target = selection.sandboxId;
      writeSettings(async () => {
        await client().configureIdle(target, minutes * 6e4);
        return copy.idleSaved;
      });
    }
    if (!sessionId) return null;
    const sandboxName = selection?.name ?? selection?.sandboxId ?? "";
    const observedState = detail?.observedState ?? null;
    const canManage = detail != null && Object.hasOwn(detail, "configuration");
    const opPending = receipt != null && ["accepted", "running", "indeterminate"].includes(opBody?.state);
    const writeBusy = busy || opPending;
    const canStart = canManage && observedState === "stopped" && supports("sandbox.instance.start");
    const canStop = canManage && observedState === "running" && supports("sandbox.instance.stop");
    const canRestart = canManage && observedState === "running" && supports("sandbox.instance.restart");
    const selectedProfile = (profiles ?? []).find((p) => p.id === createProfile);
    const createBlocked = busy || !createName || !createProfile || selectedProfile?.ready === false;
    const errorBox = error ? h9(
      "div",
      { "data-dnls-error": "1", role: "alert" },
      `${error?.errorId ? `${error.errorId} ` : ""}${error?.message ?? error}`
    ) : null;
    const receiptBlock = receipt ? h9(
      "section",
      { "data-dnls-receipt": "1" },
      h9(DisclosureRow, {
        title: fill2(copy.opLine, { action: copy[receipt.action] ?? receipt.action, state: copy.opStates?.[opBody?.state] ?? copy.opPending }),
        icon: h9(primitives3.IconClockOutlineRegular),
        open: receiptOpen,
        expandOnRowClick: true,
        expandable: true,
        onToggle: () => setReceiptOpen((open) => !open)
      }, fill2(copy.opIdLine, { operationId: receipt.operationId })),
      h9(Button5, { variant: "ghost", size: "sm", onClick: recheck }, copy.opRecheck)
    ) : null;
    const needsAttention = (e) => !["running", "stopped"].includes(e.observedState) || ["indeterminate", "failed"].includes(e.operation?.state) || Number.isInteger(e.appliedRevision) && Number.isInteger(e.desiredRevision) && e.appliedRevision !== e.desiredRevision;
    const visibleRows = (rows ?? []).filter((entry) => {
      if (fleetFilter === "attention" ? !needsAttention(entry) : fleetFilter !== "all" && fleetFilter !== entry.observedState) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return [
        entry.name,
        entry.profileId,
        entry.envId,
        entry.observedState,
        ...(entry.services ?? []).map((s) => s.serviceId)
      ].some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    });
    const overview = () => {
      if (phase === "loading" && rows === null) {
        return h9("p", { "data-dnls-loading": "1" }, copy.loading);
      }
      const stats = {
        running: (rows ?? []).filter((e) => e.observedState === "running").length,
        stopped: (rows ?? []).filter((e) => e.observedState === "stopped").length,
        attention: (rows ?? []).filter(needsAttention).length
      };
      if (phase === "failed") {
        return h9(EmptyState2, {
          title: copy.failed,
          description: error?.message ?? copy.failed,
          action: h9(Button5, { variant: "primary", size: "sm", onClick: () => setBootSeq((n) => n + 1) }, copy.retry)
        });
      }
      const groups = [];
      for (const entry of rows ?? []) {
        const key = `${entry.envId}\xB7${entry.profileId}`;
        let group = groups.find((g) => g.key === key);
        if (!group) {
          group = { key, envId: entry.envId, profileId: entry.profileId, rows: [] };
          groups.push(group);
        }
        group.rows.push(entry);
      }
      return h9(
        React14.Fragment,
        null,
        rows?.length ? h9(primitives3.SegmentedControl, {
          label: copy.fieldState,
          value: fleetFilter,
          onChange: setFleetFilter,
          options: [["all", copy.allObjects], ["running", copy.stateRunning], ["stopped", copy.stateStopped], ["attention", copy.fleetAttention]].map(([value, title]) => ({ value, label: value === "all" ? title : `${title} ${stats[value]}` }))
        }) : null,
        h9(primitives3.Input, {
          type: "search",
          "data-dnls-search": "1",
          value: search,
          placeholder: copy.searchPlaceholder,
          "aria-label": copy.searchPlaceholder,
          onChange: (event) => setSearch(event.target.value)
        }),
        rows !== null && rows.length > 0 && visibleRows.length === 0 ? h9(EmptyState2, {
          "data-dnls-empty": "1",
          title: copy.searchMiss,
          action: h9(Button5, { variant: "ghost", size: "sm", onClick: () => {
            setSearch("");
            setFleetFilter("all");
          } }, copy.clearFilter)
        }) : null,
        rows !== null && rows.length === 0 ? h9(EmptyState2, {
          "data-dnls-empty": "1",
          title: copy.emptyTitle,
          description: copy.empty,
          action: supports("sandbox.instance.create") ? h9(Button5, { variant: "primary", size: "sm", onClick: openCreate }, copy.create) : void 0
        }) : null,
        groups.map((group) => {
          const cards = group.rows.filter((entry) => visibleRows.includes(entry));
          if (cards.length === 0) return null;
          const groupCap = (envIds ?? []).length === 1 ? profileCaps.get(group.profileId) : void 0;
          return h9(
            PanelSection2,
            {
              key: group.key,
              title: `${group.profileId} \xB7 ${group.envId}${groupCap != null ? ` \xB7 ${fill2(copy.profileSeats, { count: group.rows.length, limit: groupCap })}` : ""}`
            },
            h9(
              "table",
              { width: "100%", "aria-label": copy.lastMinute },
              h9("thead", null, h9(
                "tr",
                null,
                h9("th", { scope: "col", align: "left" }, copy.typeLabel),
                h9("th", { scope: "col", align: "right" }, `${copy.usageCpu} (${copy.coresUnit})`),
                h9("th", { scope: "col", align: "right" }, copy.usageMemory)
              )),
              h9("tbody", null, cards.map((entry) => h9(SandboxRow2, {
                key: entry.sandboxId,
                entry,
                copy,
                formatBytes: formatBytes2,
                stateLabel: (s) => stateLabel(copy, s),
                disabled: writeBusy,
                onSelect: choose
              })))
            ),
            h9("small", null, copy.lastMinuteHint)
          );
        }),
        receiptBlock
      );
    };
    const overviewTab = () => h9(
      React14.Fragment,
      null,
      detailError ? h9(
        "div",
        { "data-dnls-detail-error": "1", role: "alert" },
        `${detailError?.errorId ? `${detailError.errorId} ` : ""}${detailError?.message ?? detailError}`
      ) : null,
      // Candidate strip only on a genuine desired != applied revision, and
      // each line only where the saved override actually differs from the
      // observed allocation.
      canManage && Number.isInteger(detail?.desiredRevision) && Number.isInteger(detail?.appliedRevision) && detail.desiredRevision !== detail.appliedRevision ? (() => {
        const ov = detail.configuration?.overrides ?? {};
        const lines = [
          ov.cpus != null && ov.cpus !== detail.resources?.cpus ? fill2(copy.cfgPendingCpu, { cur: detail.resources?.cpus ?? copy.unknown, saved: ov.cpus }) : null,
          ov.memoryBytes != null && ov.memoryBytes !== detail.resources?.memoryBytes ? fill2(copy.cfgPendingMem, {
            cur: formatBytes2(detail.resources?.memoryBytes) ?? copy.unknown,
            saved: formatBytes2(ov.memoryBytes)
          }) : null
        ].filter(Boolean);
        return h9(
          "p",
          { "data-dnls-pending": "1" },
          lines.length > 0 ? lines.join(" \xB7 ") : fill2(copy.revPending, { rev: detail.desiredRevision }),
          h9("br"),
          h9("small", null, fill2(copy.revisionPair, { saved: detail.desiredRevision, applied: detail.appliedRevision })),
          " ",
          h9(Button5, {
            variant: "outline",
            size: "sm",
            disabled: busy,
            onClick: openSettings
          }, copy.reviewSettings)
        );
      })() : null,
      usageDenied ? h9("p", null, copy.usageNotAuthorized) : null,
      // Window picker + honest metric bands + one coverage sentence.
      detail?.usage ? h9(
        PanelSection2,
        { title: copy.resources },
        h9("div", null, h9(primitives3.SegmentedControl, {
          value: usageWindow,
          label: copy.resources,
          options: ["24h", "7d", "30d"].map((w) => ({ value: w, label: w })),
          onChange: (w) => {
            if (!busy) setUsageWindow(w);
          }
        }), " ", detail.resources ? h9(primitives3.Tag, { tone: "quiet" }, fill2(copy.allocation, {
          cpu: detail.resources.cpus ?? copy.unknown,
          memory: formatBytes2(detail.resources.memoryBytes) ?? copy.unknown
        })) : null),
        Array.isArray(detail.usage.history) && detail.usage.history.length > 0 ? h9(
          React14.Fragment,
          null,
          h9(MetricChart2, {
            title: copy.usageCpu,
            unit: copy.coresUnit,
            range: usageWindow,
            tone: "var(--dsw-alias-state-business-primary)",
            summary: detail.usage.cpu ? { ...detail.usage.cpu, end: detail.usage.end } : { end: detail.usage.end },
            copy,
            bins: detail.usage.history.map((b) => ({ at: b.at, minutes: b.minutes, value: b.cpuCores ?? null }))
          }),
          h9(MetricChart2, {
            title: copy.usageMemory,
            unit: "MiB",
            range: usageWindow,
            tone: "var(--dsw-alias-state-success-primary)",
            summary: detail.usage.memory ? {
              ...detail.usage.memory,
              end: detail.usage.end,
              mean: detail.usage.memory.mean != null ? detail.usage.memory.mean / 1048576 : null,
              peak: detail.usage.memory.peak != null ? detail.usage.memory.peak / 1048576 : null
            } : null,
            copy,
            bins: detail.usage.history.map((b) => ({
              at: b.at,
              minutes: b.minutes,
              value: b.memoryBytes != null ? b.memoryBytes / 1048576 : null
            }))
          })
        ) : h9("div", null, copy.noSamples),
        h9(
          "small",
          null,
          detail.usage.history?.length ? `${fmtTime(detail.usage.history[0].at)} \u2013 ${fmtTime(detail.usage.end)} \xB7 ` : null,
          `${copy.usageStates} ${copy.stateRunning} ${detail.usage.states?.running ?? "\u2014"} \xB7 ${copy.stateStopped} ${detail.usage.states?.stopped ?? "\u2014"} \xB7 ${copy.stateFailed} ${detail.usage.states?.failed ?? "\u2014"} \xB7 ${copy.stateMissing} ${detail.usage.states?.missing ?? "\u2014"}`
        )
      ) : null,
      // Guest process read — running + authorized only.
      supports("sandbox.processes") ? h9(
        DisclosureRow,
        {
          title: copy.guestProcesses,
          icon: h9(primitives3.IconFlatListOutlineRegular),
          expandable: canManage && observedState === "running" && !busy,
          expandOnRowClick: true,
          open: procs !== null || procsBusy,
          running: procsBusy,
          onToggle: () => {
            if (procs || procsBusy) {
              invalidate("process");
              setProcs(null);
              setProcsBusy(false);
            } else loadProcesses();
          }
        },
        procsBusy ? copy.loading : null,
        procs ? h9(
          "section",
          { "data-dnls-processes": "1", "aria-label": copy.processes },
          (procs.processes ?? []).length === 0 ? h9("p", null, copy.processesEmpty) : h9(
            React14.Fragment,
            null,
            h9(
              "table",
              { width: "100%" },
              h9("thead", null, h9(
                "tr",
                null,
                [["pid", "PID"], ["name", copy.fieldName], ["state", copy.fieldState], ["rssBytes", "RSS"]].map(([field, label]) => h9(
                  "th",
                  {
                    key: field,
                    scope: "col",
                    align: "left",
                    "aria-sort": processSort.field === field ? processSort.descending ? "descending" : "ascending" : "none"
                  },
                  h9(Button5, { variant: "ghost", size: "sm", onClick: () => setProcessSort({
                    field,
                    descending: field === processSort.field ? !processSort.descending : field === "rssBytes"
                  }) }, `${label}${processSort.field === field ? processSort.descending ? " \u2193" : " \u2191" : ""}`)
                ))
              )),
              h9(
                "tbody",
                null,
                (procs.processes ?? []).slice().sort((a, b) => {
                  const x = a[processSort.field], y = b[processSort.field];
                  if (x == null || y == null) return Number(x == null) - Number(y == null);
                  return (typeof x === "string" ? x.localeCompare(y) : x - y) * (processSort.descending ? -1 : 1);
                }).map((p) => h9(
                  "tr",
                  { key: p.pid },
                  h9("td", null, p.pid ?? "\u2014"),
                  h9("td", null, p.name ?? "\u2014"),
                  h9("td", null, p.state ?? "\u2014"),
                  h9("td", null, p.rssBytes != null ? formatBytes2(p.rssBytes) ?? `${p.rssBytes}B` : "\u2014")
                ))
              )
            ),
            procs.truncated === true ? h9("p", null, copy.procsTruncated) : null
          )
        ) : null
      ) : null,
      detail ? h9(
        DisclosureRow,
        {
          title: copy.details,
          icon: InfoIcon ? h9(InfoIcon) : null,
          open: detailsOpen,
          expandable: true,
          expandOnRowClick: true,
          onToggle: () => setDetailsOpen((open) => !open)
        },
        h9(Facts, { items: [
          { label: copy.observedAt, value: fmtTime(detail.observedAt) },
          { label: copy.resCpus, value: detail.resources?.cpus },
          { label: copy.resMemory, value: formatBytes2(detail.resources?.memoryBytes) },
          detail.applied ? { label: copy.appliedDigest, value: detail.applied.imageDigest } : null,
          detail.applied ? { label: copy.appliedVerified, value: fmtTime(detail.applied.verifiedAt) } : null,
          { label: copy.fieldGeneration, value: detail.generation },
          { label: copy.fieldSandboxId, value: detail.sandboxId },
          Array.isArray(detail.mounts) && detail.mounts.length > 0 ? { label: copy.storage, value: detail.mounts.map((m) => `${m.type ?? "\u2014"}:${m.target ?? "\u2014"}${m.readOnly === true ? ` ${copy.readOnly}` : ""}`).join(" \xB7 ") } : null
        ].filter(Boolean) })
      ) : null,
      detail?.operations?.length ? h9(
        DisclosureRow,
        {
          title: `${copy.timeline} (${detail.operations.length})`,
          icon: h9(primitives3.IconClockOutlineRegular),
          open: historyOpen,
          expandable: true,
          expandOnRowClick: true,
          onToggle: () => setHistoryOpen((open) => !open)
        },
        [...detail.operations].reverse().map((op) => h9(
          "div",
          {
            key: op.operationId ?? `${op.at}-${op.action}`,
            "data-dnls-op": op.operationId ?? void 0
          },
          h9(primitives3.StateDot, { state: { succeeded: "done", failed: "error", indeterminate: "warning", running: "ongoing" }[op.state] ?? "idle" }),
          " ",
          `${copy[op.action] ?? op.action} \xB7 ${copy.opStates?.[op.state] ?? op.state}${op.step && op.step !== "verify" ? `/${op.step}` : ""} \xB7 ${fmtTime(op.at)}`
        ))
      ) : null
    );
    const engineState = engine?.planes?.engine?.state ?? null;
    const bridgeState = engine?.planes?.bridge ? engine.planes.bridge.ok === true ? engine.planes.bridge.detail ?? "ok" : "down" : null;
    const holdActive = hold?.control?.humanHold?.active;
    const servicesTab = () => {
      const services = detail?.services ?? [];
      const termList = terms?.list ?? null;
      const declared = services.map((s) => s.serviceId).filter((id) => typeof id === "string");
      const healthUnknown = services.length > 0 && services.every((s) => (s.health ?? "unknown") === "unknown");
      return h9(
        React14.Fragment,
        null,
        services.length > 0 ? h9(
          PanelSection2,
          { title: copy.fieldServices },
          healthUnknown ? h9("p", null, copy.healthUnverified) : null,
          h9(
            "table",
            { width: "100%" },
            h9("thead", null, h9(
              "tr",
              null,
              h9("th", { scope: "col", align: "left" }, copy.fieldServices),
              h9("th", { scope: "col", align: "left" }, copy.servicePublication),
              h9("th", { scope: "col", align: "left" }, copy.protocol)
            )),
            h9(
              "tbody",
              null,
              services.map((service) => h9(
                React14.Fragment,
                { key: service.serviceId },
                h9(
                  "tr",
                  null,
                  h9("td", null, h9(DisclosureRow, {
                    title: service.serviceId,
                    icon: h9(InfoIcon),
                    open: svcOpen === service.serviceId,
                    expandable: true,
                    expandOnRowClick: true,
                    onToggle: () => setSvcOpen((open) => open === service.serviceId ? null : service.serviceId)
                  })),
                  h9("td", null, serviceAddress2(service) ?? copy.unpublished),
                  h9("td", null, `${service.protocol ?? "\u2014"}:${service.containerPort ?? "\u2014"}`)
                ),
                svcOpen === service.serviceId ? h9("tr", null, h9("td", { colSpan: 3 }, h9(Facts, { items: [
                  service.guestCwd ? { label: copy.guestCwd, value: service.guestCwd } : null,
                  { label: copy.observedAt, value: fmtTime(service.observedAt) },
                  { label: copy.declaredVersion, value: service.declaredVersion ?? "\u2014" },
                  { label: copy.observedVersion, value: service.observedVersion ?? "\u2014" }
                ].filter(Boolean) }))) : null
              ))
            )
          )
        ) : h9("p", null, copy.none),
        // Engine probe — the announced dnls.status surface, rendered only
        // for the installed kitesurf profile and only whitelisted fields.
        (detail?.services ?? []).some((s) => s.role === "engine" || s.role === "bridge") ? h9(
          PanelSection2,
          { title: copy.engineProbe },
          supports("dnls.status") ? h9(Button5, { variant: "ghost", size: "sm", disabled: busy, onClick: probeEngine }, copy.engineProbe) : h9("p", null, copy.engineUnavailable),
          engine ? h9(Facts, { items: [
            { label: copy.engineState, value: engineState },
            { label: copy.bridgeState, value: bridgeState },
            { label: copy.observedAt, value: engine?.observedAt },
            typeof engine?.networking?.hostGateway === "string" ? { label: copy.netGateway, value: engine.networking.hostGateway } : null
          ].filter(Boolean) }) : null,
          holdActive === true || holdActive === false ? h9(Facts, { items: [
            { label: copy.humanHold, value: holdActive === true ? copy.humanHoldActive : copy.humanHoldFree }
          ] }) : null,
          holdActive === true || holdActive === false ? h9(
            "p",
            null,
            h9(Button5, { variant: "ghost", size: "sm", disabled: busy || holdActive === true, onClick: () => setHumanHold(true) }, copy.takeover),
            " ",
            h9(Button5, { variant: "ghost", size: "sm", disabled: busy || holdActive === false, onClick: () => setHumanHold(false) }, copy.release)
          ) : null,
          h9(
            "p",
            null,
            h9(Button5, { variant: "ghost", size: "sm", disabled: busy || host?.kitesurf?.() !== true, onClick: openKitesurf }, copy.openWorkspace),
            " ",
            h9("span", null, copy.openWorkspaceHint)
          )
        ) : null,
        // Operator-only engine log read — bounded text, gated by the
        // announced dnls.logs surface and the operator configuration plane.
        canManage && supports("dnls.logs") ? h9(
          PanelSection2,
          { title: copy.logsTitle },
          h9(
            "p",
            null,
            h9(Button5, { variant: "ghost", size: "sm", disabled: logsBusy || busy, onClick: loadLogs }, copy.readLogs)
          ),
          logs?.error ? h9("p", { role: "alert" }, `${logs.error?.errorId ? `${logs.error.errorId} ` : ""}${logs.error?.message ?? logs.error}`) : null,
          typeof logs?.text === "string" ? h9("pre", { "data-dnls-logs": "1" }, logs.text) : null
        ) : null,
        // Terminals — explicit list first; create appears only after it.
        supports("term.session.list") ? h9(
          PanelSection2,
          { title: copy.terminals },
          h9(
            "p",
            null,
            h9(Button5, { variant: "ghost", size: "sm", disabled: termBusy || busy, onClick: loadTerminals }, copy.terminalsList)
          ),
          terms?.denied ? h9("p", { "data-dnls-terms-denied": "1", role: "alert" }, copy.terminalsDenied) : null,
          terms?.error ? h9("p", { role: "alert" }, `${terms.error?.errorId ? `${terms.error.errorId} ` : ""}${terms.error?.message ?? terms.error}`) : null,
          termList && termList.length === 0 ? h9("p", null, copy.terminalsEmpty) : null,
          termList ? termList.map((term) => {
            const live = term.state !== "ended";
            const active = term.state === "active";
            return h9(
              "p",
              { key: term.terminalId },
              `${term.terminalId.slice(0, 8)} ${term.state ?? ""} `,
              active && typeof term.address === "string" ? h9(Button5, { variant: "ghost", size: "sm", disabled: termBusy, onClick: () => openTerminal(term) }, copy.terminalOpen) : null,
              " ",
              live && supports("term.session.close") ? h9(Button5, { variant: "ghost", size: "sm", disabled: termBusy, onClick: () => {
                setConfirm({ kind: "closeTerminal", terminalId: term.terminalId });
                setAcknowledged(false);
              } }, copy.terminalClose) : null
            );
          }) : null,
          // Create-only is separate from connect/attach and appears only
          // after a successful list — never on a denied or failed read.
          termList && supports("term.session.create") ? h9(
            "p",
            null,
            declared.map((serviceId) => h9(
              React14.Fragment,
              { key: serviceId },
              h9(
                Button5,
                { variant: "ghost", size: "sm", disabled: termBusy || busy, onClick: () => createTerminal(serviceId) },
                fill2(copy.terminalCreateFor, { service: serviceId })
              ),
              " "
            ))
          ) : null
        ) : null
      );
    };
    const settingsTab = () => {
      const cfg = detail?.configuration;
      const invalidCpu = cfgCpus.trim() !== "" && (!Number.isInteger(Number(cfgCpus)) || Number(cfgCpus) < 1);
      const invalidMem = cfgMem.trim() !== "" && (!Number.isInteger(Number(cfgMem)) || Number(cfgMem) < 1);
      const invalidIdle = !Number.isInteger(Number(idleMin)) || Number(idleMin) < 0;
      const resourceChanged = cfgCpus.trim() !== "" && Number(cfgCpus) !== cfg?.overrides?.cpus || cfgMem.trim() !== "" && Number(cfgMem) * 1048576 !== cfg?.overrides?.memoryBytes;
      return h9(
        React14.Fragment,
        null,
        h9(
          PanelSection2,
          { title: copy.config },
          cfg ? h9(
            React14.Fragment,
            null,
            h9("div", null, fill2(copy.allocation, {
              cpu: detail.resources?.cpus ?? copy.unknown,
              memory: formatBytes2(detail.resources?.memoryBytes) ?? copy.unknown
            })),
            h9(primitives3.SettingsValueField, {
              id: `${nameId}-cpus`,
              label: copy.configCpus,
              text: cfgCpus,
              numeric: true,
              overridden: false,
              invalid: invalidCpu,
              invalidLabel: copy.draftInvalid,
              disabled: busy || detail == null,
              onEdit: setCfgCpus,
              placeholder: copy.configUnobserved,
              "data-dnls-cfg-cpus": "1"
            }),
            h9(primitives3.SettingsValueField, {
              id: `${nameId}-mem`,
              label: copy.configMemory,
              text: cfgMem,
              numeric: true,
              overridden: false,
              invalid: invalidMem,
              invalidLabel: copy.draftInvalid,
              disabled: busy || detail == null,
              onEdit: setCfgMem,
              placeholder: copy.configUnobserved,
              "data-dnls-cfg-mem": "1"
            }),
            cfgCpus.trim() !== "" || cfgMem.trim() !== "" ? h9("p", null, copy.saveNoChange) : null,
            h9(
              "p",
              null,
              h9(Button5, { variant: "primary", size: "sm", disabled: busy || !resourceChanged || invalidCpu || invalidMem || !supports("sandbox.revision.save"), onClick: saveResources }, copy.configSave)
            )
          ) : h9("p", null, copy.configNotAuthorized)
        ),
        h9(
          PanelSection2,
          { title: copy.idle },
          cfg ? h9(
            React14.Fragment,
            null,
            h9(primitives3.SettingsValueField, {
              id: `${nameId}-idle`,
              label: copy.idleMinutes,
              text: idleMin,
              numeric: true,
              overridden: false,
              invalid: idleMin.trim() !== "" && invalidIdle,
              invalidLabel: copy.draftInvalid,
              disabled: busy || detail == null,
              onEdit: setIdleMin,
              placeholder: copy.idleHint,
              "data-dnls-idle": "1"
            }),
            h9(
              "p",
              null,
              h9(Button5, { variant: "outline", size: "sm", disabled: busy || invalidIdle || idleMin.trim() === "" || Number(idleMin) * 6e4 === cfg.idleTimeoutMs || !supports("sandbox.idle.configure"), onClick: saveIdle }, copy.idleSave)
            )
          ) : h9("p", null, copy.configNotAuthorized)
        ),
        settingsMsg ? h9("p", { "data-dnls-settings-msg": "1" }, settingsMsg) : null,
        canManage && detail != null && !opPending && (supports("sandbox.instance.recreate") || supports("sandbox.instance.remove")) ? h9(
          DisclosureRow,
          {
            title: copy.danger,
            icon: h9(primitives3.IconWarningTriangleOutlineRegular),
            expandable: true,
            expandOnRowClick: true,
            open: dangerOpen,
            onToggle: () => setDangerOpen((open) => !open)
          },
          h9("p", null, copy.persistVolume),
          h9(
            "p",
            null,
            supports("sandbox.instance.recreate") ? h9(Button5, { variant: "ghost", size: "sm", disabled: busy, onClick: () => {
              setConfirm({ kind: "recreate" });
              setAcknowledged(false);
            } }, copy.recreate) : null,
            " ",
            supports("sandbox.instance.remove") ? h9(Button5, { variant: "ghost", size: "sm", disabled: busy, onClick: () => {
              setConfirm({ kind: "remove" });
              setAcknowledged(false);
            } }, copy.remove) : null
          )
        ) : null
      );
    };
    const control = () => {
      if (!selection) return h9("p", null, copy.pick);
      return h9(
        React14.Fragment,
        null,
        receiptBlock,
        h9(
          "p",
          null,
          h9(
            Button5,
            { variant: "outline", size: "sm", disabled: writeBusy || !(observedState === "stopped" ? canStart : canStop), onClick: () => setConfirm({ kind: observedState === "stopped" ? "start" : "stop" }) },
            observedState === "stopped" ? copy.start : copy.stop
          ),
          " ",
          h9(Button5, { variant: "ghost", size: "sm", disabled: writeBusy || !canRestart, onClick: () => setConfirm({ kind: "restart" }) }, copy.restart),
          " ",
          detail?.health === "unknown" ? h9(primitives3.Tag, { tone: "quiet" }, copy.healthUnverified) : null
        ),
        h9(NanoTabs2, {
          label: copy.control,
          value: detailTab,
          onChange: setDetailTab,
          items: [
            { value: "overview", label: copy.tabOverview, content: overviewTab() },
            { value: "services", label: copy.tabServices, content: servicesTab() }
          ]
        })
      );
    };
    const createDialog = createOpen ? h9(
      NanoDialog2,
      {
        copy,
        title: copy.createTitle,
        confirmLabel: busy ? copy.creating : copy.createSubmit,
        confirmDisabled: createBlocked,
        busy,
        onConfirm: () => submitLifecycle("create", { name: createName, profileId: createProfile }),
        onCancel: () => setCreateOpen(false)
      },
      h9(
        "p",
        null,
        h9("label", { htmlFor: nameId }, copy.createName),
        " ",
        h9(primitives3.Input, {
          id: nameId,
          "data-dnls-create-name": "1",
          value: createName,
          disabled: busy,
          onChange: (event) => setCreateName(event.target.value)
        })
      ),
      profiles === null ? h9("p", null, copy.loading) : h9(primitives3.SegmentedControl, {
        "data-dnls-create-profile": "1",
        label: copy.createProfile,
        value: createProfile,
        options: profiles.map((p) => ({
          value: p.id,
          label: `${p.id}${p.ready === false ? ` \xB7 ${copy.profileNotReady}` : ""}`,
          disabled: p.ready === false
        })),
        onChange: (value) => {
          if (!busy) setCreateProfile(value);
        }
      }),
      profiles !== null && profiles.length === 0 ? h9("p", null, copy.noProfiles) : null,
      profilesFailed ? h9("p", { role: "alert" }, copy.failed) : null
    ) : null;
    const riskDialog = confirm && confirm.kind !== "start" ? h9(RiskConfirmation, {
      open: true,
      title: confirm.kind === "closeTerminal" ? copy.closeConfirmTitle : copy[`${confirm.kind}ConfirmTitle`] ?? copy[`${confirm.kind}`],
      description: confirm.kind === "closeTerminal" ? fill2(copy.terminalCloseConfirm, { id: confirm.terminalId?.slice(0, 8) }) : confirm.kind === "remove" ? fill2(copy.removeConfirmBody, { name: sandboxName }) : confirm.kind === "recreate" ? fill2(copy.recreateConfirmBody, { name: sandboxName }) : fill2(copy.confirmBody, { action: copy[confirm.kind] ?? confirm.kind, name: sandboxName }),
      acknowledgeLabel: confirm.kind === "closeTerminal" ? copy.lifecycleAcknowledge : confirm.kind === "remove" ? copy.removeAcknowledge : confirm.kind === "recreate" ? copy.recreateAcknowledge : copy.lifecycleAcknowledge,
      acknowledged,
      onAcknowledgedChange: setAcknowledged,
      cancelLabel: copy.cancel,
      closeLabel: copy.close,
      confirmLabel: copy[confirm.kind] ?? copy.terminalClose,
      disabled: busy,
      onCancel: () => {
        setConfirm(null);
        setAcknowledged(false);
      },
      onConfirm: () => {
        if (confirm.kind === "closeTerminal") {
          closeTerminal(confirm.terminalId);
          return;
        }
        const args = confirm.kind === "recreate" ? { expectedRevision: detail?.desiredRevision ?? 0, preserveVolume: true, interruptTerminals: true } : void 0;
        submitLifecycle(confirm.kind, { sandboxId: selection.sandboxId, args });
      }
    }) : null;
    const startDialog = confirm?.kind === "start" ? h9(NanoDialog2, {
      copy,
      title: copy.startConfirmTitle,
      description: fill2(copy.startConfirmBody, { name: sandboxName }),
      confirmLabel: busy ? copy.creating : copy.start,
      confirmDisabled: busy,
      busy,
      onConfirm: () => submitLifecycle("start", { sandboxId: selection.sandboxId }),
      onCancel: () => setConfirm(null)
    }) : null;
    const onObject = view === "control" && selection != null;
    const backLabel = detailTab === "services" ? copy.backToMonitor : copy.back;
    return h9(
      "section",
      { ref: root, className: "nano-panes", "data-dnls-pane": "1" },
      h9("style", null, NANO_STYLES2),
      h9(
        Toolbar2,
        { label: copy.workbenchTitle },
        onObject ? tool(
          backLabel,
          primitives3.IconChevronLeftOutlineRegular,
          () => detailTab === "services" ? setDetailTab("overview") : unchoose(),
          writeBusy
        ) : null,
        h9("span", null, onObject ? sandboxName : copy.fleetTitle),
        onObject ? h9(
          primitives3.Tag,
          { tone: observedState === "running" ? "success" : "neutral", "data-dnls-state": "1" },
          stateLabel(copy, observedState)
        ) : total !== null ? h9(primitives3.Tag, { tone: "neutral" }, fill2(copy.listShort, { shown: visibleRows.length, total })) : null,
        h9(primitives3.Tag, { tone: "quiet" }, onObject ? [selection.envId, detail?.profileId].filter(Boolean).join(" / ") : (envIds ?? []).join(" / ")),
        !onObject && !complete ? h9(primitives3.Tag, { tone: "warning" }, copy.listPartial) : null,
        tool(copy.refresh, primitives3.IconRefreshOutlineRegular, refresh, phase === "loading" || busy),
        onObject ? tool(
          copy.tabSettings,
          primitives3.IconSettingsOutlineRegular,
          openSettings,
          !detail || writeBusy
        ) : tool(copy.create, primitives3.IconPlusOutlineRegular, openCreate, writeBusy || !supports("sandbox.instance.create"))
      ),
      h9(
        "div",
        { key: onObject ? selection.sandboxId : "list", className: "nano-pane nano-panel" },
        !settingsOpen ? errorBox : null,
        onObject ? control() : overview()
      ),
      settingsOpen && onObject ? h9(NanoDialog2, {
        copy,
        title: `${sandboxName} \xB7 ${copy.tabSettings}`,
        width: 480,
        maxHeight: 720,
        onCancel: () => setSettingsOpen(false),
        footer: h9(Button5, { variant: "outline", onClick: () => setSettingsOpen(false) }, copy.close)
      }, errorBox, settingsTab()) : null,
      createDialog,
      riskDialog,
      startDialog
    );
  }
  var inject = ["slots", "sidebarRightTabs", "sidebarRight", "locale"];
  function apply(ctx) {
    const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith("zh") === true;
    const copy = () => copyFor2(zh() ? "zh" : "en");
    const host = {
      kitesurf: () => ctx.sidebarRightTabs?.get?.("kitesurf") !== void 0,
      openKitesurf: () => ctx.sidebarRight?.openTab?.("kitesurf"),
      openTerminal: (address) => {
        const candidates = ctx.sidebarRightTabs?.candidates?.(address) ?? [];
        if (candidates[0]?.kind !== "dnt-sandbox-terminal" || typeof ctx.sidebarRight?.openResource !== "function") return false;
        ctx.sidebarRight.openResource(address);
        return true;
      }
    };
    const Pane = (props) => h9(DnlsPane, { sessionId: props.sessionId, copy: copy(), host });
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

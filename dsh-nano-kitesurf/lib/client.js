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

  // ../packages/dsh-nano-ui/index.js
  var dsh_nano_ui_exports = {};
  __export(dsh_nano_ui_exports, {
    EmptyState: () => EmptyState,
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
      /** Heaviest LoAF entries, capped at EVIDENCE_CAPS.frames by the report. */
      heavyFrames: [],
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
      legacyCopies: 0,
      badShape: 0,
      unmappedKey: 0,
      missingBindingId: 0,
      oversize: 0,
      /** Protocol findings such as `{ level, code:'build-stamp', have, saw }`. */
      audits: []
    };
  }
  function pushAudit(structure, record) {
    if (!Array.isArray(structure.audits)) structure.audits = [];
    const dup = structure.audits.some((item) => item.level === record.level && item.code === record.code && item.have === record.have && item.saw === record.saw);
    if (!dup) structure.audits.push(record);
  }
  function installSingleton(global, key, legacyKey, stamp, create) {
    const existing = global[key];
    if (existing == null) {
      const created = create();
      created._build = stamp;
      global[key] = created;
      if (legacyKey != null && global[legacyKey] != null) {
        const structure = created._state?.().structure;
        if (structure != null) structure.legacyCopies += 1;
      }
      return created;
    }
    if (existing._build !== stamp) {
      const structure = existing._state?.().structure;
      if (structure != null) {
        pushAudit(structure, {
          level: "audit",
          code: "build-stamp",
          have: existing._build ?? null,
          saw: stamp
        });
      }
    }
    return existing;
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
      // name → { window, total }
      contract: /* @__PURE__ */ new Map(),
      // contract id → counters (not the manual quota)
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
    const cell = row.usage.get(name) ?? { window: 0, total: 0 };
    cell.window += n;
    cell.total += n;
    row.usage.set(name, cell);
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
    const re = new RegExp(`${NANO_PKG_PREFIX}[a-z0-9-]+`, "g");
    let match;
    while ((match = re.exec(url)) !== null) {
      if (!found.includes(match[0])) found.push(match[0]);
    }
    return found;
  }
  function packageNameToPluginId(packageName) {
    if (typeof packageName !== "string" || !packageName.startsWith(NANO_PKG_PREFIX)) return null;
    const rest = packageName.slice(NANO_PKG_PREFIX.length);
    if (!/^[a-z0-9-]+$/.test(rest)) return null;
    return `nano-${rest}`;
  }
  function targetBucket(descriptor) {
    if (descriptor == null || typeof descriptor !== "object") return "other";
    const attrs = descriptor.attrs ?? {};
    const has = (key) => attrs[key] !== void 0 && attrs[key] !== null;
    if (has("data-composer") || has("data-chat-input")) return "composer-textarea";
    if (has("data-row-key") || has("data-sidebar-row")) return "sidebar-row";
    if (descriptor.tag === "TEXTAREA") return "composer-textarea";
    return "other";
  }
  function roundMs(value) {
    return value == null ? null : Math.round(value * 10) / 10;
  }
  var REPORT_VERSION, CLIENT_KEY, HOST_KEY, BUILD_STAMP, NAME_RE, CONTRACT_KEY_RE, MAX_SPAN_KEYS, MAX_USAGE_KEYS, INTERACTION_CAP, RESERVOIR_CAP, EVENT_DURATION_THRESHOLD, WINDOW_PAD_BEFORE_MS, WINDOW_PAD_AFTER_MS, NANO_PKG_PREFIX;
  var init_state = __esm({
    "../packages/dsh-performance-review/src/state.js"() {
      REPORT_VERSION = 2;
      CLIENT_KEY = Symbol.for("dsh.perfReview.v2");
      HOST_KEY = Symbol.for("dsh.perfReviewHost.v2");
      BUILD_STAMP = true ? "ff5694c57be1" : "dev";
      NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
      CONTRACT_KEY_RE = /^[a-z0-9][a-z0-9.-]{0,63}$/;
      MAX_SPAN_KEYS = 32;
      MAX_USAGE_KEYS = 32;
      INTERACTION_CAP = 50;
      RESERVOIR_CAP = 64;
      EVENT_DURATION_THRESHOLD = 16;
      WINDOW_PAD_BEFORE_MS = 1;
      WINDOW_PAD_AFTER_MS = 8;
      NANO_PKG_PREFIX = ["dsh", "nano"].join("-") + "-";
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
  function clipOversize(report) {
    if (byteLength(report) <= MAX_REPORT_BYTES) return report;
    const empty = { interactions: [], frames: [], hostErrors: [] };
    if (report.page) report.page.evidence = empty;
    report.evidence = empty;
    if (report.structure) report.structure.oversize = (report.structure.oversize ?? 0) + 1;
    return report;
  }
  function hostSnapshotUsable(value) {
    if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
    if (Array.isArray(value.rows)) return true;
    const plugins = value.plugins;
    if (plugins == null || typeof plugins !== "object" || Array.isArray(plugins)) return false;
    return true;
  }
  function hostSpanObject(hostSnapshot, pluginId) {
    const out = {};
    if (Array.isArray(hostSnapshot?.rows)) {
      const grouped = /* @__PURE__ */ new Map();
      for (const row of hostSnapshot.rows) {
        if (row == null || row.pluginId !== pluginId || row.kind === "contract") continue;
        const name = row.name;
        if (typeof name !== "string") continue;
        const cell = grouped.get(name) ?? { samples: [], errors: 0 };
        if (typeof row.ms === "number" && Number.isFinite(row.ms)) cell.samples.push(row.ms);
        if (row.err === true) cell.errors += 1;
        grouped.set(name, cell);
      }
      for (const [name, cell] of grouped) {
        out[name] = {
          n: cell.samples.length,
          p50: roundMs(percentile(cell.samples, 0.5)),
          p95: roundMs(percentile(cell.samples, 0.95)),
          maxMs: roundMs(cell.samples.length === 0 ? null : Math.max(...cell.samples)),
          errors: cell.errors,
          basis: hostSnapshot.basis === "cumulative" ? "cumulative" : "window"
        };
      }
      return out;
    }
    const source = hostSnapshot?.plugins?.[pluginId]?.spans;
    if (source == null || typeof source !== "object") return out;
    for (const [name, row] of Object.entries(source)) {
      const samples = Array.isArray(row?.samples) ? row.samples : [];
      out[name] = {
        n: row?.n ?? samples.length,
        p50: roundMs(percentile(samples, 0.5)),
        p95: roundMs(percentile(samples, 0.95)),
        maxMs: roundMs(samples.length === 0 ? null : Math.max(...samples)),
        errors: row?.stats?.errors ?? row?.errors ?? 0,
        basis: row?.basis === "window" ? "window" : "cumulative"
      };
    }
    return out;
  }
  function buildReport(input) {
    const { collector, plugins, structure } = input;
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
      for (const [name, cell] of row.usage) usage[name] = usageCell(cell);
      const contract = {};
      if (row.contract instanceof Map) {
        for (const [key, bucket] of row.contract) {
          contract[key] = {
            n: bucket.n,
            windowN: bucket.window,
            basis: "window",
            outcomes: { ...bucket.outcomes ?? {} },
            status: { ...bucket.status ?? {} }
          };
        }
      }
      const usableHost2 = hostSnapshotUsable(input.hostSnapshot) ? input.hostSnapshot : null;
      pluginOut[pluginId] = {
        hand: {
          spans,
          tracks,
          usage,
          own: {
            inpP75: roundMs(percentile(ownDurations, 0.75)),
            inpCount: ownDurations.length
          },
          native: {
            spanMsP95: roundMs(percentile(row.native.spanMs, 0.95)),
            trackMsP95: roundMs(percentile(row.native.trackMs, 0.95)),
            samples: { spans: row.samples.spans, callbacks: row.samples.callbacks }
          },
          profiler: {
            commits: row.profiler.commits,
            commitP95: roundMs(percentile(row.profiler.durations, 0.95))
          },
          scriptMs: roundMs(collector.pluginScriptMs.get(pluginId) ?? 0),
          version: row.meta?.version ?? null
        },
        contract,
        host: hostSpanObject(usableHost2, pluginId)
      };
    }
    const counts = {};
    for (const [name, cell] of collector.counts) counts[name] = usageCell(cell);
    page.counts = counts;
    page.scenario = input.meta?.scenario ?? null;
    page.arm = input.meta?.arm ?? "on";
    page.chromeMajor = input.meta?.chromeMajor ?? null;
    page.contributors = input.meta?.contributors ?? [];
    page.enabled = input.enabled === true;
    page.loafSupported = input.loafSupported !== false;
    const ranked = [...collector.interactions].sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
    const hostErrors = [];
    const usableHost = hostSnapshotUsable(input.hostSnapshot) ? input.hostSnapshot : null;
    if (usableHost && usableHost.plugins != null && typeof usableHost.plugins === "object") {
      for (const plugin of Object.values(usableHost.plugins)) {
        for (const span of Object.values(plugin?.spans ?? {})) {
          for (const event of span?.events ?? []) {
            if (event?.err === true) hostErrors.push({ ms: event.ms ?? null, at: event.at ?? null });
          }
        }
      }
    }
    page.evidence = {
      interactions: ranked.slice(0, EVIDENCE_CAPS.interactions).map((ix) => ({
        interactionId: ix.interactionId ?? null,
        duration: ix.duration ?? null,
        owner: ix.owner ?? null,
        bucket: ix.bucket ?? null
      })),
      frames: Array.isArray(collector.heavyFrames) ? collector.heavyFrames.slice(0, EVIDENCE_CAPS.frames) : [],
      hostErrors: hostErrors.slice(0, EVIDENCE_CAPS.hostErrors)
    };
    page.host = usableHost ? {
      source: Array.isArray(usableHost.rows) ? "read" : usableHost.source ?? "snapshot",
      epoch: usableHost.epoch ?? null,
      from: usableHost.since ?? usableHost.from ?? usableHost.sinceStart ?? null,
      to: usableHost.next ?? usableHost.to ?? usableHost.writtenAt ?? null,
      truncated: Array.isArray(usableHost.truncated) ? [...usableHost.truncated] : [],
      basis: usableHost.basis ?? null,
      sinceStart: usableHost.sinceStart ?? null,
      writtenAt: usableHost.writtenAt ?? null,
      enabled: usableHost.enabled ?? null
    } : { source: null, epoch: null, from: null, to: null, truncated: [], basis: null, sinceStart: null, writtenAt: null, enabled: null };
    const notes = [];
    const note = (id, text) => notes.push({ id, text });
    const afterWindow = collector.interactions.some((ix) => Object.values(ix.samples ?? {}).some((sample) => sample.spanAfterWindow));
    if (afterWindow) {
      note("span-after-window", "\u6709\u5F02\u6B65 span \u5728\u4EA4\u4E92\u7A97\u53E3\u7ED3\u675F\u540E\u624D settle\uFF0C\u4ECD\u6309\u8D77\u70B9\u5212\u5165\u8BE5\u7A97\u53E3\u3002");
    }
    if (collector.nanoBlockingMs > 0) {
      note("nano-blocking-over-attribute", "nanoBlockingMs \u6309\u6574\u6761 LoAF \u6761\u76EE\u5F52\u5E76\uFF1B\u542B\u975E nano \u811A\u672C\u7684\u5E27\u4F1A\u628A\u90A3\u90E8\u5206\u65F6\u95F4\u4E00\u5E76\u8BA1\u5165\u3002");
    }
    if (durations.length > 0 && durations.length < 8) {
      note("native-inp-small-sample", `nativeInpCount=${durations.length} < 8\uFF1Ap75 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u4F5C\u9884\u7B97\u5224\u65AD\uFF1B\u8FD9\u4E0D\u662F web-vitals INP\u3002`);
    }
    if (collector.pluginScriptMs.size === 0) {
      note("script-ms-unsplit", "\u9010\u5305 scriptMs \u5168\u4E3A 0\uFF1Acombo URL \u542B\u591A\u4E2A\u5305\u540D\uFF0C\u5355\u5305 URL \u6781\u5C11\u51FA\u73B0\uFF1B\u6309 \xA73.1 \u4E0D\u4E88\u62C6\u5206\u3002");
    }
    if (page.host.source == null) {
      note("host-source-absent", "no host read source");
    }
    const structureOut = {
      ...structure,
      audits: Array.isArray(structure?.audits) ? structure.audits.map((item) => ({ ...item })) : []
    };
    if (input.hostBad === true) structure.badShape = (structure.badShape ?? 0) + 1;
    structureOut.badShape = structure.badShape ?? 0;
    const contributors = (input.meta?.contributors ?? []).map((item) => ({
      plugin: item.plugin ?? item.pluginId ?? null,
      build: item.build ?? null,
      decl: item.decl ?? null
    }));
    return clipOversize({
      schema: "dnpr.report/2",
      meta: {
        protocol: REPORT_VERSION,
        generatedAt: input.meta?.generatedAt ?? null,
        contributors,
        window: {
          startedAt: input.meta?.windowStartedAt ?? null,
          ms: input.meta?.windowMs ?? null
        },
        host: {
          source: page.host.source,
          epoch: page.host.epoch,
          from: page.host.from,
          to: page.host.to,
          truncated: page.host.truncated
        }
      },
      page,
      plugins: pluginOut,
      evidence: page.evidence,
      structure: structureOut,
      notes
    });
  }
  var spanStats, MAX_REPORT_BYTES, EVIDENCE_CAPS, byteLength, usageCell, NOTE_GLOSSARY;
  var init_aggregate = __esm({
    "../packages/dsh-performance-review/src/aggregate.js"() {
      init_state();
      spanStats = (row) => ({
        n: row.n,
        windowN: row.window.length,
        p50: roundMs(percentile(row.window, 0.5)),
        p95: roundMs(percentile(row.window, 0.95)),
        maxMs: roundMs(row.window.length === 0 ? null : Math.max(...row.window)),
        basis: "window"
      });
      MAX_REPORT_BYTES = 256 * 1024;
      EVIDENCE_CAPS = Object.freeze({ interactions: 5, frames: 5, hostErrors: 20 });
      byteLength = (value) => new TextEncoder().encode(JSON.stringify(value)).length;
      usageCell = (cell) => {
        if (typeof cell === "number") return { window: cell, total: cell };
        return { window: cell?.window ?? 0, total: cell?.total ?? 0 };
      };
      NOTE_GLOSSARY = Object.freeze([
        { id: "event-timing-split", text: "Event Timing \u4E09\u6BB5\uFF1AinputDelay\u3001processing\u3001presentation\u3002\u9875\u7EA7 nativeInpP75 \u542B presentation\uFF0C\u4E0D\u6284\u8FDB\u63D2\u4EF6\u884C\u3002" },
        { id: "synthetic-input", text: "lab \u7684 composer-type \u7528\u5408\u6210\u6309\u952E\uFF0Cpresentation \u6BB5\u4E0D\u7B49\u540C\u771F\u5B9E\u7528\u6237 INP\u3002" },
        { id: "script-ms-long-frames", text: "nanoCombined.scriptMs \u53EA\u7EDF\u8BA1\u957F\u5E27\u91CC\u7684\u957F\u811A\u672C\uFF0C\u4E0D\u662F\u603B\u811A\u672C\u8017\u65F6\u3002" },
        { id: "blocking-over-attribute", text: "nanoCombined.blockingMs \u628A\u542B nano \u811A\u672C\u7684\u6574\u6761 LoAF \u8BA1\u5165\uFF0C\u542B\u975E nano \u90E8\u5206\u3002" },
        { id: "client-js-bytes", text: "nanoCombined.clientJsBytes \u662F\u5168\u90E8 nano \u5305 combo \u7684\u5408\u8BA1\uFF0C\u4E0D\u662F\u5355\u4E2A\u63D2\u4EF6\u7684\u4F53\u79EF\u3002" }
      ]);
    }
  });

  // ../packages/dsh-interface/src/contracts/jsonOutcome.js
  var FAILURE_KIND, FAILURE_KINDS;
  var init_jsonOutcome = __esm({
    "../packages/dsh-interface/src/contracts/jsonOutcome.js"() {
      FAILURE_KIND = Object.freeze({
        /** signal aborted; issued-before cancellation makes no server-side claim. */
        CANCELLED: "cancelled",
        /** Network/read-body failure; keep real httpStatus only when headers landed. */
        TRANSPORT: "transport",
        /** Non-2xx that is not a recognized sanctioned business failure; keep status. */
        HTTP: "http",
        /** Pre-request encode/binding failure OR illegal 2xx — never becomes ok:true. */
        PROTOCOL: "protocol",
        /** Recognized sanctioned business failure (incl. legal 2xx business failures). */
        DOMAIN: "domain"
      });
      FAILURE_KINDS = Object.freeze(Object.values(FAILURE_KIND));
    }
  });

  // ../packages/dsh-interface/src/contracts/observeEvent.js
  function fail(message) {
    throw new TypeError(`observe-event: ${message}`);
  }
  function assertObserveEvent(event) {
    if (event == null || typeof event !== "object" || Array.isArray(event)) {
      fail("event must be an object");
    }
    const keys = Object.keys(event);
    for (const key of keys) {
      if (!REQUIRED.includes(key) && !OPTIONAL.has(key)) fail(`unknown field ${key}`);
    }
    for (const key of REQUIRED) {
      if (!Object.prototype.hasOwnProperty.call(event, key)) fail(`missing ${key}`);
    }
    if (!OUTCOMES[event.surface]) fail(`unknown surface ${String(event.surface)}`);
    if (event.id !== null && (typeof event.id !== "string" || event.id === "")) {
      fail("id must be a non-empty string or null");
    }
    if (event.plugin !== null && (typeof event.plugin !== "string" || event.plugin === "")) {
      fail("plugin must be a non-empty string or null");
    }
    if (typeof event.outcome !== "string" || !OUTCOMES[event.surface].has(event.outcome)) {
      fail(`unknown outcome ${String(event.outcome)} for ${event.surface}`);
    }
    if (typeof event.ms !== "number" || !Number.isFinite(event.ms)) fail("ms must be a finite number");
    if (Object.prototype.hasOwnProperty.call(event, "status")) {
      if (typeof event.status !== "number" || !Number.isFinite(event.status)) fail("status must be a finite number");
    }
    if (event.surface === "mcp" && event.outcome === "error") {
      if (typeof event.kind !== "string" || event.kind === "") fail("mcp error requires kind");
    } else if (Object.prototype.hasOwnProperty.call(event, "kind")) {
      if (typeof event.kind !== "string" || event.kind === "") fail("kind must be a non-empty string");
    }
    return event;
  }
  var OBSERVE_SURFACES, HTTP_OUTCOMES, UPGRADE_OUTCOMES, JSON_OUTCOMES, MCP_OUTCOMES, OBSERVE_FIELDS, REQUIRED, OPTIONAL, OUTCOMES;
  var init_observeEvent = __esm({
    "../packages/dsh-interface/src/contracts/observeEvent.js"() {
      init_jsonOutcome();
      OBSERVE_SURFACES = Object.freeze(["http", "upgrade", "json", "mcp"]);
      HTTP_OUTCOMES = Object.freeze(["ok", "rejected", "method", "failed"]);
      UPGRADE_OUTCOMES = Object.freeze(["accepted", "rejected", "method"]);
      JSON_OUTCOMES = Object.freeze(["ok", ...FAILURE_KINDS]);
      MCP_OUTCOMES = Object.freeze(["ok", "error", "rejected"]);
      OBSERVE_FIELDS = Object.freeze([
        "surface",
        "id",
        "plugin",
        "outcome",
        "ms",
        "status",
        "kind"
      ]);
      REQUIRED = ["surface", "id", "plugin", "outcome", "ms"];
      OPTIONAL = /* @__PURE__ */ new Set(["status", "kind"]);
      OUTCOMES = {
        http: new Set(HTTP_OUTCOMES),
        upgrade: new Set(UPGRADE_OUTCOMES),
        json: new Set(JSON_OUTCOMES),
        mcp: new Set(MCP_OUTCOMES)
      };
    }
  });

  // ../packages/dsh-performance-review/src/client.js
  var client_exports = {};
  __export(client_exports, {
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
  function bucketForElement(el, entries) {
    let node = el;
    let depth = 0;
    while (node != null && typeof node === "object" && depth < 12) {
      for (const [name, bucket2] of entries) {
        try {
          if (typeof node.hasAttribute === "function" && node.hasAttribute(name)) return bucket2;
        } catch {
        }
      }
      const descriptor = { tag: node.tagName, attrs: {} };
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
    const globalRef = env.global ?? globalThis;
    const structure = createStructure();
    const plugins = /* @__PURE__ */ new Map();
    const contributors = [];
    const contributorKeys = /* @__PURE__ */ new Set();
    const hostSources = [];
    let hostCursor = null;
    let hostSnapshotCache = null;
    let hostSourceIndex = 0;
    let hostFailures = 0;
    let hostTimer = null;
    const fetchRef = env.fetch ?? globalThis.fetch;
    const setIntervalRef = env.setInterval ?? globalThis.setInterval;
    const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
    const pollHost = async () => {
      if (enabled !== true || hostSources.length === 0 || !visible()) return;
      const url = hostSources[hostSourceIndex % hostSources.length];
      try {
        const res = await fetchRef(`${url}${hostCursor ? `?since=${encodeURIComponent(hostCursor)}` : ""}`, { credentials: "same-origin", cache: "no-store" });
        const body = await res?.json?.();
        if (body != null && typeof body === "object" && body.status !== 400) {
          hostSnapshotCache = body;
          hostCursor = body.next ?? hostCursor;
          hostFailures = 0;
        }
      } catch {
        hostFailures += 1;
        if (hostFailures >= 2) {
          hostSourceIndex += 1;
          hostFailures = 0;
        }
      }
    };
    const startHostPoll = () => {
      if (hostTimer != null || hostSources.length === 0 || enabled !== true) return;
      if (typeof setIntervalRef !== "function") return;
      hostTimer = setIntervalRef(pollHost, 5e3);
      if (typeof hostTimer?.unref === "function") hostTimer.unref();
      pollHost();
    };
    const bucketMap = /* @__PURE__ */ new Map([
      ["data-composer", "composer-textarea"],
      ["data-chat-input", "composer-textarea"],
      ["data-row-key", "sidebar-row"],
      ["data-sidebar-row", "sidebar-row"]
    ]);
    let collector = createCollectorState();
    collector.startedAt = now(perf2);
    let frozenAt = (/* @__PURE__ */ new Date()).toISOString();
    const touch = () => {
      frozenAt = (/* @__PURE__ */ new Date()).toISOString();
    };
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
        const bucket = bucketForElement(pending.target, [...bucketMap.entries()]);
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
      if ((entry.blockingDuration ?? 0) >= 50 || (entry.duration ?? 0) >= 100) {
        collector.heavyFrames.push({
          startTime: entry.startTime ?? null,
          duration: entry.duration ?? null,
          blockingDuration: entry.blockingDuration ?? null,
          styleAndLayoutDuration: entry.styleAndLayoutDuration ?? null
        });
        if (collector.heavyFrames.length > 50) collector.heavyFrames.shift();
      }
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
      const setIntervalRef2 = env.setInterval ?? globalThis.setInterval;
      if (typeof setIntervalRef2 !== "function") return;
      finalizeTimer = setIntervalRef2(() => {
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
      touch();
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
          const cell = collector.counts.get(name) ?? { window: 0, total: 0 };
          cell.window += n;
          cell.total += n;
          collector.counts.set(name, cell);
          touch();
        }
      },
      /**
       * profiler(Component) — wraps with <React.Profiler id="nano:<pluginId>:root">.
       * React comes from impl.react at join (it's an external in every bundle).
       */
      profiler(Component) {
        const React13 = row._react;
        if (React13 == null || typeof React13.Profiler !== "function") return Component;
        const capture = (...args) => {
          const actualDuration = args[2];
          row.profiler.commits += 1;
          row.profiler.durations.push(actualDuration ?? 0);
          while (row.profiler.durations.length > PROFILER_SAMPLE_CAP) row.profiler.durations.shift();
        };
        return function PerfReviewProfiler(props) {
          return React13.createElement(
            React13.Profiler,
            { id: `nano:${pluginId}:root`, onRender: capture },
            React13.createElement(Component, props)
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
      if (typeof impl.hostRoute === "string" && impl.hostRoute !== "" && !hostSources.includes(impl.hostRoute)) {
        hostSources.push(impl.hostRoute);
      }
      for (const entry of impl.buckets ?? []) {
        if (entry && typeof entry.attr === "string" && typeof entry.bucket === "string") {
          bucketMap.set(entry.attr, entry.bucket);
        }
      }
      decideEnabled();
      const row = ensurePlugin(plugins, pluginId);
      const build = impl.build ?? BUILD_STAMP;
      const decl = impl.decl ?? null;
      const key = `${pluginId}@${build}`;
      if (!contributorKeys.has(key)) {
        contributorKeys.add(key);
        contributors.push({ pluginId, build, decl });
      }
      if (impl.version != null) row.meta.version = impl.version;
      if (row.meta.implantedAt == null) row.meta.implantedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (typeof impl.root === "function") row._root = impl.root;
      if (impl.react != null) row._react = impl.react;
      if (!enabled) return disabledApi();
      startHostPoll();
      return makeApi(pluginId, row);
    };
    const cutWindow = () => {
      const counts = collector.counts;
      const resources = collector.resources;
      collector = createCollectorState();
      collector.counts = counts;
      collector.resources = resources;
      collector.startedAt = now(perf2);
      for (const cell of counts.values()) cell.window = 0;
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
        for (const cell of row.usage.values()) cell.window = 0;
        if (row.contract instanceof Map) {
          for (const bucket of row.contract.values()) bucket.window = 0;
        }
        row.profiler.durations = [];
      }
      if (hostSnapshotCache?.next != null) hostCursor = hostSnapshotCache.next;
      hostSnapshotCache = null;
      pollHost();
      touch();
    };
    const observe = (event) => {
      if (enabled === false) return;
      if (event == null || typeof event !== "object" || Array.isArray(event)) {
        structure.badShape += 1;
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(event, "id") || event.id == null || event.id === "") {
        structure.missingBindingId += 1;
        return;
      }
      let admitted;
      try {
        admitted = assertObserveEvent(event);
      } catch {
        structure.badShape += 1;
        return;
      }
      if (typeof admitted.id !== "string" || !CONTRACT_KEY_RE.test(admitted.id)) {
        structure.badShape += 1;
        return;
      }
      if (typeof admitted.plugin !== "string" || admitted.plugin.length === 0) {
        structure.badShape += 1;
        return;
      }
      const row = ensurePlugin(plugins, admitted.plugin);
      let bucket = row.contract.get(admitted.id);
      if (bucket === void 0) {
        bucket = {
          n: 0,
          window: 0,
          outcomes: {},
          status: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 }
        };
        row.contract.set(admitted.id, bucket);
      }
      bucket.n += 1;
      bucket.window += 1;
      bucket.outcomes[admitted.outcome] = (bucket.outcomes[admitted.outcome] ?? 0) + 1;
      const klass = statusClass(admitted.status);
      if (klass) bucket.status[klass] += 1;
      touch();
    };
    const read = (meta = {}) => {
      const input = meta == null || typeof meta !== "object" ? {} : meta;
      finalizeDue(now(perf2));
      const navigatorRef = env.navigator ?? globalThis.navigator;
      const chrome = /Chrome\/(\d+)/.exec(navigatorRef?.userAgent ?? "");
      const provided = Object.prototype.hasOwnProperty.call(input, "host");
      const hostSnapshot = provided ? input.host : hostSnapshotCache;
      const hostBad = hostSnapshot != null && !isHostView(hostSnapshot);
      return buildReport({
        meta: {
          generatedAt: input.generatedAt ?? frozenAt,
          scenario: input.scenario,
          arm: input.arm,
          chromeMajor: input.chromeMajor ?? (chrome === null ? null : Number(chrome[1])),
          contributors: contributors.map((item) => ({ ...item })),
          windowStartedAt: Number.isFinite(collector.startedAt) ? new Date(collector.startedAt).toISOString() : null,
          windowMs: Number.isFinite(collector.startedAt) ? Math.max(0, Math.round(now(perf2) - collector.startedAt)) : null
        },
        collector,
        plugins,
        structure,
        hostSnapshot: hostBad ? null : hostSnapshot,
        hostBad,
        enabled: enabled === true,
        loafSupported
      });
    };
    return {
      join,
      read,
      cutWindow,
      observe,
      /** test/diagnostic accessors — not part of the implant contract. */
      _state: () => ({ collector, plugins, structure, enabled, loafSupported, contributors }),
      _finalizeDue: finalizeDue,
      _absorbEventEntry: absorbEventEntry,
      _absorbLoafEntry: absorbLoafEntry,
      _absorbResourceEntry: absorbResourceEntry,
      _build: env.build ?? BUILD_STAMP
    };
  }
  function ensurePerfReview(env = {}) {
    const global = env.global ?? globalThis;
    const stamp = env.build ?? BUILD_STAMP;
    return installSingleton(global, CLIENT_KEY, "__perfReview", stamp, () => createPerfReview({ ...env, build: stamp }));
  }
  var TRACK_EVENT_CAP, SPAN_EVENT_CAP, PROFILER_SAMPLE_CAP, now, isPromiseLike, HIDDEN_SELECTOR, contains, isHostView, statusClass;
  var init_client = __esm({
    "../packages/dsh-performance-review/src/client.js"() {
      init_state();
      init_aggregate();
      init_observeEvent();
      TRACK_EVENT_CAP = 4096;
      SPAN_EVENT_CAP = 4096;
      PROFILER_SAMPLE_CAP = 128;
      now = (perf2) => perf2.now();
      isPromiseLike = (value) => value !== null && typeof value === "object" && typeof value.then === "function";
      HIDDEN_SELECTOR = '[hidden],[aria-hidden="true"]';
      contains = (parent, child) => {
        if (parent == null || child == null) return false;
        if (parent === child) return true;
        return typeof parent.contains === "function" ? parent.contains(child) : false;
      };
      isHostView = (value) => value != null && typeof value === "object" && (Array.isArray(value.rows) || value.plugins != null && typeof value.plugins === "object");
      statusClass = (status) => {
        if (typeof status !== "number" || !Number.isFinite(status)) return null;
        const hundred = Math.floor(status / 100);
        if (hundred === 2) return "2xx";
        if (hundred === 3) return "3xx";
        if (hundred === 4) return "4xx";
        if (hundred === 5) return "5xx";
        return null;
      };
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        ensurePerfReview();
      }
    }
  });

  // lib/perf-declaration.js
  var perf_declaration_exports = {};
  __export(perf_declaration_exports, {
    BUCKETS: () => BUCKETS,
    DECL_HASH: () => DECL_HASH,
    KEYS: () => KEYS
  });
  var KEYS, BUCKETS, DECL_HASH;
  var init_perf_declaration = __esm({
    "lib/perf-declaration.js"() {
      KEYS = Object.freeze({ "spans": ["pane-op", "navigate"], "tracks": [], "usage": [], "hostSpans": [] });
      BUCKETS = Object.freeze([]);
      DECL_HASH = "4a17c8771d1e";
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
          typeDescription: "\u5728\u5BB9\u5668\u91CC\u6D4F\u89C8\u9875\u9762\uFF0C\u70B9\u9009\u5143\u7D20\uFF0C\u5E76\u7528\u5F00\u53D1\u8005\u5DE5\u5177\u68C0\u67E5",
          addressPlaceholder: "\u8F93\u5165 HTTP(S) \u5730\u5740",
          addressShort: "\u7F51\u5740",
          addressAria: "\u9875\u9762\u5730\u5740",
          back: "\u540E\u9000",
          forward: "\u524D\u8FDB",
          refresh: "\u5237\u65B0",
          go: "\u524D\u5F80",
          annotate: "\u6807\u6CE8",
          annotateTitle: "\u6807\u6CE8\u3002\u6309\u4F4F Shift \u62D6\u4E00\u6761\u7BAD\u5934",
          history: "\u6D4F\u89C8\u5386\u53F2",
          settings: "\u8BBE\u7F6E",
          navToggleLabel: "\u6807\u7B7E\u9875",
          navOpen: "\u6807\u7B7E\u9875\u680F",
          navOpenTitle: "\u5C55\u5F00\u6807\u7B7E\u9875\u680F",
          navClose: "\u6536\u8D77\u6807\u7B7E\u9875\u680F",
          navCloseTitle: "\u6536\u8D77\u6807\u7B7E\u9875\u680F\uFF08Esc\uFF09",
          navTabs: "\u6807\u7B7E\u9875",
          navEmpty: "\u8FD8\u6CA1\u6709\u6253\u5F00\u7684\u9875\u9762",
          noteAria: "\u5199\u7ED9 composer \u7684\u5907\u6CE8",
          notePlaceholder: "\u8FD9\u4E00\u5904\u8981\u6539\u4EC0\u4E48",
          noteSend: "\u52A0\u5165\u6807\u6CE8",
          injectContext: "\u6CE8\u5165\u5230 composer",
          copyContext: "\u590D\u5236\u4E0A\u4E0B\u6587",
          inputContext: "\u8F93\u5165\u5907\u6CE8",
          copied: "\u4E0A\u4E0B\u6587\u5DF2\u590D\u5236",
          devtools: "\u5F00\u53D1\u8005\u5DE5\u5177",
          devtoolsConsole: "Console",
          devtoolsNetwork: "Network",
          devtoolsEmpty: "\u8FD8\u6CA1\u6709\u8BB0\u5F55",
          devtoolsClear: "\u6E05\u7A7A",
          devtoolsClose: "\u5173\u95ED",
          devtoolsFailedOnly: "\u4EC5\u5931\u8D25",
          devtoolsFailedOnlyHint: "\u53EA\u663E\u793A\u5931\u8D25\u6216 HTTP \u72B6\u6001 \u2265 400 \u7684\u8BF7\u6C42",
          devtoolsSearch: "\u641C\u7D22\u7F51\u5740\u3001\u7C7B\u578B\u3001\u72B6\u6001\u6216\u65B9\u6CD5",
          devtoolsSearchConsole: "\u641C\u7D22\u7EA7\u522B\u6216\u6D88\u606F",
          devtoolsSearchElements: "\u641C\u7D22\u6807\u7B7E\u3001ID \u6216 class",
          devtoolsNodes: "\u8282\u70B9",
          devtoolsElements: "\u5143\u7D20",
          devtoolsDepth: "\u6DF1\u5EA6",
          devtoolsDomStatsHint: "\u5F53\u524D Elements \u6811\u7684\u8282\u70B9\u6570\u3001\u5143\u7D20\u6570\u4E0E\u6700\u5927\u6DF1\u5EA6\uFF08\u6765\u81EA /elements\uFF09",
          devtoolsRefresh: "\u5237\u65B0",
          devtoolsCloseStyles: "\u5173\u95ED\u6837\u5F0F\u8BE6\u60C5",
          devtoolsTypeAll: "\u5168\u90E8\u7C7B\u578B",
          devtoolsFilterType: "\u6309\u8D44\u6E90\u7C7B\u578B\u7B5B\u9009",
          devtoolsFilterLevel: "\u6309\u65E5\u5FD7\u7EA7\u522B\u7B5B\u9009",
          devtoolsAllLevels: "\u5168\u90E8\u7EA7\u522B",
          devtoolsNoMatch: "\u6CA1\u6709\u5339\u914D\u7684\u8BF7\u6C42",
          devtoolsNoMatchConsole: "\u6CA1\u6709\u5339\u914D\u7684\u65E5\u5FD7",
          devtoolsHeaders: "Headers",
          devtoolsPayload: "Payload",
          devtoolsResponse: "Response",
          devtoolsGeneral: "\u5E38\u89C4",
          devtoolsRequestHeaders: "\u8BF7\u6C42\u5934",
          devtoolsResponseHeaders: "\u54CD\u5E94\u5934",
          devtoolsRequestUrl: "\u8BF7\u6C42 URL",
          devtoolsMethod: "\u65B9\u6CD5",
          devtoolsStatus: "\u72B6\u6001",
          devtoolsType: "\u7C7B\u578B",
          devtoolsMimeType: "MIME \u7C7B\u578B",
          devtoolsRemoteAddress: "\u8FDC\u7A0B\u5730\u5740",
          devtoolsNoHeaders: "\u6CA1\u6709\u8BB0\u5F55\u5230\u8BF7\u6C42\u5934\u6216\u54CD\u5E94\u5934",
          devtoolsQuery: "\u67E5\u8BE2\u53C2\u6570",
          devtoolsRequestPayload: "\u8BF7\u6C42\u4F53",
          devtoolsNoPayload: "\u65E0\u8BF7\u6C42\u4F53",
          devtoolsResponseBody: "\u54CD\u5E94\u4F53",
          devtoolsNoResponseBody: "\u5F15\u64CE\u672A\u4FDD\u7559\u54CD\u5E94\u4F53",
          devtoolsEmptyBody: "\u54CD\u5E94\u4F53\u4E3A\u7A7A",
          devtoolsLoading: "\u52A0\u8F7D\u4E2D\u2026",
          devtoolsDetailError: "\u8BF7\u6C42\u8BE6\u60C5\u52A0\u8F7D\u5931\u8D25",
          devtoolsDetailClose: "\u5173\u95ED\u8BF7\u6C42\u8BE6\u60C5",
          devtoolsProtocol: "\u534F\u8BAE",
          devtoolsUnsupported: "\u4E0D\u652F\u6301",
          devtoolsElementsTab: "Elements",
          devtoolsAnonymous: "(\u533F\u540D)",
          devtoolsDisableCache: "\u7981\u7528\u7F13\u5B58",
          devtoolsCacheUnsupported: "\u5F15\u64CE\u6682\u4E0D\u652F\u6301\u7981\u7528\u7F13\u5B58\uFF1A\u5F53\u524D Kitesurf \u7684 Network.setCacheDisabled \u662F\u7A7A\u5B9E\u73B0\uFF08no-op\uFF09\uFF0C\u4E0D\u4F1A\u6539\u53D8\u7F13\u5B58\u884C\u4E3A",
          devtoolsSizeHint: "\u54CD\u5E94\u4F53\u4F20\u8F93\u5927\u5C0F\uFF08encodedDataLength\uFF09",
          devtoolsResize: "\u62D6\u52A8\u8C03\u6574\u9AD8\u5EA6",
          devtoolsCollapse: "\u6298\u53E0",
          devtoolsExpand: "\u5C55\u5F00",
          colTag: "\u6807\u7B7E",
          colElement: "\u5143\u7D20",
          colChildren: "\u5B50\u8282\u70B9",
          colTime: "\u65F6\u95F4",
          colLevel: "\u7EA7\u522B",
          colMessage: "\u6D88\u606F",
          colSource: "\u6765\u6E90",
          colMethod: "\u65B9\u6CD5",
          colStatus: "\u72B6\u6001",
          colType: "\u7C7B\u578B",
          colUrl: "\u5730\u5740",
          colSize: "\u5927\u5C0F",
          colDuration: "\u8017\u65F6",
          colWaterfall: "\u7011\u5E03",
          hitlAgent: "Agent \u6B63\u5728\u63A7\u5236",
          hitlHeld: "\u4EBA\u5DE5\u63A5\u7BA1\u4E2D",
          hitlTakeover: "\u63A5\u7BA1",
          hitlTakeoverTitle: "\u4EBA\u5DE5\u63A5\u7BA1\uFF1A\u6682\u505C Agent \u5BF9\u9875\u9762\u7684\u5199\u5165\uFF0C\u7531\u4F60\u64CD\u4F5C",
          hitlRelease: "\u505C\u6B62\u5199\u5165",
          hitlAction: "Agent \u52A8\u4F5C",
          envTitle: "\u73AF\u5883\u81EA\u68C0",
          envPlugin: "\u63D2\u4EF6",
          envEngine: "\u5F15\u64CE",
          envContainer: "\u5BB9\u5668",
          envPorts: "\u7AEF\u53E3",
          envInstance: "\u5B9E\u4F8B",
          envUnknown: "\u672A\u77E5",
          envBad: "\u5F02\u5E38",
          envOk: "OK",
          portHeld: "\u672C\u63D2\u4EF6\u5BB9\u5668",
          portFree: "\u7A7A\u95F2",
          planePage: "\u9875\u9762",
          planeDom: "DOM",
          planeBridge: "\u6865",
          prepareEnv: "\u4E00\u952E\u51C6\u5907\u73AF\u5883",
          preparingEnv: "\u6B63\u5728\u51C6\u5907\u2026",
          prepareDone: "\u73AF\u5883\u5DF2\u5C31\u7EEA",
          prepareFailed: "\u51C6\u5907\u5931\u8D25",
          prepareNotReady: "\u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u672A\u901A\u8FC7",
          copyDiag: "\u590D\u5236\u8BCA\u65AD\u4FE1\u606F",
          copyDiagHint: "\u590D\u5236\u53EF\u8BFB\u8BCA\u65AD\u6458\u8981\uFF1B\u6309\u4F4F Shift \u590D\u5236\u5B8C\u6574 JSON",
          diagCopied: "\u8BCA\u65AD\u4FE1\u606F\u5DF2\u590D\u5236",
          envHint: "\u4F9D\u6B21\u68C0\u67E5\u5BB9\u5668\u3001\u7AEF\u53E3\u3001\u5F15\u64CE\u5065\u5EB7\u5E76\u81EA\u52A8\u4FEE\u590D",
          contractNewer: "\u5BBF\u4E3B\u89C2\u5BDF\u5408\u540C\u7248\u672C\u8F83\u65B0",
          logsButton: "\u5F15\u64CE\u65E5\u5FD7",
          logsTitle: "\u5F15\u64CE\u65E5\u5FD7",
          logsDesc: "\u5BB9\u5668\u91CC Kitesurf \u81EA\u5DF1\u7684\u8F93\u51FA\uFF0C\u6700\u8FD1 300 \u884C\u3002",
          logsLoading: "\u8BFB\u53D6\u4E2D\u2026",
          logsEmpty: "\uFF08\u6CA1\u6709\u8F93\u51FA\uFF09",
          legacyHost: "\u65E7\u5BBF\u4E3B",
          legacyHostTitle: "\u5BBF\u4E3B\u63D2\u4EF6\u6BD4\u9762\u677F\u65E7\uFF0C\u5C11\u62A5\u51E0\u9879\u660E\u7EC6\uFF0C\u4E0D\u5F71\u54CD\u6D4F\u89C8",
          noteEmpty: "\u53EF\u76F4\u63A5\u6CE8\u5165\uFF0C\u65E0\u9700\u586B\u5199",
          opening: "\u6B63\u5728\u6253\u5F00\u9875\u9762",
          engineDown: "\u5F15\u64CE\u6CA1\u6709\u5E94\u7B54",
          engineMismatch: "\u8BE5\u5730\u5740\u4E0A\u8FD0\u884C\u7684\u4E0D\u662F Kitesurf",
          emptyHint: "\u8F93\u5165 HTTP(S) \u5730\u5740\u5F00\u59CB\u6D4F\u89C8",
          pinsCount: "\u6761\u5F85\u53D1\u9001\u6807\u6CE8",
          pinsFull: "\uFF08\u5DF2\u8FBE\u4E0A\u9650\uFF0C\u65E7\u6807\u6CE8\u5C06\u88AB\u4E22\u5F03\uFF09",
          sendAll: "\u53D1\u9001\u5168\u90E8\u6807\u6CE8",
          undoPin: "\u64A4\u9500\u4E0A\u4E00\u6761\u6807\u6CE8",
          hintBar: "\u70B9\u9009 \xB7 Shift+\u591A\u9009 \xB7 Alt+\u692D\u5706 \xB7 Shift+\u7BAD\u5934 \xB7 \u2191\u2193 \u7236/\u5B50 \xB7 \u53CC\u51FB\u6539\u6587\u5B57 \xB7 Esc \u5173\u95ED\u9009\u4E2D",
          clearSelection: "\u5173\u95ED\u9009\u4E2D",
          openFailed: "\u9875\u9762\u6CA1\u6709\u6253\u5F00",
          navigateUnconfirmed: "\u5F15\u64CE\u63A5\u53D7\u4E86\u5730\u5740\uFF0C\u4F46\u6CA1\u6709\u6E32\u67D3\u51FA\u9875\u9762\u3002\u4E0B\u9762\u662F\u5F15\u64CE\u81EA\u5DF1\u7684\u65E5\u5FD7\u3002",
          startEngine: "\u542F\u52A8\u5F15\u64CE",
          clearPins: "\u6E05\u7A7A\u5168\u90E8\u6807\u6CE8",
          editAria: "\u628A\u8FD9\u6BB5\u6587\u5B57\u5199\u56DE\u5143\u7D20",
          editPlaceholder: "\u6539\u8FD9\u91CC\u7684\u6587\u5B57\u2026",
          editSend: "\u5199\u56DE\u5143\u7D20",
          stalePage: "\u9875\u9762\u5DF2\u53D8\u5316\uFF0C\u753B\u9762\u5DF2\u5237\u65B0\u2014\u2014\u8BF7\u91CD\u65B0\u70B9\u9009",
          settingsTitle: "\u6D4F\u89C8\u8BBE\u7F6E",
          tabEnv: "\u73AF\u5883",
          tabBrowse: "\u6A21\u62DF",
          settingsDesc: "\u73AF\u5883\u5065\u5EB7\u4E0E\u6D4F\u89C8\u5668\u6A21\u62DF\u3002\u6A21\u62DF\u8BBE\u7F6E\u5BF9\u65B0\u5BFC\u822A\u751F\u6548\uFF1B\u6D4F\u89C8\u5386\u53F2\u5728\u5DE5\u5177\u680F\u7684\u5386\u53F2\u5165\u53E3\u3002",
          cancel: "\u53D6\u6D88",
          save: "\u4FDD\u5B58",
          close: "\u5173\u95ED",
          uaLabel: "User-Agent",
          uaPlaceholder: "\u7559\u7A7A\u5219\u4F7F\u7528\u5F15\u64CE\u9ED8\u8BA4",
          viewportLabel: "\u9ED8\u8BA4\u5206\u8FA8\u7387",
          viewportSupport: "deviceScaleFactor \u53EA\u652F\u6301 1\uFF0Cmobile \u53EA\u652F\u6301 false\uFF1B\u5176\u4ED6\u503C\u4F1A\u88AB\u5F15\u64CE\u62D2\u7EDD",
          localeLabel: "\u9ED8\u8BA4\u8BED\u8A00",
          localePlaceholder: "\u5982 zh-CN / en-US",
          geoLabel: "\u9ED8\u8BA4\u5730\u7406\u4F4D\u7F6E\uFF08GPS\uFF09",
          geoLat: "\u7EAC\u5EA6",
          geoLng: "\u7ECF\u5EA6",
          geoHint: "\u7559\u7A7A\u4E0D\u6A21\u62DF\uFF1B\u7EAC\u5EA6 -90..90\uFF0C\u7ECF\u5EA6 -180..180",
          colorSchemeLabel: "\u8272\u5F69\u65B9\u6848",
          colorSchemeLight: "Light",
          colorSchemeDark: "Dark",
          cookiesLabel: "Cookie",
          cookiesPlaceholder: "name=value\uFF0C\u6BCF\u884C\u4E00\u4E2A",
          cookiesHint: "\u4FDD\u5B58\u65F6\u66FF\u6362\u5F53\u524D\u9875\u9762 Cookie\uFF1B\u8DE8\u5BFC\u822A\u7531\u9A71\u52A8\u91CD\u65B0\u5E94\u7528\u3002",
          viewportDefault: "\u9ED8\u8BA4",
          viewportDesktop: "\u684C\u9762 1280",
          viewportTablet: "\u5E73\u677F 768",
          viewportPhone: "\u624B\u673A 390",
          saved: "\u8BBE\u7F6E\u5DF2\u4FDD\u5B58",
          savedUnconfirmed: "\u4FDD\u5B58\u5DF2\u63D0\u4EA4\uFF0C\u672A\u786E\u8BA4\u751F\u6548",
          envProbing: "\u68C0\u6D4B\u4E2D\u2026",
          staleBanner: "\u663E\u793A\u4E0A\u6B21\u6210\u529F\u753B\u9762 {url} \xB7 \u5BFC\u822A/\u5237\u65B0\u5931\u8D25",
          staticPreview: "\u9759\u6001\u9884\u89C8",
          navigating: "\u5BFC\u822A\u4E2D",
          engineBusy: "\u5F15\u64CE\u4ECD\u5728\u6267\u884C\uFF08\u8D85\u65F6\u4E0D\u7B49\u4E8E\u53D6\u6D88\uFF09",
          engineBusyTitle: "\u5F15\u64CE\u4ECD\u5728\u6267\u884C {url} \u7684\u5BFC\u822A\uFF0C\u8D85\u65F6\u8FD4\u56DE\u4E0D\u4EE3\u8868\u5DF2\u53D6\u6D88",
          emptyTitle: "\u5F00\u59CB\u6D4F\u89C8",
          emptyBody: "\u5C55\u5F00\u6807\u7B7E\u9875\u680F\u5E76\u8F93\u5165\u7F51\u5740\u3002Kitesurf \u4F1A\u5728\u5BB9\u5668\u91CC\u6253\u5F00\u9875\u9762\uFF1B\u518D\u70B9\u300C\u6807\u6CE8\u300D\uFF0C\u5728\u753B\u9762\u4E0A\u70B9\u9009\u5143\u7D20\u3002",
          emptyTry: "\u8BD5\u8BD5 example.com",
          errorTitle: "\u5F15\u64CE\u6CA1\u6709\u5E94\u7B54",
          errorBody: "\u5BB9\u5668\u91CC\u7684 Kitesurf \u6CA1\u6709\u54CD\u5E94\u3002\u5148\u542F\u52A8\u5F15\u64CE\uFF1B\u82E5\u5DF2\u542F\u52A8\uFF0C\u590D\u5236\u8BCA\u65AD\u4FE1\u606F\u6392\u67E5\u6C99\u7BB1\u5BBF\u4E3B\u3002",
          retry: "\u91CD\u8BD5",
          resumeEngine: "\u6062\u590D\u5F15\u64CE",
          diagnose: "\u8BCA\u65AD\u4FE1\u606F",
          injectedChars: "\u5DF2\u6CE8\u5165 {n} \u4E2A\u5B57\u7B26",
          injectedCharsRef: "\u5DF2\u6CE8\u5165 {n} \u4E2A\u5B57\u7B26\uFF08ref #{id}\uFF09",
          contractMismatch: "\u89C2\u5BDF\u5408\u540C\u4E0D\u5339\u914D",
          historyTitle: "\u6D4F\u89C8\u5386\u53F2",
          historyCount: "{n} \u6761",
          historySearch: "\u641C\u7D22\u5730\u5740\u2026",
          historyClear: "\u6E05\u7A7A",
          historyEmpty: "\u8FD8\u6CA1\u6709\u6D4F\u89C8\u8BB0\u5F55",
          historyDelete: "\u5220\u9664",
          historyTimes: " \xB7 {n} \u6B21",
          navCloseTab: "\u5173\u95ED\u6807\u7B7E\u9875",
          nativeHtmlTitle: "\u7528\u9875\u9762\u81EA\u5DF1\u7684 HTML \u6E32\u67D3",
          devtoolsToggleTitle: "\u5F00\u53D1\u8005\u5DE5\u5177\uFF08\u2318E\uFF0C\u7136\u540E\u6309 2\uFF09",
          viewportTitle: "\u9875\u9762\u89C6\u53E3",
          viewportFit: "\u81EA\u9002\u5E94",
          viewportCustom: "\u81EA\u5B9A\u4E49\u2026",
          viewportWidthPh: "\u5BBD",
          viewportHeightPh: "\u9AD8",
          modeHtml: "HTML \u539F\u751F\u6E32\u67D3",
          modeShot: "\u622A\u56FE\u56DE\u9000",
          modeEmpty: "\u672A\u6253\u5F00\u9875\u9762",
          geoInvalid: "\u7ECF\u7EAC\u5EA6\u9700\u8981\u540C\u65F6\u586B\u5199\uFF0C\u4E14\u7EAC\u5EA6 -90..90\u3001\u7ECF\u5EA6 -180..180"
        },
        en: {
          typeLabel: "Kitesurf",
          typeDescription: "Browse pages in the container, pick elements, and inspect them with DevTools",
          addressPlaceholder: "Enter an HTTP(S) address",
          addressShort: "URL",
          addressAria: "Page URL",
          back: "Back",
          forward: "Forward",
          refresh: "Refresh",
          go: "Go",
          annotate: "Annotate",
          annotateTitle: "Annotate. Hold Shift and drag to draw an arrow",
          history: "Browsing history",
          settings: "Settings",
          navToggleLabel: "Tabs",
          navOpen: "Tab rail",
          navOpenTitle: "Show tab rail",
          navClose: "Hide tab rail",
          navCloseTitle: "Hide tab rail (Esc)",
          navTabs: "Tabs",
          navEmpty: "No pages open yet",
          noteAria: "Note for the composer",
          notePlaceholder: "What should change here",
          noteSend: "Add note",
          injectContext: "Insert into composer",
          copyContext: "Copy context",
          inputContext: "Add a note",
          copied: "Context copied",
          devtools: "DevTools",
          devtoolsConsole: "Console",
          devtoolsNetwork: "Network",
          devtoolsEmpty: "No entries yet",
          devtoolsClear: "Clear",
          devtoolsClose: "Close",
          devtoolsFailedOnly: "Failed only",
          devtoolsFailedOnlyHint: "Show only failed requests or HTTP status \u2265 400",
          devtoolsSearch: "Filter URL, type, status, or method",
          devtoolsSearchConsole: "Filter level or message",
          devtoolsSearchElements: "Filter tag, ID, or class",
          devtoolsNodes: "nodes",
          devtoolsElements: "elements",
          devtoolsDepth: "depth",
          devtoolsDomStatsHint: "Node count, element count and maximum depth of the current Elements tree (from /elements)",
          devtoolsRefresh: "Refresh",
          devtoolsCloseStyles: "Close style details",
          devtoolsTypeAll: "All types",
          devtoolsFilterType: "Filter by resource type",
          devtoolsFilterLevel: "Filter by log level",
          devtoolsAllLevels: "All levels",
          devtoolsNoMatch: "No matching requests",
          devtoolsNoMatchConsole: "No matching logs",
          devtoolsHeaders: "Headers",
          devtoolsPayload: "Payload",
          devtoolsResponse: "Response",
          devtoolsGeneral: "General",
          devtoolsRequestHeaders: "Request headers",
          devtoolsResponseHeaders: "Response headers",
          devtoolsRequestUrl: "Request URL",
          devtoolsMethod: "Method",
          devtoolsStatus: "Status",
          devtoolsType: "Type",
          devtoolsMimeType: "MIME type",
          devtoolsRemoteAddress: "Remote address",
          devtoolsNoHeaders: "No headers recorded",
          devtoolsQuery: "Query parameters",
          devtoolsRequestPayload: "Request payload",
          devtoolsNoPayload: "No request body",
          devtoolsResponseBody: "Response body",
          devtoolsNoResponseBody: "The engine did not retain a response body",
          devtoolsEmptyBody: "Response body is empty",
          devtoolsLoading: "Loading\u2026",
          devtoolsDetailError: "Could not load request details",
          devtoolsDetailClose: "Close request details",
          devtoolsProtocol: "Protocol",
          devtoolsUnsupported: "Unsupported",
          devtoolsElementsTab: "Elements",
          devtoolsAnonymous: "(anonymous)",
          devtoolsDisableCache: "Disable cache",
          devtoolsCacheUnsupported: "Cache disabling is not supported by this engine: the current Kitesurf build implements Network.setCacheDisabled as a no-op.",
          devtoolsSizeHint: "Response body transfer size (encodedDataLength)",
          devtoolsResize: "Drag to resize",
          devtoolsCollapse: "Collapse",
          devtoolsExpand: "Expand",
          colTag: "Tag",
          colElement: "Element",
          colChildren: "Children",
          colTime: "Time",
          colLevel: "Level",
          colMessage: "Message",
          colSource: "Source",
          colMethod: "Method",
          colStatus: "Status",
          colType: "Type",
          colUrl: "URL",
          colSize: "Size",
          colDuration: "Time",
          colWaterfall: "Waterfall",
          hitlAgent: "Agent is controlling",
          hitlHeld: "Human override",
          hitlTakeover: "Take over",
          hitlTakeoverTitle: "Human override: pause the agent\u2019s page writes while you drive",
          hitlRelease: "Stop writes",
          hitlAction: "Agent action",
          envTitle: "Environment",
          envPlugin: "Plugin",
          envEngine: "Engine",
          envContainer: "Container",
          envPorts: "Ports",
          envInstance: "Instance",
          envUnknown: "Unknown",
          envBad: "Unhealthy",
          envOk: "OK",
          portHeld: "This plugin\u2019s container",
          portFree: "Free",
          planePage: "Page",
          planeDom: "DOM",
          planeBridge: "Bridge",
          prepareEnv: "Prepare environment",
          preparingEnv: "Preparing\u2026",
          prepareDone: "Environment ready",
          prepareFailed: "Prepare failed",
          prepareNotReady: "Environment not ready \u2014 failed",
          copyDiag: "Copy diagnostics",
          copyDiagHint: "Copies the readable summary; hold Shift for full JSON",
          diagCopied: "Diagnostics copied",
          envHint: "Checks container, ports and engine health, then repairs automatically",
          contractNewer: "Host reports a newer observation contract",
          logsButton: "Engine log",
          logsTitle: "Engine log",
          logsDesc: "Kitesurf output from inside the container, last 300 lines.",
          logsLoading: "Reading\u2026",
          logsEmpty: "(no output)",
          legacyHost: "Older host",
          legacyHostTitle: "The host plugin predates this pane and reports fewer fields; browsing still works",
          noteEmpty: "Insert without typing",
          opening: "Opening page",
          engineDown: "Engine is not answering",
          engineMismatch: "The origin answered but is not Kitesurf",
          emptyHint: "Enter an HTTP(S) address to start browsing",
          pinsCount: "notes pending",
          pinsFull: " (at cap \u2014 oldest dropped)",
          sendAll: "Send all notes",
          undoPin: "Undo last note",
          hintBar: "Click \xB7 Shift+multi \xB7 Alt+ellipse \xB7 Shift+arrow \xB7 \u2191\u2193 parent/child \xB7 double-click edit \xB7 Esc clears the pick",
          clearSelection: "Clear selection",
          openFailed: "Page did not open",
          navigateUnconfirmed: "The engine accepted the address but never rendered it. Its own log is below.",
          startEngine: "Start engine",
          clearPins: "Clear all notes",
          editAria: "Write this text back into the element",
          editPlaceholder: "Edit this text\u2026",
          editSend: "Write back",
          stalePage: "Page changed \u2014 frame refreshed, pick again",
          settingsTitle: "Browser settings",
          tabEnv: "Environment",
          tabBrowse: "Simulation",
          settingsDesc: "Environment health and browser simulation. Simulation changes apply to new navigations; browsing history lives in the toolbar.",
          cancel: "Cancel",
          save: "Save",
          close: "Close",
          uaLabel: "User-Agent",
          uaPlaceholder: "Leave empty for engine default",
          viewportLabel: "Default resolution",
          viewportSupport: "Only deviceScaleFactor 1 and mobile false are supported; other values are rejected by the engine",
          localeLabel: "Default language",
          localePlaceholder: "e.g. zh-CN / en-US",
          geoLabel: "Default geolocation (GPS)",
          geoLat: "Latitude",
          geoLng: "Longitude",
          geoHint: "Leave blank to skip; latitude -90..90, longitude -180..180",
          colorSchemeLabel: "Color scheme",
          colorSchemeLight: "Light",
          colorSchemeDark: "Dark",
          cookiesLabel: "Cookie",
          cookiesPlaceholder: "name=value, one per line",
          cookiesHint: "Replaces the current page cookies on save; the driver reapplies them after navigation.",
          viewportDefault: "Default",
          viewportDesktop: "Desktop 1280",
          viewportTablet: "Tablet 768",
          viewportPhone: "Phone 390",
          saved: "Settings saved",
          savedUnconfirmed: "Save submitted \u2014 not confirmed applied",
          envProbing: "Checking\u2026",
          staleBanner: "Showing last good frame {url} \xB7 navigation/refresh failed",
          staticPreview: "Static preview",
          navigating: "Navigating",
          engineBusy: "Engine still running (a timeout is not a cancel)",
          engineBusyTitle: "Engine is still navigating to {url}; a timed-out reply did not cancel it",
          emptyTitle: "Start browsing",
          emptyBody: "Open the tab rail and enter a URL. Kitesurf opens the page in the container. Then choose Annotate and pick elements on the page.",
          emptyTry: "Try example.com",
          errorTitle: "Engine is not answering",
          errorBody: "Kitesurf inside the container is not responding. Start the engine; if it is already started, copy diagnostics and inspect the sandbox host.",
          retry: "Retry",
          resumeEngine: "Resume engine",
          diagnose: "Diagnostics",
          injectedChars: "Injected {n} characters",
          injectedCharsRef: "Injected {n} characters (ref #{id})",
          contractMismatch: "Observation contract does not match",
          historyTitle: "Browsing history",
          historyCount: "{n}",
          historySearch: "Search addresses\u2026",
          historyClear: "Clear",
          historyEmpty: "No browsing history yet",
          historyDelete: "Delete",
          historyTimes: " \xB7 {n}\xD7",
          navCloseTab: "Close tab",
          nativeHtmlTitle: "Render the page\u2019s own HTML",
          devtoolsToggleTitle: "DevTools (\u2318E, then 2)",
          viewportTitle: "Page viewport",
          viewportFit: "Fit",
          viewportCustom: "Custom\u2026",
          viewportWidthPh: "W",
          viewportHeightPh: "H",
          modeHtml: "Native HTML",
          modeShot: "Screenshot fallback",
          modeEmpty: "No page open",
          geoInvalid: "Enter both latitude (\u221290..90) and longitude (\u2212180..180)"
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
    const refId = cleanLine(extra.ref, 32) || "k0";
    const lines = [`<kitesurf ref="${refId}" n="1">`];
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
    const attrs = source.attrs && typeof source.attrs === "object" ? source.attrs : {};
    const keep = ["role", "aria-label", "href", "type", "name", "alt", "title", "placeholder"];
    const attrLine = keep.filter((k) => typeof attrs[k] === "string" && attrs[k]).map((k) => `${k}=${String(attrs[k]).slice(0, 60)}`).join("; ");
    if (attrLine) lines.push(`attrs: ${attrLine}`);
    const ancestors = Array.isArray(source.ancestors) ? source.ancestors.filter(Boolean).slice(0, 5) : [];
    if (ancestors.length) lines.push(`anc: ${ancestors.join(" < ")}`);
    if (Array.isArray(source.componentStack) && source.componentStack.length) {
      lines.push(`stack: ${source.componentStack.slice(-4).join(" \u2192 ")}`);
    } else {
      lines.push("stack: none");
    }
    const comment = cleanLine(extra.comment, 160);
    if (comment) lines.push(`ask: ${comment}`);
    lines.push("</kitesurf>");
    let note = lines.join("\n");
    if (note.length > NOTE_BUDGET) note = `${note.slice(0, NOTE_BUDGET - 1)}\u2026`;
    return note;
  }
  function multiNote(elements, extra = {}) {
    const list = (Array.isArray(elements) ? elements : []).filter((item) => item && typeof item === "object");
    if (list.length <= 1) return designNote(list[0], extra);
    const refId = cleanLine(extra.ref, 32) || "k0";
    const lines = [`<kitesurf ref="${refId}" n="${list.length}">`];
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
    lines.push("</kitesurf>");
    let note = lines.join("\n");
    if (note.length > NOTE_BUDGET * 2) note = `${note.slice(0, NOTE_BUDGET * 2 - 1)}\u2026`;
    return note;
  }
  function batchNote(notes) {
    const items = (Array.isArray(notes) ? notes : []).filter((item) => typeof item === "string" && item.startsWith("<kitesurf")).slice(0, 8);
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    let body = `<kitesurf-batch n="${items.length}">
` + items.map((item, index) => `#${index + 1}
${item}`).join("\n") + "\n</kitesurf-batch>";
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
    const h8 = Math.round(Number(box.height) || 0);
    if (w <= 0 || h8 <= 0) return `${x},${y} empty`;
    return `${x},${y} ${w}x${h8}`;
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
      STYLE_ORDER = ["color", "backgroundColor", "fontSize", "fontFamily", "fontWeight", "lineHeight", "display", "position", "width", "height", "margin", "padding"];
      NOTE_BUDGET = 1100;
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

  // src/shared/navigation.js
  var navigation_exports = {};
  __export(navigation_exports, {
    captureNavigation: () => captureNavigation,
    requestTimeout: () => requestTimeout
  });
  function requestTimeout(path) {
    if (path.endsWith("/open") || path.endsWith("/shot") || path.endsWith("/history")) return 6e4;
    return 25e3;
  }
  async function captureNavigation(post2, { openPath, shotPath, url, fit }) {
    await post2(openPath, { url });
    const frame = await post2(shotPath, { format: "webp", ...fit ? { fit } : {} });
    if (!frame?.data || !frame.url || frame.url === "about:blank") {
      throw Object.assign(new Error("Kitesurf did not return a rendered page"), { errorId: "kitesurf.navigate.failed" });
    }
    return frame;
  }
  var init_navigation = __esm({
    "src/shared/navigation.js"() {
    }
  });

  // src/client/index.js
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject
  });
  var React12 = __require("react");
  var primitives2 = __require("@deepseek-ai/dsh-client-ui-primitives");
  var { createThemeScope: createThemeScope2, openNanoDialog: openNanoDialog2, openNanoMenu: openNanoMenu2, NANO_STYLES: NANO_STYLES2, NanoToast: NanoToast2, NanoTabs: NanoTabs2 } = (init_dsh_nano_ui(), __toCommonJS(dsh_nano_ui_exports));
  var { ensurePerfReview: ensurePerfReview2 } = (init_client(), __toCommonJS(client_exports));
  var { BUCKETS: BUCKETS2, DECL_HASH: DECL_HASH2 } = (init_perf_declaration(), __toCommonJS(perf_declaration_exports));
  var { copyFor: copyFor2 } = (init_i18n(), __toCommonJS(i18n_exports));
  var { batchNote: batchNote2, designNote: designNote2, multiNote: multiNote2 } = (init_note(), __toCommonJS(note_exports));
  var { contentFrame: contentFrame2, shotPoint: shotPoint2 } = (init_shot_point(), __toCommonJS(shot_point_exports));
  var { captureNavigation: captureNavigation2, requestTimeout: requestTimeout2 } = (init_navigation(), __toCommonJS(navigation_exports));
  var h7 = React12.createElement;
  var STATUS = "/nano-local-sandbox/status";
  var OPEN = "/nano-local-sandbox/open";
  var SHOT = "/nano-local-sandbox/shot";
  var PICK = "/nano-local-sandbox/pick";
  var EDIT = "/nano-local-sandbox/edit";
  var SETTINGS = "/nano-local-sandbox/settings";
  var HISTORY = "/nano-local-sandbox/history";
  var PORTS = "/nano-local-sandbox/ports";
  var RECOVER = "/nano-local-sandbox/recover";
  var DIAGNOSTICS = "/nano-local-sandbox/diagnostics";
  var CONSOLE = "/nano-local-sandbox/console";
  var NETWORK = "/nano-local-sandbox/network";
  var ELEMENTS = "/nano-local-sandbox/elements";
  var BROWSE_HISTORY = "/nano-local-sandbox/browse-history";
  var LOGS = "/nano-local-sandbox/logs";
  var DOM = "/nano-local-sandbox/dom";
  var CONTROL = "/nano-local-sandbox/control";
  var localNotes = [];
  var LIFECYCLE = "/nano-local-sandbox/lifecycle";
  var KIND = "kitesurf";
  var OWN_ID = "nano-kitesurf";
  var MAX_PINS = 8;
  var LAMP_PLANES = ["container", "engine", "page", "dom", "bridge"];
  function fill(text, values) {
    return String(text).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }
  function planeRows(snap, copy) {
    const labels = {
      container: copy?.envContainer,
      engine: copy?.envEngine,
      page: copy?.planePage,
      dom: copy?.planeDom,
      bridge: copy?.planeBridge
    };
    const planes = snap?.planes;
    if (!planes || typeof planes !== "object") return [];
    return LAMP_PLANES.filter((id) => planes[id]).map((id) => {
      const row = planes[id];
      const skipped = row.state === "skipped" || row.skipped === true;
      return {
        plane: id,
        label: labels[id] || id,
        ok: row.ok === true,
        skipped,
        detail: row.detail || row.url || row.state || ""
      };
    });
  }
  function engineEndpoint(payload) {
    const lifecycle = payload?.lifecycle;
    return {
      phase: lifecycle?.phase ?? null,
      httpBase: lifecycle?.httpBase ?? null,
      mcpPort: lifecycle?.mcpPort ?? null
    };
  }
  var pagePerf = ensurePerfReview2();
  var perf = {
    span(name, fn) {
      try {
        const collector = pagePerf.join(OWN_ID, {
          version: true ? "0.1.0" : "0.0.0",
          buckets: BUCKETS2,
          decl: DECL_HASH2,
          react: React12,
          root: () => document.querySelector("[data-nks-workspace]")
        });
        if (collector?.span) return collector.span(name, fn);
      } catch {
      }
      return fn();
    }
  };
  var STYLE = `
.nks-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;flex:auto;display:flex;font:var(--dsw-font-xxs-12);container-type:inline-size}
/*
 * Left-slide vertical tab drawer \u2014 DSH sidebar artwork: the rail stays mounted
 * off the left edge (translateX), sliding in/out on one gesture while
 * visibility flips after the slide on close and before it on open. The way
 * Expand/collapse lives in the toolbar (panel glyph, mirrored while open \u2014
 * one affordance, both directions). The drawer holds only the tab list;
 * browser controls stay on the toolbar \u2014 ExpandButton.tsx / SidebarRight.module.css in dsh artwork.
 */
.nks-toolbar{position:relative;z-index:var(--nano-layer-local3);box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:8px;height:38px;padding:5px 6px;display:flex}
.nks-nav{position:absolute;z-index:var(--nano-layer-local4);top:44px;left:10px;bottom:36px;width:216px;display:flex;flex-direction:column;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);box-shadow:var(--dsw-elevation-prominent,0 4px 18px rgba(0,0,0,.3));transform:translateX(calc(-100% - 12px));visibility:hidden;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease),visibility 0s linear var(--ds-transition-duration-slow,.32s)}
.nks-nav[data-nks-nav-state="open"]{transform:none;visibility:visible;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease)}
@starting-style{.nks-nav[data-nks-nav-state="open"]{transform:translateX(calc(-100% - 12px))}}
@media (prefers-reduced-motion:reduce){.nks-nav,.nks-nav[data-nks-nav-state="open"]{transition:none}}
.nks-nav-head{display:flex;flex:none;align-items:center;gap:6px;height:30px;padding:0 10px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-nav-head b{flex:auto;font-weight:600;color:var(--dsw-alias-label-secondary)}
/* nano-ui-exempt: \u5BBF\u4E3B\u6CA1\u6709\u53EF\u5173\u95ED\u7684\u6587\u6863\u9875\u7B7E\u6761\uFF08SegmentedControl \u4E0D\u53EF\u5173\u95ED\u3001\u65E0\u8BA1\u6570\uFF09 */
.nks-nav-tabs{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px}
.nks-nav-tab{position:relative;display:flex;align-items:center;gap:7px;width:100%;box-sizing:border-box;min-height:30px;padding:4px 26px 4px 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer}
.nks-nav-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-nav-tab[data-current="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-markdown-tag,var(--dsw-alias-bg-layer-3))}
.nks-nav-tab[data-current="true"]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-nav-tab svg{flex:none;width:14px;height:14px;opacity:.8}
.nks-nav-tab .nks-nav-tab-url{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-nav-tab .nks-nav-tab-count{flex:none;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.nks-nav-tab .nks-nav-tab-x{position:absolute;right:4px;top:50%;margin-top:-9px;width:18px;height:18px;display:none;align-items:center;justify-content:center;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:var(--dsw-font-xxxs-11);line-height:1;padding:0}
.nks-nav-tab:hover .nks-nav-tab-x{display:inline-flex}
.nks-nav-tab .nks-nav-tab-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.nks-nav-empty{flex:auto;padding:12px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);text-align:center}
.nks-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:transparent;border:0;flex:none;justify-content:center;align-items:center;padding:6px;display:inline-flex;box-sizing:border-box}
.nks-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool:disabled{color:var(--dsw-alias-label-tertiary,rgba(207,211,214,.55));opacity:.45;cursor:default}
.nks-tool:disabled:hover{background:transparent}
.nks-tool:focus-visible,.nks-address:focus-visible{outline:2px solid var(--dsw-alias-link);outline-offset:1px}
.nks-tool[aria-pressed="true"]{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-link) 18%,transparent)}
.nks-tool-glyph{display:inline-flex}
/* Matches the host workspace tab (_tabActive_123xe): markdown-tag fill,
   radius-sm, 28px tall, strip inline-start margin 10px (toolbar padding is
   6px, so 4px extra here lands the button's left edge on the same axis). */
.nks-nav-toggle{width:auto;height:28px;margin-left:4px;padding:0 10px;gap:5px;box-sizing:border-box;background:var(--dsw-alias-markdown-tag,var(--dsw-alias-bg-layer-2));border:0;border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xxs-12);font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-primary);white-space:nowrap}
.nks-tool.nks-nav-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.nks-tool.nks-nav-toggle[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link) 14%,var(--dsw-alias-markdown-tag,var(--dsw-alias-bg-layer-2)))}
.nks-toolbar-nav{display:flex;flex:none;align-items:center;gap:8px}
.nks-toolbar-tail{display:flex;flex:none;align-items:center;gap:8px}
.nks-address-box{flex:auto;min-width:0;position:relative}
.nks-address{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 32px 0 9px}
.nks-address::placeholder{color:var(--dsw-alias-label-tertiary)}
.nks-address-box[data-loading="true"] .nks-address{padding-right:84px;border-color:color-mix(in srgb,var(--dsw-alias-link) 48%,var(--dsw-alias-border-l2));background-image:linear-gradient(100deg,color-mix(in srgb,var(--dsw-alias-link) 10%,var(--dsw-alias-bg-layer-1)) 18%,color-mix(in srgb,var(--dsw-alias-link) 30%,var(--dsw-alias-bg-layer-1)) 42%,color-mix(in srgb,var(--dsw-alias-link) 10%,var(--dsw-alias-bg-layer-1)) 66%);background-size:220% 100%;animation:nks-address-sheen 1.7s linear infinite}
.nks-address-box[data-loading="true"]::after{content:"";position:absolute;left:6px;right:6px;bottom:1px;height:2px;border-radius:2px;pointer-events:none;background:linear-gradient(90deg,transparent 10%,var(--dsw-alias-link) 50%,transparent 90%);background-size:200% 100%;animation:nks-address-sheen 1.4s linear infinite}
.nks-address-beat{position:absolute;right:34px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 3px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;pointer-events:none}
.nks-address-beat .nks-spin{width:11px;height:11px;border-width:1.5px}
@keyframes nks-address-sheen{0%{background-position:120% 0}100%{background-position:-120% 0}}
@media (prefers-reduced-motion:reduce){.nks-address-box[data-loading="true"] .nks-address{animation:none;background-image:none;background:var(--dsw-alias-bg-layer-1)}.nks-address-box[data-loading="true"]::after{animation:none;background:var(--dsw-alias-link)}}
.nks-go{visibility:hidden;opacity:0;position:absolute;top:0;right:0}
.nks-address-box:focus-within .nks-go,.nks-address-box[data-dirty="true"] .nks-go{visibility:visible;opacity:1}
.nks-frame{position:relative;isolation:isolate;order:1;overflow:auto;flex:auto;min-height:0;overflow:hidden;contain:layout paint;background:var(--dsw-alias-bg-layer-1)}
.nks-dom{width:100%;height:100%;border:0;display:block;background:#fff}
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
.nks-pin-dot:hover{background:var(--dsw-alias-state-error-primary);transform:scale(1.15)}
.nks-float-top{position:absolute;z-index:var(--nano-layer-local3);top:0;left:0;right:0;display:flex;flex-direction:column;pointer-events:none}
.nks-hint{position:relative;flex:none;pointer-events:auto;padding:3px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-hint-text{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-start-btn{height:30px;padding:0 14px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);cursor:pointer}
.nks-start-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-inspector{position:absolute;z-index:var(--nano-layer-local3);left:0;right:0;bottom:0;pointer-events:none;padding:3px 8px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;gap:10px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);border-top:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.nks-inspector b{font-weight:500;color:var(--dsw-alias-label-secondary)}
.nks-inspector span{overflow:hidden;text-overflow:ellipsis;max-width:170px}
.nks-note{position:absolute;z-index:var(--nano-layer-local2);display:flex;gap:4px;align-items:center;padding:4px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-elevation-soft)}
/* HITL control bar \u2014 ego's bottom "Agent \u6B63\u5728\u63A7\u5236 / \u63A5\u7BA1 / \u7EC8\u6B62\u4EFB\u52A1" pill,
   reworded honestly: the pane can hold the agent's page writes, it cannot
   kill the run (that is host-side). Positioned bottom-center of the frame. */
.nks-hitl{position:absolute;right:10px;bottom:10px;z-index:var(--nano-layer-local4);display:flex;align-items:center;gap:8px;height:32px;padding:4px 8px 4px 12px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);box-shadow:var(--dsw-elevation-soft);font:var(--dsw-font-xxs-12);white-space:nowrap}
.nks-hitl-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-link,#2f6fed);animation:nks-hitl-pulse 1.4s ease-in-out infinite}
.nks-hitl-dot[data-held="true"]{background:var(--dsw-alias-state-warn-primary);animation:none}
@keyframes nks-hitl-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.nks-hitl-label{color:var(--dsw-alias-label-primary)}
.nks-hitl-label b{font-weight:600;margin-left:4px}
.nks-hitl-btn{height:24px;padding:0 10px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);cursor:pointer}
.nks-hitl-btn:hover{background:var(--dsw-alias-bg-layer-3)}
.nks-hitl-primary{color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-link);border-color:transparent}
.nks-hitl-primary:hover{background:var(--dsw-alias-link);filter:brightness(1.08)}
.nks-act{position:absolute;left:50%;top:34px;transform:translateX(-50%);z-index:var(--nano-layer-local4);padding:4px 10px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);box-shadow:var(--dsw-elevation-soft);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);white-space:nowrap;pointer-events:none;animation:nks-act-in .18s ease-out}
.nks-act[data-ok="false"]{color:var(--dsw-alias-state-error-primary)}
/* last-good/\u5BFC\u822A\u4ECD\u5728\u6267\u884C\u63D0\u793A\u6761\uFF1A\u4E0E .nks-act \u540C\u6B3E\u5C0F\u836F\u4E38\uFF0C\u60AC\u505C\u5728\u753B\u9762\u9876\u90E8\u3002 */
.nks-stale{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:var(--nano-layer-local4);max-width:calc(100% - 32px);padding:4px 10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);border:.5px solid var(--dsw-alias-state-warn-primary);border-radius:var(--dsw-radius-sm);box-shadow:var(--dsw-elevation-soft);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto}
.nks-stale[data-nks-nav-busy="1"]{top:34px;border-color:var(--dsw-alias-border-l2)}
.nks-dom-tag{position:absolute;right:8px;top:8px;z-index:var(--nano-layer-local4);padding:2px 7px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 88%,transparent);border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);pointer-events:none;user-select:none}
@keyframes nks-act-in{from{opacity:0;transform:translateX(-50%) translateY(-4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.nks-note-actions{display:flex;gap:2px;align-items:center}
.nks-note-form{display:flex;gap:4px;align-items:center}
.nks-note input{width:220px;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 8px}
.nks-pins{position:relative;flex:none;pointer-events:auto;padding:2px 8px 4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);display:flex;align-items:center;gap:4px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent)}
/* nano-ui-exempt: host primitives and nano-ui ship no indeterminate spinner. */
.nks-spin{width:14px;height:14px;box-sizing:border-box;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-link,#2f6fed);animation:nks-spin .8s linear infinite;flex:none}
@keyframes nks-spin{to{transform:rotate(360deg)}}
.nks-open-error{margin:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);line-height:1.55;word-break:break-word}
.nks-open-url{color:var(--dsw-alias-label-tertiary);unicode-bidi:plaintext}
.nks-open-log{margin:6px 0 0;max-height:140px;overflow:auto;padding:6px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all}
.nks-settings-body{display:flex;flex-direction:column;gap:8px}
.nks-simulation-body{min-height:0}
.nks-settings-stack{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto}
.nks-settings-section{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);margin-top:2px}
.nks-settings-pair{display:flex;gap:8px}
.nks-settings-pair .nks-address{flex:1;min-width:0}
.nks-settings-hint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);line-height:1.5}
.nks-cookie-text{height:auto;min-height:72px;padding:6px 8px;resize:vertical;font:var(--dsw-font-xxxs-11);line-height:1.5}
.nks-status{position:relative;z-index:var(--nano-layer-local3);order:7;flex:none;display:flex;align-items:center;gap:8px;height:26px;padding:0 10px;border-top:.5px solid var(--dsw-alias-border-l3);font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-status button{height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer}
.nks-status button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-status button[aria-pressed="true"],.nks-status button[data-nks-native-toggle][aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link,#7aaaff) 22%,transparent);color:var(--dsw-alias-label-primary)}
.nks-status .nks-count[data-bad="true"]{color:var(--dsw-alias-state-error-primary)}
.nks-dt{flex:none;height:240px;min-height:120px;position:relative;z-index:var(--nano-layer-local6);order:8;border-radius:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border-top:.5px solid var(--dsw-alias-border-l2);min-height:0;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.nks-dt-head{flex:none;display:flex;align-items:center;gap:8px;min-height:32px;padding:3px 6px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
/* Drag the top edge: the panel is a workspace, not a fixed strip. */
.nks-dt-grip{position:absolute;left:0;right:0;top:-3px;height:7px;cursor:row-resize;z-index:var(--nano-layer-local2);touch-action:none}
.nks-dt-grip:hover{background:color-mix(in srgb,var(--dsw-alias-link) 35%,transparent)}
/* The host strip is sized for a full-width toolbar; three options in a 240px
   panel need the compact scale. */
.nks-dt-tabs{flex:none;display:flex;transform:scale(.82);transform-origin:left center}
.nks-dt[data-nks-dt-collapsed="true"]{height:auto;min-height:0}
.nks-dt[data-nks-dt-collapsed="true"] > *:not(.nks-dt-head):not(.nks-dt-grip){display:none}
.nks-dt-body{flex:auto;min-height:0;overflow:auto;font:11px/1.45 ui-monospace,Menlo,monospace}
.nks-dt-filterbar{flex:none;display:flex;align-items:center;gap:6px;height:36px;min-height:36px;box-sizing:border-box;padding:5px 6px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.nks-dt-filterbar .nks-dt-search{flex:1 1 130px;min-width:75px;height:24px;box-sizing:border-box;display:flex;align-items:center;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}
.nks-dt-filterbar .nks-dt-search:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.nks-dt-filterbar .nks-dt-search input{width:100%;height:24px;padding:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}
.nks-dt button,.nks-dt input{font:inherit}
.nks-dt-switch{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;cursor:pointer}
.nks-dt-cache{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);white-space:nowrap;cursor:help}
.nks-dt-cache b{font-weight:500;color:var(--dsw-alias-label-dimmed);border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 5px;font-size:10px}
.nks-dt-stats{flex:none;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nks-dt-cols{flex:none;display:flex;gap:6px;padding:3px 8px;color:var(--dsw-alias-label-dimmed);border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);font:var(--dsw-font-xxxs-11);font-size:11px;text-transform:uppercase;letter-spacing:.02em}
.nks-dt-cols span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-row{display:flex;gap:6px;padding:2px 8px;border-bottom:.5px solid color-mix(in srgb,var(--dsw-alias-border-l3) 45%,transparent);align-items:baseline;white-space:nowrap}
.nks-dt-row:nth-child(even){background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 45%,transparent)}
.nks-dt-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-dt-row[data-level="warn"],.nks-dt-row[data-level="warning"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,transparent);box-shadow:inset 2px 0 0 var(--dsw-alias-state-warn-primary)}
.nks-dt-row[data-level="error"],.nks-dt-row[data-level="exception"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);box-shadow:inset 2px 0 0 var(--dsw-alias-state-error-primary)}
.nks-dt-row[data-level="error"] .nks-dt-msg,.nks-dt-row[data-level="exception"] .nks-dt-msg{color:var(--dsw-alias-state-error-primary)}
.nks-dt-row[data-level="warn"] .nks-dt-msg,.nks-dt-row[data-level="warning"] .nks-dt-msg{color:var(--dsw-alias-state-warn-primary)}
.nks-dt-lv{flex:none;width:50px;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;font:var(--dsw-font-xxxs-11)}
.nks-dt-lv[data-lv="error"],.nks-dt-lv[data-lv="exception"]{color:var(--dsw-alias-state-error-primary)}
.nks-dt-lv[data-lv="warn"]{color:var(--dsw-alias-state-warn-primary)}
.nks-dt-lv[data-lv="network"]{color:var(--dsw-alias-link,#7aaaff)}
.nks-dt-msg{flex:auto;min-width:0;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}

.nks-dt-url{flex:1 1 auto;min-width:0;max-width:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);direction:ltr}
.nks-dt-grow{flex:1 1 auto;min-width:0}
.nks-dt-st{flex:none;width:44px;text-align:right}
.nks-dt-st[data-bad="true"]{color:var(--dsw-alias-state-error-primary)}
.nks-dt-dur{flex:none;width:64px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.nks-dt-time{flex:none;width:64px;color:var(--dsw-alias-label-tertiary)}
.nks-dt-src{flex:none;max-width:32%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);text-align:right}
.nks-dt-type{flex:none;width:46px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-type[data-resource="script"],.nks-dt-type[data-resource="js"]{color:var(--dsw-alias-state-warn-primary)}
.nks-dt-type[data-resource="doc"]{color:var(--dsw-alias-link,#7aaaff)}
.nks-dt-type[data-resource="xhr"],.nks-dt-type[data-resource="fetch"]{color:var(--dsw-alias-state-success-primary)}
.nks-dt-type[data-resource="img"],.nks-dt-type[data-resource="css"],.nks-dt-type[data-resource="font"]{color:var(--dsw-alias-label-secondary)}
.nks-dt-size{flex:none;width:48px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.nks-dt-wf{flex:none;width:96px;position:relative;height:10px;align-self:center}
.nks-dt-wf i{position:absolute;top:0;height:8px;min-width:2px;border-radius:2px;background:color-mix(in srgb,var(--dsw-alias-link,#7aaaff) 70%,transparent)}
.nks-dt-wf i[data-bad="true"]{background:var(--dsw-alias-state-error-primary)}
.nks-dt-wf i[data-pending="true"]{background:var(--dsw-alias-label-dimmed);opacity:.6}
.nks-net-detail{position:absolute;left:0;right:0;top:68px;bottom:0;z-index:var(--nano-layer-local7);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border-top:.5px solid var(--dsw-alias-border-l2)}
.nks-net-detail-head{flex:none;display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.nks-net-detail-title{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11)}
.nks-net-detail-x{flex:none;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;line-height:1}
.nks-net-detail-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-net-detail-tabs{flex:none;display:flex;align-items:center;gap:4px;padding:4px 8px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.nks-net-detail-body{flex:auto;min-height:0;overflow:auto;padding:6px 8px;color:var(--dsw-alias-label-secondary)}
.nks-net-section{margin-bottom:8px}
.nks-net-section > b{display:block;margin-bottom:3px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11);font-weight:600}
.nks-net-kv{display:flex;gap:8px;padding:1px 0;font:var(--dsw-font-xxxs-11);line-height:1.55}
.nks-net-kv b{flex:none;width:132px;color:var(--dsw-alias-label-tertiary);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-net-kv span{min-width:0;word-break:break-all;color:var(--dsw-alias-label-secondary)}
.nks-net-pre{margin:0;white-space:pre-wrap;word-break:break-word;font:var(--dsw-font-xxxs-11);line-height:1.55;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);padding:5px 6px;max-height:180px;overflow:auto}
.nks-net-empty{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);padding:2px 0}
.nks-dt-styles{flex:none;max-height:110px;overflow:auto;border-bottom:.5px solid var(--dsw-alias-border-l2);padding:4px 8px;background:var(--dsw-alias-bg-layer-1)}
.nks-dt-style-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);margin-bottom:3px}
.nks-dt-style-head > span{flex:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-style-x{flex:none;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;line-height:1}
.nks-dt-style-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nks-dt-rule{display:flex;gap:8px;padding:1px 0;color:var(--dsw-alias-label-tertiary)}
.nks-dt-rule b{color:var(--dsw-alias-link,#7aaaff);font-weight:500;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-dt-rule span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-hist-panel{display:flex;flex-direction:column;min-height:0;max-height:360px}
.nks-hist-list{overflow:auto}
.nks-modal-mask{position:absolute;inset:0;z-index:var(--nano-layer-overlay);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}
.nks-modal{width:min(560px,92%);max-height:78%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.45);overflow:hidden}
.nks-modal-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.nks-modal-head b{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}
.nks-modal-sub{color:var(--dsw-alias-label-tertiary);font-size:11px}
.nks-modal-x{margin-left:auto;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:16px;cursor:pointer}
.nks-modal-bar{display:flex;gap:8px;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.nks-modal-bar input{flex:auto;height:28px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}
.nks-modal-bar button{height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.nks-modal-body{overflow:auto;padding:4px 0}
.nks-modal-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.nks-hist-row{display:flex;align-items:center;gap:6px;padding:0 8px}
.nks-hist-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nks-hist-open{flex:auto;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:7px 4px;border:0;background:transparent;cursor:pointer;text-align:left}
.nks-hist-url{color:var(--dsw-alias-label-primary);font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nks-hist-meta{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.nks-hist-del{width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.nks-hist-del:hover{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent)}
.nks-chip{height:22px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer}
.nks-chip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.nks-vp-input{height:22px;width:52px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11)}
.nks-dt-empty{padding:14px;color:var(--dsw-alias-label-tertiary)}
.nks-env{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:6px}
.nks-env-title{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);text-transform:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.nks-env-row{display:flex;justify-content:space-between;gap:10px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-env-row b{font-weight:500;color:var(--dsw-alias-label-secondary);flex:none}
.nks-env-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;unicode-bidi:plaintext}
.nks-env-ok{color:var(--dsw-alias-state-success-primary)}
.nks-env-wait{color:var(--dsw-alias-label-tertiary)}
.nks-env-legacy{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);margin-left:6px}
.nks-logs{margin:0;max-height:380px;overflow:auto;white-space:pre-wrap;word-break:break-all;font:11px/1.45 ui-monospace,Menlo,monospace;color:var(--dsw-alias-label-secondary)}
.nks-env-bad{color:var(--dsw-alias-state-error-primary)}
.nks-env-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.nks-env-checks{display:flex;flex-direction:column;gap:2px;margin-top:2px;padding-top:4px;border-top:.5px solid var(--dsw-alias-border-l2)}
.nks-env-check{display:flex;align-items:baseline;gap:6px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}
.nks-env-check b{font-weight:500;color:var(--dsw-alias-label-secondary);flex:none;min-width:34px}
.nks-env-check-dot{flex:none;width:10px;text-align:center}
.nks-env-check[data-ok="true"] .nks-env-check-dot{color:var(--dsw-alias-state-success-primary)}
.nks-env-check[data-ok="false"] .nks-env-check-dot{color:var(--dsw-alias-state-error-primary)}
.nks-env-check[data-ok="skip"] .nks-env-check-dot{color:var(--dsw-alias-label-tertiary);opacity:.7}
.nks-env-check-detail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;unicode-bidi:plaintext}
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
  .nks-nav{width:200px}
  .nks-toolbar{gap:2px;padding:5px 4px}
  .nks-tool{width:26px;height:26px}
  .nks-address{padding:0 4px 0 7px;font-size:11px}
  .nks-address::placeholder{color:transparent}
  .nks-address-box::after{content:attr(data-address-short);position:absolute;left:8px;top:6px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);pointer-events:none}
  .nks-address-box:focus-within::after,.nks-address-box[data-dirty="true"]::after{content:none}
  .nks-go{display:none}
  .nks-pins{gap:2px}
  .nks-hint-text{font:var(--dsw-font-xxxs-11)}
}
/* Frame: never letterbox into a black void \u2014 a subtle checker makes the
   dead area read as "canvas", and the picture is centred by object-position. */
.nks-frame{background-image:linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%),linear-gradient(45deg,rgba(127,127,127,.05) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.05) 75%);background-size:16px 16px;background-position:0 0,8px 8px}
`;
  function post(path, body) {
    const timeoutMs = requestTimeout2(path);
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: controller?.signal
    }).catch((cause) => {
      if (cause?.name === "AbortError") {
        const error = new Error(`request timed out after ${timeoutMs}ms`);
        error.errorId = "kitesurf.engine.connect";
        throw error;
      }
      throw cause;
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        const error = new Error(payload.error || payload.reason || `request failed (${response.status})`);
        error.errorId = payload.errorId || payload.reason || "kitesurf.unknown";
        throw error;
      }
      return payload;
    }).finally(() => {
      if (timer) window.clearTimeout(timer);
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
  var RESOURCE_LABELS = {
    Document: "doc",
    Stylesheet: "css",
    Image: "img",
    Media: "media",
    Font: "font",
    Script: "js",
    TextTrack: "text",
    XHR: "xhr",
    Fetch: "fetch",
    Prefetch: "prefetch",
    EventSource: "sse",
    WebSocket: "ws",
    Manifest: "manifest",
    SignedExchange: "sxg",
    Ping: "ping",
    CSPViolationReport: "csp",
    Preflight: "preflight",
    Other: "other"
  };
  var RESOURCE_FILTERS = ["Document", "Stylesheet", "Script", "XHR", "Fetch", "Image", "Font", "Media", "WebSocket", "Other"];
  var CONSOLE_LEVELS = ["error", "warn", "info", "log", "debug"];
  function resourceTypeLabel(row) {
    const raw = String(row?.type || "").trim();
    if (raw) return RESOURCE_LABELS[raw] || raw.toLowerCase().slice(0, 8);
    const mime = String(row?.mimeType || "");
    if (mime.includes("javascript")) return "js";
    if (mime.includes("css")) return "css";
    if (mime.startsWith("image/")) return "img";
    if (mime.startsWith("font/")) return "font";
    if (mime.includes("json")) return "json";
    if (mime.startsWith("text/html")) return "doc";
    return mime.split(";")[0].replace(/^application\//, "").slice(0, 8) || "other";
  }
  function formatSize(bytes) {
    if (bytes == null) return "\u2014";
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return "";
    if (n < 1024) return `${n}b`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}kb`;
    return `${(n / 1024 / 1024).toFixed(1)}mb`;
  }
  function formatDuration(ms) {
    if (ms == null) return "\u2014";
    const n = Number(ms);
    if (!Number.isFinite(n) || n < 0) return "";
    return n < 1e3 ? `${Math.round(n)}ms` : `${(n / 1e3).toFixed(2)}s`;
  }
  function networkMatches(row, text) {
    const tokens = String(text || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const haystack = `${row.url || ""} ${row.method || ""} ${row.status ?? ""} ${row.type || ""} ${row.mimeType || ""}`.toLowerCase();
    return tokens.every((token) => {
      const at = token.indexOf(":");
      if (at < 1) return haystack.includes(token);
      const key = token.slice(0, at);
      const value = token.slice(at + 1);
      if (key === "type") return String(row.type || "").toLowerCase().includes(value) || resourceTypeLabel(row).includes(value);
      if (key === "method") return String(row.method || "").toLowerCase() === value;
      if (key === "status") {
        if (/^[1-5]xx$/.test(value)) return Math.floor(Number(row.status) / 100) === Number(value[0]);
        return String(row.status ?? "") === value;
      }
      return haystack.includes(token);
    });
  }
  function consoleMatches(row, text) {
    const needle = String(text || "").toLowerCase().trim();
    if (!needle) return true;
    return `${row.level || ""} ${row.text || ""} ${row.url || ""} ${row.source || ""}`.toLowerCase().includes(needle);
  }
  function elementMatches(row, text) {
    const needle = String(text || "").toLowerCase().trim();
    if (!needle) return true;
    return `${row.tag || ""} ${row.id || ""} ${row.cls || ""}`.toLowerCase().includes(needle);
  }
  function DevTools({ copy, open, onClose }) {
    const [tab, setTab] = React12.useState("console");
    const [rows, setRows] = React12.useState([]);
    const [failedOnly, setFailedOnly] = React12.useState(false);
    const [query, setQuery] = React12.useState("");
    const [typeFilter, setTypeFilter] = React12.useState("all");
    const [levelFilter, setLevelFilter] = React12.useState("all");
    const [netDetail, setNetDetail] = React12.useState(null);
    const [netDetailTab, setNetDetailTab] = React12.useState("headers");
    const [styles, setStyles] = React12.useState(null);
    const detailSeq = React12.useRef(0);
    const [height, setHeight] = React12.useState(240);
    const [collapsed, setCollapsed] = React12.useState(false);
    const dragRef = React12.useRef(null);
    function startResize(event) {
      event.preventDefault();
      event.stopPropagation();
      const startY = event.clientY;
      const startHeight = height;
      dragRef.current = { startY, startHeight };
      const target = event.currentTarget;
      target.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => {
        const next = startHeight + (startY - moveEvent.clientY);
        setHeight(Math.max(120, Math.min(Math.round(window.innerHeight * 0.75), next)));
      };
      const stop = () => {
        dragRef.current = null;
        target.releasePointerCapture?.(event.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    }
    React12.useEffect(() => {
      if (!open) return void 0;
      let alive = true;
      let since = null;
      let sinceSeq = null;
      setRows([]);
      const merge = (fresh, keyOf) => setRows((prev) => {
        if (!Array.isArray(fresh) || fresh.length === 0) return prev;
        const seen = new Set(prev.map(keyOf));
        const extra = fresh.filter((r) => !seen.has(keyOf(r)));
        const merged = prev.map((r) => fresh.find((f) => keyOf(f) === keyOf(r)) || r).concat(extra);
        return merged.slice(-400);
      });
      const load = async () => {
        try {
          if (tab === "console") {
            const url = sinceSeq != null ? `${CONSOLE}?limit=200&sinceSeq=${encodeURIComponent(sinceSeq)}` : `${CONSOLE}?limit=200`;
            const data = await fetch(url).then((r) => r.json());
            if (alive && Array.isArray(data.entries)) {
              merge(data.entries, (r) => `c${r.seq ?? r.at}`);
              const lastSeq = data.entries.reduce((m, r) => Math.max(m, Number(r.seq) || 0), 0);
              if (lastSeq) sinceSeq = lastSeq;
            }
          } else if (tab === "network") {
            const url = `${NETWORK}?limit=200${since ? `&since=${encodeURIComponent(since)}` : ""}`;
            const data = await fetch(url).then((r) => r.json());
            if (alive && Array.isArray(data.entries)) {
              merge(data.entries, (r) => `n${r.id}`);
              const lastStart = data.entries.reduce((m, r) => Math.max(m, Number(r.updatedAt || r.startedAt) || 0), 0);
              if (lastStart) since = String(lastStart);
            }
          } else {
            const data = await fetch(`${ELEMENTS}?depth=3`).then((r) => r.json());
            if (alive) setRows(data.nodes || []);
          }
        } catch {
        }
      };
      load();
      const period = () => document.visibilityState === "hidden" ? 15e3 : 1500;
      let timer = 0;
      const arm = () => {
        clearInterval(timer);
        timer = window.setInterval(load, period());
      };
      const onVis = () => {
        arm();
        if (document.visibilityState !== "hidden") load();
      };
      document.addEventListener("visibilitychange", onVis);
      arm();
      return () => {
        alive = false;
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onVis);
      };
    }, [open, tab]);
    if (!open) return null;
    const visibleRows = rows.filter((row) => {
      if (tab === "network") {
        if (failedOnly && !(row.failed || row.status && row.status >= 400)) return false;
        if (typeFilter !== "all" && String(row.type || "Other") !== typeFilter) return false;
        return networkMatches(row, query);
      }
      if (tab === "console") return (levelFilter === "all" || String(row.level) === levelFilter) && consoleMatches(row, query);
      if (tab === "elements") return elementMatches(row, query);
      return true;
    });
    const elementCount = rows.filter((row) => row.tag && !String(row.tag).startsWith("#")).length;
    const maxDepth = rows.reduce((depth, row) => Math.max(depth, Number(row.level) || 0), -1) + 1;
    const openTypeMenu = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      openNanoMenu2({
        anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
        container: event.currentTarget.closest("[data-nks-workspace]"),
        direction: "down",
        maxHeight: 9 * 28 + 8,
        items: [
          { id: "all", label: copy.devtoolsTypeAll, run: () => setTypeFilter("all") },
          ...RESOURCE_FILTERS.map((type) => ({ id: type, label: type, run: () => setTypeFilter(type) }))
        ]
      });
    };
    const openLevelMenu = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      openNanoMenu2({
        anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
        container: event.currentTarget.closest("[data-nks-workspace]"),
        direction: "up",
        maxHeight: 7 * 28 + 8,
        items: [
          { id: "all", label: copy.devtoolsAllLevels, run: () => setLevelFilter("all") },
          ...CONSOLE_LEVELS.map((level) => ({ id: level, label: level.toUpperCase(), run: () => setLevelFilter(level) }))
        ]
      });
    };
    const openNetworkDetail = async (row) => {
      const seq2 = ++detailSeq.current;
      setNetDetailTab("headers");
      setHeight((value) => Math.max(value, 360));
      setNetDetail({ entry: row, responseBody: null, loading: true, error: "" });
      try {
        const data = await fetch(`${NETWORK}?id=${encodeURIComponent(row.id)}`).then((response) => response.json());
        if (seq2 !== detailSeq.current) return;
        if (!data?.ok || !data.entry) throw new Error(data?.error || copy.devtoolsDetailError);
        setNetDetail({ entry: data.entry, responseBody: data.responseBody, loading: false, error: "" });
      } catch (cause) {
        if (seq2 !== detailSeq.current) return;
        setNetDetail({ entry: row, responseBody: null, loading: false, error: String(cause?.message || copy.devtoolsDetailError) });
      }
    };
    const inspectNode = async (row) => {
      const selector = row.id ? `${row.tag}#${row.id}` : row.cls ? `${row.tag}.${String(row.cls).trim().split(/\s+/)[0]}` : row.tag;
      try {
        const data = await fetch(`${ELEMENTS}?selector=${encodeURIComponent(selector)}`).then((r) => r.json());
        setStyles({ selector, matched: data.matched?.matched || [], computed: data.computed || {} });
      } catch {
        setStyles({ selector, matched: [], computed: {} });
      }
    };
    const clear = async () => {
      const path = tab === "console" ? CONSOLE : NETWORK;
      await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: '{"clear":true}' }).catch(() => {
      });
      setRows([]);
      setNetDetail(null);
    };
    const kvRow = (label, value) => h7(
      "div",
      { className: "nks-net-kv", key: label },
      h7("b", null, label),
      h7("span", null, String(value ?? "\u2014"))
    );
    const headerRows = (headers) => {
      const entries = Object.entries(headers || {});
      return entries.length ? entries.map(([key, value]) => h7("div", { className: "nks-net-kv", key }, h7("b", null, key), h7("span", null, String(value)))) : h7("div", { className: "nks-net-empty" }, copy.devtoolsNoHeaders);
    };
    const netSection = (title, children) => h7(
      "div",
      { className: "nks-net-section", key: title },
      h7("b", null, title),
      children
    );
    const renderNetDetail = () => {
      if (!netDetail) return null;
      if (netDetail.loading) return h7("div", { className: "nks-net-empty" }, copy.devtoolsLoading);
      if (netDetail.error) return h7("div", { className: "nks-net-empty" }, `${copy.devtoolsDetailError}: ${netDetail.error}`);
      const entry = netDetail.entry || {};
      if (netDetailTab === "headers") {
        return [
          netSection(copy.devtoolsGeneral, [
            kvRow(copy.devtoolsRequestUrl, entry.url),
            kvRow(copy.devtoolsMethod, entry.method),
            kvRow(copy.devtoolsStatus, `${entry.status ?? "\u2026"}${entry.statusText ? " " + entry.statusText : ""}`),
            kvRow(copy.devtoolsType, entry.type || "Other"),
            kvRow(copy.devtoolsMimeType, entry.mimeType),
            kvRow(copy.devtoolsProtocol, entry.protocol),
            kvRow(copy.devtoolsRemoteAddress, entry.remoteAddress)
          ]),
          netSection(copy.devtoolsRequestHeaders, headerRows(entry.requestHeaders)),
          netSection(copy.devtoolsResponseHeaders, headerRows(entry.responseHeaders))
        ];
      }
      if (netDetailTab === "payload") {
        let queryRows = [];
        try {
          const parsed = new URL(entry.url || "", "http://local");
          queryRows = [...parsed.searchParams].map(([key, value], index) => h7(
            "div",
            { className: "nks-net-kv", key: `${key}${index}` },
            h7("b", null, key),
            h7("span", null, value)
          ));
        } catch {
        }
        return [
          queryRows.length ? netSection(copy.devtoolsQuery, queryRows) : null,
          netSection(copy.devtoolsRequestPayload, entry.postData ? h7("pre", { className: "nks-net-pre" }, entry.postData) : h7("div", { className: "nks-net-empty" }, copy.devtoolsNoPayload))
        ];
      }
      const body = netDetail.responseBody;
      return netSection(copy.devtoolsResponseBody, body == null ? h7("div", { className: "nks-net-empty" }, copy.devtoolsNoResponseBody) : body.body ? h7("pre", { className: "nks-net-pre" }, `${body.base64Encoded ? "[base64]\n" : ""}${body.body}${body.truncated ? "\n\u2026" : ""}`) : h7("div", { className: "nks-net-empty" }, copy.devtoolsEmptyBody));
    };
    return h7(
      "div",
      {
        className: "nks-dt",
        "data-nks-devtools": "1",
        "data-nks-dt-collapsed": collapsed ? "true" : "false",
        style: collapsed ? void 0 : { height: `${height}px` }
      },
      // Drag the top edge to give the panel more or less room.
      h7("div", {
        className: "nks-dt-grip",
        "data-nks-dt-grip": "1",
        role: "separator",
        "aria-orientation": "horizontal",
        "aria-label": copy.devtoolsResize,
        onPointerDown: startResize
      }),
      h7(
        "div",
        { className: "nks-dt-head" },
        // View switch and row actions are host primitives; the
        // pane draws no tab chrome of its own (DESIGN.md §6.1). The strip is
        // scaled to the panel: at full size three options ate the whole header.
        h7(
          "div",
          { className: "nks-dt-tabs" },
          h7(primitives2.SegmentedControl, {
            id: "nks-dt-view",
            value: tab,
            label: copy.devtools,
            options: [
              { value: "console", label: copy.devtoolsConsole },
              { value: "network", label: copy.devtoolsNetwork },
              { value: "elements", label: copy.devtoolsElementsTab }
            ],
            onChange: (next) => {
              setTab(next);
              if (next !== "elements") setStyles(null);
              if (next !== "network") setNetDetail(null);
            }
          })
        ),
        h7("span", { style: { flex: "auto" } }),
        h7(primitives2.Button, { variant: "ghost", size: "sm", onClick: clear }, copy.devtoolsClear),
        h7(primitives2.Button, {
          variant: "ghost",
          size: "sm",
          "data-nks-dt-collapse": "1",
          "aria-expanded": collapsed ? "false" : "true",
          onClick: () => setCollapsed((value) => !value)
        }, collapsed ? copy.devtoolsExpand : copy.devtoolsCollapse),
        h7(primitives2.Button, { variant: "ghost", size: "sm", onClick: onClose }, copy.devtoolsClose)
      ),
      h7(
        "div",
        { className: "nks-dt-filterbar", "data-nks-dt-filterbar": "1" },
        h7(primitives2.Input, {
          className: "nks-dt-search",
          "data-nks-dt-search": "1",
          type: "search",
          value: query,
          placeholder: tab === "elements" ? copy.devtoolsSearchElements : tab === "console" ? copy.devtoolsSearchConsole : copy.devtoolsSearch,
          "aria-label": tab === "elements" ? copy.devtoolsSearchElements : tab === "console" ? copy.devtoolsSearchConsole : copy.devtoolsSearch,
          onChange: (event) => setQuery(event.target.value)
        }),
        tab === "console" ? h7(
          primitives2.Tooltip,
          { label: copy.devtoolsFilterLevel },
          h7(primitives2.Button, {
            variant: "outline",
            size: "sm",
            "data-nks-dt-level": "1",
            "aria-label": `${copy.devtoolsFilterLevel}: ${levelFilter === "all" ? copy.devtoolsAllLevels : levelFilter}`,
            onClick: openLevelMenu
          }, levelFilter === "all" ? copy.devtoolsAllLevels : levelFilter.toUpperCase())
        ) : null,
        tab === "network" ? h7(
          primitives2.Tooltip,
          { label: copy.devtoolsFilterType },
          h7(primitives2.Button, {
            variant: "outline",
            size: "sm",
            "data-nks-dt-type": "1",
            "aria-label": `${copy.devtoolsFilterType}: ${typeFilter === "all" ? copy.devtoolsTypeAll : typeFilter}`,
            onClick: openTypeMenu
          }, typeFilter === "all" ? copy.devtoolsTypeAll : typeFilter)
        ) : null,
        tab === "network" ? h7(
          primitives2.Tooltip,
          { label: copy.devtoolsFailedOnlyHint },
          h7(
            "label",
            { className: "nks-dt-switch", "data-nks-dt-failed": "1" },
            h7(primitives2.Switch, { checked: failedOnly, onChange: setFailedOnly, label: copy.devtoolsFailedOnly }),
            h7("span", null, copy.devtoolsFailedOnly)
          )
        ) : null,
        tab === "network" ? h7(
          primitives2.Tooltip,
          { label: copy.devtoolsCacheUnsupported },
          h7(
            "span",
            { className: "nks-dt-cache", "data-nks-dt-cache": "1", "aria-disabled": "true" },
            h7(primitives2.Switch, { checked: false, disabled: true, onChange: () => {
            }, label: copy.devtoolsDisableCache }),
            h7("span", null, copy.devtoolsDisableCache),
            h7("b", null, copy.devtoolsUnsupported)
          )
        ) : null,
        tab === "elements" ? h7("span", {
          className: "nks-dt-stats",
          "data-nks-dt-stats": "1",
          title: copy.devtoolsDomStatsHint
        }, `${copy.devtoolsNodes} ${rows.length} \xB7 ${copy.devtoolsElements} ${elementCount} \xB7 ${copy.devtoolsDepth} ${maxDepth}`) : null
      ),
      tab === "elements" && styles ? h7(
        "div",
        { className: "nks-dt-styles", "data-nks-dt-styles": "1" },
        h7(
          "div",
          { className: "nks-dt-style-head" },
          h7("span", null, `${styles.selector} \xB7 ${styles.matched.length} rules \xB7 ${Object.keys(styles.computed || {}).length} computed`),
          h7("button", {
            type: "button",
            className: "nks-dt-style-x",
            "data-nks-dt-style-close": "1",
            "aria-label": copy.devtoolsCloseStyles,
            title: copy.devtoolsCloseStyles,
            onClick: () => setStyles(null)
          }, "\xD7")
        ),
        styles.matched.slice(0, 6).map((rule, i) => h7(
          "div",
          { className: "nks-dt-rule", key: `r${i}` },
          h7("b", null, rule.selector || copy.devtoolsAnonymous),
          h7("span", null, (rule.properties || []).slice(0, 6).join("; "))
        ))
      ) : null,
      tab === "elements" ? h7(
        "div",
        { className: "nks-dt-cols" },
        h7("span", { className: "nks-dt-lv" }, copy.colTag),
        h7("span", { className: "nks-dt-msg", style: { textAlign: "left" } }, copy.colElement),
        h7("span", { className: "nks-dt-dur" }, copy.colChildren)
      ) : null,
      tab === "console" ? h7(
        "div",
        { className: "nks-dt-cols" },
        h7("span", { className: "nks-dt-time" }, copy.colTime),
        h7("span", { className: "nks-dt-lv" }, copy.colLevel),
        h7("span", { className: "nks-dt-msg", style: { textAlign: "left" } }, copy.colMessage),
        h7("span", { className: "nks-dt-src" }, copy.colSource)
      ) : null,
      tab === "network" ? h7(
        "div",
        { className: "nks-dt-cols" },
        h7("span", { className: "nks-dt-lv" }, copy.colMethod),
        h7("span", { className: "nks-dt-st" }, copy.colStatus),
        h7("span", { className: "nks-dt-type" }, copy.colType),
        h7("span", { className: "nks-dt-url nks-dt-grow", style: { maxWidth: "none", textAlign: "left" } }, copy.colUrl),
        h7("span", { className: "nks-dt-size" }, copy.colSize),
        h7("span", { className: "nks-dt-dur" }, copy.colDuration),
        h7("span", { className: "nks-dt-wf", style: { height: "auto" } }, copy.colWaterfall)
      ) : null,
      h7(
        "div",
        { className: "nks-dt-body", "data-nks-dt-body": "1" },
        visibleRows.length === 0 ? h7("div", { className: "nks-dt-empty" }, rows.length && tab === "console" ? copy.devtoolsNoMatchConsole : rows.length && tab === "network" ? copy.devtoolsNoMatch : copy.devtoolsEmpty) : null,
        visibleRows.map((row, index) => tab === "elements" ? h7(
          "div",
          { className: "nks-dt-row", key: `e${row.nodeId || index}`, style: { paddingLeft: `${8 + (row.level || 0) * 12}px`, cursor: "pointer" }, onClick: () => inspectNode(row), "data-nks-el-node": String(row.nodeId) },
          h7("span", { className: "nks-dt-lv" }, row.tag),
          h7("span", { className: "nks-dt-msg" }, `${row.id ? "#" + row.id : ""}${row.cls ? "." + String(row.cls).split(/\s+/).slice(0, 2).join(".") : ""}`),
          h7("span", { className: "nks-dt-dur" }, row.childNodeCount ? String(row.childNodeCount) : "")
        ) : tab === "console" ? h7(
          "div",
          { className: "nks-dt-row", key: `c${row.seq ?? row.at ?? index}`, "data-level": row.level },
          h7("span", { className: "nks-dt-time" }, String(row.at || "").slice(11, 19)),
          h7("span", { className: "nks-dt-lv", "data-lv": row.level }, row.level),
          h7("span", { className: "nks-dt-msg" }, row.text),
          h7("span", { className: "nks-dt-src" }, row.url ? `${row.url}${row.lineNumber != null ? ":" + row.lineNumber : ""}` : row.source || "")
        ) : h7(
          "div",
          {
            className: "nks-dt-row",
            key: `n${row.id || index}`,
            style: { cursor: "pointer" },
            "data-nks-net-row": String(row.id || ""),
            "data-selected": netDetail?.entry?.id === row.id ? "true" : "false",
            onClick: () => openNetworkDetail(row)
          },
          h7("span", { className: "nks-dt-lv" }, row.method),
          h7("span", { className: "nks-dt-st", "data-bad": row.failed || row.status && row.status >= 400 ? "true" : "false" }, row.failed ? "ERR" : String(row.status || "\u2026")),
          h7("span", { className: "nks-dt-type", "data-resource": resourceTypeLabel(row), title: `${row.type || "Other"}${row.mimeType ? " \xB7 " + row.mimeType : ""}` }, resourceTypeLabel(row)),
          h7("span", { className: "nks-dt-url nks-dt-grow", "data-bad": row.failed || (row.status || 0) >= 400 ? "true" : "false" }, row.url),
          h7("span", { className: "nks-dt-size", title: copy.devtoolsSizeHint }, formatSize(row.size)),
          h7("span", { className: "nks-dt-dur" }, formatDuration(row.durationMs)),
          h7("span", { className: "nks-dt-wf", "data-nks-dt-wf": "1" }, wfBar(row, visibleRows))
        ))
      ),
      tab === "network" && netDetail ? h7(
        "div",
        { className: "nks-net-detail", "data-nks-net-detail": "1" },
        h7(
          "div",
          { className: "nks-net-detail-head" },
          h7(
            "b",
            { className: "nks-net-detail-title", title: netDetail.entry?.url || "" },
            `${netDetail.entry?.method || "GET"} ${netDetail.entry?.url || ""}`
          ),
          h7("button", {
            type: "button",
            className: "nks-net-detail-x",
            "data-nks-net-detail-close": "1",
            "aria-label": copy.devtoolsDetailClose,
            title: copy.devtoolsDetailClose,
            onClick: () => setNetDetail(null)
          }, "\xD7")
        ),
        h7(
          "div",
          { className: "nks-net-detail-tabs" },
          [["headers", copy.devtoolsHeaders], ["payload", copy.devtoolsPayload], ["response", copy.devtoolsResponse]].map(([value, label]) => h7(primitives2.Button, {
            key: value,
            variant: netDetailTab === value ? "outline" : "ghost",
            size: "sm",
            "data-nks-net-tab": value,
            onClick: () => setNetDetailTab(value)
          }, label))
        ),
        h7("div", { className: "nks-net-detail-body" }, renderNetDetail())
      ) : null
    );
  }
  function wfBar(row, rows) {
    const starts = rows.map((r) => Number(r.startedAt) || 0).filter(Boolean);
    const ends = rows.map((r) => (Number(r.startedAt) || 0) + (Number(r.durationMs) || 0)).filter(Boolean);
    const min = starts.length ? Math.min(...starts) : 0;
    const span = Math.max(1, (ends.length ? Math.max(...ends) : min + 1) - min);
    const start = Number(row.startedAt) || 0;
    const dur = Number(row.durationMs) || 0;
    const left = Math.max(0, Math.min(100, (start - min) / span * 100));
    const width = dur > 0 ? Math.max(1.5, Math.min(100 - left, dur / span * 100)) : 1.5;
    const pending = row.durationMs == null && !row.failed;
    return h7("i", { style: { left: `${left}%`, width: `${width}%` }, "data-bad": row.failed || (row.status || 0) >= 400 ? "true" : "false", "data-pending": pending ? "true" : "false" });
  }
  function BrowserPane({ copy, languageOf, theme, onThemeChange }) {
    const [status, setStatus] = React12.useState(null);
    const engine = engineEndpoint(status);
    const statusDown = status != null && (status.ok === false || status.ready === false);
    const engineNavigating = status?.navigation?.outcome === "in-flight";
    const [pageUrl, setPageUrl] = React12.useState("");
    const [draftUrl, setDraftUrl] = React12.useState("");
    const [history, setHistory] = React12.useState([]);
    const [historyOpen, setHistoryOpen] = React12.useState(false);
    const [shot, setShot] = React12.useState(null);
    const [shotMime, setShotMime] = React12.useState("image/webp");
    const [shotMeta, setShotMeta] = React12.useState(null);
    const [annotate, setAnnotate] = React12.useState(false);
    const [pick, setPick] = React12.useState(null);
    const [pins, setPins] = React12.useState([]);
    const [draftBox, setDraftBox] = React12.useState(null);
    const [draftKind, setDraftKind] = React12.useState(null);
    const [comment, setComment] = React12.useState("");
    const [editing, setEditing] = React12.useState(false);
    const [composing, setComposing] = React12.useState(false);
    const refSeq = React12.useRef(0);
    const [devtoolsOpen, setDevtoolsOpen] = React12.useState(false);
    const [navOpen, setNavOpen] = React12.useState(false);
    const [navTabs, setNavTabs] = React12.useState([]);
    const [nativeHtml, setNativeHtml] = React12.useState(true);
    const [domDoc, setDomDoc] = React12.useState(null);
    const [staleNav, setStaleNav] = React12.useState(false);
    const domVersionRef = React12.useRef("");
    const [vp, setVp] = React12.useState(null);
    const [vpCustom, setVpCustom] = React12.useState(false);
    const domFrameRef = React12.useRef(null);
    const [toast, setToast] = React12.useState(null);
    const [toastFix, setToastFix] = React12.useState(false);
    const [control, setControl] = React12.useState(null);
    const [actionToast, setActionToast] = React12.useState(null);
    const lastActionStamp = React12.useRef("");
    const actionToastTimer = React12.useRef(0);
    const [busy, setBusy] = React12.useState(false);
    const [beat, setBeat] = React12.useState(false);
    const [beatSec, setBeatSec] = React12.useState(0);
    const [hover, setHover] = React12.useState(null);
    const [frame, setFrame] = React12.useState(null);
    const toastTimer = React12.useRef(0);
    const workspaceRef = React12.useRef(null);
    const frameRef = React12.useRef(null);
    const dragRef = React12.useRef(null);
    const busyRef = React12.useRef(false);
    const shotInFlightRef = React12.useRef(false);
    const dialogOpenRef = React12.useRef(false);
    const hoverTimerRef = React12.useRef(0);
    const clickTimerRef = React12.useRef(0);
    const lastDblClickRef = React12.useRef(0);
    const annotateRef = React12.useRef(false);
    const pickRef = React12.useRef(null);
    const pinsRef = React12.useRef([]);
    const commentRef = React12.useRef("");
    const editingRef = React12.useRef(false);
    const shotMetaRef = React12.useRef(null);
    const sendPickRef = React12.useRef(null);
    const clearPickRef = React12.useRef(() => {
    });
    annotateRef.current = annotate;
    pickRef.current = pick;
    pinsRef.current = pins;
    commentRef.current = comment;
    editingRef.current = editing;
    shotMetaRef.current = shotMeta;
    React12.useEffect(() => {
      const element = workspaceRef.current;
      if (element === null) return void 0;
      const scope = createThemeScope2({ theme, element, subscribe: onThemeChange });
      return () => scope.dispose();
    }, []);
    const addressFocusedRef = React12.useRef(false);
    React12.useEffect(() => {
      if (pageUrl && !addressFocusedRef.current) setDraftUrl(pageUrl);
    }, [pageUrl]);
    const refreshStatus = React12.useCallback(() => {
      return fetch(STATUS).then((response) => response.json()).then((payload) => {
        setStatus(payload);
        return payload;
      }).catch((cause) => {
        const fallback = { ok: false, error: cause.message };
        setStatus(fallback);
        return fallback;
      });
    }, []);
    React12.useEffect(() => {
      if (!navOpen) return;
      let alive = true;
      fetch(`${BROWSE_HISTORY}?limit=120`).then((r) => r.json()).then((data) => {
        if (!alive) return;
        const byUrl = /* @__PURE__ */ new Map();
        for (const row of Array.isArray(data?.entries) ? data.entries : []) {
          if (!row?.url) continue;
          const prev = byUrl.get(row.url);
          if (prev) prev.count += row.count || 1;
          else byUrl.set(row.url, { url: row.url, count: row.count || 1 });
        }
        setNavTabs([...byUrl.values()]);
      }).catch(() => {
        if (alive) setNavTabs([]);
      });
      return () => {
        alive = false;
      };
    }, [navOpen]);
    const delNavTab = (url) => {
      fetch(`${BROWSE_HISTORY}?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => {
      });
      setNavTabs((current) => current.filter((row) => row.url !== url));
    };
    React12.useEffect(() => {
      refreshStatus().then(async (statusPayload) => {
        if (!statusPayload?.ok) return;
        try {
          const fit = frameSize();
          const shotPayload = await post(SHOT, { format: "webp", ...fit ? { fit } : {} });
          setShot(shotPayload.data);
          setShotMime(shotPayload.mimeType || "image/webp");
          loadDom().catch(() => {
          });
          setShotMeta({ url: shotPayload.url || "", scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || "", viewport: shotPayload.viewport?.width ?? null, at: Date.now() });
          if (shotPayload.url && shotPayload.url !== "about:blank") setPageUrl(shotPayload.url);
        } catch {
        }
      });
    }, []);
    React12.useEffect(() => {
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
          event.preventDefault();
          if (dragRef.current) {
            endDrag();
            return;
          }
          if (pickRef.current) {
            clearPickRef.current();
            return;
          }
          if (annotateRef.current) {
            setAnnotate(false);
            return;
          }
          setNavOpen(false);
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
    React12.useEffect(() => {
      if (!beat) {
        setBeatSec(0);
        return void 0;
      }
      const started = Date.now();
      let ticks = 0;
      const timer = window.setInterval(() => {
        ticks += 1;
        setBeatSec(Math.max(1, Math.floor((Date.now() - started) / 1e3)));
        if (ticks % 2 === 0) refreshStatus().catch(() => {
        });
      }, 1e3);
      return () => window.clearInterval(timer);
    }, [beat]);
    React12.useEffect(() => {
      if (!engineNavigating) return void 0;
      const timer = window.setInterval(() => {
        refreshStatus().catch(() => {
        });
      }, 3e3);
      return () => window.clearInterval(timer);
    }, [engineNavigating]);
    React12.useEffect(() => {
      if (nativeHtml && shot && !domDoc) loadDom().catch(() => {
      });
    }, [shot, nativeHtml]);
    React12.useEffect(() => {
      if (!nativeHtml || !shot) return void 0;
      let alive = true;
      let fails = 0;
      const poll = () => {
        loadDom().then((ok) => {
          fails = ok ? 0 : fails + 1;
        }).catch(() => {
          fails += 1;
        });
      };
      const timer = window.setInterval(() => {
        if (alive && fails < 3) poll();
      }, 3e3);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [shot, nativeHtml]);
    React12.useEffect(() => {
      if (shot) return void 0;
      const timer = window.setInterval(() => {
        if (!busyRef.current) reloadShot(0, { keepPick: true }).catch(() => {
        });
      }, 2e3);
      return () => clearInterval(timer);
    }, [shot]);
    React12.useEffect(() => {
      let armed = 0;
      const onKey = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
          armed = Date.now();
          return;
        }
        if (armed && Date.now() - armed < 1200 && event.key === "2") {
          event.preventDefault();
          armed = 0;
          setDevtoolsOpen((value) => !value);
        }
      };
      window.addEventListener("keydown", onKey, true);
      return () => window.removeEventListener("keydown", onKey, true);
    }, []);
    React12.useEffect(() => {
      if (!nativeHtml) return;
      const frame2 = domFrameRef.current;
      if (frame2 && domDoc) {
        try {
          writeDomFrame(frame2);
        } catch {
        }
      }
    }, [domDoc, nativeHtml]);
    React12.useEffect(() => {
      const onMessage = (event) => {
        const data = event.data;
        if (!data || data.__nks !== "pick" || !data.packet) return;
        const packet = data.packet;
        setPick({ elements: [packet], anchor: packet.box ? { x: packet.box.x + packet.box.width / 2, y: packet.box.y + packet.box.height } : null });
        setEditing(false);
      };
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }, []);
    React12.useEffect(() => {
      const phase = engine.phase;
      if (phase && phase !== "running" && shot) {
        setShot(null);
        setPick(null);
        setPins([]);
        setShotMeta(null);
      }
    }, [engine.phase]);
    React12.useEffect(() => {
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
          if (!busyRef.current) reloadShot(0, { keepPick: true, fromResize: true }).catch(() => {
          });
        }, 320);
      });
      observer.observe(element);
      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    }, []);
    React12.useEffect(() => {
      const onFocus = () => {
        if (!busyRef.current) reloadShot(0, { keepPick: true }).catch(() => {
        });
      };
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }, []);
    React12.useLayoutEffect(() => {
      const element = frameRef.current;
      if (!element) return void 0;
      const measure = () => {
        const img = element.querySelector("img");
        if (img) {
          setFrame(frameOf(img));
          return;
        }
        const rect = element.getBoundingClientRect();
        setFrame(rect.width > 0 && rect.height > 0 ? { left: 0, top: 0, width: rect.width, height: rect.height, scale: 1 } : null);
      };
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
    const RECOVERABLE = /^kitesurf\.(shot|engine|elements|dom|navigate|pick|wait|ref)\.|^sandbox\.cdp\./;
    async function repairNow() {
      setToastFix(false);
      setToast(copy.preparingEnv);
      try {
        await fetch(RECOVER, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        await refreshStatus();
        await reloadShot(0, { keepPick: true }).catch(() => {
        });
        setToast(copy.prepareDone);
      } catch (cause) {
        setToast(`${copy.prepareFailed}: ${cause?.message || cause}`);
      }
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => {
        setToast(null);
        setToastFix(false);
      }, 3e3);
    }
    function showError(cause) {
      const errorId = cause?.errorId || "kitesurf.unknown";
      const message = cause instanceof Error ? cause.message : String(cause);
      setToast(`${errorId} ${message}`);
      setToastFix(RECOVERABLE.test(errorId));
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => {
        setToast(null);
        setToastFix(false);
      }, 4e3);
      refreshStatus();
    }
    function showToast(text) {
      setToast(text);
      setToastFix(false);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => {
        setToast(null);
        setToastFix(false);
      }, 2e3);
    }
    async function run(work, opts) {
      if (perf?.span) return perf.span("pane-op", () => runInner(work, opts));
      return runInner(work, opts);
    }
    async function runInner(work, opts = {}) {
      window.__dnkRuns = (window.__dnkRuns || 0) + 1;
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      if (opts.beat) setBeat(true);
      try {
        await work();
      } catch (cause) {
        if (opts.nav) setStaleNav(true);
        if (opts.dialog) showOpenError(cause, opts.url);
        else showError(cause);
      } finally {
        busyRef.current = false;
        setBusy(false);
        setBeat(false);
      }
    }
    function showOpenError(cause, url) {
      const errorId = cause?.errorId || "kitesurf.unknown";
      const message = cause instanceof Error ? cause.message : String(cause);
      refreshStatus();
      const workspaceEl = workspaceRef.current;
      if (dialogOpenRef.current || workspaceEl === null) {
        showError(cause);
        return;
      }
      dialogOpenRef.current = true;
      let dialog = null;
      const finish = () => {
        dialogOpenRef.current = false;
      };
      dialog = openNanoDialog2({
        copy: { cancel: copy.close, confirm: url ? copy.retry : copy.close, close: copy.close },
        title: copy.openFailed,
        description: errorId,
        width: 420,
        container: workspaceEl,
        confirmLabel: url ? copy.retry : copy.close,
        onCancel: finish,
        onConfirm: () => {
          finish();
          dialog?.close();
          if (url) openPage(url);
        },
        children: h7(
          "div",
          { "data-nks-open-error": "1" },
          h7("p", { className: "nks-open-error" }, message),
          url ? h7("p", { className: "nks-open-error nks-open-url" }, url) : null,
          cause?.detail?.engineLog ? h7("pre", { className: "nks-open-log", "data-nks-open-log": "1" }, cause.detail.engineLog) : null
        )
      });
    }
    function openPage(url) {
      return run(() => navigate(url), { beat: true, dialog: true, url, nav: true });
    }
    function remember(url) {
      setPageUrl(url);
      setHistory((current) => [url, ...current.filter((item) => item !== url)].slice(0, 8));
    }
    async function navigate(url) {
      const shotPayload = await perf.span("navigate", () => captureNavigation2(post, {
        openPath: OPEN,
        shotPath: SHOT,
        url,
        fit: frameSize()
      }));
      setShot(shotPayload.data);
      setShotMime(shotPayload.mimeType || "image/webp");
      setShotMeta({ url: shotPayload.url || "", scrollY: shotPayload.scrollY || 0, targetId: shotPayload.targetId || "", viewport: shotPayload.viewport?.width ?? null, at: Date.now() });
      setStaleNav(false);
      await loadDom();
      setPick(null);
      remember(shotPayload.url);
    }
    function frameSize() {
      const element = frameRef.current;
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      if (width < 320) return null;
      const height = Math.max(240, Math.min(2160, Math.round(rect.height)));
      return { width, height };
    }
    async function reloadShot(scroll, options = {}) {
      if (shotInFlightRef.current && options.fromResize) return;
      shotInFlightRef.current = true;
      try {
        return await reloadShotInner(scroll, options);
      } finally {
        shotInFlightRef.current = false;
      }
    }
    async function loadDom(options = {}) {
      try {
        const data = await fetch(DOM).then((r) => r.json());
        if (data?.ok && data.srcdoc) {
          const sig = (data.domSeq ?? data.capturedAt ?? data.generation) != null ? `v:${data.domSeq ?? ""}:${data.capturedAt ?? ""}:${data.generation ?? ""}:${data.url ?? ""}` : `s:${data.srcdoc}:${data.url ?? ""}`;
          if (sig && sig === domVersionRef.current) return true;
          domVersionRef.current = sig;
          setDomDoc({
            srcdoc: data.srcdoc,
            url: data.url,
            at: Date.now(),
            capturedAt: data.capturedAt ?? null,
            domSeq: data.domSeq ?? null,
            generation: data.generation ?? null
          });
          if (data.url && data.url !== "about:blank") setPageUrl(data.url);
          return true;
        }
      } catch {
      }
      if (!options.keep) {
        setDomDoc(null);
        domVersionRef.current = "";
      }
      return false;
    }
    async function reloadShotInner(scroll, options = {}) {
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
      setStaleNav(false);
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
      await openPage(draftUrl);
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
      if (event.target && event.target.tagName === "IFRAME") return;
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
      if (nativeHtml && domDoc) return;
      if (!shot || busyRef.current || dragRef.current) return;
      const delta = event.deltaY;
      if (Math.abs(delta) < 8) return;
      run(() => reloadShot(delta), { nav: true });
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
    function clearPick() {
      setPick(null);
      setEditing(false);
      setComposing(false);
      setComment("");
      setHover(null);
    }
    clearPickRef.current = clearPick;
    function sendPick(toComposer, element) {
      const open = element ? { elements: [element], anchor: null } : pickRef.current;
      if (!open?.elements?.length) return;
      try {
        const note = open.elements.length > 1 ? multiNote2(open.elements, { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` }) : designNote2(open.elements[0], { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` });
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
      return open.elements.length > 1 ? multiNote2(open.elements, { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` }) : designNote2(open.elements[0], { url: pageUrl, comment: commentRef.current, ref: `k${++refSeq.current}` });
    }
    async function injectNote() {
      const note = noteOf();
      if (!note) return;
      const element = pickRef.current?.elements?.[0] || null;
      const label = element ? `${element.tag || "element"}${element.text ? " \xB7 " + element.text.slice(0, 24) : ""}` : "selection";
      try {
        const refId = null;
        localNotes.push({ text: note, packet: element, label });
        insertComposerNote(note);
        setComment("");
        setComposing(false);
        setPick(null);
        showToast(refId ? fill(copy.injectedCharsRef, { n: note.length, id: refId }) : fill(copy.injectedChars, { n: note.length }));
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
          await refreshStatus();
          if (response?.v != null && response.v !== 1) showToast(copy.contractMismatch);
          else if (response?.ready === true) await reloadShot(0, { keepPick: true });
          else showToast(copy.prepareNotReady || copy.prepareFailed);
        } catch (cause) {
          showError(cause);
        }
      });
    }
    function onStartEngine() {
      run(async () => {
        const fresh = await refreshStatus();
        const phase = engineEndpoint(fresh).phase;
        if (phase === "running") return;
        const action = phase === "suspended" ? "resume" : "start";
        await post(LIFECYCLE, { action });
        await reloadShot();
      });
    }
    async function onRefresh() {
      if (!pageUrl) return;
      await openPage(pageUrl);
    }
    function openHistory() {
      setHistoryOpen(true);
    }
    const pickBoxes = pick?.elements ? pick.elements.map((element) => elementBox(element)).filter(Boolean) : [];
    const allBoxes = draftBox ? [{ box: draftBox, kind: draftKind === "ellipse" ? "ellipse" : "draft" }] : [
      ...pickBoxes.map((box, index) => ({ box, kind: pick?.elements?.[index]?.tag === "ellipse" ? "ellipse" : "pick" })),
      ...annotate && hover && !pick ? [{ box: hover, kind: "hover" }] : []
    ];
    const activeFrame = frame || (nativeHtml && domDoc && frameRef.current ? (() => {
      const r = frameRef.current.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? { left: 0, top: 0, width: r.width, height: r.height, scale: 1 } : null;
    })() : null);
    const overlays = activeFrame ? allBoxes.map(({ box, kind }) => ({
      kind,
      left: activeFrame.left + box.x * activeFrame.scale,
      top: activeFrame.top + box.y * activeFrame.scale,
      width: Math.max(box.width * activeFrame.scale, 2),
      height: Math.max(box.height * activeFrame.scale, 2)
    })) : [];
    const hasPage = !!shot && !!shotMeta?.url && shotMeta.url !== "about:blank";
    const engineHasPage = hasPage || engine.phase === "running" || !!engine.httpBase;
    React12.useEffect(() => {
      if (!engineHasPage) {
        setControl(null);
        return void 0;
      }
      let alive = true;
      const load = async () => {
        try {
          const data = await fetch(CONTROL).then((r) => r.json());
          if (!alive) return;
          const c = data?.control ?? null;
          setControl(c);
          const stamp = c?.lastAction ? `${c.lastAction.at}:${c.lastAction.tool}` : "";
          if (stamp && stamp !== lastActionStamp.current) {
            lastActionStamp.current = stamp;
            setActionToast({ tool: c.lastAction.tool, ok: c.lastAction.ok });
            clearTimeout(actionToastTimer.current);
            actionToastTimer.current = setTimeout(() => setActionToast(null), 2600);
          }
        } catch {
        }
      };
      load();
      let timer = window.setInterval(load, document.visibilityState === "hidden" ? 12e3 : 1500);
      const onVis = () => {
        clearInterval(timer);
        timer = window.setInterval(load, document.visibilityState === "hidden" ? 12e3 : 1500);
        if (document.visibilityState !== "hidden") load();
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        alive = false;
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onVis);
        clearTimeout(actionToastTimer.current);
      };
    }, [engineHasPage]);
    const controlOp = React12.useCallback(async (action) => {
      try {
        const data = await fetch(CONTROL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, owner: "kitesurf-pane" }) }).then((r) => r.json());
        if (data?.control) setControl(data.control);
        else setControl(null);
      } catch {
        setControl(null);
      }
    }, []);
    const anchor = pick?.anchor;
    const pickAnchor = overlays.find((o) => o.kind === "pick" || o.kind === "ellipse") || (activeFrame && anchor ? { left: activeFrame.left + anchor.x * activeFrame.scale, top: activeFrame.top + anchor.y * activeFrame.scale, width: 0, height: 0 } : null) || (activeFrame ? { left: activeFrame.left + 16, top: activeFrame.top + 16, width: 0, height: 0 } : null);
    const glyph = (name) => {
      const Icon = {
        back: primitives2.IconChevronLeftOutlineRegular,
        forward: primitives2.IconChevronRightOutlineRegular,
        history: primitives2.IconClockOutlineRegular,
        refresh: primitives2.IconRefreshOutlineRegular,
        go: primitives2.IconLinkOutlineRegular,
        annotate: primitives2.IconEditOutlineRegular,
        settings: primitives2.IconSettingsOutlineRegular,
        send: primitives2.IconRightUpOutlineRegular,
        undo: primitives2.IconCloseOutlineRegular,
        exit: primitives2.IconCloseOutlineRegular,
        clear: primitives2.IconTrashOutlineRegular,
        edit: primitives2.IconEditOutlineRegular || primitives2.IconRightUpOutlineRegular,
        copy: primitives2.IconCopyOutlineRegular || primitives2.IconEditOutlineRegular,
        panel: primitives2.IconPanelLeftOutlineRegular || primitives2.IconEditOutlineRegular,
        globe: primitives2.IconGlobeOutlineRegular || primitives2.IconLinkOutlineRegular
      }[name];
      return h7(
        "span",
        { className: "nks-tool-glyph", style: !navOpen && name === "panel" ? { display: "inline-flex", transform: "scaleX(-1)" } : { display: "inline-flex" } },
        h7(Icon, { width: 15, height: 15, "aria-hidden": true })
      );
    };
    function EnvPanel() {
      const [snap, setSnap] = React12.useState(null);
      const [probeMisses, setProbeMisses] = React12.useState(0);
      const [diag, setDiag] = React12.useState(null);
      const copyRawDiag = React12.useRef(false);
      const [busyLocal, setBusyLocal] = React12.useState(false);
      const [note, setNote] = React12.useState("");
      const logsOpenRef = React12.useRef(false);
      React12.useEffect(() => {
        let alive = true;
        let seen = null;
        const load = () => fetch(PORTS).then((r) => r.json()).then((data) => {
          if (!alive || !data) return;
          setProbeMisses(0);
          const sig = `${data.v ?? ""}:${data.epoch ?? ""}:${data.ready ?? ""}`;
          if (sig === seen) return;
          seen = sig;
          setSnap(data);
        }).catch(() => {
          if (alive) setProbeMisses((n) => n + 1);
        });
        load();
        const period = () => document.visibilityState === "hidden" ? 12e3 : 1500;
        let timer = window.setInterval(load, period());
        const onVis = () => {
          clearInterval(timer);
          timer = window.setInterval(load, period());
          if (document.visibilityState !== "hidden") load();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => {
          alive = false;
          clearInterval(timer);
          document.removeEventListener("visibilitychange", onVis);
        };
      }, []);
      async function prepare() {
        setBusyLocal(true);
        setNote(copy.preparingEnv);
        try {
          const response = await fetch(RECOVER, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
          const result = await response.json().catch(() => ({}));
          const ports = result.ports ? result : await fetch(PORTS).then((r) => r.json()).catch(() => null);
          setSnap(ports);
          if (Array.isArray(result.summary)) setDiag(result);
          const failed = planeRows(result, copy).filter((row) => !row.ok && !row.skipped);
          if (result.planes && Number.isFinite(result.v) && result.v !== 1) setNote(copy.contractNewer);
          else if (!result.ok) setNote(`${copy.prepareFailed}: ${result.errorId || result.error || `HTTP ${response.status}`}`);
          else if (result.ready !== true) setNote(`${copy.prepareNotReady}: ${failed.map((row) => row.plane || row.label).join(" / ")}`);
          else setNote(result.action === "noop" ? copy.prepareDone : `${copy.prepareDone} \xB7 ${result.action}`);
          await refreshStatus();
          await reloadShot(0, { keepPick: true }).catch(() => {
          });
        } catch (cause) {
          setNote(`${copy.prepareFailed}: ${cause?.message || cause}`);
        } finally {
          setBusyLocal(false);
        }
      }
      async function showLogs() {
        const workspaceEl = workspaceRef.current;
        if (workspaceEl === null || logsOpenRef.current) return;
        let text = copy.logsLoading;
        try {
          const data = await fetch(`${LOGS}?tail=300`).then((r) => r.json());
          text = data.ok ? data.text || copy.logsEmpty : `${data.errorId || "kitesurf.engine.connect"} ${data.error || ""}`;
        } catch (cause) {
          text = String(cause?.message || cause);
        }
        if (workspaceEl !== workspaceRef.current) return;
        logsOpenRef.current = true;
        let dialog = null;
        const close = () => {
          logsOpenRef.current = false;
        };
        dialog = openNanoDialog2({
          copy: { cancel: copy.close, confirm: copy.close, close: copy.close },
          title: copy.logsTitle,
          description: copy.logsDesc,
          width: 720,
          maxHeight: 560,
          container: workspaceEl,
          confirmLabel: copy.close,
          onCancel: close,
          onConfirm: () => {
            close();
            dialog?.close();
          },
          children: h7("pre", { className: "nks-logs", "data-nks-logs": "1" }, text)
        });
      }
      async function copyDiagnostics() {
        try {
          const data = await fetch(DIAGNOSTICS).then((r) => r.json());
          setDiag(data);
          const text = copyRawDiag.current ? JSON.stringify(data, null, 2) : data.text || JSON.stringify(data, null, 2);
          await navigator.clipboard.writeText(text);
          showToast(copy.diagCopied);
        } catch (cause) {
          showError(cause);
        }
      }
      const engineBase = snap?.effective?.httpBase || "\u2014";
      const container = snap?.container?.state || "\u2014";
      const portRow = snap?.ports?.engine ? `${snap.ports.engine.port} \xB7 ${snap.ports.engine.heldBy === "this-container" ? copy.portHeld : copy.portFree}` : "\u2014";
      const contractMismatch = snap != null && Number.isFinite(snap.v) && snap.v !== 1;
      const legacyHost = snap != null && !Number.isFinite(snap.v);
      const rows = planeRows(snap, copy);
      const probing = snap == null && probeMisses < 3;
      const healthy = !probing && !contractMismatch && snap?.ready === true;
      return h7(
        "div",
        { className: "nks-env", "data-nks-env": "1" },
        h7(
          "div",
          { className: "nks-env-title" },
          copy.envTitle,
          h7(
            "span",
            { className: healthy ? "nks-env-ok" : probing ? "nks-env-wait" : "nks-env-bad", title: legacyHost ? copy.legacyHostTitle : void 0 },
            probing ? `\u25CB ${copy.envProbing}` : contractMismatch ? copy.contractNewer : healthy ? `\u25CF ${copy.envOk}` : `\u25CF ${copy.envBad}`
          ),
          legacyHost ? h7("span", { className: "nks-env-legacy", "data-nks-legacy": "1" }, copy.legacyHost) : null
        ),
        h7("div", { className: "nks-env-row" }, h7("b", null, copy.envPlugin), h7("span", null, snap?.buildId || copy.envUnknown)),
        h7("div", { className: "nks-env-row" }, h7("b", null, copy.envEngine), h7("span", null, engineBase)),
        h7("div", { className: "nks-env-row" }, h7("b", null, copy.envContainer), h7("span", null, container)),
        snap?.containerName ? h7("div", { className: "nks-env-row" }, h7("b", null, copy.envInstance), h7("span", null, snap.containerName)) : null,
        h7("div", { className: "nks-env-row" }, h7("b", null, copy.envPorts), h7("span", null, portRow)),
        // Per-plane health, so "OK" can no longer mean "container up but the
        // pane silently fell back to screenshots".
        rows.length ? h7(
          "div",
          { className: "nks-env-checks", "data-nks-checks": String(rows.length) },
          rows.map((row) => h7(
            "div",
            { key: row.label, className: "nks-env-check", "data-ok": row.skipped ? "skip" : row.ok ? "true" : "false" },
            h7("span", { className: "nks-env-check-dot" }, row.skipped ? "\u25CB" : row.ok ? "\u2713" : "\u2717"),
            h7("b", null, row.label),
            h7("span", { className: "nks-env-check-detail" }, row.detail || "\u2014")
          ))
        ) : null,
        h7(
          "div",
          { className: "nks-env-actions" },
          h7("button", { type: "button", className: "nks-start-btn", "data-nks-prepare": "1", disabled: busyLocal, onClick: prepare }, busyLocal ? copy.preparingEnv : copy.prepareEnv),
          h7("button", {
            type: "button",
            className: "nks-start-btn",
            "data-nks-copy-diag": "1",
            title: copy.copyDiagHint,
            onClick: (event) => {
              copyRawDiag.current = event.shiftKey === true;
              copyDiagnostics();
            }
          }, copy.copyDiag),
          h7("button", { type: "button", className: "nks-start-btn", "data-nks-logs-open": "1", onClick: showLogs }, copy.logsButton)
        ),
        h7("div", { className: "nks-env-note" }, note || copy.envHint)
      );
    }
    function packetFromDom(el, doc, x, y) {
      const view = doc.defaultView;
      const cs = view.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const style = {};
      for (const k of ["color", "backgroundColor", "fontSize", "fontFamily", "fontWeight", "lineHeight", "display", "position", "margin", "padding", "border", "borderRadius", "width", "height", "flexDirection", "justifyContent", "alignItems", "gap", "zIndex", "overflow"]) {
        if (cs[k]) style[k] = String(cs[k]);
      }
      const attrs = {};
      for (const k of ["id", "class", "role", "aria-label", "aria-expanded", "href", "src", "type", "name", "alt", "title", "placeholder"]) {
        const v = k === "class" ? el.className && el.className.baseVal !== void 0 ? el.className.baseVal : el.className : el.getAttribute?.(k);
        if (typeof v === "string" && v.trim()) attrs[k] = v.trim().slice(0, 120);
      }
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && parts.length < 8) {
        let tag = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift(`${tag}#${node.id}`);
          break;
        }
        const parent = node.parentElement;
        if (parent) {
          let same = 0, index = 0;
          for (const child of parent.children) {
            if (child.tagName === node.tagName) {
              same += 1;
              if (child === node) index = same;
            }
          }
          if (same > 1) tag += `:nth-of-type(${index})`;
        }
        parts.unshift(tag);
        node = parent;
      }
      const ancestors = [];
      let up = el.parentElement;
      while (up && ancestors.length < 6) {
        const cls = typeof up.className === "string" ? up.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        ancestors.push(up.tagName.toLowerCase() + (cls ? `.${cls}` : ""));
        up = up.parentElement;
      }
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        className: typeof el.className === "string" ? el.className.slice(0, 200) : "",
        selector: parts.join(" > "),
        text: (el.innerText || "").trim().slice(0, 200),
        alt: el.getAttribute?.("alt") || "",
        src: el.getAttribute?.("src") || "",
        box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        style,
        attrs,
        ancestors,
        componentStack: null,
        parentSel: parts.length > 1 ? parts.slice(0, -1).join(" > ") : null,
        childSel: null
      };
    }
    function writeDomFrame(frame2) {
      if (!frame2 || !domDoc?.srcdoc) return;
      if (frame2.dataset.nksVersion === String(domDoc.at)) {
        bindDomFrame(frame2);
        return;
      }
      const doc = frame2.contentDocument;
      if (!doc) return;
      frame2.dataset.nksVersion = String(domDoc.at);
      doc.open();
      doc.write(domDoc.srcdoc);
      doc.close();
      try {
        delete doc.__nksBound;
      } catch {
      }
      bindDomFrame(frame2);
    }
    function bindDomFrame(frame2) {
      const doc = frame2?.contentDocument;
      if (!doc || doc.__nksBound) return;
      doc.__nksBound = true;
      try {
        const style = doc.createElement("style");
        style.textContent = ".__nks_hover{outline:1.5px dashed #7aaaff !important;outline-offset:-1px}";
        doc.documentElement.appendChild(style);
      } catch {
      }
      let hovered = null;
      const clearHover = () => {
        if (hovered) {
          hovered.classList.remove("__nks_hover");
          hovered = null;
        }
      };
      doc.addEventListener("mousemove", (e) => {
        if (!annotateRef.current) {
          clearHover();
          return;
        }
        clearHover();
        const el = doc.elementFromPoint(e.clientX, e.clientY);
        if (el) {
          el.classList.add("__nks_hover");
          hovered = el;
        }
      }, true);
      doc.addEventListener("click", (e) => {
        const dbg = { fired: 0 };
        dbg.fired += 1;
        dbg.mode = annotateRef.current;
        if (!annotateRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const el = doc.elementFromPoint(e.clientX, e.clientY);
        dbg.hit = el ? el.tagName : null;
        dbg.coords = [Math.round(e.clientX), Math.round(e.clientY)];
        if (!el) return;
        clearHover();
        const packet = packetFromDom(el, doc, e.clientX, e.clientY);
        dbg.packet = !!packet;
        setPick({ elements: [packet], anchor: { x: packet.box.x + packet.box.width / 2, y: packet.box.y + packet.box.height } });
        dbg.picked = true;
        setEditing(false);
      }, true);
      doc.addEventListener("mouseleave", clearHover, true);
      doc.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!pickRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        clearPickRef.current();
      }, true);
    }
    function SettingsTabs({ env, simulation }) {
      return h7(NanoTabs2, {
        label: copy.settingsTitle,
        items: [
          { value: "env", label: copy.tabEnv, content: env },
          { value: "simulation", label: copy.tabBrowse, content: simulation }
        ]
      });
    }
    function HistoryDialog({ open, onClose }) {
      const [rows, setRows] = React12.useState([]);
      const [q, setQ] = React12.useState("");
      const [busy2, setBusy2] = React12.useState(false);
      const load = React12.useCallback(async (needle) => {
        const data = await fetch(`${BROWSE_HISTORY}?limit=100${needle ? "&q=" + encodeURIComponent(needle) : ""}`).then((r) => r.json());
        setRows(data.entries || []);
      }, []);
      React12.useEffect(() => {
        if (open) load("").catch(() => {
        });
      }, [open, load]);
      if (!open) return null;
      const del = async (id) => {
        setBusy2(true);
        try {
          await fetch(`${BROWSE_HISTORY}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
          await load(q);
        } finally {
          setBusy2(false);
        }
      };
      const clear = async () => {
        setBusy2(true);
        try {
          await fetch(BROWSE_HISTORY, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clear: true }) });
          await load(q);
        } finally {
          setBusy2(false);
        }
      };
      return h7(
        "div",
        { className: "nks-modal-mask", "data-nks-history": "1", onClick: (e) => {
          if (e.target === e.currentTarget) onClose();
        } },
        h7(
          "div",
          { className: "nks-modal" },
          h7(
            "div",
            { className: "nks-modal-head" },
            h7("b", null, copy.historyTitle),
            h7("span", { className: "nks-modal-sub" }, fill(copy.historyCount, { n: rows.length })),
            h7("button", { type: "button", className: "nks-modal-x", onClick: onClose, "aria-label": copy.close }, "\xD7")
          ),
          h7(
            "div",
            { className: "nks-modal-bar" },
            h7("input", { "data-nks-history-q": "1", placeholder: copy.historySearch, value: q, onChange: async (e) => {
              setQ(e.target.value);
              await load(e.target.value);
            } }),
            h7("button", { type: "button", "data-nks-history-clear": "1", disabled: busy2 || !rows.length, onClick: clear }, copy.historyClear)
          ),
          h7(
            "div",
            { className: "nks-modal-body" },
            rows.length ? rows.map((row) => h7(
              "div",
              { className: "nks-hist-row", key: row.id, "data-nks-history-row": row.id },
              h7(
                "button",
                { type: "button", className: "nks-hist-open", onClick: () => {
                  setDraftUrl(row.url);
                  setHistoryOpen(false);
                  openPage(row.url);
                } },
                h7("span", { className: "nks-hist-url" }, row.url),
                h7("span", { className: "nks-hist-meta" }, `${String(row.at).slice(0, 16).replace("T", " ")}${row.count > 1 ? fill(copy.historyTimes, { n: row.count }) : ""}`)
              ),
              h7("button", { type: "button", className: "nks-hist-del", "data-nks-history-del": row.id, onClick: () => del(row.id), "aria-label": copy.historyDelete }, "\xD7")
            )) : h7("div", { className: "nks-modal-empty" }, copy.historyEmpty)
          )
        )
      );
    }
    function openSettings() {
      if (dialogOpenRef.current) return;
      const workspaceEl = workspaceRef.current;
      if (workspaceEl === null) return;
      dialogOpenRef.current = true;
      let close = () => {
      };
      let current = { userAgent: "", viewportWidth: "", viewportHeight: "", locale: "", geolocation: null, colorScheme: "light", cookies: "" };
      const dialog = openNanoDialog2({
        copy: { cancel: copy.cancel, confirm: copy.save, close: copy.close },
        title: copy.settingsTitle,
        description: copy.settingsDesc,
        width: 420,
        // Fixed height: the tab strip changes panels, never the card size.
        fixedHeight: 560,
        container: workspaceEl,
        // openNanoDialog already closes itself after onCancel — closing here
        // again would double root.unmount()/host.remove() (S3-3).
        onCancel: () => {
          dialogOpenRef.current = false;
        },
        onConfirm: () => save(),
        children: h7(SettingsTabs, {
          env: h7("div", { className: "nks-settings-stack" }, h7(EnvPanel, null)),
          simulation: h7(
            "form",
            {
              className: "nks-settings-body nks-simulation-body",
              onSubmit: (event) => {
                event.preventDefault();
                save();
              }
            },
            h7("label", { htmlFor: "nks-ua" }, copy.uaLabel),
            h7("input", { id: "nks-ua", className: "nks-address", autoFocus: true, placeholder: copy.uaPlaceholder }),
            h7("span", { id: "nks-viewport-label" }, copy.viewportLabel),
            h7(
              "div",
              {
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
              },
              [["default", copy.viewportDefault], ["1280", copy.viewportDesktop], ["768", copy.viewportTablet], ["390", copy.viewportPhone]].map(([value, label]) => h7("button", {
                key: value,
                type: "button",
                role: "radio",
                "aria-checked": value === "default" ? "true" : "false",
                tabIndex: value === "default" ? 0 : -1,
                "data-choice": value,
                className: "nks-choice",
                onClick: (event) => selectRadio(event.currentTarget.parentElement, value)
              }, label))
            ),
            h7("span", { className: "nks-settings-hint", "data-nks-vp-unsupported": "1" }, copy.viewportSupport),
            h7("label", { htmlFor: "nks-locale" }, copy.localeLabel),
            h7("input", { id: "nks-locale", className: "nks-address", placeholder: copy.localePlaceholder, spellCheck: false, autoComplete: "off" }),
            h7("label", null, copy.geoLabel),
            h7(
              "div",
              { className: "nks-settings-pair" },
              h7("input", { id: "nks-geo-lat", className: "nks-address", type: "number", step: "any", placeholder: copy.geoLat, "aria-label": copy.geoLat }),
              h7("input", { id: "nks-geo-lng", className: "nks-address", type: "number", step: "any", placeholder: copy.geoLng, "aria-label": copy.geoLng })
            ),
            h7("span", { className: "nks-settings-hint" }, copy.geoHint),
            h7("span", { id: "nks-color-label" }, copy.colorSchemeLabel),
            h7(
              "div",
              {
                id: "nks-color",
                className: "nks-choices",
                role: "radiogroup",
                "aria-labelledby": "nks-color-label",
                "data-value": "light",
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
              },
              [["light", copy.colorSchemeLight], ["dark", copy.colorSchemeDark]].map(([value, label]) => h7("button", {
                key: value,
                type: "button",
                role: "radio",
                "aria-checked": value === "light" ? "true" : "false",
                tabIndex: value === "light" ? 0 : -1,
                "data-choice": value,
                className: "nks-choice",
                onClick: (event) => selectRadio(event.currentTarget.parentElement, value)
              }, label))
            ),
            h7("label", { htmlFor: "nks-cookies" }, copy.cookiesLabel),
            h7("textarea", { id: "nks-cookies", className: "nks-address nks-cookie-text", rows: 4, placeholder: copy.cookiesPlaceholder, spellCheck: false }),
            h7("span", { className: "nks-settings-hint" }, copy.cookiesHint),
            h7("button", { type: "submit", style: { display: "none" }, "aria-hidden": "true", tabIndex: -1 })
          )
        })
      });
      close = () => {
        dialogOpenRef.current = false;
        dialog.close();
      };
      function save() {
        const nextAgent = document.getElementById("nks-ua")?.value ?? "";
        const choice = document.getElementById("nks-viewport")?.dataset.value ?? "default";
        const nextLocale = (document.getElementById("nks-locale")?.value ?? "").trim();
        const latText = (document.getElementById("nks-geo-lat")?.value ?? "").trim();
        const lngText = (document.getElementById("nks-geo-lng")?.value ?? "").trim();
        const nextColor = document.getElementById("nks-color")?.dataset.value ?? "light";
        const nextCookies = document.getElementById("nks-cookies")?.value ?? "";
        run(async () => {
          let nextGeo = null;
          if (latText || lngText) {
            const latitude = Number(latText);
            const longitude = Number(lngText);
            if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
              throw Object.assign(new Error(copy.geoInvalid), { status: 400, errorId: "kitesurf.body.json" });
            }
            nextGeo = { latitude, longitude };
          }
          const settingsPatch = {};
          if (nextAgent !== current.userAgent) settingsPatch.userAgent = nextAgent;
          const nextWidth = choice === "default" ? "" : choice;
          const viewportHeights = { 1280: 900, 768: 900, 390: 844 };
          if (nextWidth !== current.viewportWidth) {
            settingsPatch.viewport = choice === "default" ? null : { width: Number(choice), height: viewportHeights[choice] || 900 };
          }
          if (nextLocale !== current.locale) settingsPatch.locale = nextLocale || null;
          if (JSON.stringify(nextGeo) !== JSON.stringify(current.geolocation)) settingsPatch.geolocation = nextGeo;
          if (nextColor !== current.colorScheme) settingsPatch.colorScheme = nextColor;
          if (nextCookies !== current.cookies) settingsPatch.cookies = nextCookies || null;
          if (Object.keys(settingsPatch).length) await post(SETTINGS, settingsPatch);
          close();
          const fresh = await refreshStatus().catch(() => null);
          const unconfirmed = [];
          for (const [key, want] of Object.entries(settingsPatch)) {
            const got = fresh?.[key];
            const same = key === "viewport" ? want == null === (got == null) && (want == null || got?.width === want.width && got?.height === want.height) : key === "geolocation" ? want == null === (got == null) && (want == null || got?.latitude === want.latitude && got?.longitude === want.longitude) : String(want ?? "") === String(got ?? "");
            if (!same) unconfirmed.push(key);
          }
          showToast(unconfirmed.length ? `${copy.savedUnconfirmed} (${unconfirmed.join(", ")})` : copy.saved);
        });
      }
      refreshStatus().then((fresh) => {
        current = {
          userAgent: fresh?.userAgent ?? "",
          viewportWidth: fresh?.viewport?.width ? String(fresh.viewport.width) : "",
          viewportHeight: fresh?.viewport?.height ? String(fresh.viewport.height) : "",
          locale: fresh?.locale ?? "",
          geolocation: fresh?.geolocation ?? null,
          colorScheme: fresh?.colorScheme ?? "light",
          cookies: fresh?.cookies ?? ""
        };
        const ua = document.getElementById("nks-ua");
        if (ua) ua.value = current.userAgent;
        const localeInput = document.getElementById("nks-locale");
        if (localeInput) localeInput.value = current.locale;
        const lat = document.getElementById("nks-geo-lat");
        const lng = document.getElementById("nks-geo-lng");
        if (lat) lat.value = current.geolocation?.latitude ?? "";
        if (lng) lng.value = current.geolocation?.longitude ?? "";
        const cookies = document.getElementById("nks-cookies");
        if (cookies) cookies.value = current.cookies;
        const viewportChoice = ["1280", "768", "390"].includes(current.viewportWidth) ? current.viewportWidth : "default";
        selectRadio(document.getElementById("nks-viewport"), viewportChoice);
        selectRadio(document.getElementById("nks-color"), current.colorScheme);
      });
    }
    return h7(
      "section",
      {
        ref: workspaceRef,
        className: "nks-root",
        "data-nano-kitesurf": "1",
        "data-nks-workspace": "1"
      },
      h7(
        "form",
        { className: "nks-toolbar", onSubmit: onSubmitAddress },
        h7("button", {
          type: "button",
          className: "nks-tool nks-nav-toggle",
          "data-nks-nav-toggle": "1",
          "aria-pressed": navOpen ? "true" : "false",
          "aria-label": navOpen ? copy.navClose : copy.navOpen,
          title: navOpen ? copy.navCloseTitle : copy.navOpenTitle,
          onClick: () => setNavOpen((value) => !value)
        }, glyph("panel", navOpen), h7("span", null, copy.navToggleLabel)),
        // Navigation trio shares the host strip's 8px pitch with the
        // trailing cluster — one rhythm across the whole toolbar.
        h7(
          "div",
          { className: "nks-toolbar-nav" },
          h7("button", { type: "button", className: "nks-tool", "data-nks-back": "1", "aria-label": copy.back, title: copy.back, disabled: busy || !hasPage, onClick: () => run(() => historyNav(-1), { beat: true, dialog: true, nav: true }) }, glyph("back")),
          h7("button", { type: "button", className: "nks-tool", "data-nks-forward": "1", "aria-label": copy.forward, title: copy.forward, disabled: busy || !hasPage, onClick: () => run(() => historyNav(1), { beat: true, dialog: true, nav: true }) }, glyph("forward")),
          h7("button", { type: "button", className: "nks-tool", "data-nks-reload": "1", "aria-label": copy.refresh, title: copy.refresh, disabled: busy, onClick: onRefresh }, glyph("refresh"))
        ),
        h7(
          "span",
          { className: "nks-address-box", "data-address-short": copy.addressShort, "data-dirty": draftUrl ? "true" : "false", "data-loading": beat ? "true" : "false", "aria-busy": beat ? "true" : "false" },
          h7("input", {
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
          beat ? h7(
            "span",
            {
              className: "nks-address-beat",
              "data-nks-beat": "1",
              "data-nks-loading": "1",
              role: "status",
              "aria-label": engineNavigating ? copy.navigating : copy.opening,
              // N 秒是本地计时，「导航中」是引擎上报的 navigation.outcome。
              title: engineNavigating ? `${copy.navigating} \xB7 ${copy.opening} ${beatSec}s` : `${copy.opening} ${beatSec}s`
            },
            h7("i", { className: "nks-spin", "aria-hidden": true }),
            engineNavigating || beatSec > 0 ? h7("span", { "data-nks-beat-sec": String(beatSec) }, engineNavigating ? `${copy.navigating}${beatSec > 0 ? ` ${beatSec}s` : ""}` : `${beatSec}s`) : null
          ) : null,
          h7("button", { type: "submit", className: "nks-tool nks-go", "aria-label": copy.go, disabled: busy }, glyph("go"))
        ),
        // Trailing cluster mirrors the host's three icon buttons (分栏 /
        // 全屏 / 侧栏): same 28×28 seats at an 8px pitch, so each of ours
        // lands under its native counterpart instead of walking 4px apart.
        h7(
          "div",
          { className: "nks-toolbar-tail" },
          h7("button", { type: "button", className: "nks-tool", "data-nks-history-open": "1", "aria-label": copy.history, title: copy.history, disabled: busy, onClick: openHistory }, glyph("history")),
          h7("button", {
            type: "button",
            className: "nks-tool",
            "data-nks-annotate": "1",
            "aria-pressed": annotate ? "true" : "false",
            "aria-label": copy.annotate,
            title: copy.annotateTitle,
            onPointerDown: (event) => {
              event.preventDefault();
              event.stopPropagation();
              setAnnotate((value) => {
                if (value) {
                  setHover(null);
                  endDrag();
                }
                return !value;
              });
            }
          }, glyph("annotate")),
          h7("button", { type: "button", className: "nks-tool", "data-nks-settings": "1", "aria-label": copy.settings, title: copy.settings, onClick: openSettings }, glyph("settings"))
        )
      ),
      h7(
        "nav",
        {
          className: "nks-nav",
          "data-nks-nav": "1",
          "data-nks-nav-state": navOpen ? "open" : "closed",
          "aria-label": copy.navTabs
        },
        h7(
          "div",
          { className: "nks-nav-head" },
          h7("b", null, copy.navTabs)
        ),
        h7(
          "div",
          { className: "nks-nav-tabs", role: "list", "data-nks-nav-tabs": "1" },
          navTabs.length ? navTabs.map((row) => h7(
            "button",
            {
              type: "button",
              key: row.url,
              className: "nks-nav-tab",
              "data-nks-nav-tab": row.url,
              "data-current": row.url === pageUrl ? "true" : "false",
              title: row.url,
              onClick: () => {
                if (row.url !== pageUrl) openPage(row.url);
                setNavOpen(false);
              }
            },
            glyph("globe"),
            h7("span", { className: "nks-nav-tab-url" }, row.url.replace(/^https?:\/\//, "")),
            row.count > 1 ? h7("span", { className: "nks-nav-tab-count" }, `\xD7${row.count}`) : null,
            h7("span", {
              className: "nks-nav-tab-x",
              role: "button",
              "aria-label": copy.navCloseTab,
              "data-nks-nav-tab-del": row.url,
              onClick: (event) => {
                event.stopPropagation();
                delNavTab(row.url);
              }
            }, "\xD7")
          )) : h7("div", { className: "nks-nav-empty" }, copy.navEmpty)
        )
      ),
      h7(
        "div",
        { className: "nks-status", "data-nks-status": "1" },
        h7("button", { type: "button", "data-nks-native-toggle": "1", "aria-pressed": nativeHtml ? "true" : "false", title: copy.nativeHtmlTitle, onClick: () => {
          setNativeHtml((v) => !v);
          if (!nativeHtml) loadDom().catch(() => {
          });
        } }, "HTML"),
        h7("button", { type: "button", "data-nks-devtools-toggle": "1", "aria-pressed": devtoolsOpen ? "true" : "false", title: copy.devtoolsToggleTitle, onClick: () => setDevtoolsOpen((v) => !v) }, copy.devtools),
        h7("button", {
          type: "button",
          "data-nks-vp": "1",
          className: "nks-chip",
          title: copy.viewportTitle,
          onClick: (event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const apply2 = async (next) => {
              setVp(next);
              setVpCustom(false);
              try {
                await post(SETTINGS, { viewport: next });
              } catch {
              }
            };
            openNanoMenu2({
              anchor: { left: rect.left, top: rect.top, bottom: rect.bottom },
              // Rendered inside the pane (portal:false) so the list inherits the
              // workspace's scheme and stacking; no theme or z parameters.
              container: workspaceRef.current,
              direction: "up",
              maxHeight: 6 * 28 + 8,
              items: [
                { id: "fit", label: copy.viewportFit, run: () => apply2(null) },
                { id: "1280", label: "1280\xD7900", run: () => apply2({ width: 1280, height: 900 }) },
                { id: "768", label: "768\xD7900", run: () => apply2({ width: 768, height: 900 }) },
                { id: "390", label: "390\xD7844", run: () => apply2({ width: 390, height: 844 }) },
                { id: "custom", label: copy.viewportCustom, run: () => setVpCustom(true) }
              ]
            });
          }
        }, vp ? `${vp.width}\xD7${vp.height}` : copy.viewportFit),
        vpCustom ? h7("input", {
          "data-nks-vp-w": "1",
          type: "number",
          placeholder: copy.viewportWidthPh,
          className: "nks-vp-input",
          onKeyDown: async (e) => {
            if (e.key !== "Enter") return;
            const w = Number(e.currentTarget.value);
            if (w >= 240) {
              const next = { width: w, height: vp?.height || 900 };
              setVp(next);
              setVpCustom(false);
              try {
                await post(SETTINGS, { viewport: next });
              } catch {
              }
            }
          }
        }) : null,
        vpCustom ? h7("input", {
          "data-nks-vp-h": "1",
          type: "number",
          placeholder: copy.viewportHeightPh,
          className: "nks-vp-input",
          onKeyDown: async (e) => {
            if (e.key !== "Enter") return;
            const h8 = Number(e.currentTarget.value);
            if (h8 >= 240) {
              const next = { width: vp?.width || 1280, height: h8 };
              setVp(next);
              setVpCustom(false);
              try {
                await post(SETTINGS, { viewport: next });
              } catch {
              }
            }
          }
        }) : null,
        // Three states, not two: an empty pane is neither native HTML nor a
        // screenshot. Calling it "IMG 截图回退" made a fresh pane look broken.
        h7("span", {
          "data-nks-mode": nativeHtml && domDoc ? "html" : hasPage ? "img" : "empty",
          style: { color: nativeHtml && domDoc ? "var(--dsw-alias-state-success-primary)" : hasPage ? "var(--dsw-alias-state-warn-primary)" : "var(--dsw-alias-label-tertiary)" }
        }, nativeHtml && domDoc ? copy.modeHtml : hasPage ? copy.modeShot : copy.modeEmpty),
        h7("span", { style: { flex: "auto" } })
      ),
      h7(HistoryDialog, { open: historyOpen, onClose: () => setHistoryOpen(false) }),
      h7(DevTools, { copy, open: devtoolsOpen, onClose: () => setDevtoolsOpen(false) }),
      h7(
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
        pins.length || annotate && hasPage ? h7(
          "div",
          {
            className: "nks-float-top",
            "data-nks-float-top": "1",
            onPointerDown: (event) => event.stopPropagation(),
            onClick: (event) => event.stopPropagation()
          },
          pins.length ? h7(
            "div",
            { className: "nks-pins", "data-nks-pins": String(pins.length), "aria-live": "polite" },
            `${pins.length} ${copy.pinsCount}${pins.length === MAX_PINS ? copy.pinsFull : ""}`,
            h7("button", { type: "button", className: "nks-tool", "data-nks-undo-pin": "1", "aria-label": copy.undoPin, onClick: () => setPins((current) => current.slice(0, -1)) }, glyph("undo")),
            h7("button", { type: "button", className: "nks-tool", "data-nks-clear-pins": "1", "aria-label": copy.clearPins, onClick: () => setPins([]) }, glyph("clear")),
            h7("button", { type: "button", className: "nks-tool", "data-nks-send-all": "1", "aria-label": copy.sendAll, onClick: onSendAll }, glyph("send"))
          ) : null,
          annotate && hasPage ? h7(
            "div",
            { className: "nks-hint", "data-nks-hint": "1" },
            h7("span", { className: "nks-hint-text" }, copy.hintBar),
            h7("button", { type: "button", className: "nks-tool", "data-nks-exit-annotate": "1", "aria-label": copy.annotate, onClick: () => setAnnotate(false) }, glyph("exit"))
          ) : null
        ) : null,
        // Style row floats on the frame. It used to be an in-flow sibling with
        // order 0, so it landed above the page and pushed it down on every pick.
        pick?.elements?.[0] && pick.elements[0].style && Object.keys(pick.elements[0].style).length ? h7(
          "div",
          { className: "nks-inspector", "data-nks-inspector": "1" },
          h7("span", null, h7("b", null, pick.elements[0].selector || pick.elements[0].tag)),
          pick.elements[0].style.color ? h7("span", null, `color ${pick.elements[0].style.color}`) : null,
          pick.elements[0].style.fontSize ? h7("span", null, `font ${pick.elements[0].style.fontSize}`) : null,
          pick.elements[0].style.fontFamily ? h7("span", null, pick.elements[0].style.fontFamily.split(",")[0].replace(/["']/g, "")) : null,
          pick.elements[0].style.display ? h7("span", null, pick.elements[0].style.display) : null,
          pick.elements[0].box ? h7("span", null, `${Math.round(pick.elements[0].box.width)}\xD7${Math.round(pick.elements[0].box.height)}`) : null,
          Array.isArray(pick.elements[0].componentStack) && pick.elements[0].componentStack.length ? h7(
            "span",
            { "data-nks-stack": "1", title: pick.elements[0].componentStack.join(" \u2192 ") },
            `\u269B ${pick.elements[0].componentStack.slice(-3).join(" \u2192 ")}`
          ) : null
        ) : null,
        // last-good 画面叠加提示：导航/刷新失败但画面还是旧的，地址栏和
        // 画面不能各说各话。新导航/重截成功会自动撤掉。
        staleNav ? h7("div", {
          className: "nks-stale",
          "data-nks-stale": "1",
          role: "status",
          onPointerDown: (event) => event.stopPropagation(),
          onClick: (event) => event.stopPropagation()
        }, fill(copy.staleBanner, { url: shotMeta?.url || "" })) : null,
        // 引擎仍说自己在导航（/open 已超时返回）：超时≠取消，不能恢复成功态。
        !beat && engineNavigating ? h7("div", {
          className: "nks-stale",
          "data-nks-nav-busy": "1",
          role: "status",
          title: fill(copy.engineBusyTitle, { url: status?.navigation?.url || status?.navigation?.intent || "" })
        }, copy.engineBusy) : null,
        // srcdoc 是剥离脚本的静态投影，不是活页：角落标出来，别让人以为
        // 在里面点按钮会触发真实交互。
        nativeHtml && domDoc ? h7("span", {
          className: "nks-dom-tag",
          "data-nks-dom-tag": "1",
          title: copy.staticPreview
        }, copy.staticPreview) : null,
        nativeHtml && domDoc ? h7("iframe", {
          className: "nks-dom",
          title: "Kitesurf page",
          // No allow-scripts: the host already strips scripts/handlers/js: URLs,
          // and this is the second lock — a sanitizer miss must not become XSS
          // into the DSH host page. Picking is bound from the parent
          // (bindDomFrame → doc.addEventListener), which needs only same-origin.
          sandbox: "allow-same-origin",
          style: vp ? { width: `${vp.width}px`, height: `${vp.height}px`, flex: "none", display: "block", margin: "0 auto", background: "#fff" } : { width: "100%", height: "100%", display: "block", border: 0 },
          ref: (el) => {
            domFrameRef.current = el;
            if (el) writeDomFrame(el);
          }
        }) : hasPage ? h7("img", {
          alt: "",
          draggable: false,
          src: `data:${shotMime || "image/webp"};base64,${shot}`,
          style: { pointerEvents: annotate ? "none" : "auto" }
        }) : h7(
          "div",
          { className: "nks-empty", "data-nks-empty": "" },
          // /status always answers ok:true (the call completed); whether the
          // environment can serve a page is `ready` alone.
          // One container, one column: the old layout rendered an absolutely
          // positioned .nks-start on top of a flex-centred .nks-empty, which
          // painted the opaque Start button straight over the error text
          // ("引启动引擎答"). Everything below is a single vertical stack.
          h7("div", { className: "nks-empty-icon" }, glyph("annotate")),
          // The address-bar heartbeat already says "opening"; repeating it here
          // made the pane look like two stacked loading states.
          h7(
            "div",
            { className: "nks-empty-title" },
            status?.engineMismatch === true ? copy.engineMismatch : statusDown ? copy.errorTitle : copy.emptyTitle
          ),
          !busy && !statusDown && !status?.engineMismatch ? h7("div", { className: "nks-empty-body" }, copy.emptyBody) : null,
          !busy && statusDown && !status?.engineMismatch ? h7("div", { className: "nks-empty-body" }, copy.errorBody) : null,
          !busy && statusDown ? h7(
            "div",
            { className: "nks-empty-actions" },
            // Ordinary users get ONE button: it reconciles phase, adopts or
            // repairs the port, starts/resumes the container and polls health.
            h7("button", {
              type: "button",
              className: "nks-start-btn",
              "data-nks-start-engine": "1",
              "data-nks-prepare": "1",
              onClick: oneClickPrepare
            }, engine.phase === "running" ? copy.resumeEngine : copy.prepareEnv),
            h7("button", { type: "button", className: "nks-start-btn", "data-nks-diagnose": "1", onClick: () => run(() => refreshStatus()) }, copy.retry),
            h7("button", { type: "button", className: "nks-start-btn", "data-nks-open-settings": "1", onClick: openSettings }, copy.settings)
          ) : null,
          !busy && !statusDown && !status?.engineMismatch ? h7(
            "div",
            { className: "nks-empty-actions" },
            h7("button", { type: "button", className: "nks-empty-link", "data-nks-try": "1", onClick: () => {
              setDraftUrl("https://example.com");
              openPage("https://example.com");
            } }, copy.emptyTry)
          ) : null,
          statusDown ? h7("div", { className: "nks-empty-meta" }, `${status?.lastError?.errorId || status?.errorId || (status?.degraded?.length ? status.degraded.join(" / ") : "kitesurf.engine.failed")} \xB7 ${engine.httpBase || ""}`) : null,
          statusDown ? h7("div", { className: "nks-empty-meta" }, status?.lastError?.error || status?.error || "") : null
        ),
        overlays.map((box, index) => h7("div", {
          key: index,
          className: "nks-box",
          "data-nks-box": box.kind,
          "data-kind": box.kind === "ellipse" ? "ellipse" : box.kind === "hover" ? "hover" : void 0,
          style: { left: box.left, top: box.top, width: box.width, height: box.height }
        })),
        // Numbered pin dots stay over their shot until the shot changes; a
        // refreshed page clears them with the old pixels.
        frame ? pins.filter((pin) => pin.anchor && pin.shot === shot).map((pin, index) => h7("div", {
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
        pickAnchor && pick ? h7(
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
          pick.elements.length > 1 ? h7("span", { "data-nks-multi": String(pick.elements.length) }, `\xD7${pick.elements.length}`) : null,
          editing ? h7(
            "form",
            { className: "nks-note-form", onSubmit: onSend },
            h7("input", {
              "aria-label": copy.editAria,
              "data-nks-comment": "1",
              value: comment,
              placeholder: copy.editPlaceholder,
              autoFocus: true,
              onChange: (event) => setComment(event.target.value)
            }),
            h7("button", { type: "submit", className: "nks-tool", "data-nks-send": "1", "aria-label": copy.editSend }, glyph("edit"))
          ) : null,
          !editing ? composing ? h7(
            "form",
            { className: "nks-note-form", onSubmit: onSend },
            h7("input", {
              "aria-label": copy.noteAria,
              "data-nks-comment": "1",
              value: comment,
              placeholder: copy.notePlaceholder,
              autoFocus: true,
              onChange: (event) => setComment(event.target.value)
            }),
            h7("button", { type: "submit", className: "nks-tool", "data-nks-send": "1", title: copy.injectContext, "aria-label": copy.injectContext }, glyph("send")),
            h7("button", { type: "button", className: "nks-tool", "data-nks-clear-pick": "1", title: copy.clearSelection, "aria-label": copy.clearSelection, onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              clearPick();
            } }, glyph("exit"))
          ) : h7(
            "div",
            { className: "nks-note-actions" },
            h7("button", {
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
            h7("button", { type: "button", className: "nks-tool", "data-nks-copy-note": "1", title: copy.copyContext, "aria-label": copy.copyContext, onClick: copyNote }, glyph("copy")),
            h7("button", { type: "button", className: "nks-tool", "data-nks-compose": "1", title: copy.inputContext, "aria-label": copy.inputContext, onClick: () => setComposing(true) }, glyph("annotate")),
            h7("button", { type: "button", className: "nks-tool", "data-nks-clear-pick": "1", title: copy.clearSelection, "aria-label": copy.clearSelection, onClick: (event) => {
              event.stopPropagation();
              clearPick();
            } }, glyph("exit"))
          ) : null
        ) : null
      ),
      // HITL control bar (ego parity): floats at the bottom of the frame when
      // an agent holds the bridge writer lock or the human holds the override.
      // "停止写入" is honest wording — the pane cannot kill the agent's run
      // (that lives in the host), it can only hold its page writes.
      !beat && (control?.humanHold?.active || control?.writer) ? h7(
        "div",
        {
          className: "nks-hitl",
          "data-nks-hitl": "1",
          role: "status",
          onPointerDown: (event) => event.stopPropagation(),
          onClick: (event) => event.stopPropagation()
        },
        h7("span", {
          className: "nks-hitl-dot",
          "data-held": control?.humanHold?.active ? "true" : "false",
          "aria-hidden": true
        }),
        control?.humanHold?.active ? h7("span", { className: "nks-hitl-label" }, copy.hitlHeld) : h7("span", { className: "nks-hitl-label" }, copy.hitlAgent, h7("b", null, control?.owner || "agent")),
        control?.humanHold?.active ? h7("button", { type: "button", className: "nks-hitl-btn nks-hitl-primary", "data-nks-hitl-release": "1", onClick: () => controlOp("release") }, copy.hitlRelease) : h7("button", { type: "button", className: "nks-hitl-btn nks-hitl-primary", "data-nks-hitl-takeover": "1", title: copy.hitlTakeoverTitle, onClick: () => controlOp("takeover") }, copy.hitlTakeover)
      ) : null,
      // ego's "Clicking element" tooltip: brief tool-name flash on each new
      // agent action the bridge records.
      actionToast ? h7("div", {
        className: "nks-act",
        "data-nks-act": "1",
        role: "status",
        "data-ok": actionToast.ok === false ? "false" : "true"
      }, `${copy.hitlAction} ${actionToast.tool}`) : null,
      // One carrier for both toasts: the host Toast through nano-ui. A
      // recoverable failure adds its repair action to the same toast instead of
      // re-implementing the chrome.
      toast ? h7(NanoToast2, {
        text: toast,
        anchor: workspaceRef.current,
        actions: toastFix ? [{ label: copy.prepareEnv, onClick: repairNow }] : void 0
      }) : null,
      pick?.elements?.length ? h7("pre", {
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
    const copy = () => copyFor2(languageOf());
    const Pane = () => h7(BrowserPane, {
      copy: copy(),
      languageOf,
      theme: ctx.theme,
      onThemeChange: (listener) => ctx.on("theme/change", listener)
    });
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
/*! dsh-nano-ui@0.2.1 */
		return __kitesurfExport;
	}
});

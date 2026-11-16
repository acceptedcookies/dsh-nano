# dsh-nano-ui changelog

Spec: [`docs/specs/dsh-nano-ui/DESIGN.md`](../../docs/specs/dsh-nano-ui/DESIGN.md).

## 0.2.0

One hard cut: nano-ui wraps host primitives instead of redrawing them. No compatibility layer.

### Added

- `VERSION`; `NANO_STYLES` starts with `/* dsh-nano-ui@<version> */`, and `src/version.js` opens with the legal comment `/*! dsh-nano-ui@<version> */`, which minified consumer bundles keep verbatim, so `grep dsh-nano-ui@<version>` finds it.
- `NANO_LAYER` and `NANO_SPACE` (`src/layers.js`), emitted as `--nano-layer-*` and `--nano-space-1…6`. The only numeric layers in nano-ui.
- `createThemeScope({ theme, element, pin, subscribe })` and `resolveScheme({ pin, theme })`: writes `data-nano-scheme`; when `pin` differs from the host scheme, re-declares that scheme's `--dsw-*` values from `catalog/tokens.json`.
- `NanoWindowDialog`: a dialog inside its owner's container, joined to the host modal stack through `useModalLayer`.
- `icon(name)` (host `Icon*`) and `iconMarkup(glyph, weight, size)` (sprite `<svg><use>`), checked against the catalog.
- `Toolbar`, `EmptyState`, `FloatingWindow` + `useNanoWindow`, `IconButton` (required `aria-label`), `mountNano(el, Component, props)`.
- `openNanoDialog({ container })` and `openNanoMenu({ container })`: render inside the owner element.
- `catalog/` ships with the package (ThemeScope reads it at build time).
- `npm test` (`test/*.test.mjs`).

### Changed

- `NanoMenu` renders the host `Menu` (`items`/`onSelect`/`onClose`/`portal`/`getAnchorRect`); `direction: 'up'` maps to `side: 'top'`; `width` is a minimum, `maxHeight` picks a preset cap.
- `NanoToast` renders the host `Toast`: `{ text, anchor, tone, icon, actions, holdMs, onDone }`; empty `text` renders nothing; a new `text` remounts it.
- `NanoTabs` / `nanoTabs` render the host `SegmentedControl`; nano-ui only keeps panels mounted and toggles `hidden`. `nanoTabs` still returns `{ el, select, value }`.
- `NanoDialog`: `width` rounds up to a preset (380/480/560/720); `maxHeight` / `fixedHeight` size nano-ui's own body element.
- `openNanoDialog` has two carriers only: window overlay (with `container`) or host Modal.

### Removed

- `openNanoDialog` MutationObserver, its `region` / `theme` / `z` options, the `--nano-dlg-*` document properties and the returned `setTheme`; `NanoDialog`'s `region` prop.
- NanoMenu's self-drawn list, its keyboard and outside-press handling, its `theme` / `z` props, the `.nano-menu*` styles and the `NanoMenuItem` export.
- The self-drawn tab strip (`.nano-tab*` styles and its keyboard handling).
- The self-drawn `.nano-toast`.
- `[class*=…]` selectors into the host Modal and every hex color fallback in `var(--…, #hex)`.

## 0.1.0

- `NanoDialog`, `NanoMenu`, `NanoMenuItem`, `NanoToast`, `openNanoDialog`, `openNanoMenu`, `nanoTabs`, `NanoTabs`, `NANO_STYLES`.

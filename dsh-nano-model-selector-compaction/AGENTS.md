# dsh-nano-model-selector-compaction — install contract

Host-only companion bundle for `dsh-nano-model-selector`. Membership in
`dsh.profile.bundles` is the ON/OFF switch of the async-compaction takeover:
ON = this bundle's `cordis.patch.yml` layer is applied (our Provider row
replaces `compaction-basic` inside every agent preset's `id: compaction`
isolate group, via full `config.plugins` replay), OFF = layer removed, native
`compaction-basic` returns. The main `dsh-nano-model-selector` bundle stays
resident in both states.

Install with `dsh plugin --profile web add <spec>`: it writes this package
into BOTH `dependencies` and `dsh.profile.bundles`, then applies the patch.
A package that lands only in `dependencies` (no bundles row) is mounted as a
`--patch` launch overlay and bypasses the bundles switch — do not hand-edit
`package.json`; use the sanctioned add/remove path.

`engines.dsh >=0.2.2-rc.1 <0.3.0` pins the preset replay: upstream preset
`config.plugins` changes between releases require regenerating
`cordis.patch.yml` (see `scripts/gen-mutex-patch.mjs`).

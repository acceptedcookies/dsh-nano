# Async compaction takeover

Host-only companion for [dsh-nano-model-selector]. While enabled, the four agent presets (standard, ptc, minimal, cordis) mount the async-compaction engine in their `id:compaction` group and the factory `compaction-basic` row stays disabled. Turning it off removes the patch layer and native compaction returns. The model selector itself stays installed either way.

**Installed is not the same as takeover.** Seeing this package in the plugin list only means takeover is available. The switch lives in the model selector and should stay off until you turn it on.

## Where to manage it

Open the model selector from the composer. The async-compaction button sits between the search field and the close button. **It appears only while this plugin is installed**; otherwise the search field fills that slot. Catalog refresh lives inside the search field.

From that page you can:

- Toggle takeover (the only write path). The host may ask for a restart; the page says so.
- Pick the summary model (flash family). Each option marks provider, model name, and the anchored context window.
- Edit buffer line B, health line H, and async reserved tokens. Safety line S (0.90) is read-only. H may equal B, and B may equal S.
- H must stay below B, and B below S. A violating save is rejected and nothing is written.
- Read “how compaction behaves” across four scenarios (steady, at buffer, at safety, degraded). The copy interpolates the live water lines and model.

## What enabling changes

Below B nothing compresses. At B, older segments go to the summary model until fill falls back to H; the newest reserved tokens stay verbatim. If fill reaches S before async catches up, full compaction takes over. If the state file is unreadable or the meter is down, only S runs.

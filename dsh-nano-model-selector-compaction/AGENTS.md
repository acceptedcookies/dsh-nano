# dsh-nano-model-selector-compaction — install contract

Host-only companion bundle for `dsh-nano-model-selector`. Membership in
`dsh.profile.bundles` is the ON/OFF switch of the async-compaction takeover:
ON = this bundle's `cordis.patch.yml` layer is applied (our Provider row
replaces `compaction-basic` inside every agent preset's `id: compaction`
isolate group, via full `config.plugins` replay), OFF = layer removed, native
`compaction-basic` returns. The main `dsh-nano-model-selector` bundle stays
resident in both states.

Install with `dsh plugin --profile web add <spec>`: it writes this package
into BOTH `dependencies` and `dsh.profile.bundles`, then applies the patch —
so a fresh install is ON. The recommended default is OFF: after `add`, run
`set_bundle('dsh-nano-model-selector-compaction', false)` (or toggle from the
model selector's header button between search and close — shown only while
this bundle is installed — which calls the same sanctioned writer via
`POST /nano-model-selector/async-compact/switch`). A package that lands only
in `dependencies` (no bundles row) is mounted as a `--patch` launch overlay
and bypasses the bundles switch — do not hand-edit `package.json`; use the
sanctioned add/remove path.

`engines.dsh >=0.2.2-rc.1 <0.3.0` pins the preset replay: upstream preset
`config.plugins` changes between releases require regenerating
`cordis.patch.yml` (see `scripts/gen-mutex-patch.mjs`).

## Audit ledger (observability)

Every engine decision is appended as one JSON line to
`$DSH_HOME/plugins/nano-model-selector/async-history/<sessionId>.jsonl`
(`lib/async-history.js`). This bundle is the **only writer**; the main
`dsh-nano-model-selector` bundle only reads it and serves it as the additive
`history` field of `GET /nano-model-selector/async-compact?sessionId=<id>`.

The ledger is **derived telemetry, never an authority**: the durable truth for
one compaction remains the session journal's `compaction/start|summary|end`
bracket. It exists because an episode dropped before
`prepareCompactionTransaction` (no compactable range, unreadable policy, held
lock) leaves no durable trace at all, which made silent async failures
invisible. Records carry `at` + `kind`:

| kind | when | headline fields |
|---|---|---|
| `arm` | B line qualified and the episode armed | `fill`, `window`, `retain`, `orderOk` |
| `claim` | the summarizer attempt kicked at arm time | `retain`, `attempt`, `target` |
| `commit` | the durable bracket committed | `compactionId`, `tokens`, `records` |
| `drop` | the episode was dropped | `reason`, `detail`, `bracketed` |
| `skip` | arming was suppressed | `reason` (`circuit-open` / `lock-held`) |
| `drop` (`reason: 'disarmed'`) | the arming premise lapsed mid-flight: raised B, a bigger window, or a prune that pulled fill below B | `detail` (the fill/B pair that triggered it) |
| `drop` (`reason: 'preempted'`) | a synchronous lane (manual/FULL/model-switch/overflow) preempted the episode | `detail` (the lane name) |
| `drop` (`reason: 'timeout'`) | the 120 s attempt budget expired; settlement only, abort just discards the late result | `detail` |
| `skip` (`reason: 'lane-active'` / `'turn-blocked'` / `'no-window'`) | a lane owns the session / a non-transient drop debounced the rest of this turn / the routed model reports no context window | `fill`, `window` |

Policy changes take effect at the next `agent/pre-step`: `_policy()` re-reads
the state file on every call, so B and H apply to the very next step boundary.
Two things are deliberately frozen for the duration of one episode — the
effective pin (`retainTokens`) and the summarizer target — because they were
decided when the episode armed. Raising B above the current fill now **disarms**
an armed or in-flight episode (`drop` with `reason: 'disarmed'`); before that the
gate could only arm, so raising the line could not stop work already under way.
A synchronous lane (manual `/compact`, the S-line/FULL set, the model-switch
veto, or context-overflow recovery) preempts an in-flight episode first
(`drop` with `reason: 'preempted'`); neither `disarmed` nor `preempted` feeds
the transient-failure circuit — they are settlements, not failures.

Every record also carries `promptVersion`: the first eight hex characters of
the sha256 of the instruction actually sent (the built-in
`COMPACTION_INSTRUCTION` plus the fixed `Additional requirements:` paragraph
when `policy.extraRequirements` is non-empty). It is stamped inside the
summarize closure, where the prompt is read — not at arm time, which could name
a contract the request never used. The model name alone cannot
answer "which summarizer contract produced this summary?" — the same model
behaves differently under a user override, and an override edited between two
compactions is a different contract.

`bracketed:false` on a drop is the important signal: it means the journal has
no record of that failure either. Writes are best-effort (a telemetry failure
must never break compaction), the file rotates at 256 KiB, and session ids are
validated against `/^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/` so a ledger path can
never escape the directory.

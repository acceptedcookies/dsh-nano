# dsh-fx-spike-scaffold

Spike-only host plugin for `test/spike/notepad-wasm-fx`. Not a product plugin.

- `inject`: `webServer`, `connection`, `llm`, `attachments`, `credentials`
  - `attachments` (V-13): image_url → saveImage → ImageBlock
  - `credentials` (V-17/V-18): resolves `DSH_NSW_IDENTITY` for the s3 mini-client
- Routes:
  - `GET /nano-fx-spike/fx-core.wasm` — streams `lib/fx-core.wasm` as `application/wasm`
  - `GET /nano-fx-spike/models` — mirror of the model-selector catalog logic plus `provider~id` composite keys (OpenAI `models` payload shape)
  - `POST /nano-fx-spike/chat/completions` — `provider~model` → `ctx.llm.prepareCall(...).stream()`; emits raw `StreamChunk` JSON-lines as `text/event-stream`
  - `GET /nano-fx-spike/sdk/<file>` — serves `lib/fx/<basename>` (fx ESM + vendored sqlite3/pdfjs for V-15/V-16/V-19)
  - `POST /nano-fx-spike/s3` — `{op:put|get|del|list|getJson|putJson, key, body?, ifMatch?, ifNoneMatch?, value?, withMeta?, config?}` over `lib/spike-s3.js`. Default keys under `nano-fx-spike/` in `dasw-1112-shared` via `DSH_NSW_IDENTITY`; `config:{endpoint,region,bucket,prefix,token}` overrides to any scoped bucket (used to regress A5 CAS on notepad test bucket `dsh-nano-notepad-test` from `.env.s3` `S3_NOTEPAD_*`)
  - `POST /nano-fx-spike/claim` — `{op:acquire|renew|read|release, key, writerId, config?}` via `lib/spike-claim.js` (replica of shared-workspace claim semantics on run/artifact keys; V-18)
- Vendor copies in `lib/fx/` (git-ignored per `test/spike/notepad-wasm-fx/.gitignore`): `sqlite3.mjs`/`sqlite3.wasm`/`sqlite3-worker1.mjs`/`sqlite3-opfs-async-proxy.js`/`spike-sqlite-worker.mjs`/`opfs-worker-probe.js` (@sqlite.org/sqlite-wasm 3.54.1 + V-15 worker wrappers), `pdf.mjs`/`pdf.worker.mjs`/`sample.pdf` (pdfjs-dist 4.10.38).
- No UI. Remove with `dsh plugin --profile web remove dsh-fx-spike-scaffold` after the spike.

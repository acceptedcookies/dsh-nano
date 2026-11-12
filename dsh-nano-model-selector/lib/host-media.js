/** Media-generation engines: CLI detection, selection persistence, and the `imagine` skill body. */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/* ------------------------------------------------------------------ *
 * Imagine boundary (P3-07 / hunter-e:imagine-template-shell-injection)
 *
 * The rendered command runs in the SESSION AGENT's bash tool, not here —
 * the old skill body told the agent to literally replace {prompt}/{out}/
 * {cwd} inside double-quoted shell segments, so `"; rm -rf`, `$(...)`, or
 * backticks in any of them executed with the agent's tool authority (and
 * a `'`-containing value breaks a single-quoted context the same way, so
 * no quoting style can make text-substitution safe).
 *
 * The template below therefore carries NO placeholders: untrusted text
 * never becomes shell syntax again.
 *   - prompt and out-name travel as DATA in `imagine/.prompt.txt` /
 *     `imagine/.out.txt` and are read back with $(cat)/$(tr) — file bytes
 *     are never re-parsed as shell;
 *   - the out name is validated twice: here (validateImagineArgs) and
 *     inside the template by a `grep -Eq` gate that exits 64 BEFORE the
 *     CLI runs and before any credentials are copied — an injection
 *     attempt is a boundary violation, never silently sanitized;
 *   - `{cwd}` is gone: the template uses "$PWD" — the bash tool already
 *     runs at the workspace root — so there is nothing left to substitute;
 *   - isValidImagineCwd still guards the host-side boundary for callers
 *     that stage the files under a real path (imagineRun).
 * ------------------------------------------------------------------ */

/** Workspace-relative file the prompt text travels through. */
export const IMAGINE_PROMPT_FILE = 'imagine/.prompt.txt'
/** Workspace-relative file the generated-image name travels through. */
export const IMAGINE_OUT_FILE = 'imagine/.out.txt'

/**
 * Staging-channel .gitignore (review 7788 F3): imagine/ lives inside a USER
 * workspace — a repo-anchored `.gitignore` at the workspace root does not
 * cover a nested imagine/, so the grok template's `imagine/.grok` credential
 * copy and the `.prompt.txt`/`.out.txt` channel files would be swept by
 * `git add --all` into a repo. Written (once) at stage time so the secret +
 * channel files are never commit-eligible; generated images stay visible.
 */
export const IMAGINE_GITIGNORE = 'imagine/.gitignore'
const IMAGINE_GITIGNORE_BODY = [
  '# dsh-nano-model-selector — imagine staging channel (do not commit secrets)',
  '.grok/',
  '.prompt.txt',
  '.out.txt',
  '',
].join('\n')

/**
 * Single source for the `{out}` allowlist, shared by the JS validator and
 * the `grep -Eq` runtime gate in the command template (ERE in both).
 */
const OUT_ERE = 'imagine/[a-z0-9-]{1,64}\\.(png|jpg|jpeg|webp)'
export const IMAGINE_OUT_RE = new RegExp(`^${OUT_ERE}$`)

/**
 * `{cwd}` boundary rule: absolute POSIX path, no spaces, quotes, `$`, `\`,
 * or backticks (the characters that break a quoted shell argument), and no
 * `..` segments so staging cannot escape the workspace root.
 */
const CWD_RE = /^\/[A-Za-z0-9._/-]{1,1024}$/

/** @param {unknown} out @returns {boolean} */
export function isValidImagineOut(out) {
  return typeof out === 'string' && IMAGINE_OUT_RE.test(out)
}

/** @param {unknown} cwd @returns {boolean} */
export function isValidImagineCwd(cwd) {
  return typeof cwd === 'string' && CWD_RE.test(cwd) && !cwd.split('/').includes('..')
}

/**
 * Boundary validation for one imagine run. Rejects — never sanitizes —
 * with the `{ok:false, reason}` shape the route family uses for input
 * violations; an injection attempt is a boundary violation.
 * @param {{ prompt?: unknown, out?: unknown, cwd?: unknown }} [args]
 * @returns {{ ok: true } | { ok: false, reason: string, detail: string }}
 */
export function validateImagineArgs({ prompt, out, cwd } = {}) {
  if (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > 16384) {
    return { ok: false, reason: 'imagine-prompt', detail: 'prompt must be a non-empty string of at most 16384 characters' }
  }
  if (!isValidImagineOut(out)) {
    return { ok: false, reason: 'imagine-out', detail: `out must match ${OUT_ERE}` }
  }
  if (!isValidImagineCwd(cwd)) {
    return { ok: false, reason: 'imagine-cwd', detail: 'cwd must be an absolute path without spaces, quotes, $, `, \\, or .. segments' }
  }
  return { ok: true }
}

/**
 * Shared template prelude: read the out-name and prompt back as DATA and
 * fail closed before the CLI (and before credentials are copied) when the
 * staged files are missing or the out-name leaves the allowlist. Nothing
 * in the rendered command is substituted text — "$PWD" resolves at run
 * time inside the agent's own workspace shell.
 */
const IMAGINE_PREAMBLE =
  `OUT=$(tr -d '[:space:]' < "$PWD/${IMAGINE_OUT_FILE}" 2>/dev/null); ` +
  `printf '%s' "$OUT" | grep -Eq '^${OUT_ERE}$' || ` +
  `{ echo "imagine: ${IMAGINE_OUT_FILE} must contain a single ${OUT_ERE} line" >&2; exit 64; }; ` +
  `[ -s "$PWD/${IMAGINE_PROMPT_FILE}" ] || ` +
  `{ echo "imagine: write the user description to ${IMAGINE_PROMPT_FILE} first" >&2; exit 64; }; ` +
  `PROMPT=$(cat "$PWD/${IMAGINE_PROMPT_FILE}"); `

/** Candidate binaries probed for one engine, in priority order. */
const CANDIDATES = {
  grok: () => [
    join(homedir(), '.grok/bin/grok'),
    join(homedir(), '.local/bin/grok'),
  ],
  codex: () => [
    join(homedir(), '.codex/bin/codex'),
    join(homedir(), '.local/bin/codex'),
  ],
}

/** Extra directories prepended to PATH while probing with `which`. */
const EXTRA_PATH = [join(homedir(), '.grok/bin'), join(homedir(), '.local/bin')]

/** Static catalog entry for one media engine. */
const ENGINES = [
  {
    key: 'grok',
    label: 'Grok',
    detail: 'xAI Grok CLI — text-to-image via its built-in image tool',
    /** Cheap HTTPS endpoint the preflight pings before spending a generation call. */
    healthcheck: 'https://api.x.ai/',
    detect: () => firstBinary('grok', CANDIDATES.grok()),
    /**
     * Command template the agent runs VERBATIM at the workspace root; the
     * prompt and out name arrive as files (`imagine/.prompt.txt` /
     * `imagine/.out.txt`) so no user/agent text is substituted into shell
     * syntax (P3-07). Pointing GROK_HOME into the workspace keeps every
     * write (auth seed, sessions, bundled assets) inside the sandbox, so
     * the run never needs danger-full-access.
     */
    command: binary =>
      IMAGINE_PREAMBLE +
      `mkdir -p "$PWD/imagine/.grok" && ` +
      `cp -f "$HOME/.grok/auth.json" "$HOME/.grok/config.toml" "$PWD/imagine/.grok/" 2>/dev/null; ` +
      `GROK_HOME="$PWD/imagine/.grok" "${binary}" -p "$PROMPT. Save the image file to $OUT" --always-approve --cwd "$PWD"`,
  },
  {
    key: 'codex',
    label: 'Codex',
    detail: 'OpenAI Codex CLI — image generation (placeholder, binary not required yet)',
    healthcheck: 'https://api.openai.com/',
    detect: () => firstBinary('codex', CANDIDATES.codex()),
    command: binary => IMAGINE_PREAMBLE + `"${binary}" exec "$PROMPT. Save the image file to $OUT"`,
  },
]

/** @param {string} name @param {string[]} fallbacks @returns {string | null} */
function firstBinary(name, fallbacks) {
  for (const candidate of fallbacks) if (existsSync(candidate)) return candidate
  try {
    const env = { ...process.env, PATH: `${EXTRA_PATH.join(':')}:${process.env.PATH ?? ''}` }
    const found = execFileSync('/usr/bin/which', [name], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (found !== '' && existsSync(found)) return found
  } catch { /* not on PATH */ }
  return null
}

/**
 * Scan the system for every known engine and report availability.
 * @returns {{ engines: Array<{ key: string, label: string, detail: string, path: string | null, available: boolean }> }}
 */
export function scanEngines() {
  return {
    engines: ENGINES.map(engine => {
      const binary = engine.detect()
      return { key: engine.key, label: engine.label, detail: engine.detail, path: binary, available: binary !== null }
    }),
  }
}

/**
 * Read the persisted engine choice from the plugin's own state file.
 * @param {string} statePath - absolute path of `media-engine.json`.
 * @returns {string | null} the chosen engine key, or null when unset/stale.
 */
export function readEngine(statePath) {
  try {
    const value = JSON.parse(readFileSync(statePath, 'utf8'))
    return typeof value?.engine === 'string' && ENGINES.some(engine => engine.key === value.engine) ? value.engine : null
  } catch {
    return null
  }
}

/**
 * Persist the chosen engine.
 * @param {string} statePath - absolute path of `media-engine.json`.
 * @param {string} key - engine key validated by the caller.
 */
export function writeEngine(statePath, key) {
  mkdirSync(join(statePath, '..'), { recursive: true })
  writeFileSync(statePath, `${JSON.stringify({ engine: key, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
}

/**
 * Host-side boundary for one imagine run — the code equivalent of what the
 * skill body asks the session agent to do by hand: validate the inputs,
 * stage the prompt and out name as data files under `<cwd>/imagine/`, and
 * hand back the verbatim command to execute at `cwd`. Invalid input is
 * rejected with `{ok:false, reason}` before anything touches the
 * filesystem or the shell.
 * @param {string} engineKey
 * @param {{ prompt: string, out: string, cwd: string }} [args]
 * @param {{ binary?: string | null }} [deps] - test seam for the detected binary.
 * @returns {{ ok: true, engine: string, binary: string, command: string,
 *             files: { prompt: string, out: string } }
 *          | { ok: false, reason: string, detail: string }}
 */
export function imagineRun(engineKey, { prompt, out, cwd } = {}, deps = {}) {
  const engine = ENGINES.find(candidate => candidate.key === engineKey)
  if (engine === undefined) {
    return { ok: false, reason: 'imagine-engine', detail: `unknown engine '${engineKey}'` }
  }
  const check = validateImagineArgs({ prompt, out, cwd })
  if (!check.ok) return check
  const binary = deps.binary === undefined ? engine.detect() : deps.binary
  if (binary === null) {
    return { ok: false, reason: 'imagine-engine-missing', detail: `no ${engine.label} CLI detected on this host` }
  }
  const promptFile = join(cwd, IMAGINE_PROMPT_FILE)
  const outFile = join(cwd, IMAGINE_OUT_FILE)
  mkdirSync(join(promptFile, '..'), { recursive: true })
  /* Fence the staging channel from `git add --all` (review 7788 F3): drop a
   * .gitignore pinning the credential copy + prompt/out files out of any
   * repo the workspace may live in. Best-effort — a failed write never
   * blocks a generation, but when it succeeds the secrets stay out of git. */
  try {
    writeFileSync(join(cwd, IMAGINE_GITIGNORE), IMAGINE_GITIGNORE_BODY, 'utf8')
  } catch { /* non-fatal: a read-only workspace still generates */ }
  writeFileSync(promptFile, prompt, 'utf8')
  writeFileSync(outFile, `${out}\n`, 'utf8')
  return { ok: true, engine: engine.key, binary, command: engine.command(binary), files: { prompt: promptFile, out: outFile } }
}

/**
 * Render the `imagine` skill body for the chosen engine. The body is a static
 * instruction the agent follows verbatim, so the resolved binary path and the
 * command template are baked in at registration time.
 * @param {string} engineKey - selected engine key.
 * @returns {{ name: string, description: string, content: string } | null}
 */
export function imagineSkill(engineKey) {
  const engine = ENGINES.find(candidate => candidate.key === engineKey)
  if (engine === undefined) return null
  const binary = engine.detect()
  if (binary === null) return null
  const command = engine.command(binary)
  const content = [
    `Generate an image with the ${engine.label} CLI, then deliver the file into the workspace.`,
    '',
    '## Step 0 — connectivity preflight (fail fast, skip the whole flow when it fails)',
    `The ${engine.label} CLI talks to a remote API over HTTPS. Before spending a`,
    'sandbox approval on a generation command that may hang forever, check that',
    'the endpoint is reachable from this machine:',
    '',
    '   ```',
    `   curl -sS -o /dev/null -w '%{http_code}' --max-time 10 ${engine.healthcheck ?? engine.url ?? 'https://api.x.ai/'}`,
    '   ```',
    '',
    '- A 2xx/3xx/4xx response (any real HTTP code) means the network path is fine;',
    '  proceed to Step 1.',
    '- A timeout, `000`, or a `Couldn\'t connect` / `Connection timed out` error means',
    '  the endpoint is unreachable — **do not run the generation command**. Tell the',
    '  user the network to the image API is down (proxy/VPN off or DNS poisoned),',
    '  ask them to restore connectivity, and stop. Do not retry more than once.',
    '',
    '## Step 1 — stage the inputs as files (the command reads them as data)',
    `- Write the user's description VERBATIM to \`${IMAGINE_PROMPT_FILE}\` —`,
    '  every quote, `$`, or backtick included, unescaped. Create `imagine/`',
    '  first if your file tool does not create parent directories.',
    '  **Never paste the description into a command line** — the file carries',
    '  it safely, whatever it contains.',
    `- Pick a short kebab-case slug and write ONE line to \`${IMAGINE_OUT_FILE}\`:`,
    '  `imagine/<slug>.<ext>` where the slug is lowercase `[a-z0-9-]` (1–64',
    '  chars) and ext is `png`, `jpg`, `jpeg`, or `webp`. The command',
    '  re-validates this line at run time and refuses anything else.',
    '',
    '## Step 2 — generate (with a real timeout, never run it unbounded)',
    'Run the command template VERBATIM at the workspace root — it has NO',
    '   `{placeholder}` tokens to substitute; `$PWD` already resolves to the',
    '   workspace root where your shell runs. Wrap it in a 120-second timeout',
    '   so a hung CLI fails fast instead of idling forever (macOS has no',
    '   `timeout`; use `perl -e alarm` or a manual `kill` fallback):',
    '',
    '   ```',
    `   ${command}`,
    '   ```',
    '',
    `   The ${engine.label} CLI writes the image itself; \`--always-approve\` lets it run`,
    '   without a TTY.',
    '',
    '   The template pins `GROK_HOME` to `imagine/.grok` inside the workspace and seeds',
    '   it with the user\'s `~/.grok` credentials, so **no `danger-full-access` approval',
    '   is required** — all of the CLI\'s writes stay in the sandbox.',
    '',
    '   If the command exits `64` with an `imagine:` message, a staged file was',
    `   missing or malformed — fix \`${IMAGINE_PROMPT_FILE}\`/\`${IMAGINE_OUT_FILE}\` and`,
    '   re-run the template; do NOT hand-edit the command.',
    '',
    '   A healthy run takes tens of seconds. The **first** run in a workspace is slower',
    '   (~40–60s) because the CLI seeds its bundled agents/plugins into `imagine/.grok`;',
    '   later runs reuse that cache. If it is still running after ~120s with no file',
    '   written, kill it — that is the same hang the preflight should have caught;',
    '',
    '## Step 3 — verify or diagnose',
    '- Verify the file exists and is a non-empty image (`file`/`ls -l`).',
    '  If the CLI saved it elsewhere (e.g. an `images/` sub-directory), copy it into `imagine/`.',
    '- If the file did not appear:',
    '  - network hang (command timed out / killed) → report the preflight finding and stop;',
    '    do not loop.',
    '  - command exited 0 but no file → retry **once** with a simplified prompt; if it',
    '    still produces nothing, report the CLI output and stop.',
    '  - command exited non-zero → show its stderr and stop; do not guess.',
    `  - command exited 64 with an \`imagine:\` message → re-stage the two input files`,
    '    exactly as Step 1 specifies; do not retry the edited text.',
    '- On success, report the final workspace-relative path to the user.',
  ].join('\n')
  return {
    name: 'imagine',
    description: `Generate an image from a text prompt with the ${engine.label} CLI and save it to workspace/imagine/`,
    content,
  }
}

/**
 * Engine auto-pick for installs that never opened the Media tab: prefer grok,
 * otherwise the first detected binary. The pick is not persisted — an explicit
 * user selection still wins and is what `readEngine` reports.
 * @returns {string | null} an engine key whose binary exists, or null.
 */
export function defaultEngine() {
  const available = scanEngines().engines.filter(engine => engine.available)
  const preferred = available.find(engine => engine.key === 'grok') ?? available[0]
  return preferred?.key ?? null
}

/**
 * The skill when no usable engine exists yet. It stays user-invocable so typing
 * `/imagine` still surfaces actionable guidance instead of silently missing.
 * @returns {{ name: string, description: string, content: string }}
 */
export function imagineStub() {
  return {
    name: 'imagine',
    description: 'Generate an image — no media engine configured yet (pick one in the model selector Media tab)',
    content: [
      'The imagine skill cannot generate an image yet because no media engine is configured.',
      'Tell the user:',
      '1. Open the model selector and switch to the 媒体生成 / Media tab.',
      '2. Pick an engine marked as detected (for example Grok).',
      '   If every engine shows "not installed", the CLI binary is missing —',
      '   on macOS the Grok CLI lives at ~/.grok/bin/grok once installed.',
      '3. Re-run /imagine after a detected engine is selected.',
    ].join('\n'),
  }
}

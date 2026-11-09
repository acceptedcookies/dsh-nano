/** Media-generation engines: CLI detection, selection persistence, and the `imagine` skill body. */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

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
    /** Command template the agent runs; `{prompt}` and `{out}` are substituted by the skill body. */
    command: binary => `${binary} -p "{prompt}. Save the image file to {out}" --always-approve --cwd "{cwd}"`,
  },
  {
    key: 'codex',
    label: 'Codex',
    detail: 'OpenAI Codex CLI — image generation (placeholder, binary not required yet)',
    healthcheck: 'https://api.openai.com/',
    detect: () => firstBinary('codex', CANDIDATES.codex()),
    command: binary => `${binary} exec "{prompt}. Save the image file to {out}"`,
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
    '## Step 1 — prepare',
    '- Create the output directory once: `mkdir -p imagine` (relative to the workspace root).',
    '- Pick a short kebab-case file name from the user\'s description, e.g. `imagine/<slug>.jpg`.',
    '',
    '## Step 2 — generate (with a real timeout, never run it unbounded)',
    `Run the command template, replacing \`{prompt}\` with the user's description,`,
    '   `{out}` with the chosen `imagine/<slug>.jpg` path, and `{cwd}` with the workspace root.',
    '   Wrap it in a 120-second timeout so a hung CLI fails fast instead of idling',
    '   forever (macOS has no `timeout`; use `perl -e alarm` or a manual `kill` fallback):',
    '',
    '   ```',
    `   ${command}`,
    '   ```',
    '',
    `   The ${engine.label} CLI writes the image itself; \`--always-approve\` lets it run`,
    '   without a TTY. A healthy run takes tens of seconds. If it is still running',
    '   after ~120s with no file written, kill it — that is the same hang the',
    '   preflight should have caught; do not wait longer.',
    '',
    `   The ${engine.label} binary keeps its own session/config under ~/.grok (outside the`,
    '   workspace). Declare the need for wider file access when you run the command so the',
    '   sandbox escalation is a deliberate approval, not a mid-flight block.',
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

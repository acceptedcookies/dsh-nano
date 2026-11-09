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
    detect: () => firstBinary('grok', CANDIDATES.grok()),
    /** Command template the agent runs; `{prompt}` and `{out}` are substituted by the skill body. */
    command: binary => `${binary} -p "{prompt}. Save the image file to {out}" --always-approve --cwd "{cwd}"`,
  },
  {
    key: 'codex',
    label: 'Codex',
    detail: 'OpenAI Codex CLI — image generation (placeholder, binary not required yet)',
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
    'Steps:',
    '1. Create the output directory once: `mkdir -p imagine` (relative to the workspace root).',
    '2. Pick a short kebab-case file name from the user\'s description, e.g. `imagine/<slug>.jpg`.',
    `3. Run this exact command template, replacing \`{prompt}\` with the user's description,`,
    '   `{out}` with the chosen `imagine/<slug>.jpg` path, and `{cwd}` with the workspace root:',
    '',
    '   ```',
    `   ${command}`,
    '   ```',
    '',
    `   The ${engine.label} CLI writes the image itself; \`--always-approve\` lets it run`,
    '   without a TTY. It may take tens of seconds — do not interrupt it.',
    '',
    `   The ${engine.label} binary keeps its own session/config under ~/.grok (outside the`,
    '   workspace). Declare the need for wider file access when you run the command so the',
    '   sandbox escalation is a deliberate approval, not a mid-flight block.',
    '4. Verify the file exists and is a non-empty image (`file`/`ls -l`).',
    '   If the CLI saved it elsewhere (e.g. an `images/` sub-directory), copy it into `imagine/`.',
    '5. Report the final workspace-relative path to the user.',
  ].join('\n')
  return {
    name: 'imagine',
    description: `Generate an image from a text prompt with the ${engine.label} CLI and save it to workspace/imagine/`,
    content,
  }
}

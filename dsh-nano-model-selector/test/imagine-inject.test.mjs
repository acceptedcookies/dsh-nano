/**
 * P3-07 regression — imagine template shell injection
 * (fingerprint hunter-e:imagine-template-shell-injection).
 *
 * The audit PoC replayed literal {prompt}/{out}/{cwd} substitution into the
 * grok command template under `sh -c` and fired marker files with
 * `$(...)`/quote-breakout/backtick payloads. The hardened template carries
 * no placeholders at all: prompt + out-name are staged as data files
 * (`imagine/.prompt.txt` / `imagine/.out.txt`), the out-name is re-validated
 * by an in-command `grep -Eq` gate before the CLI or the creds `cp` run,
 * and `{cwd}` is replaced by `$PWD` (the agent bash tool already runs at
 * the workspace root). These tests execute the REAL rendered template with
 * a stub grok binary that echoes its argv to `argv.txt`.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, chmodSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  isValidImagineCwd, isValidImagineOut, validateImagineArgs, imagineRun,
  imagineSkill,
} from '../lib/host-media.js'

const FAKE_BIN = '/usr/local/bin/fake-grok' // never executed — validation-only tests

/** Workspace fixture: stub grok binary + staged prompt/out via the host boundary. */
function fixture({ prompt = 'a sunset over the ocean', out = 'imagine/ocean-sunset.jpg' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'p307-'))
  const ws = join(dir, 'ws')
  const mark = join(dir, 'markdir')
  const fake = join(dir, 'fakebin')
  mkdirSync(ws, { recursive: true })
  mkdirSync(mark, { recursive: true })
  writeFileSync(fake, '#!/bin/sh\nprintf "%s\\n" "$@" > "$PWD/imagine/argv.txt"\n', 'utf8')
  chmodSync(fake, 0o755)
  const staged = imagineRun('grok', { prompt, out, cwd: ws }, { binary: fake })
  assert.equal(staged.ok, true)
  return { ws, mark, fake, command: staged.command }
}

/** Run the rendered template verbatim at `ws` — the way the agent's bash tool does. */
function runTemplate(command, { ws, home, mark }) {
  return spawnSync('/bin/sh', ['-c', command], {
    cwd: ws,
    env: {
      PATH: '/usr/bin:/bin',
      HOME: home,
      MARKDIR: mark,
    },
    encoding: 'utf8',
    timeout: 20000,
  })
}

/* ------------------------------------------------------------------ *
 * Injection payloads — the PoC's `"; … "` / `$(…)` / backtick family.
 * ------------------------------------------------------------------ */

test('{prompt} payload is never inlined into the rendered command', () => {
  for (const payload of [
    'x"; touch "$MARKDIR/v_breakout"; echo "',
    'x$(touch "$MARKDIR/v_subst")',
    'x`touch "$MARKDIR/v_backtick`"',
    'a"; rm -rf "$HOME"; echo "',
    'line one\n"; touch "$MARKDIR/v_newline"; echo "',
  ]) {
    const staged = imagineRun('grok', { prompt: payload, out: 'imagine/x.jpg', cwd: '/tmp/x' }, { binary: FAKE_BIN })
    assert.equal(staged.ok, true)
    assert.equal(staged.command.includes(payload), false, 'payload must not appear in the command')
    assert.equal(staged.command.includes('{prompt}'), false)
    assert.equal(staged.command.includes('{out}'), false)
    assert.equal(staged.command.includes('{cwd}'), false)
  }
})

test('prompt payload executes nothing — it is data in imagine/.prompt.txt', () => {
  const home = mkdtempSync(join(tmpdir(), 'p307-home-'))
  mkdirSync(join(home, '.grok'), { recursive: true })
  writeFileSync(join(home, '.grok/auth.json'), 'FAKE', 'utf8')
  writeFileSync(join(home, '.grok/config.toml'), 'FAKE', 'utf8')

  const { ws, mark, command } = fixture({
    prompt: 'x"; touch "$MARKDIR/v_breakout"; echo " pic of $(touch "$MARKDIR/v_subst") and `touch "$MARKDIR/v_backtick"`',
  })
  const res = runTemplate(command, { ws, home, mark })
  assert.equal(res.status, 0, res.stderr)
  assert.equal(existsSync(join(mark, 'v_breakout')), false)
  assert.equal(existsSync(join(mark, 'v_subst')), false)
  assert.equal(existsSync(join(mark, 'v_backtick')), false)

  // The stub binary received the prompt VERBATIM — quotes, $(), backticks —
  // as data inside a single -p argument.
  const argv = readFileSync(join(ws, 'imagine/argv.txt'), 'utf8').split('\n')
  assert.equal(argv[0], '-p')
  assert.equal(argv[1].startsWith('x"; touch "$MARKDIR/v_breakout";'), true)
  assert.equal(argv[1].endsWith('. Save the image file to imagine/ocean-sunset.jpg'), true)
  assert.equal(argv[2], '--always-approve')
  assert.equal(argv[3], '--cwd')
  assert.equal(argv[4], realpathSync(ws)) // $PWD resolves physically (macOS /tmp symlink)
})

test('{out} / {cwd} injection shapes are rejected at the boundary, never sanitized', () => {
  const bad = [
    { prompt: 'ok', out: '../../etc/x', cwd: '/tmp' },
    { prompt: 'ok', out: 'imagine/x.png; rm -rf ~', cwd: '/tmp' },
    { prompt: 'ok', out: 'imagine/x.png$(whoami)', cwd: '/tmp' },
    { prompt: 'ok', out: 'imagine/../x.png', cwd: '/tmp' },
    { prompt: 'ok', out: 'x.png', cwd: '/tmp' },                      // outside imagine/
    { prompt: 'ok', out: 'imagine/x.PNG', cwd: '/tmp' },             // extension must be lowercase
    { prompt: 'ok', out: 'imagine/x.jpg', cwd: '/tmp"; rm -rf "' },  // quote breakout
    { prompt: 'ok', out: 'imagine/x.jpg', cwd: '$(touch /tmp/x)' },
    { prompt: 'ok', out: 'imagine/x.jpg', cwd: '/tmp/with space' },  // spaces rejected per charset
    { prompt: 'ok', out: 'imagine/x.jpg', cwd: 'relative/path' },    // must be absolute
    { prompt: 'ok', out: 'imagine/x.jpg', cwd: '/tmp/../etc' },      // .. segments rejected
    { prompt: '', out: 'imagine/x.jpg', cwd: '/tmp' },               // empty prompt
    { prompt: 'ok', out: 'imagine/x.jpg', cwd: '/tmp' },             // control: valid
  ]
  for (const args of bad.slice(0, -1)) {
    const r = imagineRun('grok', args, { binary: FAKE_BIN })
    assert.equal(r.ok, false, JSON.stringify(args))
    assert.equal(typeof r.reason, 'string')
    assert.equal(r.reason.startsWith('imagine-'), true)
  }
  assert.equal(imagineRun('grok', bad.at(-1), { binary: FAKE_BIN }).ok, true)

  assert.equal(isValidImagineOut('imagine/' + 'a'.repeat(65) + '.jpg'), false)
  assert.equal(isValidImagineOut('imagine/' + 'a'.repeat(64) + '.jpg'), true)
  assert.equal(isValidImagineOut('imagine/ok.webp'), true)
  assert.equal(isValidImagineCwd('/Users/seanz/Documents/ws'), true)
  assert.equal(isValidImagineCwd("/tmp/has'quote"), false)
  assert.equal(isValidImagineCwd('/tmp/has`tick`'), false)

  const v = validateImagineArgs({ prompt: 'ok', out: 'imagine/x.png; rm', cwd: '/tmp' })
  assert.equal(v.ok, false)
  assert.equal(v.reason, 'imagine-out')
})

test('forged imagine/.out.txt is rejected by the in-command gate before creds copy', () => {
  const home = mkdtempSync(join(tmpdir(), 'p307-home-'))
  mkdirSync(join(home, '.grok'), { recursive: true })
  writeFileSync(join(home, '.grok/auth.json'), 'FAKE', 'utf8')
  writeFileSync(join(home, '.grok/config.toml'), 'FAKE', 'utf8')

  for (const forged of [
    'imagine/x.png"; touch "$MARKDIR/v_out"; echo "',
    'imagine/x.png$(touch "$MARKDIR/v_out")',
    '../../etc/passwd',
    'imagine/x.png\n touch "$MARKDIR/v_out"',
    '',
  ]) {
    const { ws, mark, command } = fixture()
    writeFileSync(join(ws, 'imagine/.out.txt'), forged, 'utf8') // attacker/buggy write
    const res = runTemplate(command, { ws, home, mark })
    assert.notEqual(res.status, 0, `forged out ${JSON.stringify(forged)} must fail`)
    assert.equal(res.status, 64)
    assert.match(res.stderr, /imagine: imagine\/\.out\.txt/)
    assert.equal(existsSync(join(mark, 'v_out')), false)
    assert.equal(existsSync(join(ws, 'imagine/argv.txt')), false, 'CLI must not run')
    assert.equal(existsSync(join(ws, 'imagine/.grok/auth.json')), false, 'creds copied only after the gate')
  }
})

test('missing imagine/.prompt.txt fails closed instead of running with an empty prompt', () => {
  const home = mkdtempSync(join(tmpdir(), 'p307-home-'))
  const { ws, mark, command } = fixture()
  execFileSync('/bin/rm', [join(ws, 'imagine/.prompt.txt')])
  const res = runTemplate(command, { ws, home, mark })
  assert.equal(res.status, 64)
  assert.match(res.stderr, /imagine: write the user description/)
  assert.equal(existsSync(join(ws, 'imagine/argv.txt')), false)
})

/* ------------------------------------------------------------------ *
 * Happy path — a normal prompt produces the same argv contract as before.
 * ------------------------------------------------------------------ */

test('normal prompt still generates: argv contract unchanged, creds seeded', () => {
  const home = mkdtempSync(join(tmpdir(), 'p307-home-'))
  mkdirSync(join(home, '.grok'), { recursive: true })
  writeFileSync(join(home, '.grok/auth.json'), 'FAKE-AUTH', 'utf8')
  writeFileSync(join(home, '.grok/config.toml'), 'FAKE-CONF', 'utf8')

  const { ws, mark, command } = fixture({ prompt: 'a sunset over the ocean', out: 'imagine/ocean-sunset.jpg' })
  const res = runTemplate(command, { ws, home, mark })
  assert.equal(res.status, 0, res.stderr)

  const argv = readFileSync(join(ws, 'imagine/argv.txt'), 'utf8').split('\n')
  // Identical argv contract to the pre-fix template:
  //   -p "<prompt>. Save the image file to <out>" --always-approve --cwd <ws>
  assert.deepEqual(argv.slice(0, 4), [
    '-p',
    'a sunset over the ocean. Save the image file to imagine/ocean-sunset.jpg',
    '--always-approve',
    '--cwd',
  ])
  assert.equal(argv[4], realpathSync(ws)) // $PWD resolves physically (macOS /tmp symlink)

  // GROK_HOME stays inside the workspace; creds are seeded for the CLI.
  assert.equal(readFileSync(join(ws, 'imagine/.grok/auth.json'), 'utf8'), 'FAKE-AUTH')
  assert.equal(readFileSync(join(ws, 'imagine/.grok/config.toml'), 'utf8'), 'FAKE-CONF')
})

/* ------------------------------------------------------------------ *
 * Skill body — the shipped artifact the agent actually receives.
 * ------------------------------------------------------------------ */

test('imagineSkill body embeds the verbatim template and no placeholder contract', () => {
  const home = mkdtempSync(join(tmpdir(), 'p307-home-'))
  mkdirSync(join(home, '.grok/bin'), { recursive: true })
  writeFileSync(join(home, '.grok/bin/grok'), '#!/bin/sh\nexit 0\n', 'utf8')
  chmodSync(join(home, '.grok/bin/grok'), 0o755)
  const saved = process.env.HOME
  process.env.HOME = home
  try {
    const skill = imagineSkill('grok')
    assert.ok(skill)
    assert.equal(skill.content.includes('{prompt}'), false)
    assert.equal(skill.content.includes('{out}'), false)
    assert.equal(skill.content.includes('{cwd}'), false)
    assert.match(skill.content, /imagine\/\.prompt\.txt/)
    assert.match(skill.content, /imagine\/\.out\.txt/)
    assert.match(skill.content, /VERBATIM/)
  } finally {
    process.env.HOME = saved
  }
})

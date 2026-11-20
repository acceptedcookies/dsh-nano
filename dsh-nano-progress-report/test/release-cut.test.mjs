/** DNPR-T16/T17 — release-cut contract: version 0.2.0, engines.dsh unchanged,
 *  the v1 summary projection + tool-free host surface gone, and exactly one
 *  registered unit (the ledger). */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(join(dir, file), 'utf8')

test('version is 0.2.0 and engines.dsh stays >=0.2.2-rc.5 <0.3.0', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.version, '0.2.0')
  assert.equal(pkg.engines.dsh, '>=0.2.2-rc.5 <0.3.0')
})

test('exactly one session projection registers and its key is the ledger', () => {
  const host = read('src/host/index.js')
  const registrations = host.match(/sessionProjections\.register/g) ?? []
  assert.equal(registrations.length, 1, 'summary + ledger would publish two units')
  assert.match(read('src/host/ledger.js'), /LEDGER_KEY = 'nano-progress-report:ledger'/)
  assert.ok(!existsSync(join(dir, 'src/host/projection.js')), 'v1 summary projection must be deleted')
  assert.ok(!existsSync(join(dir, 'src/host/summary.js')), 'v1 summary formatter must be deleted')
})

test('one tools.register, the tool is read_progress', () => {
  const host = read('src/host/index.js')
  const registrations = host.match(/tools\.register/g) ?? []
  assert.equal(registrations.length, 1)
  assert.match(read('src/host/read-progress.js'), /READ_PROGRESS_NAME = 'read_progress'/)
})

test('baked artifacts exist and carry 0.2.0', () => {
  for (const file of ['lib/host.js', 'lib/client.js', 'lib/perf-declaration.js']) {
    assert.ok(existsSync(join(dir, file)), `${file} missing — run npm run build`)
    assert.ok(read(file).length > 0)
  }
  assert.match(read('lib/client.js'), /0\.2\.0/, 'lib/client.js stale — run npm run build')
})

test('task-times.js is gone; the panel never reads the todos face', () => {
  assert.ok(!existsSync(join(dir, 'src/client/task-times.js')), 'task-times.js must be deleted')
  const body = read('src/client/view/ProgressBody.jsx')
  assert.doesNotMatch(body, /faceOf\('todos'\)/)
  assert.match(body, /LEDGER_FACE_KEY/)
})

test('npm pack --dry-run packs lib artifacts, not src or test', () => {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: dir }).toString()
  const files = JSON.parse(out)[0].files.map(f => f.path)
  assert.ok(files.includes('lib/host.js') && files.includes('lib/client.js'))
  assert.ok(!files.some(f => f.startsWith('src/')), 'src must not ship')
  assert.ok(!files.some(f => f.startsWith('test/')), 'test must not ship')
})

test('same-cut docs: package AGENTS field table, spec supersession line, [FUS] pointer (DNPR-T16)', () => {
  const agents = read('AGENTS.md')
  assert.match(agents, /### `v1` 视图字段表/)
  for (const field of ['asOfSeq', 'inherited', 'unattributed', 'cumulative', 'items', 'files', 'failures', 'tasks', 'counts', 'truncated']) {
    assert.match(agents, new RegExp(`\\| \`${field}\` \\|`), `field table lacks ${field}`)
  }
  assert.match(agents, /\{content, status, firstSeq, completedSeq\?, completedAt\?\}/)
  for (const bound of ['≤ 16', '≤ 64', '≤ 32']) assert.ok(agents.includes(bound), `field table lacks bound ${bound}`)
  assert.match(agents, /`view` 取 `tasks`\/`jobs`\/`files`\/`failures`/)
  assert.doesNotMatch(agents, /Failures 行点击|task-times/)
  assert.match(agents, /token 与 KV 缓存/)
  const repo = join(dir, '..')
  const spec = readFileSync(join(repo, 'docs/specs/dsh-nano-progress-report/spec-v1.1.md'), 'utf8')
  assert.match(spec, /本文已被 \[`qna\/DNPR01-qna\.md`\]\(qna\/DNPR01-qna\.md\) §1 的 `T-O`.*取代，保留为形成史与证据索引；冲突以 `T-O` 为准/)
  const fus = readFileSync(join(repo, 'docs/specs/dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md'), 'utf8')
  assert.match(fus, /DNPR01.*`T-O-13`/)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { SKILL_BODIES, kitesurfSkill, nanoKiteSkill } from '../lib/skill.js'
import { ERROR_CATALOG } from '../lib/diagnostics.js'

const FRONTMATTER = {
  'kitesurf-cdp': 'Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.',
  'nano-kite': 'Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.',
}

test('generated SKILL.md files exactly match the single source of truth', () => {
  for (const [name, body] of Object.entries(SKILL_BODIES)) {
    const expected = `---\nname: ${name}\ndescription: ${FRONTMATTER[name]}\nuser-invocable: true\n---\n\n${body}\n`
    const actual = readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8')
    assert.equal(actual, expected, `${name}/SKILL.md drifted from lib/skill.js — run npm run build`)
  }
})

test('skill bodies are generated from ERROR_CATALOG (no hand-copied table)', () => {
  const rows = ERROR_CATALOG.map((r) => `| \`${r.example}\` | ${r.status} | ${r.cause} | ${r.next} |`)
  for (const row of rows) {
    assert.ok(SKILL_BODIES['kitesurf-cdp'].includes(row), `missing catalogue row: ${row.slice(0, 60)}`)
  }
})

test('skill bodies carry the hard agentic constraints', () => {
  const body = SKILL_BODIES['kitesurf-cdp']
  for (const phrase of [
    '同一个宿主进程状态', 'componentStack=null', 'kite-container', 'route-not-listed',
    'kitesurf_diagnostics', 'MUST end with', '事务性', 'buildId',
  ]) {
    assert.ok(body.includes(phrase), `missing constraint: ${phrase}`)
  }
  assert.ok(kitesurfSkill().content.includes('kitesurf_diagnostics'))
  assert.ok(nanoKiteSkill().content.includes('\\n'))
})

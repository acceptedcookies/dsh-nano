import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('T72: installation guide distinguishes managed identity, attach and unprovided workbench slot', () => {
  const guide = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8')
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
  assert.equal(pkg.version, '0.1.0')
  assert.equal(pkg.engines.dsh, '>=0.2.2-rc.1 <0.3.0')
  assert.doesNotMatch(guide, /按 session 复用或创建实例|终端 attach \| 只认返回的|浏览器入口 \| 无/)
  for (const fact of ['宿主依赖', 'dnls.control/1', 'sandboxId', 'term.session.create', '不发 URL', 'term.session.attach', 'dnt-ws-v2']) {
    assert.ok(guide.includes(fact), fact)
  }
})

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('T70: the session-only workbench reports a host dependency, not a successful open', () => {
  const url = new URL('../src/host/terminal-resource.js', import.meta.url).href
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import {managementAvailability,terminalGesture} from ${JSON.stringify(url)}
    const page = managementAvailability()
    let creates = 0
    const action = terminalGesture({envId:'dev',sandboxId:crypto.randomUUID(),openId:'open',paneId:'pane'},
      {canOpen:()=>page.available,create:()=>{creates++},navigate:()=>{throw Error('no session')}})
    console.log(JSON.stringify({...page,interaction:(await action.open()).state,creates}))
    process.exitCode = page.available ? 0 : 3
  `], { encoding: 'utf8', timeout: 10000 })
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  assert.equal(result.status, 3, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.creates, 0)
  assert.equal(report.interaction, 'handler-unavailable')
  assert.match(report.dependency, /宿主依赖/)
})

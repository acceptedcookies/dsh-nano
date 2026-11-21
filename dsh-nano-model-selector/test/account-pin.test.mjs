import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  assignPin, headersForCall, loadPins, magpieTargetFromSettings, parseAccountList,
  savePins, upstreamOf, utf8Header,
} from '../lib/account-pin.js'

const DEVIN = 'echo.l@example.test \u00b7 Haimang'

test('upstream is the model prefix, not the whole magpie provider', () => {
  assert.equal(upstreamOf('devin/swe-2'), 'devin')
  assert.equal(upstreamOf('workbuddy/hy4flash-free'), 'workbuddy')
  assert.equal(upstreamOf('swe-2'), null)
})

test('account list comes only from magpie refusal text', () => {
  const message = 'X-Magpie-Account: no account "x" serves this model; its accounts are ue工作小助理, Sean.Z, SeAn'
  assert.deepEqual(parseAccountList(message), ['ue工作小助理', 'Sean.Z', 'SeAn'])
  assert.equal(parseAccountList('something else'), null)
})

test('pinned session stamps both headers; an unpinned session stamps only the session', () => {
  const pins = { 'sess-a': { devin: DEVIN } }
  const pinned = headersForCall({ provider: 'magpie', model: 'devin/swe-2', sessionId: 'sess-a', pins })
  assert.equal(pinned['X-Magpie-Session'], 'sess-a')
  assert.equal(pinned['X-Magpie-Account'], utf8Header(DEVIN))
  assert.deepEqual([...Buffer.from(pinned['X-Magpie-Account'], 'latin1')], [...Buffer.from(DEVIN, 'utf8')])
  const fresh = headersForCall({ provider: 'magpie', model: 'devin/swe-2', sessionId: 'sess-b', pins })
  assert.equal(fresh['X-Magpie-Session'], 'sess-b')
  assert.equal(fresh['X-Magpie-Account'], undefined)
  assert.deepEqual(headersForCall({ provider: 'other', model: 'devin/swe-2', sessionId: 'sess-a', pins }), {})
})

test('a pin follows one session and one upstream, and clearing returns that session to default', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dnms-pin-'))
  const file = join(dir, 'account-pins.json')
  let pins = assignPin({}, 'sess-a', 'devin', DEVIN)
  pins = assignPin(pins, 'sess-a', 'workbuddy', 'Sean.Z')
  pins = assignPin(pins, 'sess-b', 'devin', 'other')
  savePins(file, pins)
  const loaded = loadPins(file)
  assert.equal(loaded['sess-a'].devin, DEVIN)
  assert.equal(loaded['sess-b'].devin, 'other')
  const cleared = assignPin(loaded, 'sess-a', 'devin', null)
  assert.equal(cleared['sess-a'].devin, undefined)
  assert.equal(cleared['sess-a'].workbuddy, 'Sean.Z')
  assert.equal(assignPin(cleared, 'sess-a', 'workbuddy', '')['sess-a'], undefined)
  assert.throws(() => assignPin({}, '../x', 'devin', 'a'), /invalid-session/)
  const raw = readFileSync(file, 'utf8')
  assert.equal(JSON.parse(raw).version, 1)
})

test('magpie baseURL is read from the magpie provider block only', () => {
  const text = [
    'llm-pi-ai:',
    '  providers:',
    '    magpie:',
    '      apiKeyEnv: MAGPIE_GATEWAY_KEY',
    '      baseURL: http://127.0.0.1:3425/v1',
    '    magpie-responses:',
    '      baseURL: http://127.0.0.1:9999/v1',
  ].join('\n')
  assert.deepEqual(magpieTargetFromSettings(text), {
    baseURL: 'http://127.0.0.1:3425/v1',
    apiKeyEnv: 'MAGPIE_GATEWAY_KEY',
  })
  assert.equal(magpieTargetFromSettings('    magpie:\n      baseURL: http://user:pass@127.0.0.1/v1'), null)
  const patch = [
    '- id: llm-pi-ai',
    '  config:',
    '    providers:',
    '      magpie:',
    '        apiKeyEnv: MAGPIE_GATEWAY_KEY',
    '        baseURL: http://127.0.0.1:3425/v1',
    '      magpie-responses:',
    '        baseURL: http://127.0.0.1:9999/v1',
  ].join('\n')
  assert.deepEqual(magpieTargetFromSettings(patch), {
    baseURL: 'http://127.0.0.1:3425/v1',
    apiKeyEnv: 'MAGPIE_GATEWAY_KEY',
  })
})

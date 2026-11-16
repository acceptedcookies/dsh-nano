/**
 * confirm.test.mjs — NUE-1117 Phase 8 irreversible-action contract for [DNCS].
 *
 * NUE1117-T24 threat model (AP §7.3): a stray click or a single Enter keypress
 * must not terminate a live Devin session or drop a credential profile whose
 * token can never be read back.
 *
 *   - terminate (`native-workbench.js`, upstream DELETE → session suspended)
 *     and profile removal (`settings-dialog.js`) go through the host
 *     `RiskConfirmation` acknowledgement; the shared gate is the react-free
 *     `mayTerminate({ acknowledged })` / `runTerminate(...)` in confirm.js.
 *   - archive is reversible upstream (unarchive exists) and therefore a
 *     `NanoDialog danger` with a plain cancel — cancelling sends no request.
 *
 * The gate is exercised as an attack vector: with `acknowledged: false` the
 * handler must run zero terminations, both for a click and for the Enter path.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

let gate
try {
  gate = await import(pathToFileURL(join(root, 'src', 'client', 'confirm.js')).href)
} catch (error) {
  throw new Error(`src/client/confirm.js must exist and stay react-free: ${error.message}`)
}
const { mayTerminate, runTerminate } = gate

const workbench = read('src/client/native-workbench.js')
const settings = read('src/client/settings-dialog.js')
const index = read('src/client/index.js')

test('T24: mayTerminate is false unless the acknowledgement box is checked', () => {
  assert.equal(typeof mayTerminate, 'function')
  assert.equal(mayTerminate({ acknowledged: false }), false)
  assert.equal(mayTerminate({}), false)
  assert.equal(mayTerminate(), false)
  assert.equal(mayTerminate({ acknowledged: 'yes' }), false, 'only a real boolean counts')
  assert.equal(mayTerminate({ acknowledged: true }), true)
})

test('T24 attack vector: an unacknowledged confirm runs zero terminations', async () => {
  let terminateCalls = 0
  const terminate = () => { terminateCalls += 1 }
  const ran = await runTerminate({ acknowledged: false, terminate })
  assert.equal(ran, false, 'the gate refuses the action')
  assert.equal(terminateCalls, 0, 'terminate was never called')
  assert.equal(await runTerminate({ acknowledged: true, terminate }), true)
  assert.equal(terminateCalls, 1, 'only the acknowledged path runs it')
  assert.equal(await runTerminate({ acknowledged: false }), false, 'a missing action cannot run')
})

test('T24 attack vector: the Enter path cannot step through either', async () => {
  let terminateCalls = 0
  const terminate = () => { terminateCalls += 1 }
  /* The host RiskConfirmation autofocuses the acknowledgement checkbox and keeps
   * the confirm button disabled until it is checked, so an Enter keypress either
   * toggles the box or lands on a disabled button. The only reachable handler is
   * the gated one below; there is no Enter/keyboard shortcut in this plugin. */
  const enterActivatesFocusedButton = () => runTerminate({ acknowledged: mayTerminate({ acknowledged: false }), terminate })
  assert.equal(await enterActivatesFocusedButton(), false)
  assert.equal(terminateCalls, 0, 'Enter with an unchecked box terminates nothing')
  for (const [name, text] of [['native-workbench.js', workbench], ['settings-dialog.js', settings]]) {
    assert.equal(/\bonKey(?:Down|Up|Press)\b|\bkeydown\b|\bkeyup\b/i.test(text), false, `${name} adds no keyboard confirm shortcut`)
  }
})

test('T24: terminate goes through RiskConfirmation and the gate', () => {
  assert.match(workbench, /RiskConfirmation/, 'the workbench renders the host acknowledgement dialog')
  assert.match(workbench, /runTerminate\(\{/, 'the confirm handler runs through the gate')
  assert.match(workbench, /acknowledged,/, 'the checkbox state is passed in')
  assert.match(workbench, /disabled: busy/, 'the confirm stays disabled while a request is in flight')
  assert.match(workbench, /const \[acknowledged, setAcknowledged\] = useState\(false\)/, 'the box starts unchecked')
  assert.match(workbench, /if \(!acknowledged\) return/, 'the handler itself refuses an unchecked box')
  assert.equal((workbench.match(/api\.terminate\(/g) ?? []).length, 1, 'one terminate call site')
  assert.ok(workbench.indexOf('runTerminate({') < workbench.indexOf('api.terminate('), 'the call sits inside the gated runner')
  assert.equal(/window\.confirm/.test(workbench), false, 'no legacy confirm')
})

test('T24: profile removal goes through RiskConfirmation and the gate', () => {
  assert.match(settings, /RiskConfirmation/, 'the settings dialog renders the host acknowledgement dialog')
  assert.match(settings, /mayTerminate\(\{ acknowledged \}\)/, 'the removal handler is gated')
  assert.equal((settings.match(/api\.config\('remove'/g) ?? []).length, 1, 'one removal call site')
  assert.match(settings, /onConfirm: \(\) => \{ void remove\(removeTarget\) \}/, 'removal only runs from the acknowledged dialog')
  assert.match(settings, /onCancel: \(\) => \{ setRemoveTarget\(null\); setAcknowledged\(false\) \}/, 'cancel only clears the dialog')
  assert.match(settings, /const \[removeTarget, setRemoveTarget\] = useState\(null\)/, 'the dialog opens from an explicit target')
  assert.equal(/window\.confirm/.test(settings), false, 'no legacy confirm')
})

test('T24: archive is a reversible NanoDialog danger and cancel sends nothing', () => {
  const start = index.indexOf('function ArchiveDialog')
  const end = index.indexOf('function CloudSessionRoot')
  assert.ok(start > 0 && end > start, 'ArchiveDialog is a discrete component')
  const dialog = index.slice(start, end)
  assert.match(dialog, /NanoDialog/)
  assert.match(dialog, /danger: true/, 'destructive styling for the archive confirm')
  assert.match(dialog, /onConfirm: \(\) => \{ void face\.archiveSession\(sessionId\) \}/, 'the request only fires on confirm')
  assert.match(dialog, /onCancel: onClose/, 'cancel closes without a request')
  assert.match(index, /onClose: face\.closeArchive/, 'the close handler is the state-only closeArchive')
  assert.match(index, /closeArchive: \(\) => store\.set\(\{ archiveTarget: null \}\)/, 'closing sends no request')
  assert.equal(/window\.confirm/.test(index), false, 'no legacy confirm')
})

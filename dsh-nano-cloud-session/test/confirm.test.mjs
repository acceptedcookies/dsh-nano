/**
 * confirm.test.mjs — NUE-1117 Phase 8 irreversible-action contract for [DNCS].
 *
 * NUE1117-T24 threat model (AP §7.3): a stray click or a single Enter keypress
 * must not terminate a live Devin session or drop a credential profile whose
 * token can never be read back.
 *
 *   - terminate lived in the workbench, which the 2026-11-19 owner ruling
 *     retired — there is no terminate UI left; profile removal
 *     (`settings-dialog.js`) still goes through the host
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
import { readFileSync, readdirSync } from 'node:fs'
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

/** Comment bodies are blanked so a commented-out guard cannot satisfy a text assertion. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

/** Every way the standard browser confirm can be reached. `RiskConfirmation` is a React
 *  component (capital C) and is not in this family; `onConfirm` is a prop name. */
const NATIVE_CONFIRM_PATTERNS = [
  ['a confirm( call (bare, window, globalThis, self …)', /(?<![\w$])confirm\s*\(/],
  ['a confirm property read (window.confirm, window?.confirm)', /\b(?:window|globalThis|self|document|top|parent|frames)\s*(?:\?\.|\.)\s*confirm\b/],
  ["a bracket read (window['confirm'])", /\[\s*(['"])confirm\1\s*\]/],
]

const clientSources = readdirSync(join(root, 'src', 'client'))
  .filter(name => /\.jsx?$/.test(name))
  .map(name => ({ name, text: read(join('src', 'client', name)) }))
const workbench = read('src/client/native-workbench.js')
const settings = read('src/client/settings-dialog.js')
const index = read('src/client/index.js')
const workbenchCode = stripComments(workbench)
const settingsCode = stripComments(settings)
const indexCode = stripComments(index)

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

test('T24 attack vector: no native confirm in any form, in any client source', () => {
  const hits = []
  for (const { name, text } of clientSources) {
    const code = stripComments(text)
    for (const [label, re] of NATIVE_CONFIRM_PATTERNS) if (re.test(code)) hits.push(`src/client/${name}: ${label}`)
  }
  assert.deepEqual(hits, [], 'a standard browser modal blocks headless/automated runs and is not the host RiskConfirmation')
  // Positive control: the fixture carries every spelling the scan claims to catch.
  const fixture = [
    'confirm("a")',
    "window.confirm('b')",
    "globalThis.confirm('c')",
    "window['confirm']('d')",
    "self.confirm('e')",
    "window?.confirm('f')",
  ].join('\n')
  for (const [label, re] of NATIVE_CONFIRM_PATTERNS) assert.ok(re.test(fixture), `fixture carries ${label}`)
  // Negative control: a commented-out guard is not a guard.
  assert.equal(stripComments('// if (!acknowledged) return').includes('acknowledged'), false)
})

test('T24 attack vector: the retired workbench exposes no terminate UI at all', () => {
  /* The workbench carried the only terminate dialog; it is now a tombstone.
   * The regression guard flips: the file must stay implementation-free — no
   * confirm handler, no terminate call site, no exports. */
  assert.equal(workbenchCode.includes('onConfirm'), false, 'tombstone must not regain a confirm handler')
  assert.equal(workbenchCode.includes('api.terminate'), false, 'tombstone must not regain a terminate call site')
  assert.equal(workbenchCode.includes('RiskConfirmation'), false, 'tombstone must not regain the dialog')
  assert.match(workbenchCode, /export\s*\{\s*\}/, 'the file stays an empty export tombstone')
})

test('T24: terminate reaches the wire only through the acknowledged gate', () => {
  /* Interaction boundary: the manage dialog's terminate step is a
   * RiskConfirmation whose confirm runs runTerminate({ acknowledged, … });
   * api.terminate has exactly one call site, inside runManage behind the
   * manageBusy single-fire guard, and no component may invoke it directly. */
  assert.equal((indexCode.match(/api\.terminate\(/g) ?? []).length, 1, 'one terminate call site')
  const runManage = indexCode.slice(indexCode.indexOf('runManage: async'), indexCode.indexOf('copy: () => t'))
  assert.match(runManage, /kind === 'terminate'\) await api\.terminate\(target\.sessionId, \{ profileId: pid \}\)/,
    'terminate carries the frozen profileId')
  assert.match(indexCode, /runTerminate\(\{ acknowledged, terminate: \(\) => face\.runManage\('terminate'\) \}\)/,
    'the confirm goes through the acknowledged gate')
  assert.match(indexCode, /mayTerminate|RiskConfirmation/, 'the acknowledgement component is rendered')
  const direct = clientSources.filter(({ name, text }) =>
    name !== 'api.js' && name !== 'index.js' && stripComments(text).includes('api.terminate('))
  assert.deepEqual(direct, [], 'no other client component may call api.terminate')
})

test('T24: profile removal goes through RiskConfirmation and the gate', () => {
  assert.match(settings, /RiskConfirmation/, 'the settings dialog renders the host acknowledgement dialog')
  assert.match(settingsCode, /mayTerminate\(\{ acknowledged \}\)/, 'the removal handler is gated')
  assert.equal((settings.match(/api\.config\('remove'/g) ?? []).length, 1, 'one removal call site')
  assert.match(settings, /onConfirm: \(\) => \{ void remove\(removeTarget\) \}/, 'removal only runs from the acknowledged dialog')
  assert.match(settings, /onCancel: \(\) => \{ setRemoveTarget\(null\); setAcknowledged\(false\) \}/, 'cancel only clears the dialog')
  assert.match(settings, /const \[removeTarget, setRemoveTarget\] = useState\(null\)/, 'the dialog opens from an explicit target')
})

test('T24: archive is a reversible NanoDialog danger and cancel sends nothing', () => {
  const start = index.indexOf('function ManageDialog')
  const end = index.indexOf('function CloudSessionRoot')
  assert.ok(start > 0 && end > start, 'ManageDialog is a discrete component')
  const dialog = index.slice(start, end)
  assert.match(dialog, /NanoDialog/)
  assert.match(dialog, /confirmStep\('archive', \{ danger: true \}\)/, 'archive is the destructive-styled step')
  assert.match(dialog, /onCancel: \(\) => setStep\('menu'\)/, 'cancel steps back without a request')
  /* runManage is the only writer: it reads the frozen target once, the busy
   * flag refuses a second attempt, and failure stays visible in the dialog. */
  const runManage = indexCode.slice(indexCode.indexOf('runManage: async'), indexCode.indexOf('copy: () => t'))
  assert.match(runManage, /if \(!target \|\| manageBusy \|\| !target\.profileId \|\| !target\.sessionId\) return/, 'frozen target + busy guard')
  assert.match(indexCode, /closeManage: \(\) => store\.set\(\{ manageTarget: null, manageError: '' \}\)/, 'closing sends no request')
})

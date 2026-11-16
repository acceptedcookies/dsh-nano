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

/** Source body of an `onConfirm: () => { … }` handler, braces balanced. */
function callbackBody(text, needle) {
  const at = text.indexOf(needle)
  assert.ok(at >= 0, `missing ${needle}`)
  const open = text.indexOf('{', at + needle.length - 1)
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth += 1
    else if (text[i] === '}') {
      depth -= 1
      if (depth === 0) return text.slice(open + 1, i)
    }
  }
  throw new Error(`unbalanced ${needle}`)
}

test('T24 attack vector: the real workbench onConfirm refuses an unchecked box', async () => {
  const body = callbackBody(workbenchCode, 'onConfirm: () =>')
  const handler = new Function('acknowledged', 'setConfirmTerminate', 'runTerminate', 'action', 'api', 'remoteId', body)
  let closes = 0
  let gateCalls = 0
  let terminates = 0
  let nativeConfirms = 0
  const nativeConfirm = globalThis.confirm
  globalThis.confirm = () => { nativeConfirms += 1; return true }
  try {
    handler(false, () => { closes += 1 }, () => { gateCalls += 1; return Promise.resolve(true) }, fn => fn(), { terminate: () => { terminates += 1 } }, 'remote-1')
    assert.equal(closes, 0, 'an unchecked box leaves the dialog open')
    assert.equal(gateCalls, 0, 'an unchecked box never reaches the gated runner')
    assert.equal(terminates, 0, 'an unchecked box terminates nothing')
    assert.equal(nativeConfirms, 0, 'no native confirm dialog is opened')

    handler(true, () => { closes += 1 }, runTerminate, fn => fn(), { terminate: () => { terminates += 1 } }, 'remote-1')
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(closes, 1, 'the acknowledged path closes the dialog')
    assert.equal(terminates, 1, 'the acknowledged path runs the termination once')
  } finally {
    if (nativeConfirm === undefined) delete globalThis.confirm
    else globalThis.confirm = nativeConfirm
  }
})

test('T24: terminate goes through RiskConfirmation and the gate', () => {
  assert.match(workbench, /RiskConfirmation/, 'the workbench renders the host acknowledgement dialog')
  assert.match(workbench, /runTerminate\(\{/, 'the confirm handler runs through the gate')
  assert.match(workbench, /acknowledged,/, 'the checkbox state is passed in')
  assert.match(workbench, /disabled: busy/, 'the confirm stays disabled while a request is in flight')
  assert.match(workbench, /const \[acknowledged, setAcknowledged\] = useState\(false\)/, 'the box starts unchecked')
  assert.match(workbenchCode, /if \(!acknowledged\) return/, 'the handler itself refuses an unchecked box (comment bodies excluded)')
  assert.equal((workbench.match(/api\.terminate\(/g) ?? []).length, 1, 'one terminate call site')
  assert.ok(workbench.indexOf('runTerminate({') < workbench.indexOf('api.terminate('), 'the call sits inside the gated runner')
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
  const start = index.indexOf('function ArchiveDialog')
  const end = index.indexOf('function CloudSessionRoot')
  assert.ok(start > 0 && end > start, 'ArchiveDialog is a discrete component')
  const dialog = index.slice(start, end)
  assert.match(dialog, /NanoDialog/)
  assert.match(dialog, /danger: true/, 'destructive styling for the archive confirm')
  assert.match(dialog, /onConfirm: \(\) => \{ void face\.archiveSession\(sessionId\) \}/, 'the request only fires on confirm')
  assert.match(dialog, /onCancel: onClose/, 'cancel closes without a request')
  assert.match(indexCode, /onClose: face\.closeArchive/, 'the close handler is the state-only closeArchive')
  assert.match(indexCode, /closeArchive: \(\) => store\.set\(\{ archiveTarget: null \}\)/, 'closing sends no request')
})

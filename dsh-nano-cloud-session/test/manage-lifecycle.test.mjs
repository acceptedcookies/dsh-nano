import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTerminate } from '../src/client/confirm.js'

/* Manage-seat lifecycle contract: the row button freezes
 * {profileId, sessionId, title, isArchived}; every write runs through
 * runManage once, always with the frozen profileId; cancels send nothing;
 * and the list filter is carried explicitly and re-checked on apply. */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => readFileSync(join(root, rel), 'utf8')
const index = read('src/client/index.js')
const section = read('src/client/section.js')
const runManage = index.slice(index.indexOf('runManage: async'), index.indexOf('copy: () => t'))
const askManage = index.slice(index.indexOf('askManage:'), index.indexOf('closeManage:'))
const dialog = index.slice(index.indexOf('function ManageDialog'), index.indexOf('function CloudSessionRoot'))

test('the frozen target pins sessionsProfileId — never the active profile at send time', () => {
  assert.match(askManage, /sessionsProfileId == null \? null/, 'no owning profile → the dialog refuses to open')
  assert.match(askManage, /profileId: store\.current\.sessionsProfileId/)
  assert.match(askManage, /sessionId: session\.session_id/)
  assert.match(askManage, /isArchived: session\.is_archived === true/)
  for (const kind of ["'sleep'", "'archive'", "'unarchive'", "'terminate'"]) {
    assert.match(runManage, new RegExp(`kind === ${kind.replace("'", "\\'")}`), `runManage handles ${kind}`)
  }
  assert.equal((runManage.match(/\{ profileId: pid \}/g) ?? []).length, 3, 'archive/unarchive/terminate carry the frozen profileId')
  assert.match(runManage, /session_id: target\.sessionId, profileId: pid/, 'sleep carries it too')
  assert.match(runManage, /!target\.profileId/, 'a missing frozen profile refuses the write')
})

test('one confirmation fires at most once; failure stays visible; success re-reads', () => {
  assert.match(runManage, /if \(!target \|\| manageBusy/, 'busy re-entry refused')
  assert.match(runManage, /store\.set\(\{ manageTarget: null \}\)\s*\n?\s*await refresh\(\)/, 'success closes and refreshes — no optimistic state')
  assert.match(runManage, /manageError: cause/, 'a failed write is shown, not swallowed')
  /* Cancel paths are pure state: the dialog body contains zero api calls. */
  assert.equal((dialog.match(/api\./g) ?? []).length, 0, 'the manage dialog itself never calls the API')
  assert.match(dialog, /onCancel: \(\) => setStep\('menu'\)/, 'step cancel returns to the menu')
  assert.match(index, /closeManage: \(\) => store\.set\(\{ manageTarget: null, manageError: '' \}\)/, 'closing sends no request')
})

test('a failed terminate stays visible inside the RiskConfirmation', () => {
  assert.match(dialog, /description: face\.current\.manageError/, 'the confirmation carries the failure')
  assert.match(dialog, /t\('manageFailed'\)/)
})

test('the four confirms exist with the right gate: sleep/archive/unarchive NanoDialog, terminate RiskConfirmation', () => {
  assert.match(dialog, /confirmStep\('sleep'\)/)
  assert.match(dialog, /confirmStep\('archive', \{ danger: true \}\)/)
  assert.match(dialog, /confirmStep\('unarchive'\)/)
  assert.match(dialog, /RiskConfirmation/)
  assert.match(dialog, /acknowledgeLabel: t\('terminateAcknowledge'\)/)
  assert.match(dialog, /onConfirm: \(\) => \{\s*void runTerminate/, 'terminate confirm runs the acknowledged gate')
  /* Terminate is never bundled with archive: the two steps are independent. */
  assert.match(dialog, /step === 'terminate'/, 'terminate has its own RiskConfirmation step')
  assert.match(dialog, /action\('terminate', true\)/, 'terminate is a separate menu entry')
  assert.match(dialog, /action\('archive', true\)/)
})

test('an unchecked terminate acknowledgement sends zero requests', async () => {
  let calls = 0
  const ran = await runTerminate({ acknowledged: false, terminate: () => { calls += 1 } })
  assert.equal(ran, false)
  assert.equal(calls, 0)
})

test('the row manage seat is the only row-level lifecycle entry', () => {
  assert.match(section, /face\.askManage\(session\)/)
  assert.match(section, /aria-label': copy\('manage'\)/)
  assert.equal((section.match(/api\./g) ?? []).length, 0, 'the section never calls the API directly')
  assert.equal(section.includes('askArchive'), false, 'the old archive shortcut is gone')
})

test('first page and loadMore carry the filter and reject stale/filter-mismatched replies', () => {
  assert.match(index, /is_archived: archived, isArchived: archived, profileId/, 'first page carries is_archived')
  const loadMore = index.slice(index.indexOf('loadMore: async'), index.indexOf('setSessionsFilter'))
  assert.match(loadMore, /is_archived: archived, isArchived: archived, profileId/, 'loadMore carries it too')
  assert.match(index, /sessionsFilter !== filter/, 'first page rechecks the filter')
  assert.match(loadMore, /sessionsFilter === filter/, 'loadMore rechecks it before applying')
  const setFilter = index.slice(index.indexOf('setSessionsFilter:'), index.indexOf('askManage:'))
  assert.match(setFilter, /listSeq \+= 1/, 'switching bumps the sequence so late replies drop')
  assert.match(setFilter, /sessions: \[\]/, 'switching clears rows immediately')
  assert.match(index, /item\?\.is_archived === true\) === archived/, 'the apply-side predicate keeps archived rows out of the active list and vice versa')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { api } from '../src/client/api.js'

/* Owner ruling (2026-11-19): clicking a cloud session row may only issue
 * native_open. No workspace_shell, no local-session adopt, no openTab, no
 * hand-drawn workbench — the host either maps the session to its own native
 * Chat or the row shows the localized unavailable notice. */

const indexSrc = readFileSync(new URL('../src/client/index.js', import.meta.url), 'utf8')

test('client openSession issues native_open then opens only the external id natively', () => {
  const body = indexSrc.slice(indexSrc.indexOf('openSession:'))
  const call = body.slice(0, body.indexOf('archive:'))
  assert.match(call, /api\.nativeOpen\(sessionId/)
  /* The sanctioned host seam: refresh the sessions list, then open exactly
   * the returned external-namespace id — verified as external: first. */
  assert.match(call, /externalId\.startsWith\('external:'\)/)
  assert.ok(call.indexOf('ctx.sessions.refresh()') < call.indexOf('ctx.uiWorkspace.openSession(externalId)'),
    'sessions.refresh must precede the native open')
  assert.match(call, /ctx\.uiWorkspace\.openSession\(externalId\)/)
  for (const forbidden of ['workspaceShell', 'workspace_shell', 'openCloudWorkbench',
    'registerNativeWorkbench', 'openTab', 'sidebarRight.', 'mounted']) {
    assert.equal(call.includes(forbidden), false, `client open path must not reference ${forbidden}`)
  }
})

test('client inject list declares the native sessions/uiWorkspace seam', () => {
  const inject = indexSrc.match(/export const inject = \[([^\]]*)\]/)[1]
  assert.equal(inject, `'slots', 'locale', 'sessions', 'uiWorkspace', 'sidebarRightTabs'`)
  /* The tab registry seam is admitted; the retired open-rightbar seam is not. */
  assert.equal(inject.includes(`'sidebarRight'`), false)
})

test('retired modules export nothing', async () => {
  for (const m of ['../src/client/open-sequence.js', '../src/client/native-workbench.js', '../src/client/providers/devin/details.js']) {
    const mod = await import(m)
    assert.deepEqual(Object.keys(mod), [], m)
  }
})

test('api.nativeOpen posts exactly the native_open op — no shell helper exists', async () => {
  const calls = []
  const prev = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    return { ok: true, status: 200, json: async () => ({ ok: true }) }
  }
  try {
    await api.nativeOpen('devin-abc', { profileId: 'prof-1' })
  } finally { globalThis.fetch = prev }
  assert.deepEqual(calls, [{ url: '/nano-cloud-session/session', body: { op: 'native_open', session_id: 'devin-abc', profileId: 'prof-1' } }])
  assert.equal(api.workspaceShell, undefined)
})

test('localized unavailable notice exists for a failed native open', async () => {
  const { makeI18n } = await import('../src/client/i18n.js')
  const zh = makeI18n(() => 'zh-CN')
  const en = makeI18n(() => 'en')
  assert.equal(zh('nativeUnavailable'), '当前宿主无法打开原生云会话；未切换到本地会话。')
  assert.match(en('nativeUnavailable'), /no local session/i)
})

test('built client bundle carries no workbench or shell plumbing', () => {
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const marker of ['devin-workbench', 'openCloudWorkbench', 'registerNativeWorkbench',
    'workspace_shell', 'sidebarRight.']) {
    assert.equal(bundle.includes(marker), false, `bundle still contains ${marker} — rebuild after source changes`)
  }
})

test('row open freezes the list-owning sessionsProfileId and refuses drift', () => {
  const sectionSrc = readFileSync(new URL('../src/client/section.js', import.meta.url), 'utf8')
  /* The click carries the profile that produced the list — not the active
   * profile at click time and not a provider default. */
  assert.match(sectionSrc, /face\.openSession\(session\.session_id, \{ profileId: sessionsProfileId \}\)/)
  const body = indexSrc.slice(indexSrc.indexOf('openSession:'))
  const call = body.slice(0, body.indexOf('archive:'))
  /* A missing frozen profile refuses before any request. */
  assert.match(call, /if \(profileId == null\)/)
  assert.ok(call.indexOf('if (profileId == null)') < call.indexOf('api.nativeOpen'))
  /* The route call forwards exactly the frozen profile. */
  assert.match(call, /api\.nativeOpen\(sessionId, \{ profileId \}\)/)
  /* A profile switch between click and response refuses the open — the
   * returned external id is never bound to the wrong org. */
  assert.match(call, /store\.current\.activeId !== profileId/)
  assert.ok(call.indexOf('api.nativeOpen') < call.indexOf('store.current.activeId !== profileId')
    && call.indexOf('store.current.activeId !== profileId') < call.indexOf('ctx.uiWorkspace.openSession'))
})

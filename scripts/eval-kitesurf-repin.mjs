#!/usr/bin/env node
/** Authenticated local integration experiment. Uses an existing dsh-dev host;
 * never launches a replacement server or writes credentials into reports. */
import https from 'node:https'
import { readFileSync, writeFileSync } from 'node:fs'
import { runLadder, formatLadder } from './eval-page-ladder.mjs'

const origin = process.env.REPIN_GUI || 'https://dsh-dev.local'
const logPath = process.env.REPIN_HOST_LOG
if (!logPath) throw new Error('REPIN_HOST_LOG must identify the running host log')
const token = [...readFileSync(logPath, 'utf8').matchAll(/token=([A-Za-z0-9_-]+)/g)].at(-1)?.[1]
if (!token) throw new Error('host log contains no authentication URL')
let cookie = ''
async function request(path, options = {}) {
  const target = new URL(path, origin)
  return new Promise((resolve, reject) => {
    const req = https.request(target, { rejectUnauthorized: false, method: options.method || 'GET', headers: {
      Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}),
    } }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }))
    })
    req.setTimeout(options.timeout || 90000, () => req.destroy(new Error(`deadline on ${path}`)))
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}
const auth = await request('/?token=' + token)
cookie = (auth.headers['set-cookie'] || []).map(value => value.split(';')[0]).join('; ')
if (!cookie) throw new Error('host authentication failed')
const page = { fetch: request }
const post = async (path, body) => {
  const r = await request('/nano-local-sandbox/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data = JSON.parse(r.body)
  if (r.status >= 400 || data.ok === false) throw new Error(`${path}: HTTP ${r.status} ${data.errorId || ''} ${data.error || ''}`)
  return data
}
const get = async path => JSON.parse((await request('/nano-local-sandbox/' + path)).body)
const rows = await runLadder(page, undefined, row => console.log(JSON.stringify(row)))
console.log(formatLadder(rows))
const checks = []
const mark = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(JSON.stringify(checks.at(-1))) }
const first = 'https://example.com/', second = 'https://www.iana.org/help/example-domains'
await post('open', { url: first }); await post('open', { url: second })
let history = await post('history', { delta: -1 })
mark('back across Page.navigate documents', history.moved && history.url === first, history)
history = await post('history', { delta: 1 })
mark('forward across Page.navigate documents', history.moved && history.url === second, history)
const list = await get('browse-history?q=iana&limit=1')
mark('history search/id/count projection', list.total > 0 && list.entries.length === 1 && !!list.entries[0].id && list.entries[0].count > 0, list.entries[0])
const removed = await request('/nano-local-sandbox/browse-history?id=' + encodeURIComponent(list.entries[0].id), { method: 'DELETE' })
const after = await get('browse-history?q=iana')
mark('driver history delete by id', removed.status === 200 && after.total === 0, after.total)
const original = await get('status')
const settings = await post('settings', { viewport: { width: 390 }, userAgent: 'Kitesurf-Repin-Adapter/1', media: 'screen', extraHeaders: { 'X-Repin-Probe': 'driver' } })
const shot = await post('shot', { format: 'png', fit: { width: 1000, height: 700 } })
mark('width-only fixed viewport survives fit', settings.viewport?.width === 390 && shot.viewport?.width === 390 && shot.viewport?.height === 900, shot.viewport)
await post('settings', { viewport: null })
const reset = await get('status')
const autoShot = await post('shot', { format: 'png' })
mark('auto viewport reset uses last fit', reset.viewport === null && autoShot.viewport?.width === 1000 && autoShot.viewport?.height === 700, { viewport: reset.viewport, rendered: autoShot.viewport })
await post('settings', { viewport: original.viewport || null, userAgent: original.userAgent || '', media: original.media ?? null, extraHeaders: original.extraHeaders || {} })
await post('open', { url: 'archy.studio' })
const final = await get('ports')
mark('final engine/DOM readiness', final.ready && final.planes?.dom?.state === 'ready', { generation: final.cdpGeneration, planes: final.planes })
const report = { pin: '39feadfb9a3e6c14b40cf170a559ce417d0fce5d', origin, rows, checks, recordedAt: new Date().toISOString() }
writeFileSync(process.env.REPIN_REPORT || '/tmp/kitesurf-repin-integration.json', JSON.stringify(report, null, 2))
if (rows.some(row => !row.ok) || checks.some(check => !check.ok)) process.exitCode = 1

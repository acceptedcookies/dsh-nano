/**
 * Optional live check. Not a release gate, and not part of `node --test test/*.test.mjs`.
 *
 * After `lib/client.js` is deployed to [dsh-dev]:
 *
 *   node dsh-nano-notepad/test/live/window-size.live.mjs
 *
 * Opens the notepad, writes a sub-560px panel size, toggles the file tree twice,
 * and checks the window stays that size. Restores the previous size afterwards.
 * Exits 0 without measuring when [dsh-dev] or ego-browser is absent.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function skip(reason) {
  console.log(`skip: ${reason}`)
  process.exit(0)
}

function findEgo() {
  const which = spawnSync('which', ['ego-browser'], { encoding: 'utf8' })
  const onPath = which.status === 0 ? which.stdout.trim() : ''
  if (onPath && existsSync(onPath)) return onPath
  const versions = '/Applications/ego lite.app/Contents/Frameworks/ego Framework.framework/Versions'
  if (!existsSync(versions)) return ''
  for (const version of readdirSync(versions)) {
    const candidate = join(versions, version, 'Helpers', 'ego-browser')
    if (existsSync(candidate)) return candidate
  }
  return ''
}

const probe = spawnSync('curl', ['-k', '-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '4', 'https://dsh-dev.local/'], { encoding: 'utf8' })
if (probe.status !== 0 || probe.stdout.trim() !== '302') skip(`[dsh-dev] did not answer (${probe.stdout.trim() || probe.stderr.trim() || 'no response'})`)

const ego = findEgo()
if (!ego) skip('ego-browser is not installed')

const header = spawnSync('curl', ['-k', '-s', '-D', '-', '-o', '/dev/null', '--max-time', '5', 'https://dsh-dev.local/'], { encoding: 'utf8' })
const token = header.stdout.split(/\r?\n/).find(line => line.toLowerCase().startsWith('location:'))?.split('token=')[1]?.trim()
if (!token) skip('[dsh-dev] did not return a token')

const script = `const task = await taskSpace('dnn-window-size')
const page = task.page('p1')
await page.cdp('Page.navigate', { url: 'https://dsh-dev.local/?token=${token}&_=' + Date.now() })
let ready = false
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1200)
  ready = await page.evaluate(() => !!document.querySelector('.np-entry')).catch(() => false)
  if (ready) break
}
if (!ready) {
  console.log(JSON.stringify({ ready: false }))
} else {
  const report = await page.evaluate(async () => {
    const openDb = () => new Promise((resolve, reject) => {
      const req = indexedDB.open('dsh-nano-notepad')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const db = await openDb()
    const readUi = () => new Promise(resolve => {
      const req = db.transaction('ui').objectStore('ui').get('ui')
      req.onsuccess = () => resolve(req.result ?? null)
    })
    const writeUi = (ui) => new Promise((resolve, reject) => {
      const tx = db.transaction('ui', 'readwrite')
      tx.objectStore('ui').put(ui)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    const saved = await readUi()
    if (!saved) { db.close(); return { ready: true, noUi: true } }
    const previous = { panelW: saved.panelW, panelH: saved.panelH }
    await writeUi({ ...saved, panelW: 400, panelH: 320 })
    db.close()
    return { ready: true, staged: true, previous }
  })
  if (!report?.staged) {
    console.log(JSON.stringify(report ?? { ready: false }))
  } else {
    await page.cdp('Page.reload', { ignoreCache: true })
    let back = false
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1200)
      back = await page.evaluate(() => !!document.querySelector('.np-entry')).catch(() => false)
      if (back) break
    }
    if (!back) {
      console.log(JSON.stringify({ ready: false, reason: 'notepad did not return after reload' }))
    } else {
    const measured = await page.evaluate(async () => {
      const q = (s) => document.querySelector(s)
      if (q('.np-window') && !q('.np-window').hidden) q('.np-entry')?.click()
      await new Promise(r => setTimeout(r, 250))
      q('.np-entry')?.click()
      await new Promise(r => setTimeout(r, 700))
      const win = q('.np-window')
      const snap = () => {
        const box = win.getBoundingClientRect()
        return {
          w: Math.round(box.width),
          h: Math.round(box.height),
          collapsed: q('.np-tree')?.dataset.collapsed ?? null,
        }
      }
      const opened = snap()
      q('.np-tree-toggle')?.click()
      await new Promise(r => setTimeout(r, 400))
      const toggled = snap()
      q('.np-tree-toggle')?.click()
      await new Promise(r => setTimeout(r, 400))
      const restored = snap()
      return { vw: innerWidth, vh: innerHeight, opened, toggled, restored }
    })
    /* A tree toggle persists the whole ui record, including the 400px probe.
       Wait that write out, put the owner's size back, then reload so the
       open page does not persist the probe again. */
    await page.waitForTimeout(800)
    const previous = JSON.stringify(report.previous)
    const putBack = ['(() => { const previous = ', previous, '; return new Promise((resolve, reject) => { const req = indexedDB.open("dsh-nano-notepad"); req.onerror = () => reject(req.error); req.onsuccess = () => { const db = req.result; const tx = db.transaction("ui", "readwrite"); const get = tx.objectStore("ui").get("ui"); get.onsuccess = () => tx.objectStore("ui").put({ ...get.result, panelW: previous.panelW, panelH: previous.panelH }); tx.oncomplete = () => { db.close(); resolve(true) }; tx.onerror = () => reject(tx.error) } }) })()'].join('')
    await page.cdp('Runtime.evaluate', { expression: putBack, awaitPromise: true })
    await page.cdp('Page.reload', { ignoreCache: true })
    console.log(JSON.stringify({ ready: true, ...measured }))
    }
  }
}
`

const dir = mkdtempSync(join(tmpdir(), 'dnn-window-size-'))
const file = join(dir, 'measure.mjs')
writeFileSync(file, script)
const run = spawnSync(ego, ['nodejs'], { input: readFileSync(file), encoding: 'utf8', timeout: 60000 })
rmSync(dir, { recursive: true, force: true })
/* ego-browser prints its result on stderr and exits 1 even when the
   measurement completed, so the JSON line is taken from either stream. */
const line = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim().split(/\n/).reverse().find(row => row.startsWith('{'))
if (!line && (run.error || run.status !== 0)) {
  console.error(run.stderr || run.stdout || run.error?.message || 'ego-browser failed')
  process.exit(1)
}
let result
try {
  result = JSON.parse(line ?? '')
} catch {
  console.error(run.stdout)
  console.error(run.stderr)
  process.exit(1)
}
if (result.ready !== true) {
  console.error(JSON.stringify(result))
  process.exit(1)
}
const samples = [result.opened, result.toggled, result.restored]
if (samples.some(sample => sample.w > 560 || sample.h > result.vh * 0.75)) {
  console.error(JSON.stringify(result))
  console.error('narrow window grew toward the viewport')
  process.exit(1)
}
const heights = samples.map(sample => sample.h)
if (Math.max(...heights) - Math.min(...heights) > 48) {
  console.error(JSON.stringify(result))
  console.error('toggling the file tree changed the window height')
  process.exit(1)
}
console.log(JSON.stringify(result))

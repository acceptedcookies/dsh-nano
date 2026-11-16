/**
 * Driver for the files-expand scenario. The runner imports this module inside
 * the browser-host Node process and calls it with page helpers.
 */
export default async function run({ safe, evalInPage, wait }) {
  await safe('openFiles', () => evalInPage(() => {
    const t = [...document.querySelectorAll('[data-dockkit-tab]')]
      .find(e => (e.textContent || '').trim().includes('文件'))
    if (t) { t.click(); return true }
    return false
  }))
  await wait(1800)
  await safe('expand3', () => evalInPage(() => {
    const root = document.querySelector('[data-nxe]')
    if (!root) return 0
    const rows = [...root.querySelectorAll('button')].filter(e => {
      const text = (e.textContent || '').trim()
      const cls = (e.className || '').toString()
      return text.length > 0 && /action/i.test(cls) && !/hidden/i.test(cls)
    })
    let n = 0
    for (const e of rows.slice(0, 3)) { e.click(); n += 1 }
    return n
  }))
  await wait(2500)
}

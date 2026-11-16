/** Driver for the notepad-type scenario. */
export default async function run({ page, safe, evalInPage, wait }) {
  await safe('shortcut', async () => {
    await page.keyboard.press('Meta+e')
    await wait(250)
    await page.keyboard.press('1')
    return 'meta+e then 1'
  })
  await wait(900)
  const focused = await safe('focusNotepad', () => evalInPage(() => {
    const e = document.querySelector('.np-layer textarea, [data-nano-notepad] textarea, textarea')
    if (!e) return false
    e.focus()
    return true
  }))
  if (focused) {
    await safe('type', () => page.keyboard.type(
      'Notepad performance scenario: a short note typed into the floating panel, then we wait for the debounce.',
      { delay: 60 }))
  }
  await wait(2000)
}

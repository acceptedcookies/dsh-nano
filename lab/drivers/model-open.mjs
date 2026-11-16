/** Driver for the model-open scenario. */
export default async function run({ page, safe, evalInPage, wait }) {
  await safe('openTrigger', () => evalInPage(() => {
    const e = document.querySelector('.nms-trigger')
    if (!e) return false
    e.click()
    return true
  }))
  await wait(900)
  await safe('typeSearch', () => page.keyboard.type('gpt', { delay: 90 }))
  await wait(600)
  await safe('close', () => page.keyboard.press('Escape'))
  await wait(600)
}

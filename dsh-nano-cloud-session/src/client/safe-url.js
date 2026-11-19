/** HTTPS-only, credential-free URLs for links the browser may open. */
export const safeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return null
    return url.href
  } catch {
    return null
  }
}

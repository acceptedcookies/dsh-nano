/**
 * The plugin's credential seam. Two references carry what the settings dialog
 * collects — the join credential (`{"username","token"}`) and, separately, the
 * public username so the section header can show it without touching secrets.
 *
 * `credentialRef` is a pure brand over a `^[A-Za-z][A-Za-z0-9_]{0,127}$`
 * name (`@deepseek-ai/dsh-credentials`), so the literal strings below are
 * already valid references at runtime; the package stays a dev-time type
 * source only, which keeps the shipped bundle dependency-free.
 *
 * The ref names double as ambient environment fallbacks (`resolve` reads the
 * provider store first, then `process.env`): `DSH_NSW_IDENTITY`,
 * `DSH_NSW_USERNAME`.
 */

export const IDENTITY_REF = 'DSH_NSW_IDENTITY'
export const USERNAME_REF = 'DSH_NSW_USERNAME'

/**
 * Read the stored identity `{username, token}`; a stored plain string is
 * tolerated and read as `{token}`.
 * @param ctx - host context.
 * @returns `{username, token}` plus `configured`, or `undefined` when absent.
 */
export async function readIdentity(ctx) {
  const credentials = ctx.get('credentials')
  if (credentials === undefined || credentials === null) return undefined
  const resolved = await credentials.resolve(IDENTITY_REF)
  if (resolved === undefined) return undefined
  const raw = resolved.value
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        username: typeof parsed.username === 'string' ? parsed.username : undefined,
        token: typeof parsed.token === 'string' && parsed.token !== '' ? parsed.token : undefined,
        accessKey: typeof parsed.accessKey === 'string' && parsed.accessKey !== '' ? parsed.accessKey : undefined,
        configured: true,
        source: resolved.source,
      }
    }
  } catch {
    // Legacy/plain-token form.
  }
  return { token: raw, configured: true, source: resolved.source }
}

/**
 * Persist the identity. The username is also stored under its own reference
 * so non-secret reads (header copy, identity claims later) skip JSON parsing.
 * @param ctx - host context.
 * @param next - `{username, token, accessKey}` — `token`/`accessKey` `undefined` keeps the stored value.
 */
export async function writeIdentity(ctx, next) {
  const credentials = ctx.get('credentials')
  if (credentials === undefined || credentials === null) {
    throw new Error('credentials service is unavailable')
  }
  const current = await readIdentity(ctx) ?? {}
  const record = {
    username: next.username ?? current.username,
    token: next.token ?? current.token,
    accessKey: next.accessKey ?? current.accessKey,
  }
  if (typeof record.username !== 'string' || record.username.trim() === '') {
    throw new Error('username is required')
  }
  const hasSecret = typeof record.token === 'string' && record.token !== ''
    || (typeof record.accessKey === 'string' && record.accessKey !== '')
  if (!hasSecret) throw new Error('a MinIO token (AK:SK or secret key) is required')
  await credentials.set(IDENTITY_REF, JSON.stringify(record))
  await credentials.set(USERNAME_REF, record.username.trim())
}

/**
 * Remove everything the dialog wrote.
 * @param ctx - host context.
 */
export async function clearIdentity(ctx) {
  const credentials = ctx.get('credentials')
  if (credentials === undefined || credentials === null) return
  await credentials.unset(IDENTITY_REF)
  await credentials.unset(USERNAME_REF)
}

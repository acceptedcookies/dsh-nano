/** Devin profile codec: token/org/baseURL rules, origin-secret binding.
 *  Old `carrier:'devin'` maps to providerKey `devin`; store is not dual-written. */

import { omitUndefined } from '../../contracts/codec-util.js'

export const PROVIDER_KEY = 'devin'
export const DEFAULT_BASE_URL = 'https://api.devin.ai'

export class ProfileCodecError extends Error {
  constructor(message, reason = 'invalid-request') {
    super(message)
    this.name = 'ProfileCodecError'
    this.reason = reason
    this.status = 422
  }
}

export function providerKeyOf(profile) {
  const carrier = profile?.carrier ?? profile?.providerKey
  if (carrier == null || carrier === '' || carrier === 'devin') return PROVIDER_KEY
  throw new ProfileCodecError(`unsupported provider ${carrier}`, 'invalid-request')
}

export function originOf(baseUrl) {
  let url
  try { url = new URL(String(baseUrl ?? '')) } catch {
    throw new ProfileCodecError('baseUrl must be a valid URL')
  }
  return url.origin
}

export function normalizeBaseUrl(value) {
  const raw = String(value ?? '').trim() || DEFAULT_BASE_URL
  let url
  try { url = new URL(raw) } catch { throw new ProfileCodecError('baseUrl must be a valid URL') }
  if (url.protocol !== 'https:') throw new ProfileCodecError('baseUrl must be https')
  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return (url.origin + url.pathname).replace(/\/+$/, '')
}

/** Map a public/save payload onto a durable profile snapshot. */
export function decodeProfileSave(input, { existing } = {}) {
  if (!input || typeof input !== 'object') throw new ProfileCodecError('profile must be an object')
  const label = String(input.label ?? '').trim()
  if (!label || label.length > 80) throw new ProfileCodecError('label is required (max 80 chars)')
  const orgId = String(input.orgId ?? '').trim()
  if (!/^org-[A-Za-z0-9-]*$/.test(orgId)) throw new ProfileCodecError('orgId must look like org-…')
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? existing?.baseUrl)
  const next = {
    id: existing?.id ?? (String(input.id ?? '').trim() || null),
    label,
    carrier: 'devin',
    providerKey: PROVIDER_KEY,
    orgId,
    baseUrl,
    secret: existing?.secret ?? '',
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }
  const originChanged = existing?.baseUrl ? originOf(existing.baseUrl) !== originOf(baseUrl) : false
  const secret = input.secret !== undefined ? String(input.secret) : null
  if (originChanged && (secret === null || secret === '')) {
    throw new ProfileCodecError('changing baseUrl origin requires rebinding the token')
  }
  if (secret !== null && secret !== '') {
    if (!/^cog_[A-Za-z0-9_-]{8,}$/.test(secret)) {
      throw new ProfileCodecError('token must look like cog_… (Devin PAT or service user key)')
    }
    next.secret = secret
  }
  if (!next.secret) throw new ProfileCodecError('token is required')
  return next
}

export function publicProfile(profile, activeId) {
  return omitUndefined({
    id: profile.id,
    label: profile.label,
    carrier: profile.carrier,
    providerKey: PROVIDER_KEY,
    orgId: profile.orgId,
    baseUrl: profile.baseUrl,
    hasSecret: Boolean(profile.secret),
    active: profile.id === activeId,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  })
}

/** Create-session body: keep explicit false/0/'', drop only undefined. */
export function encodeCreateSession(input) {
  if (!input || typeof input !== 'object') throw new ProfileCodecError('create body must be an object')
  if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
    throw new ProfileCodecError('prompt is required')
  }
  return omitUndefined({
    prompt: input.prompt,
    title: input.title,
    tags: input.tags,
    repos: input.repos,
    devin_mode: input.devinMode ?? input.devin_mode,
    max_acu_limit: input.maxAcuLimit ?? input.max_acu_limit,
    resumable: input.resumable,
    playbook_id: input.playbookId ?? input.playbook_id,
    knowledge_ids: input.knowledgeIds ?? input.knowledge_ids,
    attachment_urls: input.attachmentUrls ?? input.attachment_urls,
    structured_output_schema: input.structuredOutputSchema ?? input.structured_output_schema,
    structured_output_required: input.structuredOutputRequired ?? input.structured_output_required,
    platform: input.platform,
    bypass_approval: input.bypassApproval ?? input.bypass_approval,
    child_playbook_id: input.childPlaybookId ?? input.child_playbook_id,
    create_as_user_id: input.createAsUserId ?? input.create_as_user_id,
    memory_enabled: input.memoryEnabled ?? input.memory_enabled,
    secret_ids: input.secretIds ?? input.secret_ids,
    session_secrets: input.sessionSecrets ?? input.session_secrets,
    session_links: input.sessionLinks ?? input.session_links,
    security_profile: input.securityProfile ?? input.security_profile,
  })
}

export function decodeListFilter(body = {}) {
  const archived = body.isArchived ?? body.is_archived
  return omitUndefined({
    first: body.first,
    after: body.after,
    tags: body.tags,
    origins: body.origins,
    isArchived: archived,
    createdAfter: body.createdAfter ?? body.created_after,
    createdBefore: body.createdBefore ?? body.created_before,
    updatedAfter: body.updatedAfter ?? body.updated_after,
    updatedBefore: body.updatedBefore ?? body.updated_before,
    category: body.category,
    userIds: body.userIds ?? body.user_ids,
    repoNames: body.repoNames ?? body.repo_names,
    devinId: body.devinId ?? body.devin_id,
    sessionIds: body.sessionIds ?? body.session_ids,
    playbookId: body.playbookId ?? body.playbook_id,
    scheduleId: body.scheduleId ?? body.schedule_id,
    serviceUserIds: body.serviceUserIds ?? body.service_user_ids,
    automationIds: body.automationIds ?? body.automation_ids,
    parentSessionId: body.parentSessionId ?? body.parent_session_id,
  })
}

/** Devin → host ExternalSessionView: upstream messages become native wire
 *  events. No local session, no Agent, no fake turn/step/usage/ACU records —
 *  the only durable source is the carrier message log, projected verbatim.
 *
 *  Contract: every async operation honors the host's AbortSignal and settles;
 *  the host owns merged lifetime/revocation. */

import { setTimeout as wait } from 'node:timers/promises'
import { readMessagePages } from './chat.js'
import { CarrierError } from './api.js'
import { parseRemoteSessionId } from './session-id.js'

/** Hard cap on history pages: truncation is never reported as complete. */
const HISTORY_PAGE_CAP = 200
const FIRST = 100

/* Upstream `created_at` is epoch seconds; the wire clock is epoch ms. */
const toWireTime = (value, fallback = 0) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return fallback
  return seconds * 1000
}

const incomplete = (detail) => new CarrierError('history-incomplete', `native view cannot project this history (${detail})`)

const classifyOf = (message) => {
  const content = message?.content ?? message?.message
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const texts = content.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text)
    /* Any non-text block makes the row unprojectable — never silently
     * dropped and never rewritten into role text. */
    if (content.length !== texts.length) return null
    return texts.join('\n')
  }
  return null
}

const roleOf = (message) => {
  const role = message?.role ?? message?.type ?? message?.source
  if (role === 'user') return 'user'
  if (role === 'devin') return 'devin'
  return null
}

/** One upstream row → one normalized entry or an explicit failure: empty or
 *  unknown formats must never be skipped into a false transcript. */
function normalize(items) {
  const entries = []
  for (const message of items) {
    const role = roleOf(message)
    const eventId = message?.event_id
    if (role == null || eventId == null || eventId === '') {
      throw incomplete('row has no user|devin role or no event_id')
    }
    const text = classifyOf(message)
    /* Whitespace belongs to the message; trimming is validation only. */
    if (text == null || text.trim() === '') throw incomplete(`row ${eventId} has no projectable text`)
    entries.push({ id: String(eventId), role, text, time: toWireTime(message.created_at) })
  }
  const records = entries.map((entry, seq) => {
    const { id, role, text, time } = entry
    const event = role === 'user'
      ? {
        type: 'user/message', seq, time, surfaceOp: 'append',
        data: { id, role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } },
      }
      /* Display-only external event: no local turn, step, usage, or stream
       * exists to fabricate. `ignorable` keeps it out of durable consumers;
       * the host ui-chat owns its native assistant-step projection. */
      : {
        type: 'external/assistant-message', seq, time, ignorable: true,
        data: { id, text },
      }
    return { type: 'event', event }
  })
  return { entries, records }
}

const sameEntry = (a, b) => a.id === b.id && a.role === b.role && a.text === b.text && a.time === b.time

/**
 * Upstream `status` + `status_detail` projected to one honest phase. Every
 * case not named here is `unknown` — a real but unrecognized state must
 * never report working.
 * @param detail - carrier session detail; `{}` on a failed read.
 * @returns lifecycle phase for the non-durable status notification.
 */
export function phaseOf(detail = {}) {
  const status = detail.status
  const detailStatus = detail.status_detail
  if (status === 'new' || status === 'claimed' || status === 'resuming') return 'pending'
  if (status === 'running') {
    if (detailStatus === 'working') return 'working'
    if (detailStatus === 'finished') return 'completed'
    if (typeof detailStatus === 'string' && detailStatus.startsWith('waiting_')) return 'awaiting-input'
    return 'unknown'
  }
  if (status === 'suspended') return 'suspended'
  if (status === 'error') return 'failed'
  if (status === 'exit') return 'stopped'
  return 'unknown'
}

export function createDevinView({ api, profile, remoteId, id, detail = {}, pollIntervalMs = 5000 }) {
  if (!remoteId || !id) throw new CarrierError('invalid-request', 'native view requires a remote and external session id')
  const load = async (signal) => {
    const page = await readMessagePages(api, profile, remoteId, { first: FIRST, pages: HISTORY_PAGE_CAP, signal })
    /* The cap exists so truncation is loud: an incomplete source must never
     * open as a settled native transcript. */
    if (!page.complete) {
      const cause = page.cursorStuck ? 'cursor cycle' : (page.errors[0]?.message ?? 'page cap reached')
      throw incomplete(cause)
    }
    return normalize(page.items)
  }

  /* Live status follows upstream `status`/`status_detail`; the poll loop
   * refreshes it so a stale opening snapshot never claims liveness. Raw
   * fields stay verbatim for consumers that need them. */
  const live = {
    status: detail.status,
    statusDetail: detail.status_detail,
    get phase() { return phaseOf({ status: this.status, status_detail: this.statusDetail }) },
    updatedAt: toWireTime(detail.updated_at, Date.now()),
    title: typeof detail.title === 'string' && detail.title !== '' ? detail.title : remoteId,
  }
  const summary = {
    get updatedAt() { return live.updatedAt },
    /* Only a working phase counts as running: waiting/finished states never
     * surface a Stop affordance. */
    get running() { return live.phase === 'working' },
    blank: false,
    externalTabProviders: ['nano-cloud-session.attachments'],
    /* Sequenced title hint: asOfSeq -1 sits below every event cut so any
     * later projection (follow frame or rename) wins; the value itself is
     * the remote detail title, never the namespaced id. */
    get projections() { return { kind: 'sequenced', asOfSeq: -1, values: { title: live.title } } },
  }

  return {
    summary,

    async *follow(signal) {
      let state = await load(signal)
      const header = {
        version: 4,
        id,
        createdAt: toWireTime(detail.created_at, Date.now()),
        isSeeded: false,
      }
      const cursor = state.records.length - 1
      yield {
        type: 'snapshot',
        header,
        cursor,
        records: state.records,
        hasMore: false,
        projections: { asOfSeq: cursor, values: { title: live.title } },
        assistantStream: { revision: 0 },
      }
      /* Non-durable status frames: they consume no event seq, persist
       * nowhere, and go out on the opening frame and every phase change.
       * A failed detail read reports `unknown` — never a stale working. */
      yield { type: 'external-status', phase: live.phase }
      let reported = live.phase
      while (true) {
        await wait(pollIntervalMs, undefined, { signal })
        const detailNow = await api.getSession(profile, remoteId, { signal }).catch(() => null)
        if (detailNow) {
          live.status = detailNow.status
          live.statusDetail = detailNow.status_detail
          live.updatedAt = toWireTime(detailNow.updated_at, live.updatedAt)
          if (typeof detailNow.title === 'string' && detailNow.title !== '') live.title = detailNow.title
        } else {
          live.status = undefined
          live.statusDetail = undefined
        }
        if (live.phase !== reported) {
          reported = live.phase
          yield { type: 'external-status', phase: reported }
        }
        const fresh = await load(signal)
        /* Only a strict suffix may be appended: full row identity — id, role,
         * text, and time — must be equal through the old cursor, otherwise the
         * projection fails and reopens instead of splicing a wrong tail. */
        const prefixOk = state.entries.every((entry, i) => sameEntry(entry, fresh.entries[i]))
        if (!prefixOk) {
          throw new CarrierError('history-changed', 'upstream history changed; reopen the native view')
        }
        for (const record of fresh.records.slice(state.records.length)) yield record
        state = fresh
      }
    },

    async events(request = {}, signal) {
      const { records } = await load(signal)
      const through = request.throughSeq ?? records.length - 1
      const before = request.beforeSeq ?? records.length
      const window = records.filter(r => r.event.seq <= through && r.event.seq < before)
      const max = request.maxMessages
      const slice = Number.isInteger(max) && max > 0 && window.length > max ? window.slice(-max) : window
      return {
        records: slice,
        hasMore: slice.length < window.length,
        cursor: slice.length ? slice[slice.length - 1].event.seq : before - 1,
      }
    },

    async prompt(request = {}, signal) {
      const parts = request.content ?? []
      if (parts.some(part => part?.type !== 'text')) {
        throw new CarrierError('unsupported-content', 'external sessions accept text only')
      }
      /* Whitespace is message content: only the emptiness check trims. */
      const text = parts.map(part => part.text ?? '').join('')
      if (text.trim() === '') throw new CarrierError('invalid-request', 'prompt text is required', { status: 422 })
      /* The carrier answers with the SESSION, not an event id: validate the
       * returned identity against the bare upstream id and never guess an
       * rpcId or deduplicate by message text. The canonical user row arrives
       * through follow. */
      signal?.throwIfAborted()
      /* Dispatch ambiguity → outcome unknown, never an automatic retry and
       * never a false success. Once the call is handed to the carrier, an
       * abort, a network/5xx failure, or an unreadable or mismatched receipt
       * are all the same fact: the message may or may not have landed, so the
       * caller is told to check session history. Deterministic 4xx
       * rejections (403/422/429 and the other classified statuses) keep
       * their own reason — a real refusal, not ambiguity. Receipt data is
       * never echoed into the error. */
      let reply
      try {
        reply = await api.postMessage(profile, remoteId, text, { signal })
      } catch (cause) {
        if (cause instanceof CarrierError && cause.status >= 400 && cause.status < 500) throw cause
        throw new CarrierError('upstream-unknown', 'prompt outcome unknown, check session history before resending')
      }
      let matched = false
      try {
        const returned = reply?.session_id ?? reply?.id
        matched = returned != null && parseRemoteSessionId(returned).bare === remoteId
      } catch { /* unreadable receipt — same unknown outcome */ }
      if (!matched) {
        throw new CarrierError('upstream-unknown', 'prompt outcome unknown, check session history before resending')
      }
      return { accepted: true }
    },
  }
}

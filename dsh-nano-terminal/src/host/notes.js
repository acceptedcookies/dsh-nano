// Agent-to-agent notes (herdr notes.rs model).
// A child terminal delivers a note to its parent as a bracketed-paste envelope
// the parent's program can read:
//
//   <dnt from=<sender addr> id=<note-id>>
//   …note body…
//   </dnt>
//
// Delivery honors the gate as kind 'note': notesQuietMs of human silence AND
// no draft — a note never interrupts active typing. Multiple pending notes
// coalesce: a burst lands as one envelope per sender batch.

import { KIND, err } from './errors.js'

const MAX_NOTE = 32 * 1024
let noteSeq = 0

export function makeEnvelope(fromAddr, body, id = null) {
  const nid = id ?? `n${++noteSeq}`
  return `<dnt from=${fromAddr} id=${nid}>\n${body}\n</dnt>\n`
}

/**
 * Deliver a note from one record to another (usually child → parent).
 * `to` may be a record or an addr/name/id ref. Returns the note id.
 */
export async function sendNote(registry, fromRef, toRef, body) {
  if (!body?.trim()) throw err(KIND.INVALID, 'empty note')
  if (body.length > MAX_NOTE) throw err(KIND.INVALID, `note exceeds ${MAX_NOTE} bytes`)
  const to = registry.resolve(toRef)
  if (!to) throw err(KIND.NOT_FOUND, `no such terminal '${toRef}'`)
  if (to.exited) throw err(KIND.FINISHED, 'target exited')
  if (!to.handle) throw err(KIND.UNAVAILABLE, 'target not spawned (attach to wake)')
  const from = registry.resolve(fromRef)
  const fromAddr = from?.addr ?? String(fromRef ?? 'external')
  const env = makeEnvelope(fromAddr, body)
  // Same adaptive bracketed-paste rule as term.send.
  const paste = (to.mirror?.modes?.() ?? 0) & (1 << 3)
  const payload = `${paste ? '\x1b[200~' : ''}${env}${paste ? '\x1b[201~' : ''}`
  await to.gate.submit(() => to.handle.write(payload), { kind: 'note' })
  registry.bus?.emit('message', to.addr, { id: to.id, from: fromAddr, note: true })
  registry.audit?.({ op: 'note', from: fromAddr, to: to.addr, bytes: env.length })
  return env.match(/id=([^ >]+)/)?.[1] ?? `n${noteSeq}`
}

/** Parse all <dnt …> envelopes in a text blob. */
export function parseEnvelopes(text) {
  const out = []
  const re = /<dnt from=(\S+)(?:\s+id=(\S+))?>\n([\s\S]*?)\n<\/dnt>/g
  let m
  while ((m = re.exec(text))) {
    out.push({ from: m[1], id: m[2] ?? null, body: m[3] })
  }
  return out
}

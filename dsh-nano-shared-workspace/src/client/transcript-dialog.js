/**
 * Read-only remote transcript viewer: NanoDialog with projected message rows.
 * `face.onCloseTranscript` clears `store.transcript`.
 */

import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'

const { createElement } = React

/** One human-readable line per event the transcript view can project. */
function projectEvent(event) {
  const data = event?.data ?? {}
  if (event?.type === 'user/message') {
    const text = (data.content ?? []).filter(c => c?.type === 'text').map(c => c.text).join('\n')
    return { role: 'user', text }
  }
  if (event?.type === 'assistant/message') {
    const text = (data.message?.content ?? []).filter(c => c?.type === 'text').map(c => c.text).join('\n')
    const reasoning = (data.message?.content ?? []).filter(c => c?.type === 'reasoning').map(c => c.text).join('\n')
    return { role: 'assistant', text: [reasoning, text].filter(Boolean).join('\n\n') }
  }
  if (event?.type === 'tool/call') {
    return { role: 'tool', text: `${data.name ?? data.tool ?? 'tool'} ${JSON.stringify(data.input ?? data.args ?? {}).slice(0, 160)}` }
  }
  return null
}

export function TranscriptDialog({ face, transcript }) {
  const copy = face.copy()
  const events = transcript?.events ?? []
  const projected = events.map(projectEvent).filter(row => row !== null && row.text.trim() !== '')
  return createElement(NanoDialog, {
    copy,
    title: transcript?.meta?.title ?? copy.transcriptFallback,
    confirmLabel: copy.closeLabel ?? 'Close',
    onConfirm: face.onCloseTranscript,
    onCancel: face.onCloseTranscript,
  },
    createElement('div', { className: 'nsw-transcript-meta' },
      `${transcript?.meta?.writerName ?? '?'} · ${transcript?.meta?.mtime ?? ''} · ${events.length} events · ${transcript?.meta?.committedBytes ?? 0}B`),
    createElement('div', { className: 'nsw-transcript-body' },
      projected.length === 0
        ? createElement('p', { className: 'nsw-notice' }, copy.transcriptEmpty)
        : projected.map((row, index) => createElement('div', {
            key: index,
            className: `nsw-transcript-row nsw-role-${row.role}`,
          },
            createElement('span', { className: 'nsw-transcript-role' }, copy[`role_${row.role}`] ?? row.role),
            createElement('span', { className: 'nsw-transcript-text' }, row.text)))))
}

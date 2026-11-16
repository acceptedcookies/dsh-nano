/** Toast wrapper over the host `Toast` (DESIGN.md §7). The host portals it, times it with `holdMs`
 * and calls `onDone` at `holdMs + 1000ms`; it has no "stay until dismissed" mode. */
import React from 'react'
import { Toast } from '@deepseek-ai/dsh-client-ui-primitives'

const noop = () => {}

/**
 * @param {object} props
 * @param {string} [props.text] - empty or missing renders nothing; a new text remounts the toast.
 * @param {HTMLElement} [props.anchor] - element to centre on horizontally.
 * @param {'success'} [props.tone]
 * @param {React.ReactNode} [props.icon]
 * @param {Array<{ label: string, prefix?: string, onClick: () => void }>} [props.actions]
 * @param {number} [props.holdMs] - host default 3000.
 * @param {() => void} [props.onDone] - unmount the toast here.
 */
export function NanoToast({ text, anchor, tone, icon, actions, holdMs, onDone }) {
  if (text === undefined || text === null || text === '') return null
  return React.createElement(Toast, { key: String(text), text, anchor: anchor ?? undefined, tone, icon, actions, holdMs, onDone: onDone ?? noop })
}

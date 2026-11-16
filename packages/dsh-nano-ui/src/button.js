/** Icon-only host Button. Without text the accessible name is the only label, so it is required. */
import React from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * @param {object} props - host Button props plus:
 * @param {React.ReactNode} props.icon
 * @param {string} props['aria-label'] - required.
 */
export function IconButton({ icon, variant = 'ghost', size = 'sm', ...rest }) {
  const label = rest['aria-label']
  if (typeof label !== 'string' || label.trim() === '') throw new TypeError('dsh-nano-ui: IconButton needs an aria-label')
  return React.createElement(Button, { variant, size, icon, title: label, ...rest })
}

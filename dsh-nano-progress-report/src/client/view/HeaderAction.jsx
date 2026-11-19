/** Session-header action: open this session's Progress tab in the right
 *  workbench, keeping the conversation in view. Props: seat runtime
 *  (`sessionId`) + this plugin's inject `{ openProgress, t }`. */
import React from 'react'
import { Button, IconFlatListOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement: h } = React

export default function HeaderAction({ sessionId, openProgress, t }) {
  if (sessionId === undefined) return null
  const label = t('action.openProgress')
  return h(Tooltip, { label, delayMs: 500, portal: true, side: 'bottom' },
    h(Button, {
      variant: 'ghost',
      size: 'sm',
      'data-npr': 'header-action',
      'aria-label': label,
      icon: h(IconFlatListOutlineRegular, { size: 14 }),
      onClick: () => openProgress(sessionId),
    }))
}

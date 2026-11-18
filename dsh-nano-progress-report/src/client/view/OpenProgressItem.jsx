/** Tab-menu item: "open the Progress view for this session".
 *  Rendered inside the session-scoped menu; props come from the seat +
 *  this plugin's inject: { tab, dismiss, sessionId, ctx, t }. */
import React from 'react'
import { MenuItemButton, IconQueueOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { TAB_KIND } from '../constants.js'

const { createElement: h } = React

export default function OpenProgressItem(props) {
  const { tab, dismiss, sessionId, ctx, t } = props
  if (tab?.kind === TAB_KIND || sessionId === undefined) return null
  return h(MenuItemButton, {
    icon: h(IconQueueOutlineRegular, { size: 14 }),
    onSelect: () => {
      try { ctx.sidebarRight.openTabIn(sessionId, TAB_KIND) } catch { /* pane may be closed */ }
      dismiss()
    },
  }, t('menu.openProgress'))
}

/** The row menu this plugin owns, rendered through the shared NanoMenu skin.
 *
 * The shared `contextMenus` service gives each contribution a one-second deadline before it gives up
 * and reports a failure. The shipped opener provider needs a host round trip plus an application
 * probe, which on a large workspace regularly lands past that budget: the menu opened late and
 * announced an error for actions that had in fact resolved. Owning the popup keeps every row action
 * immediate and lets this page offer delete, which the shared menu has no concept of. `dsh-nano-ui`
 * supplies the skin and the key/click handling; this file only maps entries to actions.
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { NanoMenu } from 'dsh-nano-ui'

/**
 * Above the right-sidebar dock (layer 10) and its floating panes (layer 60).
 * The shell's own modals sit at 1000, so a menu never covers a dialog.
 * The popup is portaled to `document.body`: the sidebar host is
 * `transform` + `overflow: clip`, which traps a `position: fixed` menu
 * inside the files pane, and the pane beside it then paints over the list.
 */
const MENU_LAYER = 80

/**
 * One menu occurrence anchored to the viewport point that opened it.
 * @param props - open state, anchor, copy, the action set, and a close callback.
 * @returns the popup, or null while closed.
 */
export function RowMenu({ menu, actions, onClose }) {
  if (menu === null) return null
  const popup = React.createElement(NanoMenu, { menu, actions, onClose, z: MENU_LAYER })
  if (typeof document === 'undefined') return popup
  return createPortal(popup, document.body)
}

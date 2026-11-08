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
import { NanoMenu } from 'dsh-nano-ui'

/**
 * One menu occurrence anchored to the viewport point that opened it.
 * @param props - open state, anchor, copy, the action set, and a close callback.
 * @returns the popup, or null while closed.
 */
export function RowMenu({ menu, actions, onClose }) {
  return React.createElement(NanoMenu, { menu, actions, onClose })
}

/** Icon facades over DSH's official client primitives. */

import * as React from 'react'
import {
  IconBranchOutlineRegular,
  IconCheckOutlineRegular,
  IconChevronDownOutlineRegular,
  IconCloseOutlineRegular,
  IconDataOutlineRegular,
  IconDragHandleOutlineRegular,
  IconAppsAddOutlineRegular,
  IconPinFillRegular,
  IconPinOutlineRegular,
  IconRefreshOutlineRegular,
  IconSearchOutlineRegular,
  IconWarningTriangleOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** @param {{ className?: string, size?: number }} props */
export function GridIcon(props) {
  return <IconAppsAddOutlineRegular {...props} />
}

/** Favorites are shown as a pin: the DSH icon set has no star glyph. */
export function StarIcon({ filled = false, ...props }) {
  return filled ? <IconPinFillRegular {...props} /> : <IconPinOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function SearchIcon(props) {
  return <IconSearchOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function RefreshIcon(props) {
  return <IconRefreshOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function CloseIcon(props) {
  return <IconCloseOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function CheckIcon(props) {
  return <IconCheckOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function ChevronDownIcon(props) {
  return <IconChevronDownOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function ModelIcon(props) {
  return <IconDataOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function WarningIcon(props) {
  return <IconWarningTriangleOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function RouteIcon(props) {
  return <IconBranchOutlineRegular {...props} />
}

/** @param {{ className?: string, size?: number }} props */
export function DragHandleIcon(props) {
  return <IconDragHandleOutlineRegular {...props} />
}

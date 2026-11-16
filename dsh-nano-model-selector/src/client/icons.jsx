/** Icon facades over DSH's official client primitives. */

import * as React from 'react'
import {
  IconBranchOutlineRegular,
  IconCheckOutlineRegular,
  IconChevronDownOutlineRegular,
  IconCloseOutlineRegular,
  IconCompactOutlineRegular,
  IconDataOutlineRegular,
  IconDragHandleOutlineRegular,
  IconAppsAddOutlineRegular,
  IconPinFillRegular,
  IconPinOutlineRegular,
  IconRefreshOutlineRegular,
  IconSearchOutlineRegular,
  IconSparkleRegular,
  IconLayersOutlineRegular,
  IconClockOutlineRegular,
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

/** @param {{ className?: string, size?: number }} props */
export function MediaIcon(props) {
  return <IconSparkleRegular {...props} />
}

/**
 * Async-compaction icon: the official compact glyph. rc.1 primitives do not
 * export it, so fall back through the layered stack to the data-stack glyph
 * rather than rendering an undefined component and crashing the slot.
 */
export function CompactionIcon(props) {
  const Glyph = IconCompactOutlineRegular ?? IconLayersOutlineRegular ?? IconDataOutlineRegular
  return <Glyph {...props} />
}

/**
 * Session-header menu glyph for the async-compaction history dialog. A clock
 * reads as "history" in the shell's own icon language; compaction is already
 * represented by CompactionIcon inside the panel.
 */
export function HistoryIcon(props) {
  const Glyph = IconClockOutlineRegular ?? IconCompactOutlineRegular
  return <Glyph {...props} />
}

/**
 * Composer badge: one circle made of three nested arcs, each anchored at the
 * top and sweeping clockwise by its water line.
 * green = health line (H), yellow = buffer line (B), blue = pinned-async
 * share of the window (effectivePin / windowMin). Missing values read as a
 * half turn so the badge stays a circle before the first reading.
 * @param {{ size?: number, health?: number, buffer?: number, pinned?: number }} props
 */
export function WaterRingIcon({ size = 16, health, buffer, pinned }) {
  const arc = (radius, ratio) => {
    const sweep = Math.max(0.04, Math.min(0.98, Number.isFinite(ratio) ? ratio : 0.5)) * 2 * Math.PI
    const x = 12 + radius * Math.sin(sweep)
    const y = 12 - radius * Math.cos(sweep)
    return `M12 ${12 - radius} A ${radius} ${radius} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)}`
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path className="nms-ring nms-ring-buffer" d={arc(9, buffer)} />
      <path className="nms-ring nms-ring-health" d={arc(6.1, health)} />
      <path className="nms-ring nms-ring-pinned" d={arc(3.2, pinned)} />
    </svg>
  )
}

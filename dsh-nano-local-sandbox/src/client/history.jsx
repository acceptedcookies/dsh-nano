/**
 * Minute history as a broken polyline.
 * nano-ui-exempt: 宿主与 nano-ui 没有可保留分钟缺样、且不把缺样画成零的历史折线。
 */
import React from 'react'

const h = React.createElement

function segments(points) {
  const deltas = []
  for (let i = 1; i < points.length; i++) deltas.push(points[i].at - points[i - 1].at)
  const positive = deltas.filter((delta) => delta > 0)
  if (positive.length === 0) return []
  // Median, not minimum: two objects can emit bins a millisecond apart, and
  // that speck must not turn every real minute into a gap.
  const ordered = [...positive].sort((a, b) => a - b)
  const stride = ordered[Math.floor(ordered.length / 2)]
  const groups = []
  let current = [points[0]]
  for (let i = 1; i < points.length; i++) {
    if (points[i].at - points[i - 1].at > stride * 1.5) {
      if (current.length > 1) groups.push(current)
      current = [points[i]]
    } else current.push(points[i])
  }
  if (current.length > 1) groups.push(current)
  return groups
}

/** Points are `{at, value}` with gaps already omitted. A jump larger than the
 * smallest stride is left unconnected. */
export function HistoryLine({ points }) {
  if (!Array.isArray(points) || points.length < 2) return null
  const groups = segments(points)
  if (groups.length === 0) return null
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const first = points[0].at
  const last = points[points.length - 1].at
  const width = last - first || 1
  const d = groups.map((group) => group.map((point, index) => {
    const x = ((point.at - first) / width) * 240
    const y = 46 - ((point.value - min) / span) * 40
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')).join(' ')
  return h('svg', {
    className: 'dnls-history',
    viewBox: '0 0 240 48',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  }, h('path', {
    d, fill: 'none', stroke: 'currentColor', strokeWidth: '1.25',
    vectorEffect: 'non-scaling-stroke',
  }))
}

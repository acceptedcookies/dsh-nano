/**
 * The async-compaction history dialog's water-line gauge.
 *
 * Extracted from `AsyncHistoryDialog.jsx` so it can be rendered on its own in
 * tests: it is a pure presentational component, and the `live` indicator bug
 * (a bare `live` reference that was never a prop, 2026-11-16 `f63f6cf`) only
 * surfaced when the dialog actually opened. A standalone module makes that
 * render path cheap to pin.
 */
import * as React from 'react'
import { axisLabels, pct } from './history-format.js'

/**
 * Water-line gauge: fill against the three policy lines.
 *
 * Layout rule learned the hard way: the line labels must NOT sit under the
 * track, because that row is where the stat cards begin and the two collided.
 * They live on an axis ABOVE the track, each anchored at its own threshold and
 * carrying its own value, so "which line is where" is readable without a
 * legend that points at nothing. The track itself is then free to show only
 * the fill and the tick marks.
 *
 * @param {{fill: number|null, fillFromDecision?: boolean, health: number, buffer: number, safety: number, copy: object, live?: boolean}} props
 */
export function WaterLine({ fill, fillFromDecision = false, health, buffer, safety, copy, live = false }) {
  const clamped = typeof fill === 'number' && Number.isFinite(fill) ? Math.min(1, Math.max(0, fill)) : null

  const axis = axisLabels(health, buffer, safety)
  const axisLabel = line => React.createElement('span', {
    key: line.letter,
    className: 'nms-hist-axis-label',
    'data-tone': line.tone,
    style: {
      left: `${line.value * 100}%`,
      transform: `translateX(${line.anchor === 'start' ? '0' : line.anchor === 'end' ? '-100%' : '-50%'})`,
    },
  }, line.text)

  const tick = (value, letter, tone) => React.createElement('span', {
    key: `tick-${letter}`,
    className: 'nms-hist-tick',
    'data-tone': tone,
    style: { left: `${value * 100}%` },
    'aria-hidden': 'true',
  })

  return React.createElement('div', { className: 'nms-hist-water' },
    React.createElement('div', { className: 'nms-hist-water-head' },
      React.createElement('span', { className: 'nms-hist-water-value' }, pct(fill)),
      fillFromDecision ? React.createElement('span', { className: 'nms-hist-water-source' }, copy.historyFillAtDecision) : null,
      live ? React.createElement('span', { className: 'nms-hist-live' },
        React.createElement('span', { className: 'nms-hist-live-dot', 'aria-hidden': 'true' }),
        copy.historyLive) : null),
    React.createElement('div', { className: 'nms-hist-axis' }, axis.map(axisLabel)),
    React.createElement('div', {
      className: 'nms-hist-water-track',
      role: 'img',
      'aria-label': copy.historyWaterAria
        .replace('{fill}', pct(fill)).replace('{buffer}', pct(buffer)).replace('{safety}', pct(safety)),
    },
    clamped === null ? null : React.createElement('span', {
      className: 'nms-hist-water-fill',
      'data-over': clamped >= buffer ? 'true' : 'false',
      style: { width: `${clamped * 100}%` },
    }),
    tick(health, 'H', 'health'),
    tick(buffer, 'B', 'buffer'),
    tick(safety, 'S', 'safety')))
}

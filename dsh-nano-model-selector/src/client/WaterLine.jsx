/**
 * The async-compaction water-line gauge, shared by the history dialog and the
 * settings panel.
 *
 * Extracted as its own module so it can be rendered on its own in tests: it is
 * a pure presentational component, and the `live` indicator bug (a bare `live`
 * reference that was never a prop, 2026-11-16 `f63f6cf`) only surfaced when
 * the dialog actually opened. A standalone module makes that render path cheap
 * to pin.
 */
import * as React from 'react'
import { axisLabels, pct, tok, zonesOf } from './history-format.js'

const h = React.createElement

/**
 * Water-line gauge: fill against the three policy lines.
 *
 * The track is split into the four zones the engine actually acts on (healthy
 * below H, buffer between H and B, async between B and S, forced above S), so
 * the colour under the fill pointer already says what happens next; a legend
 * under the track names each zone in words. The legend is a vertical stack of
 * rows — a horizontal row of labels can never line up with zones of different
 * widths and read as misaligned (2026-11-19 owner review). The line labels
 * sit on an axis ABOVE the track, each anchored at its own threshold, because
 * a row under the track collides with whatever follows the gauge.
 *
 * @param {{fill: number|null, fillFromDecision?: boolean, health: number, buffer: number, safety: number, copy: object, live?: boolean, windowTokens?: number|null, legend?: boolean}} props
 */
export function WaterLine({ fill, fillFromDecision = false, health, buffer, safety, copy, live = false, windowTokens = null, legend = true }) {
  const clamped = typeof fill === 'number' && Number.isFinite(fill) ? Math.min(1, Math.max(0, fill)) : null
  const zones = zonesOf(health, buffer, safety, clamped)
  const used = clamped !== null && typeof windowTokens === 'number' && windowTokens > 0
    ? `≈ ${tok(fill * windowTokens)} / ${tok(windowTokens)}`
    : null

  const axisLabel = line => h('span', {
    key: line.letter,
    className: 'nms-hist-axis-label',
    'data-tone': line.tone,
    style: {
      left: `${line.value * 100}%`,
      transform: `translateX(${line.anchor === 'start' ? '0' : line.anchor === 'end' ? '-100%' : '-50%'})`,
    },
  }, line.text)

  const tick = (value, letter, tone) => h('span', {
    key: `tick-${letter}`,
    className: 'nms-hist-tick',
    'data-tone': tone,
    style: { left: `${value * 100}%` },
    'aria-hidden': 'true',
  })

  return h('div', { className: 'nms-hist-water' },
    h('div', { className: 'nms-hist-water-head' },
      copy.historyFillNow ? h('span', { className: 'nms-hist-water-label' }, copy.historyFillNow) : null,
      h('span', { className: 'nms-hist-water-value' }, pct(fill)),
      used === null ? null : h('span', { className: 'nms-hist-water-used' }, used),
      fillFromDecision ? h('span', { className: 'nms-hist-water-source' }, copy.historyFillAtDecision) : null,
      live ? h('span', { className: 'nms-hist-live' },
        h('span', { className: 'nms-hist-live-dot', 'aria-hidden': 'true' }),
        copy.historyLive) : null),
    h('div', { className: 'nms-hist-axis' }, axisLabels(health, buffer, safety).map(axisLabel)),
    h('div', {
      className: 'nms-hist-water-track',
      role: 'img',
      'aria-label': String(copy.historyWaterAria ?? '')
        .replace('{fill}', pct(fill)).replace('{buffer}', pct(buffer)).replace('{safety}', pct(safety)),
    },
    zones.map(zone => h('span', {
      key: zone.key,
      className: 'nms-hist-zone',
      'data-zone': zone.key,
      style: { left: `${zone.from * 100}%`, width: `${Math.max(0, zone.to - zone.from) * 100}%` },
      'aria-hidden': 'true',
    })),
    clamped === null ? null : h('span', {
      className: 'nms-hist-water-fill',
      'data-over': clamped >= buffer ? 'true' : 'false',
      style: { width: `${clamped * 100}%` },
    }),
    clamped === null ? null : h('span', {
      className: 'nms-hist-water-pointer',
      style: { left: `${clamped * 100}%` },
      'aria-hidden': 'true',
    }),
    tick(health, 'H', 'health'),
    tick(buffer, 'B', 'buffer'),
    tick(safety, 'S', 'safety')),
    legend ? h('div', { className: 'nms-hist-legend' },
      zones.map(zone => h('div', {
        key: zone.key,
        className: 'nms-hist-legend-item',
        'data-zone': zone.key,
        'data-current': zone.current ? 'true' : 'false',
      },
      h('span', { className: 'nms-hist-legend-swatch', 'aria-hidden': 'true' }),
      h('span', { className: 'nms-hist-legend-copy' },
        h('span', { className: 'nms-hist-legend-name' }, copy.historyZone?.[zone.key] ?? zone.key),
        h('span', { className: 'nms-hist-legend-range' }, zone.range),
        h('span', { className: 'nms-hist-legend-hint' }, copy.historyZoneHint?.[zone.key] ?? ''))))) : null)
}

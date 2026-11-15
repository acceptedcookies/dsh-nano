/** Browser half. The host serves this file at the package's ./client export. */

import * as React from 'react'
import { ModelSelector } from './ModelSelector.jsx'
import { profiler } from './perf.js'

export const inject = ['slots', 'modelDirectories', 'sessions', 'locale']

// Wrap with <React.Profiler> when perf-review is enabled; identity wrapper otherwise.
const ObservedModelSelector = profiler(ModelSelector)

/**
 * Slot render boundary. A throw inside the panel (e.g. a host primitives
 * contract that changed across releases) used to escape to the slot system,
 * which unmounted the whole seat — the selector just vanished on click.
 * Catching here keeps the seat alive and shows the error as visible text so a
 * reproduction report carries the actual message instead of "it disappeared".
 */
class SlotBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('[nano-model-selector] slot render failed:', error) }
  render() {
    if (this.state.error === null) return this.props.children
    return (
      <span className="nms-trigger nms-trigger-open" style={{ fontSize: '12px', padding: '0 8px' }}>
        ⚠ {String(this.state.error?.message ?? this.state.error)}
      </span>
    )
  }
}

/**
 * Replace the composer's model seat at a lower slot priority. The shipped
 * ui-model-selection plugin keeps providing `ctx.modelDirectories` and the
 * `/model` command; this plugin only takes over the composer presentation.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  // `priority` is not a slot field: a single-seat slot is elected by
  // registration order, so registering after the shipped selector shadows it.
  // We rely on that documented election rule, not an override knob (review-01
  // R13). The shipped ui-model-selection still owns `ctx.modelDirectories` and
  // the `/model` command; this plugin only takes over the composer presentation.
  ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
    name: 'conversation.input.model',
    registrant: 'nano-model-selector',
    inject: sessionId => {
      const directory = ctx.modelDirectories.directoryFor(sessionId)
      const available = ctx.sessions.subagentAddress(sessionId) === undefined
      return {
        available,
        directory,
        load: () => {
          if (available) directory.load().catch(() => { /* surfaced on the directory store */ })
        },
        select: selection => available ? directory.select(selection) : Promise.resolve(undefined),
        language: {
          current: () => ctx.locale.getSnapshot().active,
          subscribe: listener => ctx.on('locale/change', listener),
        },
        resolveText: text => ctx.locale.resolveText(text),
      }
    },
  }, props => (
    <SlotBoundary>
      <ObservedModelSelector {...props} />
    </SlotBoundary>
  )))
}

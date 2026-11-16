/** Browser half. The host serves this file at the package's ./client export. */

import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ModelSelector } from './ModelSelector.jsx'
import { AsyncHistoryDialog, historyMenuIcon } from './AsyncHistoryDialog.jsx'
import { AsyncActivityLine } from './AsyncActivityLine.jsx'
import { profiler } from './perf.js'
import { copyFor } from './i18n.js'

export const inject = ['slots', 'modelDirectories', 'sessions', 'locale', 'contextMenus']

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

  // Async-compaction history: one entry in the session header's overflow menu
  // opens the diagnostic dialog. The glyph registers through the shell's own
  // icon slot so the menu row renders exactly like the shipped entries.
  // The dialog lives in the shell overlay slot, not inside the menu: the menu
  // unmounts on selection, the dialog must outlive it.
  const openHistory = sessionId => {
    const host = document.createElement('div')
    host.className = 'nano-dialog-host'
    document.body.append(host)
    const root = createRoot(host)
    const close = () => {
      root.unmount()
      host.remove()
    }
    root.render(
      <SlotBoundary>
        <AsyncHistoryDialog
          copy={copyFor(ctx.locale.getSnapshot().active)}
          sessionId={sessionId}
          onClose={close}
        />
      </SlotBoundary>,
    )
  }

  // `contextMenus` is resolved through ctx.get(): property access on a cordis
  // context can hand back a shadow provision (the fe63eec trap), and a menu
  // registered into a shadow looks successful while never reaching the real
  // registry. The package also declares @deepseek-ai/dsh-client-ui-context-menu
  // in dsh.client.inject so the loader composes this plugin into the same
  // client scope as the shell's own menu contributors.
  const menus = ctx.get('contextMenus') ?? ctx.contextMenus
  ctx.effect(() => menus.register({
    id: 'nano-model-selector.async-history',
    target: 'sessionHeader',
    order: 500,
    observe: () => [ctx.locale],
    resolve: ({ sessionId }) => [{
      id: 'async-history',
      label: copyFor(ctx.locale.getSnapshot().active).historyMenu,
      icon: { key: 'nano-model-selector.async-history' },
      run: () => openHistory(sessionId),
    }],
  }), 'nano-model-selector: async compaction history')

  // In-flight async-compaction status, in the composer's own activity row.
  // The shell reserves that row only while a plugin reports itself active, so
  // the line stays invisible whenever the lane is idle.
  ctx.slots.inject('conversation.input.activity', () => ctx.slots.register({
    name: 'conversation.input.activity',
    registrant: 'nano-model-selector',
    inject: sessionId => ({
      sessionId,
      copy: copyFor(ctx.locale.getSnapshot().active),
    }),
  }, props => (
    <SlotBoundary>
      <AsyncActivityLine {...props} />
    </SlotBoundary>
  )))

  // The glyph goes in through the shell's own icon slot so the row renders like
  // the shipped entries. Guarded: a slot-contract change must degrade to a
  // label-only row, never abort apply() and take the menu entry with it.
  try {
    ctx.slots.inject('contextMenu.icon', function* registerHistoryIcon() {
      yield ctx.slots.register({
        name: 'contextMenu.icon',
        key: 'nano-model-selector.async-history',
      }, historyMenuIcon)
    })
  } catch (error) {
    console.warn('[nano-model-selector] context menu icon slot unavailable:', error)
  }

}

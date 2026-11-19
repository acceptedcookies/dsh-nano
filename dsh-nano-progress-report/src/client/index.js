/** Client entry for dsh-nano-progress-report.
 *  Registers the 'progress' conversation view target, the Progress
 *  conversation view tab (primary entry), the workbench tab type and body
 *  (kept as the side-by-side entry), and a session-header action that opens
 *  the workbench tab. No host routes, no stored state — the session event
 *  stream is the single source of truth; this plugin only projects it. */
import { registerProgressProjection } from './events/index.js'
import ProgressBody from './view/ProgressBody.jsx'
import OpenProgressItem from './view/OpenProgressItem.jsx'
import HeaderAction from './view/HeaderAction.jsx'
import { PROGRESS_CSS } from './styles.js'
import { makeI18n } from './i18n.js'
import { perf } from './perf.js'
import { TAB_ID, TAB_KIND, VIEW_ID } from './constants.js'

export const inject = [
  'slots', 'locale', 'sessions', 'sidebarRight', 'sidebarRightTabs',
  'uiConversation', 'uiSession', 'jobs',
]

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const t = makeI18n(() => ctx.locale.getSnapshot().active)

  const style = document.createElement('style')
  style.dataset.nprStyle = 'true'
  style.textContent = PROGRESS_CSS
  document.head.append(style)
  ctx.effect(() => () => style.remove(), 'nano-progress-report: styles')

  ctx.effect(() => registerProgressProjection(ctx), 'nano-progress-report: projection')

  // sidebarRightTabs registry has NO Service.tracker: its internal ctx.effect
  // binds the provider fiber, not ours — the returned disposer must live in
  // our effect or the 'progress' kind outlives the plugin (host contract:
  // "caller holds the disposer inside its own ctx.effect").
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: 'extension',
    keepMounted: true,
    title: () => t('view.progress'),
    guide: [{
      id: 'progress',
      order: 40,
      title: () => t('view.progress'),
      description: () => t('view.progressDesc'),
    }],
  }), 'nano-progress-report: workbench type')

  // slots.inject IS caller-fiber-safe (SlotRegistry extends Service; the
  // proxy rebinds ctx to the caller) — direct calls are correct here.
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: TAB_ID,
    inject: () => ({ ctx, t }),
  }, ProgressBody))

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: VIEW_ID,
    // After chat (0) and trajectory (10).
    order: 30,
    label: () => t('view.progress'),
    inject: () => ({ ctx, t, variant: 'view' }),
  }, ProgressBody))

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: VIEW_ID,
    // After background jobs (20).
    order: 30,
    inject: () => ({
      t,
      openProgress: (sessionId) => {
        try { ctx.sidebarRight.openTabIn(sessionId, TAB_KIND) } catch { /* sidebar unavailable for this session */ }
      },
    }),
  }, HeaderAction))

  ctx.slots.inject('sidebar.right.tab.menu.item', () => ctx.slots.register({
    name: 'sidebar.right.tab.menu.item',
    id: `${TAB_ID}.open`,
    order: 100,
    inject: () => ({ ctx, t }),
  }, OpenProgressItem))
}

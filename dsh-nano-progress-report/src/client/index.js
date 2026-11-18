/** Client entry for dsh-nano-progress-report.
 *  Registers the 'progress' conversation view target, the workbench tab type,
 *  and the tab body. No host routes, no stored state — the session event
 *  stream is the single source of truth; this plugin only projects it. */
import { registerProgressProjection } from './events/index.js'
import ProgressBody from './view/ProgressBody.jsx'
import OpenProgressItem from './view/OpenProgressItem.jsx'
import { PROGRESS_CSS } from './styles.js'
import { makeI18n } from './i18n.js'
import { perf } from './perf.js'
import { TAB_ID, TAB_KIND } from './constants.js'

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

  ctx.slots.inject('sidebar.right.tab.menu.item', () => ctx.slots.register({
    name: 'sidebar.right.tab.menu.item',
    id: `${TAB_ID}.open`,
    order: 100,
    inject: () => ({ ctx, t }),
  }, OpenProgressItem))
}

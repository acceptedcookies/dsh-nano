// dsh-nano-terminal client entry.
// The nano terminal lives ONLY inside the chat area as a 'conversation.view'
// tab (对话 / 轨迹 / Nano 终端). The [dsh工作台] (right sidebar) surface is
// intentionally not registered — the native terminal kind stays untouched.

import { createElement as h, Component } from 'react'
import { NanoTerm, NanoTermHeaderSettings, anyLiveTerminals, disposeAllTerminals, requestPaneOpen } from './NanoTerm.jsx'
import { perf, setTerminalRoot } from './perf.js'
import { installDevProbe } from './dev-probe.js'

try { window.__dntModule = 'evaluated' } catch { /* non-browser */ }

export const inject = ['slots', 'commandUi', 'locale', 'sidebarRight', 'sessions', 'shortcuts']

const mark = (stage) => {
  try {
    const log = JSON.parse(localStorage.getItem('dnt.apply') ?? '[]')
    log.push(`${Date.now()} ${stage}`)
    localStorage.setItem('dnt.apply', JSON.stringify(log.slice(-40)))
  } catch { /* no storage */ }
}

const VIEW_LABELS = ['终端', 'Terminal', 'Nano 终端', 'Nano terminal']

// A header slot render must never take the host utility row down: catch and
// swallow, leaving only a console trail (same convention DNMS uses).
class SlotBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('[dnt] header slot render failed:', error) }
  render() { return this.state.error === null ? this.props.children : null }
}

// The host exposes view selection only through the session-bound tab strip,
// so activation clicks the official [data-conversation-tabs] anchor — the
// same code path the user's own clicks take.
const clickTab = (el) => { if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) }
const viewTabs = () => [...(document.querySelector('[data-conversation-tabs]')?.querySelectorAll('[role="tab"]') ?? [])]
const mineTab = () => viewTabs().find((el) => VIEW_LABELS.some((l) => el.textContent.trim() === l))
const activateView = () => clickTab(mineTab())
const activateChat = () => clickTab(viewTabs()[0]) // 对话 is always first (fixed)

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  mark('apply:start services=' + ['slots', 'commandUi', 'locale', 'sidebarRight', 'sessions'].map((k) => `${k}:${!!ctx[k]}`).join(','))
  // perf: root = the mounted .dnt-root; dev-probe arms when ?dnt-probe=1 is on.
  setTerminalRoot(() => document.querySelector('.dnt-root'))
  installDevProbe()
  // Plugin unload (disable/removal) must release every live lane — view
  // remounts never do.
  ctx.effect(() => () => disposeAllTerminals(), 'dsh-nano-terminal.disposeAll')
  const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith('zh') ?? false
  const t = (en, cn) => (zh() ? cn : en)

  const ProfiledNanoTerm = perf.profiler(NanoTerm)
  const Body = (props) => {
    try {
      window.__dntBodyProps = Object.keys(props)
      window.__dntBodyMounted = (window.__dntBodyMounted ?? 0) + 1
    } catch { /* diag best-effort */ }
    return h(ProfiledNanoTerm, { sessionId: props.sessionId, session: props.session, zh: zh(), openView: props.openView })
  }

  // Chat-area view tab: registered under the session scope so the 对话/轨迹
  // tab row gains a Nano 终端 entry. Official shape — direct slots.inject at
  // apply time, like dsh-client-ui-trajectory.
  mark('registerView conversation.view')
  try {
    ctx.slots.inject('conversation.view', () => ctx.slots.register(
      {
        name: 'conversation.view',
        id: 'nano-term',
        order: 20, // after 对话(chat) and 轨迹(trajectory, order 10)
        label: () => t('Terminal', '终端'),
        inject: (sessionId) => ({ sessionId }),
      },
      Body,
    ))
    mark('registerView OK')
  } catch (err) {
    mark('registerView FAIL ' + String(err?.message ?? err))
    console.warn('[dnt] conversation.view registration failed:', err)
  }

  // The settings gear moved out of the status bar into the session header's
  // native utility row (right-aligned with the host buttons). List slot: `id`
  // is required or the host rejects the registration (DNMS's contract).
  try {
    ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
      {
        name: 'conversation.session.header.utilities',
        id: 'nano-terminal.settings',
        registrant: 'nano-terminal',
        inject: (sessionId) => ({ sessionId }),
      },
      (props) => h(SlotBoundary, null, h(NanoTermHeaderSettings, { sessionId: props.sessionId, zh: zh() })),
    ))
    mark('registerHeaderUtility OK')
  } catch (err) {
    mark('registerHeaderUtility FAIL ' + String(err?.message ?? err))
    console.warn('[dnt] header.utilities registration failed:', err)
  }

  // ⌘+E then T toggles between this view and 对话 — registered as a FIXED
  // shortcut through the host shortcuts service (the same official channel
  // notepad uses for ⌘E+digit). On desktop, the native keyboard bridge
  // dispatches through this registry, bypassing DOM — DOM-level capture
  // could never intercept it. Track the sequence via observeFixedInput;
  // consume() marks defaultPrevented for the DOM dispatcher on web, and
  // ordering of fixedListeners arbitrate overlapping prefix reservations.
  ctx.effect(() => {
    if (!ctx.shortcuts) { mark('viewToggle noShortcuts'); return undefined }
    const disposeFixed = ctx.shortcuts.registerFixed({
      id: 'nanoTerminal.toggleView',
      label: () => t('Toggle terminal / chat view', '切换终端 / 对话视图'),
      keys: ['⌘', 'E', 'T'],
      bindings: [{ code: 'KeyE', modifiers: ['primary'] }, { code: 'KeyT', modifiers: ['primary'] }],
      group: 'application',
    })
    let armed = 0
    const offInput = ctx.shortcuts.observeFixedInput((input) => {
      if (input.type === 'reset') { armed = 0; return }
      const g = input.gesture
      const now = Date.now()
      if (now > armed) armed = 0
      const onlyPrimary = g.meta && !g.ctrl && !g.alt && !g.shift
      if (!onlyPrimary || g.repeat || g.composing || g.defaultPrevented) return
      if (g.code === 'KeyE') {
        if (!mineTab()) return
        armed = now + (ctx.shortcuts.stopSequenceMs ?? 1200)
        input.consume()
        return
      }
      if (!armed) return
      armed = 0
      if (g.code !== 'KeyT') return // let another ⌘E-prefix chord see it
      input.consume()
      const tab = mineTab()
      if (!tab) { mark('chord T noTab'); return }
      if (tab.getAttribute('aria-selected') === 'true') activateChat()
      else clickTab(tab)
    })
    mark('viewToggle fixed')
    return () => { disposeFixed(); offInput() }
  }, 'dsh-nano-terminal.viewToggle')

  // Orphan cleanup: 'nano-term' sidebar tabs persisted before the workbench
  // entry was retired would linger forever. Enumerate every session's
  // sidebar tabs and close ours. Service is injected but nothing registers
  // into the sidebar — the entry stays closed.
  ctx.effect(() => {
    let live = true
    const sweep = () => {
      try {
        const ctl = ctx.sidebarRight
        const byId = ctx.sessions?.list?.getSnapshot?.().byId ?? {}
        let closed = 0
        for (const sessionId of Object.keys(byId)) {
          for (const tab of ctl.tabsIn?.(sessionId) ?? []) {
            if (tab?.kind === 'nano-term') {
              try { ctl.closeIn(sessionId, tab.id); closed += 1 } catch { /* raced */ }
            }
          }
        }
        if (closed) mark('sweep orphans ' + closed)
      } catch (err) {
        mark('sweep FAIL ' + String(err?.message ?? err))
      }
    }
    // run once soon after apply, then re-sweep as sessions come online
    const timer = setTimeout(() => live && sweep(), 1500)
    const sub = ctx.sessions?.list?.subscribe?.(() => sweep())
    return () => {
      live = false
      clearTimeout(timer)
      try { sub?.() } catch { /* no sessions service */ }
    }
  }, 'dsh-nano-terminal.orphanSweep')

  // 宿主 scrollBody 在 [data-conversation-scroll] 上留着 scrollbar-gutter:stable
  // 和 margin-right:2px。原生滚动条在 macOS 上是覆盖层，不占宽，这条槽却仍
  // 把整列往左挤。轨迹和终端的状态栏都画在这一列里，所以两条栏的右侧一起出
  // 现空白。修正只打在这个公开属性上，不跟 CSS Modules 哈希，也不再画悬浮
  // 滚动条、不改宿主节点的 position。
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dntScrollport = '1'
    style.textContent = [
      '[data-conversation-scroll]{scrollbar-gutter:auto;margin-right:0}',
      '[data-conversation-scroll]::-webkit-scrollbar{width:0;height:0}',
      '[data-conversation-scroll]{scrollbar-width:none}',
    ].join('\n')
    document.head.appendChild(style)
    return () => style.remove()
  }, 'dsh-nano-terminal.scrollport')

  // —— intake for sibling plugins ——
  // A file explorer (or anything else) asks for a terminal at a directory
  // through the cordis service map rather than a window global or a bespoke
  // DOM poke: `ctx.get('nanoTerminal')` stays undefined when this plugin is
  // not installed, which is also how the caller picks its native fallback.
  // `ctx.provide` returns a disposer the runtime ties to this scope.
  ctx.effect(() => {
    if (typeof ctx.provide !== 'function') return undefined
    return ctx.provide('nanoTerminal', {
      // openLocal(sessionId, cwd): reveal the nano-term conversation view and
      // open a `local` lane whose shell starts in `cwd`. Queued while the view
      // is not mounted — the pane still lands because the view is activated
      // first and the Body drains pending requests on mount.
      openLocal(sessionId, cwd) {
        requestPaneOpen(sessionId, { lane: 'local', cwd })
        activateView()
      },
    })
  }, 'dsh-nano-terminal.service')

  // Page-close guard: while any nano terminal lane is live, closing or
  // reloading the whole dsh page must ask the user first — the browser's
  // native beforeunload confirmation. On unload the plugin-level teardown
  // also releases every lane so the host can sweep the pties.
  ctx.effect(() => {
    const guard = (ev) => {
      if (!anyLiveTerminals()) return
      ev.preventDefault()
      ev.returnValue = '' // Chromium trigger for the confirm dialog
    }
    window.addEventListener('beforeunload', guard)
    mark('beforeunload guard')
    return () => window.removeEventListener('beforeunload', guard)
  }, 'dsh-nano-terminal.unloadGuard')

  // slash command: /dnt — opens the chat-area view, or prints lane status.
  ctx.effect(() => {
    try {
      return ctx.commandUi.register({
        name: 'dnt',
        label: () => t('nano terminal', 'nano 终端'),
        description: () => t('open the Nano 终端 chat-area view', '打开 chat 区 Nano 终端视图'),
        available: () => true,
        ui: {
          kind: 'popupSelect',
          options: async () => [
            { id: 'open', label: t('Open Nano 终端 view', '打开 Nano 终端视图'), group: t('terminal', '终端') },
            { id: 'status', label: t('Lane status (host MCP)', '通道状态（宿主 MCP）'), group: t('terminal', '终端') },
          ],
          onSelect: async (option) => {
            if (option.id === 'open') {
              activateView()
            } else if (option.id === 'status') {
              try {
                const res = await fetch('/dsh-nano-terminal/health')
                const info = await res.json()
                console.info('[dnt] lane status:', info)
              } catch (e) {
                console.warn('[dnt] status fetch failed', e)
              }
            }
          },
        },
      })
    } catch (err) {
      console.warn('[dnt] commandUi register failed:', err)
      return () => {}
    }
  }, 'dsh-nano-terminal.command')
}

export default { inject, apply }

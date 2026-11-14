// dsh-nano-terminal client entry.
// The nano terminal lives ONLY inside the chat area as a 'conversation.view'
// tab (对话 / 轨迹 / Nano 终端). The [dsh工作台] (right sidebar) surface is
// intentionally not registered — the native terminal kind stays untouched.

import { createElement as h } from 'react'
import { NanoTerm, anyLiveTerminals, disposeAllTerminals } from './NanoTerm.jsx'

try { window.__dntModule = 'evaluated' } catch { /* non-browser */ }

export const inject = ['slots', 'commandUi', 'locale', 'sidebarRight', 'sessions']

const mark = (stage) => {
  try {
    const log = JSON.parse(localStorage.getItem('dnt.apply') ?? '[]')
    log.push(`${Date.now()} ${stage}`)
    localStorage.setItem('dnt.apply', JSON.stringify(log.slice(-40)))
  } catch { /* no storage */ }
}

const VIEW_LABELS = ['终端', 'Terminal', 'Nano 终端', 'Nano terminal']

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
  // Plugin unload (disable/removal) must release every live lane — view
  // remounts never do.
  ctx.effect(() => () => disposeAllTerminals(), 'dsh-nano-terminal.disposeAll')
  const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith('zh') ?? false
  const t = (en, cn) => (zh() ? cn : en)

  const Body = (props) => {
    try {
      window.__dntBodyProps = Object.keys(props)
      window.__dntBodyMounted = (window.__dntBodyMounted ?? 0) + 1
    } catch { /* diag best-effort */ }
    return h(NanoTerm, { sessionId: props.sessionId, session: props.session, zh: zh(), openView: props.openView })
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

  // ⌘+E then T toggles between this view and 对话. The host has its own ⌘E
  // binding (opens a workbench browser), so the chord must be captured at
  // ⌘E — preventDefault+stopPropagation — not just at T. Only armed while a
  // conversation tab strip with our tab exists; elsewhere ⌘E stays native.
  ctx.effect(() => {
    let armed = 0
    const onKey = (ev) => {
      const now = Date.now()
      if (now > armed) armed = 0
      if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey && ev.code === 'KeyE' && !ev.repeat) {
        if (!mineTab()) return
        armed = now + 1200
        ev.preventDefault()
        ev.stopPropagation()
        return
      }
      if (armed && ev.code === 'KeyT' && !ev.repeat) {
        armed = 0
        ev.preventDefault()
        ev.stopPropagation()
        const tab = mineTab()
        if (!tab) return
        if (tab.getAttribute('aria-selected') === 'true') activateChat()
        else clickTab(tab)
      }
    }
    window.addEventListener('keydown', onKey, true)
    mark('viewToggle listener')
    return () => window.removeEventListener('keydown', onKey, true)
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

  // —— composer 左右边距修复 ——
  // [data-conversation-scroll] 的原生滚动条不是悬浮层：布局上它在右侧独占
  // 一条 ~5px lane，把内容列（含 composer）整体向左挤，导致可视边距
  // 左 32 / 右 39（composer 为 16 / 23），右栏前还多出一条视觉缺口。
  // `scrollbar-gutter: stable both-edges` 在左侧镜像等宽 gutter，滚动条
  // 仍在原位，内容列重新对称居中 —— 这是对本插件激活的宿主 composer
  // 左右边距进行的样式修复。
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dntComposerMarginFix = '1'
    style.textContent = '[data-conversation-scroll]{scrollbar-gutter:stable both-edges}'
    document.head.appendChild(style)
    mark('composerMarginFix applied')
    return () => style.remove()
  }, 'dsh-nano-terminal.composerMarginFix')

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

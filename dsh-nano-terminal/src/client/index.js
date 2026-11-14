// dsh-nano-terminal client entry.
// The nano terminal lives ONLY inside the chat area as a 'conversation.view'
// tab (对话 / 轨迹 / Nano 终端). The [dsh工作台] (right sidebar) surface is
// intentionally not registered — the native terminal kind stays untouched.

import { createElement as h } from 'react'
import { NanoTerm, anyLiveTerminals, disposeAllTerminals } from './NanoTerm.jsx'

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

  // —— 原生样式修正：隐藏滚动条 + 撤销槽位 + 悬浮替身 ——
  // [data-conversation-scroll] 的原生滚动条不是悬浮层：布局上它在右侧独占
  // 一条 lane，把内容列（含 composer）整体向左挤，导致可视边距不对称；宿
  // 主 `.wSkVaW_scrollBody` 另带 `scrollbar-gutter:stable` + `margin-right:2px`
  // 为这条滚动条预留槽位，三视图右侧各有约 7px 空白。本插件统一把原生滚
  // 动条隐藏（零占位），并撤销其槽位/外边距，再注入绝对定位的悬浮 thumb
  // 替代视觉滚动指示——不占布局、零边距、全视图生效。
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dntComposerMarginFix = '1'
    // —— 修正①：隐藏原生滚动条（零占位）——
    //   宿主 `[data-conversation-scroll]` 的原生滚动条在右侧独占一条 ~5px
    //   lane，把会话内容列整体向左挤；轨迹/对话/终端三个视图都有这条右
    //   侧空隙（宿主既有问题，非本插件造成）。scrollbar-width:none +
    //   ::-webkit-scrollbar{width:0} 让滚动条不再占布局——配合修正②腾出
    //   的槽位，内容列恢复满宽；视觉滚动条由修正③的 .dnt-floatbar 悬浮
    //   显示，不占布局。
    // —— 修正②：撤销为原生滚动条预留的槽位与外边距——
    //   宿主 `.wSkVaW_scrollBody` 自带 `scrollbar-gutter:stable`（不管滚
    //   动条可不可见都预留一条左槽）与 `margin-right:2px`。原生滚动条被
    //   修正①关掉后，这两条规则只剩副作用：右 5px gutter + 2px margin
    //   合计约 7px 空白。`scrollbar-gutter:auto` + `margin-right:0` 把
    //   它们复位，空隙消除；该选择器与属性命中宿主会话 scrollBody，在
    //   对话/轨迹/终端三视图统一生效。
    // —— 修正③：悬浮滚动条替身（.dnt-floatbar）——
    //   原生滚动条隐藏后视觉仍要可拖可看的进度指示，这里注入一条 5px
    //   悬浮 thumb，absolute 定位、pointer-events:none，跟随 scrollTop/
    //   scrollHeight/ResizeObserver 更新高度与位移，滚动时提亮、900ms 停
    //   止后淡出——不占任何布局，是「悬浮滚动条」的实现。
    style.textContent = [
      // 修正①：隐藏原生滚动条（零占位）
      '[data-conversation-scroll]{scrollbar-width:none}',
      '[data-conversation-scroll]::-webkit-scrollbar{width:0;height:0}',
      // 修正②：撤销原生滚动条的槽位与外边距（宿主 wSkVaW_scrollBody）
      '.wSkVaW_scrollBody{scrollbar-gutter:auto;margin-right:0}',
      // 修正③：悬浮滚动条替身
      '.dnt-floatbar{position:absolute;top:0;right:2px;z-index:20;width:5px;border-radius:3px;background:var(--dsw-alias-label-quaternary);opacity:.45;pointer-events:none;transition:opacity .18s}',
      '.dnt-floatbar[data-on="true"]{opacity:.85}',
    ].join('\n')
    document.head.appendChild(style)
    const bar = document.createElement('div')
    bar.className = 'dnt-floatbar'
    const attach = () => {
      const sp = document.querySelector('[data-conversation-scroll]')
      if (!sp || bar.parentElement) return
      const host = sp.parentElement // position:relative wrapper hosts the thumb
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
      host.appendChild(bar)
      const update = () => {
        const { scrollTop, scrollHeight, clientHeight } = sp
        if (scrollHeight <= clientHeight + 2) { bar.style.display = 'none'; return }
        bar.style.display = ''
        const h = Math.max(24, clientHeight * clientHeight / scrollHeight)
        const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - h)
        bar.style.height = `${h}px`
        bar.style.transform = `translateY(${top}px)`
      }
      update()
      const onScroll = () => { bar.dataset.on = 'true'; update(); clearTimeout(bar._t); bar._t = setTimeout(() => { bar.dataset.on = 'false' }, 900) }
      sp.addEventListener('scroll', onScroll, { passive: true })
      const ro = new ResizeObserver(update)
      ro.observe(sp)
      bar._cleanup = () => { sp.removeEventListener('scroll', onScroll); ro.disconnect() }
    }
    const mo = new MutationObserver(attach)
    mo.observe(document.body, { childList: true, subtree: true })
    attach()
    mark('floatbar applied')
    return () => {
      mo.disconnect()
      bar._cleanup?.()
      bar.remove()
      style.remove()
    }
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

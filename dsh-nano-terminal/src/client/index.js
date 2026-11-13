// dsh-nano-terminal client entry.
// Registers the nano-term tab kind and takes over the builtin 'terminal' kind
// body — both render through our wasm core + lanes instead of xterm.js.

import { createElement as h } from 'react'
import { NanoTerm } from './NanoTerm.jsx'

try { window.__dntModule = 'evaluated' } catch { /* non-browser */ }

export const inject = ['slots', 'sidebarRight', 'sidebarRightTabs', 'commandUi', 'locale']

const KIND = 'nano-term'

const mark = (stage) => {
  try {
    const log = JSON.parse(localStorage.getItem('dnt.apply') ?? '[]')
    log.push(`${Date.now()} ${stage}`)
    localStorage.setItem('dnt.apply', JSON.stringify(log.slice(-40)))
  } catch { /* no storage */ }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  mark('apply:start services=' + ['slots', 'sidebarRight', 'sidebarRightTabs', 'commandUi', 'locale'].map((k) => `${k}:${!!ctx[k]}`).join(','))
  const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith('zh') ?? false
  const t = (en, cn) => (zh() ? cn : en)

  const Body = (props) => {
    try {
      window.__dntBodyProps = Object.keys(props)
      window.__dntBodyMounted = (window.__dntBodyMounted ?? 0) + 1
    } catch { /* diag best-effort */ }
    return h(NanoTerm, { sessionId: props.sessionId, session: props.session, zh: zh() })
  }

  const title = (label) => (props) => {
    const info = props.useTabInfo?.() ?? {}
    const tabTitle = info.tab?.title
    return h('span', { title: tabTitle ?? label }, tabTitle ?? label)
  }

  const ID = 'dsh-nano-terminal'       // extension type id for kind 'nano-term'
  const TAKEOVER_ID = 'dsh-nano-terminal.takeover' // extension type id for kind 'terminal'

  const registerKind = (kind, id, label, guide) => {
    try {
      mark('registerKind ' + kind)
      return ctx.sidebarRightTabs.register({ id, kind, multiple: true, title: () => label, guide })
    } catch (err) {
      mark('registerKind FAIL ' + kind + ' ' + String(err?.message ?? err))
      console.warn('[dnt] kind registration failed:', kind, err)
      return () => {}
    }
  }

  ctx.effect(() => registerKind(KIND, ID, 'nano-term', [{
    id: 'new',
    order: 20,
    title: () => t('New nano terminal', '新建 nano 终端'),
    description: () => t('WASM terminal — local / MCP / isolate lanes', 'WASM 终端 — 本地 / MCP / 隔离通道'),
  }]), 'dsh-nano-terminal.type')
  // takeover of the builtin terminal kind: our body replaces xterm.js rendering
  ctx.effect(() => registerKind('terminal', TAKEOVER_ID, 'Terminal', []), 'dsh-nano-terminal.takeover')

  const injectProps = (sessionId) => ({ sessionId })

  // body slot is dispatched by the tab TYPE's id (the `key` field)
  const registerBody = (typeId) => {
    mark('registerBody ' + typeId + ' slots=' + !!ctx.slots)
    try {
      return ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
        { name: 'sidebar.right.pane.tab', key: typeId, inject: injectProps },
        Body,
      ))
    } catch (err) {
      mark('registerBody FAIL ' + typeId + ' ' + String(err?.message ?? err))
      throw err
    }
  }
  ctx.effect(() => registerBody(ID), 'dsh-nano-terminal.body')
  ctx.effect(() => registerBody(TAKEOVER_ID), 'dsh-nano-terminal.takeover.body')

  const registerTitle = (typeId, label) => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: typeId, inject: injectProps },
    title(label),
  ))
  ctx.effect(() => registerTitle(ID, 'nano-term'), 'dsh-nano-terminal.title')
  ctx.effect(() => registerTitle(TAKEOVER_ID, 'Terminal'), 'dsh-nano-terminal.takeover.title')

  // slash command: /dnt — the UI mapping of the MCP control plane.
  // `term` is host-owned by our index.js command; the client action opens tabs.
  ctx.effect(() => {
    try {
      return ctx.commandUi.register({
        name: 'dnt',
        label: () => t('nano terminal', 'nano 终端'),
        description: () => t('open a nano-terminal tab (wasm core)', '打开 nano 终端标签页（wasm 核心）'),
        available: () => true,
        ui: {
          kind: 'popupSelect',
          options: async () => [
            { id: 'new', label: t('New nano-terminal tab', '新建 nano 终端标签页'), group: t('terminal', '终端') },
            { id: 'status', label: t('Lane status (host MCP)', '通道状态（宿主 MCP）'), group: t('terminal', '终端') },
          ],
          onSelect: async (option) => {
            if (option.id === 'new') {
              ctx.sidebarRight.openTab(KIND)
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

/** Browser half. The host serves the built file at the package's ./client export. */

import React from 'react'
import { mountPanel } from './panel.js'
import { makeI18n } from './i18n.js'

export const inject = ['slots', 'theme', 'locale', 'shortcuts']

const VERSION = typeof __DNCS_VERSION__ !== 'undefined' ? __DNCS_VERSION__ : '0.0.0'

function chordKeys(platform) {
  return platform === 'mac' ? '⌘E·2' : platform === 'windows' ? 'Alt+E·2' : 'Ctrl+E·2'
}

function primaryDown(event, platform) {
  if (platform === 'mac') return event.metaKey && !event.ctrlKey && !event.altKey
  if (platform === 'windows') return event.altKey && !event.ctrlKey
  return event.ctrlKey && !event.altKey
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config = {}) {
  const t = makeI18n(() => ctx.locale.getSnapshot().active)
  const title = () => (ctx.locale.getSnapshot().active?.startsWith('zh') ? '云会话' : 'Cloud Sessions')
  const platform = ctx.shortcuts.platform
  /** @type {{ toggle: () => void } | undefined} */
  let api

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nano-cloud-session',
    order: 50,
    inject: () => ({
      label: () => `${title()} (${chordKeys(platform)})`,
      ready: next => { api = next },
    }),
  }, function CloudSession({ ready }) {
    const ref = React.useRef(null)
    React.useEffect(() => {
      const element = ref.current
      if (!element) return undefined
      const mounted = mountPanel(element, { t, pollIntervalMs: config.pollIntervalMs ?? 5000 })
      ready(mounted)
      return () => { ready(undefined); element.replaceChildren() }
    }, [])
    return React.createElement('div', { ref, 'data-nano-cloud-session': 'root', 'data-version': VERSION })
  }))

  // Chord: primary+E then 2 (Digit1 belongs to notepad).
  ctx.effect(() => {
    let letterHeld = false
    const down = (event) => {
      if (event.isComposing) return
      if (event.code === 'KeyE') {
        letterHeld = primaryDown(event, platform) && !event.shiftKey
        if (letterHeld && platform === 'windows' && event.altKey === true) event.preventDefault()
        return
      }
      if (!letterHeld || event.code !== 'Digit2' || event.repeat) return
      if (!primaryDown(event, platform) || event.shiftKey) return
      event.preventDefault()
      event.stopPropagation()
      api?.toggle()
    }
    const up = (event) => {
      if (event.code === 'KeyE' || event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') letterHeld = false
    }
    document.addEventListener('keydown', down, true)
    document.addEventListener('keyup', up, true)
    return () => {
      document.removeEventListener('keydown', down, true)
      document.removeEventListener('keyup', up, true)
    }
  })
}

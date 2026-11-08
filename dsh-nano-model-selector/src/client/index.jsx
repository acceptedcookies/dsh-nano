/** Browser half. The host serves this file at the package's ./client export. */

import * as React from 'react'
import { ModelSelector } from './ModelSelector.jsx'

export const inject = ['slots', 'modelDirectories', 'sessions', 'locale']

/**
 * Replace the composer's model seat at a lower slot priority. The shipped
 * ui-model-selection plugin keeps providing `ctx.modelDirectories` and the
 * `/model` command; this plugin only takes over the composer presentation.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
    name: 'conversation.input.model',
    priority: -1,
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
  }, ModelSelector))
}

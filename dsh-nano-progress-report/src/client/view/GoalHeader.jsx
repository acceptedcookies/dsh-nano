/** Goal banner above the timeline, read from the official `goal` projection
 *  (`faceOf('goal')` → `{goal:{objective, phase, maxGoalRounds, blockedReason?},
 *  roundsStarted}` | null). Renders nothing without a current goal. */
import React from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { oneLine } from '../args.js'
import { TYPE_ICON } from '../icons.js'

const { createElement: h } = React

const PHASE_DOT = { active: 'ongoing', paused: 'idle', blocked: 'warning', complete: 'done' }

/**
 * @param {{ goal: object|null|undefined, t: Function }} props
 */
export function GoalHeader({ goal, t }) {
  const snapshot = goal?.goal
  if (snapshot === undefined || snapshot === null) return null
  const Icon = TYPE_ICON.goal
  const phase = typeof snapshot.phase === 'string' ? snapshot.phase : 'active'
  const rounds = Number.isSafeInteger(goal.roundsStarted) && Number.isSafeInteger(snapshot.maxGoalRounds)
    ? t('goal.rounds').replace('{n}', String(goal.roundsStarted)).replace('{max}', String(snapshot.maxGoalRounds))
    : ''
  return h('div', { className: 'npr-goal', 'data-npr': 'goal', 'data-phase': phase },
    h('span', { className: 'npr-icon', 'data-type': 'goal', 'aria-hidden': 'true' }, h(Icon, { size: 14 })),
    h('span', { className: 'npr-goal-objective', title: String(snapshot.objective ?? '') },
      oneLine(String(snapshot.objective ?? ''), 300)),
    h('span', { className: 'npr-goal-meta' },
      h(StateDot, { state: PHASE_DOT[phase] ?? 'idle' }),
      h('span', null, t(`goal.phase.${phase}`)),
      rounds !== '' ? h('span', null, rounds) : null),
    phase === 'blocked' && typeof snapshot.blockedReason?.message === 'string'
      ? h('span', { className: 'npr-goal-blocked', 'data-npr': 'goal-blocked' }, oneLine(snapshot.blockedReason.message, 200))
      : null)
}

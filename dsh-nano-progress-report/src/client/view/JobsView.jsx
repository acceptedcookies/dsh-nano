/** Jobs list — `ctx.jobs.state.rows[sessionId]`, the same service face the
 *  session sidebar reads. Same row metrics as Tasks; the status word is the
 *  only trailing text. */
import React from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { JOB_DOT } from '../icons.js'

const { createElement: h } = React

/**
 * @param {{ jobs: object[], t: Function }} props
 */
export function JobsView({ jobs, t }) {
  if (jobs.length === 0) {
    return h('div', { className: 'npr-empty', 'data-npr': 'jobs-empty' }, t('jobs.empty'))
  }
  return h('div', { className: 'npr-task-list', 'data-npr': 'jobs' },
    jobs.map(job => h('div', {
      key: String(job.id),
      className: 'npr-task npr-job',
      'data-npr': 'job',
      'data-status': job.status,
    },
    h('span', { className: 'npr-task-glyph', 'aria-hidden': 'true' },
      h(StateDot, { state: JOB_DOT[job.status] ?? 'idle' })),
    h('span', { className: 'npr-task-text', title: String(job.label ?? job.kind ?? job.id) },
      String(job.label ?? job.kind ?? job.id)),
    h('span', { className: 'npr-task-state' }, String(job.status ?? '')))))
}

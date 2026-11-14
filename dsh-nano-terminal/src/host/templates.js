// Built-in agent task templates (herdr templates.rs model): pre-canned
// {send,wait} sequences so an agent doesn't hand-roll the same four-step
// lifecycle every time. term.template.run expands + executes.

import { KIND, err } from './errors.js'

export const TEMPLATES = {
  // fire a command, wait for its next turn end (or exit), return screen tail
  'run-command': {
    summary: 'send a command, wait for the turn to finish, return output',
    params: ['cmd', 'timeout?'],
    async run(rec, registry, bus, waitFor, args, timeoutMs) {
      await rec.agentSend(args.cmd, { enter: true })
      const w = await waitFor(rec, registry, bus, { timeoutMs })
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(200, 'recent') }
    },
  },
  // tail a long-running command: wait for an output pattern instead of a turn
  'wait-output': {
    summary: 'send a command, wait for a screen pattern (not a turn end)',
    params: ['cmd', 'output', 'timeout?'],
    async run(rec, registry, bus, waitFor, args, timeoutMs) {
      if (!args.output) throw err(KIND.INVALID, 'wait-output needs {output}')
      await rec.agentSend(args.cmd, { enter: true })
      const w = await waitFor(rec, registry, bus, { output: args.output, timeoutMs })
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(60, 'detection') }
    },
  },
  // REPL loop: send one expression, wait for the prompt line back
  repl: {
    summary: 'send an expression into a running REPL, wait for the next prompt',
    params: ['expr', 'prompt?', 'timeout?'],
    async run(rec, registry, bus, waitFor, args, timeoutMs) {
      const prompt = args.prompt ?? '>'
      await rec.agentSend(args.expr, { enter: true })
      const w = await waitFor(rec, registry, bus, { output: prompt, timeoutMs })
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(40, 'detection') }
    },
  },
}

export function templateList() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, summary: t.summary, params: t.params }))
}

export async function templateRun(rec, registry, bus, waitFor, name, args, timeoutMs) {
  const t = TEMPLATES[name]
  if (!t) throw err(KIND.INVALID, `unknown template '${name}' — see term.template.list`)
  if (rec.exited) throw err(KIND.FINISHED, 'terminal exited')
  return t.run(rec, registry, bus, waitFor, args ?? {}, timeoutMs)
}

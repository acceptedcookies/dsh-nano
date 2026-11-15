/** Async-compaction takeover Provider: mounts as ctx.compaction inside each agent preset's id:compaction isolate realm. */
export const name = 'nano-model-selector-compaction'
// `agents` is deliberately NOT in inject: the id:compaction isolate only
// declares compaction+toolResultPruner, so a static inject of 'agents' throws
// inside preset-standard/ptc/cordis and kills preset composition (the GUI
// reports "tool-office: never started"). ctx.get('agents') resolves lazily
// through the isolate boundary when the agent/status listener needs it.
export const inject = ['llm', 'tokenMeter', 'sessions']
export { default } from './lib/host-compaction.js'

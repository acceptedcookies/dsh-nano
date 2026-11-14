/** Async-compaction takeover Provider: mounts as ctx.compaction inside each agent preset's id:compaction isolate realm. */
export const name = 'nano-model-selector-compaction'
export const inject = ['llm', 'tokenMeter', 'sessions', 'agents']
export { default } from './lib/host-compaction.js'

/** GENERATED FILE — do not edit. Source: dsh-nano-model-selector-compaction.
 *  baked by scripts/bake-compact-shared.mjs from dsh-nano-model-selector-
 *  compaction/lib/compact-region.js (sha256:135c220b56ff).
 *  Browser-safe: no node imports. Re-run the bake after changing the source. */

const SUMMARY_OPEN_TAG = '<compacted-summary>'
const SUMMARY_CLOSE_TAG = '</compacted-summary>'

export const DEFAULT_SUMMARY_PROMPT = [
  'You are now acting as a compaction engine for this AI coding assistant. Condense the conversation ABOVE into a structured checkpoint that lets another model resume the work with no loss of essential context.',
  '',
  'Output EXACTLY the Markdown structure below: keep every section, in order. Use terse bullets, not prose paragraphs. Write "(none)" for an empty section — never drop a section.',
  '',
  '## Primary Request and Intent',
  "- [the user's original and evolving goals; quote verbatim where the exact wording matters]",
  '',
  '## Key Technical Concepts',
  '- [technologies, frameworks, patterns, and conventions in play]',
  '',
  '## Files and Code',
  '- [exact path: why it matters, key changes or snippets]',
  '',
  '## Errors and Fixes',
  '- [error: how it was resolved, plus any related user feedback]',
  '',
  '## Pending Jobs',
  '- [explicitly requested work not yet completed]',
  '',
  '## Current Work',
  '- [precisely what was in progress at this checkpoint]',
  '',
  '## Next Step',
  '- [the single next action, directly in line with the most recent request, or "(none)"]',
  '',
  '## Critical Context',
  '- [decisions and their rationale, constraints, user preferences, open questions, data needed to continue]',
  '',
  'Rules:',
  '- Write concise English engineering prose. Preserve exact file paths, commands, error strings, identifiers, numeric values, function signatures, and syntax fragments.',
  '- Capture user feedback and explicit instructions faithfully, especially corrections.',
  '- Do NOT mention this summarization request or that the context was compacted.',
  '- Output only the checkpoint text: do not call any tool or take any other action.',
  `- If the conversation already contains a ${SUMMARY_OPEN_TAG} block, it is a PRIOR checkpoint. Do not copy it forward verbatim: preserve still-true facts, drop stale ones, and merge newer information into a single consolidated summary under the same structure.`,
].join('\n')

/**
 * Mirror of DNMSC instructionText(options): the instruction actually sent is
 * always the built-in prompt, optionally followed by the fixed
 * 'Additional requirements:' paragraph. Whitespace-only extras append nothing.
 * @param {string|undefined} extra - policy.extraRequirements; empty means none.
 * @returns {string}
 */
export function promptText(extra) {
  return typeof extra === 'string' && extra.length > 0
    ? `${DEFAULT_SUMMARY_PROMPT}\n\nAdditional requirements:\n${extra}`
    : DEFAULT_SUMMARY_PROMPT
}

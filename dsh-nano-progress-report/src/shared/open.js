/** One `user/message` → work-item opener classification shared by the host
 *  ledger and the client event definitions. The wire `source.kind` is the
 *  whole decision, matching the open-item whitelist (user / goal / schedule):
 *  - 'user' → a human-typed prompt;
 *  - 'goal' → a scheduled goal round input (the goal owns the following turns);
 *  - 'schedule' → a scheduled task firing into the session;
 *  - 'restart' / 'fork' / 'agent-message' / 'subagent-settled' / 'team-message'
 *    and everything else → not an opener: resume seeds and agent relays stay
 *    inside the current item.
 *  Returns null for non-openers so both callers keep one if. */
export function openKind(sourceKind) {
  switch (sourceKind) {
    case 'user':
    case 'goal':
    case 'schedule':
      return sourceKind
    default:
      return null
  }
}

/** `user/message` row type for the timeline: 'schedule' keeps its own filter
 *  token and opener look; the rest render as 'prompt'. */
export function openerRowType(sourceKind) {
  return sourceKind === 'schedule' ? 'schedule' : sourceKind === 'goal' ? 'goal' : 'prompt'
}

/** Send-then-clear draft semantics: the composer's draft is released only
 *  after the carrier accepts the message; a rejected post keeps it. */
export async function sendDraft({ post, onSent }) {
  await post()
  onSent?.()
}

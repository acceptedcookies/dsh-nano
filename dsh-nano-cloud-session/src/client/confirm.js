/** Irreversible-action gate for the cloud-session UI (react-free, unit-tested).
 *
 *  Two cloud-session actions cannot be undone from inside the harness:
 *  `terminate` suspends a live Devin session upstream (`DELETE`, the record stays
 *  readable but the run is gone) and removing a credential profile loses a token
 *  that the store never reads back. Both are behind the host
 *  `RiskConfirmation` acknowledgement checkbox; the confirm button stays
 *  disabled and the handler itself refuses to run until the box is checked, so
 *  neither a click nor an Enter keypress can step through it.
 */

/** Whether the acknowledgement checkbox alone allows the irreversible action. */
export function mayTerminate({ acknowledged } = {}) {
  return acknowledged === true
}

/**
 * Run `terminate` only after acknowledgement.
 * @param {object} options
 * @param {boolean} options.acknowledged - state of the RiskConfirmation checkbox.
 * @param {() => unknown} options.terminate - the irreversible call.
 * @returns {Promise<boolean>} whether the action ran.
 */
export async function runTerminate({ acknowledged, terminate } = {}) {
  if (!mayTerminate({ acknowledged })) return false
  if (typeof terminate !== 'function') return false
  await terminate()
  return true
}

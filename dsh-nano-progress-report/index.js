/** Host half. DNPR is a pure client plugin: no routes, no host state, no
 *  credentials. The browser bundle (lib/client.js) carries the entire
 *  implementation; this entry only declares the plugin identity so the host
 *  applies cordis.patch.yml correctly. */

export const name = 'nano-progress-report'
export const inject = []

/**
 * @param {object} ctx - cordis host context (unused: nothing lives host-side).
 */
export function apply() {}

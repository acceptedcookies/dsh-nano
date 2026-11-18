#!/usr/bin/env node
/** Live pairing E2E. Explicit opt-in only. Never runs from `npm test`.
 *  Required: DNCS_LIVE_WORKSPACE=1 DNCS_PROBE_SESSION=devin-… DNCS_ACCEPT_HOSTKEY=1 (first time)
 */
if (process.env.DNCS_LIVE_WORKSPACE !== '1') {
  console.error('not-run: set DNCS_LIVE_WORKSPACE=1 to execute this script')
  process.exit(2)
}
const { spawn } = await import('node:child_process')
const session = process.env.DNCS_PROBE_SESSION
if (!session) {
  console.error('DNCS_PROBE_SESSION is required')
  process.exit(2)
}
const child = spawn(process.execPath, [new URL('./probe-devin-workspace.mjs', import.meta.url).pathname], {
  stdio: 'inherit',
  env: process.env,
})
child.on('exit', code => process.exit(code ?? 1))

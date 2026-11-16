#!/usr/bin/env node
/**
 * smoke-web.mjs — optional post-deploy liveness probe for this plugin's web
 * routes. Data-driven from the baked `lib/bindings.js`, so it can never drift
 * from the shipped route table.
 *
 * Usage:  node scripts/smoke-web.mjs [baseUrl]
 *   baseUrl defaults to $DSH_SMOKE_BASE or https://dsh-dev.local
 *
 * Every binding path is probed once. Expected statuses: anything EXCEPT 404
 * (unauthenticated probes get 401 from requestRejection; malformed probes get
 * 400/405 — all prove the route is registered and its guard is live). 404
 * means the host lost the registration — the exact shape of the 2026-11-16
 * CF1115 regression where createWebRegistrar disposed the whole batch in the
 * same tick it registered it.
 *
 * TLS: local dev hosts (dsh-dev.local) use mkcert-style local CAs Node does
 * not trust; self-signed/local-cert errors are tolerated automatically —
 * the probe only cares whether the ROUTE exists, not the cert chain.
 *
 * Exit code 0 when all routes are live, 1 when any 404s — so it can be pasted
 * into a shell after a redeploy. It is an optional operator tool, never wired
 * into installs or release flow (AGENTS.md: 不得过度仪式).
 */
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'

import { BINDING_TABLE } from '../lib/bindings.js'

const base = (process.argv[2] ?? process.env.DSH_SMOKE_BASE ?? 'https://dsh-dev.local').replace(/\/+$/, '')
const url = new URL(base)
const doRequest = url.protocol === 'https:' ? httpsRequest : httpRequest

function probe(method, path) {
  return new Promise((resolve) => {
    const req = doRequest(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path,
        method,
        // Local dev certs are intentionally untrusted; route liveness is the
        // only signal this probe reads. Never send credentials here.
        rejectUnauthorized: false,
        timeout: 5000,
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode))
      },
    )
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT') })
    req.on('error', (error) => resolve(`ERR ${error?.code ?? 'failed'}`))
    req.end()
  })
}

let dead = 0
for (const row of BINDING_TABLE) {
  if (row.channel === 'upgrade') { console.log(`- SKIP\tGET ${row.path} (upgrade)`) ; continue }
  const method = row.methods?.[0] ?? 'GET'
  const status = await probe(method, row.path)
  const gone = status === 404 || String(status).startsWith('ERR') || status === 'TIMEOUT'
  if (gone) dead++
  console.log(`${gone ? '✗' : '✓'} ${status}\t${method} ${row.path}`)
}

console.log(`\n${BINDING_TABLE.length - dead}/${BINDING_TABLE.length} routes live on ${base}`)
process.exit(dead === 0 ? 0 : 1)

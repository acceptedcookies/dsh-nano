#!/usr/bin/env node
/** Local operator diagnostic. Container privilege stays in backend-apple. */
import { createAppleBackend } from '../src/host/backend-apple.js'
const [action, name, ...args] = process.argv.slice(2)
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name || '')) throw new Error('an explicit container name is required')
const backend = createAppleBackend()
if (action === 'inspect') console.log((await backend.inspect(name)).raw)
else if (action === 'stats') console.log(JSON.stringify(await backend.stats(name)))
else if (action === 'exec') console.log((await backend.execOutput(name, args)).text)
else if (action === 'logs') console.log((await backend.logs(name, { tail: 100 })).text)
else throw new Error('supported read diagnostics: inspect, stats, logs, exec')

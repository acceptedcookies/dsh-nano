import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { ROUTE_TABLE } from '../lib/route-table.js'

test('HTTP routes are declared for registerRoutes and not registered directly', () => {
  const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
  assert.equal(source.includes('registerRoutes(ctx,'), true)
  assert.equal(source.includes('ctx.webServer.register('), false)
  assert.equal(source.includes('ctx.webServer.registerUpgrade('), true)
  assert.deepEqual(ROUTE_TABLE.map((row) => row.path).sort(), [
    '/dsh-nano-terminal/events',
    '/dsh-nano-terminal/health',
    '/dsh-nano-terminal/mcp',
    '/dsh-nano-terminal/session',
    '/dsh-nano-terminal/sessions',
  ])
})

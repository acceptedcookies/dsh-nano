/**
 * Performance-declaration validator (T-O-PRE1116-09).
 * Pure: no I/O. A bad declaration throws. This module does not build a report.
 */

import { NAME_RE, CONTRACT_KEY_RE } from './state.js'

export const DECLARATION_SCHEMA = 'dnpr.declaration/1'

const TOP_KEYS = new Set(['schema', 'plugin', 'keys', 'buckets', 'contract', 'scenarios', 'budgets'])
const KEY_FIELDS = new Set(['spans', 'tracks', 'usage', 'hostSpans'])
const RULES = new Set(['max', 'min', 'eq', 'relBaseline'])
const GATES = new Set(['hard', 'audit'])

function fail(message) {
  throw new TypeError(`declaration: ${message}`)
}

function isPlain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertName(name, label) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) fail(`${label} must match the manual name rule`)
}

function validateKeys(keys) {
  if (!isPlain(keys)) fail('keys must be an object')
  for (const key of Object.keys(keys)) {
    if (!KEY_FIELDS.has(key)) fail(`unknown keys field ${key}`)
  }
  if (keys.spans !== undefined) {
    if (!Array.isArray(keys.spans)) fail('keys.spans must be an array')
    for (const name of keys.spans) assertName(name, 'keys.spans')
  }
  if (keys.usage !== undefined) {
    if (!Array.isArray(keys.usage)) fail('keys.usage must be an array')
    for (const name of keys.usage) assertName(name, 'keys.usage')
  }
  if (keys.hostSpans !== undefined) {
    if (!Array.isArray(keys.hostSpans)) fail('keys.hostSpans must be an array')
    for (const name of keys.hostSpans) assertName(name, 'keys.hostSpans')
  }
  if (keys.tracks !== undefined) {
    if (!Array.isArray(keys.tracks)) fail('keys.tracks must be an array')
    for (const track of keys.tracks) {
      if (!isPlain(track)) fail('keys.tracks entry must be an object')
      for (const key of Object.keys(track)) {
        if (key !== 'name' && key !== 'kind') fail(`unknown track field ${key}`)
      }
      assertName(track.name, 'keys.tracks.name')
      assertName(track.kind, 'keys.tracks.kind')
    }
  }
}

function validateBuckets(buckets) {
  if (!Array.isArray(buckets)) fail('buckets must be an array')
  for (const bucket of buckets) {
    if (!isPlain(bucket)) fail('buckets entry must be an object')
    for (const key of Object.keys(bucket)) {
      if (key !== 'attr' && key !== 'bucket') fail(`unknown bucket field ${key}`)
    }
    if (typeof bucket.attr !== 'string' || bucket.attr.length === 0) fail('buckets.attr')
    if (typeof bucket.bucket !== 'string' || bucket.bucket.length === 0) fail('buckets.bucket')
  }
}

function validateContract(contract) {
  if (!Array.isArray(contract)) fail('contract must be an array')
  for (const id of contract) {
    if (typeof id !== 'string' || !CONTRACT_KEY_RE.test(id)) fail('contract id')
  }
}

function validateScenarios(scenarios) {
  if (!Array.isArray(scenarios)) fail('scenarios must be an array')
  for (const scenario of scenarios) {
    if (!isPlain(scenario)) fail('scenarios entry must be an object')
    for (const key of Object.keys(scenario)) {
      if (key !== 'id' && key !== 'driver') fail(`unknown scenario field ${key}`)
    }
    if (typeof scenario.id !== 'string' || scenario.id.length === 0) fail('scenarios.id')
    if (typeof scenario.driver !== 'string' || scenario.driver.length === 0) fail('scenarios.driver')
  }
}

function validateRule(rule) {
  if (!isPlain(rule)) fail('budgets.rule must be an object')
  for (const key of Object.keys(rule)) {
    if (!['op', 'limit', 'factor', 'floor', 'initial'].includes(key)) fail(`unknown rule field ${key}`)
  }
  if (!RULES.has(rule.op)) fail(`unknown rule ${String(rule.op)}`)
  if (rule.op === 'relBaseline') {
    for (const key of ['factor', 'floor', 'initial']) {
      if (typeof rule[key] !== 'number' || !Number.isFinite(rule[key])) fail(`relBaseline.${key}`)
    }
  } else if (typeof rule.limit !== 'number' || !Number.isFinite(rule.limit)) {
    fail(`${rule.op} requires limit`)
  }
}

function validateBudgets(budgets) {
  if (!Array.isArray(budgets)) fail('budgets must be an array')
  for (const budget of budgets) {
    if (!isPlain(budget)) fail('budgets entry must be an object')
    for (const key of Object.keys(budget)) {
      if (!['id', 'scenario', 'subject', 'rule', 'gate', 'minSamples'].includes(key)) {
        fail(`unknown budget field ${key}`)
      }
    }
    if (typeof budget.id !== 'string' || budget.id.length === 0) fail('budgets.id')
    if (typeof budget.subject !== 'string' || budget.subject.length === 0) fail('budgets.subject')
    if (budget.scenario !== undefined && typeof budget.scenario !== 'string') fail('budgets.scenario')
    if (!GATES.has(budget.gate)) fail('budgets.gate')
    if (budget.minSamples !== undefined) {
      if (!Number.isInteger(budget.minSamples) || budget.minSamples < 0) fail('budgets.minSamples')
    }
    validateRule(budget.rule)
  }
}

/**
 * Validate one declaration. Throws on failure. Returns `value` on success.
 * Does not read the filesystem and does not return a report.
 * @param {object} value
 */
export function validateDeclaration(value) {
  if (!isPlain(value)) fail('must be an object')
  for (const key of Object.keys(value)) {
    if (!TOP_KEYS.has(key)) fail(`unknown field ${key}`)
  }
  if (value.schema !== DECLARATION_SCHEMA) fail('schema')
  if (typeof value.plugin !== 'string' || value.plugin.length === 0) fail('plugin')
  if (value.keys !== undefined) validateKeys(value.keys)
  if (value.buckets !== undefined) validateBuckets(value.buckets)
  if (value.contract !== undefined) validateContract(value.contract)
  if (value.scenarios !== undefined) validateScenarios(value.scenarios)
  if (value.budgets !== undefined) validateBudgets(value.budgets)
  return value
}

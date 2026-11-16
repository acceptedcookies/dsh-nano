/**
 * Declarations are the single authored source for lab scenarios and budgets
 * (T-O-PRE1116-09.8). This module is I/O at the lab boundary only: it reads
 * each plugin's src/perf/declaration.json, validates it, and hands the list to
 * the runner, the scenario generator, and diagnose().
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateDeclaration } from '../packages/dsh-performance-review/src/declaration.js'

const LAB = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(LAB, '..')

/** Page-level scenarios stay in the lab; they do not belong to one plugin. */
export const PAGE_SCENARIOS = Object.freeze(['idle-10s', 'composer-type', 'observer-purity'])

/** Every plugin that ships a declaration, in a stable order. */
export const DECLARATION_PLUGINS = Object.freeze([
  'dsh-nano-explorer-extra',
  'dsh-nano-notepad',
  'dsh-nano-model-selector',
  'dsh-nano-cloud-session',
  'dsh-nano-terminal',
  'dsh-nano-local-sandbox',
  'dsh-nano-kitesurf',
])

/**
 * Read + validate every declaration. Throws when one is missing or invalid:
 * a lab run must never silently judge against a partial rule set.
 */
export function loadDeclarations() {
  const out = []
  for (const dir of DECLARATION_PLUGINS) {
    const path = join(ROOT, dir, 'src', 'perf', 'declaration.json')
    if (!existsSync(path)) throw new Error(`declaration missing: ${dir}`)
    out.push(validateDeclaration(JSON.parse(readFileSync(path, 'utf8'))))
  }
  return out
}

/**
 * Scenario list = page-level scenarios, then each declaration's scenarios in
 * declaration order. No plugin scenario id is written in lab source.
 */
export function scenarioList(declarations = loadDeclarations()) {
  const seen = new Set(PAGE_SCENARIOS)
  const out = [...PAGE_SCENARIOS]
  for (const declaration of declarations) {
    for (const scenario of declaration.scenarios ?? []) {
      if (seen.has(scenario.id)) throw new Error(`duplicate scenario id ${scenario.id}`)
      seen.add(scenario.id)
      out.push(scenario.id)
    }
  }
  return out
}

/** Absolute path of the driver module for a plugin scenario, or null. */
export function driverFor(scenario, declarations = loadDeclarations()) {
  for (const declaration of declarations) {
    for (const item of declaration.scenarios ?? []) {
      if (item.id === scenario) return resolve(ROOT, item.driver)
    }
  }
  return null
}

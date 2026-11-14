import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function historyFile(volume) {
  return join(volume, 'history.json')
}

export function readHistory(volume) {
  const file = historyFile(volume)
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, 'utf8'))
}

export function appendHistory(volume, row) {
  mkdirSync(volume, { recursive: true })
  const rows = readHistory(volume)
  rows.push(row)
  writeFileSync(historyFile(volume), JSON.stringify(rows))
  return readHistory(volume).length
}

export function foreignHistoryFiles(volume) {
  if (!existsSync(volume)) return []
  const found = []
  for (const name of readdirSync(volume)) {
    if (name !== 'history.json') found.push(name)
  }
  return found
}

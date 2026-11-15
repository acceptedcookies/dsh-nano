/** Browser-local preferences for the cloud-session section. Credentials never
 *  live here; only creation defaults and list display choices. */
const KEY = 'dsh-nano-cloud-session:defaults.v1'

export const DEFAULT_PREFS = {
  devinMode: 'normal',
  maxAcuLimit: '',
  tags: '',
  playbookId: '',
  repos: '',
  pollIntervalMs: 30000,
  showArchived: false,
}

export function readPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '')
    return { ...DEFAULT_PREFS, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function writePrefs(next) {
  localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT_PREFS, ...next }))
}

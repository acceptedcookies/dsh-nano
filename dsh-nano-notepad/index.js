/** Host half. Notes stay in the browser database, so this side only supplies defaults. */

export const name = 'nano-notepad'

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-notepad',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const number = (key, fallback, min, max) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          return { issue: `${key} must be an integer from ${min} to ${max}` }
        }
        return candidate
      }
      const fields = {
        saveDelayMs: number('saveDelayMs', 800, 200, 5000),
        commitIntervalSec: number('commitIntervalSec', 60, 15, 3600),
        versionLimit: number('versionLimit', 50, 5, 500),
        imageLimitBytes: number('imageLimitBytes', 5 * 1024 * 1024, 256 * 1024, 20 * 1024 * 1024),
      }
      const issues = Object.entries(fields)
        .filter(([, field]) => field && field.issue)
        .map(([, field]) => ({ message: field.issue }))
      if (issues.length > 0) return { issues }
      const view = source.defaultView ?? 'rendered'
      const theme = source.theme ?? 'system'
      if (view !== 'rendered' && view !== 'source') issues.push({ message: 'defaultView must be rendered or source' })
      if (!['dark', 'light', 'system'].includes(theme)) issues.push({ message: 'theme must be dark, light, or system' })
      if (issues.length > 0) return { issues }
      return {
        value: {
          saveDelayMs: fields.saveDelayMs,
          commitIntervalSec: fields.commitIntervalSec,
          versionLimit: fields.versionLimit,
          imageLimitBytes: fields.imageLimitBytes,
          defaultView: view,
          theme,
        },
      }
    },
  },
}

export function apply() {}

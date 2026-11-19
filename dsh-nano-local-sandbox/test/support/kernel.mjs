import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProfileDriver } from '../../src/host/profile-drivers.js'
import { registerDriverErrors } from '../../src/host/error-catalog.js'

/** The real profile, loaded through the kernel loader, errors registered. */
export const PROFILE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'profiles', 'kitesurf')
export const loaded = await loadProfileDriver(PROFILE_DIR)
if (!loaded.ready) throw new Error(`profile fixture invalid: ${loaded.errors.join(', ')}`)
if (loaded.driver?.errors) registerDriverErrors(loaded.driver.errors)
export const driver = loaded.driver
export const profile = loaded.manifest

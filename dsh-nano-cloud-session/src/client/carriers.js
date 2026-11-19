/** Declarative carrier presets. Display ids come from providers/devin/display.js
 *  so this file is not a second provider identity or capability list. */
import { DISPLAY, PROVIDER_KEY } from '../providers/devin/display.js'

export const CARRIER_PRESETS = [
  {
    id: 'devin-cloud-session',
    carrier: PROVIDER_KEY,
    providerKey: PROVIDER_KEY,
    labelKey: 'carrierDevin',
    descriptionKey: 'carrierDevinDescription',
    auth: {
      kind: 'service-user-pat',
      tokenPrefix: 'cog_',
      defaultBaseUrl: DISPLAY.defaultBaseUrl,
    },
    docs: {
      api: 'https://app.devin.ai/settings/api',
      org: 'https://app.devin.ai/settings',
      ssh: 'https://app.devin.ai/settings/ssh',
    },
    onboardingSteps: ['guideStep1', 'guideStep2', 'guideStep3'],
  },
]

export const DEVIN_PRESET = CARRIER_PRESETS[0]

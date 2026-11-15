/** Declarative carrier presets. Devin is the first cloud-session carrier;
 *  a second carrier adds one object here (and a matching host adapter), not a
 *  second onboarding screen. */
export const CARRIER_PRESETS = [
  {
    id: 'devin-cloud-session',
    carrier: 'devin',
    labelKey: 'carrierDevin',
    descriptionKey: 'carrierDevinDescription',
    auth: {
      kind: 'service-user-pat',
      tokenPrefix: 'cog_',
      defaultBaseUrl: 'https://api.devin.ai',
    },
    docs: {
      api: 'https://app.devin.ai/settings/api',
      org: 'https://app.devin.ai/settings',
      ssh: 'https://app.devin.ai/settings/ssh',
    },
    capabilities: [
      'sessions', 'messages', 'attachments', 'upload', 'tags',
      'insights', 'sleep', 'playbooks', 'secrets', 'knowledge', 'repositories',
    ],
    onboardingSteps: ['guideStep1', 'guideStep2', 'guideStep3'],
  },
]

export const DEVIN_PRESET = CARRIER_PRESETS[0]

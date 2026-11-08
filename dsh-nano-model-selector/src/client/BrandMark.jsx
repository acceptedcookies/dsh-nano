/** Provider artwork for the rail and model rows. SVGs come from Magpie's embedded logo set. */

import * as React from 'react'
import deepseek from './logos/DeepSeek.svg'
import mistral from './logos/Mistral.svg'
import cursor from './logos/Cursor.svg'
import devin from './logos/Devin.svg'
import copilot from './logos/GithubCopilot.svg'
import gemini from './logos/Gemini-CLI.svg'
import workbuddy from './logos/WorkBuddy.png'
import magpie from './logos/Magpie.png'
import { RouteIcon } from './icons.jsx'

const SVG_LOGOS = {
  'deepseek-official': deepseek,
  'deepseek-account': deepseek,
  deepseek,
  mistral,
  cursor,
  devin,
  copilot,
  githubcopilot: copilot,
  gemini,
  geminicli: gemini,
}

const IMAGE_LOGOS = {
  workbuddy,
  magpie,
}

/** @param {{ brandKey: string, brandName: string, className?: string }} props */
export function BrandMark({ brandKey, brandName, className }) {
  const svg = SVG_LOGOS[brandKey]
  if (svg !== undefined) {
    return (
      <span
        className={`nms-provider-logo${className ? ` ${className}` : ''}`}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }
  const image = IMAGE_LOGOS[brandKey]
  if (image !== undefined) {
    return (
      <span className={`nms-provider-logo${className ? ` ${className}` : ''}`} aria-hidden="true">
        <img src={image} alt="" />
      </span>
    )
  }
  if (brandKey === 'auto') {
    return (
      <span className={`nms-provider-logo nms-provider-logo-route${className ? ` ${className}` : ''}`} aria-hidden="true">
        <RouteIcon size={18} />
      </span>
    )
  }
  return <span className={`nms-provider-mark${className ? ` ${className}` : ''}`}>{initialsOf(brandName)}</span>
}

/** @param {string} name */
function initialsOf(name) {
  const words = String(name ?? '')
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .split(/\s+/u)
    .filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return (words[0]?.slice(0, 2) || '?').toUpperCase()
}

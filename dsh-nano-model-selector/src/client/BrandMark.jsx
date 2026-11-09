/** Provider artwork for the rail and model rows. SVGs come from Magpie's embedded logo set. */

import * as React from 'react'
import deepseek from './logos/DeepSeek.svg'
import mistral from './logos/Mistral.svg'
import cursor from './logos/Cursor.svg'
import devin from './logos/Devin.svg'
import copilot from './logos/GithubCopilot.svg'
import gemini from './logos/Gemini-CLI.svg'
import grok from './logos/grok.svg'
import codex from './logos/codex.svg'
import anthropic from './logos/anthropic.svg'
import claude from './logos/claude.svg'
import openai from './logos/openai.svg'
import google from './logos/google.svg'
import qwen from './logos/qwen.svg'
import kimi from './logos/kimi.svg'
import moonshot from './logos/moonshotai.svg'
import doubao from './logos/doubao.svg'
import zhipu from './logos/zhipu.svg'
import minimax from './logos/minimax.svg'
import openrouter from './logos/openrouter.svg'
import siliconflow from './logos/siliconcloud.svg'
import volcengine from './logos/volcengine.svg'
import azure from './logos/azure.svg'
import aws from './logos/aws.svg'
import vertexai from './logos/vertexai.svg'
import ollama from './logos/ollama.svg'
import lmstudio from './logos/lm-studio.svg'
import vllm from './logos/vllm.svg'
import fireworks from './logos/fireworks.svg'
import cerebras from './logos/cerebras.svg'
import sambanova from './logos/sambanova.svg'
import groq from './logos/groq.svg'
import together from './logos/together-ai.svg'
import deepinfra from './logos/deepinfra.svg'
import cohere from './logos/cohere.svg'
import perplexity from './logos/perplexity.svg'
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
  grok,
  xai: grok,
  codex,
  anthropic,
  claude,
  'claude-code': claude,
  openai,
  google,
  qwen,
  kimi,
  moonshot,
  doubao,
  zhipu,
  minimax,
  openrouter,
  siliconflow,
  siliconcloud: siliconflow,
  volcengine,
  azure,
  azureai: azure,
  aws,
  bedrock: aws,
  vertexai,
  ollama,
  lmstudio,
  vllm,
  fireworks,
  cerebras,
  sambanova,
  groq,
  together,
  deepinfra,
  cohere,
  perplexity,
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

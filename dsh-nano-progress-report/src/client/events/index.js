/** Register all Progress event Definitions + the 'progress' view target. */
import { TARGET } from '../constants.js'
import { progressToolDefinition } from './tool.js'
import { progressAgentMessageDefinition, progressAssistantDefinition, progressPromptDefinition } from './message.js'
import { progressApprovalDefinition, progressGoalChangeDefinition, progressLifecycleDefinition, progressTurnDefinition } from './turn.js'
import { progressJobDefinition, progressTodoDefinition } from './job.js'
import { ProgressBuilder } from '../view/progress-builder.js'

const DEFINITIONS = [
  progressPromptDefinition,
  progressAgentMessageDefinition,
  progressAssistantDefinition,
  progressToolDefinition,
  progressTodoDefinition,
  progressTurnDefinition,
  progressJobDefinition,
  progressApprovalDefinition,
  progressGoalChangeDefinition,
  progressLifecycleDefinition,
]

/**
 * @param {object} ctx - cordis client context (needs ctx.uiConversation).
 * @returns {() => void} disposer tearing down definitions and the view target.
 */
export function registerProgressProjection(ctx) {
  const disposers = DEFINITIONS.map(definition => ctx.uiConversation.events.register(definition))
  disposers.push(ctx.uiConversation.views.register({ target: TARGET, create: () => new ProgressBuilder() }))
  return () => { for (const dispose of disposers.splice(0)) dispose() }
}

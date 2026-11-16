/**
 * dsh-interface/contracts — 纯定义出口。
 * 无 I/O / 无 node:* / 无 DOM / 无 Cordis / 无可变 store。
 */
export {
  BindingError,
  CHANNEL,
  MATCH,
  normalizeBinding,
  normalizeBindings,
  bindingRecord,
} from './webBinding.js'
export {
  FAILURE_KIND,
  FAILURE_KINDS,
  isFailureKind,
  ok,
  failure,
  isFailure,
  isOk,
} from './jsonOutcome.js'
export {
  OBSERVE_SURFACES,
  HTTP_OUTCOMES,
  UPGRADE_OUTCOMES,
  JSON_OUTCOMES,
  MCP_OUTCOMES,
  OBSERVE_FIELDS,
  assertObserveEvent,
} from './observeEvent.js'
export {
  FamilyError,
  defineFamily,
  selectOperation,
  projectWebTable,
  projectOperations,
  projectService,
} from './FamilyDefinition.js'

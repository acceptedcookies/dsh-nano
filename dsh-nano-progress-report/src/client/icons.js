/** Icon facade — every glyph comes from the host primitives catalog
 *  (`packages/dsh-nano-ui/catalog/icons.json`). No hand-drawn SVG, no unicode
 *  stand-ins: an unmapped type falls back to a catalog icon, never to text.
 *  Color lives in styles.js (`--dsw-alias-*`), not in the glyph. */
import {
  IconChecklistOutlineRegular,
  IconClockOutlineRegular,
  IconCodeOutlineRegular,
  IconDeliverDocRegular,
  IconGoalOutlineRegular,
  IconGlobeOutlineRegular,
  IconInfoOutlineRegular,
  IconPlayOutlineRegular,
  IconQueueOutlineRegular,
  IconSlidersTwoOutlineRegular,
  IconSparkleRegular,
  IconUserOutlineRegular,
  IconUsersOutlineRegular,
  IconWarningOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** Row type → catalog icon. Keys mirror `constants.js` TYPES. */
export const TYPE_ICON = {
  prompt: IconUserOutlineRegular,
  goal: IconGoalOutlineRegular,
  message: IconSparkleRegular,
  shell: IconCodeOutlineRegular,
  file: IconDeliverDocRegular,
  web: IconGlobeOutlineRegular,
  tool: IconSlidersTwoOutlineRegular,
  todo: IconChecklistOutlineRegular,
  subagent: IconUsersOutlineRegular,
  wait: IconClockOutlineRegular,
  turn: IconPlayOutlineRegular,
  job: IconQueueOutlineRegular,
  lifecycle: IconInfoOutlineRegular,
}

/** Failure mark shown in a row's trailing accessory. */
export const FAIL_ICON = IconWarningOutlineRegular

/** Unknown types still get a real glyph (never the raw kind string). */
export const FALLBACK_ICON = IconInfoOutlineRegular

/** Job status → host `StateDot` state. */
export const JOB_DOT = {
  running: 'ongoing',
  stopping: 'warning',
  completed: 'done',
  killed: 'error',
  failed: 'error',
}

/** Minimal zh/en copy table. Keyed lookups, en fallback.
 *  Every user-visible string in the panel comes from here — the row renderer
 *  receives `t` and never inlines copy. */

const ZH = {
  'view.progress': 'Progress',
  'view.progressDesc': '执行事件时间轴与任务追踪',
  'menu.openProgress': '打开 Progress',
  'action.openProgress': '在右侧栏打开 Progress',

  'filter.placeholder': '搜索或过滤 (type:shell, -status:failed)…',
  'filter.clear': '清除过滤',

  'flow.list': '执行事件',
  'flow.loadOlder': '加载更早的事件',
  'flow.loadingOlder': '加载中…',
  'flow.empty': '暂无执行事件',
  'flow.emptyFiltered': '没有匹配过滤条件的事件',

  'time.now': '刚刚',
  'time.minutes': '{n} 分钟',
  'time.hours': '{n} 小时',
  'time.days': '{n} 天',
  'time.months': '{n} 个月',
  'time.years': '{n} 年',

  'detail.args': '参数',
  'detail.result': '结果',
  'detail.error': '错误',
  'detail.reasoning': '思考',
  'detail.duration': '耗时',
  'detail.truncated': '结果已截断（共 {n} 字符，完整输出在会话记录中）',
  'detail.job': '后台',

  'status.failed': '失败',
  'toolbar.matched': '{n}/{total}',

  'drawer.tasks': 'Tasks',
  'drawer.jobs': 'Jobs',
  'drawer.resize': '调整面板高度',

  'tasks.done': 'done',
  'tasks.completed': '完成',
  'tasks.empty': '暂无任务',
  'jobs.empty': '暂无后台任务',

  'session.unavailable': '会话不可用',
}

const EN = {
  'view.progress': 'Progress',
  'view.progressDesc': 'Execution timeline and task tracking',
  'menu.openProgress': 'Open Progress',
  'action.openProgress': 'Open Progress in the sidebar',

  'filter.placeholder': 'Search or filter (type:shell, -status:failed)…',
  'filter.clear': 'Clear filter',

  'flow.list': 'Execution events',
  'flow.loadOlder': 'Load older events',
  'flow.loadingOlder': 'Loading…',
  'flow.empty': 'No execution events yet',
  'flow.emptyFiltered': 'No events match the current filter',

  'time.now': 'now',
  'time.minutes': '{n}m',
  'time.hours': '{n}h',
  'time.days': '{n}d',
  'time.months': '{n}mo',
  'time.years': '{n}y',

  'detail.args': 'args',
  'detail.result': 'result',
  'detail.error': 'error',
  'detail.reasoning': 'reasoning',
  'detail.duration': 'duration',
  'detail.truncated': 'result truncated ({n} chars; the full output is in the session log)',
  'detail.job': 'background',

  'status.failed': 'Failed',
  'toolbar.matched': '{n}/{total}',

  'drawer.tasks': 'Tasks',
  'drawer.jobs': 'Jobs',
  'drawer.resize': 'Resize panel',

  'tasks.done': 'done',
  'tasks.completed': 'completed',
  'tasks.empty': 'No tasks',
  'jobs.empty': 'No background jobs',

  'session.unavailable': 'Session unavailable',
}

/**
 * @param {() => string} active - current locale id ('zh', 'en', …).
 * @returns {(key: string) => string}
 */
export function makeI18n(active) {
  return key => {
    const dict = active() === 'zh' ? ZH : EN
    return dict[key] ?? EN[key] ?? key
  }
}

/** Exported for the copy-parity test (zh/en key sets must stay identical). */
export const DICTIONARIES = { zh: ZH, en: EN }

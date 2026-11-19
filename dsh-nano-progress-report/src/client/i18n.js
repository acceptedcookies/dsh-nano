/** Minimal zh/en copy table. Keyed lookups, en fallback.
 *  Every user-visible string in the panel comes from here — the row renderer
 *  receives `t` and never inlines copy. */

const ZH = {
  'view.progress': 'Progress',
  'view.progressDesc': '执行事件时间轴与任务追踪',
  'menu.openProgress': '打开 Progress',

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

  'status.events': '{n} 个事件',
  'status.failedCount': '{n} 个失败',
  'status.failed': '失败',

  'toolbar.events': '{n} 个事件',
  'toolbar.matched': '{n}/{total}',

  'state.idle': '等待指令',
  'state.running': '运行中',
  'state.awaiting': '等待确认',

  'drawer.views': '面板视图',
  'drawer.tasks': 'Tasks',
  'drawer.jobs': 'Jobs',
  'drawer.resize': '调整面板高度',
  'drawer.expand': '展开面板',
  'drawer.collapse': '收起面板',

  'tasks.title': 'Tasks',
  'tasks.empty': '暂无任务',
  'tasks.done': 'done',
  'tasks.status.completed': '已完成',
  'tasks.status.in_progress': '进行中',
  'tasks.status.pending': '待办',

  'jobs.title': 'Jobs',
  'jobs.empty': '暂无后台任务',

  'session.unavailable': '会话不可用',
}

const EN = {
  'view.progress': 'Progress',
  'view.progressDesc': 'Execution timeline and task tracking',
  'menu.openProgress': 'Open Progress',

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

  'status.events': '{n} events',
  'status.failedCount': '{n} failed',
  'status.failed': 'Failed',

  'toolbar.events': '{n} events',
  'toolbar.matched': '{n}/{total}',

  'state.idle': 'Awaiting instructions',
  'state.running': 'Running',
  'state.awaiting': 'Awaiting approval',

  'drawer.views': 'Panel view',
  'drawer.tasks': 'Tasks',
  'drawer.jobs': 'Jobs',
  'drawer.resize': 'Resize panel',
  'drawer.expand': 'Expand panel',
  'drawer.collapse': 'Collapse panel',

  'tasks.title': 'Tasks',
  'tasks.empty': 'No tasks',
  'tasks.done': 'done',
  'tasks.status.completed': 'Completed',
  'tasks.status.in_progress': 'In progress',
  'tasks.status.pending': 'Pending',

  'jobs.title': 'Jobs',
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

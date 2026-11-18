/** Minimal zh/en copy table. Keyed lookups, en fallback. */

const ZH = {
  'view.progress': 'Progress',
  'view.progressDesc': '执行事件时间轴与任务追踪',
  'head.refresh': '刷新',
  'filter.placeholder': '搜索或过滤 (type:shell, -status:failed)…',
  'filter.clear': '清除',
  'flow.loadOlder': '加载更早的事件',
  'flow.loadingOlder': '加载中…',
  'flow.empty': '暂无执行事件',
  'flow.emptyFiltered': '没有匹配过滤条件的事件',
  'row.expand': '展开',
  'row.collapse': '收起',
  'status.ok': '完成',
  'status.failed': '失败',
  'status.running': '运行中',
  'status.awaiting': '等待中',
  'tasks.title': 'Tasks',
  'tasks.empty': '暂无任务',
  'tasks.done': 'done',
  'jobs.title': 'Jobs',
  'jobs.empty': '暂无后台任务',
  'state.idle': '等待指令',
  'state.running': '运行中',
  'session.unavailable': '会话不可用',
  'menu.openProgress': '打开 Progress',
}

const EN = {
  'view.progress': 'Progress',
  'view.progressDesc': 'Execution timeline and task tracking',
  'head.refresh': 'Refresh',
  'filter.placeholder': 'Search or filter (type:shell, -status:failed)…',
  'filter.clear': 'Clear',
  'flow.loadOlder': 'Load older events',
  'flow.loadingOlder': 'Loading…',
  'flow.empty': 'No execution events yet',
  'flow.emptyFiltered': 'No events match the current filter',
  'row.expand': 'Expand',
  'row.collapse': 'Collapse',
  'status.ok': 'OK',
  'status.failed': 'Failed',
  'status.running': 'Running',
  'status.awaiting': 'Awaiting',
  'tasks.title': 'Tasks',
  'tasks.empty': 'No tasks',
  'tasks.done': 'done',
  'jobs.title': 'Jobs',
  'jobs.empty': 'No background jobs',
  'state.idle': 'Awaiting instructions',
  'state.running': 'Running',
  'session.unavailable': 'Session unavailable',
  'menu.openProgress': 'Open Progress',
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

import * as React from 'react'

/**
 * Slot render boundary shared by the selector seat and any panel-spawned
 * overlay (e.g. the compaction history dialog opened from CompactPanel).
 * A throw inside a panel used to escape to the slot system, which unmounted
 * the whole seat — the selector just vanished on click. Catching here keeps
 * the seat alive and shows the error as visible text so a reproduction
 * report carries the actual message instead of "it disappeared".
 */
export class SlotBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('[nano-model-selector] slot render failed:', error) }
  render() {
    if (this.state.error === null) return this.props.children
    return (
      <span className="nms-trigger nms-trigger-open" style={{ fontSize: '12px', padding: '0 8px' }}>
        ⚠ {String(this.state.error?.message ?? this.state.error)}
      </span>
    )
  }
}

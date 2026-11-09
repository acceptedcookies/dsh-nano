/** The plugin's own settings page, rendered inside the Plugins settings section. */

import React from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { DEFAULT_PREFS } from './prefs.js'

/**
 * One switch row.
 * @param props - label, hint, checked state, and the writer.
 * @returns the row.
 */
function Row({ label, hint, checked, onChange, warn }) {
  return React.createElement('div', { className: 'nxe-settings-row' },
    React.createElement('div', null,
      React.createElement('div', { className: 'nxe-settings-label' }, label),
      hint === undefined ? null : React.createElement('div', { className: 'nxe-settings-hint' }, hint),
      warn === true ? React.createElement('p', { className: 'nxe-warn' }, hint) : null),
    React.createElement(Switch, { checked, label, onChange }))
}

/**
 * The settings card.
 *
 * Raised from the footer gear instead of the general settings page: these switches only change how
 * this plugin draws itself, so they belong beside the thing they change.
 *
 * @param props - copy, current preferences, the setter, and the open state.
 * @returns the card, or null while closed.
 */
export function SettingsDialog({ copy, open, prefs, setPref, onClose }) {
  if (!open) return null
  const bothOff = prefs.openPreviewOnClick === false && prefs.openPreviewOnDoubleClick === false
  return React.createElement(NanoDialog, {
    copy, title: copy.settingsTitle, description: copy.settingsDescription,
    maxHeight: 520, onCancel: onClose,
  },
    React.createElement(Row, {
      label: copy.settingsOpenOnClick, hint: copy.settingsOpenOnClickHint,
      checked: prefs.openPreviewOnClick, onChange: value => setPref('openPreviewOnClick', value),
    }),
    React.createElement(Row, {
      label: copy.settingsOpenOnDoubleClick, checked: prefs.openPreviewOnDoubleClick,
      onChange: value => setPref('openPreviewOnDoubleClick', value),
    }),
    bothOff ? React.createElement('p', { className: 'nxe-warn' }, copy.settingsNoOpenPath) : null,
    React.createElement(Row, {
      label: copy.settingsShowOpenButton, checked: prefs.showOpenButton,
      onChange: value => setPref('showOpenButton', value),
    }),
    React.createElement(Row, {
      label: copy.settingsShowIgnoredBadge, checked: prefs.showIgnoredBadge,
      onChange: value => setPref('showIgnoredBadge', value),
    }),
    React.createElement(Row, {
      label: copy.settingsShowGit, checked: prefs.showGitStatus,
      onChange: value => setPref('showGitStatus', value),
    }),
    React.createElement(Row, {
      label: copy.settingsShowSystemFiles, hint: copy.settingsShowSystemFilesHint,
      checked: prefs.showSystemFiles, onChange: value => setPref('showSystemFiles', value),
    }),
    React.createElement(Row, {
      label: copy.settingsShowStatusBar, checked: prefs.showStatusBar,
      onChange: value => setPref('showStatusBar', value),
    }),
  React.createElement(Row, {
    label: copy.settingsStatsExcludeGit, checked: prefs.statsExcludeGit,
    onChange: value => setPref('statsExcludeGit', value),
  }))
}

export { DEFAULT_PREFS }

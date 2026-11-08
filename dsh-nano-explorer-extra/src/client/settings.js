/** The plugin's own settings page, rendered inside the Plugins settings section. */

import React from 'react'
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
    React.createElement('button', {
      type: 'button',
      className: 'nxe-switch',
      role: 'switch',
      'aria-checked': checked,
      'aria-label': label,
      'data-on': String(checked),
      onClick: () => onChange(!checked),
    }))
}

/**
 * The settings page.
 * @param props - copy, current preferences, and the setter.
 * @returns the switch list.
 */
export function SettingsPage({ copy, prefs, setPref }) {
  const bothOff = prefs.openPreviewOnClick === false && prefs.openPreviewOnDoubleClick === false
  return React.createElement('div', { className: 'nxe-settings', 'data-nxe-settings': 'true' },
    React.createElement('p', { className: 'nxe-settings-hint' }, copy.settingsDescription),
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
      label: copy.settingsFollowSymlinks, checked: prefs.followSymlinks,
      onChange: value => setPref('followSymlinks', value),
    }),
    React.createElement(Row, {
      label: copy.settingsAllowOutside, hint: copy.settingsAllowOutsideHint,
      checked: prefs.allowOutsideWorkspace, onChange: value => setPref('allowOutsideWorkspace', value),
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
      label: copy.settingsShowStatusBar, checked: prefs.showStatusBar,
      onChange: value => setPref('showStatusBar', value),
    }),
    React.createElement(Row, {
      label: copy.settingsStatsExcludeGit, checked: prefs.statsExcludeGit,
      onChange: value => setPref('statsExcludeGit', value),
    }))
}

export { DEFAULT_PREFS }

/** The tree: this plugin's own listing state, rendered through the shipped `sidebar.files.tree` Factory. */

import React from 'react'
import { treeKeyOf } from './paths.js'

const { useCallback, useEffect, useMemo, useRef, useState } = React

/**
 * One pane's tree state and the loaders that fill it.
 * @param options - workspace root, Session identity, the request helper, and preferences.
 * @returns state plus the operations the page drives.
 */
export function useTree(options) {
  const { sessionId, root, request, prefs, onListed } = options
  const [levels, setLevels] = useState(() => new Map())
  const [expanded, setExpanded] = useState(() => new Set())
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(null)
  const [token, setToken] = useState(0)
  const alive = useRef(true)
  const listed = useRef(onListed)
  listed.current = onListed

  useEffect(() => () => { alive.current = false }, [])

  /**
   * Read one directory and store its level.
   * @param path - absolute directory path.
   * @param silent - keep the rows already drawn instead of showing a loading line.
   */
  const loadLevel = useCallback(async (path, silent = false, allowOutside = undefined) => {
    const key = treeKeyOf(root, path)
    if (!silent) {
      setLevels(current => {
        const next = new Map(current)
        const previous = next.get(key)
        if (previous === undefined) next.set(key, { loading: true, entries: [] })
        return next
      })
    }
    const result = await request('/list', {
      sessionId,
      path,
      followSymlinks: prefs.followSymlinks,
      // A path the reader explicitly accepted is allowed even when the global switch is off.
      allowOutsideWorkspace: allowOutside === true || prefs.allowOutsideWorkspace === true || prefs.allowed?.includes(treeKeyOf(root, path)) === true,
    })
    if (!alive.current) return
    setLevels(current => {
      const next = new Map(current)
      const previous = next.get(key)
      if (result.ok) {
        next.set(key, {
          entries: result.entries,
          truncated: result.truncated === true,
          outside: result.outside === true,
          // Keep an already-known failure of one child level; a child's own state lives under its own key.
          failed: previous?.failed === true && previous.entries?.length > 0 ? previous.failed : false,
        })
      } else {
        next.set(key, { entries: previous?.entries ?? [], failed: true, message: result.message, code: result.code })
      }
      return next
    })
    // Hand the freshly listed names to the caller so ignored markers follow what is drawn.
    listed.current?.(path, result.ok ? result.entries.map(entry => entry.name) : [])
    return result
  }, [root, sessionId, request, prefs.followSymlinks, prefs.allowOutsideWorkspace, prefs.allowed])

  useEffect(() => {
    if (root === undefined) return
    setLevels(new Map())
    void loadLevel(root)
  }, [root, token, loadLevel])

  /** Reload the root and every expanded directory in place. */
  const refresh = useCallback(async () => {
    setToken(value => value + 1)
  }, [])

  /** Reload exactly one directory's listing. */
  const refreshLevel = useCallback(path => loadLevel(path, true), [loadLevel])

  /**
   * Expand or collapse a directory, reading it the first time it opens.
   * @param path - absolute directory path.
   * @param open - whether the press asks to expand it.
   */
  const toggle = useCallback((path, open) => {
    const key = treeKeyOf(root, path)
    setExpanded(current => {
      const next = new Set(current)
      if (open) next.add(key)
      else next.delete(key)
      return next
    })
    if (open && levels.get(key) === undefined) void loadLevel(path)
  }, [root, levels, loadLevel])

  /**
   * Record a directory as a known, empty level.
   *
   * A folder the reader just created has not been listed yet, and a selection can only target a level
   * the tree knows. Registering it here makes it the destination of the next create instead of its parent.
   * @param path - absolute directory path.
   */
  const knownEmpty = useCallback(path => {
    const key = treeKeyOf(root, path)
    setLevels(current => {
      if (current.has(key)) return current
      const next = new Map(current)
      next.set(key, { entries: [] })
      return next
    })
  }, [root])

  /** Forget one directory's cached listing, so a later expand reads it again. */
  const forget = useCallback(path => {
    const key = treeKeyOf(root, path)
    setLevels(current => {
      if (!current.has(key)) return current
      const next = new Map(current)
      next.delete(key)
      return next
    })
  }, [root])

  /** Collapse a whole subtree after its paths changed. */
  const collapseUnder = useCallback(path => {
    const key = treeKeyOf(root, path)
    setExpanded(current => {
      const next = new Set()
      for (const item of current) if (item !== key && !item.startsWith(`${key}/`)) next.add(item)
      return next
    })
    setLevels(current => {
      const next = new Map()
      for (const [itemKey, level] of current) if (itemKey !== key && !itemKey.startsWith(`${key}/`)) next.set(itemKey, level)
      return next
    })
  }, [root])

  const entries = useMemo(() => {
    const list = []
    for (const [levelKey, level] of levels) {
      for (const entry of level.entries ?? []) {
        // A level key is the directory's absolute tree key; a child's key joins it with its name.
        const path = levelKey === '' ? entry.name : `${levelKey}/${entry.name}`
        list.push({ ...entry, path })
      }
    }
    return list
  }, [levels])

  const directories = useMemo(() => {
    const states = {}
    for (const [key, level] of levels) {
      if (level.loading === true && (level.entries?.length ?? 0) === 0) states[key] = { loading: true }
      else if (level.failed === true) states[key] = { failure: level.message }
      else if (level.truncated === true) states[key] = { truncated: true }
    }
    return states
  }, [levels])

  return {
    levels, entries, directories, expanded: [...expanded], selected, setSelected,
    toggle, pending, setPending, refresh, refreshLevel, loadLevel, forget, collapseUnder, knownEmpty,
  }
}

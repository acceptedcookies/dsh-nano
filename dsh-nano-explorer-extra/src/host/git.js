/** Git queries and one commit, run under the Session's sandbox policy and execution world. */

/** Environment selectors cleared so an inherited repository config cannot redirect a query. */
const GIT_TOMBSTONES = [
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT',
  'GIT_CEILING_DIRECTORIES', 'GIT_PREFIX', 'GIT_SHALLOW_FILE', 'GIT_GRAFT_FILE',
  'GIT_REPLACE_REF_BASE', 'GIT_ATTR_SOURCE',
]

/** Arguments before every subcommand: no index refresh writes, hooks, or filesystem monitor. */
const GIT_PREFIX = ['--no-optional-locks', '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false']

/** The line terminator Git's stdin path list and its NUL-free text records use. */
const LINEFEED = String.fromCharCode(10)

/** `git rev-parse` prints this when the directory is not inside a work tree. */
const NOT_A_CHECKOUT = /not a git repository|must be run in a work tree/i

/**
 * Read which files differ between this checkout and its upstream, per side.
 *
 * `pushed` lists paths this branch has committed that the upstream lacks; `pulled` lists paths the
 * upstream has committed that this branch lacks. Both sides are measured from the merge base, not
 * from each other: `A..B` still walks both trees, so a direct upstream-to-HEAD comparison reports the
 * same paths in both directions and cannot say which side changed them. Each side costs one
 * `git diff --name-status`, so the whole comparison stays at three processes however many files change.
 *
 * @param ctx - context providing `subprocess`, `sandbox`, and `sandboxPolicy`.
 * @param config - executable and process limits.
 * @param request - Git working directory, policy, and cancellation.
 * @returns the per-side path lists, or undefined when the comparison cannot run.
 */
async function remoteDivergence(ctx, config, request) {
  const read = async range => {
    const result = await runGit(ctx, config, {
      ...request,
      args: ['diff', '--name-status', '--no-renames', range],
      allowedExitCodes: [0, 128],
    }).catch(() => undefined)
    if (result === undefined || result.exitCode !== 0) return undefined
    const entries = []
    for (const line of result.stdout.split('\n')) {
      if (line.trim() === '') continue
      const [letter, ...rest] = line.split('\t')
      const path = rest.join('\t')
      if (path === '') continue
      // A diff letter means the same three things to a reader: added, removed, or changed.
      const status = letter.startsWith('A') ? 'A' : letter.startsWith('D') ? 'D' : letter.startsWith('R') ? 'R' : 'M'
      entries.push({ path, status })
    }
    return entries
  }
  const base = await runGit(ctx, config, {
    ...request, args: ['merge-base', 'HEAD', '@{u}'], allowedExitCodes: [0, 128],
  }).catch(() => undefined)
  if (base === undefined || base.exitCode !== 0) return undefined
  const forkPoint = base.stdout.trim()
  if (forkPoint === '') return undefined
  const pushed = await read(`${forkPoint}..HEAD`)
  const pulled = await read(`${forkPoint}..@{u}`)
  if (pushed === undefined && pulled === undefined) return undefined
  return { pushed: pushed ?? [], pulled: pulled ?? [] }
}

/**
 * Build the environment a Git child runs with.
 * @returns tombstoned selectors plus the prompt, lock, and locale policy.
 */
function gitEnvironment() {
  const env = {}
  for (const key of GIT_TOMBSTONES) env[key] = undefined
  env.GIT_TERMINAL_PROMPT = '0'
  env.GIT_OPTIONAL_LOCKS = '0'
  env.GIT_NO_LAZY_FETCH = '1'
  env.LC_ALL = 'C'
  return env
}

/**
 * Compose a deadline that aborts the child when it expires.
 * @param parent - caller cancellation, combined with the deadline.
 * @param ms - budget in milliseconds.
 * @returns the combined signal and a disposer clearing the timer.
 */
function budget(parent, ms) {
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(new Error('git command timed out')), ms)
  timer.unref?.()
  const signal = parent === undefined ? stop.signal : AbortSignal.any([parent, stop.signal])
  return { signal, dispose: () => { clearTimeout(timer) } }
}

/**
 * The executable lookup is the same answer for every Git call this host makes, and on a PATH with
 * many entries it was its own process each time. Cache it per configured command name.
 */
const resolvedProgram = new Map()

/**
 * Run one Git subcommand.
 * @param ctx - context providing `subprocess`, `sandbox`, and `sandboxPolicy`.
 * @param config - executable and process limits.
 * @param request - working directory, session policy, arguments, and cancellation.
 * @returns stdout, stderr, and the exit code.
 * @throws when Git cannot run, exceeds the budget, or prints beyond the cap.
 */
async function runGit(ctx, config, request) {
  const { cwd, policy, args, signal, allowedExitCodes = [0] } = request
  const scope = budget(signal, config.gitTimeoutMs)
  try {
    let program = resolvedProgram.get(config.gitCommand)
    if (program === undefined) {
      program = await ctx.subprocess.resolveExecutable(config.gitCommand, undefined, scope.signal)
      resolvedProgram.set(config.gitCommand, program)
    }
    const command = [program, ...GIT_PREFIX, ...args]
    const argv = policy !== undefined && policy.mode !== 'danger-full-access'
      ? (await ctx.sandbox.confine(command, policy, scope.signal)).argv
      : command
    scope.signal.throwIfAborted()
    const child = ctx.subprocess.spawn({
      argv,
      cwd,
      env: gitEnvironment(),
      signal: scope.signal,
      graceMs: 5000,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: config.maxGitOutputBytes },
        stderr: { maxBytes: 65536 },
      },
    })
    try {
      const outcome = await child.done
      scope.signal.throwIfAborted()
      const stdout = child.collected.stdout.readFrom(0)
      const stderr = child.collected.stderr.readFrom(0)
      if (outcome.exitCode === null || !allowedExitCodes.includes(outcome.exitCode)) {
        throw new Error(`git ${args[0]} failed (${outcome.signal ?? outcome.exitCode}): ${firstLine(stderr.text)}`)
      }
      if (stdout.lossy) throw new Error(`git ${args[0]} output exceeds maxGitOutputBytes`)
      return { stdout: stdout.text, stderr: stderr.text, exitCode: outcome.exitCode }
    } finally {
      child.terminate()
      await child.waitForExit().catch(() => {})
    }
  } finally {
    scope.dispose()
  }
}

/** @param {string} text */
function firstLine(text) {
  return text.split(/\r?\n/u).map(line => line.trim()).find(line => line.length > 0) ?? 'no diagnostic'
}

/**
 * Split one porcelain v2 status pair into its two sides.
 *
 * The columns mean different things: `x` is what the index holds (already staged with `git add`) and
 * `y` is what the working tree holds (edited but not staged). Collapsing them lost the distinction
 * between "prepared for the next commit" and "not prepared yet".
 *
 * @param x - staged status character (or a space).
 * @param y - working-tree status character (or a space).
 * @returns the staged and unstaged letters, each absent when that side is clean.
 */
function sidesOf(x, y) {
  const letter = c => {
    if (c === undefined || c === ' ' || c === '.') return undefined
    if (c === 'C') return 'A'
    if (c === 'T') return 'M'
    if (c === 'R' || c === 'D' || c === 'A' || c === 'M' || c === 'U') return c
    return undefined
  }
  return { staged: letter(x), unstaged: letter(y) }
}

/**
 * Choose the single letter the row draws from both sides.
 *
 * A rename or a delete is a shape change and wins; an addition is new; a modification is the quiet
 * case. The full pair still travels on the entry, so the row can show both.
 *
 * @param staged - index-side letter.
 * @param unstaged - working-tree-side letter.
 * @returns the display letter, or `undefined` when both sides are clean.
 */
function letterOf(staged, unstaged) {
  const both = [staged, unstaged]
  if (both.includes('R')) return 'R'
  if (both.includes('D')) return 'D'
  if (both.includes('U')) return 'U'
  if (both.includes('A')) return 'A'
  if (both.includes('M')) return 'M'
  return undefined
}

/**
 * Parse `git status --porcelain=v2 --branch --ignored=matching -z` output.
 * @param stdout - NUL-separated records.
 * @returns branch facts, changed files, and ignored paths.
 */
export function parseStatus(stdout) {
  const records = stdout.split('\0')
  const result = { branch: null, detached: false, upstream: null, ahead: 0, behind: 0, files: [], ignored: [] }
  for (const record of records) {
    if (record === '') continue
    if (record.startsWith('# ')) {
      const space = record.indexOf(' ', 2)
      const key = record.slice(2, space)
      const value = record.slice(space + 1)
      if (key === 'branch.head') {
        if (value === '(detached)') result.detached = true
        else result.branch = value
      } else if (key === 'branch.upstream') result.upstream = value
      else if (key === 'branch.ab') {
        const [ahead, behind] = value.split(' ')
        result.ahead = Number.parseInt(String(ahead).replace('+', ''), 10) || 0
        result.behind = Number.parseInt(String(behind).replace('-', ''), 10) || 0
      }
      continue
    }
    const kind = record[0]
    if (kind === '1') {
      const fields = record.split(' ')
      const xy = fields[1] ?? '..'
      const path = fields.slice(8).join(' ')
      const sides = sidesOf(xy[0], xy[1])
      const letter = letterOf(sides.staged, sides.unstaged)
      if (letter !== undefined && path !== '') result.files.push({ path, status: letter, ...sides })
      continue
    }
    if (kind === '2') {
      const fields = record.split(' ')
      const xy = fields[1] ?? '..'
      const [path] = fields.slice(9).join(' ').split('\t')
      const sides = sidesOf(xy[0], xy[1])
      const letter = letterOf(sides.staged, sides.unstaged) ?? 'R'
      if (path !== undefined && path !== '') result.files.push({ path, status: letter, ...sides })
      continue
    }
    if (kind === '?') {
      // `--untracked-files=normal` collapses a wholly untracked directory into one entry whose path
      // ends with `/`; kept verbatim it renders as an empty name in the commit drawer (the trailing
      // slash becomes the split point). Strip it exactly like the `!` records below.
      result.files.push({ path: record.slice(2).replace(/\/$/u, ''), status: '?' })
      continue
    }
    if (kind === 'u') {
      const fields = record.split(' ')
      const path = fields.slice(10).join(' ')
      if (path !== '') result.files.push({ path, status: 'U' })
      continue
    }
    if (kind === '!') result.ignored.push(record.slice(2).replace(/\/$/u, ''))
  }
  return result
}

/**
 * Parse `git log --pretty=format:%H%x1f%h%x1f%P%x1f%ct%x1f%s%x1f%D`.
 *
 * One row is the full hash, the short hash, space-separated parent hashes, the commit time, the
 * subject, and the decoration list. Decorations arrive as `HEAD -> main, origin/main`; the
 * `HEAD ->` marker is dropped so the pill can name the branch itself. Parents power the
 * client-side lane layout: without them every row would sit on one vertical rail.
 * @param stdout - one commit per line.
 * @returns the commits, newest first.
 */
export function parseLog(stdout) {
  const commits = []
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue
    const parts = line.split('\x1f')
    const full = parts[0] ?? ''
    const hash = parts[1] ?? ''
    if (hash === '') continue
    const parents = (parts[2] ?? '').trim() === '' ? [] : (parts[2] ?? '').trim().split(/\s+/u)
    const time = Number.parseInt(parts[3] ?? '', 10)
    const subject = parts[4] ?? ''
    const refs = []
    for (const raw of (parts[5] ?? '').split(',')) {
      const name = raw.trim().replace(/^HEAD -> /u, '').replace(/^tag: /u, '')
      if (name === '' || name === 'HEAD' || refs.includes(name)) continue
      refs.push(name)
      if (refs.length === 4) break
    }
    commits.push({ hash, full, parents, time: Number.isFinite(time) ? time : 0, subject, refs })
  }
  return commits
}

/**
 * Read the newest commits across every local and remote-tracking ref.
 *
 * `--all` — not just HEAD — is what lets the graph draw the remote side as its own lane: the
 * pushed timeline and the local-only timeline only differ meaningfully when both are visible. A
 * checkout with no commits yet makes `log` exit 128; that is an empty history, not a failure.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns up to 48 commits, or an empty list when the log cannot be read.
 */
async function readHistory(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request,
    args: ['log', '--all', '-n', '48', '--pretty=format:%H%x1f%h%x1f%P%x1f%ct%x1f%s%x1f%D'],
    allowedExitCodes: [0, 128],
  }).catch(() => undefined)
  if (result === undefined || result.exitCode !== 0) return []
  return parseLog(result.stdout)
}

/**
 * Read the checkout state of one workspace.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory, session policy, and cancellation.
 * @returns the parsed status, or `undefined` when the directory is not a checkout.
 * @throws when Git itself fails.
 */
export async function readStatus(ctx, config, request) {
  const probe = await runGit(ctx, config, { ...request, args: ['rev-parse', '--show-toplevel'], allowedExitCodes: [0, 128] })
  if (probe.exitCode !== 0) {
    if (NOT_A_CHECKOUT.test(probe.stderr)) return undefined
    throw new Error(`git rev-parse failed: ${firstLine(probe.stderr)}`)
  }
  const root = probe.stdout.trim()
  // `--untracked-files=normal` reports a wholly untracked directory as one entry, while `all`
  // enumerates every file under it: on a workspace with a large generated tree that difference is
  // 49 KB versus 32 MB, and the tree only ever draws the directories that were reported.
  // Workspace-wide reads keep the summarised mode: `all` enumerates every file under an untracked
  // directory (tens of megabytes on a large tree). A caller that names one directory asks for `all`
  // instead, so opening a folder reveals each changed file inside it without ever walking the whole
  // repository that way.
  const scoped = typeof request.path === 'string' && request.path !== ''
  const args = [
    'status', '--porcelain=v2', '--branch',
    scoped ? '--untracked-files=all' : '--untracked-files=normal',
    '-z',
    ...(scoped ? ['--', request.path] : []),
  ]
  // These four reads do not depend on each other: status, stash, and the worktree list all answer
  // from the repository's own metadata. Running them in line was nine sequential process waits;
  // overlapping them makes the answer arrive when the slowest read does.
  // A scoped read is one directory's status for the row colours: the stash badge and the worktree
  // list answer drawer questions, not per-directory ones, so they stay on the unscoped path.
  const [status, stash, worktrees] = await Promise.all([
    runGit(ctx, config, { ...request, args }),
    scoped
      ? Promise.resolve(undefined)
      : runGit(ctx, config, {
        ...request, args: ['stash', 'list', '--format=%gd'], allowedExitCodes: [0, 128],
      }).catch(() => undefined),
    scoped ? Promise.resolve([]) : listWorktrees(ctx, config, request),
  ])
  const parsed = parseStatus(status.stdout)

  // Stashed work is invisible to `status`: the tree looks clean while a shelf of commits waits to be
  // restored. One extra command reports how many are shelved, which the status bar shows as a badge.
  const stashed = stash === undefined || stash.exitCode !== 0
    ? 0
    : stash.stdout.split('\n').filter(line => line.trim() !== '').length

  // A scoped read only colours the rows of the directory just expanded: branches, the history
  // rail, divergence, remotes, and the author do not change with the directory, so asking for
  // them here would spend four extra Git processes per folder the reader opens. The whole-suite
  // reads stay on the unscoped path that feeds the drawer.
  const [branches, history, remote, remotes, repoConfig] = scoped
    ? [[], [], undefined, [], undefined]
    : await Promise.all([
      listBranches(ctx, config, request, worktrees),
      readHistory(ctx, config, request),
      typeof parsed.upstream !== 'string' || parsed.upstream === ''
        ? Promise.resolve(undefined)
        : remoteDivergence(ctx, config, request),
      readRemotes(ctx, config, request),
      readRepoConfig(ctx, config, request),
    ])
  const author = repoConfig === undefined ? undefined : authorOf(repoConfig)
  const sshKey = repoConfig === undefined ? undefined : sshKeyOf(repoConfig)
  const conflicts = parsed.files.filter(file => file.status === 'U').map(file => file.path)

  return {
    root, ...parsed, stashed, worktrees, branches, history, conflicts,
    ...(remote === undefined ? {} : { remote }),
    remotes, author,
    ...(sshKey === undefined ? {} : { sshKey }),
  }
}

/**
 * Stage every change and commit it.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory, session policy, message, and cancellation.
 * @returns the new commit subject line.
 * @throws with Git's own diagnostic when either step fails.
 */
export async function commitAll(ctx, config, request) {
  const { message } = request
  await runGit(ctx, config, { ...request, args: ['add', '--all'] })
  // P4-02: `git add --all` can never stage `.git/**` (it is the repository
  // dir, not a worktree path), but assert the invariant so a future call-site
  // passing a narrower pathspec cannot reintroduce a `.git` write that arms a
  // filter/smudge driver the commit then executes.
  const staged = await runGit(ctx, config, { ...request, args: ['diff', '--cached', '--name-only'] })
  if (String(staged.stdout).split('\n').some((line) => /(?:^|\/)\.git(?:\/|$)/u.test(line.trim()))) {
    throw new Error('refusing to commit: a .git path entered the index')
  }
  const committed = await runGit(ctx, config, { ...request, args: ['commit', '--message', message] })
  return firstLine(committed.stdout)
}

/**
 * Report which of the given paths are ignored, using Git's own matcher.
 *
 * `git status --ignored` enumerates every ignored file in the repository, which costs tens of
 * megabytes on a tree with a large vendor directory. This asks about the paths the tree is about
 * to draw instead, so the cost follows the drawn level rather than the whole repository.
 *
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory, session policy, candidate paths, and cancellation.
 * @returns the ignored subset, in the order Git printed it.
 * @throws only when Git cannot run at all; an unignored-looking result is an empty list.
 */
export async function ignoredAmong(ctx, config, request) {
  const paths = (request.paths ?? []).filter(path => typeof path === 'string' && path !== '')
  if (paths.length === 0) return []
  const scope = budget(request.signal, config.gitTimeoutMs)
  try {
    const program = await ctx.subprocess.resolveExecutable(config.gitCommand, undefined, scope.signal)
    const command = [program, ...GIT_PREFIX, 'check-ignore', '--stdin']
    const argv = request.policy !== undefined && request.policy.mode !== 'danger-full-access'
      ? (await ctx.sandbox.confine(command, request.policy, scope.signal)).argv
      : command
    const child = ctx.subprocess.spawn({
      argv,
      cwd: request.cwd,
      env: gitEnvironment(),
      signal: scope.signal,
      graceMs: 5000,
      stdio: {
        // Paths travel on stdin: never through a shell, never through argv length limits.
        stdin: { data: paths.join(LINEFEED) + LINEFEED },
        stdout: { maxBytes: config.maxGitOutputBytes },
        stderr: { maxBytes: 65536 },
      },
    })
    try {
      const outcome = await child.done
      // 0 means some paths are ignored, 1 means none are; anything else is a real failure.
      if (outcome.exitCode !== 0 && outcome.exitCode !== 1) return []
      const stdout = child.collected.stdout.readFrom(0).text
      return stdout.split(LINEFEED).map(item => item.trim()).filter(item => item !== '')
    } finally {
      child.terminate()
      await child.waitForExit().catch(() => {})
    }
  } catch {
    // Ignore markers are decoration: failing to read them must not fail the tree.
    return []
  } finally {
    scope.dispose()
  }
}

/**
 * List the worktrees attached to this checkout.
 *
 * A repository can be checked out in several places at once, each on its own branch. `list
 * --porcelain` reports them as blank-line separated blocks, which this turns into rows for a picker.
 *
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns one row per worktree, or an empty list when the command cannot run.
 */
export async function listWorktrees(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request, args: ['worktree', 'list', '--porcelain'], allowedExitCodes: [0, 128],
  }).catch(() => undefined)
  if (result === undefined || result.exitCode !== 0) return []
  const rows = []
  let current = null
  for (const line of result.stdout.split('\n')) {
    if (line.trim() === '') {
      if (current !== null) rows.push(current)
      current = null
      continue
    }
    const space = line.indexOf(' ')
    const key = space === -1 ? line : line.slice(0, space)
    const value = space === -1 ? '' : line.slice(space + 1)
    current ??= { path: '', head: '', branch: null, detached: false, bare: false }
    if (key === 'worktree') current.path = value
    else if (key === 'HEAD') current.head = value
    else if (key === 'branch') current.branch = value.replace(/^refs\/heads\//u, '')
    else if (key === 'detached') current.detached = true
    else if (key === 'bare') current.bare = true
  }
  if (current !== null) rows.push(current)
  return rows.filter(row => row.path !== '')
}

/**
 * Fetch and fast-forward the current branch from its upstream.
 *
 * `pull --ff-only` refuses to create a merge commit, so a diverged branch reports the refusal
 * instead of quietly leaving the reader inside a merge they did not ask for.
 *
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns the summary line Git printed.
 * @throws when the branch has no upstream or cannot be fast-forwarded.
 */
export async function pullUpstream(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request, args: ['pull', '--ff-only'], allowedExitCodes: [0, 1, 128],
  })
  if (result.exitCode !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout)
    throw new Error(detail === '' ? 'git pull failed' : detail)
  }
  return firstLine(result.stdout) || firstLine(result.stderr)
}

/**
 * Describe the paths currently in an unresolved merge.
 *
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns one path per conflicted file.
 */
export async function listConflicts(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request, args: ['diff', '--name-only', '--diff-filter=U'], allowedExitCodes: [0, 128],
  }).catch(() => undefined)
  if (result === undefined || result.exitCode !== 0) return []
  return result.stdout.split('\n').map(line => line.trim()).filter(line => line !== '')
}

/**
 * List the branches in this repository, marking the one this worktree has checked out.
 *
 * `for-each-ref` reports every local branch with its own upstream and head marker, so one call
 * answers the whole picker. A branch that another worktree holds is flagged, because Git refuses to
 * check it out here and the reader should see why before pressing it.
 *
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @param [knownWorktrees] - rows a caller already read; spared `worktree list` runs again.
 * @returns one row per local branch.
 */
export async function listBranches(ctx, config, request, knownWorktrees) {
  const [result, worktrees] = await Promise.all([
    runGit(ctx, config, {
      ...request,
      args: ['for-each-ref', '--format=%(refname:short)%09%(HEAD)%09%(upstream:short)%09%(objectname:short)', 'refs/heads'],
      allowedExitCodes: [0, 128],
    }).catch(() => undefined),
    knownWorktrees === undefined ? listWorktrees(ctx, config, request) : Promise.resolve(knownWorktrees),
  ])
  if (result === undefined || result.exitCode !== 0) return []
  // A branch checked out in another worktree cannot be taken here; Git reports that only on the
  // checkout attempt, so the held set comes from the worktree listing.
  const held = new Set(worktrees.map(row => row.branch).filter(name => typeof name === 'string'))
  const rows = []
  for (const line of result.stdout.split('\n')) {
    if (line.trim() === '') continue
    const [name, head, upstream, commit] = line.split('\t')
    if (name === undefined || name === '') continue
    rows.push({
      name,
      current: head === '*',
      upstream: upstream === undefined || upstream === '' ? null : upstream,
      commit: commit ?? '',
      // The current branch is of course held by this worktree; that is not a conflict.
      inOtherWorktree: held.has(name) && head !== '*',
    })
  }
  return rows
}

/**
 * Check out one branch in this worktree.
 *
 * Git refuses on its own terms — a branch held by another worktree, or local changes the switch would
 * overwrite — and its message names the reason, so the refusal is surfaced verbatim instead of being
 * guessed at beforehand.
 *
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory, branch name, and cancellation.
 * @returns the branch that is now current.
 * @throws with Git's own explanation when the switch is refused.
 */
export async function checkoutBranch(ctx, config, request) {
  const { branch } = request
  const name = typeof branch === 'string' ? branch.trim() : ''
  if (name === '') throw new Error('a branch name is required')
  // The value reaches a process argument, so it must not look like an option.
  if (name.startsWith('-')) throw new Error('a branch name must not begin with a dash')
  const result = await runGit(ctx, config, {
    ...request, args: ['checkout', name], allowedExitCodes: [0, 1, 128],
  })
  if (result.exitCode !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout)
    throw new Error(detail === '' ? 'git checkout failed' : detail)
  }
  return { branch: name }
}

/**
 * Push the current branch to its upstream.
 *
 * An upstream exists → `git push`. No upstream → `git push -u <remote> HEAD`, which publishes the
 * current branch under its own name on the named remote and binds it, so the panel's pull button
 * works from the next read on. The remote is always an argv operand, never a shell word.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory, cancellation, and optional `{ remote }` for the
 *   no-upstream case.
 * @returns the summary line Git printed.
 * @throws with Git's own diagnostic when the push is refused.
 */
export async function pushUpstream(ctx, config, request) {
  // `git push` alone follows the configured upstream; only a branch without one asks us to name a
  // remote and bind it. `HEAD` (not a branch name) keeps that first publish working on a detached
  // checkout too.
  const remote = typeof request.remote === 'string' ? request.remote.trim() : ''
  // `--porcelain` prints `flag old..new ref` rows on stdout even when progress output is muted, so
  // a quiet success still names the ref that moved instead of reporting "no diagnostic".
  const args = remote === '' ? ['push', '--porcelain'] : ['push', '--porcelain', '-u', remote, 'HEAD']
  const result = await runGit(ctx, config, {
    ...request, args, allowedExitCodes: [0, 1, 128],
  })
  if (result.exitCode !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout)
    throw new Error(detail === '' ? 'git push failed' : detail)
  }
  const moved = result.stdout.split('\n').map(line => line.trim()).filter(line => /^[*+=!\-]/u.test(line)).at(-1)
  return moved ?? firstLine(result.stdout) ?? firstLine(result.stderr)
}

/**
 * List the named remotes on this repository.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns one row per remote: `{ name, fetch, push }`, empty list when none exist.
 */
export async function readRemotes(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request, args: ['remote', '-v'], allowedExitCodes: [0, 128],
  }).catch(() => undefined)
  if (result === undefined || result.exitCode !== 0) return []
  const byName = new Map()
  for (const line of result.stdout.split('\n')) {
    if (line.trim() === '') continue
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)\s*$/u)
    if (match === null) continue
    const [, name, url, direction] = match
    const row = byName.get(name) ?? { name, fetch: '', push: '' }
    row[direction] = url
    byName.set(name, row)
  }
  return [...byName.values()]
}

/**
 * Add, retarget, or drop one named remote.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - `{ op: 'add'|'set-url'|'remove', name, url? }`.
 * @returns the remote list after the change.
 * @throws on bad input or when Git refuses.
 */
export async function writeRemote(ctx, config, request) {
  const op = request.op
  const name = typeof request.name === 'string' ? request.name.trim() : ''
  const url = typeof request.url === 'string' ? request.url.trim() : ''
  if (name === '' || name.startsWith('-')) throw new Error('remote name must be a non-dash name')
  if (op === 'add') {
    if (url === '') throw new Error('remote url is required')
    const result = await runGit(ctx, config, { ...request, args: ['remote', 'add', name, url], allowedExitCodes: [0, 1, 128] })
    if (result.exitCode !== 0) throw new Error(firstLine(result.stderr) || 'git remote add failed')
  } else if (op === 'set-url') {
    if (url === '') throw new Error('remote url is required')
    const result = await runGit(ctx, config, { ...request, args: ['remote', 'set-url', name, url], allowedExitCodes: [0, 1, 128] })
    if (result.exitCode !== 0) throw new Error(firstLine(result.stderr) || 'git remote set-url failed')
  } else if (op === 'remove') {
    const result = await runGit(ctx, config, { ...request, args: ['remote', 'remove', name], allowedExitCodes: [0, 1, 128] })
    if (result.exitCode !== 0) throw new Error(firstLine(result.stderr) || 'git remote remove failed')
  } else {
    throw new Error(`unknown remote operation "${String(op)}"`)
  }
  return readRemotes(ctx, config, request)
}

/**
 * Read this checkout's local and global config maps in two processes.
 *
 * A `--list` dumps every key a scope holds, so one pair of runs answers the author block and the
 * SSH key row together — the panel used to pay four probes for the same facts. The last entry for
 * a repeated key wins, which is exactly how `git config --get` resolves multi-valued files.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns `{ local, global }` as plain key → value maps.
 */
async function readRepoConfig(ctx, config, request) {
  const dump = async scope => {
    const result = await runGit(ctx, config, {
      ...request,
      args: ['config', `--${scope}`, '--list'],
      allowedExitCodes: [0, 1, 128],
    }).catch(() => undefined)
    const map = new Map()
    if (result === undefined || result.exitCode !== 0) return map
    for (const line of result.stdout.split('\n')) {
      const eq = line.indexOf('=')
      if (eq <= 0) continue
      // `--list` prints `key=value`; the keys this plugin reads never carry a newline.
      map.set(line.slice(0, eq), line.slice(eq + 1))
    }
    return map
  }
  const [local, global] = await Promise.all([dump('local'), dump('global')])
  return { local, global }
}

/**
 * Derive the commit identity from the repo config maps.
 * @param maps - `{ local, global }` from `readRepoConfig`.
 * @returns `{ name, email, local, global, source }`.
 */
function authorOf(maps) {
  const localName = maps.local.get('user.name') ?? ''
  const localEmail = maps.local.get('user.email') ?? ''
  const globalName = maps.global.get('user.name') ?? ''
  const globalEmail = maps.global.get('user.email') ?? ''
  const source = localName !== '' || localEmail !== '' ? 'local'
    : globalName !== '' || globalEmail !== '' ? 'global' : 'unset'
  return {
    name: localName !== '' ? localName : globalName,
    email: localEmail !== '' ? localEmail : globalEmail,
    local: { name: localName, email: localEmail },
    global: { name: globalName, email: globalEmail },
    source,
  }
}

/**
 * Derive the SSH key injection state from the repo config maps.
 *
 * `core.sshCommand` is the one setting every network verb honours — pull, push, and any future
 * fetch — so the panel edits that rather than an env var the spawn layer would have to thread
 * through every call site. The value's `-i <path>` is surfaced separately so the row can show a
 * plain key path next to the raw command.
 * @param maps - `{ local, global }` from `readRepoConfig`.
 * @returns `{ command, keyPath, source: 'local'|'global'|'unset' }`.
 */
function sshKeyOf(maps) {
  const local = maps.local.get('core.sshcommand') ?? ''
  const global = maps.global.get('core.sshcommand') ?? ''
  const command = local !== '' ? local : global
  const source = local !== '' ? 'local' : global !== '' ? 'global' : 'unset'
  const match = command.match(/(?:^|\s)-i\s+(?:'([^']+)'|"([^"]+)"|(\S+))/u)
  const keyPath = match === null ? '' : (match[1] ?? match[2] ?? match[3] ?? '')
  return { command, keyPath, source }
}

/**
 * Read the commit identity this checkout would use.
 *
 * Local config wins; when it is absent the global value is reported as `fallback` so the panel can
 * say "inherits" instead of pretending the field is empty.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - working directory and cancellation.
 * @returns `{ name, email, source: 'local'|'global'|'unset' }`.
 */
export async function readAuthor(ctx, config, request) {
  return authorOf(await readRepoConfig(ctx, config, request))
}

/**
 * Point this checkout's network verbs at one SSH identity file.
 *
 * The write lands on `core.sshCommand` as `ssh -i '<key>' -o IdentitiesOnly=yes`: quoting the path
 * keeps spaces working, `IdentitiesOnly` stops the agent's other keys being offered first, and
 * `accept-new` turns a first-contact host-key prompt into a recorded fact instead of a hang under
 * `GIT_TERMINAL_PROMPT=0`. An empty path clears the key so the repo falls back to the default.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - `{ keyPath }`; empty clears `core.sshCommand`.
 * @returns the SSH injection state after the write.
 * @throws on a path that cannot be embedded safely or when Git refuses.
 */
export async function writeSshKey(ctx, config, request) {
  const keyPath = typeof request.keyPath === 'string' ? request.keyPath.trim() : ''
  let args
  if (keyPath === '') {
    args = ['config', '--local', '--unset', 'core.sshCommand']
  } else {
    // Shell metacharacters would execute inside the single-quoted string; reject them rather than
    // escaping, because a path that needs them is never a plain key file.
    if (/[\n\r'`"\\]/u.test(keyPath)) throw new Error('the key path cannot contain quotes, backticks, or newlines')
    args = ['config', '--local', 'core.sshCommand', `ssh -i '${keyPath}' -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`]
  }
  const result = await runGit(ctx, config, { ...request, args, allowedExitCodes: [0, 1, 5, 128] })
  // Exit 5 is `--unset` on a key that was already absent — a clear that reached its goal anyway.
  if (result.exitCode !== 0 && result.exitCode !== 5) throw new Error(firstLine(result.stderr) || 'git config core.sshCommand failed')
  return sshKeyOf(await readRepoConfig(ctx, config, request))
}

/**
 * Write the local commit identity for this checkout.
 * @param ctx - context providing the process services.
 * @param config - executable and process limits.
 * @param request - `{ name, email }`; either may be an empty string to leave that key unchanged.
 * @returns the identity after the write.
 * @throws when both fields are empty or Git refuses.
 */
export async function writeAuthor(ctx, config, request) {
  const name = typeof request.name === 'string' ? request.name.trim() : undefined
  const email = typeof request.email === 'string' ? request.email.trim() : undefined
  if ((name === undefined || name === '') && (email === undefined || email === '')) {
    throw new Error('a name or an email is required')
  }
  if (name !== undefined && name !== '') {
    const result = await runGit(ctx, config, { ...request, args: ['config', 'user.name', name], allowedExitCodes: [0, 1, 128] })
    if (result.exitCode !== 0) throw new Error(firstLine(result.stderr) || 'git config user.name failed')
  }
  if (email !== undefined && email !== '') {
    const result = await runGit(ctx, config, { ...request, args: ['config', 'user.email', email], allowedExitCodes: [0, 1, 128] })
    if (result.exitCode !== 0) throw new Error(firstLine(result.stderr) || 'git config user.email failed')
  }
  return readAuthor(ctx, config, request)
}

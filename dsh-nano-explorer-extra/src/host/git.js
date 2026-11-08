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
    const program = await ctx.subprocess.resolveExecutable(config.gitCommand, undefined, scope.signal)
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
 * Normalize one porcelain v2 status pair to the single letter the tree draws.
 * @param x - staged status character (or a space).
 * @param y - working-tree status character (or a space).
 * @returns the display letter, or `undefined` when both sides are clean.
 */
function letterOf(x, y) {
  if (x === 'R' || y === 'R') return 'R'
  if (x === 'D' || y === 'D') return 'D'
  if (x === 'A' || y === 'A') return 'A'
  if (x === 'M' || y === 'M' || x === 'T' || y === 'T') return 'M'
  if (x === 'C' || y === 'C') return 'A'
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
      const letter = letterOf(xy[0], xy[1])
      if (letter !== undefined && path !== '') result.files.push({ path, status: letter })
      continue
    }
    if (kind === '2') {
      const fields = record.split(' ')
      const xy = fields[1] ?? '..'
      const [path] = fields.slice(9).join(' ').split('\t')
      const letter = letterOf(xy[0], xy[1]) ?? 'R'
      if (path !== undefined && path !== '') result.files.push({ path, status: letter })
      continue
    }
    if (kind === '?') {
      result.files.push({ path: record.slice(2), status: '?' })
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
  const status = await runGit(ctx, config, {
    ...request,
    args: ['status', '--porcelain=v2', '--branch', '--untracked-files=normal', '-z'],
  })
  return { root, ...parseStatus(status.stdout) }
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

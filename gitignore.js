/**
 * Project-root `.gitignore` management for the AGENTS.md editor.
 *
 * The switch in the panel is a view of the ignore file, not a boolean the
 * Client owns: every read parses the current file and reports whether the
 * active instruction file is ignored. The only mutation is an explicit toggle
 * (or the default applied once when an existing file is found).
 *
 * Names are matched case-insensitively and both `agent.md` and `agents.md` are
 * treated as the same instruction file for switch purposes.
 */

import { execFile } from 'node:child_process'
import { isAbsolute, join, relative, sep } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT_CACHE_MS = 10_000
const rootCache = new Map()
const trackedCache = new Map()

/** Locate the Git worktree root, falling back to the workspace directory. */
export async function findGitWorkspace(cwd) {
  const cached = rootCache.get(cwd)
  if (cached !== undefined && Date.now() - cached.at < ROOT_CACHE_MS) return cached

  let root = cwd
  let hasGit = false
  try {
    const result = await run(
      'git',
      ['-C', cwd, 'rev-parse', '--show-toplevel'],
      { timeout: 4_000, maxBuffer: 256 * 1024 },
    )
    const value = String(result.stdout ?? '').trim()
    if (isAbsolute(value)) {
      root = value
      hasGit = true
    }
  } catch {
    // Not a Git worktree, or Git is unavailable: manage cwd/.gitignore.
  }

  const value = { root, hasGit, at: Date.now() }
  rootCache.set(cwd, value)
  return value
}

/** Reset the worktree-root cache. Exposed for tests and diagnostics. */
export function clearGitWorkspaceCache() {
  rootCache.clear()
  trackedCache.clear()
}

function toPosix(value) {
  return value.split(sep).join('/')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function globSource(glob) {
  let source = ''
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]
    if (character === '\\') {
      index += 1
      source += escapeRegExp(glob[index] ?? '\\')
      continue
    }
    if (character === '*') {
      if (glob[index + 1] === '*') {
        while (glob[index + 1] === '*') index += 1
        if (glob[index + 1] === '/') {
          source += '(?:.*/)?'
          index += 1
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
      continue
    }
    if (character === '?') {
      source += '[^/]'
      continue
    }
    if (character === '[') {
      const end = glob.indexOf(']', index + 1)
      if (end !== -1) {
        source += glob.slice(index, end + 1)
        index = end
      } else {
        source += '\\['
      }
      continue
    }
    source += escapeRegExp(character)
  }
  return source
}

function patternRegex(pattern) {
  let value = pattern.trim()
  if (value.endsWith('/')) return undefined

  const anchored = value.startsWith('/') || value.includes('/')
  if (value.startsWith('/')) value = value.slice(1)
  if (value.length === 0) return undefined

  const source = globSource(value)
  return new RegExp(anchored ? `^${source}$` : `(?:^|.*/)${source}$`, 'i')
}

/** `agent.md` and `agents.md` are interchangeable for the switch. */
function alternatePattern(pattern) {
  const parts = pattern.split('/')
  const last = parts[parts.length - 1]
  if (!/^agents?\.md$/i.test(last)) return undefined
  parts[parts.length - 1] = /^agents/i.test(last) ? 'agent.md' : 'agents.md'
  return parts.join('/')
}

function matches(pattern, candidates) {
  const regexes = []
  const primary = patternRegex(pattern)
  if (primary !== undefined) regexes.push(primary)
  const alternate = alternatePattern(pattern)
  if (alternate !== undefined) {
    const regex = patternRegex(alternate)
    if (regex !== undefined) regexes.push(regex)
  }
  return regexes.some((regex) => candidates.some((candidate) => regex.test(candidate)))
}

function isManagedPattern(pattern, activeDirectory) {
  let value = pattern.trim()
  if (value.endsWith('/')) return false
  if (value.startsWith('/')) value = value.slice(1)
  const parts = value.split('/')
  const last = parts[parts.length - 1]
  if (!/^agents?\.md$/i.test(last)) return false

  const directory = parts.slice(0, -1).join('/').toLowerCase()
  const active = activeDirectory.toLowerCase()
  return directory === ''
    || directory === '**'
    || directory === active
    || directory === `**/${active}`
}

/**
 * Candidate paths for matching. The active relative path plus both accepted
 * singular/plural base names in the same directory.
 */
export function candidatesFor(relativePath) {
  const normalized = toPosix(relativePath)
  const slash = normalized.lastIndexOf('/')
  const directory = slash === -1 ? '' : normalized.slice(0, slash)
  const prefix = directory.length === 0 ? '' : `${directory}/`
  return [...new Set([
    normalized,
    `${prefix}AGENTS.md`,
    `${prefix}agents.md`,
    `${prefix}agent.md`,
  ])]
}

/**
 * Evaluate one `.gitignore` text for an instruction file.
 * @param content - raw `.gitignore` text.
 * @param relativePath - instruction path relative to the ignore file's root.
 * @returns ignored state, the last matching line, and managed line indices.
 */
export function evaluateIgnoreContent(content, relativePath) {
  const normalized = toPosix(relativePath)
  const slash = normalized.lastIndexOf('/')
  const activeDirectory = slash === -1 ? '' : normalized.slice(0, slash)
  const candidates = candidatesFor(normalized)
  const managed = new Set()
  let last

  const lines = content.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim()
    if (raw.length === 0 || raw.startsWith('#')) continue

    let negated = false
    let pattern = raw
    if (raw.startsWith('!')) {
      negated = true
      pattern = raw.slice(1).trim()
    }
    if (pattern.length === 0) continue
    if (!matches(pattern, candidates)) continue

    const managedLine = isManagedPattern(pattern, activeDirectory)
    if (managedLine) managed.add(index)
    last = { index, line: raw, pattern, negated, managed: managedLine }
  }

  return {
    ignored: last !== undefined && !last.negated,
    last,
    managed,
  }
}

async function readIgnoreFile(fs, root) {
  const target = await fs.resolve(join(root, '.gitignore'))
  const info = await fs.stat(target)
  if (info === undefined) {
    return { target, exists: false, content: '', version: null }
  }
  if (info.type !== 'file') {
    throw new Error(`${target.displayPath} is not a regular file`)
  }
  const content = await fs.readText(target)
  return { target, exists: true, content, version: info.version }
}

function errorCode(error) {
  return typeof error?.code === 'string' ? error.code : undefined
}

async function isTracked(root, relativePath) {
  const key = `${root}\0${relativePath}`
  const cached = trackedCache.get(key)
  if (cached !== undefined && Date.now() - cached.at < ROOT_CACHE_MS) return cached.value
  let value = false
  try {
    await run(
      'git',
      ['-C', root, 'ls-files', '--error-unmatch', '--', relativePath],
      { timeout: 4_000, maxBuffer: 256 * 1024 },
    )
    value = true
  } catch {
    value = false
  }
  trackedCache.set(key, { value, at: Date.now() })
  return value
}

/** Read the current ignore status for one active instruction file. */
export async function readGitState(fs, cwd, fileName) {
  const workspace = await findGitWorkspace(cwd)
  const relativePath = toPosix(relative(workspace.root, join(cwd, fileName)))
  const ignore = await readIgnoreFile(fs, workspace.root)
  const evaluation = evaluateIgnoreContent(ignore.content, relativePath)
  const last = evaluation.last
  return {
    root: workspace.root,
    hasGit: workspace.hasGit,
    ignorePath: ignore.target.displayPath,
    ignoreExists: ignore.exists,
    relativePath,
    ignored: evaluation.ignored,
    tracked: workspace.hasGit ? await isTracked(workspace.root, relativePath) : false,
    matchedLine: last?.line ?? null,
    managed: evaluation.managed.size > 0,
    blockedBy: last !== undefined && !last.negated && !last.managed ? last.line : null,
  }
}

/**
 * Remove every managed variant line for the active file and, when excluding,
 * add an anchored ignore entry for its actual path.
 *
 * @returns the state read back after the write, including the resulting
 *   ignored status. A broad unrelated pattern can leave `ignored: true`; the
 *   caller should surface `blockedBy`.
 */
export async function applyGitPreference(fs, cwd, fileName, include, policy) {
  const workspace = await findGitWorkspace(cwd)
  const relativePath = toPosix(relative(workspace.root, join(cwd, fileName)))

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ignore = await readIgnoreFile(fs, workspace.root)
    const evaluation = evaluateIgnoreContent(ignore.content, relativePath)
    const lines = ignore.content.length === 0 ? [] : ignore.content.split(/\r?\n/)
    const filtered = lines.filter((_, index) => !evaluation.managed.has(index))

    if (include === false) {
      const entry = `/${relativePath}`
      if (!filtered.some((line) => line.trim() === entry)) filtered.push(entry)
    }

    let next = filtered.join('\n')
    if (next.length > 0 && !next.endsWith('\n')) next += '\n'
    if (next === ignore.content) break
    if (!ignore.exists && include === true) break

    try {
      if (ignore.exists) {
        await fs.writeText(
          ignore.target,
          next,
          { kind: 'replaceIfVersion', version: ignore.version },
          undefined,
          policy,
        )
      } else {
        await fs.writeText(ignore.target, next, { kind: 'createIfAbsent' }, undefined, policy)
      }
      break
    } catch (error) {
      const code = errorCode(error)
      if (attempt === 0 && (code === 'FS_STALE_VERSION' || code === 'FS_NOT_OBSERVED')) continue
      throw error
    }
  }

  return readGitState(fs, cwd, fileName)
}

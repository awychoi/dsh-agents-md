/**
 * AGENTS.md — Host half.
 *
 * Owns the workspace `AGENTS.md` file on behalf of the right-sidebar editor:
 * a same-origin read/write route scoped to a live session's workspace.
 * Opening the editor reads the file or returns a template; it never creates
 * the file. Only an explicit Save writes it.
 *
 * DSH's `@deepseek-ai/dsh-agent-instructions` plugin does the model-facing
 * work: it probes the instruction files on every `agent/pre-step` and injects
 * a replacement when the file version changes. This plugin only protects the
 * file's lifecycle; it does not put anything into the prompt itself.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile as readDiskFile, rename, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { applyGitPreference, readGitState } from './gitignore.js'

const ROUTE_PATH = '/plugins/agents-md'
const DRAFT_ROUTE_PATH = '/plugins/agents-md/draft'
const GIT_ROUTE_PATH = '/plugins/agents-md/gitignore'
const FILE_NAME = 'AGENTS.md'
const AGENT_FILE_RE = /^agents?\.md$/i
const DRAFT_DIR_NAME = 'agents-md'
const DRAFT_FILE_NAME = 'drafts.json'
const GIT_STATE_FILE_NAME = 'git.json'
const DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_EDITOR_BYTES = 2 * 1024 * 1024
// JSON escaping can expand a 2 MiB markdown file; the decoded content is re-checked.
const MAX_BODY_BYTES = MAX_EDITOR_BYTES * 4

/** Template shown when a workspace has no AGENTS.md. It is only written by Save. */
const STARTER_CONTENT = `# AGENTS.md

Guidance for AI agents working in this workspace. Edit this file from DSH's
right sidebar, then save it. The agent sees the saved file on its next step.

## Project overview

<!-- What this project is, what it does, and anything a newcomer must know. -->

## Setup and checks

<!-- Install, build, test, lint, and any non-obvious commands. -->

## Conventions

<!-- Style, structure, review expectations, and things to avoid. -->
`

/**
 * @typedef {object} RequestError
 * @property {number} status
 * @property {string} code
 * @property {string} message
 */

function requestError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isAbsoluteWorkspace(value) {
  return isNonEmptyString(value) && isAbsolute(value) && !value.includes('\0')
}

function errorCode(error) {
  return typeof error?.code === 'string' ? error.code : undefined
}

/** Resolve the harness home the way DSH's own host state does. */
function resolveDshHome() {
  const configured = process.env.DSH_HOME
  if (isNonEmptyString(configured) && isAbsolute(configured)) return configured
  return join(homedir(), '.dsh')
}

/**
 * Unsaved editor drafts, independent of the browser origin.
 *
 * DSH Desktop launches its Web server on an OS-assigned port, so a
 * `localStorage` key from one launch is a different origin after a restart.
 * Drafts therefore live under `$DSH_HOME/agents-md/drafts.json`; the Client
 * also mirrors them in `localStorage` so a failed host write still leaves a
 * same-session copy.
 */
function createDraftStore() {
  const directory = join(resolveDshHome(), DRAFT_DIR_NAME)
  const filePath = join(directory, DRAFT_FILE_NAME)
  /** In-process tombstones: a late in-flight draft must not undo a save or discard. */
  const cleared = new Map()
  let entries
  let loading
  let writes = Promise.resolve()

  async function readEntries() {
    const next = new Map()
    try {
      const raw = await readDiskFile(filePath, 'utf8')
      const parsed = JSON.parse(raw)
      const stored = parsed?.drafts
      if (stored !== null && typeof stored === 'object' && !Array.isArray(stored)) {
        const now = Date.now()
        for (const [cwd, value] of Object.entries(stored)) {
          if (cwd.length === 0 || cwd.length > 4096) continue
          if (value === null || typeof value !== 'object') continue
          if (typeof value.content !== 'string') continue
          if (Buffer.byteLength(value.content, 'utf8') > MAX_EDITOR_BYTES) continue
          const updatedAt = Number(value.updatedAt)
          if (!Number.isFinite(updatedAt) || updatedAt <= 0) continue
          if (now - updatedAt > DRAFT_RETENTION_MS) continue
          next.set(cwd, { content: value.content, updatedAt })
        }
      }
    } catch {
      // A missing file is normal; malformed state is replaced by the next write.
    }
    entries = next
    return entries
  }

  function load() {
    if (entries !== undefined) return Promise.resolve(entries)
    if (loading !== undefined) return loading
    loading = readEntries().finally(() => {
      loading = undefined
    })
    return loading
  }

  function persist() {
    const task = writes.then(async () => {
      const map = entries ?? new Map()
      const body = JSON.stringify({ version: 1, drafts: Object.fromEntries(map) }, null, 2)
      const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`
      try {
        await mkdir(directory, { recursive: true, mode: 0o700 })
        await writeFile(temp, body, { mode: 0o600 })
        await rename(temp, filePath)
        return true
      } catch {
        try {
          await unlink(temp)
        } catch {
          // The temporary file may never have been created.
        }
        return false
      }
    }).catch(() => false)
    writes = task.then(() => undefined)
    return task
  }

  return {
    async get(cwd) {
      const map = await load()
      const entry = map.get(cwd)
      if (entry === undefined) return null
      const clearedAt = cleared.get(cwd) ?? 0
      if (entry.updatedAt <= clearedAt) {
        map.delete(cwd)
        await persist()
        return null
      }
      if (Date.now() - entry.updatedAt > DRAFT_RETENTION_MS) {
        cleared.set(cwd, Date.now())
        map.delete(cwd)
        await persist()
        return null
      }
      return entry
    },
    async set(cwd, content, updatedAt) {
      const map = await load()
      const previous = map.get(cwd)
      if (previous !== undefined && previous.updatedAt > updatedAt) return true
      if (updatedAt <= (cleared.get(cwd) ?? 0)) return true
      map.set(cwd, { content, updatedAt })
      return persist()
    },
    async clear(cwd, updatedAt = Date.now()) {
      const map = await load()
      const previous = map.get(cwd)
      if (previous !== undefined && previous.updatedAt > updatedAt) return true
      if (updatedAt > (cleared.get(cwd) ?? 0)) cleared.set(cwd, updatedAt)
      if (!map.delete(cwd)) return true
      return persist()
    },
  }
}

/**
 * Per-workspace Git preferences. `defaultApplied` records that the plugin has
 * already applied its default ignore policy once, so a later manual edit of
 * `.gitignore` is never fought. `include` is used only before a file exists.
 */
function createGitStateStore() {
  const directory = join(resolveDshHome(), DRAFT_DIR_NAME)
  const filePath = join(directory, GIT_STATE_FILE_NAME)
  let entries
  let loading
  let writes = Promise.resolve()

  async function readEntries() {
    const next = new Map()
    try {
      const raw = await readDiskFile(filePath, 'utf8')
      const parsed = JSON.parse(raw)
      const stored = parsed?.workspaces
      if (stored !== null && typeof stored === 'object' && !Array.isArray(stored)) {
        for (const [cwd, value] of Object.entries(stored)) {
          if (cwd.length === 0 || cwd.length > 4096) continue
          if (value === null || typeof value !== 'object') continue
          next.set(cwd, {
            defaultApplied: value.defaultApplied === true,
            ...typeof value.include === 'boolean' ? { include: value.include } : {},
          })
        }
      }
    } catch {
      // Missing or malformed state starts clean.
    }
    entries = next
    return entries
  }

  function load() {
    if (entries !== undefined) return Promise.resolve(entries)
    if (loading !== undefined) return loading
    loading = readEntries().finally(() => {
      loading = undefined
    })
    return loading
  }

  function persist() {
    const task = writes.then(async () => {
      const map = entries ?? new Map()
      const body = JSON.stringify({ version: 1, workspaces: Object.fromEntries(map) }, null, 2)
      const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`
      try {
        await mkdir(directory, { recursive: true, mode: 0o700 })
        await writeFile(temp, body, { mode: 0o600 })
        await rename(temp, filePath)
        return true
      } catch {
        try {
          await unlink(temp)
        } catch {
          // The temporary file may never have been created.
        }
        return false
      }
    }).catch(() => false)
    writes = task.then(() => undefined)
    return task
  }

  return {
    async get(cwd) {
      const map = await load()
      const value = map.get(cwd)
      return value === undefined ? undefined : { ...value }
    },
    async set(cwd, patch) {
      const map = await load()
      map.set(cwd, { ...(map.get(cwd) ?? {}), ...patch })
      return persist()
    },
  }
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

/**
 * Reject cross-site writes. The desktop GUI and the browser both serve the
 * page from the same host, so a differing Origin is not our caller.
 * Requests without an Origin (curl, same-origin GET) are allowed.
 */
function originAllowed(request) {
  const origin = request.headers.origin
  if (typeof origin !== 'string' || origin.length === 0) return true
  const host = request.headers.host
  if (typeof host !== 'string' || host.length === 0) return false
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    return false
  }
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers['content-length'])
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw requestError(413, 'too-large', 'request body is too large')
  }

  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw requestError(413, 'too-large', 'request body is too large')
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw requestError(400, 'bad-request', 'request body is not valid JSON')
  }
}

/**
 * The effective working directory, falling back to the session header's
 * original project directory when the working-directory service is absent.
 */
function workingDirectoryOf(ctx, session) {
  const workingDirectory = ctx.get('workingDirectory')
  if (workingDirectory !== undefined) {
    try {
      const cwd = workingDirectory.get(session)
      if (isAbsoluteWorkspace(cwd)) return cwd
    } catch {
      // Fall through to the header.
    }
  }
  const cwd = session?.header?.cwd
  return isAbsoluteWorkspace(cwd) ? cwd : undefined
}

/**
 * Find a live session first, then fall back to a persisted header so a
 * restored sidebar tab can still read its file before the agent is running.
 */
async function resolveSession(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  const live = sessions?.get?.(sessionId)
  if (live !== undefined) {
    return { session: live, cwd: workingDirectoryOf(ctx, live) }
  }

  const sessionQuery = ctx.get('sessionQuery')
  if (sessionQuery === undefined) return undefined
  let records
  try {
    records = await sessionQuery.listSessions()
  } catch {
    return undefined
  }
  const record = records.find((entry) => entry?.header?.id === sessionId)
  if (record === undefined) return undefined
  const cwd = record.header?.cwd
  return { session: undefined, cwd: isAbsoluteWorkspace(cwd) ? cwd : undefined }
}

/**
 * The per-call sandbox policy. A live session supplies its own mode and
 * workspace root; the persisted fallback keeps the deployment default mode
 * but makes the session workspace the writable root.
 */
function policyFor(ctx, session, cwd) {
  const sandboxPolicy = ctx.get('sandboxPolicy')
  if (sandboxPolicy === undefined) return undefined
  try {
    if (session !== undefined) return sandboxPolicy.resolve({ session })
    return { ...sandboxPolicy.resolve({}), workspaceRoot: cwd }
  } catch {
    return undefined
  }
}

/**
 * The editor follows whichever agent-instruction spelling already exists in
 * the workspace. `AGENTS.md` wins when several variants are present, then the
 * plural and singular lowercase forms, then a stable name order.
 */
async function findActiveFile(ctx, cwd) {
  const fs = ctx.get('fs')
  if (fs === undefined) {
    throw requestError(503, 'fs-unavailable', 'the filesystem service is not available')
  }

  let entries = []
  try {
    const directory = await fs.resolve(cwd)
    entries = await fs.listDir(directory)
  } catch {
    // An unreadable directory falls back to the canonical path; Save will
    // report the real filesystem error.
  }

  const candidates = entries
    .filter((entry) => entry.type === 'file' && AGENT_FILE_RE.test(entry.name))
    .sort((left, right) => {
      const rank = (name) => {
        if (name === FILE_NAME) return 0
        if (name.toLowerCase() === 'agents.md') return 1
        if (name.toLowerCase() === 'agent.md') return 2
        return 3
      }
      return rank(left.name) - rank(right.name) || left.name.localeCompare(right.name)
    })

  const chosen = candidates[0]
  if (chosen !== undefined) {
    const target = chosen.target ?? await fs.resolve(join(cwd, chosen.name))
    return { fs, target, fileName: chosen.name, exists: true }
  }

  const target = await fs.resolve(join(cwd, FILE_NAME))
  return { fs, target, fileName: FILE_NAME, exists: false }
}

async function statFile(fs, target) {
  const info = await fs.stat(target)
  if (info === undefined) return undefined
  if (info.type !== 'file') {
    throw requestError(409, 'not-a-file', `${FILE_NAME} is not a regular file`)
  }
  if (info.size > MAX_EDITOR_BYTES) {
    throw requestError(413, 'too-large', `${FILE_NAME} exceeds the ${MAX_EDITOR_BYTES}-byte editor limit`)
  }
  return info
}

async function readFile(fs, target) {
  const info = await statFile(fs, target)
  if (info === undefined) return undefined
  const content = await fs.readText(target)
  return { content, version: info.version, size: info.size }
}

/**
 * Read the file, or return the template when it is absent. This function is
 * deliberately read-only: opening the panel must not create a file. The
 * Client's Save sends `version: null`, and `saveFile` creates the file then.
 */
async function loadFile(ctx, cwd) {
  const active = await findActiveFile(ctx, cwd)
  const existing = await readFile(active.fs, active.target)
  if (existing !== undefined) {
    return {
      name: active.fileName,
      path: active.target.displayPath,
      cwd,
      exists: true,
      template: false,
      content: existing.content,
      version: existing.version,
      size: existing.size,
    }
  }

  return {
    name: active.fileName,
    path: active.target.displayPath,
    cwd,
    exists: false,
    template: true,
    content: STARTER_CONTENT,
    version: null,
    size: Buffer.byteLength(STARTER_CONTENT),
  }
}

function parseSaveBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw requestError(400, 'bad-request', 'request body must be a JSON object')
  }
  if (typeof body.content !== 'string') {
    throw requestError(400, 'bad-request', 'content must be a string')
  }
  if (Buffer.byteLength(body.content, 'utf8') > MAX_EDITOR_BYTES) {
    throw requestError(413, 'too-large', `content exceeds the ${MAX_EDITOR_BYTES}-byte editor limit`)
  }
  if (body.version !== null && body.version !== undefined && !isNonEmptyString(body.version)) {
    throw requestError(400, 'bad-request', 'version must be a string or null')
  }
  if (body.includeInGit !== undefined && typeof body.includeInGit !== 'boolean') {
    throw requestError(400, 'bad-request', 'includeInGit must be a boolean')
  }
  return {
    content: body.content,
    version: body.version ?? null,
    includeInGit: body.includeInGit === true,
  }
}

function parseGitBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw requestError(400, 'bad-request', 'request body must be a JSON object')
  }
  if (typeof body.include !== 'boolean') {
    throw requestError(400, 'bad-request', 'include must be a boolean')
  }
  return { include: body.include }
}

function gitPayload(state, active, include, defaultApplied, warning) {
  return {
    ...state,
    fileName: active.fileName,
    fileExists: active.exists,
    include,
    defaultApplied,
    ...warning === undefined ? {} : { warning },
  }
}

function parseDraftBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw requestError(400, 'bad-request', 'request body must be a JSON object')
  }
  if (body.content !== null && typeof body.content !== 'string') {
    throw requestError(400, 'bad-request', 'content must be a string or null')
  }
  if (typeof body.content === 'string' && Buffer.byteLength(body.content, 'utf8') > MAX_EDITOR_BYTES) {
    throw requestError(413, 'too-large', `content exceeds the ${MAX_EDITOR_BYTES}-byte editor limit`)
  }
  const now = Date.now()
  const requested = Number(body.updatedAt)
  const updatedAt = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, now + 60_000)
    : now
  return { content: body.content, updatedAt }
}

/**
 * Save with an optimistic version guard. `version: null` means "the editor
 * believes the file does not exist yet", and creates only if that is still
 * true; a string means "replace exactly this observed version".
 */
async function saveFile(ctx, session, cwd, content, version) {
  const active = await findActiveFile(ctx, cwd)
  const { fs, target } = active
  const info = await fs.stat(target)
  if (info !== undefined && info.type !== 'file') {
    throw requestError(409, 'not-a-file', `${active.fileName} is not a regular file`)
  }

  if (version === null && info !== undefined) {
    throw requestError(409, 'conflict', `${active.fileName} now exists on disk`)
  }
  if (version !== null && info === undefined) {
    throw requestError(409, 'conflict', `${active.fileName} no longer exists on disk`)
  }

  const expected = version === null
    ? { kind: 'createIfAbsent' }
    : { kind: 'replaceIfVersion', version }

  try {
    const result = await fs.writeText(
      target,
      content,
      expected,
      undefined,
      policyFor(ctx, session, cwd),
    )
    return {
      name: active.fileName,
      path: target.displayPath,
      cwd,
      version: result.version,
      size: Buffer.byteLength(content),
    }
  } catch (error) {
    const code = errorCode(error)
    if (code === 'FS_STALE_VERSION' || code === 'FS_NOT_OBSERVED') {
      throw requestError(409, 'conflict', `${active.fileName} changed on disk since it was loaded`)
    }
    if (code === 'FS_SANDBOX_DENIED' || code === 'FS_READ_ONLY') {
      throw requestError(403, 'forbidden', error.message)
    }
    throw error
  }
}

function sessionIdOf(request) {
  let url
  try {
    url = new URL(request.url ?? '/', 'http://127.0.0.1')
  } catch {
    throw requestError(400, 'bad-request', 'invalid request URL')
  }
  const sessionId = url.searchParams.get('sessionId')
  if (!isNonEmptyString(sessionId) || sessionId.length > 256) {
    throw requestError(400, 'bad-request', 'sessionId is required')
  }
  return sessionId
}

async function requireSession(ctx, request) {
  if (!originAllowed(request)) {
    throw requestError(403, 'forbidden', 'cross-origin request refused')
  }
  const sessionId = sessionIdOf(request)
  const resolved = await resolveSession(ctx, sessionId)
  if (resolved === undefined) {
    throw requestError(404, 'session-not-found', 'session not found')
  }
  if (resolved.cwd === undefined) {
    throw requestError(409, 'no-workspace', 'this session has no workspace directory')
  }
  return resolved
}

function sendRouteError(ctx, response, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500
  const code = typeof error?.code === 'string' ? error.code : 'internal'
  if (status >= 500) {
    ctx.logger?.warn?.(`agents-md: request failed: ${error?.stack ?? error}`)
  }
  if (!response.headersSent) {
    sendJson(response, status, { ok: false, error: code, message: String(error?.message ?? error) })
  } else {
    response.end()
  }
}

function requireEditorRequest(request) {
  if (request.headers['x-dsh-agents-md'] !== '1') {
    throw requestError(403, 'forbidden', 'missing editor request header')
  }
  const contentType = String(request.headers['content-type'] ?? '')
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw requestError(415, 'unsupported-media-type', 'content-type must be application/json')
  }
}

function createFileRoute(ctx, drafts, gitPrefs) {
  return async (request, response) => {
    try {
      if (request.method === 'GET') {
        const { cwd } = await requireSession(ctx, request)
        const file = await loadFile(ctx, cwd)
        const stored = await drafts.get(cwd)
        const draft = stored !== null && stored.content !== file.content ? stored : null
        if (stored !== null && draft === null) await drafts.clear(cwd, Date.now())
        sendJson(response, 200, { ok: true, file: { ...file, draft } })
        return
      }

      if (request.method === 'POST') {
        requireEditorRequest(request)
        const { session, cwd } = await requireSession(ctx, request)
        const { content, version, includeInGit } = parseSaveBody(await readJsonBody(request))
        const saved = await saveFile(ctx, session, cwd, content, version)
        let git
        let gitWarning
        try {
          const active = await findActiveFile(ctx, cwd)
          const state = await applyGitPreference(
            active.fs,
            cwd,
            active.fileName,
            includeInGit,
            policyFor(ctx, session, cwd),
          )
          await gitPrefs.set(cwd, { defaultApplied: true, include: !state.ignored })
          git = gitPayload(state, active, !state.ignored, true)
        } catch (error) {
          gitWarning = String(error?.message ?? error)
        }
        await drafts.clear(cwd, Date.now())
        sendJson(response, 200, {
          ok: true,
          file: { ...saved, draft: null },
          ...git === undefined ? {} : { git },
          ...gitWarning === undefined ? {} : { gitWarning },
        })
        return
      }

      sendJson(response, 405, { ok: false, error: 'method-not-allowed' })
    } catch (error) {
      sendRouteError(ctx, response, error)
    }
  }
}

function createGitRoute(ctx, gitPrefs) {
  return async (request, response) => {
    try {
      if (request.method === 'GET') {
        const { session, cwd } = await requireSession(ctx, request)
        const active = await findActiveFile(ctx, cwd)
        const preference = await gitPrefs.get(cwd)
        let state = await readGitState(active.fs, cwd, active.fileName)
        let defaultApplied = preference?.defaultApplied === true
        let warning

        if (active.exists && !defaultApplied) {
          if (state.ignored) {
            defaultApplied = true
            await gitPrefs.set(cwd, { defaultApplied: true, include: false })
          } else {
            try {
              state = await applyGitPreference(
                active.fs,
                cwd,
                active.fileName,
                false,
                policyFor(ctx, session, cwd),
              )
              defaultApplied = true
              await gitPrefs.set(cwd, { defaultApplied: true, include: !state.ignored })
            } catch (error) {
              warning = String(error?.message ?? error)
            }
          }
        }

        const include = active.exists
          ? !state.ignored
          : (state.ignored ? false : (preference?.include ?? false))
        sendJson(response, 200, {
          ok: true,
          git: gitPayload(state, active, include, defaultApplied, warning),
        })
        return
      }

      if (request.method === 'POST') {
        requireEditorRequest(request)
        const { session, cwd } = await requireSession(ctx, request)
        const { include } = parseGitBody(await readJsonBody(request))
        const active = await findActiveFile(ctx, cwd)
        const state = await applyGitPreference(
          active.fs,
          cwd,
          active.fileName,
          include,
          policyFor(ctx, session, cwd),
        )
        const actualInclude = !state.ignored
        await gitPrefs.set(cwd, { defaultApplied: true, include: actualInclude })
        sendJson(response, 200, {
          ok: true,
          git: gitPayload(state, active, actualInclude, true),
        })
        return
      }

      sendJson(response, 405, { ok: false, error: 'method-not-allowed' })
    } catch (error) {
      sendRouteError(ctx, response, error)
    }
  }
}

function createDraftRoute(ctx, drafts) {
  return async (request, response) => {
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      requireEditorRequest(request)
      const { cwd } = await requireSession(ctx, request)
      const { content, updatedAt } = parseDraftBody(await readJsonBody(request))
      const persisted = content === null
        ? await drafts.clear(cwd, updatedAt)
        : await drafts.set(cwd, content, updatedAt)
      sendJson(response, 200, { ok: true, persisted })
    } catch (error) {
      sendRouteError(ctx, response, error)
    }
  }
}

/** Required service; the filesystem and session services are read opportunistically. */
export const inject = ['webServer']

/**
 * Mount the AGENTS.md read/write and draft routes.
 * @param ctx - Host plugin context carrying the Web server.
 */
export function apply(ctx) {
  const drafts = createDraftStore()
  const gitPrefs = createGitStateStore()

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: createFileRoute(ctx, drafts, gitPrefs),
    }),
    'agents-md: editor route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: DRAFT_ROUTE_PATH,
      handler: createDraftRoute(ctx, drafts),
    }),
    'agents-md: draft route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: GIT_ROUTE_PATH,
      handler: createGitRoute(ctx, gitPrefs),
    }),
    'agents-md: gitignore route',
  )
}

export {
  STARTER_CONTENT,
  MAX_EDITOR_BYTES,
  FILE_NAME,
  ROUTE_PATH,
  DRAFT_ROUTE_PATH,
  GIT_ROUTE_PATH,
}

export { createDraftStore, createGitStateStore }

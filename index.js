/**
 * AGENTS.md — Host half.
 *
 * Owns the workspace `AGENTS.md` file on behalf of the right-sidebar editor:
 * a same-origin read/write route scoped to a live session's workspace, plus a
 * first-prompt seed so a workspace without the file gets the starter template
 * before DSH's workspace-instruction loader assembles its baseline.
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

const ROUTE_PATH = '/plugins/agents-md'
const DRAFT_ROUTE_PATH = '/plugins/agents-md/draft'
const FILE_NAME = 'AGENTS.md'
const DRAFT_DIR_NAME = 'agents-md'
const DRAFT_FILE_NAME = 'drafts.json'
const DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_EDITOR_BYTES = 2 * 1024 * 1024
// JSON escaping can expand a 2 MiB markdown file; the decoded content is re-checked.
const MAX_BODY_BYTES = MAX_EDITOR_BYTES * 4
const SEED_RETRY_MS = 60_000

/** Written only when a workspace has no AGENTS.md yet. */
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

async function resolveTarget(ctx, cwd) {
  const fs = ctx.get('fs')
  if (fs === undefined) {
    throw requestError(503, 'fs-unavailable', 'the filesystem service is not available')
  }
  const target = await fs.resolve(join(cwd, FILE_NAME))
  return { fs, target }
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
 * Read the file, creating the starter template when it is absent. A failed
 * creation (for example a read-only sandbox) still returns the starter so the
 * editor can show a draft; `warning` tells the Client it cannot save yet.
 */
async function loadFile(ctx, session, cwd) {
  const { fs, target } = await resolveTarget(ctx, cwd)
  const existing = await readFile(fs, target)
  if (existing !== undefined) {
    return {
      path: target.displayPath,
      cwd,
      exists: true,
      created: false,
      content: existing.content,
      version: existing.version,
      size: existing.size,
    }
  }

  try {
    const result = await fs.writeText(
      target,
      STARTER_CONTENT,
      { kind: 'createIfAbsent' },
      undefined,
      policyFor(ctx, session, cwd),
    )
    return {
      path: target.displayPath,
      cwd,
      exists: true,
      created: true,
      content: STARTER_CONTENT,
      version: result.version,
      size: Buffer.byteLength(STARTER_CONTENT),
    }
  } catch (error) {
    const code = errorCode(error)
    // Lost a create race: another reader created it between stat and write.
    if (code === 'FS_NOT_OBSERVED' || code === 'FS_STALE_VERSION') {
      const again = await readFile(fs, target)
      if (again !== undefined) {
        return {
          path: target.displayPath,
          cwd,
          exists: true,
          created: false,
          content: again.content,
          version: again.version,
          size: again.size,
        }
      }
    }
    return {
      path: target.displayPath,
      cwd,
      exists: false,
      created: false,
      content: STARTER_CONTENT,
      version: null,
      size: Buffer.byteLength(STARTER_CONTENT),
      warning: code ?? 'FS_IO_ERROR',
    }
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
  return {
    content: body.content,
    version: body.version ?? null,
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
  const { fs, target } = await resolveTarget(ctx, cwd)
  const info = await fs.stat(target)
  if (info !== undefined && info.type !== 'file') {
    throw requestError(409, 'not-a-file', `${FILE_NAME} is not a regular file`)
  }

  if (version === null && info !== undefined) {
    throw requestError(409, 'conflict', `${FILE_NAME} now exists on disk`)
  }
  if (version !== null && info === undefined) {
    throw requestError(409, 'conflict', `${FILE_NAME} no longer exists on disk`)
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
      path: target.displayPath,
      cwd,
      version: result.version,
      size: Buffer.byteLength(content),
    }
  } catch (error) {
    const code = errorCode(error)
    if (code === 'FS_STALE_VERSION' || code === 'FS_NOT_OBSERVED') {
      throw requestError(409, 'conflict', `${FILE_NAME} changed on disk since it was loaded`)
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

function createFileRoute(ctx, drafts) {
  return async (request, response) => {
    try {
      if (request.method === 'GET') {
        const { session, cwd } = await requireSession(ctx, request)
        const file = await loadFile(ctx, session, cwd)
        const stored = await drafts.get(cwd)
        const draft = stored !== null && stored.content !== file.content ? stored : null
        if (stored !== null && draft === null) await drafts.clear(cwd, Date.now())
        sendJson(response, 200, { ok: true, file: { ...file, draft } })
        return
      }

      if (request.method === 'POST') {
        requireEditorRequest(request)
        const { session, cwd } = await requireSession(ctx, request)
        const { content, version } = parseSaveBody(await readJsonBody(request))
        const saved = await saveFile(ctx, session, cwd, content, version)
        await drafts.clear(cwd, Date.now())
        sendJson(response, 200, { ok: true, file: { ...saved, draft: null } })
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

/** Seeded workspaces in this process: success is permanent, failure backs off. */
const seededWorkspaces = new Map()

/**
 * Create `AGENTS.md` before the first prompt if the workspace has no file.
 * The built-in workspace-instruction loader runs later in the same pre-step
 * waterfall, so its first baseline already includes the starter file.
 */
async function seedWorkspace(ctx, agent) {
  const cwd = workingDirectoryOf(ctx, agent.session)
  if (cwd === undefined) return
  const cached = seededWorkspaces.get(cwd)
  if (cached !== undefined && (cached.ok || Date.now() - cached.at < SEED_RETRY_MS)) return

  const fs = ctx.get('fs')
  if (fs === undefined) return

  try {
    const target = await fs.resolve(join(cwd, FILE_NAME))
    if (await fs.stat(target) !== undefined) {
      seededWorkspaces.set(cwd, { ok: true, at: Date.now() })
      return
    }
    await fs.writeText(
      target,
      STARTER_CONTENT,
      { kind: 'createIfAbsent' },
      undefined,
      policyFor(ctx, agent.session, cwd),
    )
    seededWorkspaces.set(cwd, { ok: true, at: Date.now() })
  } catch (error) {
    seededWorkspaces.set(cwd, { ok: false, at: Date.now() })
    ctx.logger?.warn?.(`agents-md: could not create ${FILE_NAME} in ${cwd}: ${error?.message ?? error}`)
  }
}

/** Required service; the filesystem and session services are read opportunistically. */
export const inject = ['webServer']

/**
 * Mount the AGENTS.md route and the first-prompt seed.
 * @param ctx - Host plugin context carrying the Web server.
 */
export function apply(ctx) {
  const drafts = createDraftStore()

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: createFileRoute(ctx, drafts),
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

  ctx.on(
    'agent/pre-step',
    async ({ agent }, next) => {
      try {
        await seedWorkspace(ctx, agent)
      } catch (error) {
        ctx.logger?.warn?.(`agents-md: seed skipped: ${error?.message ?? error}`)
      }
      return next()
    },
    { prepend: true },
  )
}

export { STARTER_CONTENT, MAX_EDITOR_BYTES, FILE_NAME, ROUTE_PATH, DRAFT_ROUTE_PATH }

export { createDraftStore }

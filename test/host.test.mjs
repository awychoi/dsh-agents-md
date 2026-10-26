import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { after } from 'node:test'
import { apply, createDraftStore, DRAFT_ROUTE_PATH, FILE_NAME, STARTER_CONTENT } from '../index.js'

const SESSION_ID = 'session-test'
const CWD = '/tmp/agents-md-test-workspace'
const TEST_DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-agents-md-test-'))
process.env.DSH_HOME = TEST_DSH_HOME

after(() => {
  rmSync(TEST_DSH_HOME, { recursive: true, force: true })
})

function clearDrafts() {
  rmSync(join(TEST_DSH_HOME, 'agents-md', 'drafts.json'), { force: true })
}

function makeHarness({ files = new Map() } = {}) {
  clearDrafts()
  const routes = new Map()
  const listeners = []
  let versionCounter = 0
  const versions = new Map()

  const fs = {
    async resolve(path) {
      return { targetKey: path, displayPath: path }
    },
    async stat(target) {
      if (!files.has(target.targetKey)) return undefined
      return {
        version: versions.get(target.targetKey),
        type: 'file',
        size: Buffer.byteLength(files.get(target.targetKey)),
      }
    },
    async readText(target) {
      return files.get(target.targetKey)
    },
    async writeText(target, content, expected) {
      const exists = files.has(target.targetKey)
      if (expected?.kind === 'createIfAbsent' && exists) {
        const error = new Error('already exists')
        error.code = 'FS_NOT_OBSERVED'
        throw error
      }
      if (expected?.kind === 'replaceIfVersion') {
        if (!exists || versions.get(target.targetKey) !== expected.version) {
          const error = new Error('stale')
          error.code = 'FS_STALE_VERSION'
          throw error
        }
      }
      versionCounter += 1
      const version = `v${versionCounter}`
      files.set(target.targetKey, content)
      versions.set(target.targetKey, version)
      return { operation: exists ? 'update' : 'create', version }
    },
  }

  const session = { id: SESSION_ID, header: { id: SESSION_ID, cwd: CWD } }
  const sessions = new Map([[SESSION_ID, session]])

  const ctx = {
    logger: { warn() {} },
    webServer: {
      register(route) {
        routes.set(route.path, route.handler)
        return () => routes.delete(route.path)
      },
    },
    effect(fn) {
      return fn()
    },
    on(event, listener, options) {
      listeners.push({ event, listener, options })
      return () => {}
    },
    get(name) {
      if (name === 'fs') return fs
      if (name === 'sessions') return { get: (id) => sessions.get(id) }
      if (name === 'workingDirectory') return { get: (value) => value.header.cwd }
      if (name === 'sandboxPolicy') return { resolve: () => ({ mode: 'workspace-write', workspaceRoot: CWD }) }
      return undefined
    },
  }

  apply(ctx)
  return { ctx, routes, listeners, files, versions, session }
}

function invoke(handler, { method = 'GET', url = `/plugins/agents-md?sessionId=${SESSION_ID}`, headers = {}, body } = {}) {
  const chunks = body === undefined ? [] : [Buffer.from(body)]
  const request = {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
  const response = {
    headersSent: false,
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode
      this.headers = headers
      this.headersSent = true
    },
    end(body) {
      if (body !== undefined) this.body = Buffer.isBuffer(body) ? body.toString('utf8') : String(body)
    },
  }
  return handler(request, response).then(() => ({
    status: response.statusCode,
    headers: response.headers,
    body: response.body.length === 0 ? undefined : JSON.parse(response.body),
  }))
}

test('GET creates the starter file and returns its version', async () => {
  const harness = makeHarness()
  const result = await invoke(harness.routes.get('/plugins/agents-md'))
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
  assert.equal(result.body.file.created, true)
  assert.equal(result.body.file.exists, true)
  assert.equal(result.body.file.content, STARTER_CONTENT)
  assert.match(result.body.file.version, /^v\d+$/)
  assert.equal(harness.files.get(`${CWD}/${FILE_NAME}`), STARTER_CONTENT)
  assert.equal(result.headers['cache-control'], 'no-store')
})

test('GET returns an existing file without overwriting it', async () => {
  const files = new Map([[`${CWD}/${FILE_NAME}`, '# Mine\n']])
  const harness = makeHarness({ files })
  const result = await invoke(harness.routes.get('/plugins/agents-md'))
  assert.equal(result.status, 200)
  assert.equal(result.body.file.created, false)
  assert.equal(result.body.file.content, '# Mine\n')
  assert.equal(files.get(`${CWD}/${FILE_NAME}`), '# Mine\n')
})

test('POST saves with a matching version', async () => {
  const harness = makeHarness()
  const first = await invoke(harness.routes.get('/plugins/agents-md'))
  const result = await invoke(harness.routes.get('/plugins/agents-md'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Saved\n', version: first.body.file.version }),
  })
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
  assert.equal(harness.files.get(`${CWD}/${FILE_NAME}`), '# Saved\n')
  assert.notEqual(result.body.file.version, first.body.file.version)
})

test('POST reports a conflict for a stale version and leaves the file alone', async () => {
  const harness = makeHarness()
  const first = await invoke(harness.routes.get('/plugins/agents-md'))
  await invoke(harness.routes.get('/plugins/agents-md'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# First save\n', version: first.body.file.version }),
  })
  const result = await invoke(harness.routes.get('/plugins/agents-md'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Stale save\n', version: first.body.file.version }),
  })
  assert.equal(result.status, 409)
  assert.equal(result.body.error, 'conflict')
  assert.equal(harness.files.get(`${CWD}/${FILE_NAME}`), '# First save\n')
})

test('POST refuses missing editor header, wrong content type, and cross-origin requests', async () => {
  const harness = makeHarness()
  const version = (await invoke(harness.routes.get('/plugins/agents-md'))).body.file.version
  const body = JSON.stringify({ content: '# Nope\n', version })

  const missingHeader = await invoke(harness.routes.get('/plugins/agents-md'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
  assert.equal(missingHeader.status, 403)

  const wrongType = await invoke(harness.routes.get('/plugins/agents-md'), {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-dsh-agents-md': '1' },
    body,
  })
  assert.equal(wrongType.status, 415)

  const crossOrigin = await invoke(harness.routes.get('/plugins/agents-md'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dsh-agents-md': '1',
      host: '127.0.0.1:54037',
      origin: 'https://example.com',
    },
    body,
  })
  assert.equal(crossOrigin.status, 403)
})

test('unknown sessions and sessions without a workspace are refused', async () => {
  const harness = makeHarness()
  const unknown = await invoke(harness.routes.get('/plugins/agents-md'), {
    url: '/plugins/agents-md?sessionId=missing',
  })
  assert.equal(unknown.status, 404)
  assert.equal(unknown.body.error, 'session-not-found')

  const empty = makeHarness()
  empty.session.header.cwd = null
  const noWorkspace = await invoke(empty.routes.get('/plugins/agents-md'))
  assert.equal(noWorkspace.status, 409)
  assert.equal(noWorkspace.body.error, 'no-workspace')
})

test('the pre-step seed creates AGENTS.md once and never overwrites it', async () => {
  const harness = makeHarness()
  const listener = harness.listeners.find((entry) => entry.event === 'agent/pre-step')
  assert.ok(listener)
  let nextCalls = 0
  const next = async () => {
    nextCalls += 1
    return { kind: 'enter', messages: [] }
  }
  await listener.listener({ agent: { session: harness.session } }, next)
  assert.equal(nextCalls, 1)
  assert.equal(harness.files.get(`${CWD}/${FILE_NAME}`), STARTER_CONTENT)

  harness.files.set(`${CWD}/${FILE_NAME}`, '# Keep me\n')
  await listener.listener({ agent: { session: harness.session } }, next)
  assert.equal(nextCalls, 2)
  assert.equal(harness.files.get(`${CWD}/${FILE_NAME}`), '# Keep me\n')
})

test('an unsaved draft is returned with the file and a save clears it', async () => {
  const harness = makeHarness()
  const fileRoute = harness.routes.get('/plugins/agents-md')
  const draftRoute = harness.routes.get(DRAFT_ROUTE_PATH)
  const first = await invoke(fileRoute)
  assert.equal(first.body.file.draft, null)

  const updatedAt = Date.now()
  const stored = await invoke(draftRoute, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Unsaved draft\n', updatedAt }),
  })
  assert.equal(stored.status, 200)
  assert.equal(stored.body.ok, true)
  assert.equal(stored.body.persisted, true)

  const reloaded = await invoke(fileRoute)
  assert.equal(reloaded.body.file.content, STARTER_CONTENT)
  assert.equal(reloaded.body.file.draft.content, '# Unsaved draft\n')
  assert.ok(reloaded.body.file.draft.updatedAt >= updatedAt)

  await invoke(fileRoute, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Saved draft\n', version: first.body.file.version }),
  })
  const afterSave = await invoke(fileRoute)
  assert.equal(afterSave.body.file.content, '# Saved draft\n')
  assert.equal(afterSave.body.file.draft, null)
})

test('a draft identical to the file is ignored and cleared', async () => {
  const harness = makeHarness()
  const fileRoute = harness.routes.get('/plugins/agents-md')
  const draftRoute = harness.routes.get(DRAFT_ROUTE_PATH)
  const first = await invoke(fileRoute)
  await invoke(draftRoute, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: first.body.file.content, updatedAt: Date.now() }),
  })
  const reloaded = await invoke(fileRoute)
  assert.equal(reloaded.body.file.draft, null)
  const store = createDraftStore()
  assert.equal(await store.get(CWD), null)
})

test('a draft survives a fresh store instance', async () => {
  clearDrafts()
  const first = createDraftStore()
  assert.equal(await first.set(CWD, '# Across restarts\n', Date.now()), true)
  const fresh = createDraftStore()
  const draft = await fresh.get(CWD)
  assert.equal(draft.content, '# Across restarts\n')
  assert.equal(await fresh.clear(CWD), true)
  const third = createDraftStore()
  assert.equal(await third.get(CWD), null)
})

test('an empty draft is meaningful and null clears it', async () => {
  const harness = makeHarness()
  const fileRoute = harness.routes.get('/plugins/agents-md')
  const draftRoute = harness.routes.get(DRAFT_ROUTE_PATH)
  const first = await invoke(fileRoute)
  const headers = { 'content-type': 'application/json', 'x-dsh-agents-md': '1' }

  await invoke(draftRoute, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: '', updatedAt: Date.now() }),
  })
  const empty = await invoke(fileRoute)
  assert.equal(empty.body.file.draft.content, '')

  await invoke(draftRoute, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: null, updatedAt: Date.now() + 1_000 }),
  })
  const cleared = await invoke(fileRoute)
  assert.equal(cleared.body.file.draft, null)
  assert.equal(cleared.body.file.content, first.body.file.content)
})

test('a late draft cannot undo a save, but a newer draft is accepted', async () => {
  const harness = makeHarness()
  const fileRoute = harness.routes.get('/plugins/agents-md')
  const draftRoute = harness.routes.get(DRAFT_ROUTE_PATH)
  const first = await invoke(fileRoute)

  await invoke(fileRoute, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Saved now\n', version: first.body.file.version }),
  })

  await invoke(draftRoute, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Late stale draft\n', updatedAt: Date.now() - 60_000 }),
  })
  const afterLate = await invoke(fileRoute)
  assert.equal(afterLate.body.file.draft, null)

  await invoke(draftRoute, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-agents-md': '1' },
    body: JSON.stringify({ content: '# Newer draft\n', updatedAt: Date.now() + 1_000 }),
  })
  const afterNewer = await invoke(fileRoute)
  assert.equal(afterNewer.body.file.draft.content, '# Newer draft\n')
})


window.__ModuleLoader__.load({
  id: 'dsh-agents-md',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'agentsMd'
    const PLUGIN_ID = 'dsh-agents-md'
    const KIND = 'agents-md'
    const ROUTE_PATH = '/plugins/agents-md'
    const DRAFT_ROUTE_PATH = '/plugins/agents-md/draft'
    const GIT_ROUTE_PATH = '/plugins/agents-md/gitignore'
    const OPEN_SHORTCUT_ID = 'agents-md.open'
    const DRAFT_PREFIX = 'dsh.agents-md.draft.v1:'
    const DRAFT_DELAY_MS = 300
    const MAX_EDITOR_BYTES = 2 * 1024 * 1024

    const en = {
      'type.label': 'AGENTS.md',
      'guide.title': 'AGENTS.md',
      'guide.description': 'Edit the agent’s workspace instructions',
      'editor.aria': 'AGENTS.md editor',
      'editor.placeholder': 'Write instructions for the agent…',
      'head.title': 'AGENTS.md',
      'head.subtitle': 'Workspace instructions',
      'loading': 'Loading AGENTS.md…',
      'loadFailed': 'Could not load AGENTS.md.',
      'retry': 'Retry',
      'noWorkspace': 'This session has no workspace folder.',
      'noWorkspaceHint': 'Start a session in a folder to edit its AGENTS.md.',
      'save': 'Save',
      'saving': 'Saving…',
      'saved': 'Saved',
      'savedHint': 'Saved. The agent will use this on its next step.',
      'savedShort': 'All changes saved',
      'unsaved': 'Unsaved',
      'draftPersisted': 'Draft kept, not saved',
      'upToDate': 'Up to date',
      'restored': 'Restored an unsaved draft. Save to let the agent see it.',
      'templateHint': 'Starter template. Save to create AGENTS.md in this workspace.',
      'notCreated': 'Not created yet',
      'notCreatedHint': 'This template is not on disk until you save.',
      'conflict': 'AGENTS.md changed on disk since it was opened. Reload to get the latest version.',
      'reload': 'Reload',
      'reloadTitle': 'Discard unsaved changes and reload AGENTS.md from disk',
      'discardConfirm': 'Discard your unsaved changes and reload AGENTS.md from disk?',
      'saveFailed': 'Could not save AGENTS.md.',
      'tooLarge': 'AGENTS.md is too large to edit here (limit 2 MB).',
      'forbidden': 'The current file policy does not allow writing AGENTS.md.',
      'sessionGone': 'This session is no longer available.',
      'requestFailed': 'Request failed: {message}',
      'lines': '{count} lines',
      'characters': '{count} characters',
      'loadFailedHint': 'The file may be unavailable, too large, or outside the session workspace.',
      'draftPersistedHint': 'This unsaved draft survives DSH restarts. The agent only reads it after Save.',
      'gitInclude': 'Include {file} in Git',
      'gitSwitchAria': 'Include {file} in Git',
      'gitIgnored': 'Ignored by .gitignore',
      'gitNotIgnored': 'Not ignored',
      'gitPendingIgnore': 'Will be ignored when saved',
      'gitPendingInclude': 'Not ignored; will be committed when saved',
      'gitUpdating': 'Updating .gitignore…',
      'gitLoading': 'Reading .gitignore…',
      'gitNoRepo': 'No Git repository; using the workspace .gitignore.',
      'gitBlockedHint': 'Ignored by another pattern',
      'gitBlocked': 'Still ignored by "{pattern}". Edit .gitignore manually to include this file.',
      'gitError': 'Could not update .gitignore: {message}',
      'gitNotApplied': 'The Git preference could not be applied.',
      'gitTracked': 'Already tracked by Git; .gitignore will not remove it from commits.',
      'shortcut.label': 'Open AGENTS.md',
      'shortcut.noSession': 'Open a session first',
    }

    const zh = {
      'type.label': 'AGENTS.md',
      'guide.title': 'AGENTS.md',
      'guide.description': '编辑智能体的工作区指令',
      'editor.aria': 'AGENTS.md 编辑器',
      'editor.placeholder': '为智能体编写工作区指令…',
      'head.title': 'AGENTS.md',
      'head.subtitle': '工作区指令',
      'loading': '正在加载 AGENTS.md…',
      'loadFailed': '无法加载 AGENTS.md。',
      'retry': '重试',
      'noWorkspace': '此会话没有工作区文件夹。',
      'noWorkspaceHint': '在文件夹中开始会话后即可编辑其 AGENTS.md。',
      'save': '保存',
      'saving': '正在保存…',
      'saved': '已保存',
      'savedHint': '已保存。智能体将在下一步使用此内容。',
      'savedShort': '所有更改已保存',
      'unsaved': '未保存',
      'draftPersisted': '草稿已保留，未保存',
      'upToDate': '已是最新',
      'restored': '已恢复未保存的草稿。保存后智能体才能看到。',
      'templateHint': '起始模板。保存后才会在此工作区创建 AGENTS.md。',
      'notCreated': '尚未创建',
      'notCreatedHint': '在保存前，此模板不会写入磁盘。',
      'conflict': '打开后 AGENTS.md 已在磁盘上更改。请重新加载最新版本。',
      'reload': '重新加载',
      'reloadTitle': '放弃未保存的更改并从磁盘重新加载 AGENTS.md',
      'discardConfirm': '放弃未保存的更改并从磁盘重新加载 AGENTS.md？',
      'saveFailed': '无法保存 AGENTS.md。',
      'tooLarge': 'AGENTS.md 过大，无法在此编辑（上限 2 MB）。',
      'forbidden': '当前文件策略不允许写入 AGENTS.md。',
      'sessionGone': '此会话已不可用。',
      'requestFailed': '请求失败：{message}',
      'lines': '{count} 行',
      'characters': '{count} 个字符',
      'loadFailedHint': '文件可能不可用、过大，或位于会话工作区之外。',
      'draftPersistedHint': '未保存的草稿在 DSH 重启后仍会保留。只有保存后智能体才会读取。',
      'gitInclude': '将 {file} 纳入 Git',
      'gitSwitchAria': '将 {file} 纳入 Git',
      'gitIgnored': '已被 .gitignore 忽略',
      'gitNotIgnored': '未被忽略',
      'gitPendingIgnore': '保存后将自动忽略',
      'gitPendingInclude': '未被忽略，保存后将可提交',
      'gitUpdating': '正在更新 .gitignore…',
      'gitLoading': '正在读取 .gitignore…',
      'gitNoRepo': '未检测到 Git 仓库；使用工作区 .gitignore。',
      'gitBlockedHint': '被其他规则忽略',
      'gitBlocked': '仍被“{pattern}”忽略。请手动编辑 .gitignore 以纳入此文件。',
      'gitError': '无法更新 .gitignore：{message}',
      'gitNotApplied': '无法应用 Git 偏好设置。',
      'gitTracked': '此文件已被 Git 跟踪；.gitignore 不会将其从提交中移除。',
      'shortcut.label': '打开 AGENTS.md',
      'shortcut.noSession': '请先选择会话',
    }

    const css = `
      .amd-root {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        color: var(--dsw-alias-label-primary);
        background: var(--dsw-alias-bg-base);
        font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      }
      .amd-head {
        box-sizing: border-box;
        display: flex;
        flex: none;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px 12px;
        padding: 12px 16px 10px;
        border-bottom: .5px solid var(--dsw-alias-border-l1);
      }
      .amd-heading {
        display: flex;
        flex: 1 1 180px;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }
      .amd-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .amd-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 18px;
        letter-spacing: .01em;
      }
      .amd-dirty {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--dsw-alias-state-warn-label);
        font-size: 11px;
        line-height: 16px;
        white-space: nowrap;
      }
      .amd-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 14%, transparent);
      }
      .amd-path {
        overflow: hidden;
        color: var(--dsw-alias-label-tertiary);
        font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
        font-size: 11px;
        line-height: 16px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .amd-actions {
        display: flex;
        flex: none;
        align-items: center;
        gap: 6px;
      }
      .amd-button {
        box-sizing: border-box;
        height: 28px;
        padding: 0 10px;
        border: .5px solid var(--dsw-alias-border-l3);
        border-radius: var(--dsw-radius-md);
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        line-height: 20px;
        white-space: nowrap;
        cursor: pointer;
        transition: background .12s ease, color .12s ease, opacity .12s ease;
      }
      .amd-button:hover:not(:disabled) {
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-primary);
      }
      .amd-button:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: 1px;
      }
      .amd-button:disabled {
        opacity: .5;
        cursor: default;
      }
      .amd-primary {
        border-color: transparent;
        background: var(--dsw-alias-button-primary-fill);
        color: var(--dsw-alias-label-primary-foreground);
        font-weight: 500;
      }
      .amd-primary:hover:not(:disabled) {
        background: var(--dsw-alias-button-primary-hover);
        color: var(--dsw-alias-label-primary-foreground);
      }
      .amd-banner {
        display: flex;
        flex: none;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin: 10px 16px 0;
        padding: 8px 10px;
        border-radius: var(--dsw-radius-md);
        font-size: 12px;
        line-height: 18px;
      }
      .amd-banner-text {
        flex: 1;
        min-width: 0;
        white-space: pre-wrap;
      }
      .amd-banner[data-kind=info] {
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-secondary);
      }
      .amd-banner[data-kind=success] {
        background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);
        color: var(--dsw-alias-label-secondary);
      }
      .amd-banner[data-kind=warn] {
        background: var(--dsw-alias-state-warn-tertiary);
        color: var(--dsw-alias-label-secondary);
      }
      .amd-banner[data-kind=error] {
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);
        color: var(--dsw-alias-state-error-primary);
      }
      .amd-banner-action {
        flex: none;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
      }
      .amd-gitbar {
        display: flex;
        flex: none;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-bottom: .5px solid var(--dsw-alias-border-l1);
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }
      .amd-switch {
        position: relative;
        width: 30px;
        height: 18px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: var(--dsw-alias-state-idle-primary);
        cursor: pointer;
        flex: none;
        transition: background .15s ease, opacity .12s ease;
      }
      .amd-switch[aria-checked=true] {
        background: var(--dsw-alias-state-business-primary);
      }
      .amd-switch:disabled {
        opacity: .5;
        cursor: default;
      }
      .amd-switch:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: 2px;
      }
      .amd-switch-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--dsw-alias-switch-thumb);
        box-shadow: 0 1px 2px color-mix(in srgb, #000 20%, transparent);
        transition: transform .15s ease;
      }
      .amd-switch[aria-checked=true] .amd-switch-thumb {
        transform: translateX(12px);
      }
      .amd-git-label {
        white-space: nowrap;
      }
      .amd-git-hint {
        min-width: 0;
        color: var(--dsw-alias-label-tertiary);
        font-size: 11px;
      }
      .amd-git-hint[data-kind=warn] {
        color: var(--dsw-alias-state-warn-label);
      }
      .amd-git-hint[data-kind=error] {
        color: var(--dsw-alias-state-error-primary);
      }
      .amd-editor-wrap {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
      }
      .amd-editor {
        box-sizing: border-box;
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 12px 16px 16px;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        caret-color: var(--dsw-alias-state-business-primary);
        font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
        font-size: 13px;
        line-height: 1.62;
        tab-size: 2;
        resize: none;
      }
      .amd-editor::placeholder {
        color: var(--dsw-alias-label-tertiary);
      }
      .amd-editor:disabled {
        opacity: .6;
      }
      .amd-footer {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 16px 8px;
        border-top: .5px solid var(--dsw-alias-border-l1);
        color: var(--dsw-alias-label-tertiary);
        font-size: 11px;
        line-height: 16px;
      }
      .amd-counts {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .amd-status[data-dirty=true] {
        color: var(--dsw-alias-state-warn-label);
      }
      .amd-status[data-kind=error] {
        color: var(--dsw-alias-state-error-primary);
      }
      .amd-center {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 0;
        padding: 24px;
        color: var(--dsw-alias-label-tertiary);
        text-align: center;
        font-size: 12px;
        line-height: 18px;
      }
      .amd-center p {
        max-width: 320px;
        margin: 0;
      }
      .amd-hint {
        color: var(--dsw-alias-label-tertiary);
        font-size: 11px;
      }
      .amd-pulse {
        width: 18px;
        height: 18px;
        border: 1.5px solid var(--dsw-alias-border-l3);
        border-top-color: var(--dsw-alias-state-business-primary);
        border-radius: 50%;
        animation: amd-spin .8s linear infinite;
      }
      @keyframes amd-spin {
        to { transform: rotate(360deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .amd-pulse { animation: none; }
      }
    `

    /** Small document-and-pen glyph used by the right-sidebar guide. */
    function FilePenGlyph({ size = 20, className }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
      }, [
        h('path', { key: 'sheet', d: 'M6.4 3.75h7.2l3.9 3.9v4.2' }),
        h('path', { key: 'fold', d: 'M13.6 3.75v4.1h4.1' }),
        h('path', { key: 'outline', d: 'M6.4 3.75A1.65 1.65 0 0 0 4.75 5.4v13.2a1.65 1.65 0 0 0 1.65 1.65h4.3' }),
        h('path', { key: 'pencil', d: 'm17.7 14.05 2.25 2.25-4.55 4.55h-2.25v-2.25z' }),
        h('path', { key: 'lines', d: 'M8 8.5h3.1M8 11.5h5.1M8 14.5h3.1' }),
      ])
    }

    function draftKey(cwd) {
      return `${DRAFT_PREFIX}${cwd}`
    }

    function readDraft(key) {
      try {
        const raw = window.localStorage.getItem(key)
        if (raw === null) return undefined
        const parsed = JSON.parse(raw)
        if (parsed === null || typeof parsed !== 'object') return undefined
        if (typeof parsed.content !== 'string') return undefined
        if (parsed.content.length > MAX_EDITOR_BYTES) return undefined
        return parsed
      } catch {
        return undefined
      }
    }

    function isDraft(value) {
      return value !== null
        && typeof value === 'object'
        && typeof value.content === 'string'
        && value.content.length <= MAX_EDITOR_BYTES
    }

    /**
     * The host draft is the one that survives a new Desktop port; the local
     * copy is written immediately and can be a fraction of a second newer.
     * Prefer whichever changed last, ignoring a draft that already matches the
     * saved file.
     */
    function chooseDraft(hostDraft, localDraft, fileContent) {
      const candidates = []
      if (isDraft(hostDraft) && hostDraft.content !== fileContent) {
        candidates.push({ content: hostDraft.content, updatedAt: Number(hostDraft.updatedAt) || 0, source: 'host' })
      }
      if (isDraft(localDraft) && localDraft.content !== fileContent) {
        candidates.push({ content: localDraft.content, updatedAt: Number(localDraft.updatedAt) || 0, source: 'local' })
      }
      if (candidates.length === 0) return undefined
      candidates.sort((left, right) => right.updatedAt - left.updatedAt)
      return candidates[0]
    }

    function writeDraft(key, content, updatedAt) {
      try {
        window.localStorage.setItem(key, JSON.stringify({ content, updatedAt }))
      } catch {
        // Quota or privacy mode: the draft simply cannot be restored next time.
      }
    }

    function removeDraft(key) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Nothing useful to do if storage is unavailable.
      }
    }

    function responseError(response, body) {
      const error = new Error(body?.message ?? `HTTP ${response.status}`)
      error.status = response.status
      error.code = typeof body?.error === 'string' ? body.error : undefined
      return error
    }

    async function fetchFile(sessionId, signal) {
      const response = await fetch(`${ROUTE_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      })
      const body = await response.json().catch(() => undefined)
      if (!response.ok || body?.ok !== true) throw responseError(response, body)
      return body.file
    }

    async function saveFile(sessionId, content, version, includeInGit) {
      const response = await fetch(`${ROUTE_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-dsh-agents-md': '1',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ content, version, includeInGit }),
      })
      const body = await response.json().catch(() => undefined)
      if (!response.ok || body?.ok !== true) throw responseError(response, body)
      return body
    }

    /**
     * Mirror an unsaved draft to the Host. Best effort: localStorage still has
     * a same-session copy, and the Host compares a draft against the saved file
     * on read. `keepalive` is for the page-hide and unload flush.
     */
    async function saveHostDraft(sessionId, content, updatedAt, keepalive = false) {
      try {
        const response = await fetch(`${DRAFT_ROUTE_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-dsh-agents-md': '1',
          },
          credentials: 'same-origin',
          cache: 'no-store',
          keepalive,
          body: JSON.stringify({ content, updatedAt }),
        })
        return response.ok
      } catch {
        return false
      }
    }

    async function clearHostDraft(sessionId, keepalive = false) {
      return saveHostDraft(sessionId, null, Date.now(), keepalive)
    }

    async function fetchGitState(sessionId, signal) {
      const response = await fetch(`${GIT_ROUTE_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      })
      const body = await response.json().catch(() => undefined)
      if (!response.ok || body?.ok !== true) throw responseError(response, body)
      return body.git
    }

    async function setGitInclude(sessionId, include) {
      const response = await fetch(`${GIT_ROUTE_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-dsh-agents-md': '1',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ include }),
      })
      const body = await response.json().catch(() => undefined)
      if (!response.ok || body?.ok !== true) throw responseError(response, body)
      return body.git
    }

    function messageFor(t, error) {
      switch (error?.code) {
        case 'conflict': return t('conflict')
        case 'too-large': return t('tooLarge')
        case 'forbidden': return t('forbidden')
        case 'session-not-found': return t('sessionGone')
        case 'no-workspace': return t('noWorkspace')
        default: return t('requestFailed', { message: error?.message ?? String(error) })
      }
    }

    function utf8Length(value) {
      return new TextEncoder().encode(value).length
    }

    function countLines(text) {
      if (text.length === 0) return 0
      let lines = 1
      for (let index = 0; index < text.length; index += 1) if (text.charCodeAt(index) === 10) lines += 1
      return lines
    }

    function StatusDot() {
      return h('span', { className: 'amd-dot', 'aria-hidden': true })
    }

    function AgentsEditor({ sessionId, useSessions, t }) {
      const cwd = useSessions((sessions) => sessions?.byId?.[sessionId]?.cwd)

      const [phase, setPhase] = React.useState('loading')
      const [saved, setSaved] = React.useState('')
      const [exists, setExists] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const [version, setVersion] = React.useState(null)
      const [filePath, setFilePath] = React.useState('')
      const [fileName, setFileName] = React.useState('AGENTS.md')
      const [git, setGit] = React.useState(null)
      const [gitBusy, setGitBusy] = React.useState(false)
      const [gitError, setGitError] = React.useState('')
      const [restored, setRestored] = React.useState(false)
      const [saving, setSaving] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [conflict, setConflict] = React.useState(false)
      const [loadError, setLoadError] = React.useState('')
      const [reloadTick, setReloadTick] = React.useState(0)

      const savedRef = React.useRef('')
      const draftRef = React.useRef('')
      const timerRef = React.useRef(undefined)
      const discardDraftRef = React.useRef(false)
      const hostQueueRef = React.useRef(Promise.resolve())

      React.useEffect(() => { savedRef.current = saved }, [saved])
      React.useEffect(() => { draftRef.current = draft }, [draft])

      const queueHostDraft = React.useCallback((sid, content, updatedAt, keepalive = false) => {
        hostQueueRef.current = hostQueueRef.current
          .then(() => saveHostDraft(sid, content, updatedAt, keepalive))
          .catch(() => false)
        return hostQueueRef.current
      }, [])

      const flushDraft = React.useCallback((keyCwd, sid, keepalive) => {
        if (discardDraftRef.current) return
        if (typeof keyCwd !== 'string' || keyCwd.length === 0) return
        if (typeof sid !== 'string' || sid.length === 0) return
        const content = draftRef.current
        const updatedAt = Date.now()
        const hostContent = content === savedRef.current ? null : content
        if (hostContent === null) removeDraft(draftKey(keyCwd))
        else writeDraft(draftKey(keyCwd), hostContent, updatedAt)
        if (keepalive) void saveHostDraft(sid, hostContent, updatedAt, true)
        else void queueHostDraft(sid, hostContent, updatedAt)
      }, [queueHostDraft])

      React.useEffect(() => {
        const onBeforeUnload = () => flushDraft(cwd, sessionId, true)
        const onVisibilityChange = () => {
          if (document.visibilityState === 'hidden') flushDraft(cwd, sessionId, true)
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
          window.removeEventListener('beforeunload', onBeforeUnload)
          document.removeEventListener('visibilitychange', onVisibilityChange)
          clearTimeout(timerRef.current)
          flushDraft(cwd, sessionId, false)
        }
      }, [flushDraft, cwd, sessionId])

      React.useEffect(() => {
        if (typeof cwd !== 'string' || cwd.length === 0) {
          setPhase('no-workspace')
          setSaved('')
          setDraft('')
          setFilePath('')
          setFileName('AGENTS.md')
          setExists(false)
          setGit(null)
          setGitBusy(false)
          setGitError('')
          setNotice(null)
          setConflict(false)
          setRestored(false)
          return undefined
        }

        const controller = new AbortController()
        const key = draftKey(cwd)
        const sid = sessionId
        const discardDraft = discardDraftRef.current
        discardDraftRef.current = false

        setPhase('loading')
        setNotice(null)
        setConflict(false)
        setRestored(false)
        setLoadError('')
        setGit(null)
        setGitBusy(false)
        setGitError('')

        fetchFile(sid, controller.signal)
          .then((file) => {
            const fileContent = typeof file?.content === 'string' ? file.content : ''
            const fileExists = file?.exists === true
            const localDraft = discardDraft ? undefined : readDraft(key)
            const chosen = discardDraft ? undefined : chooseDraft(file?.draft, localDraft, fileContent)
            const nextDraft = chosen !== undefined ? chosen.content : fileContent
            const wasRestored = chosen !== undefined

            if (chosen !== undefined) {
              const updatedAt = chosen.updatedAt > 0 ? chosen.updatedAt : Date.now()
              writeDraft(key, chosen.content, updatedAt)
              if (chosen.source === 'local') void queueHostDraft(sid, chosen.content, updatedAt)
            } else {
              removeDraft(key)
            }

            savedRef.current = fileContent
            draftRef.current = nextDraft
            setSaved(fileContent)
            setDraft(nextDraft)
            setVersion(typeof file?.version === 'string' ? file.version : null)
            setFilePath(typeof file?.path === 'string' ? file.path : 'AGENTS.md')
            setFileName(typeof file?.name === 'string' && file.name.length > 0 ? file.name : 'AGENTS.md')
            setExists(fileExists)
            setRestored(wasRestored)
            setPhase('ready')
            fetchGitState(sid, controller.signal)
              .then((state) => {
                if (controller.signal.aborted) return
                setGit(state)
                setGitError('')
              })
              .catch((error) => {
                if (controller.signal.aborted || error?.name === 'AbortError') return
                setGitError(messageFor(t, error))
              })
          })
          .catch((error) => {
            if (error?.name === 'AbortError') return
            if (error?.code === 'no-workspace') {
              setPhase('no-workspace')
              return
            }
            setLoadError(error?.code === 'too-large' ? t('tooLarge') : messageFor(t, error))
            setPhase('error')
          })

        return () => {
          controller.abort()
          clearTimeout(timerRef.current)
        }
      }, [sessionId, cwd, reloadTick, queueHostDraft])

      React.useEffect(() => {
        if (phase !== 'ready' || gitBusy || saving) return undefined
        let cancelled = false
        let inFlight = false
        const refresh = async () => {
          if (cancelled || inFlight || document.visibilityState === 'hidden') return
          inFlight = true
          try {
            const state = await fetchGitState(sessionId)
            if (!cancelled) {
              setGit(state)
              setGitError('')
            }
          } catch {
            // Keep the last known switch state; a transient read must not move it.
          } finally {
            inFlight = false
          }
        }
        const interval = setInterval(refresh, 4000)
        const onFocus = () => { void refresh() }
        const onVisibility = () => {
          if (document.visibilityState === 'visible') void refresh()
        }
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
          cancelled = true
          clearInterval(interval)
          window.removeEventListener('focus', onFocus)
          document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [phase, sessionId, gitBusy, saving])

      const dirty = draft !== saved
      const editorDisabled = phase !== 'ready' || saving

      const scheduleDraft = (content, updatedAt) => {
        clearTimeout(timerRef.current)
        const keyCwd = cwd
        const sid = sessionId
        timerRef.current = setTimeout(() => {
          if (typeof keyCwd !== 'string' || keyCwd.length === 0) return
          if (content === savedRef.current) {
            removeDraft(draftKey(keyCwd))
            void queueHostDraft(sid, null, updatedAt)
          } else {
            writeDraft(draftKey(keyCwd), content, updatedAt)
            void queueHostDraft(sid, content, updatedAt)
          }
        }, DRAFT_DELAY_MS)
      }

      const onChange = (event) => {
        const content = event.target.value
        const updatedAt = Date.now()
        setDraft(content)
        setNotice(null)
        setRestored(false)
        scheduleDraft(content, updatedAt)
      }

      const reload = () => {
        if (phase === 'ready' && dirty && !window.confirm(t('discardConfirm'))) return
        discardDraftRef.current = true
        clearTimeout(timerRef.current)
        if (typeof cwd === 'string' && cwd.length > 0) {
          removeDraft(draftKey(cwd))
          void queueHostDraft(sessionId, null, Date.now())
        }
        setReloadTick((tick) => tick + 1)
      }

      const toggleGit = async () => {
        if (phase !== 'ready' || saving || gitBusy || git === null) return
        const include = !git.include
        setGitBusy(true)
        setNotice(null)
        try {
          const next = await setGitInclude(sessionId, include)
          setGit(next)
          setGitError('')
          if (next.include !== include && !next.blockedBy) {
            setNotice({ kind: 'warn', text: t('gitNotApplied') })
          }
        } catch (error) {
          setNotice({ kind: 'error', text: t('gitError', { message: error?.message ?? String(error) }) })
        } finally {
          setGitBusy(false)
        }
      }

      const gitHint = (() => {
        if (gitError.length > 0) return { text: gitError, kind: 'error' }
        if (git === null) return { text: t('gitLoading'), kind: 'info' }
        if (gitBusy) return { text: t('gitUpdating'), kind: 'info' }
        if (typeof git.warning === 'string' && git.warning.length > 0) {
          return { text: t('gitError', { message: git.warning }), kind: 'warn' }
        }
        if (!git.hasGit) return { text: t('gitNoRepo'), kind: 'info' }
        if (git.include) {
          return { text: git.fileExists ? t('gitNotIgnored') : t('gitPendingInclude'), kind: 'info' }
        }
        if (!git.fileExists) return { text: t('gitPendingIgnore'), kind: 'info' }
        if (git.blockedBy) return { text: t('gitBlockedHint'), kind: 'warn' }
        return { text: t('gitIgnored'), kind: 'info' }
      })()

      const save = async () => {
        if (saving || conflict || gitBusy || phase !== 'ready') return
        if (!dirty && exists) return
        if (typeof cwd !== 'string' || cwd.length === 0) return
        const content = draft
        const key = draftKey(cwd)
        if (utf8Length(content) > MAX_EDITOR_BYTES) {
          setNotice({ kind: 'error', text: t('tooLarge') })
          return
        }
        setSaving(true)
        setNotice(null)
        setConflict(false)
        try {
          const result = await saveFile(sessionId, content, version, git?.include === true)
          const file = result.file
          savedRef.current = content
          setSaved(content)
          setVersion(typeof file?.version === 'string' ? file.version : null)
          setFilePath(typeof file?.path === 'string' ? file.path : filePath)
          setFileName(typeof file?.name === 'string' && file.name.length > 0 ? file.name : fileName)
          setExists(true)
          setRestored(false)
          if (result.git !== undefined) {
            setGit(typeof result.gitWarning === 'string'
              ? { ...result.git, warning: result.gitWarning }
              : result.git)
            setGitError('')
          } else if (typeof result.gitWarning === 'string') {
            setGitError(t('gitError', { message: result.gitWarning }))
          }
          clearTimeout(timerRef.current)
          if (draftRef.current === content) {
            removeDraft(key)
            await queueHostDraft(sessionId, null, Date.now())
            if (draftRef.current === content) setNotice({ kind: 'success', text: t('savedHint') })
          } else {
            const updatedAt = Date.now()
            writeDraft(key, draftRef.current, updatedAt)
            void queueHostDraft(sessionId, draftRef.current, updatedAt)
            setNotice({ kind: 'warn', text: t('draftPersisted') })
          }
        } catch (error) {
          if (error?.code === 'conflict') {
            setConflict(true)
          } else {
            setNotice({ kind: 'error', text: messageFor(t, error) })
          }
        } finally {
          setSaving(false)
        }
      }

      const onKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
          event.preventDefault()
          void save()
        }
      }

      const status = saving
        ? { text: t('saving'), kind: 'info', dirty: false }
        : conflict
          ? { text: t('unsaved'), kind: 'error', dirty: true }
          : dirty
            ? { text: t('draftPersisted'), kind: 'info', dirty: true }
            : !exists
              ? { text: t('notCreated'), kind: 'info', dirty: false }
              : notice?.kind === 'success'
                ? { text: t('savedShort'), kind: 'success', dirty: false }
                : { text: t('upToDate'), kind: 'info', dirty: false }

      const lines = countLines(draft)
      const characters = draft.length

      return h('div', { className: 'amd-root' }, [
        h('style', { key: 'style' }, css),
        h('div', { className: 'amd-head', key: 'head' }, [
          h('div', { className: 'amd-heading', key: 'heading' }, [
            h('div', { className: 'amd-title-row', key: 'row' }, [
              h('span', { className: 'amd-title', key: 'title', title: t('head.subtitle') }, fileName),
              dirty && h('span', { className: 'amd-dirty', key: 'dirty', role: 'status', title: t('draftPersistedHint') }, [
                h(StatusDot, { key: 'dot' }),
                t('unsaved'),
              ]),
            ]),
            h('div', {
              className: 'amd-path',
              key: 'path',
              title: filePath.length > 0 ? filePath : (cwd ?? ''),
            }, filePath.length > 0 ? filePath : (cwd ?? '')),
          ]),
          h('div', { className: 'amd-actions', key: 'actions' }, [
            h('button', {
              type: 'button',
              className: 'amd-button',
              key: 'reload',
              onClick: reload,
              disabled: phase === 'loading' || saving,
              title: t('reloadTitle'),
            }, t('reload')),
            h('button', {
              type: 'button',
              className: 'amd-button amd-primary',
              key: 'save',
              onClick: save,
              disabled: (!dirty && exists) || saving || gitBusy || conflict || phase !== 'ready' || typeof cwd !== 'string',
            }, saving ? t('saving') : t('save')),
          ]),
        ]),

        phase === 'ready' && h('div', { className: 'amd-gitbar', key: 'git' }, [
          h('button', {
            type: 'button',
            role: 'switch',
            className: 'amd-switch',
            key: 'switch',
            'aria-checked': git?.include === true,
            'aria-label': t('gitSwitchAria', { file: fileName }),
            disabled: git === null || gitBusy || saving,
            onClick: toggleGit,
          }, h('span', { className: 'amd-switch-thumb', key: 'thumb' })),
          h('span', { className: 'amd-git-label', key: 'label' }, t('gitInclude', { file: fileName })),
          h('span', {
            className: 'amd-git-hint',
            key: 'hint',
            'data-kind': gitHint.kind,
            title: gitHint.text,
          }, gitHint.text),
        ]),

        phase === 'ready' && git?.tracked === true && git?.fileExists === true && h('div', {
          className: 'amd-banner',
          key: 'git-tracked',
          'data-kind': 'warn',
          role: 'status',
        }, h('span', { className: 'amd-banner-text', key: 'text' }, t('gitTracked'))),

        phase === 'ready' && typeof git?.blockedBy === 'string' && h('div', {
          className: 'amd-banner',
          key: 'git-blocked',
          'data-kind': 'warn',
          role: 'status',
        }, h('span', { className: 'amd-banner-text', key: 'text' }, t('gitBlocked', { pattern: git.blockedBy }))),

        conflict && h('div', { className: 'amd-banner', key: 'conflict', 'data-kind': 'error', role: 'alert' }, [
          h('span', { className: 'amd-banner-text', key: 'text' }, t('conflict')),
          h('button', { type: 'button', className: 'amd-banner-action', key: 'action', onClick: reload }, t('reload')),
        ]),

        !conflict && notice !== null && h('div', {
          className: 'amd-banner',
          key: 'notice',
          'data-kind': notice.kind,
          role: notice.kind === 'error' ? 'alert' : 'status',
        }, h('span', { className: 'amd-banner-text', key: 'text' }, notice.text)),

        !conflict && notice === null && restored && h('div', {
          className: 'amd-banner',
          key: 'restored',
          'data-kind': 'info',
          role: 'status',
        }, h('span', { className: 'amd-banner-text', key: 'text' }, t('restored'))),

        !conflict && notice === null && !restored && phase === 'ready' && !exists && h('div', {
          className: 'amd-banner',
          key: 'template',
          'data-kind': 'info',
          role: 'status',
        }, h('span', { className: 'amd-banner-text', key: 'text' }, t('templateHint'))),

        phase === 'loading' && h('div', { className: 'amd-center', key: 'loading', role: 'status' }, [
          h('span', { className: 'amd-pulse', key: 'pulse', 'aria-hidden': true }),
          h('p', { key: 'text' }, t('loading')),
        ]),

        phase === 'error' && h('div', { className: 'amd-center', key: 'error', role: 'alert' }, [
          h('p', { key: 'text' }, loadError || t('loadFailed')),
          h('p', { className: 'amd-hint', key: 'hint' }, t('loadFailedHint')),
          h('button', { type: 'button', className: 'amd-button', key: 'retry', onClick: reload }, t('retry')),
        ]),

        phase === 'no-workspace' && h('div', { className: 'amd-center', key: 'no-workspace' }, [
          h('p', { key: 'text' }, t('noWorkspace')),
          h('p', { className: 'amd-hint', key: 'hint' }, t('noWorkspaceHint')),
        ]),

        phase === 'ready' && h('div', { className: 'amd-editor-wrap', key: 'editor' }, [
          h('textarea', {
            className: 'amd-editor',
            key: 'textarea',
            value: draft,
            onChange,
            onKeyDown,
            disabled: editorDisabled,
            spellCheck: false,
            autoFocus: true,
            placeholder: t('editor.placeholder'),
            'aria-label': t('editor.aria'),
          }),
        ]),

        (phase === 'ready' || phase === 'loading') && h('div', { className: 'amd-footer', key: 'footer' }, [
          h('span', { className: 'amd-counts', key: 'counts' }, phase === 'ready'
            ? `${t('lines', { count: lines })} · ${t('characters', { count: characters })}`
            : ''),
          h('span', {
            className: 'amd-status',
            key: 'status',
            'data-dirty': status.dirty ? 'true' : 'false',
            'data-kind': status.kind,
            role: 'status',
            'aria-live': 'polite',
            title: status.dirty ? t('draftPersistedHint') : (!exists ? t('notCreatedHint') : undefined),
          }, status.text),
        ]),
      ])
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)

        ctx.effect(
          () => ctx.locale.register(NS, { en, zh }),
          'agents-md: dictionaries',
        )

        ctx.inject(['shortcuts'], (scope) => {
          scope.effect(
            () => scope.shortcuts.register({
              id: OPEN_SHORTCUT_ID,
              label: () => t('shortcut.label'),
              aliases: ['agents md', 'agents.md', 'agent instructions'],
              defaults: {
                'desktop:macos': { code: 'KeyE', modifiers: ['primary', 'shift'] },
                'desktop:windows': { code: 'KeyE', modifiers: ['primary', 'shift'] },
                'desktop:linux': { code: 'KeyE', modifiers: ['primary', 'shift'] },
                'web:macos': { code: 'KeyE', modifiers: ['primary', 'alt'] },
                'web:windows': { code: 'KeyE', modifiers: ['primary', 'alt'] },
              },
              regions: ['page', 'editable', 'terminal'],
              modals: [],
              resolve: ({ target: element }) => {
                const target = scope.sidebarRight.commandTarget(element)
                if (target === undefined) {
                  return { status: 'blocked', reason: t('shortcut.noSession') }
                }
                return {
                  status: 'handled',
                  run: () => {
                    scope.sidebarRight.openTabFromTarget(KIND, target)
                  },
                }
              },
            }),
            'agents-md: open shortcut',
          )
        })

        ctx.effect(
          () => ctx.sidebarRightTabs.register({
            id: PLUGIN_ID,
            kind: KIND,
            title: () => t('type.label'),
            guide: [{
              id: 'agents-md',
              commandId: OPEN_SHORTCUT_ID,
              order: 20,
              title: () => t('guide.title'),
              description: () => t('guide.description'),
              icon: FilePenGlyph,
            }],
          }),
          'agents-md: tab type',
        )

        ctx.effect(
          () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
            name: 'sidebar.right.pane.tab',
            key: PLUGIN_ID,
            locale: NS,
          }, AgentsEditor)),
          'agents-md: editor body',
        )
      },
    }
  },
})

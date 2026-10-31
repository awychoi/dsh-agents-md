# <img src="icon.svg" width="36" height="36" alt="" align="absmiddle"> AGENTS.md

**A right-sidebar markdown editor for your harness workspace instructions.**

`dsh-agents-md` adds an **AGENTS.md** entry to DeepSeek Harness's right sidebar
and edits the workspace instruction file in place. Save from the panel; DSH's
own instruction loader reads the saved file on the next step.

![Illustrative dark-theme layout: the AGENTS.md panel in the DSH right sidebar](docs/preview.svg)

## What it does

- Opens a plain markdown editor for `AGENTS.md` in the current workspace.
  Missing files show a starter template but are not created until you press
  **Save**.
- Keeps unsaved work. Drafts are stored on the Host and mirrored in
  `localStorage`, so they survive reloads, browser changes, and DSH Desktop's
  changing port.
- Saves without silent overwrites. Saves are version-guarded; if the file
  changed on disk, you get a conflict instead of losing either edit.
- Reads the real `.gitignore`. An **Include … in Git** switch adds or removes
  the instruction file, understands variants such as `agents.md`, and reports
  broader rules rather than claiming the file is committed.
- Leaves prompt injection to DSH. The plugin never injects prompt text or
  duplicates the instruction loader.

## Technical notes

- **Why drafts live on the Host:** DSH Desktop serves each launch on a fresh
  port, so `localStorage` alone would not survive a restart. A debounced JSON
  store at `$DSH_HOME/agents-md/drafts.json` is the source of truth;
  `localStorage` is a mirror. Drafts are pruned after 30 days, and a monotonic
  timestamp prevents a late draft request from undoing a save.
- **First save:** opening a missing file stays read-only. The first save sends
  `version: null`, and the Host uses create-if-absent so a concurrent creator
  wins with a conflict rather than being overwritten.
- **Git switch:** the default ignore rule is applied once and marked under
  `$DSH_HOME/agents-md/git.json`, so removing it by hand later is respected. A
  broad rule such as `*.md` is reported as the blocker, not deleted. An
  already-tracked file cannot be untracked from `.gitignore`; use
  `git rm --cached`.
- **File variants:** the editor accepts `AGENTS.md`, `agents.md`, and
  `agent.md`, preferring the canonical spelling. DSH's loader looks for
  `AGENTS.md`; on a case-sensitive filesystem, an alternate spelling needs
  loader configuration.

## Limits

- One file only: the current workspace's `AGENTS.md`. Nested instruction files
  and `CLAUDE.md` are read by DSH but not edited here.
- Plain markdown only: no preview, syntax highlighting, or WYSIWYG.
- The editor caps files at 2 MiB. DSH's loader has its own prompt and byte
  budget and can truncate a large saved file independently.

## Install

1. In DSH, open **Plugins → Add plugin**.
2. Enter `https://github.com/awychoi/dsh-agents-md`, or the absolute path to a
   local checkout.
3. Enable the bundle, expand the right sidebar, press **+**, and choose
   **AGENTS.md**.

No credentials, settings, or external network calls.

## Assets

`icon.svg` is the plugin icon. `icon-white.svg` is the transparent solid-white
mark for dark backgrounds. Exported as `./icon` and `./icon-white`.

## License

MIT. Copyright © 2026 awychoi.

Not affiliated with DeepSeek.

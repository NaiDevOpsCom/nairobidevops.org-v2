# graphify-out

This directory contains the output of [Graphify](https://github.com/graphify-ai/graphify), a third-party
tool that generates a knowledge graph (`manifest.json`) of your codebase for use with AI assistants.

## ⚠️ Important: before committing a Graphify refresh

Graphify records **absolute local paths** when run on a developer's machine. These must be cleaned up
before the output is committed, otherwise local machine paths leak into version history.

### Files affected

| File | What to check |
|------|--------------|
| `graphify-out/manifest.json` | All JSON keys must be **relative paths** (e.g. `frontend/src/App.tsx`). No key may start with a drive letter (`C:\…`) or a leading slash (`/home/…`). Gitignored files must also be removed from the manifest. |
| `graphify-out/.graphify_root` | Must contain only `.` (a single dot representing the workspace root). Never commit an absolute path here. |

### Clean-up checklist

1. **Relative-path keys** — confirm no manifest key matches `^[A-Za-z]:[/\\]` or `^/`.
2. **Gitignored entries** — remove any manifest entries for files covered by `.gitignore`. The
   following files were previously removed and must stay out:
   - `.mcp.json` (rule: `.mcp.json`)
   - `frontend/.mcp.json` (rule: `.mcp.json`)
   - `backend/config.local.php` (rule: `backend/config.local.php`)
   - `composer-setup.php` (rule: `composer-setup.php`)
   - `AGENT.md` (rule: `AGENT.md`)
   - `CLAUDE.md` (rule: `CLAUDE.md`)
   - `.claude/settings.json` (rule: `.claude/`)
   - `.vscode/settings.json` (rule: `.vscode/*`)
3. **`.graphify_root`** — overwrite with a single `.` if Graphify wrote an absolute path.
4. **Valid JSON** — verify `manifest.json` parses without syntax errors after any edits.

### Why this directory is committed at all

The manifest is committed so that all team members and AI assistants share the same codebase index
without each having to run Graphify locally. Only the `cost.json` and `cache/` subdirectory are
gitignored (they are local-only artefacts).

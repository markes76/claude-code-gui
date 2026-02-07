# Changelog

All notable changes to Claude Code GUI are documented here.

## [1.0.0] - 2026-02-07

### Added
- **Activity Trail** — New tab on Projects page showing all files Claude created or modified during a session, including files outside the project directory (scratchpad in `/private/tmp/claude-*`, Claude config in `~/.claude/projects`). Files grouped by location with time-range filtering (1h, 4h, 24h, 7d, 30d) and click-to-view.
- **File Browser** — Navigate project files, view contents, copy to clipboard, and execute scripts (.py, .js, .ts, .sh) directly from the Projects page.
- **Prompt Composer** — AI-powered prompt enhancement in the terminal. Uses direct Anthropic API when an API key is available (2-3s), falls back to Claude CLI for Pro/Max/Enterprise users.
- **Session Summary** — Generate AI summaries of terminal sessions and save them as memories.
- **Script Runner** — Execute Python, JavaScript, TypeScript, and shell scripts directly from the file browser with output capture.

### Fixed
- **CLI execution in packaged app** — Complete rewrite of CLI bridge to bypass shell entirely. Resolves the Claude CLI symlink to find the actual `cli.js`, locates the Node.js binary independently, and runs `node cli.js` directly. Fixes all CLI-dependent features (enhance, summarize, check, exec) when running from `/Applications`.
- **Pro/Max/Enterprise support** — All AI features (enhance, summarize) now work without an API key via CLI fallback. API key is an optional fast path, not a requirement.
- **PATH resolution** — PTY bridge and CLI bridge both use enriched PATH with login shell detection, nvm, Homebrew, and common binary locations.

### Changed
- **Projects page** — Now has three tabs: Configuration, File Browser, and Activity Trail (previously only Configuration).
- **Plugins page** — Rewritten to reflect Claude Code's actual MCP-based plugin system.
- **Architecture docs** — README updated with CLI bridge architecture explanation and correct repo URL.

## [0.1.0] - 2026-02-01

### Added
- Initial release with 17 pages: Dashboard, Terminal, CLAUDE.md, Settings, Skills, Agents, Commands, Hooks, MCP, Plugins, Permissions, Sessions, Projects, Docs, Memory, Rules, API Keys.
- Full PTY terminal with node-pty + xterm.js, model selection, and multi-tab support.
- CLAUDE.md editor with 4 scope levels and live preview.
- MCP server marketplace with 30+ pre-configured servers.
- Dark and light theme with macOS-native title bar.
- Session memory system with save/load/handoff.
- Visual settings editor for all Claude Code config scopes.

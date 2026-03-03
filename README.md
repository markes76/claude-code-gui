# Claude Code GUI

A comprehensive desktop GUI wrapper for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — the official command-line tool by Anthropic for working with Claude as an AI coding assistant.

Claude Code GUI gives you a visual interface for everything Claude Code offers: terminal sessions, live structured stream view, CLAUDE.md editing, memory management, MCP server configuration, skills, agents, hooks, permissions, and more.

On every launch you choose which project folder to open, confirm you trust it, and then the full IDE loads in that directory — just like VS Code's workspace trust model.

![Version](https://img.shields.io/badge/version-1.1.0-orange)
![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)

## What's New in v1.1.0

### Live Stream — Bidirectional Structured View
The headline feature of v1.1.0. While Claude works in your terminal, the **Stream** page shows you exactly what it's doing in real time — structured and clean, not raw ANSI escape codes:

- **Tool calls** render as collapsible cards with an icon (file reads, writes, bash, web, agents)
- **Assistant text** renders as proper markdown — headers, code blocks, lists
- **Tool results** are shown truncated with "Show more" expansion
- **Run summaries** display cost in USD, duration in seconds, and pass/fail status
- **Bidirectional** — write in the terminal and it streams automatically; type in the Stream input and it goes to the terminal
- **Pop-out window** — detach the stream into a floating window to sit side-by-side with your terminal; the popup respects your chosen app theme
- **Copy buttons** — hover any card to reveal a copy button; **Copy All** in the header serializes the full stream to plain text
- **Always watching** — the stream auto-starts on mount, tailing all active Claude session JSONL files without any manual toggle

### Terminal
- Full PTY terminal (node-pty + xterm.js) — not a simple exec wrapper
- Model selection (Opus, Sonnet, Haiku) from the toolbar
- **Color Themes** — 8 built-in terminal color schemes (Dracula, Solarized Dark/Light, Nord, Monokai, Tokyo Night, Gruvbox, One Dark) with live switching
- Multiple concurrent session tabs
- Session memory handoff between sessions
- **Prompt Composer** — AI-powered prompt enhancement (direct Anthropic API for speed, CLI fallback for Pro/Max/Enterprise users)
- **Session Summary** — AI-generated session summaries saved as memories

### Configuration
- **CLAUDE.md Editor** — Edit all 4 levels (Global, Project, Local, Private) with live preview, templates, and @import detection
- **Memory System** — Browse and edit Claude Code's auto memory files with a tree-based UI and 8-level hierarchy viewer
- **Rules Manager** — Create and manage `.claude/rules/*.md` with path-scoped targeting via YAML frontmatter
- **Settings** — Visual and JSON editors for user, project, and local settings scopes

### Extensions
- **Skills** — Browse, create, and manage reusable prompt patterns (slash commands); includes Plugin Skills from installed plugins with collapsible groups
- **Subagents** — Configure specialized AI personas with custom instructions and tool access
- **Commands** — Custom slash commands that trigger specific prompts
- **Hooks** — Event-driven automation (PreToolUse, PostToolUse, SessionStart, etc.)
- **MCP Servers** — Marketplace with 30+ pre-configured servers (GitHub, Slack, Brave Search, PostgreSQL, etc.) plus manual configuration
- **Plugins** — MCP server discovery and management

### Management
- **Permissions** — Visual tool allow/deny list management
- **Sessions** — View active PTY sessions and manage session memory
- **Projects** — Open project directories with configuration health scanner, file browser, and activity trail
- **Activity Trail** — See every file Claude created or modified during a session, including files outside your project (scratchpad, tmp, config). Grouped by location with time-range filtering (1h/4h/24h/7d/30d).
- **Analytics** — Token usage, cost tracking, and session history parsed directly from Claude Code's own session logs (`~/.claude/projects/`). 5-tab dashboard: Overview, Models, Projects, Sessions, and 30-day cost Timeline. No external tracking — all data stays local.
- **File Browser** — Navigate project files, view contents, copy to clipboard, and execute scripts (.py, .js, .ts, .sh) directly
- **API Keys** — Manage environment variables with 20+ preset templates
- **Dashboard** — System health overview with stat cards and activity feed

### Onboarding
- **Project Picker** — On every launch a full-screen welcome screen prompts you to open a project folder before any terminal or IDE UI appears
- **Workspace Trust** — New folders show a security warning; previously-trusted folders are remembered with a green shield badge and open in one click
- **Recent Projects** — Up to 10 recent folders listed for fast re-opening

### Design
- Dark and light theme with one-click toggle — all UI elements fully visible in both modes
- Responsive sidebar with collapse support
- macOS-native title bar integration

## Bug Fixes & Improvements

### Config Pages — Delete + Restart Prompt (post-v1.1.0)

- **Delete agents** — Hover any agent card to reveal Edit and Delete buttons. Clicking Delete shows a confirmation modal before permanently removing the file.
- **Delete commands** — Same hover-reveal delete pattern on the Commands page with a confirm modal.
- **Hooks & Skills** — Delete was already available; now all four config pages (Agents, Commands, Hooks, Skills) are consistent.
- **Relaunch banner** — After any create, edit, or delete on Agents, Commands, Hooks, or Skills, a banner appears explaining that a restart is required for Claude Code to pick up the changes. Includes a **Restart Now** button that relaunches the app immediately, or dismiss with ✕ to restart later.

### Live Stream — Sub-Agent Streaming (post-v1.1.0)

Four fixes landed to make sub-agent activity fully visible in the Stream panel:

- **Sub-agent JSONL discovery** — The session watcher now recurses into subdirectories, so JSONL files written by sub-agents at `~/.claude/projects/{project}/{session}/subagents/{agent}.jsonl` are discovered and tailed automatically. Previously only top-level session files were watched.
- **Sub-agent tool call rendering** — Sub-agent turns arrive as `progress` entries in the parent JSONL. The parser now reads `entry.data?.message` (not `entry.message`) so tool calls and assistant text from sub-agents render correctly in the stream.
- **Sub-agent session offset** — New JSONL files discovered mid-session are now read from offset 0, so no content is skipped when a sub-agent starts writing to a fresh file.
- **Newline preservation** — Assistant text bubbles now preserve embedded newlines, so multi-paragraph responses and code blocks no longer collapse into a single line.

## Prerequisites

You need **Claude Code CLI** installed and **one** of:
- An Anthropic API key (`ANTHROPIC_API_KEY`), OR
- A Claude Pro, Max, or Enterprise subscription (authenticate with `claude login`)

Both paths are fully supported. API key users get faster AI features (direct API calls). Pro/Max/Enterprise users get the same features via CLI fallback.

### Install Claude Code CLI

**Native installer (recommended):**
```bash
brew install claude-code
```

**Via npm:**
```bash
npm install -g @anthropic-ai/claude-code
```

## Getting Started

```bash
# Clone the repository
git clone https://github.com/markes76/claude-code-gui.git
cd claude-code-gui

# Install dependencies
npm install

# Start development server
npm run dev
```

## Build

```bash
# Build for current platform
npm run build

# Platform-specific builds
npm run build:mac     # macOS .dmg
npm run build:win     # Windows .exe
npm run build:linux   # Linux AppImage
```

## Architecture

```
src/
  main/              # Electron main process
    index.ts         # Window creation, IPC registration
    cli-bridge.ts    # Claude CLI integration (direct node execution)
    file-handlers.ts # Secure file operations + activity scanning
    config-handlers.ts # Claude Code config read/write
    pty-bridge.ts    # PTY session management (node-pty)
    stream-bridge.ts # Live stream: JSONL file polling + pop-out window
    session-memory.ts # Session memory persistence
  preload/           # Context bridge (main ↔ renderer)
    index.ts         # Exposes safe API to renderer
  renderer/          # React SPA
    src/
      pages/         # 19 page components
      components/    # Shared UI components
      stores/        # Zustand state management
      types/         # TypeScript type definitions
      lib/           # Utilities
```

### CLI Bridge Architecture

The app uses a robust CLI bridge that works reliably in packaged Electron apps:

1. **Resolves the Claude CLI binary** by following symlinks to find the actual `cli.js` script
2. **Finds the Node.js binary** (nvm, Homebrew, system) independently
3. **Executes directly** as `node /path/to/cli.js` — bypassing shell entirely
4. **Falls back** to login shell execution if direct mode fails

This solves the common Electron packaged app problem where `process.cwd()` returns `/` and `PATH` is minimal (`/usr/bin:/bin`).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 31 |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS 3.4 |
| State | Zustand |
| Terminal | node-pty + xterm.js |
| Build | electron-vite |
| UI Components | Radix UI primitives |
| Icons | Lucide React |

## Security

- **Path Validation** — All file operations validate paths are within the user's home directory or /tmp
- **Shell Escaping** — PTY commands use proper shell escaping to prevent injection
- **Model Allowlist** — Only approved Claude models can be selected
- **No Remote Code** — The app runs entirely locally with no external telemetry

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Credits

Built as a GUI wrapper for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic.

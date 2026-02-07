# Claude Code GUI

A comprehensive desktop GUI wrapper for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — the official command-line tool by Anthropic for working with Claude as an AI coding assistant.

Claude Code GUI gives you a visual interface for everything Claude Code offers: terminal sessions, CLAUDE.md editing, memory management, MCP server configuration, skills, agents, hooks, permissions, and more.

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)

## Features

### Terminal
- Full PTY terminal (node-pty + xterm.js) — not a simple exec wrapper
- Model selection (Opus, Sonnet, Haiku) from the toolbar
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
- **Skills** — Browse, create, and manage reusable prompt patterns (slash commands)
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
- **File Browser** — Navigate project files, view contents, copy to clipboard, and execute scripts (.py, .js, .ts, .sh) directly
- **API Keys** — Manage environment variables with 20+ preset templates
- **Dashboard** — System health overview with stat cards and activity feed

### Design
- Dark and light theme with one-click toggle
- Responsive sidebar with collapse support
- macOS-native title bar integration

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
    session-memory.ts # Session memory persistence
  preload/           # Context bridge (main ↔ renderer)
    index.ts         # Exposes safe API to renderer
  renderer/          # React SPA
    src/
      pages/         # 17 page components
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

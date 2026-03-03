import React, { useState } from 'react'
import {
  HelpCircle, Terminal, FileText, Settings, Zap, Bot, Command,
  Webhook, Server, Plug, Shield, Keyboard, Key, History,
  FolderOpen, Brain, BookOpen, LayoutDashboard, Wand2, Search,
  Radio, BarChart2
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SearchInput } from '../components/shared/SearchInput'

interface DocSection {
  id: string
  title: string
  icon: React.ReactNode
  content: string
}

const DOCS: DocSection[] = [
  {
    id: 'whats-new',
    title: "What's New",
    icon: <Wand2 size={18} />,
    content: `# What's New

## v1.1.0 — Live Stream (Mar 2026)

### Live Stream — Bidirectional Structured View
The headline feature of v1.1.0. A dedicated **Stream** page now shows you exactly what Claude is doing in real time — structured and clean, not raw terminal output.

- **Tool calls** render as collapsible cards (file reads, writes, bash, web searches, agent calls)
- **Assistant responses** render as proper markdown — headers, code blocks, lists
- **Tool results** shown inline with expand/collapse and truncation
- **Run summaries** display cost in USD, duration, and pass/fail status
- **Bidirectional** — write in the terminal and it streams automatically; type in the Stream input and it goes to the terminal
- **Pop-out window** — detach into a floating window to sit side-by-side with your terminal; follows your app theme
- **Copy buttons** — hover any card to reveal a copy button; **Copy All** serializes the full stream to plain text
- **Always watching** — auto-starts on mount, no manual toggle needed

### Analytics Dashboard
A full 5-tab analytics dashboard built from Claude Code's own session logs:
- **Overview** — Total sessions, tokens used, cost to date, and active project count
- **Models** — Token and cost breakdown per model (Opus, Sonnet, Haiku)
- **Projects** — Which projects you use most and their cost contribution
- **Sessions** — Paginated log of every session with model, cost, duration, and timestamp
- **Timeline** — 30-day cost chart so you can see spending trends over time
- All data is read directly from \`~/.claude/projects/\` — no external tracking, everything stays local

### Pricing & Discount Configuration
A new **Pricing** tab in Settings gives you full control over cost calculations:
- **Pull Latest Pricing** — Fetches current model rates from the Anthropic docs page with one click
- **Per-model editor** — Adjust input/output prices ($/MTok) for any model individually
- **Volume discount tiers** — Apply a 2%, 5%, or 9% discount matching your Anthropic commitment level, or enter a custom rate
- **Savings badge** — The Analytics Overview shows your total savings vs. list pricing when a discount is active
- All discounts apply instantly across every Analytics tab — no data is modified, only the display

## v1.0.0 — Previous Enhancements

### New Models (Feb 2026)
- **Claude Sonnet 4.6** — Added to the model picker in the terminal and settings. Offers an updated, balanced option alongside Sonnet 4.5.

### Terminal: Session Flags
Two new toggle buttons in the terminal toolbar let you customize how sessions start:

- **Continue** (clock icon) — Passes \`--continue\` to Claude Code. New terminal tabs will resume your last conversation automatically, skipping the initial greeting. Great for picking up exactly where you left off.
- **Skip Perms** (shield icon) — Passes \`--dangerously-skip-permissions\` to Claude Code. Removes all tool permission prompts. Use only in trusted projects where you don't want interruptions.

Both flags are toggle buttons: click to activate (highlighted in blue/red), click again to deactivate. They apply to every new tab you open while active.

### Dashboard: Diagnostics
A new **Diagnose** button (stethoscope icon) in the System Status card runs a full environment check:
- Claude Code version
- CLI installation path
- Config directory location
- API key detection (shows whether ANTHROPIC_API_KEY is set or if you're using claude login)

### MCP Marketplace Expansion
The popular servers list has grown from 8 to 16 servers, organized by category:
- **New entries:** SQLite, Everything, AWS KB Retrieval, GitLab, Google Drive, Google Maps, Sentry, Fetch
- All official \`@modelcontextprotocol\` packages via npx one-click install`,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <HelpCircle size={18} />,
    content: `# Getting Started with Claude Code GUI

## What Is This?
Claude Code GUI is a desktop application that wraps Claude Code CLI with a visual interface. It lets you manage every aspect of Claude Code — from terminal sessions to configuration files, MCP servers, skills, and more — without touching the command line.

## Prerequisites
You need **one** of the following to use Claude Code:

**Option A — Anthropic API Key**
- Sign up at console.anthropic.com
- Create an API key and set it as ANTHROPIC_API_KEY

**Option B — Claude Max or Pro Subscription**
- Subscribe to Claude Max or Claude Pro at claude.ai
- Run \`claude login\` in your terminal to authenticate
- No API key needed — your subscription handles billing

## Installing Claude Code CLI
**Recommended: Native Installer** (no Node.js required)
- macOS: \`brew install claude-code\`
- Or download from the official Claude Code releases

**Alternative: npm**
- \`npm install -g @anthropic-ai/claude-code\`

## Quick Start
1. **Dashboard** — Check that the CLI is detected (green status badge)
2. **Projects** — Open a project directory
3. **CLAUDE.md** — Set up project context so Claude understands your codebase
4. **Terminal** — Start a conversation with Claude Code
5. **MCP Servers** — Optionally connect external tools (GitHub, Slack, databases)`
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    content: `# Dashboard

The Dashboard is your home screen showing the health and status of your Claude Code setup.

## Features
- **CLI Status** — Shows whether Claude Code CLI is detected and its version
- **Diagnostics** — Click the stethoscope icon to run a full environment check: version, CLI path, config directory, and API key status
- **Stat Cards** — Counts of your skills, agents, MCP servers, hooks, and commands
- **Quick Actions** — One-click navigation to key sections
- **Activity Feed** — Recent configuration changes and events

## CLI Detection
The app automatically checks for the Claude Code CLI on startup. If it's not found, you'll see a red "CLI Not Found" badge in the top bar. Install Claude Code CLI and restart the app.

## Diagnostics
Click **Diagnose** in the System Status card to see:
- Claude Code version number
- Resolved CLI binary path
- Config directory location (\`~/.claude/\`)
- Whether ANTHROPIC_API_KEY is set (or if you're using claude login instead)`
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: <Terminal size={18} />,
    content: `# Terminal

A full interactive Claude Code terminal with real PTY (pseudo-terminal) support.

## Features
- **Real PTY** — Full terminal emulation via node-pty and xterm.js, not a simple exec wrapper
- **Model Selection** — Switch between Opus 4.6, Sonnet 4.6, Sonnet 4.5, and Haiku 4.5 from the toolbar
- **Session Tabs** — Run multiple concurrent Claude Code sessions
- **Session Memory** — Create memory summaries to hand off context between sessions

## Session Flags
Two toggles in the toolbar customize how each new session starts:
- **Continue** (clock icon) — Adds \`--continue\` flag. New tabs resume your last conversation automatically, skipping Claude's greeting.
- **Skip Perms** (shield-off icon) — Adds \`--dangerously-skip-permissions\` flag. Suppresses all tool permission prompts. Use in trusted projects only.

## Prompt Composer
At the bottom of the terminal, the **Prompt Composer** helps beginners write better prompts:
1. Type your prompt in the compose area
2. Click **"Enhance with AI"** — Claude Haiku rewrites it to be clearer and more actionable
3. Review the enhanced version (original shown for comparison)
4. Click **"Send to Claude"** to send it to the active terminal session

## Keyboard Shortcuts
- **Cmd+Enter** — Send composed prompt
- **Escape** — Close the composer
- **Up/Down** — Navigate command history (in terminal)

## Slash Commands
Type directly in the terminal:
- \`/help\` — Show available commands
- \`/clear\` — Clear conversation
- \`/compact\` — Compress conversation context
- \`/memory\` — Save a memory note
- \`/init\` — Generate a CLAUDE.md from your project
- \`/doctor\` — Run a built-in health check`
  },
  {
    id: 'stream',
    title: 'Live Stream',
    icon: <Radio size={18} />,
    content: `# Live Stream

A real-time structured view of everything Claude is doing — rendered as clean cards and markdown, not raw terminal output.

## What It Shows
While Claude works in your terminal, the Stream page tails all active Claude session logs and renders each event:

- **Tool call cards** — Every file read, write, bash command, web search, or agent call appears as a collapsible card with an icon. Click to expand and see the full input.
- **Assistant bubbles** — Claude's text responses rendered as proper markdown (headers, code blocks, bullet lists).
- **Tool result cards** — The output of each tool call, shown truncated with "Show more" expansion for long results.
- **Run summary card** — When a session completes: pass/fail status, total cost in USD, and duration in seconds.

## Bidirectional
The stream is fully connected to your terminal in both directions:

- **Terminal → Stream** — Write in the terminal and everything Claude does appears automatically in the stream. No manual connection.
- **Stream → Terminal** — Type a prompt in the input at the bottom of the Stream page and it sends directly to your active terminal session.

## Pop-Out Window
Click **Pop Out** in the header to detach the stream into a floating window. Use it side-by-side with your terminal — the popup respects your chosen app theme (light or dark).

## Copy Options
Hover any card to reveal a **copy button** in the top-right corner:
- **Tool call card** — copies tool name + full JSON input
- **Tool result card** — copies full result text (not truncated)
- **Assistant bubble** — copies the markdown text

The **Copy All** button in the header serializes the entire stream to plain text — useful for pasting into notes, docs, or another AI context window.

## Always On
The stream auto-starts watching when you navigate to it and stops when you leave. No toggles or manual connection steps required. It scans all Claude session JSONL files in \`~/.claude/projects/\` every 300ms for new activity.`,
  },
  {
    id: 'claude-md',
    title: 'CLAUDE.md Editor',
    icon: <FileText size={18} />,
    content: `# CLAUDE.md Editor

Edit all levels of CLAUDE.md files with live preview and template support.

## Four Tabs
1. **Global** — \`~/.claude/CLAUDE.md\` — Applies to all projects
2. **Project Root** — \`./CLAUDE.md\` — Project-specific, shared via git
3. **Local** — \`.claude/CLAUDE.md\` — Project-specific, team-shared
4. **Private** — \`./CLAUDE.local.md\` — Personal preferences, auto-gitignored

## @Import Detection
The editor automatically detects \`@path/to/file\` import references in your content and displays them as purple badges. Claude Code resolves these imports to include content from other files.

## Templates
Click the wand icon to choose from starter templates:
- React + TypeScript
- Python + FastAPI
- Node.js + Express
- Blank Template

## Tips
- Use **Global** for personal preferences that apply everywhere (e.g., coding style)
- Use **Project Root** for team context (tech stack, conventions, commands)
- Use **Private** for personal project notes you don't want committed to git
- The \`/init\` command in the terminal can auto-generate a CLAUDE.md from your project`
  },
  {
    id: 'memory',
    title: 'Memory System',
    icon: <Brain size={18} />,
    content: `# Memory System

Browse and manage Claude Code's built-in auto memory system.

## Auto Memory
Claude Code automatically maintains memory files at:
\`~/.claude/projects/<project-path>/memory/\`

- **MEMORY.md** — The entrypoint file. The first 200 lines are loaded into every session automatically.
- **Topic Files** — Additional files (e.g., \`debugging.md\`, \`patterns.md\`) linked from MEMORY.md for deeper notes.

## Memory Browser
- View all projects that have auto memory directories
- Expand projects to see their memory files in a tree view
- Click any file to view and edit its contents
- Create new topic files with the + button
- Delete unused topic files

## Memory Hierarchy (8 Levels)
Claude Code loads context from multiple sources in priority order:
1. Managed Policy (Enterprise) — Organization-wide settings
2. User Global — \`~/.claude/CLAUDE.md\`
3. User Rules — \`~/.claude/rules/*.md\`
4. Project Root — \`./CLAUDE.md\` and \`.claude/CLAUDE.md\`
5. Project Rules — \`.claude/rules/*.md\`
6. Local Private — \`CLAUDE.local.md\` (auto-gitignored)
7. Auto Memory — \`~/.claude/projects/.../memory/MEMORY.md\`
8. Session — Conversation context within a session

## Tips
- Keep MEMORY.md under 200 lines — only the first 200 lines load per session
- Use topic files for detailed notes and link them from MEMORY.md
- Use \`/memory\` in the terminal to save quick memory notes
- Use \`/remember\` to save specific learnings`
  },
  {
    id: 'rules',
    title: 'Rules Manager',
    icon: <BookOpen size={18} />,
    content: `# Rules Manager

Create and manage \`.claude/rules/*.md\` files with optional path-scoped targeting.

## What Are Rules?
Rules are markdown files in \`.claude/rules/\` (project) or \`~/.claude/rules/\` (global) that provide additional instructions to Claude Code. They're loaded automatically based on file paths.

## Path Scoping
Rules can target specific files using YAML frontmatter:
\`\`\`yaml
---
paths:
  - "src/components/**/*.tsx"
  - "src/hooks/*.ts"
---
# React Component Rules
Always use functional components with hooks.
\`\`\`
Rules with path scopes only apply when Claude is working on matching files.

## Features
- **Global Rules** — \`~/.claude/rules/\` — Apply across all projects
- **Project Rules** — \`.claude/rules/\` — Project-specific
- **Scope Filter** — Filter rules by All / Global / Project
- **Path Badges** — Visual indicators showing which file patterns a rule targets
- **Create New** — Create rules with scope selection and optional path patterns

## Tips
- Use global rules for personal coding standards
- Use project rules for team conventions
- Path-scoped rules keep context focused and reduce noise`
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: <Settings size={18} />,
    content: `# Settings

Manage Claude Code settings at three scope levels, plus API pricing configuration.

## Scopes
1. **User** — \`~/.claude/settings.json\` — Your global defaults
2. **Project** — \`.claude/settings.json\` — Team-shared project settings
3. **Local** — \`.claude/settings.local.json\` — Private project overrides
4. **Pricing** — API pricing & volume discount configuration (see below)

## Visual and JSON Modes
For the User, Project, and Local scopes, toggle between a visual form editor and raw JSON mode for full control.

## Key Settings
- **Model** — Default model (Opus 4.6, Sonnet 4.6, Sonnet 4.5, Haiku 4.5)
- **Allowed Tools** — Whitelist specific tools Claude can use
- **Denied Tools** — Blacklist tools you want to restrict
- **Custom Instructions** — Additional behavioral instructions

## How Scopes Merge
Settings merge with narrower scopes overriding broader ones:
User < Project < Local

## Pricing Tab
The **Pricing** tab lets you configure how costs are calculated in Analytics:

### Pull Latest Pricing
Click **Pull Latest Pricing** to fetch current model prices from the Anthropic documentation page. Prices update automatically in the table below. The last-fetched timestamp is shown when up-to-date.

### Per-Model Price Editor
Edit input and output prices ($/MTok) for each model individually. Changes take effect immediately in the Analytics page. You can restore defaults at any time by pulling the latest pricing.

### Volume Discount Tiers
Select the discount tier that matches your Anthropic commitment level:
- **No discount** — Standard list pricing (default)
- **2% off** — For annual commitments of $100k – $500k
- **5% off** — For annual commitments of $500k – $1M
- **9% off** — For annual commitments over $1M
- **Custom** — Enter your own negotiated discount percentage

Discounts are applied across all Analytics tabs (Overview, Models, Projects, Sessions, Timeline). The savings amount is shown as a badge on the Overview tab.`
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    icon: <Key size={18} />,
    content: `# API Keys

Manage environment variables and API keys that Claude Code and MCP servers use.

## Features
- **Visual Key Manager** — Add, edit, and delete environment variables
- **Preset Library** — 20+ common API key templates (Anthropic, OpenAI, GitHub, Brave, Supabase, etc.)
- **Show/Hide Toggle** — Securely reveal or mask key values
- **Copy to Clipboard** — Quick copy for use elsewhere

## Security
- Keys are stored in your environment configuration
- Values are masked by default — click the eye icon to reveal
- Never share or commit API keys to version control

## Note
If you have a Claude Max or Pro subscription, you don't need an ANTHROPIC_API_KEY. Run \`claude login\` in the terminal to authenticate with your subscription.`
  },
  {
    id: 'skills',
    title: 'Skills',
    icon: <Zap size={18} />,
    content: `# Skills

Skills are reusable prompt patterns invoked with slash commands.

## Structure
\`\`\`
~/.claude/skills/my-skill/
  SKILL.md          # Instructions and frontmatter
  scripts/          # Optional supporting scripts
\`\`\`

## Frontmatter Options
- **name** — Skill identifier (used as /command-name)
- **description** — When to use (for auto-matching)
- **model** — Force specific model (opus/sonnet/haiku)
- **allowed-tools** — Restrict available tools
- **context** — Run in fork (subagent) or main context

## Scope
- **Global Skills** — \`~/.claude/skills/\` — Available in all projects
- **Project Skills** — \`.claude/skills/\` — Project-specific

## Usage
Invoke with slash syntax in the terminal: \`/my-skill argument\``
  },
  {
    id: 'agents',
    title: 'Subagents',
    icon: <Bot size={18} />,
    content: `# Subagents

Subagents are specialized AI personas with their own instructions and tool access.

## Structure
\`\`\`
~/.claude/agents/my-agent.md    # Global agent
.claude/agents/my-agent.md      # Project agent
\`\`\`

## Configuration
- **name** — Used for @mention invocation
- **model** — Which Claude model to use
- **allowed-tools** — What tools the agent can access
- **System prompt** — The agent's persona and instructions

## Usage
Invoke with @mention syntax: \`@code-reviewer check this function\`

## Features in GUI
- Browse global and project agents
- Create new agents with a guided form
- Edit agent instructions and configuration
- Delete agents you no longer need`
  },
  {
    id: 'commands',
    title: 'Commands',
    icon: <Command size={18} />,
    content: `# Commands

Custom slash commands that trigger specific prompts or actions.

## Structure
\`\`\`
~/.claude/commands/my-command.md    # Global command
.claude/commands/my-command.md      # Project command
\`\`\`

## How They Work
Command files contain a prompt template. When you type \`/my-command\` in the terminal, Claude receives the contents of the command file as its instruction.

## Features in GUI
- Browse and search global and project commands
- Create new commands with the editor
- Preview command content before running
- Delete unused commands`
  },
  {
    id: 'hooks',
    title: 'Hooks',
    icon: <Webhook size={18} />,
    content: `# Hooks

Hooks execute custom commands in response to Claude Code events.

## Event Types
- **PreToolUse** — Before a tool runs (can block with exit code 2)
- **PostToolUse** — After a tool completes
- **UserPromptSubmit** — When user sends a message
- **SessionStart** — When a session begins
- **SessionEnd** — When a session ends (stop, finish, or interrupt)
- **Notification** — When Claude needs input

## Hook Types
- **Command** — Run a shell command
- **Prompt** — LLM evaluation (advanced)

## Blocking Behavior
Hooks that exit with code 2 will block the action (for Pre* events). This lets you create safety guards.

## Configuration
Hooks are stored in settings.json under the \`hooks\` key. The GUI provides a visual editor for creating and managing hooks.

## Example Use Cases
- Auto-format code before Claude writes files
- Log all tool usage for auditing
- Block certain operations in production directories
- Send notifications when sessions complete`
  },
  {
    id: 'mcp',
    title: 'MCP Servers',
    icon: <Server size={18} />,
    content: `# MCP Servers

MCP (Model Context Protocol) servers extend Claude with external tools and data sources.

## Server Types
- **Stdio** — Local process (npx, uvx, node, python, etc.)
- **HTTP** — Remote server over HTTPS
- **SSE** — Server-Sent Events (legacy)

## Configuration Files
- **User servers** — \`~/.claude.json\` (available in all projects)
- **Project servers** — \`.mcp.json\` (project-specific)

## Marketplace
The built-in marketplace offers 30+ pre-configured MCP servers across categories:
- **Official** — GitHub, Filesystem, Brave Search, Memory, PostgreSQL, Slack, Puppeteer
- **Search & Web** — Tavily, Exa, Firecrawl
- **Database** — SQLite, Redis, Supabase, MongoDB
- **Communication** — Discord, Notion, Linear
- **Development** — Docker, Sentry, Cloudflare
- **AI & ML** — Replicate, Hugging Face, Stability AI

## One-Click Install
Select a server from the marketplace, fill in any required API keys, and install. The GUI writes the correct configuration to your \`~/.claude.json\` or \`.mcp.json\`.`
  },
  {
    id: 'plugins',
    title: 'Plugins',
    icon: <Plug size={18} />,
    content: `# Plugins

Plugins are packages that bundle multiple components into a single installable unit. Unlike standalone MCP servers, plugins can contain slash commands, agents, skills, hooks, MCP servers, and LSP servers.

## Four Tabs
1. **Discover** — Browse the official plugin catalog organized by category (Code Intelligence, Integrations, Workflows, Output Styles)
2. **Installed** — View and manage your enabled/disabled plugins with toggle controls
3. **Marketplaces** — Add, update, and remove plugin marketplaces (GitHub repos, URLs, or local paths)
4. **Guide** — Command reference and documentation for the plugin system

## Plugin Categories
- **Code Intelligence (LSP)** — Language servers for Python, TypeScript, Rust, Go, Java, C/C++, C#, PHP, Swift, Kotlin, Lua
- **External Integrations** — GitHub, GitLab, Atlassian, Slack, Notion, Linear, Figma, Vercel, Firebase, Supabase, Sentry
- **Development Workflows** — Commit commands, PR review toolkit, code review, feature development
- **Output Styles** — Explanatory and learning response modes

## How It Works
- Plugins are installed via \`/plugin install name@marketplace\` in the terminal
- Enable/disable plugins directly from the GUI by toggling them in settings.json
- Add custom marketplaces (GitHub repos, URLs) to discover third-party plugins
- The official marketplace (\`claude-plugins-official\`) is included by default

## Plugins vs MCP Servers
MCP servers are one component that plugins can include. Use the **MCP Servers** page for standalone server configuration. Use **Plugins** for bundled packages.`
  },
  {
    id: 'permissions',
    title: 'Permissions',
    icon: <Shield size={18} />,
    content: `# Permissions & Security

Control which tools Claude Code can use.

## Tool Categories
- **File Operations** — Read, Write, Edit, MultiEdit, Glob, Grep, NotebookEdit
- **Execution** — Bash, Task (subagent spawning)
- **Web** — WebFetch, WebSearch
- **MCP** — mcp__* (all MCP server tools)

## Allow / Deny Lists
- **Allowed Tools** — Whitelist specific tools or patterns
- **Denied Tools** — Blacklist tools you want to restrict
- Patterns support wildcards (e.g., \`mcp__*\` for all MCP tools)

## Scope
Permissions are managed through settings.json and can be set at user, project, or local scope levels. Narrower scopes override broader ones.`
  },
  {
    id: 'sessions',
    title: 'Sessions',
    icon: <History size={18} />,
    content: `# Sessions

Manage terminal sessions and session memory handoffs.

## Active Sessions
- View all running PTY (terminal) sessions
- See session model, working directory, and uptime
- Resume or terminate sessions

## Session Memory
Session memory lets you capture context from one session and carry it into the next:
1. In the terminal, write a summary of your current work
2. Save it as a session memory
3. When starting a new session, the memory is available to restore context

## Tips
- Use session memory when switching between tasks
- Keep summaries focused on what matters for the next session
- Memory handoffs prevent losing context across terminal restarts`
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: <FolderOpen size={18} />,
    content: `# Projects

Open project directories and see their Claude Code configuration status.

## Project Scanner
When you open a project directory, the scanner checks for:
- CLAUDE.md (project root)
- .claude/CLAUDE.md (local config)
- CLAUDE.local.md (private preferences)
- .claude/settings.json and settings.local.json
- .claude/skills/, agents/, commands/, rules/
- .mcp.json (project MCP servers)
- Auto memory directory

## Scope Toggle
Switch between **Project** and **Global** views:
- **Project** — Shows configuration files in your current project
- **Global** — Shows global configuration in \`~/.claude/\`

## Quick Navigation
Click any detected configuration item to jump directly to its editor page.`
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: <BarChart2 size={18} />,
    content: `# Analytics

A full usage dashboard built from Claude Code's own session logs — no external tracking, all data stays local.

## Data Source
Analytics reads directly from \`~/.claude/projects/\` — the same JSONL session log files Claude Code writes during every session. No data is sent anywhere. Everything is computed locally on your machine.

## Five Tabs

### Overview
High-level summary of your total Claude Code usage:
- **Total Sessions** — Number of completed sessions across all projects
- **Total Tokens** — Combined input + output token count
- **Total Cost** — Cumulative spend in USD based on per-model pricing (with any discount applied)
- **Top Models** — Your most-used models and their discounted cost

### Models
Breakdown of usage by model (Opus, Sonnet, Haiku):
- Token count per model (input, output, and cache separately)
- Cost contribution per model with your discount applied
- Helps you see which model you're using most and what it costs

### Projects
Usage ranked by project directory:
- Sessions per project
- Token usage per project
- Cost per project (discount applied)
- Quickly see which projects drive the most Claude Code activity

### Sessions
Paginated log of every session:
- Session ID, model used, project directory
- Input tokens, output tokens, and cost per session (discount applied)
- Timestamp and duration
- 10 sessions per page with navigation controls

### Timeline
30-day rolling cost chart:
- Daily cost bars for the past 30 days (discount applied)
- Spot spending trends, busy days, and quiet periods
- Top 5 highest-cost days listed below the chart

## Pricing & Discounts
All cost figures respect your pricing configuration from **Settings → Pricing**:
- **List pricing** — Default rates for each Claude model (Opus 4.6, Sonnet 4.6, Haiku 4.5, etc.)
- **Volume discount** — Choose 2% ($100k–$500k), 5% ($500k–$1M), or 9% (>$1M) commitment tier, or enter a custom percentage
- **Savings badge** — When a discount is active, the Overview tab shows how much you save vs. list price
- Discounts apply only at display time — the underlying session data is never modified

## Refresh
Click the **refresh** icon in the header to re-parse the latest session logs. Analytics updates automatically when you navigate to the page.

## Privacy
All session data is stored in \`~/.claude/projects/\` on your local machine. The Analytics page reads these files directly — nothing is uploaded, tracked, or reported externally.`,
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: <Keyboard size={18} />,
    content: `# Keyboard Shortcuts

## Global
- **Cmd/Ctrl + B** — Toggle sidebar

## Terminal
- **Enter** — Send message
- **Shift + Enter** — New line
- **Up/Down** — Command history
- **Escape** — Interrupt current operation

## Prompt Composer
- **Cmd/Ctrl + Enter** — Send composed prompt
- **Escape** — Close composer

## Editors (CLAUDE.md, Rules, Memory)
- **Tab** — Indent
- **Cmd/Ctrl + Z** — Undo
- **Cmd/Ctrl + Shift + Z** — Redo
- **Cmd/Ctrl + S** — Save (when available)

## Theme
- Use the **sun/moon** toggle at the bottom of the sidebar to switch between light and dark mode`
  },
]

export function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState(DOCS[0].id)
  const [search, setSearch] = useState('')

  const filteredDocs = DOCS.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase())
  )

  const currentDoc = DOCS.find(d => d.id === selectedDoc)

  // Simple inline code rendering
  const renderInlineCode = (text: string) => {
    const parts = text.split(/(`[^`]+`)/)
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded bg-bg-tertiary text-accent-cyan text-[11px] font-mono">{part.slice(1, -1)}</code>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="flex h-full">
      {/* Docs sidebar */}
      <div className="w-64 border-r border-border bg-bg-secondary overflow-y-auto flex-shrink-0">
        <div className="p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search docs..." />
        </div>
        <nav className="px-2 pb-4">
          {filteredDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                selectedDoc === doc.id
                  ? 'bg-accent-orange/10 text-accent-orange font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
            >
              {doc.icon}
              <span className="truncate">{doc.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Doc content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
        {currentDoc && (
          <div className="prose prose-invert prose-sm max-w-none">
            {currentDoc.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-heading font-bold mb-4">{line.slice(2)}</h1>
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-heading font-semibold mt-6 mb-3">{line.slice(3)}</h2>
              if (line.startsWith('- **')) {
                const match = line.match(/- \*\*(.+?)\*\*\s*[—-]\s*(.+)/)
                if (match) return <div key={i} className="flex gap-2 py-1"><span className="font-mono text-accent-cyan text-xs font-semibold whitespace-nowrap">{match[1]}</span><span className="text-xs text-text-secondary">{renderInlineCode(match[2])}</span></div>
                const simpleMatch = line.match(/- \*\*(.+?)\*\*(.*)/)
                if (simpleMatch) return <div key={i} className="text-sm text-text-secondary py-0.5 pl-4"><strong className="text-text-primary">{simpleMatch[1]}</strong>{simpleMatch[2]}</div>
              }
              if (line.startsWith('- ')) return <div key={i} className="text-sm text-text-secondary py-0.5 pl-4">{renderInlineCode("- " + line.slice(2))}</div>
              if (line.match(/^\d+\.\s/)) return <div key={i} className="text-sm text-text-secondary py-0.5 pl-4">{renderInlineCode(line)}</div>
              if (line.startsWith('```')) return null
              if (line.trim() === '') return <div key={i} className="h-2" />
              return <p key={i} className="text-sm text-text-secondary leading-relaxed">{renderInlineCode(line)}</p>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

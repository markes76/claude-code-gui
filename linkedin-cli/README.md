# linkedin-cli

```
┌─────────────────────────────────────────┐
│  linkedin-cli  ·  Read LinkedIn from    │
│  your terminal & AI coding agents       │
└─────────────────────────────────────────┘
```

[![npm version](https://img.shields.io/npm/v/linkedin-cli)](https://www.npmjs.com/package/linkedin-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-green)](https://nodejs.org)

An unofficial CLI for LinkedIn that gives **agentic coding tools** (Claude Code, Cursor, Codex, OpenClaw) read access to your LinkedIn account — profiles, connections, feed, messages, notifications, jobs, and more.

---

> **⚠ UNOFFICIAL TOOL — USE AT YOUR OWN RISK**
>
> `linkedin-cli` is **not affiliated with, endorsed by, or supported by LinkedIn**. It uses undocumented internal APIs (the "Voyager" API) that power the LinkedIn web app. These APIs can change or break at any time without notice. Using unofficial APIs may violate [LinkedIn's User Agreement](https://www.linkedin.com/legal/user-agreement). By using this tool you accept all responsibility. The authors provide no warranty of any kind. Do not use this tool for scraping, spam, or any purpose that violates LinkedIn's terms.

---

## Features

- **Profile** — View your own or any public profile
- **Connections** — List, search, and count your connections
- **Feed** — Browse your feed and your own posts with engagement stats
- **Messages** — Read recent conversations and search messages (read-only)
- **Notifications** — View recent and unread notifications
- **Network** — Manage invitations and people you may know
- **Analytics** — Post performance and follower stats
- **Search** — Search people, companies, jobs, and posts
- **Jobs** — Saved jobs, applied jobs, and recommendations
- **AI Agent Skill** — Install a skill file for Claude Code, Cursor, OpenClaw
- **JSON output** — Every command supports `--json` for piping to `jq` or agent consumption
- **Secure auth** — Playwright-based login with persistent browser profile; session stored at `~/.config/linkedin-cli/session.json` (chmod 600)

---

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 22+ |
| npm | 10+ |
| Google Chrome | Latest |
| OS | macOS, Linux, Windows (WSL2 recommended) |

---

## Installation

```bash
npm install -g linkedin-cli
```

Or use without installing:

```bash
npx linkedin-cli login
```

> **Note:** First run will install Playwright's Chromium driver if Chrome is not found.

---

## Authentication

### Login

```bash
linkedin login
```

This opens a real Chrome window. Log in to LinkedIn as you normally would. The CLI captures your session cookies when you reach the feed and saves them to `~/.config/linkedin-cli/session.json`.

### Check Status

```bash
linkedin status
```

### Logout

```bash
linkedin logout
```

---

## Commands

### Profile

```bash
linkedin profile                                      # Your profile
linkedin profile https://www.linkedin.com/in/johndoe  # Someone else's profile
linkedin profile --json                               # JSON output
```

### Connections

```bash
linkedin connections                        # List connections
linkedin connections --search "John"        # Search by name
linkedin connections --count                # Total count only
linkedin connections --recent               # Recently added
linkedin connections --limit 100            # More results
```

### Feed & Posts

```bash
linkedin feed                               # Your recent feed
linkedin feed --mine                        # Your own posts
linkedin feed --mine --stats                # Your posts with engagement
linkedin posts <post-url>                   # Specific post + comments
```

### Messages

```bash
linkedin messages                           # Recent conversations
linkedin messages --unread                  # Unread only
linkedin messages --search "keyword"        # Search messages
```

### Notifications

```bash
linkedin notifications                      # Recent notifications
linkedin notifications --unread             # Unread only
```

### Network

```bash
linkedin network invitations                # Received connection requests
linkedin network invitations --sent         # Sent requests
linkedin network suggestions                # People you may know
```

### Analytics

```bash
linkedin analytics                          # Post performance (last 30 days)
linkedin analytics --post <post-url>        # Specific post analytics
linkedin analytics --followers              # Follower growth
```

### Search

```bash
linkedin search people "AI engineer"
linkedin search companies "cybersecurity"
linkedin search jobs "product manager"
linkedin search posts "enterprise AI"
```

### Jobs

```bash
linkedin jobs saved                         # Saved jobs
linkedin jobs applied                       # Applied jobs
linkedin jobs recommended                   # Recommended jobs
```

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Raw JSON output (great for piping to `jq`) |
| `--no-color` | Disable colored output |
| `--limit <n>` | Limit number of results |

---

## AI Agent Skills

`linkedin-cli` ships with a skill file that teaches AI coding agents how to use every command, including natural-language-to-command mappings and JSON output guidance.

### Claude Code

```bash
# Install the skill into your project's .claude/skills/
linkedin skill install

# Check status
linkedin skill status

# View the skill content
linkedin skill show

# Remove
linkedin skill uninstall
```

After installation, Claude Code automatically picks up `.claude/skills/linkedin-cli.md`. You can then ask Claude things like:

> "How many LinkedIn connections do I have?"
> "Show me my recent posts with engagement stats."
> "Search for AI engineers in my network."

### Claude Desktop (MCP / system prompt)

Paste the output of `linkedin skill show` into your Claude system prompt or MCP configuration.

### Cursor / OpenClaw / Codex

Copy the output of `linkedin skill show` into your agent's context or rules file (`.cursorrules`, `AGENTS.md`, etc.).

---

## JSON Output Examples

All commands support `--json` for structured output.

```bash
# Connection count
linkedin connections --count --json
# → {"count": 847}

# My recent posts with engagement
linkedin feed --mine --stats --json | jq '[.[] | {text: .commentary.text.text, likes: .socialDetail.totalSocialActivityCounts.numLikes}]'

# Export connections CSV
linkedin connections --limit 500 --json | jq -r '.[] | [.firstName, .lastName, .headline] | @csv'

# Find unread messages
linkedin messages --unread --json | jq '.[].participants[].participantType.member.firstName.text'
```

---

## Tech Stack

| Technology | Role |
|------------|------|
| TypeScript 5.8+ | Language |
| Node.js 22+ | Runtime (native fetch, ESM) |
| Commander.js | CLI framework |
| Playwright | Headed Chrome auth flow |
| Chalk | Terminal colors |
| cli-table3 | Pretty tables |
| tsup | Build bundler |

---

## Configuration

Config and session data live in `~/.config/linkedin-cli/`:

```
~/.config/linkedin-cli/
├── session.json          # Encrypted session cookies (chmod 600)
└── browser-profile/      # Persistent Chrome profile (avoids LinkedIn bot detection)
```

---

## Rate Limiting

LinkedIn throttles API requests aggressively. The CLI adds a 1-second delay between requests by default. If you hit rate limits (429 errors), wait 60 seconds before retrying. Use `--limit` to control request volume in bulk operations.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Install deps: `npm install`
4. Build: `npm run build`
5. Test manually: `node dist/cli.js --help`
6. Submit a PR

---

## License

MIT — see [LICENSE](LICENSE)

---

> This project follows the same patterns as [riseup-cli](https://github.com/riseup-cli/riseup-cli). If LinkedIn's Voyager API changes and commands break, please open an issue.

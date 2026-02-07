import { IpcMain } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, realpathSync, readdirSync } from 'fs'

interface ClaudeSession {
  id: string
  process: ChildProcess | null
  cwd: string
  model: string
  startTime: number
  active: boolean
}

const sessions = new Map<string, ClaudeSession>()
let sessionCounter = 0

// ── PATH Resolution ──────────────────────────────────────────────────
// Electron packaged apps get a minimal PATH from macOS launchd.
// We build a comprehensive PATH that covers all common install locations.

function buildUserPath(): string {
  const home = homedir()
  const extraPaths = [
    join(home, '.npm-global', 'bin'),
    join(home, '.local', 'bin'),
    join(home, '.bun', 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
    join(home, '.cargo', 'bin'),
  ]

  // Find nvm node versions
  const nvmDir = join(home, '.nvm', 'versions', 'node')
  if (existsSync(nvmDir)) {
    try {
      const versions = readdirSync(nvmDir)
      if (versions.length > 0) {
        const latest = versions.sort().reverse()[0]
        extraPaths.push(join(nvmDir, latest, 'bin'))
      }
    } catch { /* ignore */ }
  }

  const systemPath = process.env.PATH || '/usr/bin:/bin'
  return [...extraPaths, systemPath].join(':')
}

// Shared env for all spawned processes
function getSpawnEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: buildUserPath(),
  }
}

// ── Claude Binary Resolution ─────────────────────────────────────────
// Find the claude binary, then resolve it to the actual JS script.
// This lets us run `node cli.js` directly — no shell, no shebang issues.

function getClaudePath(): string {
  const home = homedir()
  const candidates = [
    join(home, '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    join(home, '.local', 'bin', 'claude'),
    join(home, '.bun', 'bin', 'claude'),
    '/opt/homebrew/bin/claude',
  ]

  for (const c of candidates) {
    if (existsSync(c)) return c
  }

  try {
    return execSync('which claude', {
      encoding: 'utf-8',
      env: getSpawnEnv(),
    }).trim()
  } catch { /* ignore */ }

  return 'claude'
}

// Resolve symlink to find the actual JS entry point (e.g., cli.js)
function resolveClaudeScript(claudePath: string): string | null {
  try {
    const realPath = realpathSync(claudePath)
    if (realPath.endsWith('.js') || realPath.endsWith('.mjs')) {
      return realPath
    }
    // If it's not a JS file, check if it's a script with a shebang
    const content = readFileSync(realPath, 'utf-8').slice(0, 200)
    if (content.startsWith('#!/')) {
      return realPath
    }
  } catch { /* ignore */ }
  return null
}

// Find the Node.js binary
function findNodePath(): string | null {
  const home = homedir()

  // Check nvm first (most common for dev setups)
  const nvmDir = join(home, '.nvm', 'versions', 'node')
  if (existsSync(nvmDir)) {
    try {
      const versions = readdirSync(nvmDir)
      if (versions.length > 0) {
        const latest = versions.sort().reverse()[0]
        const nodePath = join(nvmDir, latest, 'bin', 'node')
        if (existsSync(nodePath)) return nodePath
      }
    } catch { /* ignore */ }
  }

  // Check common locations
  const candidates = [
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    join(home, '.local', 'bin', 'node'),
    join(home, '.bun', 'bin', 'node'),
  ]

  for (const c of candidates) {
    if (existsSync(c)) return c
  }

  // Try the enriched PATH
  try {
    return execSync('which node', {
      encoding: 'utf-8',
      env: getSpawnEnv(),
    }).trim()
  } catch { /* ignore */ }

  return null
}

// ── Core CLI Spawn ───────────────────────────────────────────────────
// Run claude CLI commands by executing `node cli.js` directly.
// This bypasses all shell issues (shebangs, login profiles, PATH).
// Falls back to login shell approach if direct execution isn't possible.

function spawnClaude(
  claudePath: string,
  nodePath: string | null,
  claudeScript: string | null,
  args: string[],
  options: { cwd?: string; timeout?: number }
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const cwd = options.cwd || homedir() // NEVER use process.cwd() — it's "/" in packaged apps
    const timeout = options.timeout || 60000
    const env = getSpawnEnv()

    let proc: ChildProcess

    if (nodePath && claudeScript) {
      // DIRECT: node /path/to/cli.js args...
      // No shell needed. No shebang issues. No PATH issues. No profile noise.
      console.log('[cli] Direct spawn: node', claudeScript, args.length, 'args, cwd:', cwd)
      proc = spawn(nodePath, [claudeScript, ...args], { cwd, env })
    } else {
      // FALLBACK: login shell
      console.log('[cli] Shell fallback: zsh -l -c claude ...args, cwd:', cwd)
      const shell = process.env.SHELL || '/bin/zsh'
      const cmdParts = [claudePath, ...args].map(a => {
        if (/^[a-zA-Z0-9._\-/=]+$/.test(a)) return a
        return "'" + a.replace(/'/g, "'\\''") + "'"
      })
      proc = spawn(shell, ['-l', '-c', cmdParts.join(' ')], { cwd, env })
    }

    proc.stdin?.end()

    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      resolve({ code: -1, stdout, stderr: stderr || `Timeout after ${timeout / 1000}s` })
    }, timeout)

    proc.stdout?.on('data', (d) => { stdout += d.toString() })
    proc.stderr?.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      clearTimeout(timer)
      console.log('[cli] Done. code:', code, 'stdout:', stdout.length, 'stderr:', stderr.length)
      resolve({ code, stdout, stderr })
    })
    proc.on('error', (e) => {
      clearTimeout(timer)
      console.error('[cli] Error:', e.message)
      resolve({ code: -1, stdout: '', stderr: e.message })
    })
  })
}

function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now()}`
}

// Read API key from environment or ~/.claude/.env file
function getAnthropicApiKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }

  try {
    const envPath = join(homedir(), '.claude', '.env')
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        let value = trimmed.slice(eqIdx + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key === 'ANTHROPIC_API_KEY' && value) return value
      }
    }
  } catch { /* ignore */ }

  return null
}

// ── IPC Handlers ─────────────────────────────────────────────────────

export function registerCliBridgeHandlers(ipcMain: IpcMain): void {
  const claudePath = getClaudePath()
  const claudeScript = resolveClaudeScript(claudePath)
  const nodePath = findNodePath()

  console.log('[cli-bridge] claudePath:', claudePath)
  console.log('[cli-bridge] claudeScript:', claudeScript)
  console.log('[cli-bridge] nodePath:', nodePath)
  console.log('[cli-bridge] cwd:', process.cwd())
  console.log('[cli-bridge] home:', homedir())

  // Check if Claude CLI is available
  ipcMain.handle('cli:check', async () => {
    try {
      const result = await spawnClaude(claudePath, nodePath, claudeScript, ['--version'], { timeout: 10000 })
      const version = result.stdout.trim()
      if (version && result.code === 0) {
        return { available: true, version, path: claudePath }
      }
      return { available: false, version: null, path: null }
    } catch {
      return { available: false, version: null, path: null }
    }
  })

  // Start a new Claude session
  ipcMain.handle('cli:start-session', async (_event, options: {
    cwd?: string
    model?: string
    resume?: boolean
    args?: string[]
  }) => {
    const sessionId = generateSessionId()
    const args: string[] = []

    if (options.model) {
      args.push('--model', options.model)
    }
    if (options.resume) {
      args.push('-c')
    }
    if (options.args) {
      args.push(...options.args)
    }

    const cwd = options.cwd || process.cwd()

    const session: ClaudeSession = {
      id: sessionId,
      process: null,
      cwd,
      model: options.model || 'default',
      startTime: Date.now(),
      active: true
    }

    sessions.set(sessionId, session)

    return { sessionId, cwd }
  })

  // Spawn a PTY process for terminal integration
  ipcMain.handle('cli:spawn-pty', async (_event, options: {
    sessionId: string
    cols: number
    rows: number
  }) => {
    const session = sessions.get(options.sessionId)
    if (!session) {
      return { error: 'Session not found' }
    }

    return {
      command: claudePath,
      cwd: session.cwd,
      env: getSpawnEnv()
    }
  })

  // Execute a single Claude command (non-interactive)
  ipcMain.handle('cli:exec', async (_event, options: {
    command: string
    cwd?: string
    timeout?: number
    model?: string
  }) => {
    const args = ['-p', options.command, '--output-format', 'text']
    if (options.model) {
      args.push('--model', options.model)
    }

    return spawnClaude(claudePath, nodePath, claudeScript, args, {
      cwd: options.cwd,
      timeout: options.timeout || 120000,
    })
  })

  // Run a slash command
  ipcMain.handle('cli:slash-command', async (_event, options: {
    command: string
    args?: string
    cwd?: string
  }) => {
    const fullCommand = options.args
      ? `/${options.command} ${options.args}`
      : `/${options.command}`

    return spawnClaude(claudePath, nodePath, claudeScript, ['-p', fullCommand], {
      cwd: options.cwd,
      timeout: 120000,
    })
  })

  // List active sessions
  ipcMain.handle('cli:list-sessions', async () => {
    return Array.from(sessions.entries()).map(([id, s]) => ({
      id,
      cwd: s.cwd,
      model: s.model,
      startTime: s.startTime,
      active: s.active
    }))
  })

  // Kill a session
  ipcMain.handle('cli:kill-session', async (_event, sessionId: string) => {
    const session = sessions.get(sessionId)
    if (session?.process) {
      session.process.kill('SIGTERM')
      session.active = false
    }
    sessions.delete(sessionId)
    return { success: true }
  })

  // ── Prompt Enhancement ──
  // Direct API (fast, needs key) → CLI fallback (works with claude login)
  ipcMain.handle('cli:enhance-prompt', async (_event, prompt: string) => {
    const apiKey = getAnthropicApiKey()

    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `You are a prompt enhancement expert for Claude Code (an AI coding assistant). A beginner developer has written the following prompt. Rewrite it to be clear, specific, and well-structured so Claude Code can execute it effectively.

Rules:
- Preserve the user's EXACT intent — don't add features they didn't ask for
- Make it specific and actionable
- Add structure (bullet points, clear sections) if the request has multiple parts
- Specify file paths, technologies, or constraints if they can be inferred
- Keep it concise — better prompts are clear, not long
- If the prompt is already good, make minimal improvements
- Output ONLY the enhanced prompt, nothing else — no preamble, no explanation

User's prompt:
---
${prompt}
---`
            }]
          }),
        })

        if (response.ok) {
          const data = await response.json() as any
          const text = data.content?.[0]?.text || ''
          if (text) {
            return { success: true, enhanced: text.trim() }
          }
        }
        console.log('[enhance-prompt] API returned non-ok:', response.status)
      } catch (e: any) {
        console.log('[enhance-prompt] Direct API failed, falling back to CLI:', e.message)
      }
    }

    // CLI path — works with claude login (Pro/Max/Enterprise)
    try {
      const result = await spawnClaude(claudePath, nodePath, claudeScript, [
        '-p', `Rewrite this prompt to be clearer and more specific for an AI coding assistant. Output ONLY the enhanced prompt, nothing else:\n\n${prompt}`,
        '--output-format', 'text', '--model', 'haiku'
      ], { timeout: 45000 })

      if (result.stdout.trim()) {
        return { success: true, enhanced: result.stdout.trim() }
      }
      return { success: false, error: result.stderr || 'No output from CLI' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Script Execution ──
  ipcMain.handle('cli:run-script', async (_event, filePath: string, cwd?: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    let command: string
    let args: string[]

    switch (ext) {
      case 'py':
        command = 'python3'
        args = [filePath]
        break
      case 'js':
        command = nodePath || 'node'
        args = [filePath]
        break
      case 'ts':
        command = 'npx'
        args = ['tsx', filePath]
        break
      case 'sh':
      case 'bash':
        command = 'bash'
        args = [filePath]
        break
      default:
        return { success: false, output: `Unsupported file type: .${ext}` }
    }

    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: cwd || homedir(),
        env: getSpawnEnv(),
      })

      let output = ''
      const timer = setTimeout(() => {
        proc.kill('SIGTERM')
        resolve({ success: false, output: output + '\n[Timeout after 60 seconds]' })
      }, 60000)

      proc.stdout?.on('data', (d) => { output += d.toString() })
      proc.stderr?.on('data', (d) => { output += d.toString() })
      proc.on('close', (code) => {
        clearTimeout(timer)
        resolve({ success: code === 0, output, exitCode: code })
      })
      proc.on('error', (e) => {
        clearTimeout(timer)
        resolve({ success: false, output: `Failed to run: ${e.message}` })
      })
    })
  })

  // ── Session Summarization ──
  // Direct API (fast, needs key) → CLI fallback (works with claude login)
  ipcMain.handle('cli:summarize-session', async (_event, transcript: string) => {
    const systemPrompt = `You are creating a session handoff summary. A developer is transitioning from one AI coding session to another. Create a concise summary that lets a fresh AI assistant pick up where the previous session left off.

Focus on:
- **Project context**: What project, what stack, what directory
- **What was accomplished**: Key changes made, files modified
- **Current state**: What's working, what's broken, what's in progress
- **Key decisions**: Important architectural or implementation decisions and why
- **Next steps**: What needs to be done next

Be concise (under 400 words). Use markdown bullets.

Terminal transcript:
---
${transcript}
---`

    const apiKey = getAnthropicApiKey()

    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: systemPrompt }]
          }),
        })

        if (response.ok) {
          const data = await response.json() as any
          const text = data.content?.[0]?.text || ''
          if (text) return { success: true, summary: text.trim() }
        }
        console.log('[summarize-session] API returned non-ok:', response.status)
      } catch (e: any) {
        console.log('[summarize-session] Direct API failed, falling back to CLI:', e.message)
      }
    }

    // CLI path — works with claude login (Pro/Max/Enterprise)
    try {
      const result = await spawnClaude(claudePath, nodePath, claudeScript, [
        '-p', systemPrompt, '--output-format', 'text', '--model', 'haiku'
      ], { timeout: 60000 })

      if (result.stdout.trim()) {
        return { success: true, summary: result.stdout.trim() }
      }
      return { success: false, error: result.stderr || 'No output' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Debug Info ──
  ipcMain.handle('cli:get-info', async () => {
    let version = 'unknown'
    try {
      const result = await spawnClaude(claudePath, nodePath, claudeScript, ['--version'], { timeout: 10000 })
      if (result.stdout.trim()) version = result.stdout.trim()
    } catch { /* ignore */ }

    return {
      version,
      claudePath,
      claudeScript,
      nodePath,
      homeDir: homedir(),
      configDir: join(homedir(), '.claude'),
      cwd: process.cwd(),
      hasApiKey: !!getAnthropicApiKey(),
    }
  })
}

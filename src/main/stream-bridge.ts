import { IpcMain, BrowserWindow, webContents } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, realpathSync, readdirSync, statSync, openSync, readSync, closeSync } from 'fs'
import { is } from '@electron-toolkit/utils'

let activeProcess: ChildProcess | null = null
let activeRunId: string | null = null
let currentRunEvents: any[] = []

let watchInterval: NodeJS.Timeout | null = null
let watchedFile: string | null = null
let watchedFileOffset = 0

function broadcast(channel: string, payload: any) {
  for (const wc of webContents.getAllWebContents()) {
    if (!wc.isDestroyed()) wc.send(channel, payload)
  }
}

// ── Path helpers (mirrors cli-bridge.ts — kept self-contained) ────────

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
  return [...extraPaths, process.env.PATH || '/usr/bin:/bin'].join(':')
}

function getSpawnEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: buildUserPath() }
  // Claude refuses to launch inside another Claude session.
  // The GUI itself may be started from a claude terminal, so unset the guard.
  delete env['CLAUDECODE']
  delete env['CLAUDE_CODE_ENTRYPOINT']
  return env
}

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
    return execSync('which claude', { encoding: 'utf-8', env: getSpawnEnv() }).trim()
  } catch { /* ignore */ }
  return 'claude'
}

function resolveClaudeScript(claudePath: string): string | null {
  try {
    const realPath = realpathSync(claudePath)
    if (realPath.endsWith('.js') || realPath.endsWith('.mjs')) return realPath
    const content = readFileSync(realPath, 'utf-8').slice(0, 200)
    if (content.startsWith('#!/')) return realPath
  } catch { /* ignore */ }
  return null
}

function findNodePath(): string | null {
  const home = homedir()
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
  const candidates = [
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    join(home, '.local', 'bin', 'node'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  try {
    return execSync('which node', { encoding: 'utf-8', env: getSpawnEnv() }).trim()
  } catch { /* ignore */ }
  return null
}

// ── IPC Handlers ──────────────────────────────────────────────────────

export function registerStreamHandlers(ipcMain: IpcMain): void {
  const claudePath = getClaudePath()
  const claudeScript = resolveClaudeScript(claudePath)
  const nodePath = findNodePath()

  // Start a streaming run
  ipcMain.handle('stream:run', (_event, options: { prompt: string; model?: string; cwd?: string }) => {
    if (activeProcess) {
      activeProcess.kill('SIGTERM')
      activeProcess = null
    }

    const runId = `run-${Date.now()}`
    activeRunId = runId
    currentRunEvents = []

    const model = options.model || 'claude-sonnet-4-6'
    const cwd = options.cwd || homedir()
    const args = [
      '-p', options.prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--model', model,
    ]

    let proc: ChildProcess
    if (nodePath && claudeScript) {
      proc = spawn(nodePath, [claudeScript, ...args], { cwd, env: getSpawnEnv() })
    } else {
      const shell = process.env.SHELL || '/bin/zsh'
      const cmdParts = [claudePath, ...args].map(a =>
        /^[a-zA-Z0-9._\-/=]+$/.test(a) ? a : "'" + a.replace(/'/g, "'\\''") + "'"
      )
      proc = spawn(shell, ['-l', '-c', cmdParts.join(' ')], { cwd, env: getSpawnEnv() })
    }

    activeProcess = proc

    // Close stdin immediately — claude -p reads from args, not stdin
    proc.stdin?.end()

    // Line-by-line JSON parsing
    let buffer = ''
    proc.stdout?.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop()!
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          currentRunEvents.push(event)
          broadcast('stream:event', { runId, event })
        } catch { /* skip malformed lines */ }
      }
    })

    let stderrText = ''
    proc.stderr?.on('data', (d) => {
      const text = d.toString()
      stderrText += text
      console.warn('[stream] stderr:', text.trim())
    })

    proc.on('close', (exitCode) => {
      if (activeRunId === runId) {
        activeProcess = null
        broadcast('stream:done', { runId, exitCode, stderr: stderrText.trim() })
      }
    })

    proc.on('error', (e) => {
      console.error('[stream] Process error:', e.message)
      broadcast('stream:done', { runId, exitCode: -1, stderr: e.message })
    })

    return { runId }
  })

  // Cancel the active run
  ipcMain.handle('stream:cancel', () => {
    if (activeProcess) {
      activeProcess.kill('SIGTERM')
      activeProcess = null
      broadcast('stream:cancelled', {})
    }
    return { success: true }
  })

  // Get buffered events for popup catch-up
  ipcMain.handle('stream:get-events', () => {
    return { runId: activeRunId, events: currentRunEvents }
  })

  // Open the pop-out stream window
  ipcMain.handle('stream:open-popup', (_event, options: { width?: number; height?: number } = {}) => {
    const popup = new BrowserWindow({
      width: options.width ?? 480,
      height: options.height ?? 700,
      minWidth: 380,
      minHeight: 400,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#0a0a0f',
      title: 'Claude Stream',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
      },
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      popup.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/stream-popup`)
    } else {
      popup.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/stream-popup' })
    }

    return { success: true }
  })

  // ── Watch Mode: tail the active session's JSONL file ─────────────────
  // Maps JSONL session log entries to ClaudeStreamMessage-compatible events

  function mapJSONLEntry(entry: any): any[] {
    if (entry.type === 'assistant' && entry.message?.content) {
      // Keep text and tool_use blocks; skip thinking blocks
      const content = entry.message.content.filter(
        (b: any) => b.type === 'text' || b.type === 'tool_use'
      )
      if (content.length === 0) return []
      return [{ type: 'assistant', message: { ...entry.message, content } }]
    }
    if (entry.type === 'user' && entry.message?.content) {
      // Extract tool_result blocks from user turns
      return entry.message.content
        .filter((b: any) => b.type === 'tool_result')
        .map((b: any) => ({
          type: 'tool_result',
          tool_use_id: b.tool_use_id,
          content: typeof b.content === 'string'
            ? b.content
            : Array.isArray(b.content)
              ? b.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
              : '',
          is_error: b.is_error,
        }))
    }

    // Sub-agent turns are stored as progress entries with a nested message.
    // Structure: { type: "progress", data: { message: { type: "assistant"|"user", message: { content: [...] } } } }
    if (entry.type === 'progress' && entry.data?.message?.type === 'assistant' && entry.data.message.message?.content) {
      const content = entry.data.message.message.content.filter(
        (b: any) => b.type === 'text' || b.type === 'tool_use'
      )
      if (content.length === 0) return []
      return [{ type: 'assistant', message: { ...entry.data.message.message, content } }]
    }
    if (entry.type === 'progress' && entry.data?.message?.type === 'user' && entry.data.message.message?.content) {
      return entry.data.message.message.content
        .filter((b: any) => b.type === 'tool_result')
        .map((b: any) => ({
          type: 'tool_result',
          tool_use_id: b.tool_use_id,
          content: typeof b.content === 'string'
            ? b.content
            : Array.isArray(b.content)
              ? b.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
              : '',
          is_error: b.is_error,
        }))
    }

    return []
  }

  // Watch ALL JSONL files in the project dir — whichever gets new entries wins.
  // This avoids the "wrong file" bug: we used to pick ONE file but often got the
  // wrong session (e.g. this GUI session instead of the PTY terminal session).
  const fileOffsets = new Map<string, number>()

  // newFromStart=false  → new files start at current EOF (skip existing content — used on init)
  // newFromStart=true   → new files start at 0 (read all content — used mid-session so
  //                       sub-agent files created after watch began are fully captured)
  function registerAllJSONLFiles(cwd?: string, newFromStart = false) {
    const projectsDir = join(homedir(), '.claude', 'projects')
    const scanDir = (dir: string) => {
      try {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f)
          if (f.endsWith('.jsonl')) {
            if (!fileOffsets.has(p)) {
              try {
                fileOffsets.set(p, newFromStart ? 0 : statSync(p).size)
              } catch { /* ignore */ }
            }
          } else {
            // Recurse into subdirectories (e.g. {session-uuid}/subagents/)
            try {
              if (statSync(p).isDirectory()) scanDir(p)
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }

    if (cwd) {
      scanDir(join(projectsDir, cwd.replace(/\//g, '-')))
    }
    // Always scan all projects so new session files are picked up automatically
    try {
      for (const project of readdirSync(projectsDir)) {
        scanDir(join(projectsDir, project))
      }
    } catch { /* ignore */ }
  }

  ipcMain.handle('stream:watch-session', (_event, options: { cwd?: string } = {}) => {
    if (watchInterval) { clearInterval(watchInterval); watchInterval = null }
    fileOffsets.clear()
    registerAllJSONLFiles(options.cwd, false) // false = skip existing content on init
    console.log('[stream] Watching', fileOffsets.size, 'JSONL files')

    watchInterval = setInterval(() => {
      // Re-scan for newly created session files each tick.
      // newFromStart=true so sub-agent files (created after watch began) are read
      // from byte 0 — capturing events written before we discovered the file.
      registerAllJSONLFiles(options.cwd, true)

      for (const [file, offset] of fileOffsets.entries()) {
        try {
          const size = statSync(file).size
          if (size <= offset) continue

          const buf = Buffer.alloc(size - offset)
          const fd = openSync(file, 'r')
          readSync(fd, buf, 0, buf.length, offset)
          closeSync(fd)
          fileOffsets.set(file, size)

          for (const line of buf.toString('utf-8').split('\n').filter(Boolean)) {
            try {
              const entry = JSON.parse(line)
              for (const event of mapJSONLEntry(entry)) {
                broadcast('stream:event', { runId: 'watch', event })
              }
            } catch { /* skip malformed */ }
          }
        } catch { fileOffsets.delete(file) }
      }
    }, 300)

    return { success: true }
  })

  ipcMain.handle('stream:unwatch-session', () => {
    if (watchInterval) { clearInterval(watchInterval); watchInterval = null }
    watchedFile = null
    watchedFileOffset = 0
    return { success: true }
  })
}

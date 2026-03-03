import { IpcMain, BrowserWindow, webContents } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, realpathSync, readdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'

let activeProcess: ChildProcess | null = null
let activeRunId: string | null = null
let currentRunEvents: any[] = []

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
  return { ...process.env, PATH: buildUserPath() }
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

    proc.stderr?.on('data', (d) => {
      console.warn('[stream] stderr:', d.toString().trim())
    })

    proc.on('close', (exitCode) => {
      if (activeRunId === runId) {
        activeProcess = null
        broadcast('stream:done', { runId, exitCode })
      }
    })

    proc.on('error', (e) => {
      console.error('[stream] Process error:', e.message)
      broadcast('stream:done', { runId, exitCode: -1 })
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
}

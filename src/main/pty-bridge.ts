import { IpcMain, WebContents } from 'electron'
import { homedir } from 'os'
import { join, delimiter } from 'path'
import { existsSync, readdirSync } from 'fs'
import { execSync } from 'child_process'

const isWin = process.platform === 'win32'

// Load node-pty at runtime to prevent Rollup from bundling the native binary.
// The eval('require') pattern is the standard escape hatch for native modules in Electron+Vite.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = (eval('require') as NodeRequire)('node-pty')

interface PtySession {
  id: string
  ptyProcess: any // node-pty IPty
  sender: WebContents
  model: string
  cwd: string
  startTime: number
}

const sessions = new Map<string, PtySession>()
let counter = 0

const ALLOWED_MODELS = [
  'opus', 'sonnet', 'haiku',
  'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
  'claude-sonnet-4-5-20250929', 'claude-opus-4-6',
]

function shellEscape(arg: string): string {
  if (isWin) {
    if (/^[a-zA-Z0-9._\-/\\:=]+$/.test(arg)) return arg
    return '"' + arg.replace(/"/g, '""') + '"'
  }
  if (/^[a-zA-Z0-9._\-/=]+$/.test(arg)) return arg
  return "'" + arg.replace(/'/g, "'\\''") + "'"
}

// Cached login shell PATH
let _cachedLoginPath: string | null = null

function getLoginShellPath(): string {
  if (_cachedLoginPath !== null) return _cachedLoginPath
  // Windows has no login shell PATH concept — skip entirely
  if (isWin) { _cachedLoginPath = ''; return '' }
  try {
    const shell = process.env.SHELL || '/bin/zsh'
    const result = execSync(`${shell} -ilc 'echo $PATH'`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim()
    if (result) { _cachedLoginPath = result; return result }
  } catch { /* ignore */ }
  _cachedLoginPath = ''
  return ''
}

function buildUserPath(): string {
  const home = homedir()
  const extraPaths: string[] = []

  if (isWin) {
    extraPaths.push(
      join(home, 'AppData', 'Roaming', 'npm'),
      join(home, '.cargo', 'bin'),
      join(home, '.bun', 'bin'),
    )
    const nvmWinDir = join(home, 'AppData', 'Roaming', 'nvm')
    if (existsSync(nvmWinDir)) {
      try {
        const versions = readdirSync(nvmWinDir).filter(v => /^v?\d+/.test(v))
        if (versions.length > 0) {
          const latest = versions.sort().reverse()[0]
          extraPaths.push(join(nvmWinDir, latest))
        }
      } catch { /* ignore */ }
    }
  } else {
    extraPaths.push(
      join(home, '.npm-global', 'bin'),
      join(home, '.local', 'bin'),
      join(home, '.bun', 'bin'),
      '/usr/local/bin',
      '/opt/homebrew/bin',
      join(home, '.cargo', 'bin'),
    )
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
  }

  const loginPath = getLoginShellPath()
  const systemPath = process.env.PATH || ''
  return [...extraPaths, loginPath, systemPath].filter(Boolean).join(delimiter)
}

function getClaudePath(): string {
  const home = homedir()
  const candidates = isWin
    ? [
        join(home, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
        join(home, 'AppData', 'Roaming', 'npm', 'claude'),
        join(home, '.npm-global', 'bin', 'claude'),
        join(home, '.bun', 'bin', 'claude'),
      ]
    : [
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
    const richPath = buildUserPath()
    const cmd = isWin ? 'where claude' : 'which claude'
    return execSync(cmd, {
      encoding: 'utf-8',
      env: { ...process.env, PATH: richPath }
    }).trim().split('\n')[0]
  } catch { /* ignore */ }

  return 'claude'
}

export function registerPtyHandlers(ipcMain: IpcMain): void {
  const claudePath = getClaudePath()

  // Spawn a new PTY session running Claude CLI
  ipcMain.handle('pty:spawn', (event, options: {
    cwd?: string
    model?: string
    args?: string[]
    shell?: boolean
  }) => {
    const id = `pty-${++counter}-${Date.now()}`
    const cwd = options.cwd || homedir()

    const env = {
      ...process.env,
      PATH: buildUserPath(),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    } as Record<string, string>

    // Spawn through the user's shell for PATH resolution and profile loading.
    let shell: string
    let shellArgs: string[]

    if (isWin) {
      shell = process.env.COMSPEC || 'powershell.exe'
      const isPowerShell = shell.toLowerCase().includes('powershell') || shell.toLowerCase().includes('pwsh')

      if (options.shell) {
        // Interactive shell with no command
        shellArgs = []
      } else {
        const claudeArgs: string[] = [claudePath]
        if (options.model) {
          if (!ALLOWED_MODELS.includes(options.model)) {
            return { id: null, error: `Invalid model: "${options.model}". Allowed: ${ALLOWED_MODELS.join(', ')}` }
          }
          claudeArgs.push('--model', options.model)
        }
        if (options.args) {
          claudeArgs.push(...options.args)
        }
        const claudeCmd = claudeArgs.map(shellEscape).join(' ')
        shellArgs = isPowerShell ? ['-NoProfile', '-Command', claudeCmd] : ['/c', claudeCmd]
      }
    } else {
      shell = process.env.SHELL || '/bin/zsh'

      if (options.shell) {
        // Interactive shell with no command — user gets a raw shell
        shellArgs = ['-l']
      } else {
        const claudeArgs: string[] = [claudePath]
        if (options.model) {
          if (!ALLOWED_MODELS.includes(options.model)) {
            return { id: null, error: `Invalid model: "${options.model}". Allowed: ${ALLOWED_MODELS.join(', ')}` }
          }
          claudeArgs.push('--model', options.model)
        }
        if (options.args) {
          claudeArgs.push(...options.args)
        }
        const claudeCmd = claudeArgs.map(shellEscape).join(' ')
        shellArgs = ['-l', '-c', claudeCmd]
      }
    }

    console.log(`[pty:spawn] id=${id} shell=${shell} args=${shellArgs.join(' ')} cwd=${cwd}`)

    try {
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd,
        env,
      })

      const session: PtySession = {
        id,
        ptyProcess,
        sender: event.sender,
        model: options.model || 'default',
        cwd,
        startTime: Date.now(),
      }
      sessions.set(id, session)

      ptyProcess.onData((data: string) => {
        if (!session.sender.isDestroyed()) {
          session.sender.send('pty:data', { id, data })
        }
      })

      ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
        console.log(`[pty:exit] id=${id} code=${exitCode} signal=${signal}`)
        if (!session.sender.isDestroyed()) {
          session.sender.send('pty:exit', { id, exitCode, signal })
        }
        sessions.delete(id)
      })

      return { id, pid: ptyProcess.pid }
    } catch (e: any) {
      console.error(`[pty:spawn] Failed:`, e.message)
      return { id: null, error: e.message }
    }
  })

  ipcMain.on('pty:write', (_event, payload: { id: string; data: string }) => {
    const session = sessions.get(payload.id)
    if (session) {
      session.ptyProcess.write(payload.data)
    }
  })

  ipcMain.on('pty:resize', (_event, payload: { id: string; cols: number; rows: number }) => {
    const session = sessions.get(payload.id)
    if (session) {
      try {
        session.ptyProcess.resize(payload.cols, payload.rows)
      } catch { /* ignore resize errors */ }
    }
  })

  ipcMain.on('pty:kill', (_event, payload: { id: string }) => {
    const session = sessions.get(payload.id)
    if (session) {
      session.ptyProcess.kill()
      sessions.delete(payload.id)
    }
  })

  ipcMain.handle('pty:list-sessions', () => {
    return Array.from(sessions.values()).map(s => ({
      id: s.id,
      pid: s.ptyProcess.pid,
      model: s.model,
      cwd: s.cwd,
      startTime: s.startTime,
      active: true,
    }))
  })

  process.on('exit', () => {
    for (const [, session] of sessions) {
      try { session.ptyProcess.kill() } catch { /* ignore */ }
    }
    sessions.clear()
  })
}

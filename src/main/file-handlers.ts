import { IpcMain, dialog } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, realpathSync, lstatSync } from 'fs'
import { join, dirname, basename, extname, resolve, relative, sep } from 'path'
import { homedir, tmpdir } from 'os'
import { execSync } from 'child_process'

const isWin = process.platform === 'win32'

/**
 * Validates that a file path is within allowed directories.
 * Prevents the renderer process from accessing system files outside the user's home
 * directory or /tmp. This is a practical guard for a desktop app where the user
 * deliberately opens project directories under their home folder.
 */
function validatePath(inputPath: string): string {
  const resolved = resolve(inputPath)
  const home = homedir()
  const tmp = tmpdir()

  // Allow anything under the user's home directory or temp directory
  if (
    resolved === home ||
    resolved.startsWith(home + sep) ||
    resolved === tmp ||
    resolved.startsWith(tmp + sep) ||
    // macOS /tmp -> /private/tmp symlink
    (!isWin && (resolved.startsWith('/tmp/') || resolved === '/tmp'))
  ) {
    return resolved
  }

  throw new Error(`Access denied: path "${resolved}" is outside allowed directories (home: ${home}, tmp: ${tmp})`)
}

export function registerFileHandlers(ipcMain: IpcMain): void {
  // Read a file
  ipcMain.handle('fs:read', async (_event, filePath: string) => {
    try {
      const safePath = validatePath(filePath)
      if (!existsSync(safePath)) {
        return { exists: false, content: null }
      }
      const content = readFileSync(safePath, 'utf-8')
      return { exists: true, content }
    } catch (error: any) {
      return { exists: false, content: null, error: error.message }
    }
  })

  // Write a file
  ipcMain.handle('fs:write', async (_event, filePath: string, content: string) => {
    try {
      const safePath = validatePath(filePath)
      const dir = dirname(safePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(safePath, content, 'utf-8')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Check if file exists
  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    try {
      const safePath = validatePath(filePath)
      return existsSync(safePath)
    } catch {
      return false
    }
  })

  // List directory
  ipcMain.handle('fs:list-dir', async (_event, dirPath: string) => {
    try {
      const safePath = validatePath(dirPath)
      if (!existsSync(safePath)) {
        return { exists: false, entries: [] }
      }
      const entries = readdirSync(safePath).map((name) => {
        const fullPath = join(safePath, name)
        const stat = statSync(fullPath)
        return {
          name,
          path: fullPath,
          isDirectory: stat.isDirectory(),
          isFile: stat.isFile(),
          size: stat.size,
          modified: stat.mtimeMs,
          ext: extname(name)
        }
      })
      return { exists: true, entries }
    } catch (error: any) {
      return { exists: false, entries: [], error: error.message }
    }
  })

  // Delete a file
  ipcMain.handle('fs:delete', async (_event, filePath: string) => {
    try {
      const safePath = validatePath(filePath)
      if (existsSync(safePath)) {
        unlinkSync(safePath)
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Open directory picker
  ipcMain.handle('fs:pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Open file picker
  ipcMain.handle('fs:pick-file', async (_event, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Get Claude-related paths
  ipcMain.handle('fs:get-claude-paths', async () => {
    const home = homedir()
    return {
      home,
      globalConfig: join(home, '.claude'),
      globalClaudeMd: join(home, '.claude', 'CLAUDE.md'),
      globalSettings: join(home, '.claude', 'settings.json'),
      globalSkills: join(home, '.claude', 'skills'),
      globalAgents: join(home, '.claude', 'agents'),
      globalCommands: join(home, '.claude', 'commands'),
      claudeJson: join(home, '.claude.json'),
    }
  })

  // Scan for files modified since a given timestamp across known locations
  // This powers the "Activity Trail" — showing everything Claude touched
  ipcMain.handle('fs:scan-activity', async (_event, options: {
    projectDir: string
    sinceMs: number    // timestamp in milliseconds
    maxDepth?: number  // how deep to recurse (default 6)
  }) => {
    const { projectDir, sinceMs, maxDepth = 6 } = options
    const since = sinceMs / 1000 // convert to seconds for find command
    const home = homedir()

    interface ActivityFile {
      name: string
      path: string
      relativePath: string
      size: number
      modified: number
      ext: string
      location: 'project' | 'scratchpad' | 'claude-config' | 'other'
    }

    const results: ActivityFile[] = []
    const seen = new Set<string>()

    // Helper: recursively scan a directory for recently modified files
    function scanDir(dir: string, location: ActivityFile['location'], depth = 0) {
      if (depth > maxDepth || !existsSync(dir)) return
      try {
        const entries = readdirSync(dir)
        for (const name of entries) {
          // Skip common noise directories
          if (name === 'node_modules' || name === '.git' || name === '.DS_Store' || name === '__pycache__') continue

          const fullPath = join(dir, name)
          if (seen.has(fullPath)) continue
          seen.add(fullPath)

          try {
            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
              scanDir(fullPath, location, depth + 1)
            } else if (stat.isFile() && stat.mtimeMs >= sinceMs) {
              results.push({
                name,
                path: fullPath,
                relativePath: fullPath.startsWith(projectDir)
                  ? relative(projectDir, fullPath)
                  : fullPath.startsWith(home)
                    ? '~/' + relative(home, fullPath)
                    : fullPath,
                size: stat.size,
                modified: stat.mtimeMs,
                ext: extname(name).slice(1).toLowerCase(),
                location,
              })
            }
          } catch { /* skip unreadable files */ }
        }
      } catch { /* skip unreadable dirs */ }
    }

    // 1. Scan project directory
    if (existsSync(projectDir)) {
      scanDir(projectDir, 'project')
    }

    // 2. Scan Claude scratchpad directories (claude-* in temp)
    try {
      const tmpDirs = isWin ? [tmpdir()] : ['/private/tmp', '/tmp']
      for (const tmpBase of tmpDirs) {
        if (!existsSync(tmpBase)) continue
        const entries = readdirSync(tmpBase)
        for (const entry of entries) {
          if (entry.startsWith('claude-')) {
            scanDir(join(tmpBase, entry), 'scratchpad')
          }
        }
      }
    } catch { /* ignore */ }

    // 3. Scan Claude config directories that might have been modified
    const claudeProjectDir = join(home, '.claude', 'projects')
    if (existsSync(claudeProjectDir)) {
      scanDir(claudeProjectDir, 'claude-config', 0)
    }

    // Sort by modification time (newest first)
    results.sort((a, b) => b.modified - a.modified)

    return results
  })

  // Scan for project-level AND global Claude configs
  ipcMain.handle('fs:scan-project', async (_event, projectDir: string) => {
    const home = homedir()
    const globalDir = join(home, '.claude')

    // Compute auto memory path for this project
    const encodedProject = projectDir.replace(/[/\\]/g, '-')
    const autoMemDir = join(globalDir, 'projects', encodedProject, 'memory')

    return {
      projectDir,
      // Project-level
      claudeMd: existsSync(join(projectDir, 'CLAUDE.md')),
      dotClaudeMd: existsSync(join(projectDir, '.claude', 'CLAUDE.md')),
      claudeLocalMd: existsSync(join(projectDir, 'CLAUDE.local.md')),
      settings: existsSync(join(projectDir, '.claude', 'settings.json')),
      localSettings: existsSync(join(projectDir, '.claude', 'settings.local.json')),
      skills: existsSync(join(projectDir, '.claude', 'skills')),
      agents: existsSync(join(projectDir, '.claude', 'agents')),
      commands: existsSync(join(projectDir, '.claude', 'commands')),
      mcpJson: existsSync(join(projectDir, '.mcp.json')),
      rules: existsSync(join(projectDir, '.claude', 'rules')),
      autoMemory: existsSync(autoMemDir),
      // Global-level
      globalClaudeMd: existsSync(join(globalDir, 'CLAUDE.md')),
      globalSettings: existsSync(join(globalDir, 'settings.json')),
      globalSkills: existsSync(join(globalDir, 'skills')),
      globalAgents: existsSync(join(globalDir, 'agents')),
      globalCommands: existsSync(join(globalDir, 'commands')),
      globalMcp: existsSync(join(home, '.claude.json')),
      globalRules: existsSync(join(globalDir, 'rules')),
      globalAutoMemory: existsSync(join(globalDir, 'projects')),
    }
  })
}

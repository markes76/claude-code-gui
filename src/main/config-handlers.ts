import { IpcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'
import { homedir } from 'os'

function safeReadJson(filePath: string): any {
  try {
    if (!existsSync(filePath)) return null
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function safeWriteJson(filePath: string, data: any): boolean {
  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    return true
  } catch {
    return false
  }
}

export function registerConfigHandlers(ipcMain: IpcMain): void {
  const home = homedir()
  const claudeDir = join(home, '.claude')

  // ── Settings ──────────────────────────────────────────

  ipcMain.handle('config:get-settings', async (_event, scope: 'user' | 'project' | 'local', projectDir?: string) => {
    let filePath: string
    switch (scope) {
      case 'user':
        filePath = join(claudeDir, 'settings.json')
        break
      case 'project':
        filePath = join(projectDir || '.', '.claude', 'settings.json')
        break
      case 'local':
        filePath = join(projectDir || '.', '.claude', 'settings.local.json')
        break
    }
    return { data: safeReadJson(filePath), path: filePath }
  })

  ipcMain.handle('config:save-settings', async (_event, scope: string, data: any, projectDir?: string) => {
    let filePath: string
    switch (scope) {
      case 'user':
        filePath = join(claudeDir, 'settings.json')
        break
      case 'project':
        filePath = join(projectDir || '.', '.claude', 'settings.json')
        break
      case 'local':
        filePath = join(projectDir || '.', '.claude', 'settings.local.json')
        break
      default:
        return { success: false, error: 'Invalid scope' }
    }
    return { success: safeWriteJson(filePath, data), path: filePath }
  })

  // ── Skills ──────────────────────────────────────────

  // Recursively walk a skills directory and collect all SKILL.md files
  function collectSkills(dir: string, scope: 'user' | 'project', results: any[]) {
    if (!existsSync(dir)) return
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          const skillFile = join(fullPath, 'SKILL.md')
          if (existsSync(skillFile)) {
            const content = readFileSync(skillFile, 'utf-8')
            const frontmatter = parseFrontmatter(content)
            results.push({
              name: frontmatter.name || entry,
              description: frontmatter.description || '',
              scope,
              path: fullPath,
              content,
              frontmatter
            })
          } else {
            // Recurse into subdirectory to find nested skills
            collectSkills(fullPath, scope, results)
          }
        }
      } catch { /* skip unreadable entries */ }
    }
  }

  ipcMain.handle('config:list-skills', async (_event, projectDir?: string) => {
    const skills: any[] = []
    collectSkills(join(claudeDir, 'skills'), 'user', skills)
    if (projectDir) {
      collectSkills(join(projectDir, '.claude', 'skills'), 'project', skills)
    }
    return skills
  })

  ipcMain.handle('config:save-skill', async (_event, options: {
    name: string
    content: string
    scope: 'user' | 'project'
    projectDir?: string
  }) => {
    const baseDir = options.scope === 'user'
      ? join(claudeDir, 'skills', options.name)
      : join(options.projectDir || '.', '.claude', 'skills', options.name)

    if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true })

    const filePath = join(baseDir, 'SKILL.md')
    try {
      writeFileSync(filePath, options.content, 'utf-8')
      return { success: true, path: filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('config:delete-skill', async (_event, skillPath: string) => {
    try {
      const { rmSync } = require('fs')
      rmSync(skillPath, { recursive: true, force: true })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Agents ──────────────────────────────────────────

  ipcMain.handle('config:list-agents', async (_event, projectDir?: string) => {
    const agents: any[] = []

    const scanDir = (dir: string, scope: string) => {
      if (!existsSync(dir)) return
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        try {
          const stat = statSync(fullPath)
          if (stat.isDirectory()) {
            scanDir(fullPath, scope)
          } else if (entry.endsWith('.md')) {
            const content = readFileSync(fullPath, 'utf-8')
            const frontmatter = parseFrontmatter(content)
            agents.push({
              name: frontmatter.name || entry.replace('.md', ''),
              description: frontmatter.description || '',
              model: frontmatter.model || 'default',
              scope,
              path: fullPath,
              content,
              frontmatter
            })
          }
        } catch { /* skip unreadable entries */ }
      }
    }

    scanDir(join(claudeDir, 'agents'), 'user')
    if (projectDir) scanDir(join(projectDir, '.claude', 'agents'), 'project')

    return agents
  })

  ipcMain.handle('config:save-agent', async (_event, options: {
    name: string
    content: string
    scope: 'user' | 'project'
    projectDir?: string
  }) => {
    const dir = options.scope === 'user'
      ? join(claudeDir, 'agents')
      : join(options.projectDir || '.', '.claude', 'agents')

    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const filePath = join(dir, `${options.name}.md`)
    try {
      writeFileSync(filePath, options.content, 'utf-8')
      return { success: true, path: filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Commands ──────────────────────────────────────────

  ipcMain.handle('config:list-commands', async (_event, projectDir?: string) => {
    const commands: any[] = []

    // Recursive scan — Claude Code supports subdir commands (e.g. category/cmd.md → /category:cmd)
    const scanDir = (dir: string, scope: string, prefix = '') => {
      if (!existsSync(dir)) return
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        try {
          const stat = statSync(fullPath)
          if (stat.isDirectory()) {
            scanDir(fullPath, scope, prefix ? `${prefix}:${entry}` : entry)
          } else if (entry.endsWith('.md')) {
            const content = readFileSync(fullPath, 'utf-8')
            const frontmatter = parseFrontmatter(content)
            const baseName = entry.replace('.md', '')
            commands.push({
              name: prefix ? `${prefix}:${baseName}` : baseName,
              description: frontmatter.description || '',
              scope,
              path: fullPath,
              content,
              frontmatter
            })
          }
        } catch { /* skip unreadable entries */ }
      }
    }

    scanDir(join(claudeDir, 'commands'), 'user')
    if (projectDir) scanDir(join(projectDir, '.claude', 'commands'), 'project')

    return commands
  })

  ipcMain.handle('config:save-command', async (_event, options: {
    name: string
    content: string
    scope: 'user' | 'project'
    projectDir?: string
  }) => {
    const dir = options.scope === 'user'
      ? join(claudeDir, 'commands')
      : join(options.projectDir || '.', '.claude', 'commands')

    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const filePath = join(dir, `${options.name}.md`)
    try {
      writeFileSync(filePath, options.content, 'utf-8')
      return { success: true, path: filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Hooks ──────────────────────────────────────────

  ipcMain.handle('config:get-hooks', async (_event, scope: 'user' | 'project' | 'local', projectDir?: string) => {
    let settingsPath: string
    switch (scope) {
      case 'user':
        settingsPath = join(claudeDir, 'settings.json')
        break
      case 'project':
        settingsPath = join(projectDir || '.', '.claude', 'settings.json')
        break
      case 'local':
        settingsPath = join(projectDir || '.', '.claude', 'settings.local.json')
        break
    }
    const settings = safeReadJson(settingsPath)
    return settings?.hooks || {}
  })

  ipcMain.handle('config:save-hooks', async (_event, hooks: any, scope: 'user' | 'project' | 'local', projectDir?: string) => {
    let settingsPath: string
    switch (scope) {
      case 'user':
        settingsPath = join(claudeDir, 'settings.json')
        break
      case 'project':
        settingsPath = join(projectDir || '.', '.claude', 'settings.json')
        break
      case 'local':
        settingsPath = join(projectDir || '.', '.claude', 'settings.local.json')
        break
    }
    const settings = safeReadJson(settingsPath) || {}
    settings.hooks = hooks
    return { success: safeWriteJson(settingsPath, settings) }
  })

  // ── MCP Servers ──────────────────────────────────────────

  ipcMain.handle('config:get-mcp-servers', async (_event, scope: 'user' | 'project', projectDir?: string) => {
    if (scope === 'user') {
      const data = safeReadJson(join(home, '.claude.json'))
      return data?.mcpServers || {}
    } else {
      const data = safeReadJson(join(projectDir || '.', '.mcp.json'))
      return data?.mcpServers || {}
    }
  })

  ipcMain.handle('config:save-mcp-server', async (_event, options: {
    name: string
    config: any
    scope: 'user' | 'project'
    projectDir?: string
  }) => {
    const filePath = options.scope === 'user'
      ? join(home, '.claude.json')
      : join(options.projectDir || '.', '.mcp.json')

    const data = safeReadJson(filePath) || {}
    if (!data.mcpServers) data.mcpServers = {}
    data.mcpServers[options.name] = options.config
    return { success: safeWriteJson(filePath, data) }
  })

  ipcMain.handle('config:delete-mcp-server', async (_event, name: string, scope: 'user' | 'project', projectDir?: string) => {
    const filePath = scope === 'user'
      ? join(home, '.claude.json')
      : join(projectDir || '.', '.mcp.json')

    const data = safeReadJson(filePath) || {}
    if (data.mcpServers) {
      delete data.mcpServers[name]
      return { success: safeWriteJson(filePath, data) }
    }
    return { success: true }
  })

  // ── Environment Variables (.env) ──────────────────────

  ipcMain.handle('env:read', async (_event, envPath?: string) => {
    const filePath = envPath || join(home, '.claude', '.env')
    try {
      if (!existsSync(filePath)) return {}
      const content = readFileSync(filePath, 'utf-8')
      const vars: Record<string, string> = {}
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        let value = trimmed.slice(eqIdx + 1).trim()
        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key) vars[key] = value
      }
      return vars
    } catch {
      return {}
    }
  })

  ipcMain.handle('env:write', async (_event, vars: Record<string, string>, envPath?: string) => {
    const filePath = envPath || join(home, '.claude', '.env')
    try {
      const dir = dirname(filePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const lines = Object.entries(vars).map(([key, value]) => {
        // Quote values that contain spaces or special characters
        if (value.includes(' ') || value.includes('#') || value.includes('=')) {
          return `${key}="${value}"`
        }
        return `${key}=${value}`
      })
      writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8')
      return { success: true }
    } catch {
      return { success: false }
    }
  })

  // ── Plugin Skills ──────────────────────────────────────────

  ipcMain.handle('plugins:scan-skills', async () => {
    try {
      const manifestPath = join(claudeDir, 'plugins', 'installed_plugins.json')
      return scanPluginSkills(manifestPath)
    } catch {
      return []
    }
  })
}

// ── Plugin Skills Scanner ──────────────────────────────────────────

function scanPluginSkills(manifestPath: string): Array<{ pluginKey: string; pluginName: string; version: string; skills: Array<{ name: string; description: string; path: string }> }> {
  if (!existsSync(manifestPath)) return []
  let manifest: any
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch { return [] }
  if (!manifest?.plugins || typeof manifest.plugins !== 'object') return []

  const groups: Array<{ pluginKey: string; pluginName: string; version: string; skills: Array<{ name: string; description: string; path: string }> }> = []

  for (const [pluginKey, entries] of Object.entries(manifest.plugins) as [string, any][]) {
    const entry = entries[0]
    if (!entry?.installPath) continue
    const { installPath, version } = entry
    if (!existsSync(installPath)) continue
    const skillsDir = join(installPath, 'skills')
    if (!existsSync(skillsDir)) continue

    let subdirs: string[]
    try {
      subdirs = readdirSync(skillsDir).sort().filter(d => {
        try { return statSync(join(skillsDir, d)).isDirectory() } catch { return false }
      })
    } catch { continue }

    const skills: Array<{ name: string; description: string; path: string }> = []
    for (const subdir of subdirs) {
      const skillFile = join(skillsDir, subdir, 'SKILL.md')
      if (!existsSync(skillFile)) continue
      let fields: Record<string, any> = {}
      try { fields = parseFrontmatter(readFileSync(skillFile, 'utf-8')) } catch {}
      skills.push({ name: fields.name || subdir, description: fields.description || '', path: skillFile })
    }
    if (skills.length === 0) continue

    const pluginName = pluginKey.includes('@') ? pluginKey.split('@')[0] : pluginKey
    groups.push({ pluginKey, pluginName, version: version || '?', skills })
  }

  return groups
}

// ── Utilities ──────────────────────────────────────────

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const frontmatter: Record<string, any> = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      frontmatter[key] = value
    }
  }
  return frontmatter
}

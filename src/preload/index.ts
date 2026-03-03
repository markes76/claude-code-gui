import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // CLI Bridge
  cli: {
    check: () => ipcRenderer.invoke('cli:check'),
    startSession: (options: any) => ipcRenderer.invoke('cli:start-session', options),
    spawnPty: (options: any) => ipcRenderer.invoke('cli:spawn-pty', options),
    exec: (options: any) => ipcRenderer.invoke('cli:exec', options),
    slashCommand: (options: any) => ipcRenderer.invoke('cli:slash-command', options),
    listSessions: () => ipcRenderer.invoke('cli:list-sessions'),
    killSession: (id: string) => ipcRenderer.invoke('cli:kill-session', id),
    getInfo: () => ipcRenderer.invoke('cli:get-info'),
    enhancePrompt: (prompt: string) => ipcRenderer.invoke('cli:enhance-prompt', prompt),
    summarizeSession: (transcript: string) => ipcRenderer.invoke('cli:summarize-session', transcript),
    runScript: (filePath: string, cwd?: string) => ipcRenderer.invoke('cli:run-script', filePath, cwd),
  },

  // File System
  fs: {
    read: (path: string) => ipcRenderer.invoke('fs:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('fs:write', path, content),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    listDir: (path: string) => ipcRenderer.invoke('fs:list-dir', path),
    delete: (path: string) => ipcRenderer.invoke('fs:delete', path),
    pickDirectory: () => ipcRenderer.invoke('fs:pick-directory'),
    pickFile: (filters?: any) => ipcRenderer.invoke('fs:pick-file', filters),
    getClaudePaths: () => ipcRenderer.invoke('fs:get-claude-paths'),
    scanProject: (dir: string) => ipcRenderer.invoke('fs:scan-project', dir),
    scanActivity: (options: { projectDir: string; sinceMs: number; maxDepth?: number }) =>
      ipcRenderer.invoke('fs:scan-activity', options),
  },

  // Config
  config: {
    getSettings: (scope: string, projectDir?: string) =>
      ipcRenderer.invoke('config:get-settings', scope, projectDir),
    saveSettings: (scope: string, data: any, projectDir?: string) =>
      ipcRenderer.invoke('config:save-settings', scope, data, projectDir),
    listSkills: (projectDir?: string) =>
      ipcRenderer.invoke('config:list-skills', projectDir),
    saveSkill: (options: any) =>
      ipcRenderer.invoke('config:save-skill', options),
    deleteSkill: (path: string) =>
      ipcRenderer.invoke('config:delete-skill', path),
    listAgents: (projectDir?: string) =>
      ipcRenderer.invoke('config:list-agents', projectDir),
    saveAgent: (options: any) =>
      ipcRenderer.invoke('config:save-agent', options),
    listCommands: (projectDir?: string) =>
      ipcRenderer.invoke('config:list-commands', projectDir),
    saveCommand: (options: any) =>
      ipcRenderer.invoke('config:save-command', options),
    getHooks: (scope: string, projectDir?: string) =>
      ipcRenderer.invoke('config:get-hooks', scope, projectDir),
    saveHooks: (hooks: any, scope: string, projectDir?: string) =>
      ipcRenderer.invoke('config:save-hooks', hooks, scope, projectDir),
    getMcpServers: (scope: string, projectDir?: string) =>
      ipcRenderer.invoke('config:get-mcp-servers', scope, projectDir),
    saveMcpServer: (options: any) =>
      ipcRenderer.invoke('config:save-mcp-server', options),
    deleteMcpServer: (name: string, scope: string, projectDir?: string) =>
      ipcRenderer.invoke('config:delete-mcp-server', name, scope, projectDir),
  },

  // Environment Variables
  env: {
    read: (envPath?: string) => ipcRenderer.invoke('env:read', envPath),
    write: (vars: Record<string, string>, envPath?: string) => ipcRenderer.invoke('env:write', vars, envPath),
  },

  // PTY (real terminal)
  pty: {
    spawn: (options: { cwd?: string; model?: string; args?: string[]; shell?: boolean }) =>
      ipcRenderer.invoke('pty:spawn', options),
    write: (id: string, data: string) =>
      ipcRenderer.send('pty:write', { id, data }),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('pty:resize', { id, cols, rows }),
    kill: (id: string) =>
      ipcRenderer.send('pty:kill', { id }),
    listSessions: () => ipcRenderer.invoke('pty:list-sessions'),
    onData: (callback: (payload: { id: string; data: string; timestamp?: number; byteCount?: number }) => void) => {
      const handler = (_event: any, payload: { id: string; data: string; timestamp?: number; byteCount?: number }) => callback(payload)
      ipcRenderer.on('pty:data', handler)
      return () => { ipcRenderer.removeListener('pty:data', handler) }
    },
    onExit: (callback: (payload: { id: string; exitCode: number; signal: number; duration?: number }) => void) => {
      const handler = (_event: any, payload: { id: string; exitCode: number; signal: number; duration?: number }) => callback(payload)
      ipcRenderer.on('pty:exit', handler)
      return () => { ipcRenderer.removeListener('pty:exit', handler) }
    },
  },

  // Session Memories
  memory: {
    list: () => ipcRenderer.invoke('memory:list'),
    get: (id: string) => ipcRenderer.invoke('memory:get', id),
    save: (memory: { title: string; summary: string; sourceSessionId?: string; model?: string; cwd?: string }) =>
      ipcRenderer.invoke('memory:save', memory),
    update: (id: string, updates: { title?: string; summary?: string }) =>
      ipcRenderer.invoke('memory:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('memory:delete', id),
  },

  // Analytics
  analytics: {
    getStats: () => ipcRenderer.invoke('analytics:get-stats'),
    getByModel: () => ipcRenderer.invoke('analytics:get-by-model'),
    getByProject: () => ipcRenderer.invoke('analytics:get-by-project'),
    getByDate: () => ipcRenderer.invoke('analytics:get-by-date'),
    getSessions: (offset: number, limit: number) => ipcRenderer.invoke('analytics:get-sessions', offset, limit),
  },

  // Stream (live structured view of Claude runs)
  stream: {
    run: (options: { prompt: string; model?: string; cwd?: string }) =>
      ipcRenderer.invoke('stream:run', options),
    cancel: () => ipcRenderer.invoke('stream:cancel'),
    getEvents: () => ipcRenderer.invoke('stream:get-events'),
    watchSession: (options?: { cwd?: string }) => ipcRenderer.invoke('stream:watch-session', options),
    unwatchSession: () => ipcRenderer.invoke('stream:unwatch-session'),
    openPopup: (options?: { width?: number; height?: number }) =>
      ipcRenderer.invoke('stream:open-popup', options),
    onEvent: (cb: (payload: { runId: string; event: any }) => void) => {
      const handler = (_: any, payload: any) => cb(payload)
      ipcRenderer.on('stream:event', handler)
      return () => ipcRenderer.removeListener('stream:event', handler)
    },
    onDone: (cb: (payload: { runId: string; exitCode: number }) => void) => {
      const handler = (_: any, payload: any) => cb(payload)
      ipcRenderer.on('stream:done', handler)
      return () => ipcRenderer.removeListener('stream:done', handler)
    },
    onCancelled: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('stream:cancelled', handler)
      return () => ipcRenderer.removeListener('stream:cancelled', handler)
    },
  },

  // Plugins
  plugins: {
    scanSkills: () => ipcRenderer.invoke('plugins:scan-skills'),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api

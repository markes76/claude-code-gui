import React from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell, FolderOpen } from 'lucide-react'
import { StatusBadge } from '../shared/StatusBadge'
import { useAppStore } from '../../stores/app-store'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/terminal': 'Terminal',
  '/claude-md': 'CLAUDE.md Editor',
  '/settings': 'Settings',
  '/skills': 'Skills Manager',
  '/agents': 'Subagents Manager',
  '/commands': 'Commands Manager',
  '/hooks': 'Hooks Manager',
  '/mcp': 'MCP Servers',
  '/plugins': 'Plugins',
  '/permissions': 'Permissions & Security',
  '/sessions': 'Sessions',
  '/projects': 'Projects',
  '/memory': 'Memory System',
  '/rules': 'Rules Manager',
  '/api-keys': 'API Keys',
  '/docs': 'Documentation',
  '/agent-design': 'Agent Design Studio',
}

export function TopBar() {
  const location = useLocation()
  const { cliAvailable, cliInfo, currentProjectDir } = useAppStore()
  const title = pageTitles[location.pathname] || 'Claude Code GUI'

  return (
    <header className="h-12 bg-bg-secondary border-b border-border flex items-center justify-between px-4 drag-region">
      <div className="no-drag flex items-center gap-4">
        <h2 className="text-sm font-heading font-semibold text-text-primary">{title}</h2>
        {currentProjectDir && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <FolderOpen size={12} />
            <span className="truncate max-w-[200px]">{currentProjectDir}</span>
          </div>
        )}
      </div>

      <div className="no-drag flex items-center gap-3">
        <StatusBadge
          status={cliAvailable ? 'connected' : 'disconnected'}
          label={cliAvailable ? `v${cliInfo?.version || '?'}` : 'CLI Not Found'}
          pulse={cliAvailable}
        />

        <button className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
          <Search size={16} />
        </button>

        <button className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors relative">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}

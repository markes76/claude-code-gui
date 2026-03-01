import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Terminal, FileText, Settings, Zap, Bot,
  Command, Webhook, Server, Plug, Shield, History,
  FolderOpen, HelpCircle, ChevronLeft, ChevronRight,
  Sparkles, Key, Sun, Moon, Brain, BookOpen, Palette
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../stores/app-store'

interface NavGroup {
  label: string
  items: NavItemDef[]
}

interface NavItemDef {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: number
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/' },
      { id: 'terminal', label: 'Terminal', icon: <Terminal size={18} />, path: '/terminal' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { id: 'claude-md', label: 'CLAUDE.md', icon: <FileText size={18} />, path: '/claude-md' },
      { id: 'memory', label: 'Memory', icon: <Brain size={18} />, path: '/memory' },
      { id: 'rules', label: 'Rules', icon: <BookOpen size={18} />, path: '/rules' },
      { id: 'settings', label: 'Settings', icon: <Settings size={18} />, path: '/settings' },
      { id: 'api-keys', label: 'API Keys', icon: <Key size={18} />, path: '/api-keys' },
    ],
  },
  {
    label: 'Extensions',
    items: [
      { id: 'skills', label: 'Skills', icon: <Zap size={18} />, path: '/skills' },
      { id: 'agents', label: 'Subagents', icon: <Bot size={18} />, path: '/agents' },
      { id: 'agent-design', label: 'Agent Design', icon: <Palette size={18} />, path: '/agent-design' },
      { id: 'commands', label: 'Commands', icon: <Command size={18} />, path: '/commands' },
      { id: 'hooks', label: 'Hooks', icon: <Webhook size={18} />, path: '/hooks' },
      { id: 'mcp', label: 'MCP Servers', icon: <Server size={18} />, path: '/mcp' },
      { id: 'plugins', label: 'Plugins', icon: <Plug size={18} />, path: '/plugins' },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'permissions', label: 'Permissions', icon: <Shield size={18} />, path: '/permissions' },
      { id: 'sessions', label: 'Sessions', icon: <History size={18} />, path: '/sessions' },
      { id: 'projects', label: 'Projects', icon: <FolderOpen size={18} />, path: '/projects' },
    ],
  },
  {
    label: 'Help',
    items: [
      { id: 'docs', label: 'Documentation', icon: <HelpCircle size={18} />, path: '/docs' },
    ],
  },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAppStore()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className={cn(
      'flex flex-col h-full bg-bg-secondary border-r border-border transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo area — pt accounts for macOS traffic light buttons (hiddenInset) */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2 border-b border-border drag-region">
        <div className="no-drag flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-orange to-accent-coral flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-heading font-bold text-text-primary truncate">Claude Code</h1>
              <p className="text-[10px] text-text-muted">GUI Wrapper</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!sidebarCollapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                  'hover:bg-bg-tertiary',
                  isActive(item.path)
                    ? 'bg-accent-orange/10 text-accent-orange font-medium'
                    : 'text-text-secondary hover:text-text-primary',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto text-[10px] font-bold bg-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Theme + Collapse */}
      <div className="px-2 py-2 border-t border-border space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-sm"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

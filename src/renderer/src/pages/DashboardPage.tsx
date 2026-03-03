import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Bot, Server, Webhook, Activity, Terminal, FileText,
  Settings, FolderOpen, Play, RotateCcw, Trash2, Cpu,
  RefreshCw, ArrowRight, CheckCircle, AlertCircle, Info, XCircle,
  Stethoscope, Key, FolderSearch, BarChart2, Clock
} from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { StatusBadge } from '../components/shared/StatusBadge'
import { cn, formatTimestamp, formatCost, formatTokens, getApi } from '../lib/utils'

interface DiagnosticsInfo {
  version: string
  claudePath: string
  nodePath: string
  configDir: string
  hasApiKey: boolean
}

interface StatCard {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  path: string
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { cliAvailable, cliInfo, claudePaths, activities, addActivity } = useAppStore()
  const [stats, setStats] = useState({
    skills: 0,
    agents: 0,
    mcpServers: 0,
    hooks: 0,
    commands: 0,
    totalCost: 0,
    totalTokens: 0,
    sessionCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null)
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const runDiagnostics = useCallback(async () => {
    const api = getApi()
    if (!api) return
    setLoadingDiagnostics(true)
    setShowDiagnostics(true)
    try {
      const info = await api.cli.getInfo()
      setDiagnostics({
        version: info.version || 'unknown',
        claudePath: info.claudePath || info.claudeScript || 'not found',
        nodePath: info.nodePath || 'not found',
        configDir: info.configDir || '~/.claude',
        hasApiKey: !!info.hasApiKey,
      })
    } catch {
      setDiagnostics(null)
    }
    setLoadingDiagnostics(false)
  }, [])

  const loadStats = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }

    try {
      const [skills, agents, commands, userHooks, mcpServers, analyticsStats] = await Promise.all([
        api.config.listSkills().catch(() => []),
        api.config.listAgents().catch(() => []),
        api.config.listCommands().catch(() => []),
        api.config.getHooks('user').catch(() => ({})),
        api.config.getMcpServers('user').catch(() => ({})),
        api.analytics.getStats().catch(() => null),
      ])

      const hookCount = Object.values(userHooks || {}).reduce(
        (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0
      )

      setStats({
        skills: skills?.length || 0,
        agents: agents?.length || 0,
        mcpServers: Object.keys(mcpServers || {}).length,
        hooks: hookCount,
        commands: commands?.length || 0,
        totalCost: analyticsStats?.totalCost || 0,
        totalTokens: (analyticsStats?.totalInputTokens || 0) + (analyticsStats?.totalOutputTokens || 0),
        sessionCount: analyticsStats?.sessionCount || 0,
      })
    } catch (e) {
      // stats stay at 0
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const statCards: StatCard[] = [
    { label: 'Skills', value: stats.skills, icon: <Zap size={20} />, color: 'text-accent-orange', path: '/skills' },
    { label: 'Subagents', value: stats.agents, icon: <Bot size={20} />, color: 'text-accent-purple', path: '/agents' },
    { label: 'MCP Servers', value: stats.mcpServers, icon: <Server size={20} />, color: 'text-accent-blue', path: '/mcp' },
    { label: 'Hooks', value: stats.hooks, icon: <Webhook size={20} />, color: 'text-accent-cyan', path: '/hooks' },
    { label: 'Commands', value: stats.commands, icon: <Terminal size={20} />, color: 'text-accent-green', path: '/commands' },
    { label: 'Total Cost', value: loading ? '...' : formatCost(stats.totalCost), icon: <BarChart2 size={20} />, color: 'text-accent-yellow', path: '/analytics' },
    { label: 'Total Tokens', value: loading ? '...' : formatTokens(stats.totalTokens), icon: <Activity size={20} />, color: 'text-accent-cyan', path: '/analytics' },
    { label: 'Sessions', value: stats.sessionCount, icon: <Clock size={20} />, color: 'text-accent-green', path: '/analytics' },
  ]

  const quickActions = [
    { label: 'Open Terminal', icon: <Terminal size={18} />, path: '/terminal', desc: 'Start a Claude Code session' },
    { label: 'Edit CLAUDE.md', icon: <FileText size={18} />, path: '/claude-md', desc: 'Configure project context' },
    { label: 'Manage Settings', icon: <Settings size={18} />, path: '/settings', desc: 'Adjust preferences' },
    { label: 'Add Skill', icon: <Zap size={18} />, path: '/skills', desc: 'Create a new skill' },
    { label: 'Add MCP Server', icon: <Server size={18} />, path: '/mcp', desc: 'Connect a new server' },
    { label: 'Manage Hooks', icon: <Webhook size={18} />, path: '/hooks', desc: 'Configure event hooks' },
  ]

  const activityIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} className="text-accent-green" />
      case 'error': return <XCircle size={14} className="text-accent-red" />
      case 'warning': return <AlertCircle size={14} className="text-accent-yellow" />
      default: return <Info size={14} className="text-accent-blue" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* System Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              cliAvailable ? 'bg-accent-green/10' : 'bg-accent-red/10'
            )}>
              <Cpu size={20} className={cliAvailable ? 'text-accent-green' : 'text-accent-red'} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-semibold">System Status</h3>
              <p className="text-xs text-text-secondary">
                {cliAvailable
                  ? `Claude Code ${cliInfo?.version || ''} connected`
                  : 'Claude Code CLI not found. Please install it first.'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={cliAvailable ? 'connected' : 'error'}
              label={cliAvailable ? 'Connected' : 'Not Found'}
              pulse={cliAvailable}
            />
            <button
              onClick={runDiagnostics}
              disabled={loadingDiagnostics}
              className="btn-ghost text-xs gap-1"
              title="Run diagnostics to check CLI installation, paths, and API key"
            >
              {loadingDiagnostics ? <RefreshCw size={14} className="animate-spin" /> : <Stethoscope size={14} />}
              {!loadingDiagnostics && 'Diagnose'}
            </button>
            <button onClick={loadStats} className="btn-ghost">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Diagnostics panel */}
        {showDiagnostics && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-secondary">Diagnostics</span>
              <button onClick={() => setShowDiagnostics(false)} className="text-text-muted hover:text-text-primary text-xs">
                <XCircle size={14} />
              </button>
            </div>
            {loadingDiagnostics ? (
              <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                <RefreshCw size={12} className="animate-spin" />
                Running diagnostics...
              </div>
            ) : diagnostics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 py-1.5">
                  <CheckCircle size={13} className="text-accent-green flex-shrink-0" />
                  <span className="text-text-muted">Version:</span>
                  <span className="text-text-primary font-mono">{diagnostics.version}</span>
                </div>
                <div className="flex items-center gap-2 py-1.5">
                  <Key size={13} className={cn('flex-shrink-0', diagnostics.hasApiKey ? 'text-accent-green' : 'text-accent-yellow')} />
                  <span className="text-text-muted">API Key:</span>
                  <span className={cn('font-medium', diagnostics.hasApiKey ? 'text-accent-green' : 'text-accent-yellow')}>
                    {diagnostics.hasApiKey ? 'Set' : 'Not set (using claude login)'}
                  </span>
                </div>
                <div className="flex items-start gap-2 py-1.5 col-span-full md:col-span-1">
                  <FolderSearch size={13} className="text-accent-blue flex-shrink-0 mt-0.5" />
                  <span className="text-text-muted flex-shrink-0">CLI path:</span>
                  <span className="text-text-primary font-mono break-all">{diagnostics.claudePath}</span>
                </div>
                <div className="flex items-start gap-2 py-1.5 col-span-full md:col-span-1">
                  <FolderSearch size={13} className="text-accent-purple flex-shrink-0 mt-0.5" />
                  <span className="text-text-muted flex-shrink-0">Config dir:</span>
                  <span className="text-text-primary font-mono break-all">{diagnostics.configDir}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-accent-red">Failed to retrieve diagnostics. Is the CLI installed?</p>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.path)}
            className="card-hover text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={cn('opacity-70 group-hover:opacity-100 transition-opacity', card.color)}>
                {card.icon}
              </span>
              <ArrowRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-heading font-bold text-text-primary">
              {loading ? '...' : card.value}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">{card.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h3 className="section-title">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="card-hover text-left group"
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center mb-3',
                  'text-text-muted group-hover:text-accent-orange group-hover:bg-accent-orange/10 transition-all'
                )}>
                  {action.icon}
                </div>
                <div className="text-sm font-medium text-text-primary">{action.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="section-title">Recent Activity</h3>
          <div className="card space-y-1 max-h-[300px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No recent activity
              </div>
            ) : (
              activities.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-start gap-2 py-2 px-1">
                  <span className="mt-0.5 flex-shrink-0">{activityIcon(item.status)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary truncate">{item.message}</p>
                    <p className="text-[10px] text-text-muted">{formatTimestamp(item.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

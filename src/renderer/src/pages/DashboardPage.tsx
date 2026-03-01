import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Bot, Server, Webhook, Terminal, FileText,
  Settings, Cpu, RefreshCw, ArrowRight, CheckCircle,
  AlertCircle, Info, XCircle, Stethoscope, Key, FolderSearch,
  Shield, Radio, Crosshair, Palette
} from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { StatusBadge } from '../components/shared/StatusBadge'
import { cn, formatTimestamp, getApi } from '../lib/utils'

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
  bgColor: string
  path: string
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { cliAvailable, cliInfo, activities, addActivity } = useAppStore()
  const [stats, setStats] = useState({
    skills: 0,
    agents: 0,
    mcpServers: 0,
    hooks: 0,
    commands: 0,
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
      const [skills, agents, commands, userHooks, mcpServers] = await Promise.all([
        api.config.listSkills().catch(() => []),
        api.config.listAgents().catch(() => []),
        api.config.listCommands().catch(() => []),
        api.config.getHooks('user').catch(() => ({})),
        api.config.getMcpServers('user').catch(() => ({})),
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
      })
    } catch {
      // stats stay at 0
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const statCards: StatCard[] = [
    { label: 'ABILITIES', value: stats.skills, icon: <Zap size={18} />, color: 'text-accent-orange', bgColor: 'bg-accent-orange/10', path: '/skills' },
    { label: 'UNITS', value: stats.agents, icon: <Bot size={18} />, color: 'text-accent-purple', bgColor: 'bg-accent-purple/10', path: '/agents' },
    { label: 'UPLINKS', value: stats.mcpServers, icon: <Server size={18} />, color: 'text-accent-blue', bgColor: 'bg-accent-blue/10', path: '/mcp' },
    { label: 'RELAYS', value: stats.hooks, icon: <Webhook size={18} />, color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/10', path: '/hooks' },
    { label: 'DIRECTIVES', value: stats.commands, icon: <Terminal size={18} />, color: 'text-accent-green', bgColor: 'bg-accent-green/10', path: '/commands' },
  ]

  const deployActions = [
    { label: 'Launch Terminal', icon: <Crosshair size={16} />, path: '/terminal', desc: 'Deploy Claude Code session', accent: 'accent-orange' },
    { label: 'Mission Brief', icon: <FileText size={16} />, path: '/claude-md', desc: 'Edit CLAUDE.md context', accent: 'accent-blue' },
    { label: 'Agent Design', icon: <Palette size={16} />, path: '/agent-design', desc: 'Customize agent avatars', accent: 'accent-purple' },
    { label: 'Deploy Ability', icon: <Zap size={16} />, path: '/skills', desc: 'Create a new skill', accent: 'accent-orange' },
    { label: 'Add Uplink', icon: <Server size={16} />, path: '/mcp', desc: 'Connect MCP server', accent: 'accent-cyan' },
    { label: 'Configure', icon: <Settings size={16} />, path: '/settings', desc: 'System preferences', accent: 'accent-green' },
  ]

  const activityIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={12} className="text-accent-green" />
      case 'error': return <XCircle size={12} className="text-accent-red" />
      case 'warning': return <AlertCircle size={12} className="text-accent-yellow" />
      default: return <Info size={12} className="text-accent-blue" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Mission Briefing Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-text-muted uppercase">
            Mission Briefing
          </div>
          <div className="h-px flex-1 bg-border min-w-[40px]" />
        </div>
        <button onClick={loadStats} className="btn-ghost text-xs">
          <RefreshCw size={12} /> Refresh Intel
        </button>
      </div>

      {/* Base Status */}
      <div className="hud-panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center border',
              cliAvailable
                ? 'bg-accent-green/10 border-accent-green/20'
                : 'bg-accent-red/10 border-accent-red/20'
            )}>
              <Radio size={20} className={cn(
                cliAvailable ? 'text-accent-green' : 'text-accent-red',
                cliAvailable && 'animate-pulse'
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-text-muted">BASE STATUS</span>
                <StatusBadge
                  status={cliAvailable ? 'connected' : 'error'}
                  label={cliAvailable ? 'ONLINE' : 'OFFLINE'}
                  pulse={cliAvailable}
                />
              </div>
              <p className="text-sm font-medium text-text-primary mt-1">
                {cliAvailable
                  ? `Claude Code v${cliInfo?.version || '?'} — All systems operational`
                  : 'Claude Code CLI not detected. Install to begin operations.'
                }
              </p>
            </div>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loadingDiagnostics}
            className="btn-ghost text-xs"
          >
            {loadingDiagnostics ? <RefreshCw size={14} className="animate-spin" /> : <Stethoscope size={14} />}
            Diagnose
          </button>
        </div>

        {/* Diagnostics panel */}
        {showDiagnostics && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono tracking-wider text-text-muted">SYSTEM DIAGNOSTICS</span>
              <button onClick={() => setShowDiagnostics(false)} className="text-text-muted hover:text-text-primary">
                <XCircle size={14} />
              </button>
            </div>
            {loadingDiagnostics ? (
              <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                <RefreshCw size={12} className="animate-spin" />
                Scanning systems...
              </div>
            ) : diagnostics ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 py-1.5">
                  <CheckCircle size={12} className="text-accent-green" />
                  <span className="text-text-muted font-mono">VER:</span>
                  <span className="text-text-primary font-mono">{diagnostics.version}</span>
                </div>
                <div className="flex items-center gap-2 py-1.5">
                  <Key size={12} className={diagnostics.hasApiKey ? 'text-accent-green' : 'text-accent-yellow'} />
                  <span className="text-text-muted font-mono">KEY:</span>
                  <span className={cn('font-mono', diagnostics.hasApiKey ? 'text-accent-green' : 'text-accent-yellow')}>
                    {diagnostics.hasApiKey ? 'ACTIVE' : 'NOT SET'}
                  </span>
                </div>
                <div className="flex items-start gap-2 py-1.5">
                  <FolderSearch size={12} className="text-accent-blue mt-0.5" />
                  <span className="text-text-muted font-mono">PATH:</span>
                  <span className="text-text-primary font-mono text-[11px] break-all">{diagnostics.claudePath}</span>
                </div>
                <div className="flex items-start gap-2 py-1.5">
                  <FolderSearch size={12} className="text-accent-purple mt-0.5" />
                  <span className="text-text-muted font-mono">CONF:</span>
                  <span className="text-text-primary font-mono text-[11px] break-all">{diagnostics.configDir}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-accent-red font-mono">DIAGNOSTICS FAILED — CLI unreachable</p>
            )}
          </div>
        )}
      </div>

      {/* Tactical Readouts */}
      <div>
        <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-muted mb-3">TACTICAL READOUT</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <button
              key={card.label}
              onClick={() => navigate(card.path)}
              className="hud-panel p-4 text-left group hover:border-border transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', card.bgColor)}>
                  <span className={card.color}>{card.icon}</span>
                </div>
                <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-heading font-bold text-text-primary tabular-nums">
                {loading ? '—' : card.value}
              </div>
              <div className="text-[10px] font-mono tracking-wider text-text-muted mt-1">{card.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deploy Actions */}
        <div className="lg:col-span-2">
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-muted mb-3">DEPLOY</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {deployActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="hud-panel p-4 text-left group hover:border-border transition-all"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
                  'bg-bg-tertiary text-text-muted',
                  `group-hover:bg-${action.accent}/10 group-hover:text-${action.accent}`,
                  'transition-all'
                )}>
                  {action.icon}
                </div>
                <div className="text-sm font-medium text-text-primary">{action.label}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Comms Log */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-muted mb-3">COMMS LOG</div>
          <div className="hud-panel p-3 space-y-0.5 max-h-[320px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-text-muted text-[10px] font-mono tracking-wider">NO TRANSMISSIONS</div>
                <p className="text-xs text-text-muted mt-1">Activity will appear here</p>
              </div>
            ) : (
              activities.slice(0, 20).map((item) => (
                <div key={item.id} className="flex items-start gap-2 py-1.5 px-1 rounded hover:bg-bg-tertiary/50 transition-colors">
                  <span className="mt-0.5 flex-shrink-0">{activityIcon(item.status)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-text-primary truncate">{item.message}</p>
                    <p className="text-[9px] text-text-muted font-mono">{formatTimestamp(item.timestamp)}</p>
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

import React, { useEffect, useState, useCallback } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import {
  BarChart2, RefreshCw, DollarSign, Zap, History, TrendingUp,
  ChevronLeft, ChevronRight, FolderOpen, Bot, Calendar, Tag
} from 'lucide-react'
import { cn, formatCost, formatTokens, formatTimestamp, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { getPricingConfig, applyDiscount, getDiscountPct, type PricingConfig } from '../lib/pricing'

// ── Types (mirror analytics-handlers.ts exports) ─────────────────────────────

interface OverallStats {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheTokens: number
  sessionCount: number
  modelBreakdown: { model: string; cost: number; sessions: number }[]
}

interface ModelStat {
  model: string
  sessions: number
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  cost: number
}

interface ProjectStat {
  cwd: string
  name: string
  sessions: number
  cost: number
  inputTokens: number
  outputTokens: number
  lastUsed: string
}

interface DayStat {
  date: string
  cost: number
  inputTokens: number
  outputTokens: number
  sessions: number
}

interface SessionStat {
  sessionId: string
  model: string
  cwd: string
  name: string
  timestamp: string
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  cost: number
}

// ── Shared stat card ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className={cn('opacity-70', color)}>{icon}</span>
      </div>
      <div className="text-2xl font-heading font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary mt-0.5">{label}</div>
    </div>
  )
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, pricing }: { stats: OverallStats | null; pricing: PricingConfig }) {
  if (!stats) return <EmptyState message="No usage data found yet. Run some Claude sessions to see analytics." />
  const discountPct = getDiscountPct(pricing)
  const effectiveCost = applyDiscount(stats.totalCost, pricing)
  const avgCost = stats.sessionCount > 0 ? effectiveCost / stats.sessionCount : 0
  const savings = stats.totalCost - effectiveCost

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="opacity-70 text-accent-yellow"><DollarSign size={20} /></span>
            {discountPct > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green font-medium">
                -{discountPct}%
              </span>
            )}
          </div>
          <div className="text-2xl font-heading font-bold text-text-primary">{formatCost(effectiveCost)}</div>
          <div className="text-xs text-text-secondary mt-0.5">
            Total Cost
            {discountPct > 0 && <span className="text-text-muted ml-1">(list: {formatCost(stats.totalCost)})</span>}
          </div>
        </div>
        <StatCard label="Total Tokens" value={formatTokens(stats.totalInputTokens + stats.totalOutputTokens)} icon={<Zap size={20} />} color="text-accent-cyan" />
        <StatCard label="Sessions" value={`${stats.sessionCount}`} icon={<History size={20} />} color="text-accent-green" />
        <StatCard label="Avg Cost / Session" value={formatCost(avgCost)} icon={<TrendingUp size={20} />} color="text-accent-purple" />
      </div>

      {discountPct > 0 && savings > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green/5 border border-accent-green/20 text-sm">
          <Tag size={14} className="text-accent-green flex-shrink-0" />
          <span className="text-accent-green font-medium">You save {formatCost(savings)}</span>
          <span className="text-text-muted text-xs">with your {discountPct}% volume discount applied to all costs below</span>
        </div>
      )}

      {stats.modelBreakdown.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-3">Top Models</h3>
          <div className="space-y-2">
            {stats.modelBreakdown.slice(0, 5).map((m) => (
              <div key={m.model} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-text-muted" />
                  <span className="text-sm font-mono text-text-primary">{m.model}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>{m.sessions} sessions</span>
                  <span className="text-accent-yellow font-medium">{formatCost(applyDiscount(m.cost, pricing))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Models tab ────────────────────────────────────────────────────────────────

function ModelsTab({ models, pricing }: { models: ModelStat[]; pricing: PricingConfig }) {
  if (models.length === 0) return <EmptyState message="No model usage data yet." />
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted border-b border-border">
            <th className="pb-3 pr-4 font-medium">Model</th>
            <th className="pb-3 pr-4 font-medium text-right">Sessions</th>
            <th className="pb-3 pr-4 font-medium text-right">Input</th>
            <th className="pb-3 pr-4 font-medium text-right">Output</th>
            <th className="pb-3 pr-4 font-medium text-right">Cache</th>
            <th className="pb-3 font-medium text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.model} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-mono text-text-primary text-xs">{m.model}</td>
              <td className="py-3 pr-4 text-right text-text-secondary">{m.sessions}</td>
              <td className="py-3 pr-4 text-right text-text-secondary">{formatTokens(m.inputTokens)}</td>
              <td className="py-3 pr-4 text-right text-text-secondary">{formatTokens(m.outputTokens)}</td>
              <td className="py-3 pr-4 text-right text-text-secondary">{formatTokens(m.cacheTokens)}</td>
              <td className="py-3 text-right text-accent-yellow font-medium">{formatCost(applyDiscount(m.cost, pricing))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Projects tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ projects, pricing }: { projects: ProjectStat[]; pricing: PricingConfig }) {
  if (projects.length === 0) return <EmptyState message="No project usage data yet." />
  return (
    <div className="space-y-2">
      {projects.map((p) => (
        <div key={p.cwd} className="card flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={16} className="text-accent-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
            <p className="text-xs text-text-muted font-mono truncate">{p.cwd}</p>
          </div>
          <div className="text-right flex-shrink-0 space-y-0.5">
            <p className="text-sm font-medium text-accent-yellow">{formatCost(applyDiscount(p.cost, pricing))}</p>
            <p className="text-xs text-text-muted">{p.sessions} sessions · {formatTokens(p.inputTokens + p.outputTokens)} tok</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Sessions tab ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

function SessionsTab({ pricing }: { pricing: PricingConfig }) {
  const [sessions, setSessions] = useState<SessionStat[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: number) => {
    const api = getApi()
    if (!api) return
    setLoading(true)
    try {
      const result = await api.analytics.getSessions(p * PAGE_SIZE, PAGE_SIZE)
      setSessions(result.sessions || [])
      setTotal(result.total || 0)
    } catch { setSessions([]); setTotal(0) }
    setLoading(false)
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading) return <LoadingState />
  if (sessions.length === 0) return <EmptyState message="No session data yet." />

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.sessionId} className="card flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-accent-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{s.name || s.sessionId.slice(0, 8)}</p>
              <p className="text-xs text-text-muted font-mono truncate">{s.model} · {formatTimestamp(new Date(s.timestamp).getTime())}</p>
            </div>
            <div className="text-right flex-shrink-0 space-y-0.5">
              <p className="text-sm font-medium text-accent-yellow">{formatCost(applyDiscount(s.cost, pricing))}</p>
              <p className="text-xs text-text-muted">{formatTokens(s.inputTokens + s.outputTokens)} tokens</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-text-muted">{total} sessions total</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="btn-ghost disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-text-muted">{page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="btn-ghost disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Timeline tab ──────────────────────────────────────────────────────────────

function TimelineTab({ days, pricing }: { days: DayStat[]; pricing: PricingConfig }) {
  if (days.length === 0) return <EmptyState message="No timeline data for the last 30 days." />

  const maxCost = Math.max(...days.map(d => applyDiscount(d.cost, pricing)), 0.001)

  // Fill in all 30 days (including zero-cost days)
  const allDays: DayStat[] = []
  const dayMap = new Map(days.map(d => [d.date, d]))
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    allDays.push(dayMap.get(key) || { date: key, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 })
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-text-muted" />
        <span className="text-xs text-text-muted">Daily cost — last 30 days</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-0.5 h-40 w-full">
        {allDays.map((d) => {
          const discountedCost = applyDiscount(d.cost, pricing)
          const pct = maxCost > 0 ? Math.max((discountedCost / maxCost) * 100, d.cost > 0 ? 4 : 0) : 0
          const label = d.date.slice(5) // MM-DD
          return (
            <div
              key={d.date}
              className="group relative flex-1 flex flex-col items-center justify-end h-full"
              title={`${d.date}: ${formatCost(discountedCost)} · ${formatTokens(d.inputTokens + d.outputTokens)} tokens · ${d.sessions} sessions`}
            >
              <div
                className={cn(
                  'w-full rounded-sm transition-all',
                  d.cost > 0 ? 'bg-accent-orange group-hover:bg-accent-orange/80' : 'bg-bg-tertiary'
                )}
                style={{ height: `${pct}%`, minHeight: d.cost > 0 ? '4px' : '2px' }}
              />
              {/* Show date label every 5 bars */}
              {allDays.indexOf(d) % 5 === 0 && (
                <span className="absolute -bottom-5 text-[9px] text-text-muted whitespace-nowrap">{label}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Daily list (most expensive) */}
      <div className="pt-6 space-y-1 border-t border-border">
        <p className="text-xs text-text-muted mb-2">Highest cost days</p>
        {[...days].sort((a, b) => b.cost - a.cost).slice(0, 5).map((d) => (
          <div key={d.date} className="flex items-center justify-between py-1.5">
            <span className="text-xs font-mono text-text-secondary">{d.date}</span>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>{d.sessions} sessions</span>
              <span>{formatTokens(d.inputTokens + d.outputTokens)} tokens</span>
              <span className="text-accent-yellow font-medium w-16 text-right">{formatCost(applyDiscount(d.cost, pricing))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <BarChart2 size={32} className="text-text-muted mb-3 opacity-40" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="card flex items-center justify-center py-16">
      <RefreshCw size={20} className="animate-spin text-text-muted" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { analyticsRefreshKey, refreshAnalytics } = useAppStore()
  const [stats, setStats]       = useState<OverallStats | null>(null)
  const [models, setModels]     = useState<ModelStat[]>([])
  const [projects, setProjects] = useState<ProjectStat[]>([])
  const [days, setDays]         = useState<DayStat[]>([])
  const [loading, setLoading]   = useState(true)
  const [pricing, setPricing]   = useState(() => getPricingConfig())

  const loadAll = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    setLoading(true)
    try {
      const [s, m, p, d] = await Promise.all([
        api.analytics.getStats().catch(() => null),
        api.analytics.getByModel().catch(() => []),
        api.analytics.getByProject().catch(() => []),
        api.analytics.getByDate().catch(() => []),
      ])
      setStats(s)
      setModels(m || [])
      setProjects(p || [])
      setDays(d || [])
    } catch { /* leave empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll, analyticsRefreshKey])

  // Re-read pricing whenever user changes it in Settings
  useEffect(() => {
    const handler = () => setPricing(getPricingConfig())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-yellow/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-accent-yellow" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-text-primary">Analytics</h1>
            <p className="text-xs text-text-muted">Token usage & cost from your Claude sessions</p>
          </div>
        </div>
        <button
          onClick={refreshAnalytics}
          disabled={loading}
          className="btn-ghost gap-2 text-xs"
          title="Refresh analytics data"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <Tabs.Root defaultValue="overview" className="space-y-4">
          <Tabs.List className="flex gap-1 bg-bg-secondary rounded-xl p-1 border border-border w-fit">
            {(['overview', 'models', 'projects', 'sessions', 'timeline'] as const).map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className={cn(
                  'px-4 py-2 text-xs font-medium rounded-lg capitalize transition-all',
                  'text-text-muted hover:text-text-primary',
                  'data-[state=active]:bg-bg-primary data-[state=active]:text-text-primary data-[state=active]:shadow-sm'
                )}
              >
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="overview">
            <OverviewTab stats={stats} pricing={pricing} />
          </Tabs.Content>
          <Tabs.Content value="models">
            <ModelsTab models={models} pricing={pricing} />
          </Tabs.Content>
          <Tabs.Content value="projects">
            <ProjectsTab projects={projects} pricing={pricing} />
          </Tabs.Content>
          <Tabs.Content value="sessions">
            <SessionsTab pricing={pricing} />
          </Tabs.Content>
          <Tabs.Content value="timeline">
            <TimelineTab days={days} pricing={pricing} />
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  )
}

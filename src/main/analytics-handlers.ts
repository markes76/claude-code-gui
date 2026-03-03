import { IpcMain } from 'electron'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// Pricing per 1M tokens (USD) — matched by checking if model string contains key
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  opus:   { input: 15,    output: 75,    cacheWrite: 18.75, cacheRead: 1.50 },
  sonnet: { input: 3,     output: 15,    cacheWrite: 3.75,  cacheRead: 0.30 },
  haiku:  { input: 0.25,  output: 1.25,  cacheWrite: 0.30,  cacheRead: 0.03 },
}

interface UsageEntry {
  uuid: string
  sessionId: string
  model: string
  timestamp: string
  cwd: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  cost: number
}

function getPricingForModel(model: string): typeof PRICING[string] {
  const lower = model.toLowerCase()
  if (lower.includes('opus'))   return PRICING.opus
  if (lower.includes('haiku'))  return PRICING.haiku
  return PRICING.sonnet // default — covers sonnet + unknown
}

function calcCost(entry: UsageEntry): number {
  const p = getPricingForModel(entry.model)
  return (
    (entry.inputTokens        * p.input      +
     entry.outputTokens       * p.output     +
     entry.cacheCreationTokens * p.cacheWrite +
     entry.cacheReadTokens    * p.cacheRead)
    / 1_000_000
  )
}

/** Recursively collect all .jsonl files under a directory. */
function collectJsonlFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...collectJsonlFiles(full))
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(full)
      }
    }
  } catch { /* permission error — skip */ }
  return results
}

/** Parse all Claude Code JSONL session logs and return usage entries. */
function parseUsageLogs(): UsageEntry[] {
  const projectsDir = join(homedir(), '.claude', 'projects')
  const files = collectJsonlFiles(projectsDir)

  const seen = new Set<string>()
  const entries: UsageEntry[] = []

  for (const file of files) {
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch { continue }

    for (const line of content.split('\n')) {
      if (!line.trim()) continue
      let record: any
      try { record = JSON.parse(line) } catch { continue }

      // Only assistant messages with real token data
      if (record.type !== 'assistant') continue
      if (!record.uuid || seen.has(record.uuid)) continue
      const msg = record.message
      if (!msg?.usage) continue
      const model: string = msg.model || ''
      if (!model || model === '<synthetic>') continue
      const usage = msg.usage
      const outputTokens: number = usage.output_tokens ?? 0
      if (outputTokens === 0) continue

      seen.add(record.uuid)
      const entry: UsageEntry = {
        uuid: record.uuid,
        sessionId: record.sessionId || '',
        model,
        timestamp: record.timestamp || new Date().toISOString(),
        cwd: record.cwd || '',
        inputTokens: usage.input_tokens ?? 0,
        outputTokens,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cost: 0,
      }
      entry.cost = calcCost(entry)
      entries.push(entry)
    }
  }

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

// ── Aggregation helpers ────────────────────────────────────────────────────────

export interface OverallStats {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheTokens: number
  sessionCount: number
  modelBreakdown: { model: string; cost: number; sessions: number }[]
}

export interface ModelStat {
  model: string
  sessions: number
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  cost: number
}

export interface ProjectStat {
  cwd: string
  name: string
  sessions: number
  cost: number
  inputTokens: number
  outputTokens: number
  lastUsed: string
}

export interface DayStat {
  date: string  // YYYY-MM-DD
  cost: number
  inputTokens: number
  outputTokens: number
  sessions: number
}

export interface SessionStat {
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

function aggregateStats(entries: UsageEntry[]): OverallStats {
  const sessionSet = new Set<string>()
  const modelMap = new Map<string, { cost: number; sessions: Set<string> }>()

  let totalCost = 0, totalInput = 0, totalOutput = 0, totalCache = 0

  for (const e of entries) {
    totalCost   += e.cost
    totalInput  += e.inputTokens
    totalOutput += e.outputTokens
    totalCache  += e.cacheCreationTokens + e.cacheReadTokens
    sessionSet.add(e.sessionId)

    const key = e.model
    if (!modelMap.has(key)) modelMap.set(key, { cost: 0, sessions: new Set() })
    const m = modelMap.get(key)!
    m.cost += e.cost
    m.sessions.add(e.sessionId)
  }

  const modelBreakdown = Array.from(modelMap.entries())
    .map(([model, v]) => ({ model, cost: v.cost, sessions: v.sessions.size }))
    .sort((a, b) => b.cost - a.cost)

  return {
    totalCost,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCacheTokens: totalCache,
    sessionCount: sessionSet.size,
    modelBreakdown,
  }
}

function aggregateByModel(entries: UsageEntry[]): ModelStat[] {
  const map = new Map<string, ModelStat>()
  const sessionsByModel = new Map<string, Set<string>>()

  for (const e of entries) {
    if (!map.has(e.model)) {
      map.set(e.model, { model: e.model, sessions: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0, cost: 0 })
      sessionsByModel.set(e.model, new Set())
    }
    const m = map.get(e.model)!
    m.inputTokens  += e.inputTokens
    m.outputTokens += e.outputTokens
    m.cacheTokens  += e.cacheCreationTokens + e.cacheReadTokens
    m.cost         += e.cost
    sessionsByModel.get(e.model)!.add(e.sessionId)
  }

  for (const [model, sessions] of sessionsByModel) {
    map.get(model)!.sessions = sessions.size
  }

  return Array.from(map.values()).sort((a, b) => b.cost - a.cost)
}

function aggregateByProject(entries: UsageEntry[]): ProjectStat[] {
  const map = new Map<string, ProjectStat>()
  const sessionsByCwd = new Map<string, Set<string>>()

  for (const e of entries) {
    const cwd = e.cwd || 'unknown'
    const name = cwd.split('/').pop() || cwd
    if (!map.has(cwd)) {
      map.set(cwd, { cwd, name, sessions: 0, cost: 0, inputTokens: 0, outputTokens: 0, lastUsed: e.timestamp })
      sessionsByCwd.set(cwd, new Set())
    }
    const p = map.get(cwd)!
    p.cost         += e.cost
    p.inputTokens  += e.inputTokens
    p.outputTokens += e.outputTokens
    if (e.timestamp > p.lastUsed) p.lastUsed = e.timestamp
    sessionsByCwd.get(cwd)!.add(e.sessionId)
  }

  for (const [cwd, sessions] of sessionsByCwd) {
    map.get(cwd)!.sessions = sessions.size
  }

  return Array.from(map.values()).sort((a, b) => b.cost - a.cost)
}

function aggregateByDate(entries: UsageEntry[]): DayStat[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 29)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const map = new Map<string, DayStat>()
  const sessionsByDate = new Map<string, Set<string>>()

  for (const e of entries) {
    const date = e.timestamp.slice(0, 10)
    if (date < cutoffStr) continue

    if (!map.has(date)) {
      map.set(date, { date, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 })
      sessionsByDate.set(date, new Set())
    }
    const d = map.get(date)!
    d.cost         += e.cost
    d.inputTokens  += e.inputTokens
    d.outputTokens += e.outputTokens
    sessionsByDate.get(date)!.add(e.sessionId)
  }

  for (const [date, sessions] of sessionsByDate) {
    map.get(date)!.sessions = sessions.size
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateBySessions(entries: UsageEntry[]): SessionStat[] {
  const map = new Map<string, SessionStat>()

  for (const e of entries) {
    const sid = e.sessionId || e.uuid
    if (!map.has(sid)) {
      map.set(sid, {
        sessionId: sid,
        model: e.model,
        cwd: e.cwd,
        name: e.cwd.split('/').pop() || e.cwd,
        timestamp: e.timestamp,
        inputTokens: 0,
        outputTokens: 0,
        cacheTokens: 0,
        cost: 0,
      })
    }
    const s = map.get(sid)!
    s.inputTokens  += e.inputTokens
    s.outputTokens += e.outputTokens
    s.cacheTokens  += e.cacheCreationTokens + e.cacheReadTokens
    s.cost         += e.cost
    if (e.timestamp > s.timestamp) s.timestamp = e.timestamp
  }

  return Array.from(map.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

// ── IPC registration ───────────────────────────────────────────────────────────

export function registerAnalyticsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('analytics:get-stats', () => {
    try {
      return aggregateStats(parseUsageLogs())
    } catch { return null }
  })

  ipcMain.handle('analytics:get-by-model', () => {
    try {
      return aggregateByModel(parseUsageLogs())
    } catch { return [] }
  })

  ipcMain.handle('analytics:get-by-project', () => {
    try {
      return aggregateByProject(parseUsageLogs())
    } catch { return [] }
  })

  ipcMain.handle('analytics:get-by-date', () => {
    try {
      return aggregateByDate(parseUsageLogs())
    } catch { return [] }
  })

  ipcMain.handle('analytics:get-sessions', (_event, offset: number = 0, limit: number = 10) => {
    try {
      const all = aggregateBySessions(parseUsageLogs())
      return { total: all.length, sessions: all.slice(offset, offset + limit) }
    } catch { return { total: 0, sessions: [] } }
  })
}

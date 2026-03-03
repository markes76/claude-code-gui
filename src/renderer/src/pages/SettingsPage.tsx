import React, { useEffect, useState, useCallback } from 'react'
import { Save, RotateCcw, Code, Sliders, AlertTriangle, Plus, X, Shield, DollarSign, RefreshCw, Check } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { useEditorStore } from '../stores/editor-store'
import { CodeEditor } from '../components/shared/CodeEditor'
import type { SettingsData } from '../types/config'
import {
  getPricingConfig, savePricingConfig, fetchLatestPricing,
  DEFAULT_MODELS, DISCOUNT_TIERS, type PricingConfig, type DiscountTier, type ModelPrice
} from '../lib/pricing'

const SCOPES = [
  { id: 'user',    label: 'User',    desc: '~/.claude/settings.json' },
  { id: 'project', label: 'Project', desc: '.claude/settings.json' },
  { id: 'local',   label: 'Local',   desc: '.claude/settings.local.json' },
  { id: 'pricing', label: 'Pricing', desc: 'API pricing & discounts' },
] as const

const MODELS = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
]

const COMMON_TOOLS = [
  'Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep',
  'WebFetch', 'WebSearch', 'Task', 'NotebookEdit',
  'mcp__*'
]

// ── Pricing Tab ───────────────────────────────────────────────────────────────

function PricingTab() {
  const [config, setConfig] = useState<PricingConfig>(getPricingConfig)
  const [fetching, setFetching] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const save = (updated: PricingConfig) => {
    setConfig(updated)
    savePricingConfig(updated)
  }

  const handlePull = async () => {
    setFetching(true)
    setFetchStatus('idle')
    try {
      const prices = await fetchLatestPricing()
      if (prices && Object.keys(prices).length > 0) {
        const updated: PricingConfig = {
          ...config,
          models: { ...config.models, ...prices } as Record<string, ModelPrice>,
          lastFetched: new Date().toISOString(),
        }
        save(updated)
        setFetchStatus('ok')
      } else {
        setFetchStatus('error')
      }
    } catch {
      setFetchStatus('error')
    }
    setFetching(false)
    setTimeout(() => setFetchStatus('idle'), 3000)
  }

  const setDiscount = (tier: DiscountTier) => save({ ...config, discountTier: tier })
  const setCustomPct = (pct: number) => save({ ...config, customDiscountPct: pct })
  const setModelPrice = (model: string, field: 'input' | 'output', val: number) => {
    save({ ...config, models: { ...config.models, [model]: { ...config.models[model], [field]: val } } })
  }
  const resetPrices = () => save({ ...config, models: { ...DEFAULT_MODELS }, lastFetched: null })

  const effectivePct = config.discountTier === 'custom'
    ? config.customDiscountPct
    : DISCOUNT_TIERS[config.discountTier].pct

  return (
    <div className="max-w-2xl space-y-8 p-6">

      {/* Pull latest + last updated */}
      <div>
        <h3 className="section-title flex items-center gap-2 mb-3">
          <DollarSign size={16} />
          API Pricing
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handlePull}
            disabled={fetching}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            {fetching
              ? <RefreshCw size={13} className="animate-spin" />
              : fetchStatus === 'ok'
                ? <Check size={13} className="text-accent-green" />
                : <RefreshCw size={13} />
            }
            {fetching ? 'Fetching…' : fetchStatus === 'ok' ? 'Updated!' : fetchStatus === 'error' ? 'Failed — try again' : 'Pull Latest Pricing'}
          </button>
          {config.lastFetched && (
            <span className="text-xs text-text-muted">
              Last fetched: {new Date(config.lastFetched).toLocaleDateString()} {new Date(config.lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Per-model price table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-secondary border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Model</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Input ($/MTok)</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Output ($/MTok)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(config.models).map(([model, price]) => (
                <tr key={model} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-text-secondary">{model}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price.input}
                      onChange={e => setModelPrice(model, 'input', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right bg-bg-tertiary border border-border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-orange"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price.output}
                      onChange={e => setModelPrice(model, 'output', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right bg-bg-tertiary border border-border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-orange"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={resetPrices} className="mt-2 text-xs text-text-muted hover:text-text-secondary underline">
          Reset to defaults
        </button>
      </div>

      {/* Discount tier */}
      <div>
        <h3 className="section-title mb-3">Volume Discount</h3>
        <p className="text-xs text-text-muted mb-3">
          Applied to all cost displays in Analytics. Based on your annual commitment tier with Anthropic.
        </p>
        <div className="space-y-2">
          {(Object.entries(DISCOUNT_TIERS) as [DiscountTier, typeof DISCOUNT_TIERS[DiscountTier]][]).map(([tier, info]) => (
            <label
              key={tier}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                config.discountTier === tier
                  ? 'border-accent-orange/40 bg-accent-orange/5'
                  : 'border-border hover:border-border/80 hover:bg-bg-tertiary'
              )}
            >
              <input
                type="radio"
                name="discountTier"
                value={tier}
                checked={config.discountTier === tier}
                onChange={() => setDiscount(tier)}
                className="accent-orange-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{info.label}</span>
                  {info.pct > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green font-medium">
                      save {info.pct}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">{info.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {config.discountTier === 'custom' && (
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs text-text-secondary">Custom discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={config.customDiscountPct}
              onChange={e => setCustomPct(parseFloat(e.target.value) || 0)}
              className="w-24 input text-xs"
              placeholder="e.g. 12"
            />
          </div>
        )}

        {effectivePct > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-accent-green/5 border border-accent-green/20 text-xs text-accent-green">
            ✓ {effectivePct}% discount applied to Analytics cost displays
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export function SettingsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const { settingsTab, setSettingsTab, settingsViewMode, setSettingsViewMode } = useEditorStore()
  const [settings, setSettings] = useState<SettingsData>({})
  const [rawJson, setRawJson] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newAllowedTool, setNewAllowedTool] = useState('')
  const [newDenyTool, setNewDenyTool] = useState('')

  const loadSettings = useCallback(async () => {
    const api = getApi()
    if (!api) return
    const result = await api.config.getSettings(settingsTab, currentProjectDir)
    const data = result?.data || {}
    setSettings(data)
    setRawJson(JSON.stringify(data, null, 2))
    setDirty(false)
  }, [settingsTab, currentProjectDir])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleSave = useCallback(async () => {
    const api = getApi()
    if (!api) return
    setSaving(true)
    try {
      const data = settingsViewMode === 'json' ? JSON.parse(rawJson) : settings
      await api.config.saveSettings(settingsTab, data, currentProjectDir)
      setDirty(false)
      addActivity({ type: 'config', message: `Saved ${settingsTab} settings`, status: 'success' })
    } catch (e: any) {
      addActivity({ type: 'config', message: `Failed to save settings: ${e.message}`, status: 'error' })
    }
    setSaving(false)
  }, [settingsTab, settings, rawJson, settingsViewMode, currentProjectDir, addActivity])

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    setRawJson(JSON.stringify(newSettings, null, 2))
    setDirty(true)
  }

  const addToArray = (key: string, value: string) => {
    if (!value.trim()) return
    const arr = [...(settings[key] as string[] || []), value.trim()]
    updateSetting(key, arr)
  }

  const removeFromArray = (key: string, index: number) => {
    const arr = [...(settings[key] as string[] || [])]
    arr.splice(index, 1)
    updateSetting(key, arr)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-1">
          {SCOPES.map((scope) => (
            <button
              key={scope.id}
              onClick={() => setSettingsTab(scope.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-all',
                settingsTab === scope.id
                  ? 'bg-accent-orange/10 text-accent-orange font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {scope.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className={cn('flex items-center bg-bg-primary rounded-lg border border-border', settingsTab === 'pricing' && 'invisible')}>
            <button
              onClick={() => setSettingsViewMode('visual')}
              className={cn(
                'px-3 py-1 text-xs rounded-l-lg transition-all',
                settingsViewMode === 'visual' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted'
              )}
            >
              <Sliders size={14} />
            </button>
            <button
              onClick={() => setSettingsViewMode('json')}
              className={cn(
                'px-3 py-1 text-xs rounded-r-lg transition-all',
                settingsViewMode === 'json' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted'
              )}
            >
              <Code size={14} />
            </button>
          </div>
          <button onClick={loadSettings} className="btn-ghost text-xs">
            <RotateCcw size={14} />
          </button>
          <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary text-xs">
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {settingsTab === 'pricing' ? (
          <PricingTab />
        ) : settingsViewMode === 'json' ? (
          <div className="p-6">
            <CodeEditor
              value={rawJson}
              onChange={(val) => { setRawJson(val); setDirty(true) }}
              language="json"
              minHeight="400px"
            />
          </div>
        ) : (
          <div className="max-w-2xl space-y-8 p-6">
            {/* Model */}
            <div>
              <h3 className="section-title flex items-center gap-2">
                General
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Default Model</label>
                  <select
                    value={settings.model || ''}
                    onChange={(e) => updateSetting('model', e.target.value || undefined)}
                    className="input"
                  >
                    <option value="">System default</option>
                    {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Max Output Tokens</label>
                  <input
                    type="number"
                    value={settings.maxTokens || ''}
                    onChange={(e) => updateSetting('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Default (system)"
                    className="input"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="label mb-0">Extended Thinking</label>
                    <p className="text-xs text-text-muted">Enable deep reasoning mode</p>
                  </div>
                  <button
                    onClick={() => updateSetting('extendedThinking', !settings.extendedThinking)}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      settings.extendedThinking ? 'bg-accent-orange' : 'bg-bg-tertiary border border-border'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      settings.extendedThinking ? 'left-5' : 'left-1'
                    )} />
                  </button>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="section-title flex items-center gap-2">
                <Shield size={18} />
                Permissions
              </h3>
              <div className="space-y-4">
                {/* Allowed Tools */}
                <div>
                  <label className="label">Allowed Tools (auto-approve)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(settings.allowedTools || []).map((tool: string, i: number) => (
                      <span key={i} className="badge-green flex items-center gap-1">
                        {tool}
                        <button onClick={() => removeFromArray('allowedTools', i)}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newAllowedTool}
                      onChange={(e) => setNewAllowedTool(e.target.value)}
                      className="input flex-1"
                    >
                      <option value="">Select a tool...</option>
                      {COMMON_TOOLS.filter(t => !(settings.allowedTools || []).includes(t)).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { addToArray('allowedTools', newAllowedTool); setNewAllowedTool('') }}
                      disabled={!newAllowedTool}
                      className="btn-secondary text-xs"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Deny Tools */}
                <div>
                  <label className="label">Denied Tools (always block)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(settings.deny || []).map((tool: string, i: number) => (
                      <span key={i} className="badge-red flex items-center gap-1">
                        {tool}
                        <button onClick={() => removeFromArray('deny', i)}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDenyTool}
                      onChange={(e) => setNewDenyTool(e.target.value)}
                      placeholder="Tool pattern to deny..."
                      className="input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { addToArray('deny', newDenyTool); setNewDenyTool('') }
                      }}
                    />
                    <button
                      onClick={() => { addToArray('deny', newDenyTool); setNewDenyTool('') }}
                      disabled={!newDenyTool}
                      className="btn-secondary text-xs"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Bypass */}
                <div className="card border-accent-red/30 bg-accent-red/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={14} className="text-accent-red" />
                        <label className="text-sm font-medium text-accent-red">Bypass All Permissions</label>
                      </div>
                      <p className="text-xs text-text-secondary">Dangerous: Skip all permission checks. Use with caution.</p>
                    </div>
                    <button
                      onClick={() => updateSetting('bypassPermissions', !settings.bypassPermissions)}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        settings.bypassPermissions ? 'bg-accent-red' : 'bg-bg-tertiary border border-border'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        settings.bypassPermissions ? 'left-5' : 'left-1'
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

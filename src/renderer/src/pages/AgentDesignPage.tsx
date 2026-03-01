import React, { useEffect, useState, useCallback } from 'react'
import { Palette, Save, Bot, Trash2 } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { useAgentVisualStore } from '../stores/agent-visual-store'
import { AvatarBuilder } from '../components/agents/AvatarBuilder'
import { AgentCard } from '../components/agents/AgentCard'
import { VoiceSelector } from '../components/voice/VoiceSelector'
import { EmptyState } from '../components/shared/EmptyState'
import { DEFAULT_AVATAR } from '../types/agent-v3'
import type { AvatarConfig, AgentV3Config } from '../types/agent-v3'
import type { AgentInfo } from '../types/config'

export function AgentDesignPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const { agentConfigs, setAgentConfig, removeAgentConfig } = useAgentVisualStore()
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Editable fields
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [personality, setPersonality] = useState('')
  const [catchphrase, setCatchphrase] = useState('')
  const [voiceId, setVoiceId] = useState<string | undefined>()
  const [voiceName, setVoiceName] = useState<string | undefined>()
  const [dirty, setDirty] = useState(false)

  const loadAgents = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const result = await api.config.listAgents(currentProjectDir)
      setAgents(result || [])
    } catch { }
    setLoading(false)
  }, [currentProjectDir])

  useEffect(() => { loadAgents() }, [loadAgents])

  // Load existing config when selecting an agent
  useEffect(() => {
    if (!selectedAgent) return
    const existing = agentConfigs[selectedAgent]
    if (existing) {
      setAvatar(existing.avatar)
      setPersonality(existing.personality || '')
      setCatchphrase(existing.catchphrase || '')
      setVoiceId(existing.voiceId)
      setVoiceName(existing.voiceName)
    } else {
      setAvatar(DEFAULT_AVATAR)
      setPersonality('')
      setCatchphrase('')
      setVoiceId(undefined)
      setVoiceName(undefined)
    }
    setDirty(false)
  }, [selectedAgent, agentConfigs])

  const handleSave = () => {
    if (!selectedAgent) return
    const agent = agents.find((a) => a.name === selectedAgent)
    if (!agent) return

    const config: AgentV3Config = {
      name: selectedAgent,
      description: agent.description || '',
      model: agent.model || 'sonnet',
      avatar,
      personality,
      catchphrase: catchphrase || undefined,
      voiceId,
      voiceName,
    }

    setAgentConfig(selectedAgent, config)
    setDirty(false)
    addActivity({ type: 'config', message: `Saved visual design for @${selectedAgent}`, status: 'success' })
  }

  const handleReset = () => {
    if (!selectedAgent) return
    removeAgentConfig(selectedAgent)
    setAvatar(DEFAULT_AVATAR)
    setPersonality('')
    setCatchphrase('')
    setDirty(false)
    addActivity({ type: 'config', message: `Reset visual design for @${selectedAgent}`, status: 'success' })
  }

  const selectedAgentInfo = agents.find((a) => a.name === selectedAgent)
  const previewConfig: AgentV3Config | null = selectedAgent && selectedAgentInfo ? {
    name: selectedAgent,
    description: selectedAgentInfo.description || '',
    model: selectedAgentInfo.model || 'sonnet',
    avatar,
    personality,
    catchphrase: catchphrase || undefined,
  } : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Palette size={20} className="text-accent-purple" />
          <div>
            <h2 className="text-sm font-heading font-semibold text-text-primary">Agent Design Studio</h2>
            <p className="text-xs text-text-muted">Customize avatars, personalities, and voices for your agents</p>
          </div>
        </div>
        {selectedAgent && (
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="btn-ghost text-xs text-accent-red">
              <Trash2 size={12} /> Reset
            </button>
            <button onClick={handleSave} disabled={!dirty} className="btn-primary text-sm">
              <Save size={14} /> Save Design
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Agent selector sidebar */}
        <div className="w-56 border-r border-border overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-mono text-text-muted tracking-wider px-2 py-1">
            SELECT AGENT
          </div>
          {loading ? (
            <div className="text-xs text-text-muted text-center py-4">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="text-xs text-text-muted text-center py-4">
              No agents found. Create agents first on the Subagents page.
            </div>
          ) : (
            agents.map((agent) => {
              const hasConfig = !!agentConfigs[agent.name]
              return (
                <button
                  key={agent.name}
                  onClick={() => setSelectedAgent(agent.name)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all',
                    selectedAgent === agent.name
                      ? 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  )}
                >
                  <Bot size={14} className={hasConfig ? 'text-accent-green' : 'text-text-muted'} />
                  <span className="truncate">@{agent.name}</span>
                  {hasConfig && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-green" />}
                </button>
              )
            })
          )}
        </div>

        {/* Design panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAgent ? (
            <EmptyState
              icon={<Palette size={24} />}
              title="Select an Agent"
              description="Choose an agent from the sidebar to customize their visual identity, personality, and voice."
            />
          ) : (
            <div className="max-w-4xl space-y-6">
              {/* Avatar Builder */}
              <div className="card">
                <h3 className="section-title text-sm">Avatar Design</h3>
                <AvatarBuilder
                  avatar={avatar}
                  onChange={(a) => { setAvatar(a); setDirty(true) }}
                />
              </div>

              {/* Identity */}
              <div className="card">
                <h3 className="section-title text-sm">Identity</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Personality</label>
                    <textarea
                      value={personality}
                      onChange={(e) => { setPersonality(e.target.value); setDirty(true) }}
                      placeholder="Describe this agent's personality and communication style..."
                      className="textarea"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="label">Catchphrase (optional)</label>
                    <input
                      value={catchphrase}
                      onChange={(e) => { setCatchphrase(e.target.value); setDirty(true) }}
                      placeholder="A signature line this agent says..."
                      className="input"
                    />
                  </div>
                  <VoiceSelector
                    value={voiceId}
                    valueName={voiceName}
                    onChange={(id, name) => { setVoiceId(id); setVoiceName(name); setDirty(true) }}
                  />
                </div>
              </div>

              {/* Live Preview */}
              {previewConfig && (
                <div className="card">
                  <h3 className="section-title text-sm">Live Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-mono text-text-muted mb-2">EXPANDED CARD</div>
                      <AgentCard config={previewConfig} />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-text-muted mb-2">COMPACT (HUD)</div>
                      <AgentCard config={previewConfig} compact />
                      <div className="mt-4">
                        <div className="text-[10px] font-mono text-text-muted mb-2">ACTIVE STATE</div>
                        <AgentCard
                          config={previewConfig}
                          activity={{ agentName: selectedAgent, status: 'working', currentTask: 'Reviewing code...', startTime: Date.now() - 30000 }}
                          compact
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

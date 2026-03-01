import { create } from 'zustand'
import type { AgentV3Config, AgentActivity } from '../types/agent-v3'

interface AgentVisualState {
  // Persisted configs (saved to localStorage + file)
  agentConfigs: Record<string, AgentV3Config>

  // Runtime activity state
  agentActivities: Record<string, AgentActivity>

  // Claude itself as the "primary operator"
  claudeActivity: AgentActivity

  // Actions
  setAgentConfig: (name: string, config: AgentV3Config) => void
  removeAgentConfig: (name: string) => void
  setAgentActivity: (name: string, updates: Partial<AgentActivity>) => void
  setClaudeActivity: (updates: Partial<AgentActivity>) => void
  loadConfigs: () => void
  saveConfigs: () => void
}

const STORAGE_KEY = 'claude-gui-agent-visuals'

function loadFromStorage(): Record<string, AgentV3Config> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(configs: Record<string, AgentV3Config>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  } catch { /* ignore */ }
}

export const useAgentVisualStore = create<AgentVisualState>((set, get) => ({
  agentConfigs: loadFromStorage(),
  agentActivities: {},
  claudeActivity: {
    agentName: 'claude',
    status: 'idle',
  },

  setAgentConfig: (name, config) => {
    set((state) => {
      const configs = { ...state.agentConfigs, [name]: config }
      saveToStorage(configs)
      return { agentConfigs: configs }
    })
  },

  removeAgentConfig: (name) => {
    set((state) => {
      const configs = { ...state.agentConfigs }
      delete configs[name]
      saveToStorage(configs)
      return { agentConfigs: configs }
    })
  },

  setAgentActivity: (name, updates) => {
    set((state) => ({
      agentActivities: {
        ...state.agentActivities,
        [name]: {
          ...(state.agentActivities[name] || { agentName: name, status: 'idle' }),
          ...updates,
        },
      },
    }))
  },

  setClaudeActivity: (updates) => {
    set((state) => ({
      claudeActivity: { ...state.claudeActivity, ...updates },
    }))
  },

  loadConfigs: () => {
    set({ agentConfigs: loadFromStorage() })
  },

  saveConfigs: () => {
    const { agentConfigs } = get()
    saveToStorage(agentConfigs)
    // Also persist to file via IPC if available
    try {
      const api = (window as any).api
      if (api?.config?.saveAgentVisuals) {
        api.config.saveAgentVisuals(agentConfigs)
      }
    } catch { /* ignore */ }
  },
}))

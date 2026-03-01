import { create } from 'zustand'

export interface MissionEvent {
  id: string
  timestamp: number
  tabId: string
  type:
    | 'tool_use'
    | 'file_read'
    | 'file_write'
    | 'bash_exec'
    | 'thinking'
    | 'agent_spawn'
    | 'agent_complete'
    | 'text_output'
    | 'error'
    | 'user_input'
  label: string
  detail?: string
  agentName?: string
  status: 'active' | 'completed' | 'failed'
}

interface MissionState {
  // Events per tab
  events: Map<string, MissionEvent[]>

  // Currently active tool/file
  activeToolName: string | null
  activeFileName: string | null

  // Scroll state
  feedScrollLocked: boolean

  // Raw terminal toggle
  showRawTerminal: boolean

  // Session timer
  sessionStartTime: number | null

  // Actions
  addEvent: (tabId: string, event: Omit<MissionEvent, 'id' | 'timestamp' | 'tabId'>) => void
  updateEvent: (tabId: string, eventId: string, updates: Partial<MissionEvent>) => void
  completeActiveEvents: (tabId: string) => void
  clearEvents: (tabId: string) => void
  setActiveToolName: (name: string | null) => void
  setActiveFileName: (name: string | null) => void
  setFeedScrollLocked: (locked: boolean) => void
  setShowRawTerminal: (show: boolean) => void
  setSessionStartTime: (time: number | null) => void
  getTabEvents: (tabId: string) => MissionEvent[]
}

let eventCounter = 0

export const useMissionStore = create<MissionState>((set, get) => ({
  events: new Map(),
  activeToolName: null,
  activeFileName: null,
  feedScrollLocked: false,
  showRawTerminal: false,
  sessionStartTime: null,

  addEvent: (tabId, event) =>
    set((state) => {
      const newEvents = new Map(state.events)
      const tabEvents = [...(newEvents.get(tabId) || [])]
      const newEvent: MissionEvent = {
        ...event,
        id: `evt-${Date.now()}-${++eventCounter}`,
        timestamp: Date.now(),
        tabId,
      }
      tabEvents.push(newEvent)
      // Keep max 500 events per tab
      if (tabEvents.length > 500) tabEvents.splice(0, tabEvents.length - 500)
      newEvents.set(tabId, tabEvents)
      return { events: newEvents }
    }),

  updateEvent: (tabId, eventId, updates) =>
    set((state) => {
      const newEvents = new Map(state.events)
      const tabEvents = newEvents.get(tabId)
      if (!tabEvents) return state
      const updated = tabEvents.map((e) =>
        e.id === eventId ? { ...e, ...updates } : e
      )
      newEvents.set(tabId, updated)
      return { events: newEvents }
    }),

  completeActiveEvents: (tabId) =>
    set((state) => {
      const newEvents = new Map(state.events)
      const tabEvents = newEvents.get(tabId)
      if (!tabEvents) return state
      const updated = tabEvents.map((e) =>
        e.status === 'active' ? { ...e, status: 'completed' as const } : e
      )
      newEvents.set(tabId, updated)
      return { events: newEvents }
    }),

  clearEvents: (tabId) =>
    set((state) => {
      const newEvents = new Map(state.events)
      newEvents.delete(tabId)
      return { events: newEvents }
    }),

  setActiveToolName: (name) => set({ activeToolName: name }),
  setActiveFileName: (name) => set({ activeFileName: name }),
  setFeedScrollLocked: (locked) => set({ feedScrollLocked: locked }),
  setShowRawTerminal: (show) => set({ showRawTerminal: show }),
  setSessionStartTime: (time) => set({ sessionStartTime: time }),
  getTabEvents: (tabId) => get().events.get(tabId) || [],
}))

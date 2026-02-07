import { create } from 'zustand'
import type { CliInfo, ClaudePaths, SessionInfo, ActivityItem } from '../types'

interface AppState {
  // CLI status
  cliAvailable: boolean
  cliInfo: CliInfo | null
  claudePaths: ClaudePaths | null

  // Theme
  theme: 'dark' | 'light'

  // Navigation
  sidebarCollapsed: boolean
  currentPage: string

  // Project
  currentProjectDir: string | null

  // Sessions
  sessions: SessionInfo[]
  activeSessionId: string | null

  // Session memory handoff (set by SessionsPage, consumed by TerminalPage)
  pendingSessionMemory: string | null

  // Activity
  activities: ActivityItem[]

  // Actions
  setCliAvailable: (available: boolean) => void
  setCliInfo: (info: CliInfo) => void
  setClaudePaths: (paths: ClaudePaths) => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setCurrentPage: (page: string) => void
  setCurrentProjectDir: (dir: string | null) => void
  setSessions: (sessions: SessionInfo[]) => void
  setActiveSessionId: (id: string | null) => void
  setPendingSessionMemory: (memory: string | null) => void
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void
  clearActivities: () => void
}

export const useAppStore = create<AppState>((set) => ({
  cliAvailable: false,
  cliInfo: null,
  claudePaths: null,
  theme: (localStorage.getItem('claude-gui-theme') as 'dark' | 'light') || 'dark',
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  currentProjectDir: localStorage.getItem('claude-gui-project-dir'),
  sessions: [],
  activeSessionId: null,
  pendingSessionMemory: null,
  activities: [],

  setCliAvailable: (available) => set({ cliAvailable: available }),
  setCliInfo: (info) => set({ cliInfo: info }),
  setClaudePaths: (paths) => set({ claudePaths: paths }),
  setTheme: (theme) => {
    localStorage.setItem('claude-gui-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },
  toggleTheme: () => {
    const newTheme = useAppStore.getState().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('claude-gui-theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    set({ theme: newTheme })
  },
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCurrentPage: (page) => set({ currentPage: page }),
  setCurrentProjectDir: (dir) => {
    if (dir) {
      localStorage.setItem('claude-gui-project-dir', dir)
    } else {
      localStorage.removeItem('claude-gui-project-dir')
    }
    set({ currentProjectDir: dir })
  },
  setSessions: (sessions) => set({ sessions }),
  setPendingSessionMemory: (memory) => set({ pendingSessionMemory: memory }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  addActivity: (activity) =>
    set((s) => ({
      activities: [
        { ...activity, id: `act-${Date.now()}`, timestamp: Date.now() },
        ...s.activities
      ].slice(0, 50)
    })),
  clearActivities: () => set({ activities: [] }),
}))

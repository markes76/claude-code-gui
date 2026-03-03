import { create } from 'zustand'

interface EditorState {
  // CLAUDE.md editor
  claudeMdTab: 'global' | 'project' | 'local' | 'private'
  claudeMdContent: Record<string, string>
  claudeMdDirty: Record<string, boolean>

  // Settings editor
  settingsTab: 'user' | 'project' | 'local' | 'pricing'
  settingsViewMode: 'visual' | 'json'

  // Actions
  setClaudeMdTab: (tab: 'global' | 'project' | 'local' | 'private') => void
  setClaudeMdContent: (scope: string, content: string) => void
  setClaudeMdDirty: (scope: string, dirty: boolean) => void
  setSettingsTab: (tab: 'user' | 'project' | 'local' | 'pricing') => void
  setSettingsViewMode: (mode: 'visual' | 'json') => void
}

export const useEditorStore = create<EditorState>((set) => ({
  claudeMdTab: 'global',
  claudeMdContent: {},
  claudeMdDirty: {},
  settingsTab: 'user',
  settingsViewMode: 'visual',

  setClaudeMdTab: (tab) => set({ claudeMdTab: tab }),
  setClaudeMdContent: (scope, content) =>
    set((s) => ({
      claudeMdContent: { ...s.claudeMdContent, [scope]: content }
    })),
  setClaudeMdDirty: (scope, dirty) =>
    set((s) => ({
      claudeMdDirty: { ...s.claudeMdDirty, [scope]: dirty }
    })),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setSettingsViewMode: (mode) => set({ settingsViewMode: mode }),
}))

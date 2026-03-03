import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { WelcomeScreen } from './components/shared/WelcomeScreen'
import { useClaudeApi } from './hooks/use-claude-api'
import { useAppStore } from './stores/app-store'

// Pages
import { DashboardPage } from './pages/DashboardPage'
import { TerminalPage } from './pages/TerminalPage'
import { ClaudeMdPage } from './pages/ClaudeMdPage'
import { SettingsPage } from './pages/SettingsPage'
import { SkillsPage } from './pages/SkillsPage'
import { AgentsPage } from './pages/AgentsPage'
import { CommandsPage } from './pages/CommandsPage'
import { HooksPage } from './pages/HooksPage'
import { McpPage } from './pages/McpPage'
import { PluginsPage } from './pages/PluginsPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { SessionsPage } from './pages/SessionsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { DocsPage } from './pages/DocsPage'
import { ApiKeysPage } from './pages/ApiKeysPage'
import { MemoryPage } from './pages/MemoryPage'
import { RulesPage } from './pages/RulesPage'

export default function App() {
  const { initialize } = useClaudeApi()
  const theme = useAppStore(s => s.theme)
  const projectTrusted = useAppStore(s => s.projectTrusted)
  const location = useLocation()
  const isTerminal = location.pathname === '/terminal'

  useEffect(() => {
    initialize()
  }, [initialize])

  // Apply theme class to document root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Show project picker + trust flow before the main UI
  if (!projectTrusted) {
    return <WelcomeScreen />
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden relative">
          {/* Terminal is ALWAYS mounted — never unmounts, preserving PTY sessions */}
          <div
            className="absolute inset-0 flex flex-col"
            style={{ display: isTerminal ? '' : 'none' }}
          >
            <TerminalPage />
          </div>

          {/* Other pages render via normal routing */}
          <div
            className="absolute inset-0 overflow-y-auto"
            style={{ display: isTerminal ? 'none' : '' }}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/claude-md" element={<ClaudeMdPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/commands" element={<CommandsPage />} />
              <Route path="/hooks" element={<HooksPage />} />
              <Route path="/mcp" element={<McpPage />} />
              <Route path="/plugins" element={<PluginsPage />} />
              <Route path="/permissions" element={<PermissionsPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/api-keys" element={<ApiKeysPage />} />
              <Route path="/docs" element={<DocsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

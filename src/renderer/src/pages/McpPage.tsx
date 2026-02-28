import React, { useEffect, useState, useCallback } from 'react'
import { Server, Plus, Trash2, Save, RefreshCw, CheckCircle, XCircle, ExternalLink, Wifi } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import { StepWizard, type WizardStepDef } from '../components/shared/StepWizard'
import { CodeEditor } from '../components/shared/CodeEditor'
import type { McpServerConfig } from '../types/config'

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'type', title: 'Server Type', description: 'Select the type of MCP server' },
  { id: 'config', title: 'Configuration', description: 'Configure server connection details' },
  { id: 'scope', title: 'Scope', description: 'Choose where this server is available' },
  { id: 'review', title: 'Review', description: 'Review and add the server' },
]

const POPULAR_SERVERS = [
  // Productivity & Development
  { name: 'github', label: 'GitHub', desc: 'PRs, issues, repos', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] },
  { name: 'filesystem', label: 'Filesystem', desc: 'Local file access', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
  { name: 'brave-search', label: 'Brave Search', desc: 'Web search', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'] },
  { name: 'puppeteer', label: 'Puppeteer', desc: 'Browser automation', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] },
  { name: 'sequential-thinking', label: 'Sequential Thinking', desc: 'Task breakdown', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] },
  // Databases
  { name: 'postgres', label: 'PostgreSQL', desc: 'Database queries', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'] },
  { name: 'sqlite', label: 'SQLite', desc: 'Local SQLite DB', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite'] },
  // Communication
  { name: 'slack', label: 'Slack', desc: 'Messages, channels', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'] },
  // Knowledge & Memory
  { name: 'memory', label: 'Memory', desc: 'Persistent knowledge', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] },
  { name: 'everything', label: 'Everything', desc: 'Demos all MCP features', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] },
  // Cloud & DevOps
  { name: 'aws-kb-retrieval', label: 'AWS KB Retrieval', desc: 'AWS Knowledge Base', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-aws-kb-retrieval'] },
  { name: 'gitlab', label: 'GitLab', desc: 'GitLab repos & MRs', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-gitlab'] },
  // Productivity
  { name: 'google-drive', label: 'Google Drive', desc: 'Docs, sheets, files', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-gdrive'] },
  { name: 'google-maps', label: 'Google Maps', desc: 'Location & directions', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-google-maps'] },
  { name: 'sentry', label: 'Sentry', desc: 'Error tracking', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-sentry'] },
  { name: 'fetch', label: 'Fetch', desc: 'HTTP requests & scraping', type: 'stdio' as const, command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] },
]

export function McpPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({})
  const [projectServers, setProjectServers] = useState<Record<string, McpServerConfig>>({})
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showPopular, setShowPopular] = useState(false)
  const [activeTab, setActiveTab] = useState<'user' | 'project'>('user')

  const [wizardStep, setWizardStep] = useState(0)
  const [serverName, setServerName] = useState('')
  const [serverType, setServerType] = useState<'stdio' | 'http' | 'sse'>('stdio')
  const [serverCommand, setServerCommand] = useState('')
  const [serverArgs, setServerArgs] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [serverEnv, setServerEnv] = useState('')
  const [serverScope, setServerScope] = useState<'user' | 'project'>('user')

  const loadServers = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const [user, project] = await Promise.all([
        api.config.getMcpServers('user'),
        currentProjectDir ? api.config.getMcpServers('project', currentProjectDir) : {},
      ])
      setServers(user || {})
      setProjectServers(project || {})
    } catch { }
    setLoading(false)
  }, [currentProjectDir])

  useEffect(() => { loadServers() }, [loadServers])

  const currentServers = activeTab === 'user' ? servers : projectServers

  const handleCreate = async () => {
    const api = getApi()
    if (!api) return

    const config: McpServerConfig = { type: serverType }
    if (serverType === 'stdio') {
      config.command = serverCommand
      config.args = serverArgs.split('\n').map(s => s.trim()).filter(Boolean)
    } else {
      config.url = serverUrl
    }
    if (serverEnv) {
      try {
        config.env = JSON.parse(serverEnv)
      } catch { }
    }

    const result = await api.config.saveMcpServer({
      name: serverName,
      config,
      scope: serverScope,
      projectDir: currentProjectDir,
    })

    if (result.success) {
      addActivity({ type: 'config', message: `Added MCP server: ${serverName}`, status: 'success' })
      setShowWizard(false)
      loadServers()
    }
  }

  const handleDelete = async (name: string) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.deleteMcpServer(name, activeTab, currentProjectDir)
    if (result.success) {
      addActivity({ type: 'config', message: `Removed MCP server: ${name}`, status: 'success' })
      loadServers()
    }
  }

  const installPopular = async (server: typeof POPULAR_SERVERS[0]) => {
    const api = getApi()
    if (!api) return

    const config: McpServerConfig = {
      type: server.type,
      command: server.command,
      args: server.args,
    }

    const result = await api.config.saveMcpServer({
      name: server.name,
      config,
      scope: 'user',
      projectDir: currentProjectDir,
    })

    if (result.success) {
      addActivity({ type: 'config', message: `Installed MCP server: ${server.label}`, status: 'success' })
      setShowPopular(false)
      loadServers()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('user')} className={cn('px-3 py-1.5 rounded-lg text-xs', activeTab === 'user' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>User</button>
            <button onClick={() => setActiveTab('project')} className={cn('px-3 py-1.5 rounded-lg text-xs', activeTab === 'project' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>Project</button>
          </div>
          <span className="text-xs text-text-muted">{Object.keys(currentServers).length} servers</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPopular(true)} className="btn-secondary text-sm">
            <Server size={14} /> Popular Servers
          </button>
          <button onClick={() => { setWizardStep(0); setShowWizard(true) }} className="btn-primary text-sm">
            <Plus size={16} /> Add Server
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {Object.keys(currentServers).length === 0 && !loading ? (
          <EmptyState
            icon={<Server size={24} />}
            title="No MCP Servers"
            description="MCP servers extend Claude Code with external tools and data sources. Add your first server."
            action={
              <div className="flex gap-2">
                <button onClick={() => setShowPopular(true)} className="btn-secondary text-sm">Browse Popular</button>
                <button onClick={() => setShowWizard(true)} className="btn-primary text-sm"><Plus size={16} /> Add Server</button>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {Object.entries(currentServers).map(([name, config]) => (
              <div key={name} className="card-hover">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                      <Server size={18} className="text-accent-blue" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="badge-blue text-[10px]">{config.type || 'stdio'}</span>
                      </div>
                      <p className="text-xs text-text-muted font-mono">
                        {config.command ? `${config.command} ${(config.args || []).join(' ')}` : config.url || 'No URL'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(name)} className="btn-ghost text-xs text-accent-red">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popular Servers */}
      <Modal open={showPopular} onClose={() => setShowPopular(false)} title="Popular MCP Servers" description="One-click install common servers" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POPULAR_SERVERS.map((s) => {
            const installed = Object.keys(servers).includes(s.name)
            return (
              <button
                key={s.name}
                onClick={() => !installed && installPopular(s)}
                disabled={installed}
                className={cn('card-hover text-left', installed && 'opacity-50')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{s.label}</span>
                  {installed && <span className="badge-green text-[10px]">Installed</span>}
                </div>
                <p className="text-xs text-text-secondary">{s.desc}</p>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Create Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWizard(false)} />
          <div className="relative w-full max-w-3xl mx-4 bg-bg-card border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <StepWizard steps={WIZARD_STEPS} currentStep={wizardStep} onStepChange={setWizardStep} onComplete={handleCreate} onCancel={() => setShowWizard(false)}
              canAdvance={wizardStep === 0 ? true : wizardStep === 1 ? serverName.length > 0 && (serverType === 'stdio' ? serverCommand.length > 0 : serverUrl.length > 0) : true}
              completeLabel="Add Server"
            >
              {wizardStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { type: 'stdio' as const, label: 'Stdio (Local)', desc: 'Run a local process via npx, uvx, or command' },
                    { type: 'http' as const, label: 'HTTP (Remote)', desc: 'Connect to a remote HTTP/HTTPS server' },
                    { type: 'sse' as const, label: 'SSE (Legacy)', desc: 'Server-Sent Events transport' },
                  ].map((t) => (
                    <button key={t.type} onClick={() => setServerType(t.type)}
                      className={cn('card text-left cursor-pointer transition-all', serverType === t.type && 'border-accent-orange bg-accent-orange/5')}
                    >
                      <Wifi size={20} className="text-accent-blue mb-2" />
                      <div className="text-sm font-medium mb-1">{t.label}</div>
                      <p className="text-xs text-text-secondary">{t.desc}</p>
                    </button>
                  ))}
                </div>
              )}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div><label className="label">Server Name</label><input value={serverName} onChange={(e) => setServerName(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="my-server" className="input" /></div>
                  {serverType === 'stdio' ? (
                    <>
                      <div><label className="label">Command</label><input value={serverCommand} onChange={(e) => setServerCommand(e.target.value)} placeholder="npx" className="input font-mono" /></div>
                      <div><label className="label">Arguments (one per line)</label><textarea value={serverArgs} onChange={(e) => setServerArgs(e.target.value)} placeholder="-y\n@modelcontextprotocol/server-name" className="textarea font-mono" rows={3} /></div>
                    </>
                  ) : (
                    <div><label className="label">Server URL</label><input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://example.com/mcp" className="input font-mono" /></div>
                  )}
                  <div><label className="label">Environment Variables (JSON, optional)</label><textarea value={serverEnv} onChange={(e) => setServerEnv(e.target.value)} placeholder='{"API_KEY": "your-key"}' className="textarea font-mono" rows={2} /></div>
                </div>
              )}
              {wizardStep === 2 && (
                <div className="flex gap-4">
                  <button onClick={() => setServerScope('user')} className={cn('card flex-1 text-center cursor-pointer', serverScope === 'user' && 'border-accent-orange')}>
                    <div className="font-medium mb-1">User (Global)</div>
                    <p className="text-xs text-text-secondary">Available in all projects</p>
                  </button>
                  <button onClick={() => setServerScope('project')} className={cn('card flex-1 text-center cursor-pointer', serverScope === 'project' && 'border-accent-orange')}>
                    <div className="font-medium mb-1">Project</div>
                    <p className="text-xs text-text-secondary">Only this project</p>
                  </button>
                </div>
              )}
              {wizardStep === 3 && (
                <CodeEditor
                  value={JSON.stringify({
                    [serverName]: {
                      type: serverType,
                      ...(serverType === 'stdio' ? { command: serverCommand, args: serverArgs.split('\n').filter(Boolean) } : { url: serverUrl }),
                      ...(serverEnv ? { env: (() => { try { return JSON.parse(serverEnv) } catch { return {} } })() } : {}),
                    }
                  }, null, 2)}
                  onChange={() => {}} readOnly language="json" minHeight="200px"
                />
              )}
            </StepWizard>
          </div>
        </div>
      )}
    </div>
  )
}

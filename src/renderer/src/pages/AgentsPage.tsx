import React, { useEffect, useState, useCallback } from 'react'
import { Bot, Plus, Edit3, Trash2, Save, User, Cpu } from 'lucide-react'
import { cn, getApi, buildFrontmatter, parseFrontmatter } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { SearchInput } from '../components/shared/SearchInput'
import { Modal } from '../components/shared/Modal'
import { RelaunchBanner } from '../components/shared/RelaunchBanner'
import { StepWizard, type WizardStepDef } from '../components/shared/StepWizard'
import { CodeEditor } from '../components/shared/CodeEditor'
import type { AgentInfo } from '../types/config'

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'identity', title: 'Identity', description: 'Name, description, and model for your agent' },
  { id: 'tools', title: 'Tool Permissions', description: 'Configure which tools the agent can use' },
  { id: 'prompt', title: 'System Prompt', description: 'Write the agent persona and instructions' },
  { id: 'review', title: 'Review', description: 'Review and create your agent' },
]

const AGENT_TEMPLATES = [
  { name: 'Code Reviewer', prompt: 'You are a code review specialist. Analyze code for:\n- Bug risks\n- Performance issues\n- Security vulnerabilities\n- Readability and maintainability\n\nProvide specific, actionable feedback with line-level suggestions.' },
  { name: 'Security Analyst', prompt: 'You are a security analyst. Review code and configurations for:\n- OWASP Top 10 vulnerabilities\n- Credential exposure\n- Input validation gaps\n- Authentication/authorization flaws\n\nRate severity as Critical/High/Medium/Low.' },
  { name: 'Documentation Writer', prompt: 'You are a technical writer. Generate clear, comprehensive documentation:\n- API reference docs\n- README files\n- Inline code comments\n- Architecture decision records\n\nUse clear language suitable for the target audience.' },
  { name: 'Test Generator', prompt: 'You are a test engineer. Generate comprehensive test suites:\n- Unit tests for individual functions\n- Integration tests for workflows\n- Edge case coverage\n- Mock setup and teardown\n\nFollow the project testing conventions.' },
]

export function AgentsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [showRelaunch, setShowRelaunch] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AgentInfo | null>(null)

  const [wizardStep, setWizardStep] = useState(0)
  const [agentName, setAgentName] = useState('')
  const [agentDesc, setAgentDesc] = useState('')
  const [agentModel, setAgentModel] = useState('sonnet')
  const [agentScope, setAgentScope] = useState<'user' | 'project'>('user')
  const [agentAllowedTools, setAgentAllowedTools] = useState('')
  const [agentDenyTools, setAgentDenyTools] = useState('')
  const [agentPrompt, setAgentPrompt] = useState('')

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

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  )

  const resetWizard = () => {
    setWizardStep(0)
    setAgentName('')
    setAgentDesc('')
    setAgentModel('sonnet')
    setAgentScope('user')
    setAgentAllowedTools('')
    setAgentDenyTools('')
    setAgentPrompt('')
    setIsEditing(false)
    setEditingPath(null)
  }

  const openEditWizard = (agent: AgentInfo) => {
    const { frontmatter, body } = parseFrontmatter(agent.content)
    setAgentName(frontmatter.name || agent.name)
    setAgentDesc(frontmatter.description || agent.description || '')
    setAgentModel(frontmatter.model || agent.model || 'sonnet')
    setAgentScope(agent.scope === 'project' ? 'project' : 'user')
    setAgentAllowedTools(frontmatter['allowed-tools'] || '')
    setAgentDenyTools(frontmatter.deny || '')
    setAgentPrompt(body.trim())
    setWizardStep(0)
    setIsEditing(true)
    setEditingPath(agent.path)
    setShowWizard(true)
  }

  const handleSave = async () => {
    const api = getApi()
    if (!api) return

    const fm: Record<string, string> = {
      name: agentName,
      description: agentDesc,
      model: agentModel,
    }
    if (agentAllowedTools) fm['allowed-tools'] = agentAllowedTools
    if (agentDenyTools) fm.deny = agentDenyTools

    const content = buildFrontmatter(fm) + agentPrompt

    let success = false
    if (isEditing && editingPath) {
      const result = await api.fs.write(editingPath, content)
      success = result.success
    } else {
      const result = await api.config.saveAgent({
        name: agentName,
        content,
        scope: agentScope,
        projectDir: currentProjectDir,
      })
      success = result.success
    }

    if (success) {
      addActivity({ type: 'config', message: `${isEditing ? 'Updated' : 'Created'} agent: ${agentName}`, status: 'success' })
      setShowWizard(false)
      resetWizard()
      loadAgents()
      setShowRelaunch(true)
    }
  }

  const handleDelete = async (agent: AgentInfo) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.deleteAgent(agent.path)
    if (result.success) {
      addActivity({ type: 'config', message: `Deleted agent: ${agent.name}`, status: 'success' })
      setConfirmDelete(null)
      loadAgents()
      setShowRelaunch(true)
    }
  }

  const canAdvance = () => {
    switch (wizardStep) {
      case 0: return agentName.trim().length > 0 && agentDesc.trim().length > 0
      case 1: return true
      case 2: return agentPrompt.trim().length > 0
      case 3: return true
      default: return false
    }
  }

  return (
    <div className="flex flex-col h-full">
      {showRelaunch && <RelaunchBanner onDismiss={() => setShowRelaunch(false)} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search agents..." className="w-64" />
          <span className="text-xs text-text-muted">{filtered.length} agents</span>
        </div>
        <button onClick={() => { resetWizard(); setShowWizard(true) }} className="btn-primary text-sm">
          <Plus size={16} /> Create Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading agents...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bot size={24} />}
            title="No Subagents Found"
            description="Subagents are specialized AI personas you invoke with @mention. Create your first agent."
            action={
              <button onClick={() => { resetWizard(); setShowWizard(true) }} className="btn-primary text-sm">
                <Plus size={16} /> Create Agent
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((agent) => (
              <div key={agent.path} className="card-hover group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-accent-purple" />
                    <span className="font-medium text-sm">@{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="badge-blue text-[10px]">{agent.model}</span>
                    <span className={cn('badge', agent.scope === 'user' ? 'badge-blue' : 'badge-purple')}>
                      {agent.scope}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mb-3 line-clamp-2">{agent.description || 'No description'}</p>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditWizard(agent)} className="btn-ghost text-xs">
                    <Edit3 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(agent)}
                    className="btn-ghost text-xs text-accent-red hover:text-accent-red"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWizard(false)} />
          <div className="relative w-full max-w-3xl mx-4 bg-bg-card border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <StepWizard
              steps={WIZARD_STEPS}
              currentStep={wizardStep}
              onStepChange={setWizardStep}
              onComplete={handleSave}
              onCancel={() => { setShowWizard(false); resetWizard() }}
              canAdvance={canAdvance()}
              completeLabel={isEditing ? 'Save Agent' : 'Create Agent'}
              freeNavigation={isEditing}
            >
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Agent Name</label>
                    <input value={agentName} onChange={(e) => setAgentName(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="code-reviewer" className="input" />
                    <p className="text-xs text-text-muted mt-1">Invoked with @{agentName || 'name'}</p>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea value={agentDesc} onChange={(e) => setAgentDesc(e.target.value)} placeholder="When should this agent be invoked..." className="textarea" rows={2} />
                  </div>
                  <div>
                    <label className="label">Model</label>
                    <select value={agentModel} onChange={(e) => setAgentModel(e.target.value)} className="input">
                      <option value="opus">Opus (most capable)</option>
                      <option value="sonnet">Sonnet (balanced)</option>
                      <option value="haiku">Haiku (fastest)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Scope</label>
                    <div className="flex gap-3">
                      <button onClick={() => setAgentScope('user')} className={cn('card flex-1 text-center text-sm cursor-pointer', agentScope === 'user' && 'border-accent-orange')}>User</button>
                      <button onClick={() => setAgentScope('project')} className={cn('card flex-1 text-center text-sm cursor-pointer', agentScope === 'project' && 'border-accent-orange')}>Project</button>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Allowed Tools (Optional)</label>
                    <input value={agentAllowedTools} onChange={(e) => setAgentAllowedTools(e.target.value)} placeholder="Read, Write, Bash" className="input" />
                    <p className="text-xs text-text-muted mt-1">Comma-separated. Leave empty for default tool access.</p>
                  </div>
                  <div>
                    <label className="label">Denied Tools (Optional)</label>
                    <input value={agentDenyTools} onChange={(e) => setAgentDenyTools(e.target.value)} placeholder="Bash, Write" className="input" />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="text-xs text-text-secondary mb-2">Quick start with a template:</div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {AGENT_TEMPLATES.map((t) => (
                      <button key={t.name} onClick={() => setAgentPrompt(t.prompt)} className="card-hover text-left text-xs p-3">
                        <div className="font-medium text-text-primary">{t.name}</div>
                      </button>
                    ))}
                  </div>
                  <CodeEditor value={agentPrompt} onChange={setAgentPrompt} language="markdown" placeholder="Write the agent's system prompt..." minHeight="250px" />
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="text-sm text-text-secondary">Review the generated agent file:</div>
                  <CodeEditor
                    value={(() => {
                      const fm: Record<string, string> = { name: agentName, description: agentDesc, model: agentModel }
                      if (agentAllowedTools) fm['allowed-tools'] = agentAllowedTools
                      if (agentDenyTools) fm.deny = agentDenyTools
                      return buildFrontmatter(fm) + agentPrompt
                    })()}
                    onChange={() => {}}
                    readOnly
                    language="markdown"
                    minHeight="300px"
                  />
                </div>
              )}
            </StepWizard>
          </div>
        </div>
      )}

      {confirmDelete && (
        <Modal
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete Agent"
          footer={
            <>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-primary bg-accent-red/10 text-accent-red border-accent-red/20 hover:bg-accent-red/20">
                <Trash2 size={14} /> Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Delete agent <span className="font-mono text-text-primary font-medium">@{confirmDelete.name}</span>?
            This removes the file permanently.
          </p>
        </Modal>
      )}
    </div>
  )
}

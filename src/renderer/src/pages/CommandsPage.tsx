import React, { useEffect, useState, useCallback } from 'react'
import { Command, Plus, Edit3, Trash2, Save, Terminal } from 'lucide-react'
import { cn, getApi, buildFrontmatter } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { SearchInput } from '../components/shared/SearchInput'
import { Modal } from '../components/shared/Modal'
import { RelaunchBanner } from '../components/shared/RelaunchBanner'
import { StepWizard, type WizardStepDef } from '../components/shared/StepWizard'
import { CodeEditor } from '../components/shared/CodeEditor'
import type { CommandInfo } from '../types/config'

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'basic', title: 'Basic Info', description: 'Command name and description' },
  { id: 'config', title: 'Configuration', description: 'Optional frontmatter settings' },
  { id: 'content', title: 'Command Content', description: 'Write the command prompt/instructions' },
  { id: 'review', title: 'Review', description: 'Review and create' },
]

const BUILTIN_COMMANDS = [
  { name: 'help', desc: 'Show all available commands' },
  { name: 'init', desc: 'Initialize CLAUDE.md for current project' },
  { name: 'clear', desc: 'Clear conversation history' },
  { name: 'compact', desc: 'Compress conversation context' },
  { name: 'config', desc: 'Open settings configuration' },
  { name: 'context', desc: 'Show current context information' },
  { name: 'hooks', desc: 'Manage event hooks' },
  { name: 'mcp', desc: 'Manage MCP servers' },
  { name: 'model', desc: 'Change the AI model' },
  { name: 'plugins', desc: 'Manage installed plugins' },
  { name: 'agents', desc: 'Manage subagents' },
  { name: 'bug', desc: 'Report a bug' },
  { name: 'debug', desc: 'Show debug information' },
]

export function CommandsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingCmd, setEditingCmd] = useState<CommandInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'custom' | 'builtin'>('custom')
  const [showRelaunch, setShowRelaunch] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<CommandInfo | null>(null)

  const [wizardStep, setWizardStep] = useState(0)
  const [cmdName, setCmdName] = useState('')
  const [cmdDesc, setCmdDesc] = useState('')
  const [cmdScope, setCmdScope] = useState<'user' | 'project'>('user')
  const [cmdModel, setCmdModel] = useState('')
  const [cmdAllowedTools, setCmdAllowedTools] = useState('')
  const [cmdBody, setCmdBody] = useState('')

  const loadCommands = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const result = await api.config.listCommands(currentProjectDir)
      setCommands(result || [])
    } catch { }
    setLoading(false)
  }, [currentProjectDir])

  useEffect(() => { loadCommands() }, [loadCommands])

  const filtered = commands.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    const api = getApi()
    if (!api) return

    const fm: Record<string, string> = {}
    if (cmdDesc) fm.description = cmdDesc
    if (cmdModel) fm.model = cmdModel
    if (cmdAllowedTools) fm['allowed-tools'] = cmdAllowedTools

    const content = (Object.keys(fm).length > 0 ? buildFrontmatter(fm) : '') + cmdBody

    const result = await api.config.saveCommand({
      name: cmdName,
      content,
      scope: cmdScope,
      projectDir: currentProjectDir,
    })

    if (result.success) {
      addActivity({ type: 'config', message: `Created command: /${cmdName}`, status: 'success' })
      setShowWizard(false)
      loadCommands()
      setShowRelaunch(true)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingCmd) return
    const api = getApi()
    if (!api) return
    const result = await api.fs.write(editingCmd.path, editingCmd.content)
    if (result.success) {
      addActivity({ type: 'config', message: `Updated command: /${editingCmd.name}`, status: 'success' })
      setShowEditor(false)
      loadCommands()
      setShowRelaunch(true)
    }
  }

  const handleDelete = async (cmd: CommandInfo) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.deleteCommand(cmd.path)
    if (result.success) {
      addActivity({ type: 'config', message: `Deleted command: /${cmd.name}`, status: 'success' })
      setConfirmDelete(null)
      loadCommands()
      setShowRelaunch(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {showRelaunch && <RelaunchBanner onDismiss={() => setShowRelaunch(false)} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('custom')} className={cn('px-3 py-1.5 rounded-lg text-xs', activeTab === 'custom' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>Custom</button>
            <button onClick={() => setActiveTab('builtin')} className={cn('px-3 py-1.5 rounded-lg text-xs', activeTab === 'builtin' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>Built-in</button>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search commands..." className="w-64" />
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-primary text-sm">
          <Plus size={16} /> Create Command
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'builtin' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {BUILTIN_COMMANDS.filter(c => c.name.includes(search.toLowerCase())).map((cmd) => (
              <div key={cmd.name} className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Terminal size={14} className="text-accent-cyan" />
                  <span className="font-mono text-sm font-medium">/{cmd.name}</span>
                </div>
                <p className="text-xs text-text-secondary">{cmd.desc}</p>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-text-muted">Loading commands...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Command size={24} />}
            title="No Custom Commands"
            description="Create reusable slash commands to streamline your workflow."
            action={<button onClick={() => setShowWizard(true)} className="btn-primary text-sm"><Plus size={16} /> Create Command</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cmd) => (
              <div key={cmd.path} className="card-hover group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Command size={16} className="text-accent-green" />
                    <span className="font-mono font-medium text-sm">/{cmd.name}</span>
                  </div>
                  <span className={cn('badge', cmd.scope === 'user' ? 'badge-blue' : 'badge-purple')}>{cmd.scope}</span>
                </div>
                <p className="text-xs text-text-secondary mb-3 line-clamp-2">{cmd.description || 'No description'}</p>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingCmd(cmd); setShowEditor(true) }} className="btn-ghost text-xs"><Edit3 size={12} /> Edit</button>
                  <button onClick={() => setConfirmDelete(cmd)} className="btn-ghost text-xs text-accent-red hover:text-accent-red"><Trash2 size={12} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWizard(false)} />
          <div className="relative w-full max-w-3xl mx-4 bg-bg-card border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <StepWizard steps={WIZARD_STEPS} currentStep={wizardStep} onStepChange={setWizardStep} onComplete={handleCreate} onCancel={() => setShowWizard(false)} canAdvance={wizardStep === 0 ? cmdName.length > 0 : wizardStep === 2 ? cmdBody.length > 0 : true} completeLabel="Create Command">
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <div><label className="label">Command Name</label><input value={cmdName} onChange={(e) => setCmdName(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="my-command" className="input" /><p className="text-xs text-text-muted mt-1">Invoked with /{cmdName || 'my-command'}</p></div>
                  <div><label className="label">Description</label><input value={cmdDesc} onChange={(e) => setCmdDesc(e.target.value)} placeholder="What this command does" className="input" /></div>
                  <div><label className="label">Scope</label><div className="flex gap-3"><button onClick={() => setCmdScope('user')} className={cn('card flex-1 text-center text-sm cursor-pointer', cmdScope === 'user' && 'border-accent-orange')}>User</button><button onClick={() => setCmdScope('project')} className={cn('card flex-1 text-center text-sm cursor-pointer', cmdScope === 'project' && 'border-accent-orange')}>Project</button></div></div>
                </div>
              )}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div><label className="label">Model (Optional)</label><select value={cmdModel} onChange={(e) => setCmdModel(e.target.value)} className="input"><option value="">Default</option><option value="opus">Opus</option><option value="sonnet">Sonnet</option><option value="haiku">Haiku</option></select></div>
                  <div><label className="label">Allowed Tools (Optional)</label><input value={cmdAllowedTools} onChange={(e) => setCmdAllowedTools(e.target.value)} placeholder="Read, Write, Bash" className="input" /></div>
                </div>
              )}
              {wizardStep === 2 && <CodeEditor value={cmdBody} onChange={setCmdBody} language="markdown" placeholder="Write the command instructions. Use $ARGUMENTS for user input." minHeight="300px" />}
              {wizardStep === 3 && <CodeEditor value={(() => { const fm: Record<string, string> = {}; if (cmdDesc) fm.description = cmdDesc; if (cmdModel) fm.model = cmdModel; return (Object.keys(fm).length ? buildFrontmatter(fm) : '') + cmdBody })()}  onChange={() => {}} readOnly language="markdown" minHeight="300px" />}
            </StepWizard>
          </div>
        </div>
      )}

      {showEditor && editingCmd && (
        <Modal open={showEditor} onClose={() => setShowEditor(false)} title={`Edit: /${editingCmd.name}`} size="xl"
          footer={<><button onClick={() => setShowEditor(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveEdit} className="btn-primary"><Save size={14} /> Save</button></>}
        >
          <CodeEditor value={editingCmd.content} onChange={(val) => setEditingCmd({ ...editingCmd, content: val })} language="markdown" minHeight="400px" />
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete Command"
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
            Delete command <span className="font-mono text-text-primary font-medium">/{confirmDelete.name}</span>?
            This removes the file permanently.
          </p>
        </Modal>
      )}
    </div>
  )
}

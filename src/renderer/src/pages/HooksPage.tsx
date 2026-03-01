import React, { useEffect, useState, useCallback } from 'react'
import { Webhook, Plus, Trash2, Save, Play, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Info } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import { StepWizard, type WizardStepDef } from '../components/shared/StepWizard'
import { CodeEditor } from '../components/shared/CodeEditor'
import { HookModule } from '../components/gamified/HookModule'
import type { HookEventType, HookMatcher, HookConfig, HooksConfig } from '../types/config'

const HOOK_EVENTS: { id: HookEventType; label: string; desc: string; canBlock: boolean }[] = [
  { id: 'PreToolUse', label: 'Pre Tool Use', desc: 'Before a tool executes', canBlock: true },
  { id: 'PostToolUse', label: 'Post Tool Use', desc: 'After a tool completes', canBlock: false },
  { id: 'UserPromptSubmit', label: 'User Prompt Submit', desc: 'When user sends a message', canBlock: true },
  { id: 'SessionStart', label: 'Session Start', desc: 'When a session begins', canBlock: false },
  { id: 'SessionEnd', label: 'Session End', desc: 'When a session terminates', canBlock: false },
  { id: 'Notification', label: 'Notification', desc: 'When Claude needs input', canBlock: false },
  { id: 'Stop', label: 'Stop', desc: 'When Claude finishes responding', canBlock: false },
  { id: 'SubagentStop', label: 'Subagent Stop', desc: 'When a subagent completes', canBlock: true },
  { id: 'PreCompact', label: 'Pre Compact', desc: 'Before context compaction', canBlock: false },
]

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'event', title: 'Select Event', description: 'Choose when this hook should fire' },
  { id: 'matcher', title: 'Matcher', description: 'Configure which tools to match (for tool events)' },
  { id: 'action', title: 'Hook Action', description: 'Configure what the hook should do' },
  { id: 'review', title: 'Review', description: 'Review and create your hook' },
]

const HOOK_TEMPLATES = [
  { name: 'Format Python', event: 'PostToolUse' as HookEventType, matcher: 'Write(*.py)', command: 'python -m black "$CLAUDE_FILE"', desc: 'Auto-format Python files with Black' },
  { name: 'Lint JavaScript', event: 'PostToolUse' as HookEventType, matcher: 'Write(*.js)', command: 'npx eslint --fix "$CLAUDE_FILE"', desc: 'Lint JS files with ESLint' },
  { name: 'Block .env writes', event: 'PreToolUse' as HookEventType, matcher: 'Write(.env*)', command: 'echo "Blocked: .env modification" && exit 2', desc: 'Prevent writes to .env files' },
  { name: 'Git status on start', event: 'SessionStart' as HookEventType, matcher: '', command: 'git status --short 2>/dev/null || true', desc: 'Show git status when session starts' },
]

export function HooksPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [hooks, setHooks] = useState<HooksConfig>({})
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'user' | 'project'>('user')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [showWizard, setShowWizard] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const [wizardStep, setWizardStep] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<HookEventType>('PreToolUse')
  const [matcher, setMatcher] = useState('')
  const [hookType, setHookType] = useState<'command' | 'prompt'>('command')
  const [hookCommand, setHookCommand] = useState('')
  const [hookTimeout, setHookTimeout] = useState(60000)

  const loadHooks = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const result = await api.config.getHooks(scope, currentProjectDir)
      setHooks(result || {})
    } catch { }
    setLoading(false)
  }, [scope, currentProjectDir])

  useEffect(() => { loadHooks() }, [loadHooks])

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      next.has(eventId) ? next.delete(eventId) : next.add(eventId)
      return next
    })
  }

  const totalHooks = Object.values(hooks).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
  )

  const handleCreate = async () => {
    const api = getApi()
    if (!api) return

    const newHook: HookMatcher = {
      matcher,
      hooks: [{
        type: hookType,
        ...(hookType === 'command' ? { command: hookCommand, timeout: hookTimeout } : { prompt: hookCommand }),
      }]
    }

    const updated = { ...hooks }
    if (!updated[selectedEvent]) updated[selectedEvent] = []
    updated[selectedEvent]!.push(newHook)

    const result = await api.config.saveHooks(updated, scope, currentProjectDir)
    if (result.success) {
      addActivity({ type: 'config', message: `Created ${selectedEvent} hook`, status: 'success' })
      setHooks(updated)
      setShowWizard(false)
      setExpandedEvents(prev => new Set([...prev, selectedEvent]))
    }
  }

  const removeHook = async (event: HookEventType, index: number) => {
    const api = getApi()
    if (!api) return

    const updated = { ...hooks }
    if (updated[event]) {
      updated[event]!.splice(index, 1)
      if (updated[event]!.length === 0) delete updated[event]
    }

    const result = await api.config.saveHooks(updated, scope, currentProjectDir)
    if (result.success) {
      addActivity({ type: 'config', message: `Removed hook from ${event}`, status: 'success' })
      setHooks(updated)
    }
  }

  const applyTemplate = async (template: typeof HOOK_TEMPLATES[0]) => {
    const api = getApi()
    if (!api) return

    const newHook: HookMatcher = {
      matcher: template.matcher,
      hooks: [{ type: 'command', command: template.command, timeout: 60000 }]
    }

    const updated = { ...hooks }
    if (!updated[template.event]) updated[template.event] = []
    updated[template.event]!.push(newHook)

    const result = await api.config.saveHooks(updated, scope, currentProjectDir)
    if (result.success) {
      addActivity({ type: 'config', message: `Added hook template: ${template.name}`, status: 'success' })
      setHooks(updated)
      setShowTemplates(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button onClick={() => setScope('user')} className={cn('px-3 py-1.5 rounded-lg text-xs', scope === 'user' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>User</button>
            <button onClick={() => setScope('project')} className={cn('px-3 py-1.5 rounded-lg text-xs', scope === 'project' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>Project</button>
          </div>
          <span className="text-xs text-text-muted">{totalHooks} hooks configured</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="btn-secondary text-sm">Templates</button>
          <button onClick={() => { setWizardStep(0); setShowWizard(true) }} className="btn-primary text-sm"><Plus size={16} /> Create Hook</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {totalHooks === 0 && !loading ? (
          <EmptyState
            icon={<Webhook size={24} />}
            title="No Hooks Configured"
            description="Hooks execute custom commands in response to Claude Code events like tool use, session start, and more."
            action={
              <div className="flex gap-2">
                <button onClick={() => setShowTemplates(true)} className="btn-secondary text-sm">Browse Templates</button>
                <button onClick={() => setShowWizard(true)} className="btn-primary text-sm"><Plus size={16} /> Create Hook</button>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {HOOK_EVENTS.map((event) => (
              <HookModule
                key={event.id}
                event={event}
                hooks={hooks[event.id] || []}
                isExpanded={expandedEvents.has(event.id)}
                onToggle={() => toggleEvent(event.id)}
                onRemove={(index) => removeHook(event.id, index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Templates Modal */}
      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Hook Templates" description="One-click install common hooks" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {HOOK_TEMPLATES.map((t) => (
            <button key={t.name} onClick={() => applyTemplate(t)} className="card-hover text-left">
              <div className="text-sm font-medium text-text-primary mb-1">{t.name}</div>
              <p className="text-xs text-text-secondary mb-2">{t.desc}</p>
              <div className="flex gap-2">
                <span className="badge-blue text-[10px]">{t.event}</span>
                {t.matcher && <span className="badge-orange text-[10px]">{t.matcher}</span>}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Create Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWizard(false)} />
          <div className="relative w-full max-w-3xl mx-4 bg-bg-card border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <StepWizard steps={WIZARD_STEPS} currentStep={wizardStep} onStepChange={setWizardStep} onComplete={handleCreate} onCancel={() => setShowWizard(false)} canAdvance={wizardStep === 2 ? hookCommand.length > 0 : true} completeLabel="Create Hook">
              {wizardStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {HOOK_EVENTS.map((e) => (
                    <button key={e.id} onClick={() => setSelectedEvent(e.id)}
                      className={cn('card text-left cursor-pointer transition-all', selectedEvent === e.id && 'border-accent-orange bg-accent-orange/5')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{e.label}</span>
                        {e.canBlock && <span className="badge-orange text-[10px]">Blocks</span>}
                      </div>
                      <p className="text-xs text-text-secondary">{e.desc}</p>
                    </button>
                  ))}
                </div>
              )}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Matcher Pattern</label>
                    <input value={matcher} onChange={(e) => setMatcher(e.target.value)} placeholder='e.g., Bash, Write(*.py), Edit|Write' className="input font-mono" />
                    <p className="text-xs text-text-muted mt-1">Tool name pattern. Leave empty to match all tools. Use * for wildcards.</p>
                  </div>
                  <div className="card bg-bg-primary">
                    <div className="text-xs font-medium text-text-secondary mb-2">Pattern examples:</div>
                    <div className="space-y-1 text-xs font-mono text-text-muted">
                      <div><span className="text-accent-cyan">Bash</span> — matches Bash tool</div>
                      <div><span className="text-accent-cyan">Write(*.py)</span> — matches Python file writes</div>
                      <div><span className="text-accent-cyan">Edit|MultiEdit|Write</span> — matches any edit/write</div>
                      <div><span className="text-accent-cyan">*</span> — matches all tools</div>
                    </div>
                  </div>
                </div>
              )}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Hook Type</label>
                    <div className="flex gap-3">
                      <button onClick={() => setHookType('command')} className={cn('card flex-1 text-center text-sm cursor-pointer', hookType === 'command' && 'border-accent-orange')}>Command</button>
                      <button onClick={() => setHookType('prompt')} className={cn('card flex-1 text-center text-sm cursor-pointer', hookType === 'prompt' && 'border-accent-orange')}>Prompt</button>
                    </div>
                  </div>
                  <div>
                    <label className="label">{hookType === 'command' ? 'Shell Command' : 'Prompt'}</label>
                    <textarea value={hookCommand} onChange={(e) => setHookCommand(e.target.value)}
                      placeholder={hookType === 'command' ? 'python -m black "$CLAUDE_FILE"' : 'Evaluate whether this tool use is safe...'}
                      className="textarea font-mono" rows={3}
                    />
                  </div>
                  {hookType === 'command' && (
                    <div>
                      <label className="label">Timeout (ms)</label>
                      <input type="number" value={hookTimeout} onChange={(e) => setHookTimeout(parseInt(e.target.value) || 60000)} className="input" />
                    </div>
                  )}
                </div>
              )}
              {wizardStep === 3 && (
                <CodeEditor
                  value={JSON.stringify({
                    [selectedEvent]: [{
                      matcher,
                      hooks: [{ type: hookType, ...(hookType === 'command' ? { command: hookCommand, timeout: hookTimeout } : { prompt: hookCommand }) }]
                    }]
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

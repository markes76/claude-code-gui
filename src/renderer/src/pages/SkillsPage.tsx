import React, { useEffect, useState, useCallback } from 'react'
import { Zap, Plus, Edit3, Trash2, Eye, Search, FolderOpen, Save } from 'lucide-react'
import { cn, getApi, parseFrontmatter, buildFrontmatter } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { SearchInput } from '../components/shared/SearchInput'
import { Modal } from '../components/shared/Modal'
import { StepWizard, type WizardStepDef } from '../components/shared/StepWizard'
import { CodeEditor } from '../components/shared/CodeEditor'
import type { SkillInfo } from '../types/config'

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'basic', title: 'Basic Info', description: 'Name and description for your skill' },
  { id: 'frontmatter', title: 'Configuration', description: 'Configure skill frontmatter options' },
  { id: 'content', title: 'Instructions', description: 'Write the skill instructions in Markdown' },
  { id: 'review', title: 'Review', description: 'Review and create your skill' },
]

export function SkillsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SkillInfo | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0)
  const [skillName, setSkillName] = useState('')
  const [skillDesc, setSkillDesc] = useState('')
  const [skillScope, setSkillScope] = useState<'user' | 'project'>('user')
  const [skillModel, setSkillModel] = useState('')
  const [skillAllowedTools, setSkillAllowedTools] = useState('')
  const [skillContext, setSkillContext] = useState('')
  const [skillBody, setSkillBody] = useState('')

  const loadSkills = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const result = await api.config.listSkills(currentProjectDir)
      setSkills(result || [])
    } catch { }
    setLoading(false)
  }, [currentProjectDir])

  useEffect(() => { loadSkills() }, [loadSkills])

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  )

  const resetWizard = () => {
    setWizardStep(0)
    setSkillName('')
    setSkillDesc('')
    setSkillScope('user')
    setSkillModel('')
    setSkillAllowedTools('')
    setSkillContext('')
    setSkillBody('# Instructions\n\nDescribe what this skill should do when invoked.\n\nUse `$ARGUMENTS` to reference user input.\n')
  }

  const handleCreate = async () => {
    const api = getApi()
    if (!api) return

    const fm: Record<string, string> = { name: skillName, description: skillDesc }
    if (skillModel) fm.model = skillModel
    if (skillAllowedTools) fm['allowed-tools'] = skillAllowedTools
    if (skillContext) fm.context = skillContext

    const content = buildFrontmatter(fm) + skillBody

    const result = await api.config.saveSkill({
      name: skillName,
      content,
      scope: skillScope,
      projectDir: currentProjectDir,
    })

    if (result.success) {
      addActivity({ type: 'config', message: `Created skill: ${skillName}`, status: 'success' })
      setShowWizard(false)
      resetWizard()
      loadSkills()
    } else {
      addActivity({ type: 'config', message: `Failed to create skill: ${result.error}`, status: 'error' })
    }
  }

  const handleDelete = async (skill: SkillInfo) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.deleteSkill(skill.path)
    if (result.success) {
      addActivity({ type: 'config', message: `Deleted skill: ${skill.name}`, status: 'success' })
      loadSkills()
    }
  }

  const handleSaveEdit = async () => {
    if (!editingSkill) return
    const api = getApi()
    if (!api) return

    const result = await api.fs.write(editingSkill.path + '/SKILL.md', editingSkill.content)
    if (result.success) {
      addActivity({ type: 'config', message: `Updated skill: ${editingSkill.name}`, status: 'success' })
      setShowEditor(false)
      setEditingSkill(null)
      loadSkills()
    }
  }

  const canAdvance = () => {
    switch (wizardStep) {
      case 0: return skillName.trim().length > 0 && skillDesc.trim().length > 0
      case 1: return true
      case 2: return skillBody.trim().length > 0
      case 3: return true
      default: return false
    }
  }

  const generatePreview = () => {
    const fm: Record<string, string> = { name: skillName, description: skillDesc }
    if (skillModel) fm.model = skillModel
    if (skillAllowedTools) fm['allowed-tools'] = skillAllowedTools
    if (skillContext) fm.context = skillContext
    return buildFrontmatter(fm) + skillBody
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search skills..." className="w-64" />
          <span className="text-xs text-text-muted">{filtered.length} skills</span>
        </div>
        <button onClick={() => { resetWizard(); setShowWizard(true) }} className="btn-primary text-sm">
          <Plus size={16} />
          Create Skill
        </button>
      </div>

      {/* Skills List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading skills...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="No Skills Found"
            description="Skills are reusable prompts invoked with /command syntax. Create your first skill to get started."
            action={
              <button onClick={() => { resetWizard(); setShowWizard(true) }} className="btn-primary text-sm">
                <Plus size={16} /> Create Skill
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((skill) => (
              <div key={skill.path} className="card-hover group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-accent-orange" />
                    <span className="font-medium text-sm">/{skill.name}</span>
                  </div>
                  <span className={cn('badge', skill.scope === 'user' ? 'badge-blue' : 'badge-purple')}>
                    {skill.scope}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-3 line-clamp-2">{skill.description || 'No description'}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingSkill(skill); setShowEditor(true) }}
                    className="btn-ghost text-xs"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(skill)} className="btn-ghost text-xs text-accent-red">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWizard(false)} />
          <div className="relative w-full max-w-3xl mx-4 bg-bg-card border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <StepWizard
              steps={WIZARD_STEPS}
              currentStep={wizardStep}
              onStepChange={setWizardStep}
              onComplete={handleCreate}
              onCancel={() => setShowWizard(false)}
              canAdvance={canAdvance()}
              completeLabel="Create Skill"
            >
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Skill Name</label>
                    <input
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-skill"
                      className="input"
                    />
                    <p className="text-xs text-text-muted mt-1">Lowercase, hyphens only. Becomes /{skillName || 'my-skill'}</p>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      value={skillDesc}
                      onChange={(e) => setSkillDesc(e.target.value)}
                      placeholder="Describe when this skill should be used..."
                      className="textarea"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="label">Scope</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSkillScope('user')}
                        className={cn('card flex-1 text-center text-sm cursor-pointer', skillScope === 'user' && 'border-accent-orange text-accent-orange')}
                      >
                        User (Global)
                      </button>
                      <button
                        onClick={() => setSkillScope('project')}
                        className={cn('card flex-1 text-center text-sm cursor-pointer', skillScope === 'project' && 'border-accent-orange text-accent-orange')}
                      >
                        Project
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Model (Optional)</label>
                    <select value={skillModel} onChange={(e) => setSkillModel(e.target.value)} className="input">
                      <option value="">Default</option>
                      <option value="opus">Opus (most capable)</option>
                      <option value="sonnet">Sonnet (balanced)</option>
                      <option value="haiku">Haiku (fastest)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Allowed Tools (Optional)</label>
                    <input
                      value={skillAllowedTools}
                      onChange={(e) => setSkillAllowedTools(e.target.value)}
                      placeholder="Read, Write, Bash"
                      className="input"
                    />
                    <p className="text-xs text-text-muted mt-1">Comma-separated. Leave empty for all tools.</p>
                  </div>
                  <div>
                    <label className="label">Context (Optional)</label>
                    <select value={skillContext} onChange={(e) => setSkillContext(e.target.value)} className="input">
                      <option value="">Default (main context)</option>
                      <option value="fork">Fork (runs as subagent)</option>
                    </select>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <CodeEditor
                  value={skillBody}
                  onChange={setSkillBody}
                  language="markdown"
                  placeholder="Write the skill instructions..."
                  minHeight="300px"
                />
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="text-sm text-text-secondary">Review the generated SKILL.md:</div>
                  <CodeEditor
                    value={generatePreview()}
                    onChange={() => {}}
                    language="markdown"
                    readOnly
                    minHeight="300px"
                  />
                  <div className="text-xs text-text-muted">
                    Will be saved to: {skillScope === 'user' ? '~/.claude' : '.claude'}/skills/{skillName}/SKILL.md
                  </div>
                </div>
              )}
            </StepWizard>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditor && editingSkill && (
        <Modal
          open={showEditor}
          onClose={() => { setShowEditor(false); setEditingSkill(null) }}
          title={`Edit Skill: ${editingSkill.name}`}
          size="xl"
          footer={
            <>
              <button onClick={() => setShowEditor(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveEdit} className="btn-primary">
                <Save size={14} /> Save
              </button>
            </>
          }
        >
          <CodeEditor
            value={editingSkill.content}
            onChange={(val) => setEditingSkill({ ...editingSkill, content: val })}
            language="markdown"
            minHeight="400px"
          />
        </Modal>
      )}
    </div>
  )
}


import React, { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Plus, Trash2, Save, RotateCcw, Globe, FolderOpen,
  FileText, Eye, EyeOff, ChevronRight, ChevronDown, Filter, Code
} from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { CodeEditor } from '../components/shared/CodeEditor'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import ReactMarkdown from 'react-markdown'

interface RuleFile {
  name: string
  path: string
  size: number
  modified: number
  scope: 'global' | 'project'
  subdirectory?: string
  hasPaths: boolean
  pathPatterns: string[]
}

type ScopeFilter = 'all' | 'global' | 'project'

export function RulesPage() {
  const { claudePaths, currentProjectDir, addActivity } = useAppStore()
  const [rules, setRules] = useState<RuleFile[]>([])
  const [selectedRule, setSelectedRule] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [showNewRule, setShowNewRule] = useState(false)
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleScope, setNewRuleScope] = useState<'global' | 'project'>('project')
  const [newRulePaths, setNewRulePaths] = useState('')

  const isDirty = fileContent !== originalContent

  // Parse frontmatter paths from content
  const parsePaths = useCallback((content: string): string[] => {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return []

    const pathsMatch = frontmatterMatch[1].match(/paths:\s*\n((?:\s*-\s*.+\n?)*)/)
    if (!pathsMatch) return []

    return pathsMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*-\s*["']?/, '').replace(/["']?\s*$/, ''))
      .filter(Boolean)
  }, [])

  // Load all rules
  const loadRules = useCallback(async () => {
    const api = getApi()
    if (!api || !claudePaths) return

    setLoading(true)
    const allRules: RuleFile[] = []

    // Global rules (~/.claude/rules/)
    const globalRulesDir = `${claudePaths.globalConfig}/rules`
    try {
      const globalResult = await api.fs.listDir(globalRulesDir)
      if (globalResult.exists) {
        const processEntries = async (entries: any[], subdir?: string) => {
          for (const entry of entries) {
            if (entry.isDirectory) {
              const subResult = await api.fs.listDir(entry.path)
              if (subResult.exists) {
                await processEntries(subResult.entries, entry.name)
              }
            } else if (entry.isFile && entry.name.endsWith('.md')) {
              const content = await api.fs.read(entry.path)
              const paths = parsePaths(content.content || '')
              allRules.push({
                name: entry.name,
                path: entry.path,
                size: entry.size,
                modified: entry.modified,
                scope: 'global',
                subdirectory: subdir,
                hasPaths: paths.length > 0,
                pathPatterns: paths,
              })
            }
          }
        }
        await processEntries(globalResult.entries)
      }
    } catch (err) {
      console.error('Failed to load global rules:', err)
    }

    // Project rules (.claude/rules/)
    if (currentProjectDir) {
      const projectRulesDir = `${currentProjectDir}/.claude/rules`
      try {
        const projectResult = await api.fs.listDir(projectRulesDir)
        if (projectResult.exists) {
          const processEntries = async (entries: any[], subdir?: string) => {
            for (const entry of entries) {
              if (entry.isDirectory) {
                const subResult = await api.fs.listDir(entry.path)
                if (subResult.exists) {
                  await processEntries(subResult.entries, entry.name)
                }
              } else if (entry.isFile && entry.name.endsWith('.md')) {
                const content = await api.fs.read(entry.path)
                const paths = parsePaths(content.content || '')
                allRules.push({
                  name: entry.name,
                  path: entry.path,
                  size: entry.size,
                  modified: entry.modified,
                  scope: 'project',
                  subdirectory: subdir,
                  hasPaths: paths.length > 0,
                  pathPatterns: paths,
                })
              }
            }
          }
          await processEntries(projectResult.entries)
        }
      } catch (err) {
        console.error('Failed to load project rules:', err)
      }
    }

    setRules(allRules)
    setLoading(false)
  }, [claudePaths, currentProjectDir, parsePaths])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  // Load selected rule
  const selectRule = useCallback(async (filePath: string) => {
    const api = getApi()
    if (!api) return

    setSelectedRule(filePath)
    const result = await api.fs.read(filePath)
    const content = result.content || ''
    setFileContent(content)
    setOriginalContent(content)
  }, [])

  // Save rule
  const handleSave = useCallback(async () => {
    const api = getApi()
    if (!api || !selectedRule) return

    setSaving(true)
    try {
      await api.fs.write(selectedRule, fileContent)
      setOriginalContent(fileContent)
      addActivity({ type: 'config', message: `Saved rule: ${selectedRule.split('/').pop()}`, status: 'success' })
      // Refresh to update path patterns
      loadRules()
    } catch (err) {
      addActivity({ type: 'config', message: 'Failed to save rule', status: 'error' })
    }
    setSaving(false)
  }, [selectedRule, fileContent, addActivity, loadRules])

  // Create new rule
  const createRule = useCallback(async () => {
    const api = getApi()
    if (!api || !newRuleName.trim()) return

    let baseDir: string
    if (newRuleScope === 'global') {
      if (!claudePaths) return
      baseDir = `${claudePaths.globalConfig}/rules`
    } else {
      if (!currentProjectDir) return
      baseDir = `${currentProjectDir}/.claude/rules`
    }

    const fileName = newRuleName.trim().toLowerCase().replace(/\s+/g, '-')
    const fullName = fileName.endsWith('.md') ? fileName : `${fileName}.md`
    const filePath = `${baseDir}/${fullName}`

    let content = ''
    if (newRulePaths.trim()) {
      const paths = newRulePaths.split('\n').filter(Boolean).map(p => p.trim())
      content = `---\npaths:\n${paths.map(p => `  - "${p}"`).join('\n')}\n---\n\n`
    }
    content += `# ${newRuleName.trim()}\n\n`

    await api.fs.write(filePath, content)
    setNewRuleName('')
    setNewRulePaths('')
    setShowNewRule(false)
    addActivity({ type: 'config', message: `Created rule: ${fullName}`, status: 'success' })
    await loadRules()
    selectRule(filePath)
  }, [newRuleName, newRuleScope, newRulePaths, claudePaths, currentProjectDir, addActivity, loadRules, selectRule])

  // Delete rule
  const deleteRule = useCallback(async (filePath: string) => {
    const api = getApi()
    if (!api) return

    await api.fs.delete(filePath)
    if (selectedRule === filePath) {
      setSelectedRule(null)
      setFileContent('')
      setOriginalContent('')
    }
    addActivity({ type: 'config', message: `Deleted rule: ${filePath.split('/').pop()}`, status: 'success' })
    await loadRules()
  }, [selectedRule, addActivity, loadRules])

  const filteredRules = rules.filter(r => {
    if (scopeFilter === 'all') return true
    return r.scope === scopeFilter
  })

  const globalCount = rules.filter(r => r.scope === 'global').length
  const projectCount = rules.filter(r => r.scope === 'project').length

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-accent-green" />
          <h2 className="text-sm font-heading font-semibold">Rules</h2>
          <span className="text-xs text-text-muted">.claude/rules/*.md</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            {(['all', 'global', 'project'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScopeFilter(s)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] transition-all',
                  scopeFilter === s
                    ? 'bg-accent-orange/10 text-accent-orange font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {s === 'all' ? `All (${rules.length})` : s === 'global' ? `Global (${globalCount})` : `Project (${projectCount})`}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewRule(true)} className="btn-primary text-xs">
            <Plus size={14} /> New Rule
          </button>
          <button onClick={loadRules} className="btn-ghost text-xs">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Rules list */}
        <div className="w-80 border-r border-border overflow-y-auto bg-bg-secondary/30">
          {loading ? (
            <div className="p-6 text-center text-xs text-text-muted">Loading rules...</div>
          ) : filteredRules.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<BookOpen size={24} />}
                title="No Rules"
                description={rules.length === 0
                  ? "Create modular rules to organize project instructions by topic."
                  : "No rules match the selected filter."}
              />
            </div>
          ) : (
            <div className="py-1">
              {filteredRules.map((rule) => (
                <button
                  key={rule.path}
                  onClick={() => selectRule(rule.path)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-bg-tertiary transition-colors group border-b border-border/50',
                    selectedRule === rule.path && 'bg-accent-green/5 border-l-2 border-l-accent-green'
                  )}
                >
                  <FileText size={14} className={cn(
                    'flex-shrink-0 mt-0.5',
                    selectedRule === rule.path ? 'text-accent-green' : 'text-text-muted'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {rule.subdirectory ? `${rule.subdirectory}/` : ''}{rule.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn(
                        'badge text-[9px]',
                        rule.scope === 'global'
                          ? 'bg-accent-blue/10 text-accent-blue'
                          : 'bg-accent-green/10 text-accent-green'
                      )}>
                        {rule.scope === 'global' ? <Globe size={8} /> : <FolderOpen size={8} />}
                        {rule.scope}
                      </span>
                      {rule.hasPaths && (
                        <span className="badge text-[9px] bg-accent-purple/10 text-accent-purple">
                          <Filter size={8} /> {rule.pathPatterns.length} path{rule.pathPatterns.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {rule.hasPaths && (
                      <div className="mt-1.5 space-y-0.5">
                        {rule.pathPatterns.slice(0, 2).map((p, i) => (
                          <div key={i} className="text-[9px] font-mono text-text-muted/60 truncate">
                            {p}
                          </div>
                        ))}
                        {rule.pathPatterns.length > 2 && (
                          <div className="text-[9px] text-text-muted/40">+{rule.pathPatterns.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRule(rule.path) }}
                    className="opacity-60 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-opacity flex-shrink-0"
                    title="Delete rule"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedRule ? (
            <>
              {/* File toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted min-w-0">
                  <FileText size={12} />
                  <span className="font-mono truncate">{selectedRule}</span>
                  {isDirty && <span className="text-accent-orange font-medium">(unsaved)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost text-xs">
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPreview ? 'Editor' : 'Preview'}
                  </button>
                  <button onClick={() => selectRule(selectedRule)} className="btn-ghost text-xs">
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="btn-primary text-xs"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Path patterns info bar */}
              {parsePaths(fileContent).length > 0 && (
                <div className="px-4 py-2 border-b border-border bg-accent-purple/5">
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                    <Filter size={10} className="inline mr-1" /> Path Scope (only applies to matching files)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {parsePaths(fileContent).map((p, i) => (
                      <code key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-accent-purple font-mono">
                        {p}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor / Preview */}
              <div className="flex-1 overflow-hidden">
                {showPreview ? (
                  <div className="h-full overflow-y-auto p-6 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{fileContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full">
                    <CodeEditor
                      value={fileContent}
                      onChange={setFileContent}
                      language="markdown"
                      placeholder="Write your rule here... Use YAML frontmatter with paths: to scope to specific files."
                      minHeight="100%"
                      maxHeight="100%"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <EmptyState
                  icon={<BookOpen size={32} />}
                  title="Select a Rule"
                  description="Choose a rule from the sidebar to view or edit. Rules are modular markdown files that organize project instructions by topic."
                />
                <div className="mt-4 p-4 rounded-lg bg-bg-secondary border border-border text-left">
                  <div className="text-xs font-medium text-text-secondary mb-2">Path-Scoped Rules</div>
                  <div className="text-[11px] text-text-muted font-mono whitespace-pre">{`---
paths:
  - "src/api/**/*.ts"
  - "src/**/*.{ts,tsx}"
---

# API Rules
- All endpoints must validate input
- Use standard error format`}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New rule modal */}
      {showNewRule && (
        <Modal open={showNewRule} title="New Rule" onClose={() => setShowNewRule(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Rule Name</label>
              <input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. code-style, testing, security, api-design"
                className="input w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Scope</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewRuleScope('project')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border text-xs transition-all',
                    newRuleScope === 'project'
                      ? 'border-accent-green bg-accent-green/10 text-accent-green'
                      : 'border-border text-text-muted hover:border-border-hover'
                  )}
                >
                  <FolderOpen size={14} className="inline mr-1" /> Project
                  <div className="text-[10px] mt-0.5 opacity-70">.claude/rules/</div>
                </button>
                <button
                  onClick={() => setNewRuleScope('global')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border text-xs transition-all',
                    newRuleScope === 'global'
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border text-text-muted hover:border-border-hover'
                  )}
                >
                  <Globe size={14} className="inline mr-1" /> Global
                  <div className="text-[10px] mt-0.5 opacity-70">~/.claude/rules/</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Path Patterns <span className="text-text-muted font-normal">(optional — leave empty for unconditional)</span>
              </label>
              <textarea
                value={newRulePaths}
                onChange={(e) => setNewRulePaths(e.target.value)}
                placeholder={"src/api/**/*.ts\nsrc/**/*.{ts,tsx}\ntests/**/*.test.ts"}
                className="input w-full h-20 font-mono text-xs"
              />
              <p className="text-[10px] text-text-muted mt-1">One glob pattern per line. Rules only apply when Claude works with matching files.</p>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewRule(false)} className="btn-ghost text-xs">Cancel</button>
              <button onClick={createRule} disabled={!newRuleName.trim()} className="btn-primary text-xs">
                <Plus size={14} /> Create Rule
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

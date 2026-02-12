import React, { useEffect, useState, useCallback } from 'react'
import {
  Brain, FolderOpen, FileText, Save, RotateCcw, Plus, Trash2,
  ChevronRight, ChevronDown, Layers, Eye, EyeOff, AlertTriangle,
  Database, Globe, Lock, BookOpen, Pencil
} from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { CodeEditor } from '../components/shared/CodeEditor'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import ReactMarkdown from 'react-markdown'

interface MemoryFile {
  name: string
  path: string
  size: number
  modified: number
  isEntrypoint: boolean
}

interface MemoryProject {
  name: string
  dirPath: string
  files: MemoryFile[]
}

interface HierarchyItem {
  level: string
  label: string
  path: string | null
  exists: boolean
  description: string
  scope: 'organization' | 'user' | 'project' | 'local' | 'auto'
  icon: React.ReactNode
}

type ViewTab = 'browser' | 'hierarchy'

export function MemoryPage() {
  const { claudePaths, currentProjectDir, addActivity } = useAppStore()
  const [viewTab, setViewTab] = useState<ViewTab>('browser')

  // Browser state
  const [projects, setProjects] = useState<MemoryProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // Hierarchy state
  const [hierarchy, setHierarchy] = useState<HierarchyItem[]>([])

  const isDirty = fileContent !== originalContent

  // Load all memory projects
  const loadProjects = useCallback(async () => {
    const api = getApi()
    if (!api || !claudePaths) return

    setLoading(true)
    try {
      const projectsDir = `${claudePaths.globalConfig}/projects`
      const projectsDirResult = await api.fs.listDir(projectsDir)
      if (!projectsDirResult.exists) {
        setProjects([])
        setLoading(false)
        return
      }

      const memProjects: MemoryProject[] = []

      for (const entry of projectsDirResult.entries) {
        if (!entry.isDirectory) continue
        const memDir = `${entry.path}/memory`
        const memDirResult = await api.fs.listDir(memDir)
        if (!memDirResult.exists || memDirResult.entries.length === 0) continue

        const files: MemoryFile[] = memDirResult.entries
          .filter((f: any) => f.isFile && f.name.endsWith('.md'))
          .map((f: any) => ({
            name: f.name,
            path: f.path,
            size: f.size,
            modified: f.modified,
            isEntrypoint: f.name === 'MEMORY.md'
          }))
          .sort((a: MemoryFile, b: MemoryFile) => {
            // MEMORY.md first, then alphabetical
            if (a.isEntrypoint) return -1
            if (b.isEntrypoint) return 1
            return a.name.localeCompare(b.name)
          })

        if (files.length > 0) {
          // Decode project name from directory name
          const projectName = entry.name.replace(/-/g, '/').replace(/^\//, '')
          memProjects.push({
            name: projectName,
            dirPath: memDir,
            files,
          })
        }
      }

      setProjects(memProjects)

      // Auto-expand current project
      if (currentProjectDir) {
        const encoded = currentProjectDir.replace(/[/\\]/g, '-')
        const match = memProjects.find(p => p.dirPath.includes(encoded))
        if (match) {
          setExpandedProjects(new Set([match.dirPath]))
          setSelectedProject(match.dirPath)
        }
      }
    } catch (err) {
      console.error('Failed to load memory projects:', err)
    }
    setLoading(false)
  }, [claudePaths, currentProjectDir])

  // Load hierarchy
  const loadHierarchy = useCallback(async () => {
    const api = getApi()
    if (!api || !claudePaths) return

    const items: HierarchyItem[] = []

    // 1. Managed policy (macOS)
    const managedPath = '/Library/Application Support/ClaudeCode/CLAUDE.md'
    const managedExists = await api.fs.exists(managedPath)
    items.push({
      level: '1',
      label: 'Managed Policy',
      path: managedPath,
      exists: managedExists,
      description: 'Organization-wide instructions managed by IT/DevOps',
      scope: 'organization',
      icon: <Database size={14} />,
    })

    // 2. User global CLAUDE.md
    items.push({
      level: '2',
      label: 'User Global',
      path: claudePaths.globalClaudeMd,
      exists: await api.fs.exists(claudePaths.globalClaudeMd),
      description: 'Personal preferences for all projects (~/.claude/CLAUDE.md)',
      scope: 'user',
      icon: <Globe size={14} />,
    })

    // 3. User global rules
    const userRulesDir = `${claudePaths.globalConfig}/rules`
    const userRulesExist = await api.fs.exists(userRulesDir)
    items.push({
      level: '3',
      label: 'User Rules',
      path: userRulesDir,
      exists: userRulesExist,
      description: 'Personal rules for all projects (~/.claude/rules/*.md)',
      scope: 'user',
      icon: <BookOpen size={14} />,
    })

    if (currentProjectDir) {
      // 4. Project CLAUDE.md
      const projMd = `${currentProjectDir}/CLAUDE.md`
      items.push({
        level: '4',
        label: 'Project Root',
        path: projMd,
        exists: await api.fs.exists(projMd),
        description: 'Team-shared project instructions (./CLAUDE.md)',
        scope: 'project',
        icon: <FileText size={14} />,
      })

      // 5. Project .claude/CLAUDE.md
      const dotMd = `${currentProjectDir}/.claude/CLAUDE.md`
      items.push({
        level: '5',
        label: 'Project .claude/',
        path: dotMd,
        exists: await api.fs.exists(dotMd),
        description: 'Project instructions (.claude/CLAUDE.md)',
        scope: 'project',
        icon: <FileText size={14} />,
      })

      // 6. Project rules
      const projRulesDir = `${currentProjectDir}/.claude/rules`
      items.push({
        level: '6',
        label: 'Project Rules',
        path: projRulesDir,
        exists: await api.fs.exists(projRulesDir),
        description: 'Modular path-scoped rules (.claude/rules/*.md)',
        scope: 'project',
        icon: <BookOpen size={14} />,
      })

      // 7. CLAUDE.local.md
      const localMd = `${currentProjectDir}/CLAUDE.local.md`
      items.push({
        level: '7',
        label: 'Private (local)',
        path: localMd,
        exists: await api.fs.exists(localMd),
        description: 'Private per-project preferences (./CLAUDE.local.md)',
        scope: 'local',
        icon: <Lock size={14} />,
      })

      // 8. Auto memory
      const encodedProject = currentProjectDir.replace(/\//g, '-')
      const autoMemDir = `${claudePaths.globalConfig}/projects/${encodedProject}/memory`
      items.push({
        level: '8',
        label: 'Auto Memory',
        path: autoMemDir,
        exists: await api.fs.exists(autoMemDir),
        description: "Claude's automatic learnings (~/.claude/projects/<project>/memory/)",
        scope: 'auto',
        icon: <Brain size={14} />,
      })
    }

    setHierarchy(items)
  }, [claudePaths, currentProjectDir])

  useEffect(() => {
    loadProjects()
    loadHierarchy()
  }, [loadProjects, loadHierarchy])

  // Load selected file
  const selectFile = useCallback(async (filePath: string) => {
    const api = getApi()
    if (!api) return

    setSelectedFile(filePath)
    const result = await api.fs.read(filePath)
    const content = result.content || ''
    setFileContent(content)
    setOriginalContent(content)
  }, [])

  // Save file
  const handleSave = useCallback(async () => {
    const api = getApi()
    if (!api || !selectedFile) return

    setSaving(true)
    try {
      await api.fs.write(selectedFile, fileContent)
      setOriginalContent(fileContent)
      addActivity({ type: 'config', message: `Saved memory file: ${selectedFile.split('/').pop()}`, status: 'success' })
    } catch (err) {
      addActivity({ type: 'config', message: 'Failed to save memory file', status: 'error' })
    }
    setSaving(false)
  }, [selectedFile, fileContent, addActivity])

  // Create new topic file
  const [showNewFile, setShowNewFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  const createTopicFile = useCallback(async () => {
    const api = getApi()
    if (!api || !selectedProject || !newFileName.trim()) return

    const fileName = newFileName.trim().toLowerCase().replace(/\s+/g, '-')
    const fullName = fileName.endsWith('.md') ? fileName : `${fileName}.md`
    const filePath = `${selectedProject}/${fullName}`

    await api.fs.write(filePath, `# ${newFileName.trim()}\n\n`)
    setNewFileName('')
    setShowNewFile(false)
    addActivity({ type: 'config', message: `Created memory topic: ${fullName}`, status: 'success' })
    await loadProjects()
    selectFile(filePath)
  }, [selectedProject, newFileName, addActivity, loadProjects, selectFile])

  // Delete file
  const deleteFile = useCallback(async (filePath: string) => {
    const api = getApi()
    if (!api) return

    await api.fs.delete(filePath)
    if (selectedFile === filePath) {
      setSelectedFile(null)
      setFileContent('')
      setOriginalContent('')
    }
    addActivity({ type: 'config', message: `Deleted memory file: ${filePath.split('/').pop()}`, status: 'success' })
    await loadProjects()
  }, [selectedFile, addActivity, loadProjects])

  const toggleProject = (dirPath: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(dirPath)) {
        next.delete(dirPath)
      } else {
        next.add(dirPath)
      }
      return next
    })
    setSelectedProject(dirPath)
  }

  const scopeColors: Record<string, string> = {
    organization: 'text-accent-red',
    user: 'text-accent-blue',
    project: 'text-accent-green',
    local: 'text-accent-yellow',
    auto: 'text-accent-purple',
  }

  const scopeBadgeColors: Record<string, string> = {
    organization: 'bg-accent-red/10 text-accent-red',
    user: 'bg-accent-blue/10 text-accent-blue',
    project: 'bg-accent-green/10 text-accent-green',
    local: 'bg-accent-yellow/10 text-accent-yellow',
    auto: 'bg-accent-purple/10 text-accent-purple',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-3">
          <Brain size={18} className="text-accent-purple" />
          <h2 className="text-sm font-heading font-semibold">Memory System</h2>
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setViewTab('browser')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-all',
                viewTab === 'browser'
                  ? 'bg-accent-orange/10 text-accent-orange font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              Auto Memory
            </button>
            <button
              onClick={() => setViewTab('hierarchy')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-all',
                viewTab === 'hierarchy'
                  ? 'bg-accent-orange/10 text-accent-orange font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              <Layers size={12} className="inline mr-1" />
              Memory Hierarchy
            </button>
          </div>
        </div>
        {viewTab === 'browser' && (
          <button onClick={loadProjects} className="btn-ghost text-xs">
            <RotateCcw size={14} /> Refresh
          </button>
        )}
      </div>

      {viewTab === 'hierarchy' ? (
        /* ==================== HIERARCHY VIEW ==================== */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs text-text-muted mb-4">
              Claude Code loads memory in a hierarchical order. More specific instructions take precedence over broader ones.
              {!currentProjectDir && (
                <span className="ml-2 text-accent-yellow">
                  <AlertTriangle size={12} className="inline" /> Open a project to see project-level memory.
                </span>
              )}
            </div>

            <div className="space-y-2">
              {hierarchy.map((item) => (
                <div
                  key={item.level}
                  className={cn(
                    'card flex items-center gap-4 transition-all',
                    item.exists ? 'opacity-100' : 'opacity-50'
                  )}
                >
                  {/* Priority number */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    item.exists ? scopeBadgeColors[item.scope] : 'bg-bg-tertiary text-text-muted'
                  )}>
                    {item.level}
                  </div>

                  {/* Icon */}
                  <span className={cn('flex-shrink-0', scopeColors[item.scope])}>
                    {item.icon}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{item.label}</span>
                      <span className={cn('badge text-[10px]', scopeBadgeColors[item.scope])}>
                        {item.scope}
                      </span>
                      {item.exists ? (
                        <span className="badge-green text-[10px]">Active</span>
                      ) : (
                        <span className="badge bg-bg-tertiary text-text-muted text-[10px]">Not found</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{item.description}</div>
                    {item.path && (
                      <div className="text-[10px] font-mono text-text-muted/60 mt-0.5 truncate">{item.path}</div>
                    )}
                  </div>

                  {/* Precedence arrow */}
                  <div className="text-text-muted/30 text-xs flex-shrink-0">
                    {parseInt(item.level) < hierarchy.length ? '↓ overrides' : '← highest priority'}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 rounded-lg bg-bg-secondary border border-border">
              <div className="text-xs font-medium text-text-secondary mb-2">How Precedence Works</div>
              <div className="text-xs text-text-muted space-y-1">
                <p>Higher numbers override lower numbers. Auto Memory (level 8) has the highest specificity for project-level context.</p>
                <p>CLAUDE.md files in parent directories are loaded at launch. Files in child directories load on demand.</p>
                <p>The first 200 lines of MEMORY.md are loaded into every session's system prompt.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== BROWSER VIEW ==================== */
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - project/file tree */}
          <div className="w-72 border-r border-border overflow-y-auto bg-bg-secondary/30">
            {loading ? (
              <div className="p-6 text-center text-xs text-text-muted">Loading memory...</div>
            ) : projects.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<Brain size={24} />}
                  title="No Auto Memory"
                  description="Claude hasn't created any memory files yet. Use Claude Code and it will automatically save learnings."
                />
              </div>
            ) : (
              <div className="py-2">
                {projects.map((proj) => (
                  <div key={proj.dirPath}>
                    <button
                      onClick={() => toggleProject(proj.dirPath)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-tertiary transition-colors',
                        selectedProject === proj.dirPath && 'bg-bg-tertiary'
                      )}
                    >
                      {expandedProjects.has(proj.dirPath) ? (
                        <ChevronDown size={12} className="text-text-muted flex-shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
                      )}
                      <FolderOpen size={14} className="text-accent-purple flex-shrink-0" />
                      <span className="text-xs truncate text-text-secondary">{proj.name}</span>
                      <span className="ml-auto text-[10px] text-text-muted">{proj.files.length}</span>
                    </button>

                    {expandedProjects.has(proj.dirPath) && (
                      <div className="ml-4">
                        {proj.files.map((file) => (
                          <button
                            key={file.path}
                            onClick={() => selectFile(file.path)}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-tertiary transition-colors group',
                              selectedFile === file.path && 'bg-accent-purple/10 text-accent-purple'
                            )}
                          >
                            <FileText size={12} className={cn(
                              'flex-shrink-0',
                              file.isEntrypoint ? 'text-accent-purple' : 'text-text-muted'
                            )} />
                            <span className={cn(
                              'text-xs truncate',
                              file.isEntrypoint && 'font-medium',
                              selectedFile === file.path ? 'text-accent-purple' : 'text-text-secondary'
                            )}>
                              {file.name}
                            </span>
                            {file.isEntrypoint && (
                              <span className="text-[9px] text-accent-purple bg-accent-purple/10 px-1 rounded">entry</span>
                            )}
                            {!file.isEntrypoint && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteFile(file.path) }}
                                className="ml-auto opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-opacity"
                                title="Delete topic file"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </button>
                        ))}

                        {/* Add topic file button */}
                        <button
                          onClick={() => { setSelectedProject(proj.dirPath); setShowNewFile(true) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-text-muted hover:text-accent-purple hover:bg-bg-tertiary transition-colors"
                        >
                          <Plus size={12} />
                          <span>Add topic file</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFile ? (
              <>
                {/* File toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <div className="flex items-center gap-2 text-xs text-text-muted min-w-0">
                    <FileText size={12} />
                    <span className="font-mono truncate">{selectedFile}</span>
                    {isDirty && <span className="text-accent-orange font-medium">(unsaved)</span>}
                    {selectedFile.endsWith('MEMORY.md') && (
                      <span className="badge text-[10px] bg-accent-purple/10 text-accent-purple">
                        First 200 lines loaded per session
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost text-xs">
                      {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPreview ? 'Editor' : 'Preview'}
                    </button>
                    <button onClick={() => selectFile(selectedFile)} className="btn-ghost text-xs">
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
                        placeholder="Write memory notes..."
                        minHeight="100%"
                        maxHeight="100%"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={<Brain size={32} />}
                  title="Select a Memory File"
                  description="Choose a project and file from the sidebar to view or edit auto memory."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* New topic file modal */}
      {showNewFile && (
        <Modal open={showNewFile} title="New Topic File" onClose={() => setShowNewFile(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Topic Name</label>
              <input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. debugging, api-conventions, patterns"
                className="input w-full"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createTopicFile()}
              />
              <p className="text-[10px] text-text-muted mt-1">
                Will be saved as <span className="font-mono">{newFileName.trim().toLowerCase().replace(/\s+/g, '-') || 'topic'}.md</span> in the memory directory
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewFile(false)} className="btn-ghost text-xs">Cancel</button>
              <button onClick={createTopicFile} disabled={!newFileName.trim()} className="btn-primary text-xs">
                <Plus size={14} /> Create
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

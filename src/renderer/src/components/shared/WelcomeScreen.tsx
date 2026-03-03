import React, { useState, useCallback } from 'react'
import {
  FolderOpen, Shield, ShieldCheck, Clock, Sparkles,
  ChevronRight, AlertTriangle, ArrowLeft
} from 'lucide-react'
import { cn, getApi } from '../../lib/utils'
import { useAppStore } from '../../stores/app-store'

type Step = 'pick' | 'trust'

function getRecentProjects(): string[] {
  try { return JSON.parse(localStorage.getItem('claude-gui-recent-projects') || '[]') } catch { return [] }
}

function saveRecentProject(dir: string) {
  const recent = getRecentProjects()
  const updated = [dir, ...recent.filter(d => d !== dir)].slice(0, 10)
  localStorage.setItem('claude-gui-recent-projects', JSON.stringify(updated))
}

// ── Trust Dialog ──────────────────────────────────────────────────────────────

interface TrustDialogProps {
  dir: string
  previouslyTrusted: boolean
  onTrust: () => void
  onBack: () => void
}

function TrustDialog({ dir, previouslyTrusted, onTrust, onBack }: TrustDialogProps) {
  const folderName = dir.split('/').pop() || dir

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="w-full max-w-lg space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center',
            previouslyTrusted
              ? 'bg-accent-green/15 border border-accent-green/30'
              : 'bg-accent-orange/15 border border-accent-orange/30'
          )}>
            {previouslyTrusted
              ? <ShieldCheck size={32} className="text-accent-green" />
              : <Shield size={32} className="text-accent-orange" />
            }
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-heading font-bold text-text-primary">
            {previouslyTrusted ? 'Open trusted project?' : 'Do you trust this project?'}
          </h2>
          <p className="text-sm text-text-muted">
            {previouslyTrusted
              ? 'You have trusted this folder before.'
              : 'Claude Code will be able to read, write, and execute files in this folder.'}
          </p>
        </div>

        {/* Folder path */}
        <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-start gap-3">
          <FolderOpen size={16} className="text-accent-orange mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{folderName}</p>
            <p className="text-xs text-text-muted font-mono truncate mt-0.5">{dir}</p>
          </div>
        </div>

        {/* Warning (only for new folders) */}
        {!previouslyTrusted && (
          <div className="flex items-start gap-3 bg-accent-yellow/5 border border-accent-yellow/20 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-accent-yellow mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Only trust project folders you own or that come from a trusted source. Malicious code in a project can harm your system.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onTrust}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all',
              previouslyTrusted
                ? 'bg-accent-green text-white hover:bg-accent-green/90'
                : 'bg-accent-orange text-white hover:bg-accent-orange/90'
            )}
          >
            <ShieldCheck size={16} />
            {previouslyTrusted ? 'Open Project' : 'Yes, I trust this project'}
          </button>
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
          >
            <ArrowLeft size={14} />
            Choose a different folder
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Welcome / Project Picker ──────────────────────────────────────────────────

export function WelcomeScreen() {
  const { setCurrentProjectDir, setProjectTrusted, addTrustedProject, trustedProjects, addActivity } = useAppStore()
  const [step, setStep] = useState<Step>('pick')
  const [pendingDir, setPendingDir] = useState<string | null>(null)
  const recentProjects = getRecentProjects()

  const selectFolder = useCallback((dir: string) => {
    setPendingDir(dir)
    setStep('trust')
  }, [])

  const handlePickFolder = useCallback(async () => {
    const api = getApi()
    if (!api) return
    const dir = await api.fs.pickDirectory()
    if (dir) selectFolder(dir)
  }, [selectFolder])

  const handleTrust = useCallback(() => {
    if (!pendingDir) return
    saveRecentProject(pendingDir)
    setCurrentProjectDir(pendingDir)
    addTrustedProject(pendingDir)
    setProjectTrusted(true)
    addActivity({ type: 'session', message: `Opened project: ${pendingDir}`, status: 'success' })
  }, [pendingDir, setCurrentProjectDir, addTrustedProject, setProjectTrusted, addActivity])

  const handleBack = useCallback(() => {
    setPendingDir(null)
    setStep('pick')
  }, [])

  // ── Trust step ──
  if (step === 'trust' && pendingDir) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
        <WelcomeHeader />
        <div className="flex-1">
          <TrustDialog
            dir={pendingDir}
            previouslyTrusted={trustedProjects.includes(pendingDir)}
            onTrust={handleTrust}
            onBack={handleBack}
          />
        </div>
      </div>
    )
  }

  // ── Pick step ──
  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      <WelcomeHeader />

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-8">

          {/* Open folder CTA */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-heading font-bold text-text-primary">Open a Project</h2>
            <p className="text-sm text-text-muted">
              Select the folder you want Claude Code to work in.
            </p>
          </div>

          <button
            onClick={handlePickFolder}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-accent-orange text-white text-sm font-semibold hover:bg-accent-orange/90 transition-all shadow-lg shadow-accent-orange/20"
          >
            <FolderOpen size={18} />
            Open Folder…
          </button>

          {/* Recent projects */}
          {recentProjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-muted font-medium uppercase tracking-wider px-1">
                <Clock size={11} />
                Recent
              </div>
              <div className="space-y-1">
                {recentProjects.slice(0, 6).map((dir) => {
                  const name = dir.split('/').pop() || dir
                  const isTrusted = trustedProjects.includes(dir)
                  return (
                    <button
                      key={dir}
                      onClick={() => selectFolder(dir)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-bg-secondary hover:bg-bg-tertiary border border-border hover:border-border/80 transition-all group"
                    >
                      <FolderOpen size={15} className="text-text-muted group-hover:text-accent-orange flex-shrink-0 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                        <p className="text-xs text-text-muted font-mono truncate">{dir}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isTrusted && (
                          <ShieldCheck size={12} className="text-accent-green opacity-70" title="Previously trusted" />
                        )}
                        <ChevronRight size={14} className="text-text-muted group-hover:text-text-primary transition-colors" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WelcomeHeader() {
  return (
    <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border drag-region">
      <div className="no-drag flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-orange to-accent-coral flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-heading font-bold text-text-primary">Claude Code</h1>
          <p className="text-[10px] text-text-muted">GUI Wrapper</p>
        </div>
      </div>
    </div>
  )
}

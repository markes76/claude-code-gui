import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Radio, ExternalLink, Square, Play, Trash2, Eye, EyeOff, ArrowRightLeft } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { getApi } from '../lib/utils'
import { StreamMessage, ClaudeStreamMessage } from '../components/shared/StreamMessage'
import { cn } from '../lib/utils'

const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
]

export function StreamPage() {
  const { currentProjectDir } = useAppStore()
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([])
  const [running, setRunning] = useState(false)
  const [watching, setWatching] = useState(false)
  const [mode, setMode] = useState<'run' | 'watch'>('run')
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [injectToTerminal, setInjectToTerminal] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Subscribe to stream events (both run mode and watch mode use same channel)
  useEffect(() => {
    const api = getApi()
    if (!api) return

    const unsubEvent = api.stream.onEvent((payload: { runId: string; event: ClaudeStreamMessage }) => {
      const event = payload.event
      if (payload.runId === 'watch') setWatching(true)
      setMessages(prev => {
        if (event.is_partial && event.message?.id) {
          let idx = -1
          for (let j = prev.length - 1; j >= 0; j--) {
            if (prev[j].message?.id === event.message!.id) { idx = j; break }
          }
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = event
            return updated
          }
        }
        return [...prev, event]
      })
    })

    const unsubDone = api.stream.onDone((payload: { runId: string; exitCode: number; stderr?: string }) => {
      setRunning(false)
      if (payload.exitCode !== 0 && payload.stderr) {
        setMessages(prev => [...prev, { type: 'result', subtype: 'error', result: payload.stderr } as any])
      }
    })

    const unsubCancelled = api.stream.onCancelled(() => {
      setRunning(false)
    })

    return () => {
      unsubEvent()
      unsubDone()
      unsubCancelled()
    }
  }, [])

  // Watch mode: poll active session JSONL
  const startWatch = useCallback(async () => {
    const api = getApi()
    if (!api) return
    setMessages([])
    const result = await api.stream.watchSession({ cwd: currentProjectDir || undefined })
    if (result.success) {
      setWatching(true)
    }
  }, [currentProjectDir])

  const stopWatch = useCallback(async () => {
    const api = getApi()
    if (!api) return
    await api.stream.unwatchSession()
    setWatching(false)
  }, [])

  // Switch mode
  const handleModeSwitch = useCallback(async (next: 'run' | 'watch') => {
    const api = getApi()
    if (!api) return
    if (mode === 'watch') await stopWatch()
    if (running) { await api.stream.cancel(); setRunning(false) }
    setMessages([])
    setMode(next)
    if (next === 'watch') await startWatch()
  }, [mode, running, startWatch, stopWatch])

  // Run mode: spawn claude -p
  const handleRun = useCallback(async () => {
    const api = getApi()
    if (!api || !prompt.trim()) return

    setMessages([])
    setRunning(true)

    // Also inject into active PTY terminal if requested
    if (injectToTerminal) {
      try {
        const sessions = await api.pty.listSessions()
        if (sessions.length > 0) {
          const latest = sessions[sessions.length - 1]
          api.pty.write(latest.id, prompt.trim() + '\n')
        }
      } catch { /* ignore if no terminal session */ }
    }

    const result = await api.stream.run({
      prompt: prompt.trim(),
      model,
      cwd: currentProjectDir || undefined,
    })
    if (!result?.runId) setRunning(false)
  }, [prompt, model, currentProjectDir, injectToTerminal])

  const handleStop = useCallback(async () => {
    const api = getApi()
    if (!api) return
    await api.stream.cancel()
    setRunning(false)
  }, [])

  const handlePopOut = useCallback(async () => {
    const api = getApi()
    if (!api) return
    await api.stream.openPopup()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !running) {
      e.preventDefault()
      handleRun()
    }
  }

  const isActive = running || watching

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
        <Radio size={15} className="text-accent-orange flex-shrink-0" />
        <h2 className="text-sm font-heading font-semibold">Live Stream</h2>
        {isActive && (
          <span className="flex items-center gap-1 text-xs text-accent-green">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            {watching ? 'Watching' : 'Live'}
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Mode toggle */}
          <div className="flex items-center rounded-lg border border-border bg-bg-tertiary text-xs overflow-hidden">
            <button
              onClick={() => handleModeSwitch('run')}
              className={cn(
                'px-2.5 py-1.5 flex items-center gap-1 transition-colors',
                mode === 'run'
                  ? 'bg-accent-orange/20 text-accent-orange font-medium'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Run a prompt — starts a new claude -p process"
            >
              <Play size={11} />
              Run
            </button>
            <button
              onClick={() => handleModeSwitch('watch')}
              className={cn(
                'px-2.5 py-1.5 flex items-center gap-1 transition-colors',
                mode === 'watch'
                  ? 'bg-accent-blue/20 text-accent-blue font-medium'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Watch — streams live from the active terminal session"
            >
              <Eye size={11} />
              Watch
            </button>
          </div>

          {/* Model (run mode only) */}
          {mode === 'run' && (
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={running}
              className="text-xs bg-bg-tertiary border border-border rounded-md px-2 py-1.5 text-text-primary disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-accent-orange"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          )}

          {/* Inject to terminal toggle (run mode only) */}
          {mode === 'run' && (
            <button
              onClick={() => setInjectToTerminal(v => !v)}
              className={cn(
                'p-1.5 rounded-md transition-colors text-xs',
                injectToTerminal
                  ? 'bg-accent-purple/20 text-accent-purple'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
              )}
              title={injectToTerminal ? 'Also sending to terminal (click to disable)' : 'Also send prompt to terminal'}
            >
              <ArrowRightLeft size={13} />
            </button>
          )}

          {/* Clear */}
          {messages.length > 0 && !isActive && (
            <button onClick={() => setMessages([])} className="btn-ghost p-1.5" title="Clear">
              <Trash2 size={13} />
            </button>
          )}

          {/* Pop Out */}
          <button onClick={handlePopOut} className="btn-ghost p-1.5 text-xs flex items-center gap-1" title="Pop out">
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Pop Out</span>
          </button>
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted">
            <Radio size={28} className="mb-3 opacity-20" />
            {mode === 'watch' ? (
              <>
                <p className="text-sm">Watching terminal session…</p>
                <p className="text-xs mt-1 opacity-60">Tool calls and responses appear here as Claude runs in the terminal</p>
              </>
            ) : (
              <>
                <p className="text-sm">Type a prompt below and click Run</p>
                <p className="text-xs mt-1 opacity-60">Tool calls stream as cards, text as markdown bubbles</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <StreamMessage key={i} msg={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Input (run mode only) */}
      {mode === 'run' && (
        <div className="border-t border-border px-4 py-3 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={running}
              placeholder="Enter a prompt… (⌘↵ to run)"
              rows={2}
              className="flex-1 resize-none bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-orange disabled:opacity-50 min-h-[60px] max-h-[140px]"
            />
            {running ? (
              <button
                onClick={handleStop}
                className="px-3 py-2 rounded-lg bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20 transition-colors text-sm font-medium flex items-center gap-1.5 flex-shrink-0"
              >
                <Square size={13} />
                Stop
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={!prompt.trim()}
                className="px-3 py-2 rounded-lg bg-accent-orange text-white hover:bg-accent-orange/90 transition-colors text-sm font-medium flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={13} />
                Run
              </button>
            )}
          </div>
          {injectToTerminal && (
            <p className="text-[10px] text-accent-purple mt-1.5 flex items-center gap-1">
              <ArrowRightLeft size={10} />
              Prompt will also be sent to the active terminal session
            </p>
          )}
        </div>
      )}

      {/* Watch mode stop button */}
      {mode === 'watch' && (
        <div className="border-t border-border px-4 py-3 flex-shrink-0 flex items-center gap-2">
          <span className="text-xs text-text-muted flex-1">
            {watching ? 'Streaming from active terminal session' : 'Not connected to a session'}
          </span>
          <button
            onClick={() => watching ? stopWatch() : startWatch()}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
              watching
                ? 'bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20'
                : 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20'
            )}
          >
            {watching ? <><EyeOff size={12} /> Stop Watch</> : <><Eye size={12} /> Start Watch</>}
          </button>
        </div>
      )}
    </div>
  )
}

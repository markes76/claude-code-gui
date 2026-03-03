import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Radio, ExternalLink, Square, Play, Trash2 } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { getApi } from '../lib/utils'
import { StreamMessage, ClaudeStreamMessage } from '../components/shared/StreamMessage'

const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
]

export function StreamPage() {
  const { currentProjectDir } = useAppStore()
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([])
  const [running, setRunning] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [runId, setRunId] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Subscribe to stream events
  useEffect(() => {
    const api = getApi()
    if (!api) return

    const unsubEvent = api.stream.onEvent((payload: { runId: string; event: ClaudeStreamMessage }) => {
      const event = payload.event
      setMessages(prev => {
        // Partial messages update in-place, keyed by message id
        if (event.is_partial && event.message?.id) {
          let idx = -1
          for (let j = prev.length - 1; j >= 0; j--) {
            if (prev[j].message?.id === event.message.id) { idx = j; break }
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

    const unsubDone = api.stream.onDone((_payload: { runId: string; exitCode: number }) => {
      setRunning(false)
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

  const handleRun = useCallback(async () => {
    const api = getApi()
    if (!api || !prompt.trim()) return

    setMessages([])
    setRunning(true)

    const result = await api.stream.run({
      prompt: prompt.trim(),
      model,
      cwd: currentProjectDir || undefined,
    })
    setRunId(result.runId)
  }, [prompt, model, currentProjectDir])

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-accent-orange" />
          <h2 className="text-sm font-heading font-semibold">Live Stream</h2>
          {running && (
            <span className="flex items-center gap-1 text-xs text-accent-green">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Model selector */}
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

          {/* Clear */}
          {messages.length > 0 && !running && (
            <button
              onClick={() => setMessages([])}
              className="btn-ghost text-xs gap-1"
              title="Clear feed"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Pop Out */}
          <button
            onClick={handlePopOut}
            className="btn-ghost text-xs gap-1"
            title="Pop out stream view"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Pop Out</span>
          </button>
        </div>
      </div>

      {/* Event feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-text-muted">
            <Radio size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Type a prompt below and click Run</p>
            <p className="text-xs mt-1 opacity-60">Tool calls and responses stream in live as cards</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <StreamMessage key={i} msg={msg} />
          ))
        )}
      </div>

      {/* Prompt input */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder="Enter a prompt… (⌘↵ to run)"
            rows={2}
            className="flex-1 resize-none bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-orange disabled:opacity-50 min-h-[64px] max-h-[160px]"
          />
          {running ? (
            <button
              onClick={handleStop}
              className="px-3 py-2 rounded-lg bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20 transition-colors text-sm font-medium flex items-center gap-2 flex-shrink-0"
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!prompt.trim()}
              className="px-3 py-2 rounded-lg bg-accent-orange text-white hover:bg-accent-orange/90 transition-colors text-sm font-medium flex items-center gap-2 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play size={14} />
              Run
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

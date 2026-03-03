import React, { useState, useEffect, useRef } from 'react'
import { Radio, X } from 'lucide-react'
import { getApi } from '../lib/utils'
import { StreamMessage, ClaudeStreamMessage } from '../components/shared/StreamMessage'

export function StreamPopup() {
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([])
  const [running, setRunning] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // Apply app theme from localStorage (popup is a separate BrowserWindow,
  // App.tsx theme useEffect doesn't run here)
  useEffect(() => {
    const theme = localStorage.getItem('claude-gui-theme') || 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Load existing events from current run (catch-up)
  useEffect(() => {
    const api = getApi()
    if (!api) return

    api.stream.getEvents().then((data: { runId: string | null; events: ClaudeStreamMessage[] }) => {
      if (data.events.length > 0) {
        setMessages(data.events)
      }
    }).catch(() => { /* ignore */ })
  }, [])

  // Subscribe to live events
  useEffect(() => {
    const api = getApi()
    if (!api) return

    const unsubEvent = api.stream.onEvent((payload: { runId: string; event: ClaudeStreamMessage }) => {
      const event = payload.event
      setRunning(true)
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

    const unsubDone = api.stream.onDone(() => {
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

  const handleClose = () => {
    window.close()
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      {/* Minimal drag header */}
      <div className="flex items-center gap-2 px-4 pt-7 pb-2 border-b border-border flex-shrink-0 drag-region">
        <div className="no-drag flex items-center gap-2 flex-1">
          <Radio size={14} className="text-accent-orange" />
          <span className="text-xs font-medium text-text-secondary">Claude Stream</span>
          {running && (
            <span className="flex items-center gap-1 text-[10px] text-accent-green">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="no-drag p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
          title="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted">
            <Radio size={24} className="mb-2 opacity-30" />
            <p className="text-xs">Waiting for a stream run…</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <StreamMessage key={i} msg={msg} />
          ))
        )}
      </div>
    </div>
  )
}

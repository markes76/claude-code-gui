import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Radio, ExternalLink, Trash2, Send, Copy, Check } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { getApi } from '../lib/utils'
import { StreamMessage, ClaudeStreamMessage, messagesToText } from '../components/shared/StreamMessage'

export function StreamPage() {
  const { currentProjectDir } = useAppStore()
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [prompt, setPrompt] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const handleCopyAll = useCallback(() => {
    if (messages.length === 0) return
    navigator.clipboard.writeText(messagesToText(messages)).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    }).catch(() => {})
  }, [messages])

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Auto-start watching on mount, stop on unmount
  useEffect(() => {
    const api = getApi()
    if (!api) return

    api.stream.watchSession({ cwd: currentProjectDir || undefined })
      .then(() => setConnected(true))
      .catch(() => setConnected(false))

    return () => {
      api.stream.unwatchSession().catch(() => {})
      setConnected(false)
    }
  }, [currentProjectDir])

  // Subscribe to live stream events
  useEffect(() => {
    const api = getApi()
    if (!api) return

    const unsub = api.stream.onEvent((payload: { runId: string; event: ClaudeStreamMessage }) => {
      const event = payload.event
      setMessages(prev => {
        // Partial messages update in-place
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

    return unsub
  }, [])

  // Send prompt to the active terminal PTY session
  const handleSend = useCallback(async () => {
    const api = getApi()
    if (!api || !prompt.trim()) return

    try {
      const sessions = await api.pty.listSessions()
      if (sessions.length > 0) {
        const latest = sessions[sessions.length - 1]
        api.pty.write(latest.id, prompt.trim() + '\n')
        setPrompt('')
      }
    } catch { /* no active terminal session */ }
  }, [prompt])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
        <Radio size={15} className="text-accent-orange flex-shrink-0" />
        <h2 className="text-sm font-heading font-semibold">Live Stream</h2>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`} />
          {connected ? 'Watching terminal' : 'Connecting…'}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          {messages.length > 0 && (
            <>
              <button
                onClick={handleCopyAll}
                className="btn-ghost p-1.5 flex items-center gap-1 text-xs"
                title="Copy entire stream"
              >
                {copiedAll ? <Check size={13} className="text-accent-green" /> : <Copy size={13} />}
                <span className="hidden sm:inline">{copiedAll ? 'Copied!' : 'Copy All'}</span>
              </button>
              <button onClick={() => setMessages([])} className="btn-ghost p-1.5" title="Clear">
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button
            onClick={() => getApi()?.stream.openPopup()}
            className="btn-ghost p-1.5 flex items-center gap-1 text-xs"
            title="Pop out stream window"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Pop Out</span>
          </button>
        </div>
      </div>

      {/* Event feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted">
            <Radio size={28} className="mb-3 opacity-20" />
            <p className="text-sm">Watching your terminal session</p>
            <p className="text-xs mt-1 opacity-60">Tool calls and responses appear here as Claude runs</p>
            <p className="text-xs mt-3 opacity-40">Or type below to send a prompt to the terminal</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <StreamMessage key={i} msg={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Input — sends to terminal */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a prompt to send to the terminal… (⌘↵)"
            rows={2}
            className="flex-1 resize-none bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-orange min-h-[60px] max-h-[140px]"
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim()}
            className="px-3 py-2 rounded-lg bg-accent-orange text-white hover:bg-accent-orange/90 transition-colors text-sm font-medium flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={13} />
            Send
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5">Sends directly to the active terminal session</p>
      </div>
    </div>
  )
}

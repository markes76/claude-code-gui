import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  FileText, PenLine, Terminal, Globe, Bot, Wrench,
  ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Copy, Check
} from 'lucide-react'
import { cn, formatCost } from '../../lib/utils'

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }
  return { copied, copy }
}

function CopyBtn({ text }: { text: string }) {
  const { copied, copy } = useCopy()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(text) }}
      className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1 rounded bg-bg-tertiary hover:bg-bg-primary text-text-muted hover:text-text-primary"
      title="Copy"
    >
      {copied ? <Check size={11} className="text-accent-green" /> : <Copy size={11} />}
    </button>
  )
}

export function messagesToText(messages: ClaudeStreamMessage[]): string {
  return messages.map(msg => {
    if (msg.type === 'assistant' && msg.message) {
      return msg.message.content.map(b => {
        if (b.type === 'text') return `[Assistant]\n${b.text}`
        if (b.type === 'tool_use') return `[Tool: ${b.name}]\n${JSON.stringify(b.input, null, 2)}`
        return ''
      }).filter(Boolean).join('\n\n')
    }
    if (msg.type === 'tool_result') {
      const raw = msg.content
      const text = typeof raw === 'string' ? raw
        : Array.isArray(raw) ? raw.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') : ''
      return text ? `[Result${msg.is_error ? ' (error)' : ''}]\n${text}` : ''
    }
    if (msg.type === 'result') {
      const parts = ['[Run Complete]']
      if (msg.subtype) parts.push(`Status: ${msg.subtype}`)
      if (msg.cost_usd) parts.push(`Cost: ${formatCost(msg.cost_usd)}`)
      if (msg.duration_ms) parts.push(`Duration: ${(msg.duration_ms / 1000).toFixed(1)}s`)
      if (msg.result) parts.push(msg.result)
      return parts.join(' | ')
    }
    return ''
  }).filter(Boolean).join('\n\n')
}

// ── Types (matches Claude CLI --output-format stream-json) ─────────────

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: object }

export interface ClaudeStreamMessage {
  type: 'system' | 'assistant' | 'tool_result' | 'result'
  subtype?: string
  role?: 'user' | 'assistant'
  message?: {
    id: string
    model: string
    content: ContentBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  tool_use_id?: string
  content?: string | ContentBlock[]
  is_error?: boolean
  is_partial?: boolean
  cost_usd?: number
  duration_ms?: number
  result?: string
}

// ── Tool icon map ──────────────────────────────────────────────────────

function toolIcon(name: string): React.ReactNode {
  const n = name.toLowerCase()
  if (n.includes('read') || n.includes('glob') || n.includes('ls') || n.includes('grep')) {
    return <FileText size={13} />
  }
  if (n.includes('write') || n.includes('edit') || n.includes('notebook')) {
    return <PenLine size={13} />
  }
  if (n.includes('bash') || n.includes('shell') || n.includes('exec')) {
    return <Terminal size={13} />
  }
  if (n.includes('web') || n.includes('fetch') || n.includes('search') || n.includes('http')) {
    return <Globe size={13} />
  }
  if (n.includes('agent') || n.includes('task')) {
    return <Bot size={13} />
  }
  return <Wrench size={13} />
}

// ── ToolUseCard ────────────────────────────────────────────────────────

interface ToolUseCardProps {
  name: string
  input: object
}

export function ToolUseCard({ name, input }: ToolUseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const copyText = `[Tool: ${name}]\n${JSON.stringify(input, null, 2)}`

  return (
    <div className="relative group rounded-lg border border-accent-blue/20 bg-accent-blue/5 text-xs my-1.5">
      <CopyBtn text={copyText} />
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent-blue/10 transition-colors rounded-lg"
      >
        <span className="text-accent-blue">{toolIcon(name)}</span>
        <span className="text-text-secondary font-mono font-medium flex-1">{name}</span>
        {expanded ? (
          <ChevronDown size={12} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2 border-t border-accent-blue/10">
          <pre className="mt-2 text-[11px] text-text-secondary overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── ToolResultCard ─────────────────────────────────────────────────────

interface ToolResultCardProps {
  content: string
  isError?: boolean
}

const PREVIEW_CHARS = 300

export function ToolResultCard({ content, isError }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const truncated = content.length > PREVIEW_CHARS && !expanded

  return (
    <div className={cn(
      'relative group rounded-lg border text-xs my-1.5 px-3 py-2',
      isError
        ? 'border-accent-red/20 bg-accent-red/5'
        : 'border-border bg-bg-secondary'
    )}>
      <CopyBtn text={content} />
      <div className={cn(
        'font-mono text-[11px] whitespace-pre-wrap break-all',
        isError ? 'text-accent-red' : 'text-text-muted'
      )}>
        {truncated ? content.slice(0, PREVIEW_CHARS) + '…' : content}
      </div>
      {content.length > PREVIEW_CHARS && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-accent-blue hover:text-accent-blue/80 text-[10px]"
        >
          {expanded ? 'Show less' : `Show ${content.length - PREVIEW_CHARS} more chars`}
        </button>
      )}
    </div>
  )
}

// ── AssistantBubble ────────────────────────────────────────────────────

// Remove lines that are purely box-drawing/separator characters (e.g. PAI formatting)
function cleanAssistantText(text: string): string {
  const lines = text.split('\n')
  const cleaned = lines.filter(line => {
    const s = line.trim()
    if (!s) return true // keep blank lines
    // Filter lines that are purely decorative separators
    if (/^[═─━╌╍┄┅┈┉=\-─]{4,}/.test(s) && /^[═─━╌╍┄┅┈┉=\-─\s]*$/.test(s)) return false
    return true
  })
  return cleaned.join('\n').trim()
}

interface AssistantBubbleProps {
  text: string
  isPartial?: boolean
}

export function AssistantBubble({ text, isPartial }: AssistantBubbleProps) {
  const cleaned = cleanAssistantText(text)
  if (!cleaned && !isPartial) return null

  return (
    <div className="relative group rounded-xl bg-bg-secondary border border-border px-4 py-3 my-2 text-sm text-text-primary">
      <CopyBtn text={cleaned} />
      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-bg-tertiary [&_code]:text-accent-orange [&_code]:bg-bg-tertiary [&_code]:px-1 [&_code]:rounded">
        <ReactMarkdown>{cleaned}</ReactMarkdown>
      </div>
      {isPartial && (
        <span className="inline-block w-2 h-4 bg-accent-orange ml-1 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  )
}

// ── ResultCard ─────────────────────────────────────────────────────────

interface ResultCardProps {
  subtype?: string
  cost?: number
  durationMs?: number
  result?: string
}

export function ResultCard({ subtype, cost, durationMs, result }: ResultCardProps) {
  const isSuccess = subtype !== 'error'
  return (
    <div className={cn(
      'rounded-lg border px-3 py-2.5 my-2 text-xs',
      isSuccess
        ? 'border-accent-green/20 bg-accent-green/5'
        : 'border-accent-red/20 bg-accent-red/5'
    )}>
      <div className="flex items-center gap-2 mb-1">
        {isSuccess
          ? <CheckCircle size={13} className="text-accent-green" />
          : <XCircle size={13} className="text-accent-red" />
        }
        <span className={cn('font-medium', isSuccess ? 'text-accent-green' : 'text-accent-red')}>
          {isSuccess ? 'Done' : 'Error'}
        </span>
        {durationMs !== undefined && (
          <span className="flex items-center gap-1 text-text-muted ml-auto">
            <Clock size={11} />
            {(durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {cost !== undefined && cost > 0 && (
          <span className="text-text-muted">{formatCost(cost)}</span>
        )}
      </div>
      {result && (
        <p className="text-text-secondary text-[11px] mt-1">{result}</p>
      )}
    </div>
  )
}

// ── InitHeader ─────────────────────────────────────────────────────────

interface InitHeaderProps {
  model?: string
  sessionId?: string
}

export function InitHeader({ model, sessionId }: InitHeaderProps) {
  return (
    <div className="text-[10px] text-text-muted px-1 py-1.5 flex items-center gap-2 border-b border-border mb-2">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse flex-shrink-0" />
      <span>
        {model && <span className="font-mono text-text-secondary">{model}</span>}
        {sessionId && <span className="ml-2 opacity-50">{sessionId.slice(0, 8)}</span>}
      </span>
    </div>
  )
}

// ── Message renderer ───────────────────────────────────────────────────

interface StreamMessageProps {
  msg: ClaudeStreamMessage
}

export function StreamMessage({ msg }: StreamMessageProps) {
  if (msg.type === 'system' && msg.subtype === 'init') {
    return (
      <InitHeader
        model={(msg as any).session?.model}
        sessionId={(msg as any).session?.id}
      />
    )
  }

  if (msg.type === 'assistant' && msg.message) {
    return (
      <>
        {msg.message.content.map((block, i) => {
          if (block.type === 'text') {
            return (
              <AssistantBubble
                key={`${msg.message!.id}-${i}`}
                text={block.text}
                isPartial={msg.is_partial}
              />
            )
          }
          if (block.type === 'tool_use') {
            return (
              <ToolUseCard
                key={block.id}
                name={block.name}
                input={block.input}
              />
            )
          }
          return null
        })}
      </>
    )
  }

  if (msg.type === 'tool_result') {
    const raw = msg.content
    const text = typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        : ''
    if (!text) return null
    return <ToolResultCard content={text} isError={msg.is_error} />
  }

  if (msg.type === 'result') {
    return (
      <ResultCard
        subtype={msg.subtype}
        cost={msg.cost_usd}
        durationMs={msg.duration_ms}
        result={msg.result}
      />
    )
  }

  return null
}

import React, { useState } from 'react'
import {
  FileText, Terminal, Bot, Zap, Brain, AlertCircle,
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight,
  Eye, Edit3, Search, Globe, ListTodo
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { MissionEvent as MissionEventType } from '../../stores/mission-store'

const EVENT_CONFIG: Record<MissionEventType['type'], {
  icon: React.ReactNode
  color: string
  bgColor: string
  label: string
}> = {
  tool_use: {
    icon: <Zap size={14} />,
    color: 'text-tactical-amber',
    bgColor: 'bg-tactical-amber/10',
    label: 'TOOL',
  },
  file_read: {
    icon: <Eye size={14} />,
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/10',
    label: 'READ',
  },
  file_write: {
    icon: <Edit3 size={14} />,
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/10',
    label: 'WRITE',
  },
  bash_exec: {
    icon: <Terminal size={14} />,
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/10',
    label: 'EXEC',
  },
  thinking: {
    icon: <Brain size={14} />,
    color: 'text-tactical-cyan',
    bgColor: 'bg-tactical-cyan/10',
    label: 'THINK',
  },
  agent_spawn: {
    icon: <Bot size={14} />,
    color: 'text-accent-orange',
    bgColor: 'bg-accent-orange/10',
    label: 'AGENT',
  },
  agent_complete: {
    icon: <Bot size={14} />,
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/10',
    label: 'AGENT',
  },
  text_output: {
    icon: <FileText size={14} />,
    color: 'text-text-secondary',
    bgColor: 'bg-bg-tertiary',
    label: 'OUTPUT',
  },
  error: {
    icon: <AlertCircle size={14} />,
    color: 'text-accent-red',
    bgColor: 'bg-accent-red/10',
    label: 'ERROR',
  },
  user_input: {
    icon: <Zap size={14} />,
    color: 'text-accent-orange',
    bgColor: 'bg-accent-orange/10',
    label: 'INPUT',
  },
}

interface MissionEventProps {
  event: MissionEventType
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function StatusIndicator({ status }: { status: MissionEventType['status'] }) {
  switch (status) {
    case 'active':
      return <Loader2 size={12} className="animate-spin text-tactical-cyan" />
    case 'completed':
      return <CheckCircle size={12} className="text-accent-green" />
    case 'failed':
      return <XCircle size={12} className="text-accent-red" />
  }
}

export function MissionEventItem({ event }: MissionEventProps) {
  const [expanded, setExpanded] = useState(false)
  const config = EVENT_CONFIG[event.type]
  const hasDetail = event.detail && event.detail.length > 0

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-2.5 transition-colors',
        event.status === 'active' ? 'hud-event-active bg-bg-secondary/50' :
        event.status === 'failed' ? 'hud-event-failed' : 'hud-event-completed',
        'hover:bg-bg-secondary/30'
      )}
    >
      {/* Timestamp */}
      <span className="text-[10px] font-mono text-text-muted w-16 flex-shrink-0 pt-0.5">
        {formatTime(event.timestamp)}
      </span>

      {/* Type badge */}
      <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0', config.bgColor, config.color)}>
        {config.icon}
        <span>{config.label}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary truncate">{event.label}</span>
          {event.agentName && (
            <span className="badge-purple text-[10px]">@{event.agentName}</span>
          )}
        </div>
        {hasDetail && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary mt-1"
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
            {expanded && (
              <pre className="mt-2 text-xs font-mono text-text-secondary bg-bg-primary rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto border border-border/50">
                {event.detail}
              </pre>
            )}
          </>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0 pt-0.5">
        <StatusIndicator status={event.status} />
      </div>
    </div>
  )
}

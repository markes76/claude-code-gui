import React from 'react'
import { cn } from '../../lib/utils'
import { AvatarRenderer } from './AvatarRenderer'
import type { AgentV3Config, AgentActivity } from '../../types/agent-v3'

interface AgentCardProps {
  config: AgentV3Config
  activity?: AgentActivity
  compact?: boolean
  onClick?: () => void
}

function formatElapsed(startTime?: number): string {
  if (!startTime) return ''
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
}

export function AgentCard({ config, activity, compact, onClick }: AgentCardProps) {
  const status = activity?.status || 'idle'
  const isActive = status === 'working' || status === 'thinking' || status === 'speaking'

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer',
          isActive ? 'bg-accent-orange/10 border border-accent-orange/20' : 'hover:bg-bg-tertiary',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <AvatarRenderer avatar={config.avatar} size="sm" status={status} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-text-primary truncate">@{config.name}</div>
          <div className="text-[9px] text-text-muted capitalize">{status}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'card-hover group relative',
        isActive && 'border-tactical-cyan/30 shadow-lg shadow-tactical-cyan/5'
      )}
      onClick={onClick}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-tactical-cyan to-transparent" />
      )}

      <div className="flex items-start gap-3">
        <AvatarRenderer avatar={config.avatar} size="lg" status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-text-primary">@{config.name}</span>
            <span className="badge-blue text-[10px]">{config.model}</span>
          </div>
          <p className="text-xs text-text-secondary line-clamp-1">{config.description}</p>
          {config.personality && (
            <p className="text-[10px] text-text-muted italic mt-1 line-clamp-1">"{config.personality}"</p>
          )}
          {activity?.currentTask && isActive && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-pulse" />
              <span className="text-[10px] font-mono text-tactical-cyan truncate">{activity.currentTask}</span>
              {activity.startTime && (
                <span className="text-[10px] font-mono text-text-muted ml-auto">{formatElapsed(activity.startTime)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {config.catchphrase && (
        <div className="mt-3 pt-2 border-t border-border/30">
          <p className="text-[10px] text-text-muted font-mono">"{config.catchphrase}"</p>
        </div>
      )}
    </div>
  )
}

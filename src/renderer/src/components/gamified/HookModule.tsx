import React from 'react'
import {
  Webhook, Trash2, Shield, Zap, Play, MessageSquare,
  ChevronDown, ChevronRight, Terminal as TerminalIcon
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { HookEventType, HookMatcher } from '../../types/config'

interface HookEventInfo {
  id: HookEventType
  label: string
  desc: string
  canBlock: boolean
}

interface HookModuleProps {
  event: HookEventInfo
  hooks: HookMatcher[]
  isExpanded: boolean
  onToggle: () => void
  onRemove: (index: number) => void
}

export function HookModule({ event, hooks, isExpanded, onToggle, onRemove }: HookModuleProps) {
  const hasHooks = hooks.length > 0
  const hookCount = hooks.reduce((sum, m) => sum + m.hooks.length, 0)

  return (
    <div
      className={cn(
        'rounded-xl border bg-bg-card transition-all duration-300',
        hasHooks ? 'powerup-active' : 'border-border',
        hasHooks && 'hover:shadow-[0_0_16px_rgba(var(--accent-cyan-rgb,0,200,255),0.08)]'
      )}
    >
      {/* Slot header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          {/* Power indicator */}
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
            hasHooks
              ? 'bg-accent-cyan/15 text-accent-cyan'
              : 'bg-bg-tertiary text-text-muted'
          )}>
            {hasHooks ? (
              <Zap size={18} className={hasHooks ? 'animate-pulse' : ''} />
            ) : (
              <Webhook size={18} />
            )}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-heading font-semibold text-text-primary">{event.label}</span>
              {event.canBlock && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red uppercase">
                  <Shield size={8} /> Blocks
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">{event.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasHooks && (
            <span className={cn(
              'text-[10px] font-mono font-bold px-2 py-1 rounded-md',
              'bg-accent-cyan/10 text-accent-cyan'
            )}>
              {hookCount} ACTIVE
            </span>
          )}
          {!hasHooks && (
            <span className="text-[10px] font-mono text-text-muted tracking-wider">
              EMPTY SLOT
            </span>
          )}
          <span className="text-text-muted">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </div>
      </button>

      {/* Expanded hooks */}
      {isExpanded && hasHooks && (
        <div className="px-4 pb-4 space-y-2">
          <div className="h-px bg-border/50 mb-3" />
          {hooks.map((matcher, i) => (
            <div
              key={i}
              className="group relative p-3 rounded-lg bg-bg-primary border border-border/50 hover:border-accent-cyan/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {matcher.matcher && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[9px] font-mono tracking-wider text-text-muted uppercase">Match:</span>
                      <code className="text-[11px] font-mono text-accent-cyan px-1.5 py-0.5 rounded bg-accent-cyan/5">
                        {matcher.matcher}
                      </code>
                    </div>
                  )}
                  {matcher.hooks.map((hook, j) => (
                    <div key={j} className="flex items-start gap-2 mt-1">
                      <span className="mt-0.5 flex-shrink-0">
                        {hook.type === 'command' ? (
                          <TerminalIcon size={12} className="text-accent-green" />
                        ) : (
                          <MessageSquare size={12} className="text-accent-purple" />
                        )}
                      </span>
                      <code className="text-[11px] font-mono text-text-secondary break-all">
                        {hook.type === 'command' ? hook.command : hook.prompt}
                      </code>
                    </div>
                  ))}
                  {matcher.hooks[0]?.timeout && matcher.hooks[0].timeout !== 60000 && (
                    <div className="text-[10px] text-text-muted mt-1.5 font-mono">
                      Timeout: {(matcher.hooks[0].timeout / 1000).toFixed(0)}s
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemove(i)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty slot expanded */}
      {isExpanded && !hasHooks && (
        <div className="px-4 pb-4">
          <div className="h-px bg-border/50 mb-3" />
          <div className="text-center py-4 text-text-muted">
            <div className="text-[10px] font-mono tracking-wider mb-1">NO HOOKS DEPLOYED</div>
            <p className="text-[11px]">Create a hook to activate this event slot</p>
          </div>
        </div>
      )}
    </div>
  )
}

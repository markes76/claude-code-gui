import React from 'react'
import { Bot, Zap, Activity, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAgentVisualStore } from '../../stores/agent-visual-store'
import { useMissionStore } from '../../stores/mission-store'

interface IntelPanelProps {
  visible: boolean
  collapsed: boolean
  onToggle: () => void
}

export function IntelPanel({ visible, collapsed, onToggle }: IntelPanelProps) {
  const agentActivities = useAgentVisualStore((s) => s.agentActivities)
  const claudeActivity = useAgentVisualStore((s) => s.claudeActivity)
  const activeToolName = useMissionStore((s) => s.activeToolName)
  const activeFileName = useMissionStore((s) => s.activeFileName)

  if (!visible) return null

  const activeAgents = Object.values(agentActivities).filter(
    (a) => a.status === 'working' || a.status === 'thinking'
  )

  if (collapsed) {
    return (
      <div className="w-10 flex flex-col items-center py-3 bg-bg-secondary border-l border-border/50">
        <button onClick={onToggle} className="text-text-muted hover:text-text-primary mb-4">
          <ChevronLeft size={14} />
        </button>
        {/* Mini agent indicators */}
        {activeAgents.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            {activeAgents.map((agent) => (
              <div
                key={agent.agentName}
                className="w-6 h-6 rounded-full bg-accent-orange/20 flex items-center justify-center"
                title={`@${agent.agentName}: ${agent.status}`}
              >
                <Bot size={12} className="text-accent-orange" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-56 flex flex-col bg-bg-secondary border-l border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-[10px] font-mono font-bold text-text-muted tracking-wider">INTEL</span>
        <button onClick={onToggle} className="text-text-muted hover:text-text-primary">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Primary Operator (Claude) */}
      <div className="px-3 py-3 border-b border-border/30">
        <div className="text-[9px] font-mono text-text-muted mb-2 tracking-wider">PRIMARY OPERATOR</div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            claudeActivity.status === 'working' ? 'bg-tactical-cyan/20 animate-pulse' :
            claudeActivity.status === 'thinking' ? 'bg-tactical-amber/20 animate-pulse' :
            'bg-bg-tertiary'
          )}>
            <Zap size={16} className={cn(
              claudeActivity.status === 'working' ? 'text-tactical-cyan' :
              claudeActivity.status === 'thinking' ? 'text-tactical-amber' :
              'text-text-muted'
            )} />
          </div>
          <div>
            <div className="text-xs font-medium text-text-primary">Claude</div>
            <div className="text-[10px] text-text-muted capitalize">{claudeActivity.status}</div>
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="px-3 py-3 border-b border-border/30">
        <div className="text-[9px] font-mono text-text-muted mb-2 tracking-wider">
          AGENT ROSTER ({activeAgents.length} active)
        </div>
        {activeAgents.length === 0 ? (
          <div className="text-xs text-text-muted/50 py-2 text-center">No agents deployed</div>
        ) : (
          <div className="space-y-2">
            {activeAgents.map((agent) => (
              <div key={agent.agentName} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-accent-orange/20 flex items-center justify-center">
                  {agent.status === 'working' ? (
                    <Loader2 size={12} className="text-accent-orange animate-spin" />
                  ) : (
                    <Bot size={12} className="text-accent-orange" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-text-primary truncate">@{agent.agentName}</div>
                  {agent.currentTask && (
                    <div className="text-[9px] text-text-muted truncate">{agent.currentTask}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Tool */}
      <div className="px-3 py-3">
        <div className="text-[9px] font-mono text-text-muted mb-2 tracking-wider">ACTIVE OPERATION</div>
        {activeToolName ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-tactical-amber" />
              <span className="text-xs font-mono text-tactical-amber">{activeToolName}</span>
            </div>
            {activeFileName && (
              <div className="text-[10px] font-mono text-text-muted truncate pl-5" title={activeFileName}>
                {activeFileName}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-muted/50 text-center py-2">Idle</div>
        )}
      </div>
    </div>
  )
}

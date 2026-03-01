import React, { useEffect, useState } from 'react'
import { Activity, Clock, Cpu, Zap, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useMissionStore } from '../../stores/mission-store'
import { useAgentVisualStore } from '../../stores/agent-visual-store'

interface CommandBarProps {
  visible: boolean
  model: string
  connected: boolean
}

function formatElapsed(startTime: number | null): string {
  if (!startTime) return '00:00'
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function CommandBar({ visible, model, connected }: CommandBarProps) {
  const sessionStartTime = useMissionStore((s) => s.sessionStartTime)
  const activeToolName = useMissionStore((s) => s.activeToolName)
  const claudeActivity = useAgentVisualStore((s) => s.claudeActivity)
  const [elapsed, setElapsed] = useState('00:00')

  // Update elapsed time every second
  useEffect(() => {
    if (!sessionStartTime) return
    const interval = setInterval(() => {
      setElapsed(formatElapsed(sessionStartTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime])

  if (!visible) return null

  const statusColor = claudeActivity.status === 'working' ? 'text-tactical-cyan' :
    claudeActivity.status === 'thinking' ? 'text-tactical-amber' :
    claudeActivity.status === 'error' ? 'text-tactical-red' :
    connected ? 'text-tactical-green' : 'text-text-muted'

  const statusLabel = claudeActivity.status === 'working' ? 'OPERATING' :
    claudeActivity.status === 'thinking' ? 'ANALYZING' :
    claudeActivity.status === 'error' ? 'ERROR' :
    connected ? 'STANDBY' : 'OFFLINE'

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-bg-secondary/80 border-b border-border/50 backdrop-blur-sm">
      {/* Left: Mission status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', statusColor.replace('text-', 'bg-'),
            (claudeActivity.status === 'working' || claudeActivity.status === 'thinking') && 'animate-pulse'
          )} />
          <span className={cn('text-[11px] font-mono font-bold tracking-wider', statusColor)}>
            {statusLabel}
          </span>
        </div>

        {activeToolName && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-tactical-amber">
            <Zap size={11} />
            <span>{activeToolName}</span>
          </div>
        )}
      </div>

      {/* Center: Unit designation (model) */}
      <div className="flex items-center gap-2">
        <Cpu size={12} className="text-text-muted" />
        <span className="text-[11px] font-mono text-text-secondary tracking-wide">
          {model.toUpperCase().replace(/-/g, ' ')}
        </span>
      </div>

      {/* Right: Timer + stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
          <Clock size={11} />
          <span>{elapsed}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
          <Activity size={11} />
          <span>v3.0</span>
        </div>
      </div>
    </div>
  )
}

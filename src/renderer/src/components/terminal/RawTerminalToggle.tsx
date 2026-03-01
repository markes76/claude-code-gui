import React from 'react'
import { Terminal, Monitor } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useMissionStore } from '../../stores/mission-store'

export function RawTerminalToggle() {
  const showRawTerminal = useMissionStore((s) => s.showRawTerminal)
  const setShowRawTerminal = useMissionStore((s) => s.setShowRawTerminal)

  return (
    <div className="flex items-center gap-1 rounded-lg bg-bg-tertiary p-0.5">
      <button
        onClick={() => setShowRawTerminal(false)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all',
          !showRawTerminal
            ? 'bg-bg-card text-tactical-cyan shadow-sm'
            : 'text-text-muted hover:text-text-secondary'
        )}
      >
        <Monitor size={12} />
        MISSION
      </button>
      <button
        onClick={() => setShowRawTerminal(true)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all',
          showRawTerminal
            ? 'bg-bg-card text-accent-green shadow-sm'
            : 'text-text-muted hover:text-text-secondary'
        )}
      >
        <Terminal size={12} />
        RAW
      </button>
    </div>
  )
}

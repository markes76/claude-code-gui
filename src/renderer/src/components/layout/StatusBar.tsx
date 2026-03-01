import React from 'react'
import { Wifi, WifiOff, Monitor, Sparkles, Brain } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatusBarProps {
  visible: boolean
  connected: boolean
  model: string
  onCompose?: () => void
  onSaveMemory?: () => void
  canCompose: boolean
}

export function StatusBar({ visible, connected, model, onCompose, onSaveMemory, canCompose }: StatusBarProps) {
  if (!visible) return null

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-bg-secondary/80 border-t border-border/50 backdrop-blur-sm">
      {/* Left: Connection status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <Wifi size={11} className="text-tactical-green" />
              <span className="text-[10px] font-mono text-tactical-green">CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff size={11} className="text-text-muted" />
              <span className="text-[10px] font-mono text-text-muted">DISCONNECTED</span>
            </>
          )}
        </div>
        <div className="w-px h-3 bg-border/50" />
        <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
          <Monitor size={10} />
          <span>{model}</span>
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2">
        {canCompose && onCompose && (
          <button
            onClick={onCompose}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-text-muted hover:text-accent-purple transition-colors"
          >
            <Sparkles size={10} />
            COMPOSE
          </button>
        )}
        {canCompose && onSaveMemory && (
          <button
            onClick={onSaveMemory}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-text-muted hover:text-accent-blue transition-colors"
          >
            <Brain size={10} />
            MEMORY
          </button>
        )}
      </div>
    </div>
  )
}

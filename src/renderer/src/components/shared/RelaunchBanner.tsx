import React from 'react'
import { RefreshCw, X } from 'lucide-react'
import { getApi } from '../../lib/utils'

interface RelaunchBannerProps {
  onDismiss: () => void
}

export function RelaunchBanner({ onDismiss }: RelaunchBannerProps) {
  const handleRelaunch = async () => {
    const api = getApi()
    if (api) await api.app.relaunch()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-accent-orange/10 border-b border-accent-orange/20 text-sm">
      <RefreshCw size={14} className="text-accent-orange flex-shrink-0" />
      <span className="text-text-secondary flex-1">
        Changes saved. A <span className="text-text-primary font-medium">restart is required</span> for Claude Code to pick them up.
      </span>
      <button
        onClick={handleRelaunch}
        className="px-3 py-1 rounded-lg bg-accent-orange text-white text-xs font-medium hover:bg-accent-orange/80 transition-colors flex-shrink-0"
      >
        Restart Now
      </button>
      <button
        onClick={onDismiss}
        className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

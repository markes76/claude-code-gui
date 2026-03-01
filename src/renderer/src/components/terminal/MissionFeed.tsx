import React, { useEffect, useRef, useCallback } from 'react'
import { useMissionStore } from '../../stores/mission-store'
import { MissionEventItem } from './MissionEvent'
import { Monitor, ArrowDown } from 'lucide-react'

interface MissionFeedProps {
  tabId: string
}

export function MissionFeed({ tabId }: MissionFeedProps) {
  const events = useMissionStore((s) => s.getTabEvents(tabId))
  const feedScrollLocked = useMissionStore((s) => s.feedScrollLocked)
  const setFeedScrollLocked = useMissionStore((s) => s.setFeedScrollLocked)
  const feedRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Auto-scroll to bottom unless user has scrolled up
  useEffect(() => {
    if (!feedScrollLocked && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [events.length, feedScrollLocked])

  // Detect user scrolling up to enable scroll-lock
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    isAtBottomRef.current = atBottom
    setFeedScrollLocked(!atBottom)
  }, [setFeedScrollLocked])

  const scrollToBottom = useCallback(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
      setFeedScrollLocked(false)
    }
  }, [setFeedScrollLocked])

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <Monitor size={40} className="opacity-30 mb-3" />
        <p className="text-sm font-mono">MISSION FEED — STANDBY</p>
        <p className="text-xs mt-1 opacity-60">Waiting for Claude to begin operations...</p>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* Event list */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto divide-y divide-border/30"
      >
        {events.map((event) => (
          <MissionEventItem key={event.id} event={event} />
        ))}
      </div>

      {/* Scroll-to-bottom indicator */}
      {feedScrollLocked && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hud-panel text-xs font-mono text-tactical-cyan hover:text-text-primary transition-colors shadow-lg"
        >
          <ArrowDown size={12} />
          LATEST
        </button>
      )}
    </div>
  )
}

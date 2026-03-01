import React from 'react'
import { cn } from '../../lib/utils'
import { HeadShapes, BodyFrames, AccessoryParts } from './AvatarParts'
import type { AvatarConfig, AgentActivity } from '../../types/agent-v3'

interface AvatarRendererProps {
  avatar: AvatarConfig
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: AgentActivity['status']
  className?: string
}

const SIZE_MAP = {
  sm: 24,
  md: 36,
  lg: 48,
  xl: 80,
}

export function AvatarRenderer({ avatar, size = 'md', status, className }: AvatarRendererProps) {
  const px = SIZE_MAP[size]
  const HeadComponent = HeadShapes[avatar.headShape] || HeadShapes.round
  const BodyComponent = BodyFrames[avatar.bodyFrame] || BodyFrames.standard

  const partProps = {
    primary: avatar.primaryColor,
    secondary: avatar.secondaryColor,
    accent: avatar.accentColor,
  }

  const isActive = status === 'working' || status === 'thinking'
  const isError = status === 'error'
  const isSpeaking = status === 'speaking'

  return (
    <div
      className={cn(
        'relative rounded-lg flex items-center justify-center flex-shrink-0',
        isActive && 'animate-pulse-glow',
        isSpeaking && 'ring-2 ring-accent-green/50',
        isError && 'ring-2 ring-accent-red/50',
        className
      )}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 90"
        width={px}
        height={px}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: isError ? 'hue-rotate(320deg) saturate(1.5)' : undefined }}
      >
        {/* Body first (behind head) */}
        <BodyComponent {...partProps} />
        {/* Head on top */}
        <HeadComponent {...partProps} />
        {/* Accessories on top of everything */}
        {avatar.accessories.map((acc) => {
          const AccComponent = AccessoryParts[acc]
          return AccComponent ? <AccComponent key={acc} {...partProps} /> : null
        })}
      </svg>

      {/* Status dot */}
      {status && status !== 'idle' && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-bg-card',
          status === 'working' && 'bg-tactical-cyan animate-pulse',
          status === 'thinking' && 'bg-tactical-amber animate-pulse',
          status === 'speaking' && 'bg-accent-green animate-pulse',
          status === 'done' && 'bg-accent-green',
          status === 'error' && 'bg-accent-red',
        )} />
      )}
    </div>
  )
}

import React from 'react'
import { cn } from '../../lib/utils'
import { AvatarRenderer } from './AvatarRenderer'
import { ColorPicker } from './ColorPicker'
import { HEAD_SHAPES, BODY_FRAMES, ACCESSORIES, DEFAULT_AVATAR } from '../../types/agent-v3'
import type { AvatarConfig } from '../../types/agent-v3'

interface AvatarBuilderProps {
  avatar: AvatarConfig
  onChange: (avatar: AvatarConfig) => void
}

export function AvatarBuilder({ avatar, onChange }: AvatarBuilderProps) {
  const update = (partial: Partial<AvatarConfig>) => {
    onChange({ ...avatar, ...partial })
  }

  const toggleAccessory = (id: string) => {
    const accessories = avatar.accessories.includes(id)
      ? avatar.accessories.filter((a) => a !== id)
      : [...avatar.accessories, id]
    update({ accessories })
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-[10px] font-mono text-text-muted tracking-wider">PREVIEW</div>
        <div className="p-6 rounded-xl bg-bg-primary border border-border">
          <AvatarRenderer avatar={avatar} size="xl" />
        </div>
        <div className="flex gap-2">
          <div className="text-center">
            <AvatarRenderer avatar={avatar} size="lg" />
            <span className="text-[9px] text-text-muted mt-1 block">48px</span>
          </div>
          <div className="text-center">
            <AvatarRenderer avatar={avatar} size="md" />
            <span className="text-[9px] text-text-muted mt-1 block">36px</span>
          </div>
          <div className="text-center">
            <AvatarRenderer avatar={avatar} size="sm" />
            <span className="text-[9px] text-text-muted mt-1 block">24px</span>
          </div>
        </div>
        <button
          onClick={() => onChange(DEFAULT_AVATAR)}
          className="btn-ghost text-xs"
        >
          Reset to Default
        </button>
      </div>

      {/* Controls */}
      <div className="space-y-5 overflow-y-auto max-h-[400px] pr-2">
        {/* Head Shape */}
        <div>
          <label className="label">Head Shape</label>
          <div className="grid grid-cols-4 gap-1.5">
            {HEAD_SHAPES.map((shape) => (
              <button
                key={shape.id}
                onClick={() => update({ headShape: shape.id })}
                className={cn(
                  'p-2 rounded-lg border text-center text-[10px] transition-all',
                  avatar.headShape === shape.id
                    ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                    : 'border-border hover:border-text-muted text-text-secondary'
                )}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Frame */}
        <div>
          <label className="label">Body Frame</label>
          <div className="grid grid-cols-3 gap-1.5">
            {BODY_FRAMES.map((frame) => (
              <button
                key={frame.id}
                onClick={() => update({ bodyFrame: frame.id })}
                className={cn(
                  'p-2 rounded-lg border text-center text-[10px] transition-all',
                  avatar.bodyFrame === frame.id
                    ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                    : 'border-border hover:border-text-muted text-text-secondary'
                )}
              >
                {frame.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accessories */}
        <div>
          <label className="label">Accessories</label>
          <div className="grid grid-cols-4 gap-1.5">
            {ACCESSORIES.map((acc) => (
              <button
                key={acc.id}
                onClick={() => toggleAccessory(acc.id)}
                className={cn(
                  'p-2 rounded-lg border text-center text-[10px] transition-all',
                  avatar.accessories.includes(acc.id)
                    ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                    : 'border-border hover:border-text-muted text-text-secondary'
                )}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <ColorPicker label="Primary Color" value={avatar.primaryColor} onChange={(c) => update({ primaryColor: c })} />
        <ColorPicker label="Secondary Color" value={avatar.secondaryColor} onChange={(c) => update({ secondaryColor: c })} />
        <ColorPicker label="Accent Color" value={avatar.accentColor} onChange={(c) => update({ accentColor: c })} />
      </div>
    </div>
  )
}

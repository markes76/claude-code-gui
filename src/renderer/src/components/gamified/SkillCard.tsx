import React from 'react'
import { Zap, Edit3, Trash2, Cpu, Wrench, GitBranch } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { SkillInfo } from '../../types/config'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export function computeRarity(skill: SkillInfo): Rarity {
  const fm = skill.frontmatter || {}
  let score = 0
  if (fm.model === 'opus') score += 3
  else if (fm.model === 'sonnet') score += 1
  if (fm['allowed-tools']) score += 1
  if (fm.context === 'fork') score += 2
  if (skill.content && skill.content.length > 500) score += 1
  if (skill.scope === 'builtin') score += 2

  if (score >= 5) return 'legendary'
  if (score >= 3) return 'rare'
  if (score >= 1) return 'uncommon'
  return 'common'
}

const rarityConfig: Record<Rarity, { label: string; borderClass: string; glowClass: string; iconColor: string; bgAccent: string }> = {
  common: {
    label: 'COMMON',
    borderClass: 'card-common',
    glowClass: '',
    iconColor: 'text-text-muted',
    bgAccent: 'bg-bg-tertiary',
  },
  uncommon: {
    label: 'UNCOMMON',
    borderClass: 'card-uncommon',
    glowClass: 'hover:shadow-[0_0_20px_rgba(var(--accent-green-rgb,34,197,94),0.12)]',
    iconColor: 'text-accent-green',
    bgAccent: 'bg-accent-green/10',
  },
  rare: {
    label: 'RARE',
    borderClass: 'card-rare',
    glowClass: 'hover:shadow-[0_0_24px_rgba(var(--accent-blue-rgb,59,130,246),0.15)]',
    iconColor: 'text-accent-blue',
    bgAccent: 'bg-accent-blue/10',
  },
  legendary: {
    label: 'LEGENDARY',
    borderClass: 'card-legendary',
    glowClass: 'hover:shadow-[0_0_28px_rgba(var(--accent-orange-rgb,255,107,53),0.18)]',
    iconColor: 'text-accent-orange',
    bgAccent: 'bg-accent-orange/10',
  },
}

interface SkillCardProps {
  skill: SkillInfo
  rarity: Rarity
  onEdit: (skill: SkillInfo) => void
  onDelete: (skill: SkillInfo) => void
}

export function SkillCard({ skill, rarity, onEdit, onDelete }: SkillCardProps) {
  const config = rarityConfig[rarity]
  const fm = skill.frontmatter || {}

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border bg-bg-card transition-all duration-300 group',
        config.borderClass,
        config.glowClass
      )}
    >
      {/* Rarity label */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          'text-[9px] font-mono font-bold tracking-[0.2em] uppercase',
          config.iconColor
        )}>
          {config.label}
        </span>
        <span className={cn('badge text-[10px]', skill.scope === 'user' ? 'badge-blue' : skill.scope === 'project' ? 'badge-purple' : 'badge-orange')}>
          {skill.scope}
        </span>
      </div>

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
          config.bgAccent
        )}>
          <Zap size={20} className={config.iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading font-semibold text-sm text-text-primary truncate">
            /{skill.name}
          </div>
          {fm.model && (
            <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
              <Cpu size={10} />
              <span className="uppercase">{fm.model}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary mb-3 line-clamp-2 min-h-[2.5em]">
        {skill.description || 'No description'}
      </p>

      {/* Metadata tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {fm['allowed-tools'] && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
            <Wrench size={9} /> {fm['allowed-tools']}
          </span>
        )}
        {fm.context === 'fork' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple">
            <GitBranch size={9} /> Subagent
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(skill)}
          className="btn-ghost text-xs flex-1 justify-center"
        >
          <Edit3 size={12} /> Edit
        </button>
        <button
          onClick={() => onDelete(skill)}
          className="btn-ghost text-xs text-accent-red"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

import React from 'react'
import { cn } from '../../lib/utils'

const PRESET_COLORS = [
  '#ff6b35', '#e85d20', '#8b5cf6', '#7c3aed', '#3b82f6',
  '#2563eb', '#06b6d4', '#0891b2', '#10b981', '#059669',
  '#ef4444', '#dc2626', '#f59e0b', '#d97706', '#ec4899',
  '#6366f1', '#14b8a6', '#84cc16', '#1e3a5f', '#374151',
]

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              'w-6 h-6 rounded-md border-2 transition-transform hover:scale-110',
              value === color ? 'border-text-primary scale-110' : 'border-transparent'
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-28 text-xs font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

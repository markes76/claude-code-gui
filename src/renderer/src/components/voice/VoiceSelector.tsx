import React, { useEffect, useState } from 'react'
import { Volume2, Play, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import * as voiceService from '../../lib/voice-service'
import type { Voice } from '../../lib/voice-service'

interface VoiceSelectorProps {
  value?: string
  valueName?: string
  onChange: (voiceId: string | undefined, voiceName: string | undefined) => void
}

export function VoiceSelector({ value, valueName, onChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const available = voiceService.isAvailable()

  useEffect(() => {
    if (!available) return
    setLoading(true)
    voiceService.listVoices().then((v) => {
      setVoices(v)
      setLoading(false)
    })
  }, [available])

  const handlePreview = async (voice: Voice) => {
    setPreviewing(voice.voiceId)
    await voiceService.previewVoice(voice.voiceId, voice.previewUrl)
    setPreviewing(null)
  }

  if (!available) {
    return (
      <div className="text-xs text-text-muted p-3 rounded-lg bg-bg-tertiary">
        <Volume2 size={14} className="inline mr-1.5 opacity-50" />
        Voice not configured. Set up a TTS provider in Settings to enable agent voices.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="label">Voice</label>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-text-muted py-2">
          <Loader2 size={14} className="animate-spin" />
          Loading voices...
        </div>
      ) : (
        <>
          <select
            value={value || ''}
            onChange={(e) => {
              const id = e.target.value || undefined
              const name = voices.find(v => v.voiceId === id)?.name
              onChange(id, name)
            }}
            className="input"
          >
            <option value="">No voice</option>
            {voices.map((v) => (
              <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
            ))}
          </select>
          {value && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{valueName || value}</span>
              <button
                onClick={() => {
                  const voice = voices.find(v => v.voiceId === value)
                  if (voice) handlePreview(voice)
                }}
                disabled={previewing === value}
                className="btn-ghost text-xs"
              >
                {previewing === value ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} />
                )}
                Preview
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

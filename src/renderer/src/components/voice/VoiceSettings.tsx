import React, { useEffect, useState, useCallback } from 'react'
import { Volume2, Play, Save, Loader2 } from 'lucide-react'
import { cn, getApi } from '../../lib/utils'
import * as voiceService from '../../lib/voice-service'
import type { VoiceConfig } from '../../lib/voice-service'

export function VoiceSettings() {
  const [config, setConfig] = useState<VoiceConfig>(voiceService.getConfig())
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const loadConfig = useCallback(async () => {
    const api = getApi()
    if (!api) return
    try {
      const stored = await api.config.getVoiceConfig()
      if (stored) {
        voiceService.configure(stored)
        setConfig(voiceService.getConfig())
      }
    } catch {
      // No saved config
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const updateField = (field: keyof VoiceConfig, value: any) => {
    const updated = { ...config, [field]: value }
    setConfig(updated)
    voiceService.configure(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    const api = getApi()
    if (api) {
      try {
        await api.config.saveVoiceConfig(config)
      } catch {
        // Save failed — config still in memory
      }
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const voices = await voiceService.listVoices()
      if (voices.length > 0) {
        await voiceService.speak('Voice system online. All systems operational.', voices[0].voiceId)
      }
    } catch {
      // Test failed
    }
    setTesting(false)
  }

  return (
    <div className="space-y-4">
      <h3 className="section-title flex items-center gap-2">
        <Volume2 size={18} />
        Voice (TTS)
      </h3>

      {/* Provider */}
      <div>
        <label className="label">Provider</label>
        <div className="flex gap-2">
          {(['disabled', 'elevenlabs', 'pai'] as const).map((p) => (
            <button
              key={p}
              onClick={() => updateField('provider', p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border transition-all capitalize',
                config.provider === p
                  ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                  : 'border-border text-text-muted hover:bg-bg-tertiary'
              )}
            >
              {p === 'pai' ? 'PAI' : p}
            </button>
          ))}
        </div>
      </div>

      {/* API Key (ElevenLabs) */}
      {config.provider === 'elevenlabs' && (
        <div>
          <label className="label">ElevenLabs API Key</label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => updateField('apiKey', e.target.value)}
            placeholder="xi-..."
            className="input font-mono"
          />
          <p className="text-[10px] text-text-muted mt-1">Get your API key from elevenlabs.io</p>
        </div>
      )}

      {/* PAI Endpoint */}
      {config.provider === 'pai' && (
        <div>
          <label className="label">PAI Endpoint URL</label>
          <input
            type="url"
            value={config.paiEndpoint || ''}
            onChange={(e) => updateField('paiEndpoint', e.target.value)}
            placeholder="http://localhost:8080"
            className="input font-mono"
          />
        </div>
      )}

      {/* Volume */}
      {config.provider !== 'disabled' && (
        <div>
          <label className="label">Volume</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.volume}
              onChange={(e) => updateField('volume', parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-text-muted w-8 text-right">{Math.round(config.volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-xs"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
        {config.provider !== 'disabled' && (
          <button
            onClick={handleTest}
            disabled={testing || !voiceService.isAvailable()}
            className="btn-secondary text-xs"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Test
          </button>
        )}
      </div>
    </div>
  )
}

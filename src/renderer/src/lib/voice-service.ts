/**
 * Voice service for TTS via ElevenLabs or PAI (Personal AI Infrastructure).
 * Gracefully degrades — returns empty/false when not configured.
 */

export interface VoiceConfig {
  provider: 'elevenlabs' | 'pai' | 'disabled'
  apiKey?: string
  paiEndpoint?: string
  volume: number // 0-1
}

export interface Voice {
  voiceId: string
  name: string
  previewUrl?: string
}

const DEFAULT_CONFIG: VoiceConfig = {
  provider: 'disabled',
  volume: 0.8,
}

let config: VoiceConfig = { ...DEFAULT_CONFIG }
let currentAudio: HTMLAudioElement | null = null
let audioQueue: Array<{ text: string; voiceId: string }> = []
let isPlaying = false

export function configure(newConfig: Partial<VoiceConfig>): void {
  config = { ...config, ...newConfig }
}

export function getConfig(): VoiceConfig {
  return { ...config }
}

export function isAvailable(): boolean {
  if (config.provider === 'disabled') return false
  if (config.provider === 'elevenlabs' && !config.apiKey) return false
  if (config.provider === 'pai' && !config.paiEndpoint) return false
  return true
}

export async function listVoices(): Promise<Voice[]> {
  if (!isAvailable()) return []

  try {
    if (config.provider === 'elevenlabs') {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': config.apiKey! },
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.voices || []).map((v: any) => ({
        voiceId: v.voice_id,
        name: v.name,
        previewUrl: v.preview_url,
      }))
    }

    if (config.provider === 'pai') {
      const res = await fetch(`${config.paiEndpoint}/v1/voices`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.voices || []).map((v: any) => ({
        voiceId: v.voice_id || v.id,
        name: v.name,
        previewUrl: v.preview_url,
      }))
    }
  } catch {
    // Network error — graceful degradation
  }

  return []
}

export async function speak(text: string, voiceId: string): Promise<void> {
  if (!isAvailable() || !text.trim()) return

  // Queue if already playing
  if (isPlaying) {
    audioQueue.push({ text, voiceId })
    return
  }

  isPlaying = true

  try {
    let audioUrl: string | null = null

    if (config.provider === 'elevenlabs') {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.5 },
          }),
        }
      )
      if (res.ok) {
        const blob = await res.blob()
        audioUrl = URL.createObjectURL(blob)
      }
    } else if (config.provider === 'pai') {
      const res = await fetch(`${config.paiEndpoint}/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const blob = await res.blob()
        audioUrl = URL.createObjectURL(blob)
      }
    }

    if (audioUrl) {
      await playAudio(audioUrl)
      URL.revokeObjectURL(audioUrl)
    }
  } catch {
    // TTS failed — silent degradation
  }

  isPlaying = false

  // Process queue
  if (audioQueue.length > 0) {
    const next = audioQueue.shift()!
    speak(next.text, next.voiceId)
  }
}

export async function previewVoice(voiceId: string, sampleUrl?: string): Promise<void> {
  if (sampleUrl) {
    await playAudio(sampleUrl)
    return
  }
  await speak('Hello, I am your AI assistant. Ready for the mission.', voiceId)
}

export function stop(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  audioQueue = []
  isPlaying = false
}

function playAudio(url: string): Promise<void> {
  return new Promise((resolve) => {
    stop()
    currentAudio = new Audio(url)
    currentAudio.volume = config.volume
    currentAudio.onended = () => {
      currentAudio = null
      resolve()
    }
    currentAudio.onerror = () => {
      currentAudio = null
      resolve()
    }
    currentAudio.play().catch(() => {
      currentAudio = null
      resolve()
    })
  })
}

export interface AvatarConfig {
  headShape: string
  bodyFrame: string
  accessories: string[]
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export interface AgentV3Config {
  name: string
  description: string
  model: string
  avatar: AvatarConfig
  personality: string
  catchphrase?: string
  voiceId?: string
  voiceName?: string
}

export interface AgentActivity {
  agentName: string
  status: 'idle' | 'thinking' | 'working' | 'speaking' | 'done' | 'error'
  currentTask?: string
  startTime?: number
}

export const DEFAULT_AVATAR: AvatarConfig = {
  headShape: 'round',
  bodyFrame: 'standard',
  accessories: [],
  primaryColor: '#3b82f6',
  secondaryColor: '#1e3a5f',
  accentColor: '#06b6d4',
}

export const HEAD_SHAPES = [
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'angular', label: 'Angular' },
  { id: 'helmet', label: 'Helmet' },
  { id: 'visor', label: 'Visor' },
  { id: 'dome', label: 'Dome' },
  { id: 'crest', label: 'Crest' },
  { id: 'minimal', label: 'Minimal' },
]

export const BODY_FRAMES = [
  { id: 'standard', label: 'Standard' },
  { id: 'armored', label: 'Armored' },
  { id: 'slim', label: 'Slim' },
  { id: 'heavy', label: 'Heavy' },
  { id: 'floating', label: 'Floating' },
  { id: 'holographic', label: 'Holographic' },
]

export const ACCESSORIES = [
  { id: 'antenna', label: 'Antenna' },
  { id: 'headset', label: 'Headset' },
  { id: 'shoulder-pads', label: 'Shoulder Pads' },
  { id: 'wings', label: 'Wings' },
  { id: 'shield', label: 'Shield' },
  { id: 'scanner', label: 'Scanner' },
  { id: 'cloak', label: 'Cloak' },
  { id: 'halo', label: 'Halo' },
]

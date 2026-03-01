import React from 'react'

interface PartProps {
  primary: string
  secondary: string
  accent: string
}

// Head shape SVG components
export const HeadShapes: Record<string, React.FC<PartProps>> = {
  round: ({ primary, accent }) => (
    <g>
      <circle cx="50" cy="35" r="22" fill={primary} stroke={accent} strokeWidth="1.5" />
      <circle cx="42" cy="32" r="3" fill={accent} opacity="0.9" />
      <circle cx="58" cy="32" r="3" fill={accent} opacity="0.9" />
      <path d="M44 40 Q50 45 56 40" stroke={accent} strokeWidth="1.5" fill="none" />
    </g>
  ),
  square: ({ primary, accent }) => (
    <g>
      <rect x="28" y="14" width="44" height="40" rx="6" fill={primary} stroke={accent} strokeWidth="1.5" />
      <rect x="38" y="28" width="6" height="4" rx="1" fill={accent} opacity="0.9" />
      <rect x="56" y="28" width="6" height="4" rx="1" fill={accent} opacity="0.9" />
      <rect x="42" y="40" width="16" height="2" rx="1" fill={accent} opacity="0.6" />
    </g>
  ),
  angular: ({ primary, accent }) => (
    <g>
      <polygon points="50,10 75,30 70,55 30,55 25,30" fill={primary} stroke={accent} strokeWidth="1.5" />
      <circle cx="40" cy="32" r="3.5" fill={accent} opacity="0.9" />
      <circle cx="60" cy="32" r="3.5" fill={accent} opacity="0.9" />
      <line x1="42" y1="44" x2="58" y2="44" stroke={accent} strokeWidth="1.5" />
    </g>
  ),
  helmet: ({ primary, secondary, accent }) => (
    <g>
      <path d="M28 40 Q28 12 50 12 Q72 12 72 40 L68 50 L32 50 Z" fill={primary} stroke={accent} strokeWidth="1.5" />
      <rect x="32" y="28" width="36" height="10" rx="3" fill={secondary} opacity="0.8" />
      <circle cx="42" cy="33" r="2.5" fill={accent} />
      <circle cx="58" cy="33" r="2.5" fill={accent} />
      <line x1="32" y1="22" x2="68" y2="22" stroke={accent} strokeWidth="1" opacity="0.4" />
    </g>
  ),
  visor: ({ primary, secondary, accent }) => (
    <g>
      <ellipse cx="50" cy="34" rx="24" ry="22" fill={primary} stroke={accent} strokeWidth="1.5" />
      <path d="M30 30 Q50 24 70 30 Q70 40 50 42 Q30 40 30 30" fill={secondary} opacity="0.7" stroke={accent} strokeWidth="1" />
      <circle cx="42" cy="33" r="2" fill={accent} />
      <circle cx="58" cy="33" r="2" fill={accent} />
    </g>
  ),
  dome: ({ primary, accent }) => (
    <g>
      <path d="M28 45 Q28 10 50 10 Q72 10 72 45" fill={primary} stroke={accent} strokeWidth="1.5" />
      <ellipse cx="50" cy="45" rx="22" ry="8" fill={primary} stroke={accent} strokeWidth="1.5" />
      <circle cx="42" cy="34" r="3" fill={accent} opacity="0.9" />
      <circle cx="58" cy="34" r="3" fill={accent} opacity="0.9" />
    </g>
  ),
  crest: ({ primary, secondary, accent }) => (
    <g>
      <circle cx="50" cy="38" r="20" fill={primary} stroke={accent} strokeWidth="1.5" />
      <path d="M50 8 L46 18 L54 18 Z" fill={secondary} stroke={accent} strokeWidth="1" />
      <circle cx="43" cy="35" r="2.5" fill={accent} />
      <circle cx="57" cy="35" r="2.5" fill={accent} />
      <path d="M44 44 Q50 48 56 44" stroke={accent} strokeWidth="1.5" fill="none" />
    </g>
  ),
  minimal: ({ primary, accent }) => (
    <g>
      <circle cx="50" cy="35" r="18" fill="none" stroke={primary} strokeWidth="2.5" />
      <circle cx="44" cy="33" r="2" fill={accent} />
      <circle cx="56" cy="33" r="2" fill={accent} />
    </g>
  ),
}

// Body frame SVG components
export const BodyFrames: Record<string, React.FC<PartProps>> = {
  standard: ({ primary, accent }) => (
    <g>
      <path d="M35 55 L30 85 L70 85 L65 55" fill={primary} stroke={accent} strokeWidth="1.5" />
      <circle cx="50" cy="65" r="4" fill={accent} opacity="0.5" />
    </g>
  ),
  armored: ({ primary, secondary, accent }) => (
    <g>
      <path d="M30 55 L25 85 L75 85 L70 55" fill={primary} stroke={accent} strokeWidth="1.5" />
      <rect x="34" y="58" width="32" height="6" rx="2" fill={secondary} opacity="0.5" />
      <rect x="36" y="68" width="28" height="4" rx="1" fill={secondary} opacity="0.3" />
      <line x1="50" y1="55" x2="50" y2="85" stroke={accent} strokeWidth="0.5" opacity="0.3" />
    </g>
  ),
  slim: ({ primary, accent }) => (
    <g>
      <path d="M40 55 L36 85 L64 85 L60 55" fill={primary} stroke={accent} strokeWidth="1.5" />
      <line x1="50" y1="60" x2="50" y2="80" stroke={accent} strokeWidth="0.8" opacity="0.3" />
    </g>
  ),
  heavy: ({ primary, secondary, accent }) => (
    <g>
      <path d="M25 55 L20 88 L80 88 L75 55" fill={primary} stroke={accent} strokeWidth="2" />
      <rect x="30" y="60" width="40" height="8" rx="3" fill={secondary} opacity="0.4" />
      <rect x="32" y="72" width="36" height="6" rx="2" fill={secondary} opacity="0.3" />
    </g>
  ),
  floating: ({ primary, accent }) => (
    <g>
      <ellipse cx="50" cy="65" rx="18" ry="10" fill={primary} stroke={accent} strokeWidth="1.5" opacity="0.8" />
      <ellipse cx="50" cy="82" rx="12" ry="3" fill={accent} opacity="0.15" />
      <line x1="50" y1="75" x2="50" y2="79" stroke={accent} strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
    </g>
  ),
  holographic: ({ primary, accent }) => (
    <g>
      <path d="M35 55 L30 85 L70 85 L65 55" fill={primary} fillOpacity="0.3" stroke={accent} strokeWidth="1" strokeDasharray="3,3" />
      <line x1="35" y1="65" x2="65" y2="65" stroke={accent} strokeWidth="0.5" opacity="0.3" />
      <line x1="33" y1="75" x2="67" y2="75" stroke={accent} strokeWidth="0.5" opacity="0.3" />
    </g>
  ),
}

// Accessory SVG components
export const AccessoryParts: Record<string, React.FC<PartProps>> = {
  antenna: ({ accent }) => (
    <g>
      <line x1="50" y1="12" x2="50" y2="0" stroke={accent} strokeWidth="1.5" />
      <circle cx="50" cy="0" r="2.5" fill={accent} />
    </g>
  ),
  headset: ({ accent }) => (
    <g>
      <path d="M26 30 Q26 28 28 28 L30 28 L30 38 L28 38 Q26 38 26 36 Z" fill={accent} opacity="0.7" />
      <path d="M74 30 Q74 28 72 28 L70 28 L70 38 L72 38 Q74 38 74 36 Z" fill={accent} opacity="0.7" />
      <path d="M28 28 Q28 14 50 14 Q72 14 72 28" stroke={accent} strokeWidth="1.5" fill="none" />
    </g>
  ),
  'shoulder-pads': ({ accent }) => (
    <g>
      <ellipse cx="24" cy="60" rx="8" ry="5" fill={accent} opacity="0.3" />
      <ellipse cx="76" cy="60" rx="8" ry="5" fill={accent} opacity="0.3" />
    </g>
  ),
  wings: ({ accent }) => (
    <g>
      <path d="M25 60 Q10 50 8 35 Q15 45 25 55" fill={accent} opacity="0.2" stroke={accent} strokeWidth="0.5" />
      <path d="M75 60 Q90 50 92 35 Q85 45 75 55" fill={accent} opacity="0.2" stroke={accent} strokeWidth="0.5" />
    </g>
  ),
  shield: ({ accent }) => (
    <g>
      <path d="M50 88 L42 82 Q38 70 50 65 Q62 70 58 82 Z" fill={accent} opacity="0.25" stroke={accent} strokeWidth="1" />
    </g>
  ),
  scanner: ({ accent }) => (
    <g>
      <rect x="72" y="28" width="8" height="3" rx="1" fill={accent} opacity="0.7" />
      <circle cx="82" cy="29.5" r="2" fill={accent} opacity="0.5" />
    </g>
  ),
  cloak: ({ accent }) => (
    <g>
      <path d="M28 50 Q20 65 22 88 L78 88 Q80 65 72 50" fill={accent} opacity="0.1" stroke={accent} strokeWidth="0.5" strokeDasharray="2,2" />
    </g>
  ),
  halo: ({ accent }) => (
    <g>
      <ellipse cx="50" cy="8" rx="14" ry="4" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6" />
    </g>
  ),
}

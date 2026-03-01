/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          card: 'var(--bg-card)',
        },
        accent: {
          orange: 'var(--accent-orange)',
          coral: 'var(--accent-coral)',
          purple: 'var(--accent-purple)',
          blue: 'var(--accent-blue)',
          cyan: 'var(--accent-cyan)',
          green: 'var(--accent-green)',
          red: 'var(--accent-red)',
          yellow: 'var(--accent-yellow)',
        },
        tactical: {
          amber: 'var(--tactical-amber)',
          cyan: 'var(--tactical-cyan)',
          green: 'var(--tactical-green)',
          red: 'var(--tactical-red)',
        },
        hud: {
          panel: 'var(--hud-panel)',
          glass: 'var(--hud-glass)',
          border: 'var(--hud-border)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px var(--accent-orange)', opacity: '1' },
          '50%': { boxShadow: '0 0 16px var(--accent-orange)', opacity: '0.8' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'data-stream': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'radar': 'radar-sweep 4s linear infinite',
        'data-stream': 'data-stream 2s linear infinite',
      },
    },
  },
  plugins: [],
}

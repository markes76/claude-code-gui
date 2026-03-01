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
          orange: 'rgb(var(--accent-orange) / <alpha-value>)',
          coral: 'rgb(var(--accent-coral) / <alpha-value>)',
          purple: 'rgb(var(--accent-purple) / <alpha-value>)',
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          cyan: 'rgb(var(--accent-cyan) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          red: 'rgb(var(--accent-red) / <alpha-value>)',
          yellow: 'rgb(var(--accent-yellow) / <alpha-value>)',
        },
        tactical: {
          amber: 'rgb(var(--tactical-amber) / <alpha-value>)',
          cyan: 'rgb(var(--tactical-cyan) / <alpha-value>)',
          green: 'rgb(var(--tactical-green) / <alpha-value>)',
          red: 'rgb(var(--tactical-red) / <alpha-value>)',
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
          '0%, 100%': { boxShadow: '0 0 4px rgb(var(--accent-orange))', opacity: '1' },
          '50%': { boxShadow: '0 0 16px rgb(var(--accent-orange))', opacity: '0.8' },
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

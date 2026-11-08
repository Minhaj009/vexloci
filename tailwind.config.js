/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#080A0F',
        surface: '#11151F',
        'surface-elevated': '#161B28',
        'border-grid': '#1E2536',
        'text-primary': '#F1F5F9',
        'text-muted': '#94A3B8',
        'accent-cyan': '#00F5D4',
        'accent-amber': '#F59E0B',
        'accent-crimson': '#FF2A54',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Newsreader', 'IBM Plex Serif', 'serif'],
      },
      spacing: {
        'safe-x': '96px',
        'safe-y': '72px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

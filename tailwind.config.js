/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        t: {
          bg:    '#0a0a0a',
          card:  '#111111',
          border:'#1a2e20',
          green: '#00ff88',
          gdim:  '#00cc66',
          gdark: '#003311',
          amber: '#ffaa00',
          red:   '#ff4455',
          blue:  '#44aaff',
          text:  '#d4d4d4',
          muted: '#556655',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Cascadia Code"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

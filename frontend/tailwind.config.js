/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CodeSmart design system colors
        'cs-bg': '#0d1117',
        'cs-surface': '#161b22',
        'cs-surface-2': '#21262d',
        'cs-border': '#30363d',
        'cs-text': '#e6edf3',
        'cs-text-muted': '#8b949e',
        'cs-accent': '#7c3aed',
        'cs-accent-2': '#06b6d4',
        'cs-success': '#3fb950',
        'cs-warning': '#d29922',
        'cs-error': '#f85149',
        'cs-stack': '#1e3a5f',
        'cs-heap': '#1a3a2e',
        'cs-string-pool': '#3a1a2e',
        'cs-static': '#3a3a1a',
        'cs-method-area': '#2a1a3a',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow': 'flow 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        flow: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124,58,237,0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(124,58,237,0.9)' },
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // F1 Racing Theme
        'racing-red': '#E10600',
        'racing-black': '#0D0D0D',
        'carbon': '#1A1A1A',
        'carbon-light': '#2D2D2D',
        'pit-wall': '#15151E',
        // Timing/Delta Colors
        'timing-green': '#00FF00',
        'timing-purple': '#A020F0',
        'timing-yellow': '#FFD700',
        // Delta semantic colors
        'delta-positive': '#00FF00', // Green - gained time
        'delta-negative': '#FF0000', // Red - lost time
        'delta-pb': '#A020F0', // Purple - personal best
        // Tire compounds (semantic)
        'tire-soft': '#FF0000',
        'tire-medium': '#FFD700',
        'tire-hard': '#FFFFFF',
        'tire-inter': '#43B02A',
        'tire-wet': '#0067AD',
        // Team colors
        'ferrari': '#DC0000',
        'redbull': '#0600EF',
        'mercedes': '#00D2BE',
        'mclaren': '#FF8700',
        'aston': '#006F62',
        'alpine': '#0090FF',
        'williams': '#005AFF',
        'haas': '#B6BABD',
        'sauber': '#52E252',
        'rb': '#2B4562',
      },
      fontFamily: {
        'display': ['Titillium Web', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'racing': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'strategy-pulse': 'strategyPulse 1.5s ease-in-out infinite',
        'snake-reorder': 'snakeReorder 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        strategyPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(225, 6, 0, 0.5)',
            borderColor: 'rgba(225, 6, 0, 0.5)',
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(225, 6, 0, 0.8), 0 0 40px rgba(225, 6, 0, 0.4)',
            borderColor: 'rgba(225, 6, 0, 1)',
          },
        },
        snakeReorder: {
          '0%': { transform: 'translateY(-10px)', opacity: 0.5 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
      backgroundImage: {
        'carbon-fiber': "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23333333' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 5v1h6V0z'/%3E%3C/g%3E%3C/svg%3E\")",
        'grid-pattern': "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
      },
      gridTemplateColumns: {
        'dashboard': '3fr 6fr 3fr',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // App canvas / surfaces (warm neutral, see src/index.css for the semantics)
        canvas: '#F6F6F3',
        surface: '#FFFFFF',
        line: '#E7E6E1',
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        // Legacy tokens still referenced by a few pages
        dark: {
          bg: '#0B1220',
          surface: '#141C2A',
          border: '#233047',
          text: '#E6EAF2',
        },
        accent: '#00D48E',
      },
      fontFamily: {
        sans: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      // Elevation is layered: a short contact shadow plus a soft ambient
      // falloff, always offset downward so surfaces read as lit from above.
      boxShadow: {
        card: '0 1px 2px rgba(20,20,16,0.05), 0 2px 6px -2px rgba(20,20,16,0.04)',
        raised: '0 2px 4px rgba(20,20,16,0.05), 0 12px 24px -12px rgba(20,20,16,0.14)',
        pop: '0 1px 2px rgba(20,20,16,0.06), 0 16px 40px -12px rgba(20,20,16,0.22)',
        // Filled controls: contact shadow + a top-edge highlight.
        fill: '0 1px 2px rgba(20,20,16,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        // The one authored moment: page content settles into focus.
        page: { from: { opacity: 0, transform: 'translateY(6px)', filter: 'blur(3px)' }, to: { opacity: 1, transform: 'none', filter: 'blur(0)' } },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.2, 0, 0, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'scale-in': 'scale-in 160ms cubic-bezier(0.2, 0, 0, 1) both',
        'slide-in': 'slide-in 250ms cubic-bezier(0.32, 0.72, 0, 1) both',
        page: 'page 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}

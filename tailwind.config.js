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
        sans: ['Inter', '"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,16,12,0.04), 0 0 0 1px rgba(16,16,12,0.02)',
        pop: '0 12px 32px -8px rgba(16,16,12,0.18), 0 2px 6px rgba(16,16,12,0.06)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.2, 0, 0, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'scale-in': 'scale-in 160ms cubic-bezier(0.2, 0, 0, 1) both',
      },
    },
  },
  plugins: [],
}

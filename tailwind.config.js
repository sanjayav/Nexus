/** Mainland-China system CJK faces (no CJK web font is downloaded). */
const CJK_FALLBACK = ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans SC"', '"Source Han Sans SC"']

/**
 * Latin is always self-hosted Inter (public/fonts, see index.css @font-face);
 * Hanzi fall through to the platform face.
 */
const SANS = ['InterVariable', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', ...CJK_FALLBACK, 'system-ui', 'sans-serif']
const MONO = ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', ...CJK_FALLBACK, 'monospace']

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals — resolve through the CSS tokens so they follow light/dark.
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          inverse: 'var(--bg-inverse)',
          'inverse-soft': 'var(--bg-inverse-soft)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
          subtle: 'var(--border-subtle)',
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          strong: 'var(--color-brand-strong)',
          soft: 'var(--color-brand-soft)',
        },
        // Semantic accents (legacy DEFAULT/light pairs; the Tailwind numeric
        // scales are still merged in for now — the pages lint guard is wave 2).
        teal: { DEFAULT: '#0F7B6F', light: '#E1F5EE' },
        blue: { DEFAULT: '#1E5FA5', light: '#E6F1FB' },
        purple: { DEFAULT: '#534AB7', light: '#EEEDFE' },
        amber: { DEFAULT: '#BA7517', light: '#FAEEDA' },
        red: { DEFAULT: '#A32D2D', light: '#FCEBEB' },
        coral: '#D85A30',
        green: { DEFAULT: '#3B6D11', light: '#EAF3DE' },
      },
      fontFamily: {
        display: SANS,
        body: SANS,
        sans: SANS,
        mono: MONO,
      },
      // One ramp. Legacy keys (xs…5xl) map onto it; the named steps are the
      // vocabulary for new work. `display-lg` is the 40/44 "display" step —
      // named so it doesn't collide with the legacy `.text-display` face class.
      fontSize: {
        'micro':      ['11px', { lineHeight: '14px' }],
        'caption':    ['12px', { lineHeight: '16px' }],
        'small':      ['13px', { lineHeight: '20px' }],
        'body':       ['14px', { lineHeight: '22px' }],
        'h3':         ['16px', { lineHeight: '24px', letterSpacing: '-0.006em', fontWeight: '600' }],
        'h2':         ['20px', { lineHeight: '28px', letterSpacing: '-0.012em', fontWeight: '600' }],
        'h1':         ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-lg': ['40px', { lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: '650' }],
        'display-xl': ['56px', { lineHeight: '60px', letterSpacing: '-0.03em', fontWeight: '650' }],
        'xs':   ['12px', { lineHeight: '16px' }],
        'sm':   ['13px', { lineHeight: '20px' }],
        'base': ['14px', { lineHeight: '22px' }],
        'lg':   ['16px', { lineHeight: '24px' }],
        'xl':   ['20px', { lineHeight: '28px' }],
        '2xl':  ['24px', { lineHeight: '30px' }],
        '3xl':  ['28px', { lineHeight: '34px' }],
        '4xl':  ['40px', { lineHeight: '44px' }],
        '5xl':  ['56px', { lineHeight: '60px' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        'full': '9999px',
      },
      // Three elevations only — every Tailwind shadow resolves to one of them.
      boxShadow: {
        'sm': 'var(--shadow-card)',
        'DEFAULT': 'var(--shadow-card)',
        'card': 'var(--shadow-card)',
        'md': 'var(--shadow-raised)',
        'lg': 'var(--shadow-raised)',
        'raised': 'var(--shadow-raised)',
        'xl': 'var(--shadow-overlay)',
        '2xl': 'var(--shadow-overlay)',
        'overlay': 'var(--shadow-overlay)',
      },
      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
        '240': '240ms',
        '250': '250ms',
        'micro': '120ms',
        'fast': '180ms',
        'base': '240ms',
        'slow': '400ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        'page-x':  'clamp(1rem, 4vw, 3rem)',
        'page-y':  'clamp(2rem, 5vh, 4rem)',
        'section': '4rem',
        'card':    '2rem',
        'card-y':  '1.5rem',
        'card-x':  '2rem',
      },
      maxWidth: {
        'page':         '1280px',
        'page-narrow':  '960px',
        'page-prose':   '760px',
      },
    },
  },
  plugins: [],
}

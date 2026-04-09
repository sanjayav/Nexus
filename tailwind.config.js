/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals
        surface: {
          primary: '#FFFFFF',
          secondary: '#F7F7F5',
          tertiary: '#EEEDE8',
          inverse: '#1A1A1A',
          'inverse-soft': '#2C2C2A',
        },
        content: {
          primary: '#1A1A1A',
          secondary: '#6B6B67',
          tertiary: '#9C9A92',
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E4DF',
          strong: '#D3D1C7',
          subtle: '#F0EFE9',
        },
        // Semantic accents
        teal: {
          DEFAULT: '#0F7B6F',
          light: '#E1F5EE',
        },
        blue: {
          DEFAULT: '#1E5FA5',
          light: '#E6F1FB',
        },
        purple: {
          DEFAULT: '#534AB7',
          light: '#EEEDFE',
        },
        amber: {
          DEFAULT: '#BA7517',
          light: '#FAEEDA',
        },
        red: {
          DEFAULT: '#A32D2D',
          light: '#FCEBEB',
        },
        coral: '#D85A30',
        green: {
          DEFAULT: '#3B6D11',
          light: '#EAF3DE',
        },
      },
      fontFamily: {
        display: ['"Instrument Sans"', '"DM Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'xs': '11px',
        'sm': '13px',
        'base': '15px',
        'lg': '17px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '40px',
        '5xl': '56px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 2px 8px rgba(0,0,0,0.06)',
        'lg': '0 4px 16px rgba(0,0,0,0.08)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)',
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
      },
    },
  },
  plugins: [],
}

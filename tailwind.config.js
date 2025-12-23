/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        'google': 'var(--radius-button)',
        'button': 'var(--radius-button)',
        'card': 'var(--radius-card)',
        'container': 'var(--radius-container)',
      },
      colors: {
        google: {
          blue: 'var(--brand-blue)',
          'blue-muted': '#7091C7',
          red: 'var(--brand-red)',
          yellow: 'var(--brand-yellow)',
          green: 'var(--brand-green)',
          'green-light': 'var(--brand-green-light)',
        }
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { backgroundColor: 'var(--brand-green-light)' }, // lighter green
          '50%': { backgroundColor: 'var(--brand-yellow)' }, // gold
        }
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}


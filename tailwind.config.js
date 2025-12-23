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
        'google': '8px',
        'button': '12px',
        'card': '20px',
        'container': '32px',
      },
      colors: {
        google: {
          blue: '#4285F4',
          'blue-muted': '#7091C7',
          red: '#EA4335',
          yellow: '#FBBC05',
          green: '#34A853',
          'green-light': '#5DB975',
        }
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { backgroundColor: '#5DB975' }, // lighter green
          '50%': { backgroundColor: '#FBBC05' }, // gold
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


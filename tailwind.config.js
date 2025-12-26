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
        'widget': 'var(--radius-widget)',
        'sidebar': 'var(--radius-sidebar)',
        'project-info': 'var(--radius-project-info)',
        'metadata': 'var(--radius-metadata-card)',
        'focus-card': 'var(--radius-focus-card)',
        'task-button': 'var(--radius-task-button)',
      },
      colors: {
        google: {
          blue: 'var(--brand-blue)',
          'blue-muted': '#7091C7',
          red: 'var(--brand-red)',
          yellow: 'var(--brand-yellow)',
          green: 'var(--brand-green)',
          'green-light': 'var(--brand-green-light)',
        },
        'app-bg': 'var(--app-bg)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'console-bg': 'var(--console-bg)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-heading': 'var(--text-heading)',
      },
      fontWeight: {
        'heading': 'var(--font-weight-heading)',
      },
      letterSpacing: {
        'heading': 'var(--letter-spacing-heading)',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { backgroundColor: 'var(--brand-green-light)' }, // lighter green
          '50%': { backgroundColor: 'var(--brand-yellow)' }, // gold
        },
        'pulse-slow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        'pulse-quick': {
          '0%, 100%': { opacity: 0 },
          '50%': { opacity: 0.4 },
        },
        'wave': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(33.33%)' }
        }
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'pulse-quick': 'pulse-quick 0.8s ease-in-out infinite',
        'wave': 'wave 8s linear infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}


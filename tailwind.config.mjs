/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lab: {
          bg: 'rgb(var(--lab-bg) / <alpha-value>)',
          surface: 'rgb(var(--lab-surface) / <alpha-value>)',
          border: 'rgb(var(--lab-border) / <alpha-value>)',
          text: 'rgb(var(--lab-text) / <alpha-value>)',
          muted: 'rgb(var(--lab-muted) / <alpha-value>)',
          accent: 'rgb(var(--lab-accent) / <alpha-value>)',
          secondary: 'rgb(var(--lab-secondary) / <alpha-value>)',
          success: 'rgb(var(--lab-success) / <alpha-value>)',
          error: 'rgb(var(--lab-error) / <alpha-value>)',
          gold: 'rgb(var(--lab-gold) / <alpha-value>)',
          'gold-soft': 'rgb(var(--lab-gold-soft) / <alpha-value>)',
          'gold-classic': 'rgb(var(--lab-gold-classic) / <alpha-value>)',
          'gold-dark': 'rgb(var(--lab-gold-dark) / <alpha-value>)',
        }
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', 'monospace'],
        'sans': ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px var(--shadow-color)',
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(var(--grid-color) 1px, transparent 1px)",
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
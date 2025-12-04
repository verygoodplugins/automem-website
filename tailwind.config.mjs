/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lab: {
          bg: 'var(--lab-bg)',
          surface: 'var(--lab-surface)',
          border: 'var(--lab-border)',
          text: 'var(--lab-text)',
          muted: 'var(--lab-muted)',
          accent: 'var(--lab-accent)',
          secondary: 'var(--lab-secondary)',
          success: 'var(--lab-success)',
          error: 'var(--lab-error)',
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
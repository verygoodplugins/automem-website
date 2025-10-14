/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        automem: {
          bgdark: '#2D2B28',
          surface: '#3A3734',
          border: '#4A4744',
          text: '#F5F3EF',
          muted: '#9B9996',
          accent: '#E3A857',
          blue: '#5C9FD8',
          green: '#4AA181',
          primary: '#E3A857',
          secondary: '#5C9FD8',
          dark: '#2D2B28',
          light: '#F5F3EF'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}

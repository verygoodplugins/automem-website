/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // The "Memory Lab" Theme
        // Less "Code Editor", more "Schematic/Blueprint"
        core: {
          bg: '#F0F4F8',      // Cool blueprint grey/white
          text: '#102A43',    // Deep Navy instead of Black
          muted: '#627D98',   // Steel Blue
          accent: '#D6409F',  // Hot Pink/Magenta (Fun!)
          secondary: '#38BEC9', // Cyan (Tech)
          line: '#BCCCDC',    // Blueprint lines
          selection: '#F0BBDD' // Pink selection
        }
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', 'monospace'],
        // Add a display font later if we want more flavor
        'sans': ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        // "Pop" shadow - sharp offset
        'hard': '6px 6px 0px 0px rgba(16, 42, 67, 0.1)',
        'glow': '0 0 20px rgba(214, 64, 159, 0.3)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #E0E6ED 1px, transparent 1px), linear-gradient(to bottom, #E0E6ED 1px, transparent 1px)",
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // The "Memory Lab" Theme
        lab: {
          bg: '#0A0A0A',      // Deep Navy/Charcoal
          surface: '#1A1A1A',   // Slightly lighter surface
          border: '#333333',   // Subtle border
          text: '#E0E0E0',    // Light grey text
          muted: '#888888',   // Muted grey
          accent: '#FF33CC',  // Hot Pink
          secondary: '#00FFFF', // Cyan/Teal
          success: '#CCFF00', // Acid Green
          error: '#FF0000',   // Red
        },
        // Legacy 'core' mapping for backwards compat during migration
        core: {
            bg: '#0A0A0A',
            text: '#E0E0E0',
            muted: '#888888',
            accent: '#FF33CC',
            secondary: '#00FFFF',
            line: '#333333',
            selection: '#FF33CC'
        }
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', 'monospace'],
        'sans': ['"JetBrains Mono"', 'monospace'], // Force mono everywhere
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px rgba(0,0,0,1)', // For brutalist pop
        'glow': '0 0 20px rgba(255, 51, 204, 0.3)',
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(#333333 1px, transparent 1px)",
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
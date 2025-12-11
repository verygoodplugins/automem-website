# AutoMem.AI Website

## Overview
An Astro-based website for AutoMem.AI - an Intelligent Memory Service for AI Agents. The site features documentation, a chat demo with MSN Messenger-style animation, and dark mode styling throughout.

## Project Structure
- `src/pages/` - Astro pages (index, about, docs, blog)
- `src/pages/docs/` - Documentation subpages (quickstart, features, screenshots)
- `src/components/` - Reusable Astro components
- `src/layouts/` - Layout components
- `src/styles/global.css` - Global styles and CSS variables
- `public/` - Static assets (screenshots, images)

## Key Technical Decisions

### Dark Mode Styling
The site uses CSS custom properties (lab theme) for dark mode instead of Tailwind's `dark:` prefix classes. This ensures consistent styling throughout:

- `text-lab-text` - Primary text color (light)
- `text-lab-muted` - Secondary/muted text color
- `text-lab-accent` - Accent color (cyan)
- `text-lab-secondary` - Secondary accent (pink)
- `text-lab-success` - Success/green color
- `bg-lab-bg` - Dark background
- `bg-lab-surface` - Elevated surface background
- `border-lab-border` - Border color

### Chat Demo Animation
The chat demo on the homepage uses a spacer-based approach to create MSN Messenger-style animation where new messages appear at the bottom and push older messages upward. JavaScript dynamically shrinks a spacer element as messages are appended.

### Configuration
- Port: 5000 (required for Replit)
- Host: 0.0.0.0
- Node adapter for SSR

## Running the Project
The project runs via the configured workflow:
```
npx astro dev --host 0.0.0.0 --port 5000
```

## User Preferences
- Bio should mention Jack Arturo's companies (Very Good Plugins, EchoDash), products (WP Fusion, Fatal Error Notify), blog (drunk.support), location (Berlin), and cat (Kitty Rick)
- UTM tracking parameters on outbound links for analytics
- Consistent dark mode styling across all pages

## Recent Changes (December 2025)
- Updated all documentation pages to use lab theme CSS variables instead of Tailwind dark: classes
- Fixed dark mode text readability across docs, quickstart, features, and screenshots pages
- Added consistent border and background styling to cards and code blocks
- Updated about page bio with new content
- Added UTM parameters to outbound links

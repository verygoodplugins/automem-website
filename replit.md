# AutoMem.AI Website

## Overview
An Astro-based website for AutoMem.AI - an Intelligent Memory Service for AI Agents. The site features documentation, a chat demo with MSN Messenger-style animation, and a cohesive gold-themed brand identity with the AutoJack mascot.

## Project Structure
- `src/pages/` - Astro pages (index, about, docs, blog, 404, mascot-lab)
- `src/pages/docs/` - Documentation subpages (quickstart, features, screenshots)
- `src/components/` - Reusable Astro components
- `src/components/AutoJack.astro` - Main mascot component with 6 expressions
- `src/components/AutoJackDrive.astro` - Memory loading animation
- `src/components/AutoJackPeek.astro` - Interactive peek helper (appears on scroll)
- `src/layouts/` - Layout components
- `src/styles/global.css` - Global styles and CSS variables
- `public/` - Static assets (screenshots, images)

## Brand Identity

### Color Scheme (Gold Era)
The site uses a gold-themed color palette that matches the AutoJack mascot:

**Dark Mode (Default)**
- `--lab-accent: #F9D857` - Luminous Gold (primary accent)
- `--lab-secondary: #5B21B6` - Deep Violet (complementary)
- `--lab-success: #34D399` - Memory Green
- `--lab-gold: #F9D857` - Luminous Gold
- `--lab-gold-soft: #FFD966` - Soft Gold (for variety)
- `--lab-gold-classic: #FFC107` - Classic Gold
- `--lab-gold-dark: #DAA520` - Dark Gold (shadows)

**Light Mode**
- `--lab-accent: #B8860B` - Rich Gold
- `--lab-secondary: #8B5CF6` - Purple
- Warm cream background (#FFFBF0)

### AutoJack Mascot
Gold floppy disk mascot with 6 expressions:
- **confident** - Default resting state (normal eyes, subtle smile)
- **wink** - Playful (one eye closed)
- **happy** - Celebrating (curved eyes, big smile)
- **sleeping** - Inactive (closed eyes, line mouth)
- **bliss** - Memory loaded (curved happy eyes, blush cheeks #ff9999)
- **focused** - Processing (heavy brows, concentrated look)

Mascot colors:
- Primary gold: #F9D857 (Luminous)
- Gradient light: #FFE082
- Gradient dark: #DAA520
- Metal shutter: #e5e5e5
- Stroke: #1a1a1a
- Drive green: #34D399
- Blush: #ff9999

### Design Elements
- Film grain overlay for retro texture (3% opacity)
- Line numbers in left margin (memory address style)
- Monospace font (JetBrains Mono)
- Grid dot pattern background

## Key Technical Decisions

### Lab Theme CSS Variables
The site uses CSS custom properties instead of Tailwind's `dark:` prefix classes:
- `text-lab-text` - Primary text color
- `text-lab-muted` - Secondary/muted text
- `text-lab-accent` - Gold accent color
- `text-lab-secondary` - Purple secondary
- `bg-lab-bg` - Background
- `bg-lab-surface` - Elevated surface
- `border-lab-border` - Border color

### Chat Demo Animation
MSN Messenger-style animation where new messages appear at the bottom and push older messages upward using a JavaScript-controlled spacer element.

### Configuration
- Port: 5000 (required for Replit)
- Host: 0.0.0.0
- Node adapter for SSR

## Running the Project
```
npx astro dev --host 0.0.0.0 --port 5000
```

## User Preferences
- Bio should mention Jack Arturo's companies (Very Good Plugins, EchoDash), products (WP Fusion, Fatal Error Notify), blog (drunk.support), location (Berlin), and cat (Kitty Rick)
- UTM tracking parameters on outbound links for analytics
- Consistent gold theming across all pages
- AutoJack mascot should be ever-present and interactive
- Vibe: Open source, free, fun, cool, powerful

## Recent Changes (December 2025)
- **Gold Color Scheme**: Updated from cyan/pink to gold/purple to match AutoJack mascot
- **AutoJack Mascot**: Created full mascot system with 6 expressions (AutoJack.astro)
- **Drive Animation**: Memory loading animation (AutoJackDrive.astro)
- **Peek Helper**: Interactive AutoJack that peeks from bottom right on scroll (AutoJackPeek.astro)
- **404 Page**: Fun error page with confused AutoJack, floating question marks, glitch effect
- **Film Grain**: Added subtle texture overlay for retro aesthetic
- **Updated Footer**: New footer with AutoJack and "Made with memory by cool people"
- **Mascot Lab**: Showcase page at /mascot-lab for all expressions and brand colors
- Dark mode styling fixed across all documentation pages
- About page bio updated with new content
- UTM parameters added to outbound links

# AutoMem Design Guidelines

A comprehensive guide to the AutoMem brand identity, colors, components, and animations for consistent implementation across the ecosystem.

---

## Brand Identity

### Overview
AutoMem is an intelligent memory service for AI agents. The brand identity combines retro-computing nostalgia (floppy disk) with modern, clean design. The vibe is: **Open source, free, fun, cool, powerful**.

### The AutoJack Mascot
AutoJack is a gold floppy disk character with expressive features. He represents memory storage and retrieval.

**Location:** `src/components/AutoJack.astro`

---

## Color Palette

### Primary Colors (CSS Variables)

```css
/* Dark Mode (Default) */
:root {
  --lab-bg: 13 13 13;           /* #0d0d0d - Near black background */
  --lab-surface: 26 26 26;       /* #1a1a1a - Elevated surfaces */
  --lab-border: 51 51 51;        /* #333333 - Borders */
  --lab-text: 245 245 245;       /* #f5f5f5 - Primary text */
  --lab-muted: 115 115 115;      /* #737373 - Secondary text */
  --lab-accent: 249 216 87;      /* #F9D857 - Luminous Gold (primary) */
  --lab-secondary: 91 33 182;    /* #5B21B6 - Deep Violet */
  --lab-success: 52 211 153;     /* #34D399 - Memory Green */
  --lab-error: 239 68 68;        /* #EF4444 - Error Red */
}

/* Light Mode */
.light {
  --lab-bg: 255 251 240;         /* #FFFBF0 - Warm cream */
  --lab-surface: 255 255 255;    /* #FFFFFF - White */
  --lab-border: 229 229 229;     /* #E5E5E5 - Light gray */
  --lab-text: 26 26 26;          /* #1a1a1a - Near black */
  --lab-muted: 115 115 115;      /* #737373 - Gray */
  --lab-accent: 184 134 11;      /* #B8860B - Rich Gold */
  --lab-secondary: 139 92 246;   /* #8B5CF6 - Purple */
}
```

### Gold Palette (AutoJack Colors)
| Name | Hex | Usage |
|------|-----|-------|
| Luminous Gold | `#F9D857` | Primary accent, AutoJack body |
| Soft Gold | `#FFD966` | Highlights, hover states |
| Classic Gold | `#FFC107` | Buttons, CTAs |
| Dark Gold | `#DAA520` | Shadows, gradients |
| Light Gold | `#FFE082` | Gradient highlights |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Memory Green | `#34D399` | Success, active states, connected |
| Deep Violet | `#5B21B6` | Secondary accent, links |
| Error Red | `#EF4444` | Errors, warnings |
| Blush Pink | `#ff9999` | AutoJack blush cheeks |

---

## AutoJack Mascot Specifications

### Dimensions
- **Standard size:** 60x60px (SVG, scales well)
- **Large size:** 140x140px (homepage hero)
- **Icon size:** 24x24px (favicons, small UI)

### SVG Structure
```svg
<!-- Base disk with gradient -->
<rect width="60" height="60" rx="6" fill="url(#diskGold)" stroke="#1a1a1a" stroke-width="2"/>

<!-- Metal shutter area -->
<rect x="18" y="8" width="24" height="15" rx="2" fill="#e5e5e5" stroke="#1a1a1a" stroke-width="1.5"/>
<rect x="33" y="11" width="7" height="9" rx="1" fill="#1a1a1a"/> <!-- Window -->

<!-- Face elements -->
<circle cx="24" cy="38" r="3" fill="#1a1a1a"/> <!-- Left eye -->
<circle cx="36" cy="38" r="3" fill="#1a1a1a"/> <!-- Right eye -->
<path d="M26 46 Q30 50 34 46" stroke="#1a1a1a" stroke-width="2" fill="none"/> <!-- Smile -->
```

### Gold Gradient Definition
```svg
<linearGradient id="diskGold" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" style="stop-color:#FFE082"/>
  <stop offset="50%" style="stop-color:#F9D857"/>
  <stop offset="100%" style="stop-color:#DAA520"/>
</linearGradient>
```

### Expressions (6 States)

| Expression | Description | Eye Style | Mouth | Special |
|------------|-------------|-----------|-------|---------|
| **confident** | Default resting | Circle eyes | Subtle smile | - |
| **wink** | Playful | One eye closed | Smile | - |
| **happy** | Celebrating | Curved ^^ eyes | Big smile | - |
| **sleeping** | Inactive | Closed lines | Line mouth | ZZZ |
| **bliss** | Memory loaded | Happy curved eyes | Wide smile | Pink blush cheeks |
| **focused** | Processing | Heavy brows | Concentrated | - |

**Bliss Expression Details (for animations):**
```svg
<!-- Happy curved eyes (replace circles) -->
<path d="M21 38 Q24 32 27 38" stroke="#1a1a1a" stroke-width="2" fill="none"/>
<path d="M33 38 Q36 32 39 38" stroke="#1a1a1a" stroke-width="2" fill="none"/>

<!-- Blush cheeks -->
<circle cx="15" cy="42" r="4" fill="#ff9999" opacity="0.7"/>
<circle cx="45" cy="42" r="4" fill="#ff9999" opacity="0.7"/>
```

---

## Typography

### Font Family
```css
font-family: 'JetBrains Mono', monospace;
```

### Usage
- **All text:** JetBrains Mono (monospace aesthetic)
- **Headings:** Bold, tracking-tighter
- **Body:** Regular weight
- **Code/Labels:** Same font, maintains consistency

---

## Component Patterns

### Buttons

**Primary (Gold)**
```html
<button class="px-6 py-3 bg-lab-accent text-lab-bg font-bold rounded-lg hover:scale-105 transition-transform">
  Action Text
</button>
```

**Secondary (Outline)**
```html
<button class="px-6 py-3 border-2 border-lab-border text-lab-text rounded-lg hover:border-lab-accent transition-colors">
  Secondary Action
</button>
```

### Cards
```html
<div class="bg-lab-surface border-2 border-lab-text p-6 rounded-lg shadow-hard">
  <!-- Content -->
</div>
```

### Shadow Style
```css
box-shadow: 4px 4px 0px 0px currentColor; /* Hard shadow, retro feel */
```

---

## Animation Guidelines

### Memory Loading Animation
The signature animation shows AutoJack processing memories with a branching node graph.

**Key Elements:**
1. **Chat window** on the left (shows before/after)
2. **AutoJack disk** center-right (glows when active)
3. **Memory nodes** branch outward from center

**Timing:**
- Initial state: 0-400ms
- User message appears: 400-1200ms
- Generic AI response: 1200-2800ms
- AutoMem activates (glow): 2800ms
- Nodes animate in sequence: 3000-5500ms (each node ~300ms delay)
- Enhanced response replaces generic: 6000ms+

**Node Animation:**
```css
.node {
  opacity: 0;
  transform: scale(0);
  transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.node.active {
  opacity: 1;
  transform: scale(1);
}
```

**Connection Lines:**
```css
.connection {
  stroke: rgba(249, 216, 87, 0.2);
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  transition: stroke-dashoffset 1s ease-out;
}
.connection.active {
  stroke-dashoffset: 0;
  stroke: rgba(249, 216, 87, 0.5);
}
```

### Glow Effects
```css
/* AutoJack glow when active */
filter: drop-shadow(0 0 40px rgba(249, 216, 87, 0.8));

/* Node pulse animation */
@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}
```

---

## File Locations

| Asset | Path |
|-------|------|
| AutoJack component | `src/components/AutoJack.astro` |
| AutoJack drive animation | `src/components/AutoJackDrive.astro` |
| AutoJack peek helper | `src/components/AutoJackPeek.astro` |
| Memory hero animation | `src/components/MemoryHero.astro` |
| Global styles | `src/styles/global.css` |
| Tailwind config | `tailwind.config.mjs` |
| Logo (favicon) | `public/autojack-favicon.svg` |
| Mascot showcase | `/mascot-lab` page |

---

## Implementation Checklist

When implementing AutoMem design in new projects:

- [ ] Import JetBrains Mono font
- [ ] Set up CSS variables for colors (dark/light modes)
- [ ] Use gold (#F9D857) as primary accent
- [ ] Include AutoJack SVG with gradient
- [ ] Apply monospace typography throughout
- [ ] Use hard shadows for retro feel
- [ ] Implement dark mode as default
- [ ] Add film grain overlay for texture (optional, 3% opacity)

---

## Contact

For questions about the design system, refer to:
- Website: https://automem.ai
- GitHub: https://github.com/verygoodplugins/automem
- Mascot Lab: https://automem.ai/mascot-lab

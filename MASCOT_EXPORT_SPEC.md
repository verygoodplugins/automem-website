# AutoJack Mascot - Complete Export Specification

A comprehensive guide for implementing the AutoJack floppy disk mascot across all platforms.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Design System Overview](#design-system-overview)
3. [Static Assets](#static-assets)
4. [Web Implementation](#web-implementation)
5. [iOS Implementation](#ios-implementation)
6. [Animation Specifications](#animation-specifications)
7. [Size Guidelines](#size-guidelines)
8. [Agent Adaptation Guide](#agent-adaptation-guide)

---

## Quick Start

### For Web Developers
```tsx
import { MascotWithStyles } from '@/components/mascot-styles';

<MascotWithStyles size={80} expression="confident" accentColor="gold" />
```

### For iOS Developers
Use the static SVGs in `/exports/` as references, convert paths to SwiftUI shapes.

### For Agents
Import `mascot-design-tokens.ts` for all colors, timing, and geometry values.

---

## Design System Overview

### Art Style: Geometric
- Clean, defined shapes with rounded corners
- Subtle drop shadows for depth
- 3px stroke weight at 100px base size
- Scales proportionally to any size

### Brand Personality
- **Confident**: Default resting state
- **Helpful**: Responds to user actions
- **Playful**: Wink for lighthearted moments
- **Blissful**: Pure joy when loading memories

### Core Colors

| Name | Hex | Usage |
|------|-----|-------|
| Gold Primary | `#D4A425` | Disk body |
| Gold Secondary | `#B8860B` | Label area |
| Metal | `#e5e5e5` | Slider |
| Stroke | `#1a1a1a` | All outlines |
| Drive Green | `#34D399` | Indicator, loading glow |
| Blush | `#ff9999` | Rosy cheeks (bliss) |

---

## Static Assets

Located in `/exports/`:

| File | Expression | Use Case |
|------|------------|----------|
| `mascot-static-confident.svg` | Default | App icons, idle states |
| `mascot-static-wink.svg` | Playful | Success messages, tips |
| `mascot-static-happy.svg` | Joyful | Celebrations, achievements |
| `mascot-static-sleeping.svg` | Off | Inactive, powered down |
| `mascot-static-bliss.svg` | Blissful | Memory loaded, peak moments |

### Using Static SVGs

**Inline (recommended for small sizes):**
```html
<img src="/exports/mascot-static-confident.svg" width="40" height="40" alt="AutoJack" />
```

**As React Component:**
```tsx
import MascotConfident from '@/exports/mascot-static-confident.svg?react';

<MascotConfident className="w-10 h-10" />
```

**In CSS:**
```css
.mascot-icon {
  background-image: url('/exports/mascot-static-confident.svg');
  background-size: contain;
}
```

---

## Web Implementation

### React Components

#### Basic Mascot
```tsx
import { MascotWithStyles } from '@/components/mascot-styles';

// Static with expression
<MascotWithStyles 
  size={80} 
  expression="confident"
  accentColor="gold"
  animate={true}  // gentle idle sway
/>

// All expressions
type Expression = "confident" | "wink" | "happy" | "sleeping" | "bliss" | "focused";

// All colors
type AccentColor = "gold" | "cyan" | "purple" | "green" | "coral";
```

#### Power Off Animation
```tsx
import { MascotWithLock } from '@/components/mascot-lock-animation';

<MascotWithLock size={120} accentColor="gold" />
// User can toggle the write-protect switch
```

#### Memory Loading Animation
```tsx
import { MascotDriveAnimation } from '@/components/mascot-drive-animation';

<MascotDriveAnimation 
  size={200} 
  accentColor="gold"
  autoPlay={false}  // or true for automatic loop
/>
```

### Dependencies
```json
{
  "framer-motion": "^10.x",
  "react": "^18.x"
}
```

### Design Tokens
```tsx
import { 
  mascotColors, 
  mascotSizes, 
  mascotTiming,
  mascotGeometry 
} from '@/components/mascot-design-tokens';

// Access any value
const gold = mascotColors.accents.gold.primary; // "#D4A425"
const watchSize = mascotSizes.watchLarge; // 80
const swayDuration = mascotTiming.idle.swayDuration; // 4000
```

### CSS Custom Properties
Add to your global CSS:
```css
:root {
  --mascot-gold: #D4A425;
  --mascot-gold-secondary: #B8860B;
  --mascot-gold-glow: rgba(212, 164, 37, 0.4);
  --mascot-stroke: #1a1a1a;
  --drive-indicator-on: #34D399;
}
```

---

## iOS Implementation

### Option 1: SwiftUI Native (Recommended)

Convert SVG paths to SwiftUI shapes for best performance:

```swift
import SwiftUI

struct FloppyMascot: View {
    let size: CGFloat
    var expression: MascotExpression = .confident
    var accentColor: Color = .mascotGold
    
    var body: some View {
        ZStack {
            // Shadow
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.black.opacity(0.3))
                .offset(x: 2, y: 4)
            
            // Body
            RoundedRectangle(cornerRadius: 8)
                .fill(accentColor)
                .stroke(Color.mascotStroke, lineWidth: 3)
            
            VStack(spacing: 0) {
                // Metal slider
                MetalSlider()
                    .frame(height: size * 0.25)
                
                // Label area with face
                LabelArea(expression: expression)
                    .fill(accentColor.secondary)
            }
            .padding(size * 0.1)
            
            // Corner notch
            CornerNotch()
                .stroke(Color.mascotStroke, lineWidth: 3)
        }
        .frame(width: size, height: size)
    }
}

// Color extensions
extension Color {
    static let mascotGold = Color(red: 0.831, green: 0.643, blue: 0.145)
    static let mascotGoldSecondary = Color(red: 0.722, green: 0.525, blue: 0.043)
    static let mascotStroke = Color(red: 0.102, green: 0.102, blue: 0.102)
    static let driveGreen = Color(red: 0.204, green: 0.827, blue: 0.600)
}

enum MascotExpression {
    case confident, wink, happy, sleeping, bliss, focused
}
```

### Option 2: Lottie (For Complex Animations)

1. Export from After Effects using Bodymovin
2. Add Lottie dependency
3. Play animations:

```swift
import Lottie

struct AnimatedMascot: View {
    var body: some View {
        LottieView(animation: .named("mascot_drive_loading"))
            .playing()
    }
}
```

### Option 3: SVG via Web View (Fallback)

For complex animations where native isn't feasible:

```swift
import WebKit

struct MascotWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        if let url = Bundle.main.url(forResource: "mascot-animated", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url)
        }
        return webView
    }
}
```

### Apple Watch Considerations

- Use simplified versions at small sizes (< 40px)
- Reduce stroke weights proportionally
- Consider removing sparkles at complication sizes
- Test legibility on all watch face styles

---

## Animation Specifications

### 1. Idle Animation (Continuous)

| Property | Value |
|----------|-------|
| Type | Gentle rotation sway |
| Amplitude | ±2 degrees |
| Duration | 4 seconds |
| Easing | ease-in-out |
| Sparkle rotation | 360° / 4 seconds |
| Glow pulse | opacity 0.2-0.4 / 2 seconds |

### 2. Power Off Animation

**Sequence (total ~500ms):**
1. Eyes: ellipses → horizontal lines (200ms, delay 100ms stagger)
2. Mouth: smile curve → flat line (300ms)
3. Sparkles: fade to 0 (300ms)
4. Glow: fade to 0 (500ms)
5. Idle sway: stops

**Reverse for power on.**

### 3. Memory Loading Animation

**Full Sequence (total ~7.5s):**

| Phase | Duration | Description |
|-------|----------|-------------|
| Idle | - | Disk at rest, gentle glow |
| Insert | 700ms | Disk rises into drive slot |
| Light On | 600ms | Green indicator illuminates |
| Glowing | 2000ms | Slot glows, progress bar fills |
| Bliss | 2500ms | Happy eyes, big smile, rosy cheeks, sparkles |
| Eject | 1000ms | Disk slides back down |

**Expression transitions during loading:**
- Insert: Neutral (O mouth)
- Glow: Smile gradually grows
- Bliss: Closed happy eyes, big smile, blush circles

---

## Size Guidelines

### Recommended Sizes by Context

| Context | Size (px) | Notes |
|---------|-----------|-------|
| Watch Complication | 24 | Simplify, no sparkles |
| Watch Small | 40 | Full detail at reduced weight |
| Watch Medium | 60 | Standard watch UI |
| Watch Large | 80 | Hero on watch |
| Watch Hero | 120 | Full-screen moments |
| App Tab Bar | 28 | Simple expression |
| App Navigation | 32 | |
| Web Small | 40 | Inline with text |
| Web Medium | 80 | Cards, lists |
| Web Large | 120 | Feature sections |
| Web Hero | 200+ | Landing pages |
| Marketing | 400+ | Print, presentations |

### Stroke Weight Scaling

Base strokes are defined at 100px. Scale proportionally:

```
actualStroke = baseStroke × (targetSize / 100)
```

Example: 3px body outline at 100px → 1.2px at 40px

---

## Agent Adaptation Guide

### For Claude/AI Agents Implementing This Design

#### Key Files to Reference
1. `mascot-design-tokens.ts` - All values as code
2. `mascot-styles.tsx` - React component implementation
3. `mascot-drive-animation.tsx` - Complex animation example
4. `/exports/*.svg` - Static references

#### How to Adapt Colors
```typescript
import { mascotColors } from './mascot-design-tokens';

// Swap accent color
const myAccent = mascotColors.accents.purple; // Use purple instead of gold
```

#### How to Create New Expressions
Follow the pattern in `mascot-styles.tsx`:
```typescript
// Define the face elements for your expression
const renderEyes = () => {
  switch (expression) {
    case "myNewExpression":
      return (
        <>
          {/* Left eye path/shape */}
          {/* Right eye path/shape */}
        </>
      );
  }
};
```

#### How to Modify Animations
Use the timing tokens:
```typescript
import { mascotTiming } from './mascot-design-tokens';

// Customize timing
const myDuration = mascotTiming.durations.slow; // 500ms
const myEasing = mascotTiming.easing.spring;
```

#### Maintaining Brand Consistency
1. **Always use the design tokens** - never hardcode colors
2. **Keep the geometric style** - rounded rects, clean strokes
3. **Preserve the core personality** - confident, helpful, never sad
4. **Green = memory/success** - this is a core brand association
5. **Sparkles for moments of delight** - use sparingly

#### Adding Platform-Specific Variations
- Maintain the same expressions across platforms
- Adjust stroke weights for the target resolution
- Simplify at small sizes (remove sparkles, reduce detail)
- Test on actual devices before shipping

---

## File Manifest

```
/client/src/components/
├── mascot-styles.tsx          # Base mascot component
├── mascot-lock-animation.tsx  # Power off animation
├── mascot-drive-animation.tsx # Memory loading animation
├── mascot-design-tokens.ts    # All design tokens

/exports/
├── mascot-static-confident.svg
├── mascot-static-wink.svg
├── mascot-static-happy.svg
├── mascot-static-sleeping.svg
├── mascot-static-bliss.svg

/
├── MASCOT_EXPORT_SPEC.md      # This document
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

*Created for AutoJack by Claude. For questions or adaptations, reference this spec and the design tokens.*

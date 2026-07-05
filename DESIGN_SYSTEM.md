# Triumph Plaza Hotel Laundry — Design System

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27

This document defines the visual identity, design tokens, typography, themes, motion, and layout standards for Triumph Plaza Hotel Laundry.

All UI implementation must consume tokens defined here. **Never hardcode colors, spacing, or typography values in components.**

---

## 1. Brand Foundation

### 1.1 Brand Personality

| Attribute | Expression |
|-----------|------------|
| Luxury | Restrained elegance, generous whitespace, refined typography |
| Professional | Clear hierarchy, consistent patterns, no playful elements |
| Trustworthy | Stable layouts, readable text, predictable interactions |
| Hotel-grade | Feels like an official Triumph Plaza Hotel internal system |

### 1.2 Logo Usage

| Rule | Specification |
|------|---------------|
| Primary asset path | `public/brand/triumph-logo.svg` |
| Fallback | `public/brand/triumph-logo.png` (2× resolution) |
| Minimum clear space | Equal to the height of the "T" in the wordmark on all sides |
| Minimum display width | 120px (mobile header), 160px (desktop header) |
| Background | Logo always on solid Luxury Black or White — never on gradients |
| Distortion | Never stretch, rotate, or recolor the logo |
| Gold in logo | **Source of truth for Official Gold token** |

### 1.3 Official Gold Color Extraction

The Official Gold color **must** be extracted from the Triumph logo asset. Do not invent or approximate gold values.

**Extraction procedure:**

1. Open `public/brand/triumph-logo.svg` in a vector editor (Figma, Illustrator) or inspect SVG `fill` attributes.
2. Sample the primary gold fill used in the wordmark / emblem (not highlights or shadows).
3. Record the hex value and update `--color-gold-official` in `src/styles/tokens.css`.
4. Generate derived gold tokens (hover, muted, border) programmatically from the official value.
5. Document the confirmed hex in this file under Section 2.1 and remove the `PENDING` flag.

**Status:** `PENDING LOGO VERIFICATION`

Until the logo asset is verified, use the provisional token below for development only. **Do not approve final UI until official gold is confirmed.**

```css
/* PROVISIONAL — replace after logo extraction */
--color-gold-official: #C8A962;
```

---

## 2. Color System

### 2.1 Core Palette

| Token | Dark Luxury | Luxury Light | Usage |
|-------|-------------|--------------|-------|
| `--color-gold-official` | Same | Same | Primary accent, active states, key icons, focus rings |
| `--color-black-luxury` | `#0D0D0D` | — | Primary background (dark), primary text (light) |
| `--color-black-soft` | `#1A1A1A` | — | Elevated surfaces (dark) |
| `--color-black-muted` | `#262626` | — | Cards, panels (dark) |
| `--color-white` | `#FFFFFF` | `#FFFFFF` | Primary text (dark), primary background (light) |
| `--color-white-soft` | — | `#FAFAF8` | Page background (light) |
| `--color-white-muted` | — | `#F5F5F3` | Card background (light) |
| `--color-gray-secondary` | `#9E9E9E` | `#6B6B6B` | Secondary text, captions, placeholders |
| `--color-gray-tertiary` | `#6B6B6B` | `#9E9E9E` | Disabled text, metadata |
| `--color-gray-border` | `#333333` | `#E5E5E3` | Dividers, borders |

### 2.2 Gold Derivatives (Computed from Official Gold)

These are generated from `--color-gold-official`. Never set independently.

| Token | Derivation | Usage |
|-------|------------|-------|
| `--color-gold-hover` | Official gold at 85% brightness | Hover states |
| `--color-gold-muted` | Official gold at 40% opacity on dark / 20% on light | Subtle backgrounds |
| `--color-gold-border` | Official gold at 50% opacity | Accent borders |
| `--color-gold-glow` | Official gold at 15% opacity | Focus glow, premium highlights |

### 2.3 Semantic Colors

Semantic colors are allowed **only** for inline status meaning — never as primary UI chrome.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#4ADE80` at 80% opacity | Success toast, confirmation (icon + text only) |
| `--color-warning` | Official gold | Warnings (prefer gold over yellow) |
| `--color-error` | `#E05252` | Error messages, destructive action confirmation |
| `--color-info` | `--color-gray-secondary` | Info messages (no blue) |

### 2.4 Forbidden Colors

The following must **never** appear as primary UI colors, backgrounds, buttons, navigation, or brand accents:

| Forbidden | Reason |
|-----------|--------|
| Blue | Off-brand |
| Navy | Off-brand |
| Purple | Off-brand |
| Green | Off-brand (except tiny success indicators) |
| Red | Off-brand (except error states) |
| Random gold shades | Only Official Gold and its derivatives |

---

## 3. Themes

### 3.1 Dark Luxury (Default)

The primary theme. Used on first visit and as the default preference.

```css
[data-theme="dark"] {
  --color-bg-primary: var(--color-black-luxury);
  --color-bg-elevated: var(--color-black-soft);
  --color-bg-surface: var(--color-black-muted);
  --color-text-primary: var(--color-white);
  --color-text-secondary: var(--color-gray-secondary);
  --color-text-tertiary: var(--color-gray-tertiary);
  --color-border: var(--color-gray-border);
  --color-accent: var(--color-gold-official);
  --color-accent-hover: var(--color-gold-hover);
}
```

**Visual character:** Deep black backgrounds, white primary text, gold accents sparingly applied.

### 3.2 Luxury Light

```css
[data-theme="light"] {
  --color-bg-primary: var(--color-white-soft);
  --color-bg-elevated: var(--color-white);
  --color-bg-surface: var(--color-white-muted);
  --color-text-primary: var(--color-black-luxury);
  --color-text-secondary: var(--color-gray-secondary);
  --color-text-tertiary: var(--color-gray-tertiary);
  --color-border: var(--color-gray-border);
  --color-accent: var(--color-gold-official);
  --color-accent-hover: var(--color-gold-hover);
}
```

**Visual character:** Warm white backgrounds, luxury black text, gold accents.

### 3.3 Theme Switching

| Property | Specification |
|----------|---------------|
| Trigger | Toggle in header (sun/moon icon or elegant switch) |
| Animation | 300ms ease-in-out on `background-color`, `color`, `border-color` |
| Reduced motion | Instant switch when `prefers-reduced-motion: reduce` |
| Persistence | `localStorage` key: `tph-theme` — values: `dark` \| `light` |
| Initial load | Read from `localStorage`; fallback to `dark` |
| Flash prevention | Inline script in `index.html` sets `data-theme` before paint |
| Scope | Applied on `<html data-theme="...">` element |

---

## 4. Typography

### 4.1 Font Stack

| Language | Font Family | Fallback |
|----------|-------------|----------|
| Arabic | `"Noto Sans Arabic"` | `"Segoe UI", system-ui, sans-serif` |
| English | `"Inter"` | `"Segoe UI", system-ui, sans-serif` |
| Monospace (code) | `"JetBrains Mono"` | `monospace` |

Fonts loaded via `@fontsource` packages — subset to Arabic + Latin only.  
**Do not load full font families.** Use weights: 400, 500, 600, 700 only.

### 4.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-display` | 2rem / 32px | 600 | 1.2 | Page titles (desktop) |
| `--text-h1` | 1.75rem / 28px | 600 | 1.25 | Page titles (mobile) |
| `--text-h2` | 1.375rem / 22px | 600 | 1.3 | Section headings |
| `--text-h3` | 1.125rem / 18px | 600 | 1.35 | Card titles |
| `--text-body` | 1rem / 16px | 400 | 1.6 | Body text |
| `--text-body-sm` | 0.875rem / 14px | 400 | 1.5 | Secondary body |
| `--text-caption` | 0.75rem / 12px | 400 | 1.4 | Captions, metadata |
| `--text-label` | 0.8125rem / 13px | 500 | 1.3 | Form labels, nav labels |
| `--text-overline` | 0.6875rem / 11px | 600 | 1.2 | Overline labels (uppercase, letter-spacing 0.08em) |

### 4.3 Typography Rules

- Arabic text: always `font-family: var(--font-arabic)` with `direction: rtl`.
- English text: always `font-family: var(--font-english)` with `direction: ltr`.
- Headings in gold only for hero/display contexts — body headings use `--color-text-primary`.
- Maximum line length for article body: 70 characters (approx 640px).
- Never use more than 3 font weights on a single screen.

---

## 5. Spacing & Layout

### 5.1 Spacing Scale (4px base)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 5.2 Layout Breakpoints

| Name | Min Width | Layout |
|------|-----------|--------|
| `mobile` | 0 | Single column, bottom nav |
| `tablet` | 768px | Sidebar + content, 2-column grids |
| `desktop` | 1024px | Full sidebar, wider content area |
| `wide` | 1280px | Max content width enforced |

### 5.3 Content Width

| Context | Max Width |
|---------|-----------|
| App content area | 1200px |
| Article reading column | 720px |
| Admin forms | 800px |
| Modal | 560px (mobile: full width minus 32px) |

### 5.4 Grid & Safe Areas

- Mobile horizontal padding: `--space-4` (16px)
- Tablet horizontal padding: `--space-6` (24px)
- Desktop horizontal padding: `--space-8` (32px)
- Respect `env(safe-area-inset-*)` on all fixed elements
- Bottom nav height: 64px + safe area inset

---

## 6. Elevation & Surfaces

### 6.1 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Inputs, chips |
| `--radius-md` | 10px | Cards, buttons |
| `--radius-lg` | 16px | Modals, panels |
| `--radius-full` | 9999px | Avatars, pills |

### 6.2 Shadows (Light Theme Only)

Dark theme uses border separation instead of shadows.

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.10)` |

### 6.3 Surface Hierarchy

```
Level 0: --color-bg-primary     (page background)
Level 1: --color-bg-elevated    (header, bottom nav)
Level 2: --color-bg-surface    (cards, dropdowns)
Level 3: --color-bg-surface + gold border  (active/selected)
```

---

## 7. Iconography

| Property | Specification |
|----------|---------------|
| Library | Lucide React (tree-shaken imports only) |
| Default size | 20px |
| Navigation icons | 22px |
| Touch target | Minimum 44×44px interactive area |
| Color | `--color-text-secondary` default, `--color-accent` when active |
| Stroke width | 1.5px |
| Style | Outlined only — no filled icons except active nav state |

### 7.1 Special Icons

| Icon | Usage |
|------|-------|
| Globe | Language switcher in header — always present |
| Sun / Moon | Theme toggle |
| Bookmark | Saved articles |
| Search | Global search |
| Sparkles | AI assistant entry point |

---

## 8. Motion & Animation

### 8.1 Principles

- Animations must feel smooth and premium — never bouncy or playful.
- Performance first: animate only `transform` and `opacity` where possible.
- Never animate layout-triggering properties (width, height, top, left) on large elements.
- All animations respect `prefers-reduced-motion`.

### 8.2 Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover, focus |
| `--duration-normal` | 250ms | Dropdowns, toggles |
| `--duration-slow` | 350ms | Page transitions, theme switch |
| `--duration-enter` | 300ms | Modal/drawer enter |
| `--duration-exit` | 200ms | Modal/drawer exit |

### 8.3 Easing

| Token | Value |
|-------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` |

### 8.4 Standard Animations

| Animation | Specification |
|-----------|---------------|
| Theme switch | 300ms cross-fade on background and text colors |
| Language switch | Instant content swap; 150ms fade on text containers |
| Dropdown open | Opacity 0→1 + translateY(-4px→0) over 250ms |
| Page enter | Opacity 0→1 over 200ms (no slide on mobile) |
| Skeleton shimmer | Subtle gold-tinted shimmer on `--color-bg-surface` |
| Button press | Scale 0.98 for 100ms on `:active` |

---

## 9. Imagery

| Rule | Specification |
|------|---------------|
| Format | WebP with JPEG fallback |
| Lazy loading | `loading="lazy"` on all below-fold images |
| Responsive | `srcset` with 1×, 2× variants |
| Aspect ratios | 16:9 (hero), 4:3 (cards), 1:1 (thumbnails) |
| Placeholder | Gold-tinted skeleton — never gray boxes |
| Alt text | Required — bilingual where content is bilingual |

---

## 10. Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Default |
| `--z-dropdown` | 100 | Dropdowns, popovers |
| `--z-sticky` | 200 | Sticky header |
| `--z-overlay` | 300 | Modal backdrop |
| `--z-modal` | 400 | Modals, drawers |
| `--z-toast` | 500 | Toast notifications |

---

## 11. Tailwind Integration

All tokens are defined as CSS custom properties in `src/styles/tokens.css` and mapped to Tailwind via `@theme` in `src/styles/index.css`.

**Rule:** Components use Tailwind utility classes referencing design tokens — never arbitrary values like `bg-[#C8A962]`.

Example:
```css
@theme {
  --color-accent: var(--color-gold-official);
  --color-bg-primary: var(--color-bg-primary);
}
```

---

## 12. Design Sign-Off Checklist

Before any page is marked approved:

- [ ] Official gold extracted from logo and tokens updated
- [ ] Both themes verified
- [ ] Arabic RTL and English LTR verified
- [ ] No forbidden colors present
- [ ] Touch targets ≥ 44px
- [ ] Contrast ratios pass WCAG AA
- [ ] Logo usage follows Section 1.2
- [ ] Animations respect reduced motion

**Approved pages must not be redesigned.** See `UI_RULES.md`.

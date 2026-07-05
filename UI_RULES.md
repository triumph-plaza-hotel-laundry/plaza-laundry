# Triumph Plaza Hotel Laundry — UI Rules

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27

This document defines mandatory UI/UX rules for every screen, component, and interaction in the application.

**All engineers and designers must follow these rules without exception.**

---

## 1. Core UI Principles

### 1.1 One Design Language

Every page — Staff, Admin, Auth — must feel like the same premium hotel system.

| Rule | Requirement |
|------|-------------|
| UL-01 | Use only components from `COMPONENT_LIBRARY.md` |
| UL-02 | Use only tokens from `DESIGN_SYSTEM.md` |
| UL-03 | Never introduce one-off styles for a single page |
| UL-04 | Never mix design patterns (e.g., two different card styles on one screen) |
| UL-05 | Admin UI uses the same tokens and typography — darker density, same luxury feel |

### 1.2 No Demo Aesthetic

| Rule | Requirement |
|------|-------------|
| UL-06 | No placeholder lorem ipsum in production screens |
| UL-07 | No stock photos unless approved hotel media |
| UL-08 | No generic icons that don't match Lucide outlined style |
| UL-09 | No "under construction" or "coming soon" pages in production routes |
| UL-10 | Empty states must be designed, branded, and bilingual |

### 1.3 Approval Lock

| Rule | Requirement |
|------|-------------|
| UL-11 | Once a page is marked **Approved**, it must not be redesigned |
| UL-12 | Bug fixes and accessibility improvements are allowed on approved pages |
| UL-13 | New features on approved pages must extend — not replace — existing layout |
| UL-14 | Color identity changes require design system version bump and re-approval |
| UL-15 | Never revert an approved page to placeholder design |

---

## 2. Layout Rules

### 2.1 Global Shell

Every authenticated page shares this shell:

```
┌─────────────────────────────────────────────┐
│  Header: Logo | [space] | Globe | Theme     │
├─────────────────────────────────────────────┤
│                                             │
│              Page Content                   │
│                                             │
├─────────────────────────────────────────────┤
│  Bottom Nav (mobile only)                   │
└─────────────────────────────────────────────┘
```

**Tablet/Desktop:** Bottom nav hidden. Sidebar appears on the left.

| Element | Rule |
|---------|------|
| Header height | 56px mobile, 64px desktop + safe area |
| Header background | `--color-bg-elevated` with bottom border `--color-border` |
| Header position | Sticky (`position: sticky; top: 0`) |
| Logo | Left in LTR, right in RTL — links to home |
| Globe icon | Always visible in header — language switcher |
| Theme toggle | Always visible in header — right side in LTR |

### 2.2 Mobile-First

| Rule | Requirement |
|------|-------------|
| UL-16 | Design mobile layout first, then enhance for tablet/desktop |
| UL-17 | Single-column default on mobile |
| UL-18 | Bottom navigation on mobile — max 4 items + overflow if needed |
| UL-19 | No horizontal scroll on any screen at 320px width |
| UL-20 | Touch targets minimum 44×44px |

### 2.3 Responsive Breakpoints

| Breakpoint | Navigation | Content |
|------------|------------|---------|
| Mobile (<768px) | Bottom nav | Full width, 16px padding |
| Tablet (768–1023px) | Collapsible sidebar | 2-column grids where appropriate |
| Desktop (≥1024px) | Fixed sidebar (240px) | Max content width 1200px |

---

## 3. Header Rules

### 3.1 Language Switcher (Globe Icon)

This is a signature UI element. Must feel premium.

| Property | Specification |
|----------|---------------|
| Icon | Lucide `Globe` — 20px, `--color-text-secondary` |
| Hover | Icon transitions to `--color-accent` over 150ms |
| Trigger | Click/tap opens dropdown below icon |
| Dropdown | `--color-bg-surface`, `--radius-md`, gold border on focus |
| Options | "العربية" (Arabic) and "English" with checkmark on active |
| Active indicator | Gold checkmark + gold text on selected language |
| Animation | Dropdown: opacity + translateY (250ms) |
| Behavior | Instant language switch — no page reload |
| Direction | Dropdown aligns to end (RTL-aware) |
| Close | Click outside, Escape key, or selection |
| Accessibility | `aria-haspopup`, `aria-expanded`, `role="menu"` |

**Never use:**
- Text-only language toggle without globe icon
- Native `<select>` for language
- Flag icons (use text labels only)

### 3.2 Theme Toggle

| Property | Specification |
|----------|---------------|
| Icon | Sun (in dark mode) / Moon (in light mode) |
| Position | Header, adjacent to globe icon |
| Animation | Icon cross-fade 200ms; page colors transition 300ms |
| No label | Icon only with `aria-label` |

---

## 4. Navigation Rules

### 4.1 Staff Bottom Navigation (Mobile)

| Item | Icon | Route |
|------|------|-------|
| Home | `Home` | `/` |
| Search | `Search` | `/search` |
| Bookmarks | `Bookmark` | `/bookmarks` |
| Profile | `User` | `/profile` |

| Rule | Requirement |
|------|-------------|
| Active state | Gold icon + gold label |
| Inactive state | Gray icon + gray label |
| AI Assistant | Accessible via home module — not in bottom nav (avoid clutter) |

### 4.2 Staff Sidebar (Tablet/Desktop)

Same items as bottom nav plus:
- Categories (expandable)
- AI Assistant

### 4.3 Admin Navigation

Separate admin sidebar — never mixed with staff nav.

| Section | Route prefix |
|---------|--------------|
| Dashboard | `/admin` |
| Content | `/admin/content` |
| Categories | `/admin/categories` |
| Tags | `/admin/tags` |
| Media | `/admin/media` |
| Users | `/admin/users` |
| Audit Log | `/admin/audit` |

Admin sidebar uses same surface tokens with gold accent on active item.

---

## 5. Page-Type Rules

### 5.1 Home Dashboard

- Hero area with Triumph logo and welcome message (bilingual)
- Featured articles carousel/grid (max 6)
- Quick access category chips
- AI Assistant entry card (gold accent border)
- Recently viewed section (if history exists)

### 5.2 Article Detail

- Breadcrumb: Home → Category → Article
- Title (bilingual toggle if viewing translated version)
- Metadata row: content type, last updated, reading time
- Body: rich formatted content, max-width 720px
- Bookmark button (top-right, gold when active)
- Related articles (bottom)
- Offline badge if served from cache

### 5.3 Search

- Prominent search input (gold focus ring)
- Recent searches (local)
- Results grouped by type: Articles, Categories
- Empty state with suggestion to browse categories
- Debounced input (300ms)

### 5.4 AI Assistant

- Chat interface — user messages right, assistant left (RTL-aware)
- Input fixed at bottom
- Source citations as clickable gold links below each response
- "No approved source found" message when AI cannot answer
- Loading indicator: subtle gold pulse — not spinner on low-end devices

### 5.5 Admin Content Editor

- Split view on desktop: form left, preview right
- Bilingual tabs: Arabic | English
- Status badge: Draft / Published / Archived
- Save as draft / Publish actions clearly separated
- Unsaved changes warning on navigate away

### 5.6 Login

- Centered card on Luxury Black background
- Triumph logo above form
- Email + password fields
- Gold primary button
- No social login
- Bilingual labels following current language preference

---

## 6. Component Usage Rules

### 6.1 Buttons

| Variant | Usage |
|---------|-------|
| Primary | One per viewport section — gold background, black text |
| Secondary | Outlined gold border, transparent background |
| Ghost | Text only — navigation actions, cancel |
| Destructive | Red text/border — delete confirmations only |

| Rule | Requirement |
|------|-------------|
| UL-21 | Primary button max 1 per visible section |
| UL-22 | Full-width primary buttons on mobile forms |
| UL-23 | Disabled state: reduced opacity, no pointer events |
| UL-24 | Loading state: text replaced with subtle pulse — no spinner in buttons |

### 6.2 Cards

- Background: `--color-bg-surface`
- Border: 1px `--color-border`
- Radius: `--radius-md`
- Padding: `--space-4` mobile, `--space-6` desktop
- Hover (desktop): gold border transition 150ms
- No drop shadows in dark theme

### 6.3 Forms

- Label above input (never placeholder-only labels)
- Gold focus ring: 2px `--color-accent` with offset
- Error message below field in `--color-error`
- Required fields marked with gold asterisk
- Input height: 48px (mobile-friendly)

### 6.4 Modals & Drawers

- Backdrop: black at 60% opacity
- Modal centered, drawer slides from end (RTL-aware)
- Close button top-end
- Escape to close
- Focus trap inside modal

### 6.5 Toasts

- Position: bottom-center (mobile), top-end (desktop)
- Auto-dismiss: 4 seconds
- Max 3 visible simultaneously
- Types: success, error, info — icon + message only

---

## 7. RTL / LTR Rules

| Rule | Requirement |
|------|-------------|
| UL-25 | `dir` attribute on `<html>`: `rtl` for Arabic, `ltr` for English |
| UL-26 | All horizontal layouts mirror in RTL (nav, dropdowns, chat bubbles) |
| UL-27 | Icons that imply direction (chevrons, arrows) flip in RTL |
| UL-28 | Numbers and dates follow locale format |
| UL-29 | Mixed content (Arabic + English in same sentence) uses `dir="auto"` on containers |
| UL-30 | Tailwind logical properties preferred: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end` |

---

## 8. Animation Rules

| Rule | Requirement |
|------|-------------|
| UL-31 | Every animation uses tokens from `DESIGN_SYSTEM.md` Section 8 |
| UL-32 | No animation longer than 350ms except page-level theme switch |
| UL-33 | Skeleton loaders instead of spinners for content loading |
| UL-34 | Route transitions: fade only — no slide on mobile (performance) |
| UL-35 | `prefers-reduced-motion: reduce` disables all non-essential animation |
| UL-36 | Never animate more than 3 properties simultaneously on low-end targets |
| UL-37 | No parallax, no particle effects, no confetti |

---

## 9. Empty & Error States

Every list, search, and data view must have designed empty and error states.

| State | Requirements |
|-------|--------------|
| Empty | Branded illustration or icon, bilingual heading + description, primary action |
| Error | Error icon, bilingual message, retry button |
| Offline | Gold offline badge in header + cached content indicator |
| Loading | Skeleton matching final layout dimensions — no generic spinners |
| 404 | Branded page with logo, bilingual message, link to home |

---

## 10. Accessibility Rules

| Rule | Requirement |
|------|-------------|
| UL-38 | All interactive elements keyboard accessible |
| UL-39 | Focus order follows visual order (RTL-aware) |
| UL-40 | Color is never the only indicator of state |
| UL-41 | All images have alt text |
| UL-42 | Form fields have associated labels |
| UL-43 | Live regions for dynamic content (search results, toasts, AI responses) |
| UL-44 | Contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text |

---

## 11. Performance UI Rules

| Rule | Requirement |
|------|-------------|
| UL-45 | Lazy load all routes except login and home shell |
| UL-46 | Virtualize lists with >50 items |
| UL-47 | Images: WebP, lazy, explicit width/height to prevent CLS |
| UL-48 | No CSS animations on elements larger than viewport |
| UL-49 | Debounce search and filter inputs |
| UL-50 | Prefetch likely next routes on hover (desktop only) |

---

## 12. Forbidden UI Patterns

| Pattern | Reason |
|---------|--------|
| Blue links | Off-brand — use gold or primary text with underline |
| Material Design ripples | Off-brand |
| Bootstrap default styling | Off-brand |
| Gradient backgrounds | Off-brand — solid surfaces only |
| Rounded pill buttons as primary CTA | Use `--radius-md` buttons |
| Carousel auto-play | Accessibility and performance |
| Infinite scroll without virtualization | Performance on low-end Android |
| Hamburger menu on desktop | Use sidebar instead |
| Floating action button (FAB) | Use in-page actions |
| Toast notifications for every action | Only for confirmations and errors |

---

## 13. Page Approval Workflow

```
Draft → Review → Approved → Locked
```

| Stage | Who | Action |
|-------|-----|--------|
| Draft | Engineer | Implementation in progress |
| Review | Stakeholder + Designer | Visual and functional review |
| Approved | Stakeholder | Marked in project tracker |
| Locked | System | No redesign allowed — extend only |

Approved pages are listed in the project tracker (to be created). Reference page name and approval date.

---

## 14. UI Review Checklist (Per Page)

Before submitting any page for approval:

- [ ] Follows layout rules (Section 2)
- [ ] Uses only approved components
- [ ] Both themes tested
- [ ] Arabic RTL tested
- [ ] English LTR tested
- [ ] Mobile (320px), tablet (768px), desktop (1024px) tested
- [ ] Empty, error, loading, and offline states implemented
- [ ] No forbidden colors or patterns
- [ ] Touch targets ≥ 44px
- [ ] Keyboard navigation works
- [ ] Animations respect reduced motion
- [ ] No placeholder content

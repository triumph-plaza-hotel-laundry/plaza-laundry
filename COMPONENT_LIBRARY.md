# Triumph Plaza Hotel Laundry — Component Library

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27

This document defines every reusable UI component in the application. All pages must compose UI from this library — **no ad-hoc components on pages**.

Implementation location: `src/components/ui/` and `src/components/layout/`

---

## 1. Component Architecture

### 1.1 Categories

| Category | Location | Purpose |
|----------|----------|---------|
| **Primitives** | `src/components/ui/` | Atomic UI elements (Button, Input, Badge) |
| **Layout** | `src/components/layout/` | Shell, navigation, page structure |
| **Composite** | `src/components/ui/` | Composed patterns (SearchBar, ArticleCard) |
| **Feature** | `src/features/*/components/` | Feature-specific (ChatMessage, ArticleEditor) |

### 1.2 Component Rules

| Rule | Requirement |
|------|-------------|
| CL-01 | Every component accepts `className` for layout adjustments only — not color overrides |
| CL-02 | Every component supports both themes via CSS tokens |
| CL-03 | Every component supports RTL via logical properties |
| CL-04 | Every interactive component has keyboard support |
| CL-05 | Props are strictly typed — no optional chaos |
| CL-06 | Components export from barrel `index.ts` files |
| CL-07 | No business logic in UI components — use hooks |

---

## 2. Primitives

### 2.1 `Button`

**File:** `src/components/ui/Button.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'destructive'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size preset |
| `loading` | `boolean` | `false` | Shows loading state |
| `disabled` | `boolean` | `false` | Disables interaction |
| `fullWidth` | `boolean` | `false` | 100% width |
| `children` | `ReactNode` | — | Button label |
| `leftIcon` | `LucideIcon` | — | Optional leading icon |
| `rightIcon` | `LucideIcon` | — | Optional trailing icon |

**Variants:**

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| `primary` | `--color-accent` | `--color-black-luxury` | none |
| `secondary` | transparent | `--color-accent` | 1px `--color-accent` |
| `ghost` | transparent | `--color-text-secondary` | none |
| `destructive` | transparent | `--color-error` | 1px `--color-error` |

**Sizes:**

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 36px | 12px horizontal | `--text-body-sm` |
| `md` | 44px | 16px horizontal | `--text-body` |
| `lg` | 48px | 24px horizontal | `--text-body` |

**States:** default, hover (gold hover token), active (scale 0.98), focus (gold ring), disabled (40% opacity), loading (text pulse).

---

### 2.2 `Input`

**File:** `src/components/ui/Input.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Visible label (required for a11y) |
| `error` | `string` | — | Error message below field |
| `hint` | `string` | — | Helper text below field |
| `leftIcon` | `LucideIcon` | — | Leading icon inside input |
| `required` | `boolean` | `false` | Shows gold asterisk on label |
| `type` | HTML input types | `'text'` | Input type |

**Style:** Height 48px, `--color-bg-surface` background, `--color-border` border, gold focus ring 2px.

---

### 2.3 `Textarea`

**File:** `src/components/ui/Textarea.tsx`

Same props as Input (minus `type`). Min height 120px. Resize vertical only.

---

### 2.4 `Select`

**File:** `src/components/ui/Select.tsx`

Custom styled select — **never native `<select>`** except in admin data tables on desktop.

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `options` | `Array<{ value: string; label: string }>` | Options |
| `value` | `string` | Selected value |
| `onChange` | `(value: string) => void` | Change handler |
| `placeholder` | `string` | Placeholder when no selection |

Dropdown matches Language Dropdown styling (Section 3.3).

---

### 2.5 `Badge`

**File:** `src/components/ui/Badge.tsx`

| Prop | Type | Default |
|------|------|---------|
| `variant` | `'default' \| 'gold' \| 'success' \| 'error'` | `'default'` |
| `size` | `'sm' \| 'md'` | `'sm'` |

Used for: content type labels, article status, offline indicator.

---

### 2.6 `Card`

**File:** `src/components/ui/Card.tsx`

| Sub-component | Purpose |
|---------------|---------|
| `Card` | Container with surface background and border |
| `Card.Header` | Top section with optional action |
| `Card.Body` | Main content area |
| `Card.Footer` | Bottom section with actions |

Padding: `--space-4` mobile, `--space-6` desktop. Radius: `--radius-md`.

---

### 2.7 `Avatar`

**File:** `src/components/ui/Avatar.tsx`

| Prop | Type | Default |
|------|------|---------|
| `src` | `string` | — |
| `name` | `string` | — |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |

Fallback: initials on gold-muted background. Sizes: 32px, 40px, 48px.

---

### 2.8 `IconButton`

**File:** `src/components/ui/IconButton.tsx`

| Prop | Type | Default |
|------|------|---------|
| `icon` | `LucideIcon` | required |
| `label` | `string` | required (aria-label) |
| `variant` | `'default' \| 'gold'` | `'default'` |
| `size` | `'sm' \| 'md'` | `'md'` |

Touch target: always 44×44px minimum regardless of icon size.

---

### 2.9 `Divider`

**File:** `src/components/ui/Divider.tsx`

Horizontal line using `--color-border`. Optional label in center (gold overline text).

---

### 2.10 `Skeleton`

**File:** `src/components/ui/Skeleton.tsx`

| Prop | Type | Default |
|------|------|---------|
| `variant` | `'text' \| 'circular' \| 'rectangular'` | `'text'` |
| `width` | `string` | `'100%'` |
| `height` | `string` | variant default |

Gold-tinted shimmer animation on `--color-bg-surface`. Respects `prefers-reduced-motion`.

---

### 2.11 `Spinner`

**File:** `src/components/ui/Spinner.tsx`

**Use sparingly.** Prefer Skeleton for content loading. Only for inline actions where skeleton is inappropriate. Gold accent, 20px, CSS animation on `transform` only.

---

## 3. Layout Components

### 3.1 `AppShell`

**File:** `src/components/layout/AppShell.tsx`

Top-level authenticated layout wrapper.

```
AppShell
├── Header
├── Sidebar (tablet/desktop)
├── Main content area (Outlet)
└── BottomNav (mobile)
```

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Page content |

---

### 3.2 `Header`

**File:** `src/components/layout/Header.tsx`

| Element | Position | Component |
|---------|----------|-----------|
| Logo | Start | `<Logo />` |
| Spacer | Center | flex-grow |
| LanguageSwitcher | End | `<LanguageSwitcher />` |
| ThemeToggle | End | `<ThemeToggle />` |

Sticky, `--color-bg-elevated`, 56px mobile / 64px desktop.

---

### 3.3 `LanguageSwitcher`

**File:** `src/components/layout/LanguageSwitcher.tsx`

**Signature component.** See `UI_RULES.md` Section 3.1 for full specification.

| Prop | Type | Description |
|------|------|-------------|
| — | — | Reads/writes language via `useLanguage()` hook |

Internal structure:
```
IconButton (Globe)
└── Dropdown
    ├── DropdownItem "العربية" ✓
    └── DropdownItem "English"
```

---

### 3.4 `ThemeToggle`

**File:** `src/components/layout/ThemeToggle.tsx`

Reads/writes theme via `useTheme()` hook. Sun/Moon icon cross-fade.

---

### 3.5 `BottomNav`

**File:** `src/components/layout/BottomNav.tsx`

4 items: Home, Search, Bookmarks, Profile. Fixed bottom, safe area aware. Hidden on tablet+.

---

### 3.6 `Sidebar`

**File:** `src/components/layout/Sidebar.tsx`

240px fixed width on tablet/desktop. Same nav items as BottomNav plus Categories and AI Assistant. Collapsible on tablet.

---

### 3.7 `AdminShell`

**File:** `src/components/layout/AdminShell.tsx`

Separate layout for admin routes. Admin sidebar + content area. No bottom nav. "Back to App" link at sidebar bottom.

---

### 3.8 `PageHeader`

**File:** `src/components/layout/PageHeader.tsx`

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Page title |
| `subtitle` | `string` | Optional subtitle |
| `action` | `ReactNode` | Optional right-side action (button) |
| `breadcrumbs` | `BreadcrumbItem[]` | Optional breadcrumb trail |

---

### 3.9 `Logo`

**File:** `src/components/layout/Logo.tsx`

| Prop | Type | Default |
|------|------|---------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |

Renders Triumph logo from `public/brand/`. Never recolors. Links to `/`.

---

## 4. Composite Components

### 4.1 `Dropdown`

**File:** `src/components/ui/Dropdown.tsx`

| Sub-component | Purpose |
|---------------|---------|
| `Dropdown.Trigger` | Click target |
| `Dropdown.Menu` | Positioned menu container |
| `Dropdown.Item` | Menu item with optional icon and checkmark |

Shared by: LanguageSwitcher, user menu, admin actions.

Animation: opacity + translateY, 250ms. Click outside to close. Escape to close.

---

### 4.2 `Modal`

**File:** `src/components/ui/Modal.tsx`

| Prop | Type | Default |
|------|------|---------|
| `open` | `boolean` | — |
| `onClose` | `() => void` | — |
| `title` | `string` | — |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `children` | `ReactNode` | — |

Focus trap, Escape to close, backdrop click to close. Enter/exit animations per design tokens.

---

### 4.3 `Drawer`

**File:** `src/components/ui/Drawer.tsx`

Mobile-friendly side panel. Slides from end (RTL-aware). Used for filters, mobile sidebar.

---

### 4.4 `Toast`

**File:** `src/components/ui/Toast.tsx`

| Prop | Type |
|------|------|
| `type` | `'success' \| 'error' \| 'info'` |
| `message` | `string` |
| `duration` | `number` (default 4000) |

Managed via `useToast()` hook and `ToastProvider`. Max 3 visible.

---

### 4.5 `SearchBar`

**File:** `src/components/ui/SearchBar.tsx`

| Prop | Type | Default |
|------|------|---------|
| `value` | `string` | — |
| `onChange` | `(value: string) => void` | — |
| `onSubmit` | `() => void` | — |
| `placeholder` | `string` | i18n key |

Search icon left, clear button right (when value exists). Gold focus ring. Debounce handled by parent.

---

### 4.6 `ArticleCard`

**File:** `src/components/ui/ArticleCard.tsx`

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Article title (current language) |
| `excerpt` | `string` | Short excerpt |
| `contentType` | `ContentType` | Badge label |
| `category` | `string` | Category name |
| `updatedAt` | `string` | Formatted date |
| `isBookmarked` | `boolean` | Show filled bookmark icon |
| `onBookmarkToggle` | `() => void` | Toggle bookmark |
| `href` | `string` | Link to article |

Used in: home featured, category listing, search results, bookmarks page.

---

### 4.7 `CategoryChip`

**File:** `src/components/ui/CategoryChip.tsx`

| Prop | Type |
|------|------|
| `label` | `string` |
| `icon` | `LucideIcon` |
| `active` | `boolean` |
| `href` | `string` |

Pill shape, gold border when active, ghost otherwise.

---

### 4.8 `EmptyState`

**File:** `src/components/ui/EmptyState.tsx`

| Prop | Type |
|------|------|
| `icon` | `LucideIcon` |
| `title` | `string` |
| `description` | `string` |
| `action` | `ReactNode` |

Centered, bilingual via i18n props. Used for empty lists, no search results, no bookmarks.

---

### 4.9 `ErrorState`

**File:** `src/components/ui/ErrorState.tsx`

Same structure as EmptyState but with error icon and retry action.

---

### 4.10 `OfflineBanner`

**File:** `src/components/ui/OfflineBanner.tsx`

Fixed banner below header when `navigator.onLine === false`. Gold background muted, black text. "You are offline" message.

---

### 4.11 `Breadcrumbs`

**File:** `src/components/ui/Breadcrumbs.tsx`

| Prop | Type |
|------|------|
| `items` | `Array<{ label: string; href?: string }>` |

Separator: chevron (RTL-flipped). Last item is current page (no link).

---

### 4.12 `Tabs`

**File:** `src/components/ui/Tabs.tsx`

| Sub-component | Purpose |
|---------------|---------|
| `Tabs.List` | Tab button container |
| `Tabs.Tab` | Individual tab |
| `Tabs.Panel` | Content panel |

Used in: admin content editor (Arabic/English tabs). Active tab: gold underline.

---

### 4.13 `Pagination`

**File:** `src/components/ui/Pagination.tsx`

| Prop | Type |
|------|------|
| `currentPage` | `number` |
| `totalPages` | `number` |
| `onPageChange` | `(page: number) => void` |

Previous/Next buttons with page numbers. Used in admin tables.

---

### 4.14 `DataTable`

**File:** `src/components/ui/DataTable.tsx`

| Prop | Type |
|------|------|
| `columns` | `ColumnDef[]` |
| `data` | `T[]` |
| `loading` | `boolean` |
| `emptyState` | `ReactNode` |

Admin use only. Skeleton rows when loading. Sortable columns on desktop.

---

## 5. Feature Components (Reference)

These live in feature folders but follow the same design rules.

### 5.1 Assistant Feature

| Component | File |
|-----------|------|
| `ChatMessage` | `src/features/assistant/components/ChatMessage.tsx` |
| `ChatInput` | `src/features/assistant/components/ChatInput.tsx` |
| `SourceCitation` | `src/features/assistant/components/SourceCitation.tsx` |

### 5.2 Admin Feature

| Component | File |
|-----------|------|
| `ArticleEditor` | `src/features/admin/components/ArticleEditor.tsx` |
| `ArticlePreview` | `src/features/admin/components/ArticlePreview.tsx` |
| `MediaUploader` | `src/features/admin/components/MediaUploader.tsx` |
| `StatusBadge` | `src/features/admin/components/StatusBadge.tsx` |
| `UserRow` | `src/features/admin/components/UserRow.tsx` |

### 5.3 Auth Feature

| Component | File |
|-----------|------|
| `LoginForm` | `src/features/auth/components/LoginForm.tsx` |

---

## 6. Providers

| Provider | File | Purpose |
|----------|------|---------|
| `ThemeProvider` | `src/app/providers/ThemeProvider.tsx` | Theme state + persistence |
| `LanguageProvider` | `src/app/providers/LanguageProvider.tsx` | i18n state + RTL |
| `ToastProvider` | `src/app/providers/ToastProvider.tsx` | Toast queue |
| `AuthProvider` | `src/app/providers/AuthProvider.tsx` | Supabase session |

---

## 7. Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTheme` | `src/hooks/useTheme.ts` | Current theme, toggle |
| `useLanguage` | `src/hooks/useLanguage.ts` | Current language, switch |
| `useTranslation` | `src/hooks/useTranslation.ts` | Translate UI strings |
| `useAuth` | `src/hooks/useAuth.ts` | Current user, role, sign in/out |
| `useToast` | `src/hooks/useToast.ts` | Show toast notifications |
| `useOnlineStatus` | `src/hooks/useOnlineStatus.ts` | Network connectivity |
| `useMediaQuery` | `src/hooks/useMediaQuery.ts` | Responsive breakpoints |

---

## 8. Component Implementation Order

When implementation begins, build in this order:

```
Phase 1 — Foundation
  1. ThemeProvider + useTheme
  2. LanguageProvider + useLanguage + useTranslation
  3. Design tokens (tokens.css)
  4. Button, Input, Skeleton, Badge

Phase 2 — Layout Shell
  5. Logo, Header, ThemeToggle, LanguageSwitcher
  6. BottomNav, Sidebar, AppShell
  7. PageHeader, Breadcrumbs, OfflineBanner

Phase 3 — Patterns
  8. Card, Dropdown, Modal, Toast
  9. SearchBar, ArticleCard, CategoryChip
  10. EmptyState, ErrorState

Phase 4 — Feature Components
  11. LoginForm
  12. ArticleEditor, MediaUploader (admin)
  13. ChatMessage, ChatInput, SourceCitation (assistant)
```

---

## 9. Component Documentation Standard

Every component file must include:

```typescript
/**
 * Button — Primary interactive element.
 *
 * @example
 * <Button variant="primary" onClick={handleSave}>
 *   {t('common.save')}
 * </Button>
 */
```

No Storybook in Phase 1. Components are documented in this file and via JSDoc.

---

## 10. Testing Standard

| Component Type | Test |
|----------------|------|
| Primitives | Render, variants, disabled, keyboard |
| Layout | RTL/LTR rendering, responsive visibility |
| Composite | User interaction flows |
| Providers | State persistence, context values |

Test files colocated: `Button.test.tsx` next to `Button.tsx`.

---

**Next Step:** Implement components in the order defined in Section 8 when instructed. Do not build pages until core layout components are ready.

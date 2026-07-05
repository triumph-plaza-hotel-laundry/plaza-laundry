# Triumph Plaza Hotel Laundry — Development Rules

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27

This document defines mandatory coding standards, architecture patterns, folder structure, and workflow rules for all engineers working on Triumph Plaza Hotel Laundry.

**Every commit must comply with these rules.**

---

## 1. Core Principles

| Principle | Rule |
|-----------|------|
| Production-ready | No TODO hacks, no console.log in production code, no commented-out code |
| Minimal scope | Change only what the task requires |
| No duplication | Extract shared logic before copying |
| Strict types | TypeScript strict mode — zero `any` without documented exception |
| Token-driven UI | No hardcoded colors, spacing, or font sizes |
| Offline-aware | Every data fetch considers offline fallback |
| Bilingual-first | Arabic is default — test RTL on every feature |
| Performance-first | Target low-end Android devices as primary |

---

## 2. Technology Stack

| Layer | Technology | Version Policy |
|-------|------------|----------------|
| Framework | React | Latest stable |
| Language | TypeScript | ~5.8, strict mode |
| Build | Vite | Latest stable |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/vite` |
| Routing | React Router v7 | Lazy-loaded routes |
| Backend | Supabase | Auth, DB, Storage, Edge Functions |
| Icons | Lucide React | Tree-shaken imports only |
| Fonts | @fontsource | Subset weights only |
| PWA | vite-plugin-pwa | Workbox |
| Linting | ESLint 9 flat config | — |
| Formatting | Prettier + Tailwind plugin | — |
| Testing | Vitest + Testing Library | When tests are requested |

### 2.1 Forbidden Dependencies

Do not add without explicit approval:

| Category | Reason |
|----------|--------|
| UI frameworks (MUI, Chakra, Ant Design) | Custom design system |
| CSS-in-JS (styled-components, emotion) | Tailwind + CSS tokens |
| State management libraries (Redux, Zustand, MobX) | React Context + hooks sufficient |
| HTTP clients (axios) | Supabase SDK + native fetch |
| Utility libraries (lodash full) | Native ES2022+ methods |
| Animation libraries (framer-motion) | CSS transitions only |
| i18n libraries (i18next) unless approved | Custom lightweight solution |
| Date libraries (moment.js) | Intl.DateTimeFormat or date-fns if needed |

---

## 3. Folder Structure

```
d:\laundry project\
├── public/
│   ├── brand/                    # Triumph logo assets
│   └── icons/                    # PWA icons
├── src/
│   ├── app/                      # Application shell
│   │   ├── App.tsx               # Root component
│   │   ├── router.tsx            # Route definitions
│   │   ├── providers.tsx         # Provider composition
│   │   └── providers/            # Individual providers
│   │       ├── ThemeProvider.tsx
│   │       ├── LanguageProvider.tsx
│   │       ├── AuthProvider.tsx
│   │       └── ToastProvider.tsx
│   ├── components/
│   │   ├── layout/               # Shell, header, nav
│   │   └── ui/                   # Reusable UI primitives
│   ├── features/                 # Feature modules
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── api/
│   │   │   ├── guards/
│   │   │   ├── layout/
│   │   │   ├── routes.tsx
│   │   │   └── index.ts
│   │   ├── assistant/
│   │   ├── auth/
│   │   ├── bookmarks/
│   │   ├── categories/
│   │   ├── articles/
│   │   └── search/
│   ├── hooks/                    # Shared custom hooks
│   ├── lib/
│   │   ├── supabase/             # Supabase client, config, types
│   │   ├── i18n/                 # Translation strings and utilities
│   │   └── utils/                # Pure utility functions
│   ├── pages/                    # Top-level route pages (thin wrappers)
│   ├── styles/
│   │   ├── index.css             # Tailwind entry + base styles
│   │   └── tokens.css            # Design system CSS custom properties
│   ├── types/                    # Shared TypeScript types
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts
├── supabase/
│   ├── migrations/               # SQL migration files
│   ├── functions/                # Edge Functions
│   │   ├── ai-chat/
│   │   └── generate-embeddings/
│   └── seed.sql                  # Development seed data
├── docs/                         # (optional) Additional docs
├── PROJECT_SRS.md
├── DESIGN_SYSTEM.md
├── UI_RULES.md
├── DATABASE.md
├── AI_SYSTEM.md
├── COMPONENT_LIBRARY.md
├── DEVELOPMENT_RULES.md          # This file
├── eslint.config.js
├── .prettierrc
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── package.json
```

### 3.1 Feature Module Structure

Every feature follows this internal structure:

```
features/[name]/
├── components/     # Feature-specific UI
├── hooks/          # Feature-specific hooks
├── pages/          # Feature page components
├── api/            # Supabase queries and mutations
├── types/          # Feature-specific types
├── routes.tsx      # Feature route definitions (if routable)
└── index.ts        # Public API barrel export
```

**Rule:** Features import from other features only through their `index.ts` barrel — never deep-import internal files.

### 3.2 Import Order

```typescript
// 1. External packages
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal absolute imports (@/)
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

// 3. Relative imports (same feature only)
import { ArticleEditor } from './components/ArticleEditor';

// 4. Types (if not inline)
import type { Article } from '@/types';
```

---

## 4. TypeScript Rules

### 4.1 Strict Mode

`tsconfig.app.json` enforces:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

### 4.2 Type Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Component props | `type` (not interface) | `type ButtonProps = { ... }` |
| API responses | `type` with Supabase generated types | `type Article = Database['public']['Tables']['articles']['Row']` |
| Enums | Union types preferred over TS enum | `type Theme = 'dark' \| 'light'` |
| Event handlers | Explicit typing | `(e: React.FormEvent) => void` |
| Async functions | Return type explicit | `async function fetchArticles(): Promise<Article[]>` |

### 4.3 Forbidden Patterns

```typescript
// ❌ Never
const data: any = response;
// @ts-ignore
// @ts-expect-error (without explanation)

// ✅ Always
const data = response as Article[];
// Or better: validate with type guard
```

### 4.4 Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Components | PascalCase | `ArticleCard.tsx` |
| Hooks | camelCase, `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUERY_LENGTH` |
| Types | PascalCase | `ArticleStatus` |
| Files (non-component) | camelCase | `articleApi.ts` |
| CSS tokens | kebab-case | `--color-gold-official` |
| Routes | kebab-case paths | `/admin/content` |
| Database columns | snake_case | `published_at` |

---

## 5. React Rules

### 5.1 Component Patterns

```typescript
// ✅ Function components only — no class components
export function ArticleCard({ title, href }: ArticleCardProps) {
  return ( ... );
}

// ✅ Named exports for components
export function Button() { ... }

// ❌ Default exports for components (except lazy-loaded pages)
export default function Button() { ... }
```

Exception: lazy-loaded pages may use default export for `React.lazy()` compatibility.

### 5.2 State Management

| Scope | Tool |
|-------|------|
| Component-local | `useState`, `useReducer` |
| Shared (theme, language, auth) | React Context + custom hook |
| Server state | Supabase queries in feature `api/` modules |
| URL state | React Router search params |
| Persistent preferences | localStorage + Context sync |

**No global state library.** Context providers are composed in `src/app/providers.tsx`.

### 5.3 Data Fetching

```typescript
// Feature api/ module
export async function getPublishedArticles(): Promise<Article[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getCachedArticles(); // offline fallback

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

| Rule | Requirement |
|------|-------------|
| DR-01 | All Supabase queries in feature `api/` modules |
| DR-02 | Components never call Supabase directly |
| DR-03 | Every query has offline fallback or error state |
| DR-04 | Use Supabase generated types |
| DR-05 | Handle loading, error, and empty states in UI |

### 5.4 Routing

```typescript
// Lazy load all routes except login
const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage })),
);

// Route guards
<Route element={<AuthGuard><AppShell /></AuthGuard>}>
  {/* staff routes */}
</Route>

<Route element={<AdminGuard><AdminShell /></AdminGuard>}>
  {/* admin routes */}
</Route>
```

| Rule | Requirement |
|------|-------------|
| DR-06 | All routes lazy-loaded except auth |
| DR-07 | AuthGuard wraps all authenticated routes |
| DR-08 | AdminGuard wraps all admin routes |
| DR-09 | Route paths defined in feature `routes.tsx` files |
| DR-10 | 404 route always last |

---

## 6. Styling Rules

### 6.1 Tailwind Usage

```typescript
// ✅ Token-based utilities (mapped in @theme)
<div className="bg-bg-primary text-text-primary border-border">

// ✅ Conditional classes — simple ternary
<div className={isActive ? 'text-accent' : 'text-text-secondary'}>

// ❌ Hardcoded colors
<div className="bg-[#C8A962]">
<div style={{ color: '#C8A962' }}>

// ❌ Arbitrary values for design tokens
<div className="p-[17px]">
```

### 6.2 CSS Files

| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | All CSS custom properties (design tokens) |
| `src/styles/index.css` | Tailwind import, `@theme` mapping, base styles |

**No component-level CSS files.** All styling via Tailwind utilities and tokens.

Exception: complex animations may use `@keyframes` in `index.css`.

### 6.3 RTL Support

```typescript
// ✅ Logical properties
<div className="ms-4 pe-2 text-start">

// ❌ Directional properties
<div className="ml-4 pr-2 text-left">
```

---

## 7. Internationalization (i18n)

### 7.1 Structure

```
src/lib/i18n/
├── index.ts          # i18n utilities
├── locales/
│   ├── ar.ts         # Arabic (Egyptian) UI strings
│   └── en.ts         # English UI strings
└── types.ts          # Translation key types
```

### 7.2 Usage

```typescript
const { t } = useTranslation();

// ✅ Typed keys
<Button>{t('common.save')}</Button>

// ❌ Hardcoded strings in JSX
<Button>Save</Button>
```

### 7.3 Rules

| Rule | Requirement |
|------|-------------|
| DR-11 | All UI strings use `t()` — no hardcoded text in components |
| DR-12 | Knowledge content is bilingual in database — not in i18n files |
| DR-13 | Arabic translations use Egyptian dialect where appropriate |
| DR-14 | Translation keys are dot-namespaced: `nav.home`, `auth.login` |
| DR-15 | Default language is Arabic — `ar.ts` is the primary locale file |

---

## 8. Performance Rules

| Rule | Requirement |
|------|-------------|
| DR-16 | Route-level code splitting on every page |
| DR-17 | `React.lazy()` + `Suspense` with Skeleton fallback |
| DR-18 | Lucide icons: named imports only (`import { Home } from 'lucide-react'`) |
| DR-19 | Images: WebP, explicit dimensions, lazy loading |
| DR-20 | No images larger than 200KB without justification |
| DR-21 | Debounce search inputs (300ms) |
| DR-22 | Virtualize lists exceeding 50 items |
| DR-23 | No `useEffect` for data that can be fetched at route level |
| DR-24 | Prefetch on desktop hover only — not on mobile |
| DR-25 | Bundle analysis before adding any dependency |

### 8.1 Performance Budget

| Metric | Budget |
|--------|--------|
| Initial JS (gzip) | < 150 KB |
| Initial CSS (gzip) | < 20 KB |
| Largest route chunk (gzip) | < 50 KB |
| Font files total | < 100 KB |
| Lighthouse Performance (mobile) | ≥ 90 |

---

## 9. PWA & Offline Rules

| Rule | Requirement |
|------|-------------|
| DR-26 | Service worker configured in `vite.config.ts` |
| DR-27 | App shell precached |
| DR-28 | Published articles cached on read |
| DR-29 | Cache invalidation via article `version` field |
| DR-30 | `useOnlineStatus()` hook used for offline UI |
| DR-31 | OfflineBanner shown when network unavailable |
| DR-32 | AI assistant disabled offline with clear message |
| DR-33 | Bookmarks synced when connection restored |

---

## 10. Security Rules

| Rule | Requirement |
|------|-------------|
| DR-34 | Never commit `.env` files |
| DR-35 | Only `VITE_` prefixed vars in client code |
| DR-36 | Service role key only in Edge Functions |
| DR-37 | AI API keys only in Edge Functions |
| DR-38 | Sanitize all user input before display |
| DR-39 | Never use `dangerouslySetInnerHTML` except admin content preview (with sanitization) |
| DR-40 | Supabase RLS is the security boundary — verify policies |
| DR-41 | Admin actions logged to audit_logs |

---

## 11. Git Workflow

### 11.1 Branch Naming

```
feature/[ticket]-short-description
fix/[ticket]-short-description
docs/short-description
```

### 11.2 Commit Messages

```
type(scope): concise description

feat(auth): add login form with Supabase integration
fix(search): debounce input on Arabic keyboard
docs(srs): update scope boundaries
refactor(ui): extract ArticleCard from home page
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`

### 11.3 Pull Request Rules

- One feature per PR
- Must pass `npm run lint` and `npm run build`
- Must not introduce forbidden colors (CI check when available)
- Screenshots required for UI changes (both themes, both languages)
- Reference documentation section if implementing a specified requirement

---

## 12. Code Review Checklist

Reviewers verify:

- [ ] Follows folder structure (Section 3)
- [ ] TypeScript strict — no `any`
- [ ] Uses design tokens — no hardcoded colors/spacing
- [ ] Uses components from COMPONENT_LIBRARY.md
- [ ] UI strings use `t()` — no hardcoded text
- [ ] RTL tested for Arabic
- [ ] Both themes tested
- [ ] Loading, error, empty, offline states handled
- [ ] No forbidden dependencies added
- [ ] No out-of-scope features (orders, invoices, delivery)
- [ ] Supabase queries in `api/` modules with RLS awareness
- [ ] No `console.log` left in code
- [ ] Performance: lazy loading, no unnecessary re-renders

---

## 13. Environment Setup

```bash
# 1. Clone and install
npm install

# 2. Environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Development
npm run dev

# 4. Lint and format
npm run lint
npm run format

# 5. Production build
npm run build
npm run preview
```

### 13.1 Required Environment Variables

| Variable | Client | Required |
|----------|--------|----------|
| `VITE_SUPABASE_URL` | Yes | For data access |
| `VITE_SUPABASE_ANON_KEY` | Yes | For data access |

App runs without Supabase configured (offline/demo mode) but data features are disabled.

---

## 14. Error Handling Standard

```typescript
// API layer — throw typed errors
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message);
  }
}

// Hook layer — catch and set error state
const [error, setError] = useState<AppError | null>(null);

// UI layer — render ErrorState or Toast
if (error) return <ErrorState message={t('errors.generic')} onRetry={refetch} />;
```

| Layer | Responsibility |
|-------|----------------|
| API | Throw typed errors |
| Hook | Catch, set state |
| Component | Render error UI |
| Global | Toast for transient errors |

---

## 15. Accessibility Requirements

Every component and page must:

- Be keyboard navigable
- Have visible focus indicators (gold ring)
- Use semantic HTML (`nav`, `main`, `article`, `button`)
- Include ARIA labels on icon-only buttons
- Meet WCAG 2.1 AA contrast ratios
- Honor `prefers-reduced-motion`
- Support screen readers (test with NVDA/VoiceOver)

---

## 16. Documentation Maintenance

| Event | Action |
|-------|--------|
| New feature added | Update PROJECT_SRS.md if scope changes |
| New component created | Add to COMPONENT_LIBRARY.md |
| Schema change | Update DATABASE.md + run migration |
| AI behavior change | Update AI_SYSTEM.md |
| Design token change | Update DESIGN_SYSTEM.md (requires re-approval) |
| New dev rule | Update this file |

**Documentation is code.** Outdated docs are bugs.

---

## 17. Definition of Done

A feature is done when:

1. Code follows all rules in this document
2. UI follows DESIGN_SYSTEM.md and UI_RULES.md
3. Both themes work correctly
4. Arabic RTL and English LTR verified
5. Loading, error, empty, and offline states implemented
6. TypeScript compiles with zero errors
7. ESLint passes with zero warnings
8. Performance budget not exceeded
9. Accessibility checklist passed
10. Documentation updated if applicable

---

**Next Step:** Await implementation instruction. Reference these documents for every development task.

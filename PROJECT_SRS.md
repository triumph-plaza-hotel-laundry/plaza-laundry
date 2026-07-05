# Triumph Plaza Hotel Laundry — Software Requirements Specification (SRS)

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27  
**Project Code:** TPH-LAUNDRY-PWA

---

## 1. Document Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for **Triumph Plaza Hotel Laundry** — a production Progressive Web Application (PWA) for internal hotel staff.

This document is the authoritative requirements reference. All design, engineering, database, and AI decisions must align with this specification.

---

## 2. Project Identity

| Attribute | Value |
|-----------|-------|
| **Project Name** | Triumph Plaza Hotel Laundry |
| **Type** | Luxury Hotel Laundry Management & Knowledge Platform |
| **Audience** | Internal hotel staff only |
| **Deployment Model** | PWA (installable, offline-capable) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Default Language** | Arabic (Egyptian — `ar-EG`) |
| **Default Theme** | Dark Luxury |

---

## 3. Project Vision

Triumph Plaza Hotel Laundry is an internal professional platform that empowers laundry department staff with:

1. **Operational Knowledge** — Standard procedures, fabric care, chemical safety, and equipment guidance.
2. **Content Management** — Admin-controlled knowledge base with bilingual content.
3. **Intelligent Assistance** — AI-powered search and answers grounded in approved hotel knowledge.
4. **Premium Experience** — A visual and interaction quality matching a five-star hotel environment.

The platform must feel like an official hotel system — not a generic web app or demo.

---

## 4. Explicit Scope Boundaries

### 4.1 In Scope

- Internal staff authentication and role-based access
- Knowledge base (articles, categories, tags, media)
- Bilingual content (Arabic Egyptian + English)
- Admin content management system
- AI knowledge assistant (grounded in approved content)
- Global search across knowledge content
- Bookmarks / favorites for staff
- Offline reading of cached content
- Theme switching (Dark Luxury / Luxury Light)
- Language switching (Arabic / English) with RTL/LTR
- PWA installation, service worker, and offline strategy
- Audit logging for admin actions
- Accessibility (WCAG 2.1 AA target)

### 4.2 Out of Scope (Permanently Excluded)

The following must **never** be implemented unless this SRS is formally revised:

| Excluded Feature | Reason |
|------------------|--------|
| Customer ordering | Internal staff platform only |
| Order tracking | Not a guest-facing or logistics system |
| Invoices / billing | No financial module |
| Delivery management | No logistics workflow |
| Guest-facing portal | Staff-only access |
| Public registration | Admin-provisioned accounts only |
| Payment processing | Not applicable |
| Inventory procurement | Out of current scope |

---

## 5. User Roles

### 5.1 Staff (Default Role)

**Purpose:** Access approved knowledge and use AI assistant.

**Permissions:**
- View published knowledge content
- Search and filter content
- Bookmark articles
- Switch language and theme
- Use AI assistant (rate-limited, grounded responses)
- View own profile (read-only except preferences)

**Restrictions:**
- Cannot create, edit, or delete content
- Cannot access admin routes
- Cannot manage users

### 5.2 Admin

**Purpose:** Manage platform content, users, and system configuration.

**Permissions:**
- All Staff permissions
- Create, edit, publish, archive knowledge content
- Manage categories, tags, and media assets
- Manage staff accounts (invite, deactivate, assign roles)
- Review AI interaction logs (read-only audit)
- Configure featured content and homepage modules
- Access admin dashboard and analytics summaries

**Restrictions:**
- Cannot override Supabase RLS without migration review
- Cannot expose customer/order features (out of scope)

### 5.3 Super Admin (Optional — Phase 2)

Reserved for system owner. Same as Admin with additional user role management and system settings. Implement only when explicitly requested.

---

## 6. Functional Requirements

### 6.1 Authentication & Session

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Staff sign in with email + password via Supabase Auth | Must |
| AUTH-02 | Session persists securely across browser restarts | Must |
| AUTH-03 | Protected routes redirect unauthenticated users | Must |
| AUTH-04 | Admin routes require Admin role | Must |
| AUTH-05 | Sign out clears session and sensitive cached data | Must |
| AUTH-06 | Password reset via email (Supabase) | Should |
| AUTH-07 | Account lockout after repeated failed attempts (Supabase policy) | Should |

### 6.2 Knowledge Base

| ID | Requirement | Priority |
|----|-------------|----------|
| KB-01 | Browse content by category hierarchy | Must |
| KB-02 | View article detail with rich formatted content | Must |
| KB-03 | Each article supports Arabic and English versions | Must |
| KB-04 | Tags for cross-category discovery | Must |
| KB-05 | Full-text search across titles and body | Must |
| KB-06 | Filter by category, tag, and content type | Must |
| KB-07 | Featured / pinned articles on home | Must |
| KB-08 | Related articles suggestions | Should |
| KB-09 | Media attachments (images, PDFs) via Supabase Storage | Must |
| KB-10 | Content types: Procedure, Fabric Care, Safety, Equipment, General | Must |
| KB-11 | Published / Draft / Archived lifecycle | Must |
| KB-12 | Last updated timestamp and author visible on articles | Must |

### 6.3 Staff Experience

| ID | Requirement | Priority |
|----|-------------|----------|
| STAFF-01 | Mobile-first home dashboard with quick access modules | Must |
| STAFF-02 | Bookmark articles for offline access | Must |
| STAFF-03 | Recently viewed history (local + synced where possible) | Should |
| STAFF-04 | Global header with logo, language switcher, theme toggle | Must |
| STAFF-05 | Bottom navigation on mobile (Home, Search, Bookmarks, Profile) | Must |
| STAFF-06 | Sidebar navigation on tablet/desktop | Must |

### 6.4 Admin System

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-01 | Admin dashboard with content stats overview | Must |
| ADM-02 | CRUD for knowledge articles (bilingual fields) | Must |
| ADM-03 | Rich text editor for article body | Must |
| ADM-04 | Category and tag management | Must |
| ADM-05 | Media library (upload, attach, delete) | Must |
| ADM-06 | User management (invite staff, assign roles, deactivate) | Must |
| ADM-07 | Publish workflow: Draft → Review → Published → Archived | Must |
| ADM-08 | Audit log of admin actions | Must |
| ADM-09 | Featured content configuration | Should |

### 6.5 AI Knowledge Assistant

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | Staff can ask questions in Arabic or English | Must |
| AI-02 | Responses grounded in published knowledge base only | Must |
| AI-03 | Cite source articles in responses | Must |
| AI-04 | Refuse to answer when no approved source exists | Must |
| AI-05 | Conversation history per session (not permanent by default) | Should |
| AI-06 | Admin can review anonymized query logs | Should |
| AI-07 | Rate limiting per user | Must |

See `AI_SYSTEM.md` for full architecture.

### 6.6 Internationalization (i18n)

| ID | Requirement | Priority |
|----|-------------|----------|
| I18N-01 | Arabic (Egyptian) is the default language | Must |
| I18N-02 | English as secondary language | Must |
| I18N-03 | Instant language switch without page reload | Must |
| I18N-04 | RTL layout for Arabic, LTR for English | Must |
| I18N-05 | Persist language preference in local storage | Must |
| I18N-06 | UI strings separated from knowledge content translations | Must |
| I18N-07 | Language switcher: elegant globe icon with premium dropdown in header | Must |

### 6.7 Theming

| ID | Requirement | Priority |
|----|-------------|----------|
| THM-01 | Dark Luxury theme is default | Must |
| THM-02 | Luxury Light theme available | Must |
| THM-03 | Animated theme transition (respect `prefers-reduced-motion`) | Must |
| THM-04 | Persist theme preference in local storage | Must |
| THM-05 | Theme colors strictly from approved design tokens | Must |

See `DESIGN_SYSTEM.md` for token definitions.

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| PERF-01 | First Contentful Paint (4G mid-tier Android) | < 1.8s |
| PERF-02 | Time to Interactive (4G mid-tier Android) | < 3.5s |
| PERF-03 | Lighthouse Performance score (mobile) | ≥ 90 |
| PERF-04 | Route-level code splitting | Required |
| PERF-05 | Lazy load images and non-critical components | Required |
| PERF-06 | Initial JS bundle (gzip) | < 150 KB target |
| PERF-07 | Animations must not drop below 60fps on target devices | Required |

### 7.2 Offline & PWA

| ID | Requirement | Target |
|----|-------------|--------|
| PWA-01 | Installable on Android and iOS (Add to Home Screen) | Required |
| PWA-02 | Service worker caches app shell | Required |
| PWA-03 | Cached articles readable offline | Required |
| PWA-04 | Offline indicator when network unavailable | Required |
| PWA-05 | Background sync for bookmarks when connection restored | Should |
| PWA-06 | App manifest with Triumph branding | Required |

### 7.3 Security

| ID | Requirement |
|----|-------------|
| SEC-01 | All API access via Supabase RLS — no client-side trust |
| SEC-02 | Admin actions logged with user ID and timestamp |
| SEC-03 | Environment secrets never committed to repository |
| SEC-04 | HTTPS only in production |
| SEC-05 | Content Security Policy configured |
| SEC-06 | AI queries sanitized before processing |
| SEC-07 | Storage buckets with role-based access policies |

### 7.4 Accessibility

| ID | Requirement |
|----|-------------|
| A11Y-01 | WCAG 2.1 Level AA compliance target |
| A11Y-02 | Full keyboard navigation |
| A11Y-03 | Screen reader compatible (ARIA labels, landmarks) |
| A11Y-04 | Minimum touch target 44×44px |
| A11Y-05 | Color contrast meets AA for both themes |
| A11Y-06 | Focus indicators visible and on-brand |
| A11Y-07 | `prefers-reduced-motion` honored globally |

### 7.5 SEO & Metadata

| ID | Requirement |
|----|-------------|
| SEO-01 | Semantic HTML structure |
| SEO-02 | Dynamic page titles and meta descriptions |
| SEO-03 | Open Graph tags for internal sharing |
| SEO-04 | `robots: noindex` (internal app — not public SEO) |
| SEO-05 | Structured data for articles (JSON-LD) for internal tools |

### 7.6 Scalability & Maintainability

| ID | Requirement |
|----|-------------|
| SCL-01 | Feature-based folder architecture |
| SCL-02 | Strict TypeScript — no `any` without documented exception |
| SCL-03 | Shared components — zero duplicated UI logic |
| SCL-04 | Database migrations version-controlled |
| SCL-05 | All strings externalized for i18n |

---

## 8. Application Structure (High Level)

```
Staff Routes (Authenticated)
├── /                     Home dashboard
├── /search               Global search
├── /category/:slug       Category listing
├── /article/:slug        Article detail
├── /bookmarks            Saved articles
├── /assistant            AI knowledge assistant
└── /profile              User preferences

Admin Routes (Admin Role)
├── /admin                Dashboard
├── /admin/content        Article management
├── /admin/content/new    Create article
├── /admin/content/:id    Edit article
├── /admin/categories     Category management
├── /admin/tags           Tag management
├── /admin/media          Media library
├── /admin/users          User management
└── /admin/audit          Audit log

Public Routes
├── /login                Sign in
└── /404                  Not found
```

---

## 9. Data Requirements

All persistent data requirements are defined in `DATABASE.md`.

Key entities:
- Users / Profiles
- Roles
- Categories
- Articles (bilingual)
- Tags
- Media Assets
- Bookmarks
- Audit Logs
- AI Query Logs
- Content Embeddings (for AI retrieval)

---

## 10. Integration Requirements

| System | Purpose | Protocol |
|--------|---------|----------|
| Supabase Auth | Authentication | SDK |
| Supabase Database | Data persistence | PostgREST + RLS |
| Supabase Storage | Media files | SDK |
| Supabase Edge Functions | AI orchestration, webhooks | HTTPS |
| AI Provider (via Edge Function) | LLM inference | HTTPS (server-side only) |

No third-party analytics in Phase 1 unless explicitly approved.

---

## 11. Acceptance Criteria (Release Gate)

The application is release-ready when:

1. All **Must** requirements in sections 6–7 are implemented and tested.
2. Both themes render correctly with official brand colors.
3. Arabic RTL and English LTR verified on all primary routes.
4. PWA installs and operates offline for cached content.
5. Admin can publish bilingual article visible to Staff.
6. AI assistant cites sources and refuses ungrounded answers.
7. Lighthouse mobile Performance ≥ 90, Accessibility ≥ 95.
8. No forbidden colors appear in UI (see `DESIGN_SYSTEM.md`).
9. No out-of-scope features present.
10. All documentation reflects implemented behavior.

---

## 12. Assumptions & Dependencies

| Item | Assumption |
|------|------------|
| Triumph logo asset | Will be provided at `public/brand/triumph-logo.svg` (or equivalent) |
| Official gold color | Extracted from logo per `DESIGN_SYSTEM.md` — blocks final color sign-off until verified |
| Supabase project | Provisioned with production and staging environments |
| Staff accounts | Created by Admin — no self-registration |
| Target devices | Low-to-mid tier Android phones (primary), tablets, desktop browsers |
| Network | Intermittent connectivity expected — offline is critical |

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Knowledge Article** | A published piece of operational content (procedure, guide, etc.) |
| **Staff** | Authenticated hotel laundry employee with read access |
| **Admin** | Authorized content and user manager |
| **Grounded AI** | AI responses limited to approved knowledge base sources |
| **App Shell** | Minimum UI framework cached for offline loading |
| **Dark Luxury** | Default dark theme with black base and gold accents |
| **Luxury Light** | Light theme with white base and gold accents |

---

## 14. Document Governance

- Changes to scope (especially Section 4) require explicit stakeholder approval.
- Implementation must not begin on features marked out of scope.
- Approved UI pages must not be redesigned without approval (see `UI_RULES.md`).
- This SRS supersedes informal requirements in chat or messages.

**Next Step:** Await implementation instruction. Do not build UI until explicitly directed.

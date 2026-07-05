# Triumph Plaza Hotel Laundry — Database Schema

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27  
**Platform:** Supabase (PostgreSQL 15+)

This document defines the complete database schema, Row Level Security (RLS) policies, indexes, and migration strategy.

All application data access must go through Supabase with RLS enforced. **Never bypass RLS from the client.**

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Supabase                            │
├──────────────┬──────────────┬──────────────┬────────────┤
│     Auth     │  PostgreSQL  │   Storage    │    Edge    │
│  (users)     │   + RLS      │   (media)    │ Functions  │
│              │  + pgvector  │              │  (AI API)  │
└──────────────┴──────────────┴──────────────┴────────────┘
```

### 1.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| Security by default | RLS on every table |
| Bilingual by design | Separate translation columns, not JSON blobs |
| Soft delete | `deleted_at` on content tables — never hard delete articles |
| Audit trail | Immutable audit log for admin actions |
| Offline-friendly | Timestamps and version fields for cache invalidation |
| AI-ready | pgvector embeddings linked to published articles |

---

## 2. Enum Types

```sql
CREATE TYPE user_role AS ENUM ('staff', 'admin');

CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE content_type AS ENUM (
  'procedure',
  'fabric_care',
  'safety',
  'equipment',
  'general'
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'publish',
  'archive',
  'login',
  'invite_user',
  'deactivate_user'
);
```

---

## 3. Tables

### 3.1 `profiles`

Extends Supabase Auth users with app-specific data.

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name_ar  TEXT,
  full_name_en  TEXT,
  role          user_role NOT NULL DEFAULT 'staff',
  department    TEXT DEFAULT 'laundry',
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  preferred_language TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
  preferred_theme    TEXT NOT NULL DEFAULT 'dark' CHECK (preferred_theme IN ('dark', 'light')),
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Notes |
|--------|-------|
| `role` | `staff` or `admin` — controls route and RLS access |
| `is_active` | Deactivated users cannot authenticate |
| `preferred_language` | Synced from client; server backup of preference |
| `preferred_theme` | Synced from client; server backup of preference |

**Trigger:** Auto-create profile on `auth.users` insert via database function.

---

### 3.2 `categories`

Hierarchical content categories.

```sql
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  parent_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.3 `tags`

```sql
CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name_ar    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.4 `articles`

Core knowledge base content.

```sql
CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  excerpt_ar      TEXT,
  excerpt_en      TEXT,
  body_ar         TEXT NOT NULL DEFAULT '',
  body_en         TEXT NOT NULL DEFAULT '',
  content_type    content_type NOT NULL DEFAULT 'general',
  status          article_status NOT NULL DEFAULT 'draft',
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  featured_image  TEXT,
  reading_time_min INTEGER,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  version         INTEGER NOT NULL DEFAULT 1,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Notes |
|--------|-------|
| `body_ar` / `body_en` | Rich text (HTML or Markdown — decide at implementation) |
| `version` | Incremented on each publish — used for offline cache invalidation |
| `deleted_at` | Soft delete — NULL means active |
| `published_at` | Set when status changes to `published` |

---

### 3.5 `article_tags`

Many-to-many: articles ↔ tags.

```sql
CREATE TABLE article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);
```

---

### 3.6 `media_assets`

```sql
CREATE TABLE media_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  alt_text_ar  TEXT,
  alt_text_en  TEXT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Storage bucket:** `media` — path pattern: `{year}/{month}/{uuid}.{ext}`

---

### 3.7 `bookmarks`

Staff saved articles.

```sql
CREATE TABLE bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
```

---

### 3.8 `article_embeddings`

Vector embeddings for AI retrieval (pgvector).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE article_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text  TEXT NOT NULL,
  embedding   vector(1536) NOT NULL,
  language    TEXT NOT NULL CHECK (language IN ('ar', 'en')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, chunk_index, language)
);
```

| Column | Notes |
|--------|-------|
| `chunk_text` | Text segment used to generate embedding |
| `embedding` | 1536 dimensions (OpenAI text-embedding-3-small compatible) |
| `language` | Separate embeddings per language for better retrieval |

**Index:**
```sql
CREATE INDEX idx_embeddings_vector
  ON article_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

### 3.9 `audit_logs`

Immutable admin action log.

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**No UPDATE or DELETE allowed on this table** — enforce via RLS and triggers.

---

### 3.10 `ai_query_logs`

Anonymized AI interaction log for admin review.

```sql
CREATE TABLE ai_query_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query_text      TEXT NOT NULL,
  query_language  TEXT NOT NULL CHECK (query_language IN ('ar', 'en')),
  response_text   TEXT,
  sources_used    UUID[] DEFAULT '{}',
  was_grounded    BOOLEAN NOT NULL DEFAULT false,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.11 `featured_content`

Admin-configurable homepage modules.

```sql
CREATE TABLE featured_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Row Level Security (RLS)

RLS is **enabled on all tables**.

### 4.1 Helper Functions

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 4.2 Policy Summary

| Table | Staff Read | Staff Write | Admin Read | Admin Write |
|-------|-----------|-------------|------------|-------------|
| `profiles` | Own row | Own preferences | All | All |
| `categories` | All | — | All | All |
| `tags` | All | — | All | All |
| `articles` | Published only | — | All | All |
| `article_tags` | Published articles | — | All | All |
| `media_assets` | All | — | All | All |
| `bookmarks` | Own | Own CRUD | — | — |
| `article_embeddings` | — (Edge Function only) | — | — | Service role |
| `audit_logs` | — | — | All | Insert only (via trigger) |
| `ai_query_logs` | Own | Insert own | All | — |
| `featured_content` | Active items | — | All | All |

### 4.3 Example Policies

```sql
-- Articles: staff reads published only
CREATE POLICY "staff_read_published_articles"
  ON articles FOR SELECT
  TO authenticated
  USING (
    is_active_user()
    AND status = 'published'
    AND deleted_at IS NULL
  );

-- Articles: admin full access
CREATE POLICY "admin_all_articles"
  ON articles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Bookmarks: users manage own
CREATE POLICY "users_own_bookmarks"
  ON bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## 5. Indexes

```sql
-- Full-text search (Arabic + English)
CREATE INDEX idx_articles_search_ar
  ON articles USING gin(to_tsvector('arabic', title_ar || ' ' || body_ar));

CREATE INDEX idx_articles_search_en
  ON articles USING gin(to_tsvector('english', title_en || ' ' || body_en));

-- Common queries
CREATE INDEX idx_articles_status ON articles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_articles_category ON articles(category_id) WHERE status = 'published';
CREATE INDEX idx_articles_featured ON articles(is_featured) WHERE status = 'published';
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_sort ON categories(sort_order);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_ai_logs_created ON ai_query_logs(created_at DESC);
```

---

## 6. Database Functions & Triggers

### 6.1 Auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to: profiles, categories, articles, featured_content, article_embeddings
```

### 6.2 Auto-create profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 6.3 Audit log trigger

```sql
CREATE OR REPLACE FUNCTION log_article_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'create'::audit_action
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'published' AND OLD.status != 'published' THEN 'publish'::audit_action
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'archived' THEN 'archive'::audit_action
      ELSE 'update'::audit_action
    END,
    'article',
    NEW.id,
    jsonb_build_object('title_en', NEW.title_en, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.4 Increment version on publish

```sql
CREATE OR REPLACE FUNCTION increment_article_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status != 'published' OR OLD.body_ar != NEW.body_ar OR OLD.body_en != NEW.body_en) THEN
    NEW.version = OLD.version + 1;
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Storage Buckets

| Bucket | Public | Max Size | Allowed Types |
|--------|--------|----------|---------------|
| `media` | No (signed URLs) | 10 MB | image/jpeg, image/png, image/webp, application/pdf |
| `avatars` | No (signed URLs) | 2 MB | image/jpeg, image/png, image/webp |

### Storage RLS

```sql
-- media: admin upload, authenticated read
-- avatars: user upload own, admin read all
```

---

## 8. Full-Text Search Function

```sql
CREATE OR REPLACE FUNCTION search_articles(
  search_query TEXT,
  search_language TEXT DEFAULT 'ar',
  result_limit INTEGER DEFAULT 20
)
RETURNS SETOF articles AS $$
BEGIN
  IF search_language = 'ar' THEN
    RETURN QUERY
      SELECT a.* FROM articles a
      WHERE a.status = 'published'
        AND a.deleted_at IS NULL
        AND to_tsvector('arabic', a.title_ar || ' ' || a.body_ar)
            @@ plainto_tsquery('arabic', search_query)
      ORDER BY ts_rank(
        to_tsvector('arabic', a.title_ar || ' ' || a.body_ar),
        plainto_tsquery('arabic', search_query)
      ) DESC
      LIMIT result_limit;
  ELSE
    RETURN QUERY
      SELECT a.* FROM articles a
      WHERE a.status = 'published'
        AND a.deleted_at IS NULL
        AND to_tsvector('english', a.title_en || ' ' || a.body_en)
            @@ plainto_tsquery('english', search_query)
      ORDER BY ts_rank(
        to_tsvector('english', a.title_en || ' ' || a.body_en),
        plainto_tsquery('english', search_query)
      ) DESC
      LIMIT result_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 9. TypeScript Types

Generated types live at `src/lib/supabase/types.ts`.

Regenerate after schema changes:
```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/supabase/types.ts
```

Manual type placeholders exist until Supabase project is connected.

---

## 10. Migration Strategy

| Rule | Specification |
|------|---------------|
| Location | `supabase/migrations/` |
| Naming | `YYYYMMDDHHMMSS_description.sql` |
| Version control | All migrations committed to repository |
| Environments | `staging` and `production` — never migrate production first |
| Rollback | Each migration includes DOWN section as comment |
| Seeds | `supabase/seed.sql` for development data only — never in production |

### Initial migration order:
1. Extensions (`vector`)
2. Enum types
3. Tables (dependency order)
4. Indexes
5. Functions & triggers
6. RLS policies
7. Storage buckets & policies

---

## 11. Offline Sync Strategy

| Data | Offline Strategy |
|------|------------------|
| App shell | Service worker precache |
| Published articles | Cache on first read; invalidate when `version` changes |
| Bookmarks | IndexedDB local + sync to Supabase when online |
| Categories & tags | Cache with 24h stale-while-revalidate |
| User preferences | localStorage primary, sync to profile on login |
| Search index | Client-side cache of recent results |
| AI assistant | Requires network — show offline message |

---

## 12. Data NOT Stored

The following are explicitly excluded from the database:

- Customer orders
- Order tracking status
- Invoices / billing records
- Delivery routes or assignments
- Payment information
- Guest personal data

---

## 13. Environment Variables

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Server-side only (Edge Functions — never in client)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
AI_API_KEY=<provider-key>
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_CHAT_MODEL=gpt-4o-mini
```

---

## 14. Entity Relationship Diagram

```
profiles ──────────────┐
   │                   │
   ├── bookmarks ── articles ── article_tags ── tags
   │                   │
   │                   ├── article_embeddings
   │                   │
   │                   └── featured_content
   │
   ├── audit_logs
   └── ai_query_logs

categories ── (self-ref parent_id)
           └── articles

media_assets (standalone, referenced by articles.featured_image)
```

---

## 15. Backup & Recovery

| Item | Policy |
|------|--------|
| Supabase automatic backups | Daily (Pro plan) |
| Point-in-time recovery | Enabled on production |
| Storage bucket backup | Replicate critical media |
| Migration rollback | Documented DOWN scripts |

---

**Next Step:** Create Supabase project and run initial migration when instructed. Do not create application code until directed.

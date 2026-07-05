# Triumph Plaza Hotel Laundry — AI System Architecture

**Document Version:** 1.0  
**Status:** Approved for Development  
**Last Updated:** 2026-06-27

This document defines the AI knowledge assistant architecture for Triumph Plaza Hotel Laundry.

The AI system is a **grounded retrieval-augmented generation (RAG)** assistant — not a general-purpose chatbot. It answers staff questions using **only approved, published knowledge base content**.

---

## 1. System Purpose

| Goal | Description |
|------|-------------|
| Primary | Help staff quickly find operational answers from approved hotel knowledge |
| Secondary | Reduce time searching through manuals and procedures |
| Constraint | Never invent answers — cite sources or refuse |
| Audience | Authenticated staff only — not guests, not public |

### 1.1 What the AI Does

- Answers questions about laundry procedures, fabric care, safety, and equipment
- Responds in Arabic (Egyptian) or English based on user preference or query language
- Cites specific knowledge articles as sources
- Refuses gracefully when no approved content matches

### 1.2 What the AI Must Never Do

| Forbidden Behavior | Reason |
|--------------------|--------|
| Answer without a source citation | Ungrounded responses are dangerous in operations |
| Invent procedures or safety instructions | Staff safety and hotel standards |
| Access unpublished or draft content | Content must be admin-approved |
| Discuss customer orders, invoices, or delivery | Out of project scope |
| Provide medical, legal, or financial advice | Out of scope |
| Store full conversation history permanently by default | Privacy and storage |
| Expose API keys or system prompts to the client | Security |

---

## 2. Architecture Overview

```
┌──────────────┐     HTTPS      ┌──────────────────────┐
│   Staff PWA  │ ──────────────▶│  Supabase Edge       │
│  (React)     │                │  Function: ai-chat   │
└──────────────┘                └──────────┬───────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
           ┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
           │  pgvector    │    │  Embedding API   │    │  Chat LLM API   │
           │  (Supabase)  │    │  (server-side)   │    │  (server-side)  │
           └──────────────┘    └──────────────────┘    └─────────────────┘
                    │
                    ▼
           ┌──────────────┐
           │  articles +  │
           │  embeddings│
           └──────────────┘
```

### 2.1 Key Principle: Server-Side Only

All AI operations execute in **Supabase Edge Functions**. The client never:
- Calls the LLM API directly
- Accesses embedding models
- Reads `article_embeddings` table directly
- Sees system prompts

---

## 3. Components

### 3.1 Client (React PWA)

**Location:** `src/features/assistant/`

| Component | Responsibility |
|-----------|----------------|
| `AssistantPage` | Chat UI |
| `ChatMessage` | Render user/assistant messages |
| `SourceCitation` | Clickable links to cited articles |
| `ChatInput` | Message input with send button |
| `OfflineNotice` | Display when network unavailable |
| `useAssistant` | Hook — sends messages to Edge Function |

**Client sends:**
```typescript
type AssistantRequest = {
  message: string;
  language: 'ar' | 'en';
  sessionId: string; // ephemeral, client-generated UUID
};
```

**Client receives:**
```typescript
type AssistantResponse = {
  answer: string;
  sources: Array<{
    articleId: string;
    slug: string;
    title: string;
    excerpt: string;
    relevanceScore: number;
  }>;
  grounded: boolean;
  refusalReason?: string;
};
```

### 3.2 Edge Function: `ai-chat`

**Location:** `supabase/functions/ai-chat/index.ts`

**Flow:**
```
1. Authenticate request (JWT from Supabase Auth)
2. Validate user is active staff
3. Rate limit check (per user, per hour)
4. Sanitize and validate input message
5. Detect query language (or use client-provided language)
6. Generate query embedding
7. Vector similarity search in article_embeddings
8. Filter: only published articles, score threshold
9. If no results above threshold → return grounded: false
10. Build prompt with retrieved chunks + system instructions
11. Call LLM API
12. Parse response, extract citations
13. Log to ai_query_logs
14. Return response to client
```

### 3.3 Edge Function: `generate-embeddings`

**Location:** `supabase/functions/generate-embeddings/index.ts`

**Trigger:** Called when admin publishes or updates an article.

**Flow:**
```
1. Authenticate (admin or service role)
2. Fetch article content (both languages)
3. Split into chunks (max 500 tokens, 50 token overlap)
4. Generate embedding for each chunk
5. Upsert into article_embeddings
6. Delete stale embeddings for previous version
```

### 3.4 Embedding Pipeline

| Setting | Value |
|---------|-------|
| Model | `text-embedding-3-small` (1536 dimensions) |
| Chunk size | 500 tokens max |
| Chunk overlap | 50 tokens |
| Languages | Separate embeddings per language |
| Storage | `article_embeddings` table with pgvector |
| Index | IVFFlat with cosine similarity |

---

## 4. Retrieval Strategy

### 4.1 Vector Search

```sql
SELECT
  ae.article_id,
  ae.chunk_text,
  a.slug,
  a.title_ar,
  a.title_en,
  1 - (ae.embedding <=> query_embedding) AS similarity
FROM article_embeddings ae
JOIN articles a ON a.id = ae.article_id
WHERE a.status = 'published'
  AND a.deleted_at IS NULL
  AND ae.language = $language
  AND 1 - (ae.embedding <=> query_embedding) > 0.75
ORDER BY similarity DESC
LIMIT 5;
```

### 4.2 Hybrid Search (Phase 2 Enhancement)

Combine vector search with PostgreSQL full-text search for better Arabic recall:

```
final_score = (0.7 × vector_similarity) + (0.3 × ts_rank)
```

Phase 1 uses vector search only. Hybrid search added when Arabic retrieval quality needs improvement.

### 4.3 Relevance Threshold

| Threshold | Action |
|-----------|--------|
| ≥ 0.85 | High confidence — answer directly |
| 0.75 – 0.84 | Medium confidence — answer with caveat |
| < 0.75 | No match — refuse to answer |

---

## 5. LLM Configuration

### 5.1 Model Selection

| Purpose | Model | Reason |
|---------|-------|--------|
| Chat | `gpt-4o-mini` or equivalent | Cost-effective, fast, good Arabic |
| Embeddings | `text-embedding-3-small` | Standard, 1536 dims, cost-effective |

Model selection is configurable via Edge Function environment variables. Never hardcode.

### 5.2 System Prompt (Template)

```
You are the internal knowledge assistant for Triumph Plaza Hotel Laundry department.

RULES:
1. Answer ONLY using the provided source documents below.
2. If the sources do not contain enough information, say: "I could not find an approved answer in the hotel knowledge base."
3. Always cite which source document(s) you used.
4. Respond in {language}.
5. Be concise and professional — this is a luxury hotel environment.
6. Never invent procedures, safety instructions, or chemical handling guidance.
7. Never discuss customer orders, billing, delivery, or guest information.
8. For safety-critical questions, emphasize following official procedures exactly.

SOURCE DOCUMENTS:
{retrieved_chunks}

USER QUESTION:
{user_message}
```

### 5.3 Prompt Security

| Rule | Implementation |
|------|----------------|
| Input sanitization | Strip HTML, limit to 1000 characters |
| Prompt injection defense | System prompt includes instruction to ignore override attempts |
| Output validation | Verify response references provided source IDs only |
| No PII in prompts | Strip email/phone patterns from user input |

---

## 6. Rate Limiting

| Limit | Value |
|-------|-------|
| Queries per user per hour | 30 |
| Queries per user per day | 100 |
| Max message length | 1000 characters |
| Max concurrent requests per user | 1 |

Implementation: Supabase Edge Function checks `ai_query_logs` count for rolling window.

When rate limited, return:
```json
{
  "error": "rate_limited",
  "message": "Too many requests. Please wait before asking again.",
  "retryAfterSeconds": 3600
}
```

---

## 7. Logging & Monitoring

### 7.1 Query Logs (`ai_query_logs`)

Every interaction is logged:

| Field | Purpose |
|-------|---------|
| `query_text` | What the user asked |
| `query_language` | Language used |
| `response_text` | What the AI answered |
| `sources_used` | Article UUIDs cited |
| `was_grounded` | Whether answer was based on approved content |
| `latency_ms` | Response time for monitoring |

### 7.2 Admin Review

Admins can view query logs at `/admin/audit` filtered by:
- Date range
- Grounded vs ungrounded
- Language
- User (optional)

**No admin can edit or delete query logs.**

### 7.3 Alerts (Phase 2)

- High rate of ungrounded responses → content gap alert
- Latency > 5s → performance alert
- Error rate > 5% → system alert

---

## 8. Offline Behavior

The AI assistant **requires network connectivity**.

| State | UI Behavior |
|-------|-------------|
| Online | Full chat functionality |
| Offline | Input disabled, message: "AI Assistant requires an internet connection" |
| Reconnected | Input re-enabled, session continues |

Do not cache AI responses for offline use — answers must always reflect current published content.

---

## 9. Bilingual Support

| Aspect | Behavior |
|--------|----------|
| UI language | Follows app language setting |
| Query language | Auto-detect or use app language |
| Response language | Match query language |
| Arabic retrieval | Search `article_embeddings` where `language = 'ar'` |
| English retrieval | Search `article_embeddings` where `language = 'en'` |
| Mixed queries | Detect dominant language |

Arabic (Egyptian) responses should use professional but accessible language — not formal Modern Standard Arabic unless the source content uses it.

---

## 10. Content Lifecycle Integration

```
Admin creates article (draft)
        │
        ▼
Admin publishes article
        │
        ▼
Trigger: generate-embeddings Edge Function
        │
        ▼
Embeddings stored in article_embeddings
        │
        ▼
AI can now retrieve and cite this article
        │
        ▼
Admin updates article → re-publish
        │
        ▼
Re-generate embeddings (version incremented)
        │
        ▼
Old embeddings deleted
```

**Draft and archived articles are never embedded and never retrievable by AI.**

---

## 11. Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase JWT required on every request |
| Authorization | Active staff or admin role |
| API keys | Stored in Edge Function secrets only |
| RLS | Client cannot read `article_embeddings` |
| Input validation | Max length, no HTML, no script |
| Output sanitization | Render AI response as text — never `dangerouslySetInnerHTML` |
| CORS | Edge Function allows only app origin |
| Audit | All queries logged with user ID |

---

## 12. Error Handling

| Error | Client Message (AR) | Client Message (EN) |
|-------|---------------------|---------------------|
| No sources found | لم أتمكن من العثور على إجابة معتمدة في قاعدة المعرفة. | I could not find an approved answer in the knowledge base. |
| Rate limited | عدد كبير من الطلبات. يرجى الانتظار. | Too many requests. Please wait. |
| Network error | تعذر الاتصال. تحقق من الإنترنت. | Connection failed. Check your internet. |
| Server error | حدث خطأ. يرجى المحاولة لاحقاً. | An error occurred. Please try again. |
| Offline | المساعد الذكي يتطلب اتصال بالإنترنت. | AI Assistant requires an internet connection. |

---

## 13. Performance Targets

| Metric | Target |
|--------|--------|
| End-to-end response time | < 4 seconds (P95) |
| Embedding generation (per article) | < 10 seconds |
| Vector search query | < 200ms |
| Token usage per query | < 3000 tokens (input + output) |

---

## 14. Cost Management

| Strategy | Detail |
|----------|--------|
| Model selection | Use mini/small models by default |
| Chunk limit | Max 5 chunks per query |
| Rate limiting | Prevent abuse |
| Caching | Do not cache LLM responses (content must be fresh) |
| Embedding reuse | Only regenerate on publish/update |
| Monitoring | Track token usage per month via provider dashboard |

---

## 15. Testing Strategy

| Test | Description |
|------|-------------|
| Grounded answer | Ask question with known article → verify citation |
| Refusal | Ask question with no matching content → verify refusal |
| Arabic query | Ask in Arabic → verify Arabic response with Arabic sources |
| English query | Ask in English → verify English response |
| Draft exclusion | Publish draft → verify AI cannot access it |
| Rate limit | Exceed hourly limit → verify 429 response |
| Prompt injection | Send override attempt → verify system ignores it |
| Offline | Disable network → verify offline message |

---

## 16. Future Enhancements (Not Phase 1)

- Hybrid search (vector + full-text)
- Suggested follow-up questions
- Admin content gap report (ungrounded query analysis)
- Voice input (Arabic speech-to-text)
- Multi-turn conversation context (last 3 messages)

These require explicit approval before implementation.

---

## 17. File Structure (When Implemented)

```
supabase/
├── functions/
│   ├── ai-chat/
│   │   └── index.ts
│   └── generate-embeddings/
│       └── index.ts

src/features/assistant/
├── components/
│   ├── AssistantPage.tsx
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── SourceCitation.tsx
│   └── OfflineNotice.tsx
├── hooks/
│   └── useAssistant.ts
├── api/
│   └── assistantApi.ts
├── types/
│   └── assistant.types.ts
└── index.ts
```

---

**Next Step:** Implement AI system only after knowledge base and admin content management are functional. Do not build assistant UI until instructed.

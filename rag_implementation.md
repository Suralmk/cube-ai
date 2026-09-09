# RAG Implementation Guide (Cube AI)

This document describes how the **backend RAG pipeline**, **chat retrieval**, and **citation UI** are implemented in this repo — with file paths, API surfaces, config keys, and data flow.

---

## 1. High-level architecture

```text
┌─────────────┐     upload PDF      ┌──────────────────┐
│  Frontend   │ ──────────────────► │ Documents API    │
│  (Next.js)  │                     │ + StorageService │
└─────────────┘                     └────────┬─────────┘
                                             │ indexInBackground()
                                             ▼
                                    ┌──────────────────┐
                                    │ IndexingService  │
                                    │  PDF → chunk →   │
                                    │  embed → Qdrant  │
                                    └──────────────────┘

┌─────────────┐   SSE stream chat   ┌──────────────────┐
│  Chat page  │ ──────────────────► │ ChatController   │
└─────────────┘                     │ ChatService      │
      ▲                             │  retrieve → LLM  │
      │ citations + [n]             │  persist cites   │
      └─────────────────────────────┴──────────────────┘
```

**Multi-tenancy:** every document, chat message, citation, and Qdrant collection is scoped by `organizationId`. Vector collections are named `documents_{orgId}`.

---

## 2. Configuration

### Source of truth

| File | Role |
| --- | --- |
| [`src/config/configuration.ts`](src/config/configuration.ts) | Maps env vars → Nest `ConfigService` keys |
| [`src/config/validation.schema.ts`](src/config/validation.schema.ts) | Zod validation / defaults |
| [`.env`](.env) / [`.env.example`](.env.example) | Runtime values |

### Env vars used by RAG / chat

| Variable | Config path | Purpose | Default |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | `openrouter.apiKey` | Chat + embeddings auth | — |
| `OPENROUTER_CHAT_MODEL` | `openrouter.chatModel` | Streaming LLM | `nvidia/nemotron-3-ultra-550b-a55b:free` |
| `OPENROUTER_EMBEDDING_MODEL` | `openrouter.embeddingModel` | Embedding model | `nvidia/llama-nemotron-embed-vl-1b-v2:free` |
| `CHAT_HISTORY_LIMIT` | `chat.historyLimit` | Recent turns sent to the model | `5` |
| `RAG_TOP_K` | `rag.topK` | Chunks retrieved per query | `5` |
| `RAG_CHUNK_SIZE` | `rag.chunkSize` | Max chars per chunk | `1000` |
| `RAG_CHUNK_OVERLAP` | `rag.chunkOverlap` | Overlap between chunks | `200` |
| `QDRANT_URL` | `qdrant.url` | Vector DB endpoint | `http://localhost:6333` |
| `QDRANT_API_KEY` | `qdrant.apiKey` | Optional Qdrant auth | — |
| `STORAGE_DRIVER` | `storage.driver` | `local` or `s3` | `local` |
| `STORAGE_LOCAL_DIR` | `storage.localDir` | Local upload root | `./storage` |

Models are **never hardcoded in business logic** beyond fallback defaults in config — services read them from `ConfigService`.

---

## 3. Database schema (Drizzle)

### Documents

**File:** [`src/db/schema/document.schema.ts`](src/db/schema/document.schema.ts)

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `organization_id` | Tenant scope |
| `uploaded_by` | User FK |
| `title`, `filename`, `docuemnt_type` | Metadata |
| `s3_key` | Storage key (local path key in dev; S3-ready name) |
| `status` | Enum: `pending` → `indexing` → `indexed` / `failed` (+ legacy `processing`/`ready`) |
| `page_count`, `chunk_count` | Set after successful index |
| `error_message` | Last indexing failure |

### Chat + citations

**File:** [`src/db/schema/chat.schema.ts`](src/db/schema/chat.schema.ts)

- `chat_session` — per-user/org session with title
- `chat_message` — `role` + `content`
- `citation` — rows linked to an assistant message:

| Column | Purpose |
| --- | --- |
| `message_id` | Assistant message FK (cascade delete) |
| `document_id` | Source document |
| `document_name` | Display name at citation time |
| `page_number` | Cited page |
| `chunk_text` | Retrieved passage |
| `score` | Similarity score |
| `marker` | `[n]` number shown in the UI |

### Migrations

| File | What it added for RAG |
| --- | --- |
| [`drizzle/migrations/0003_wild_cassandra_nova.sql`](drizzle/migrations/0003_wild_cassandra_nova.sql) | Enum values `pending`/`indexing`/`indexed`, document columns, `citation` table |
| [`drizzle/migrations/0004_status_default_pending.sql`](drizzle/migrations/0004_status_default_pending.sql) | Default `document.status = pending` (separate migration so Postgres can commit new enum values first) |

**Apply helper:** [`scripts/apply-migrations.mjs`](scripts/apply-migrations.mjs) via `npm run db:apply` (statement-by-statement; avoids enum+default-in-one-transaction issues).

---

## 4. Nest module layout

### RAG module

**File:** [`src/modules/rag/rag.module.ts`](src/modules/rag/rag.module.ts)

| Provider | File | Responsibility |
| --- | --- | --- |
| `EmbeddingsService` | [`embeddings.service.ts`](src/modules/rag/embeddings.service.ts) | OpenRouter `/embeddings` HTTP client |
| `QdrantService` | [`qdrant.service.ts`](src/modules/rag/qdrant.service.ts) | Per-org collections, upsert, search, delete-by-document |
| `PdfService` | [`pdf.service.ts`](src/modules/rag/pdf.service.ts) | Per-page PDF text extraction (`pdf-parse`) |
| `ChunkingService` | [`chunking.service.ts`](src/modules/rag/chunking.service.ts) | Page-bounded overlapping chunks |
| `IndexingService` | [`indexing.service.ts`](src/modules/rag/indexing.service.ts) | Orchestrates ingest pipeline |
| `RagService` / `RagController` | stub leftovers | Not the primary RAG path (upload/chat own the flow) |

**Exports:** `EmbeddingsService`, `QdrantService`, `IndexingService` (consumed by Documents + Chat modules).

### Related modules

| Module | Path | Role |
| --- | --- | --- |
| Storage | [`src/modules/storage/`](src/modules/storage/) | Local disk `saveFile` / `readFile` / `deleteFile` |
| Documents | [`src/modules/documents/`](src/modules/documents/) | Upload, list, reindex, stream PDF bytes |
| Chat | [`src/modules/chat/`](src/modules/chat/) | Sessions, RAG retrieval, SSE streaming, citations |

---

## 5. Ingestion pipeline (upload → index)

### API

**Controller:** [`src/modules/documents/documents.controller.ts`](src/modules/documents/documents.controller.ts)

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/v1/documents` | Multipart PDF upload (`file`), save to storage, insert row `status=pending`, call `indexing.indexInBackground(id)` |
| `POST` | `/api/v1/documents/:id/reindex` | Re-run indexing for an org-owned document |
| `GET` | `/api/v1/documents/:id/file` | Stream PDF bytes (`application/pdf`) for the viewer |
| `GET` | `/api/v1/documents` | List org documents (includes status / pageCount / chunkCount) |

**Service helpers:** [`src/modules/documents/documents.service.ts`](src/modules/documents/documents.service.ts) — `create`, `findByIdForOrg`, list by org.

**Storage:** [`src/modules/storage/storage.service.ts`](src/modules/storage/storage.service.ts)

- Keys look like: `documents/{organizationId}/{uuid}.pdf`
- Written under `STORAGE_LOCAL_DIR` (default `./storage`)
- Path traversal guarded in `resolveKey()`

### Indexing steps

**File:** [`src/modules/rag/indexing.service.ts`](src/modules/rag/indexing.service.ts)

```text
indexInBackground(documentId)
  → index(documentId)
      1. Load document row
      2. status = indexing
      3. storage.readFile(s3_key)
      4. pdf.extractPages(buffer)          → [{ pageNumber, text }, ...]
      5. chunking.chunkPages(pages)       → [{ pageNumber, text }, ...]
      6. embeddings.embed(texts, 'document')  → vectors (input_type=passage)
      7. qdrant.ensureCollection(orgId, dimension)
      8. qdrant.deleteByDocument(orgId, documentId)   // safe re-index
      9. qdrant.upsert(orgId, points)
     10. status = indexed, pageCount, chunkCount
        on error → status = failed, errorMessage
```

### Per-page extraction

**File:** [`src/modules/rag/pdf.service.ts`](src/modules/rag/pdf.service.ts)

- Uses `pdf-parse` (wraps pdfjs)
- Returns one text blob per page with `pageNumber`
- Empty pages filtered out
- Page joiner disabled so `"-- page x of y --"` does not pollute chunks

### Chunking (page-boundary safe)

**File:** [`src/modules/rag/chunking.service.ts`](src/modules/rag/chunking.service.ts)

- Chunks **within each page only** — a chunk never spans two pages
- Size / overlap from `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP`
- Prefer word-boundary breaks
- Every chunk keeps a single `pageNumber` → citations cannot point at the wrong page

### Embeddings

**File:** [`src/modules/rag/embeddings.service.ts`](src/modules/rag/embeddings.service.ts)

- Direct `POST https://openrouter.ai/api/v1/embeddings` (SDK has no embeddings API)
- Model from `OPENROUTER_EMBEDDING_MODEL`
- Batches of 16
- Semantic types: `'document' | 'query'` mapped to provider values:
  - document → `passage`
  - query → `query`
- Handles OpenRouter quirk: HTTP 200 with `{ error: ... }` body
- If provider rejects `input_type`, retries once **without** it
- Detects vector dimension from first success for Qdrant collection creation

### Qdrant

**File:** [`src/modules/rag/qdrant.service.ts`](src/modules/rag/qdrant.service.ts)

- Dependency-free REST client (`fetch`)
- Collection: `documents_{orgId}`
- Distance: Cosine; size = detected embedding dimension
- Point payload:

```ts
{
  documentId: string;
  documentName: string;
  orgId: string;
  pageNumber: number;
  chunkText: string;
}
```

- Ops: `ensureCollection`, `upsert`, `deleteByDocument`, `search` (optional filter by document IDs)

**Local Qdrant (dev):**

```bash
docker run -d --name cube-qdrant \
  -p 6333:6333 -p 6334:6334 \
  -v cube_qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

---

## 6. Chat + retrieval pipeline

### API

**Controller:** [`src/modules/chat/chat.controller.ts`](src/modules/chat/chat.controller.ts)

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/chat/sessions` | List sessions |
| `POST` | `/api/v1/chat/sessions` | Create session |
| `PATCH` | `/api/v1/chat/sessions/:id` | Rename |
| `DELETE` | `/api/v1/chat/sessions/:id` | Delete |
| `GET` | `/api/v1/chat/sessions/:id/messages` | History **including citations** |
| `POST` | `/api/v1/chat/sessions/:id/messages` | Non-streaming send |
| `POST` | `/api/v1/chat/sessions/:id/messages/stream` | **SSE streaming** (primary UI path) |

### Streaming flow

**Files:**

- [`chat.controller.ts`](src/modules/chat/chat.controller.ts) — SSE headers, keep-alives, delta / done / error events
- [`chat.service.ts`](src/modules/chat/chat.service.ts) — retrieval + prompt + persist
- [`openrouter.service.ts`](src/modules/chat/openrouter.service.ts) — OpenRouter chat stream (`OPENROUTER_CHAT_MODEL`)

```text
POST .../messages/stream
  1. startStreaming()
       - save user message
       - buildPrompt() → retrieve + history
       - openRouter.createChatStream(llmMessages)
  2. SSE: { type: "user_message", message }
  3. SSE keepalive comments every 5s (idle-proxy safety)
  4. for each delta → SSE: { type: "delta", content }
  5. saveAssistantMessage(full, sources) → citation rows
  6. SSE: { type: "done", message }   // message includes citations
```

### Retrieval (`buildPrompt` / `retrieve`)

**File:** [`src/modules/chat/chat.service.ts`](src/modules/chat/chat.service.ts)

1. `embeddings.embedOne(query, 'query')` → query vector  
2. `qdrant.search(orgId, vector, RAG_TOP_K)` across **all** org documents  
3. Map hits → `RetrievedSource[]` with markers `[1]…[k]`  
4. Load last `CHAT_HISTORY_LIMIT` non-empty messages  
5. System prompt = base technician prompt + numbered sources block  
6. If retrieval fails / empty → still chat; instruct model not to invent citations  

Context block shape:

```text
[1] "Manual.pdf" (page 5): <chunk text>
[2] "Manual.pdf" (page 12): <chunk text>
...
```

Model is instructed to cite with `[n]` (and `[1][3]` when multiple sources support a claim).

### Citation persistence

Same service:

- `persistCitations(messageId, orgId, sources)` → insert into `citation`
- `loadCitations(messageIds)` → attached when loading session history
- Empty LLM output → fallback text, **no** citations saved
- Empty assistant history rows are filtered out of the next prompt

### Interceptor notes (SSE)

| File | Behavior |
| --- | --- |
| [`timeout.interceptor.ts`](src/common/interceptors/timeout.interceptor.ts) | Skips global timeout for `/messages/stream` |
| [`transform.interceptor.ts`](src/common/interceptors/transform.interceptor.ts) | Skips `{ data, statusCode }` wrapping for stream routes |

---

## 7. Frontend (RAG-facing)

| File | Role |
| --- | --- |
| [`frontend/lib/api/documents.ts`](frontend/lib/api/documents.ts) | `uploadDocument`, `reindexDocument`, `documentFileUrl`, status types |
| [`frontend/lib/api/chat.ts`](frontend/lib/api/chat.ts) | `Citation` type, `streamChatMessage` SSE parser; streams hit Nest directly in local dev |
| [`frontend/lib/api-client.ts`](frontend/lib/api-client.ts) | `getApiBaseUrl` / `getStreamApiBaseUrl` (SSE bypasses Next rewrite on localhost) |
| [`frontend/app/(dashboard)/documents/page.tsx`](frontend/app/(dashboard)/documents/page.tsx) | Upload UI, status badges, polling, reindex, open PDF |
| [`frontend/app/(dashboard)/chat/page.tsx`](frontend/app/(dashboard)/chat/page.tsx) | Streaming chat, citation click → PDF panel |
| [`frontend/components/markdown.tsx`](frontend/components/markdown.tsx) | Renders `[n]` as clickable citation markers |
| [`frontend/components/pdf-viewer-panel.tsx`](frontend/components/pdf-viewer-panel.tsx) | Half-screen sheet, scrollable pages, page input, zoom; loads `GET /documents/:id/file` |

### Citation UX

1. Assistant text may contain `[1]`, `[2]`, …  
2. Markdown turns those into buttons mapped via `citation.marker`  
3. Click opens `PdfViewerPanel` at `citation.pageNumber`  
4. A “Sources” list under the message lists all citations for that answer  

---

## 8. End-to-end sequences

### A. Upload & index

```text
Browser → POST /api/v1/documents (multipart)
       → StorageService.saveFile
       → document row (pending)
       → IndexingService.indexInBackground
       → PDF parse → chunk → embed → Qdrant upsert
       → document row (indexed | failed)
UI polls GET /api/v1/documents for status
```

### B. Ask a question

```text
Browser → POST /api/v1/chat/sessions/:id/messages/stream
       → embed query → Qdrant top-K
       → system prompt + history
       → OpenRouter stream deltas (SSE)
       → save assistant + citation rows
       → SSE done { message, citations }
UI renders Markdown + [n] markers
Click [n] → GET /documents/:id/file → PDF panel @ page
```

---

## 9. Key design decisions

1. **Page-bounded chunking** — citations always map to one real page.  
2. **Per-org Qdrant collections** — hard tenant isolation.  
3. **Runtime embedding dimension** — no hardcoded vector size.  
4. **Retrieval is best-effort** — chat still works if Qdrant/embeddings fail.  
5. **Local storage in dev** — `s3_key` column reused for local keys; S3 driver can plug in later.  
6. **SSE keep-alives + direct Nest stream URL** — avoids Next.js rewrite idle disconnects during long reasoning models.  
7. **Nvidia `input_type` values** — `passage` / `query`, with fallback omit for other providers.

---

## 10. File index (quick lookup)

### Backend — config & schema

- [`src/config/configuration.ts`](src/config/configuration.ts)
- [`src/config/validation.schema.ts`](src/config/validation.schema.ts)
- [`src/db/schema/document.schema.ts`](src/db/schema/document.schema.ts)
- [`src/db/schema/chat.schema.ts`](src/db/schema/chat.schema.ts)
- [`drizzle/migrations/0003_wild_cassandra_nova.sql`](drizzle/migrations/0003_wild_cassandra_nova.sql)
- [`drizzle/migrations/0004_status_default_pending.sql`](drizzle/migrations/0004_status_default_pending.sql)
- [`scripts/apply-migrations.mjs`](scripts/apply-migrations.mjs)

### Backend — RAG

- [`src/modules/rag/rag.module.ts`](src/modules/rag/rag.module.ts)
- [`src/modules/rag/embeddings.service.ts`](src/modules/rag/embeddings.service.ts)
- [`src/modules/rag/qdrant.service.ts`](src/modules/rag/qdrant.service.ts)
- [`src/modules/rag/pdf.service.ts`](src/modules/rag/pdf.service.ts)
- [`src/modules/rag/chunking.service.ts`](src/modules/rag/chunking.service.ts)
- [`src/modules/rag/indexing.service.ts`](src/modules/rag/indexing.service.ts)

### Backend — documents / storage / chat

- [`src/modules/storage/storage.service.ts`](src/modules/storage/storage.service.ts)
- [`src/modules/documents/documents.controller.ts`](src/modules/documents/documents.controller.ts)
- [`src/modules/documents/documents.service.ts`](src/modules/documents/documents.service.ts)
- [`src/modules/chat/chat.controller.ts`](src/modules/chat/chat.controller.ts)
- [`src/modules/chat/chat.service.ts`](src/modules/chat/chat.service.ts)
- [`src/modules/chat/openrouter.service.ts`](src/modules/chat/openrouter.service.ts)
- [`src/modules/chat/dto/chat.dto.ts`](src/modules/chat/dto/chat.dto.ts)

### Frontend

- [`frontend/lib/api/documents.ts`](frontend/lib/api/documents.ts)
- [`frontend/lib/api/chat.ts`](frontend/lib/api/chat.ts)
- [`frontend/lib/api-client.ts`](frontend/lib/api-client.ts)
- [`frontend/app/(dashboard)/documents/page.tsx`](frontend/app/(dashboard)/documents/page.tsx)
- [`frontend/app/(dashboard)/chat/page.tsx`](frontend/app/(dashboard)/chat/page.tsx)
- [`frontend/components/markdown.tsx`](frontend/components/markdown.tsx)
- [`frontend/components/pdf-viewer-panel.tsx`](frontend/components/pdf-viewer-panel.tsx)

### Product docs

- [`README.md`](README.md) — shorter product-facing summary of the same flows

---

## 11. Deliberately not implemented

Same scope as README:

- TTS / spoken answers  
- Escalation / feedback flagging  
- Offline caching  
- Manual versioning & change alerts  

---

*Generated from the Cube AI codebase as of the RAG chat feature implementation.*

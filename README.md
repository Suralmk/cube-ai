<p align="center">
  <img src="assets/logo.png" alt="Cube AI logo" width="200" />
</p>

<h1 align="center">Cube AI</h1>

<p align="center"><strong>AI-powered maintenance documentation platform</strong> for field-service companies.</p>

Cube AI is a multi-tenant SaaS platform where HVAC, elevator, solar, fire safety, generator, and similar maintenance companies upload equipment manuals and service bulletins once — then technicians and clients chat with that knowledge base to get fast, accurate, **source-cited** answers instead of searching hundreds of PDF pages in the field.

Every company operates in a **fully isolated organization**. Documents, chat history, and vector indexes are scoped per tenant (each org has its own Qdrant collection).

## What's implemented

- **Organization-based multi-tenancy** — documents, chat, and vectors are scoped per organization
- **Document upload & indexing** — upload a PDF, it is stored and indexed in the background with live status (`pending` → `indexing` → `indexed` / `failed`)
- **Retrieval-augmented chat** — questions are answered from the organization's indexed documents, retrieved across *all* of that org's documents by default
- **Chat history context** — the last `CHAT_HISTORY_LIMIT` messages of the session are sent to the model for continuity
- **Persisted citations** — every answer grounded in a retrieved passage carries `[n]` citations referencing document + page; citations are stored in the DB so they re-render in history
- **In-app PDF viewer** — clicking a citation opens the source PDF in a side panel (embedded `react-pdf` renderer) and jumps to the cited page
- **Streaming responses** — assistant replies stream token-by-token over SSE and render as Markdown

## Ingestion flow (on upload)

```text
Upload PDF → store file → status: pending
          → extract text per page (pdf-parse)
          → chunk each page independently (RAG_CHUNK_SIZE / RAG_CHUNK_OVERLAP)
          → embed chunks (OpenRouter, OPENROUTER_EMBEDDING_MODEL, input_type=passage)
          → upsert vectors into the org's Qdrant collection  → status: indexed / failed
```

- Text is extracted **per page**, and chunking is done **within each page**, so every chunk records exactly one page number — a citation can never point at the wrong page.
- Each vector is stored in the collection `documents_{orgId}` with payload `{ documentId, documentName, orgId, pageNumber, chunkText }`.
- The Qdrant collection is created lazily using the embedding dimension **detected at runtime** (nothing is hardcoded).
- Indexing runs as a background task kicked off by the upload request; the document `status` column drives the UI progress indicator.

Relevant code: [`src/modules/rag`](src/modules/rag) (`embeddings.service.ts`, `qdrant.service.ts`, `pdf.service.ts`, `chunking.service.ts`, `indexing.service.ts`), storage in [`src/modules/storage/storage.service.ts`](src/modules/storage/storage.service.ts), upload/serve endpoints in [`src/modules/documents`](src/modules/documents).

## Chat & retrieval flow

```text
User query → embed (OpenRouter, input_type=query)
          → Qdrant similarity search (top RAG_TOP_K) across the org collection
          → build numbered context block + last CHAT_HISTORY_LIMIT turns
          → OpenRouter chat model (OPENROUTER_CHAT_MODEL), streamed via SSE
          → persist assistant message + citations
```

- Retrieval is best-effort: if the vector store is unavailable or no passages match, the chat still answers (and is told to make clear the answer is not grounded in the org's documents).
- Retrieved passages are injected into the system prompt as `[1] "Doc" (page X): …`, and the model is instructed to cite with `[n]` markers, citing **all** documents that support a claim.

Relevant code: [`src/modules/chat/chat.service.ts`](src/modules/chat/chat.service.ts) and [`src/modules/chat/chat.controller.ts`](src/modules/chat/chat.controller.ts).

## Citation flow

1. The chunks retrieved for an answer become `citation` rows linked to the assistant message (`documentId`, `documentName`, `pageNumber`, `chunkText`, `score`, `marker`).
2. Citations are returned both when loading history and in the SSE `done` event.
3. The frontend renders `[n]` as clickable inline markers (see [`frontend/components/markdown.tsx`](frontend/components/markdown.tsx)) plus a "Sources" list under each answer.
4. Clicking a citation opens [`frontend/components/pdf-viewer-panel.tsx`](frontend/components/pdf-viewer-panel.tsx) — a side panel that fetches the PDF from `GET /documents/:id/file` and navigates to the cited page.

## Configuration

Models are **not** hardcoded — they come from the environment.

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter key (chat + embeddings) | — |
| `OPENROUTER_CHAT_MODEL` | Chat/generation model | `nvidia/nemotron-3-ultra-550b-a55b:free` |
| `OPENROUTER_EMBEDDING_MODEL` | Embedding model (called via OpenRouter's `/embeddings` endpoint) | `nvidia/llama-nemotron-embed-vl-1b-v2:free` |
| `CHAT_HISTORY_LIMIT` | Number of recent messages sent to the model as context | `5` |
| `RAG_TOP_K` | Chunks retrieved per query | `5` |
| `RAG_CHUNK_SIZE` | Max characters per chunk | `1000` |
| `RAG_CHUNK_OVERLAP` | Character overlap between chunks | `200` |
| `QDRANT_URL` | Qdrant endpoint | `http://localhost:6333` |
| `QDRANT_API_KEY` | Qdrant API key (optional) | — |
| `STORAGE_DRIVER` | Storage backend (`local` for dev) | `local` |
| `STORAGE_LOCAL_DIR` | Directory for uploaded files (local driver) | `./storage` |

> Embeddings are generated by calling OpenRouter's `POST /api/v1/embeddings` HTTP endpoint directly (the OpenRouter SDK does not expose embeddings). `input_type=passage` is used at index time and `query` at query time (the values expected by the configured Nvidia embedding model); if a provider rejects those values the request is transparently retried without `input_type`.

## Not yet implemented (deliberately deferred)

These were intentionally scoped out of the current pass — they are not bugs or oversights:

- **TTS / spoken answers** — no audio playback of responses.
- **Escalation / feedback flagging** — no flagging of uncertain answers for human expert review.
- **Offline caching** — manuals and sessions are not cached for offline / poor-connectivity use.
- **Manual versioning & change alerts** — no version tracking of revised manuals or notifications when documentation changes.

## Tech stack

- [NestJS](https://nestjs.com/) — API and backend services
- [Better Auth](https://www.better-auth.com/) — authentication and sessions
- [Drizzle ORM](https://orm.drizzle.team/) — PostgreSQL
- [Qdrant](https://qdrant.tech/) — vector search (one collection per org)
- Local disk storage in dev (S3-ready via the `s3_key` field and a pluggable storage driver)
- [OpenRouter](https://openrouter.ai/) — chat completions and embeddings
- [Next.js](https://nextjs.org/) + [react-pdf](https://github.com/wojtekmaj/react-pdf) — frontend and embedded PDF viewer
- TypeScript · pnpm

## Project setup

```bash
# backend
npm install

# frontend
cd frontend && pnpm install
```

You also need Postgres and Qdrant running locally (see `QDRANT_URL` / `DATABASE_URL`).

## Development

```bash
# backend (watch)
npm run start:dev

# frontend
cd frontend && pnpm run dev
```

## Database migrations

```bash
npm run db:generate   # generate a migration from the Drizzle schema
npm run db:migrate    # apply migrations (drizzle-kit)
npm run db:apply      # apply pending migrations statement-by-statement
```

> Use `db:apply` when a migration both adds Postgres enum values and uses them
> (e.g. changing a column default to a new value). `drizzle-kit migrate` wraps
> all pending migrations in a single transaction, which Postgres rejects for
> that case; `db:apply` runs each statement in its own transaction.

## Testing

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## License

UNLICENSED — private project.

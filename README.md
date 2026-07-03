<p align="center">
  <img src="assets/logo.png" alt="Cube AI logo" width="200" />
</p>

<h1 align="center">Cube AI</h1>

<p align="center"><strong>AI-powered maintenance documentation platform</strong> for field-service companies.</p>

Cube AI is a multi-tenant SaaS platform where HVAC, elevator, solar, fire safety, generator, and similar maintenance companies upload equipment manuals and service bulletins once — then technicians and clients chat with that knowledge base to get fast, accurate, **source-cited** answers instead of searching hundreds of PDF pages in the field.

Every company operates in a **fully isolated organization**. Documents, chat history, and vector indexes are never visible to other tenants.

## What the platform does

- **Organization-based multi-tenancy** — strict data isolation per company at the database and vector-search layer
- **Document upload & management** — PDFs and service docs parsed, chunked, indexed; status tracking (processing, ready, failed)
- **Document chat** — natural-language Q&A grounded in uploaded manuals with citations to document and page
- **Chat sessions & history** — conversations organized by job, equipment issue, or visit
- **Asset/model scoping** — tag docs by manufacturer, model, or equipment type; narrow chat to a specific asset
- **Structured spec extraction** — part numbers, torque values, safety warnings, maintenance intervals surfaced as quick reference
- **Role-based access** — clients see summaries; technicians see full technical and safety-critical detail
- **Multi-language answers** — respond in the user's language regardless of manual language
- **Audio answers (TTS)** — optional spoken playback for hands-busy field work
- **Manual versioning** — track revised manuals and alert staff when documentation changes
- **Audit trail** — every question, answer, and citation logged for compliance
- **Escalation & feedback** — flag uncertain answers for human expert review
- **Offline-friendly access** — cache recently accessed manuals and sessions for poor-connectivity sites

## How it works

```text
Upload → Parse & index (per org) → Ask question → Retrieve org-scoped chunks → Grounded cited answer → Log & deliver
```

1. A company uploads a manual → stored in S3, processed in the background, indexed into their org knowledge base.
2. A user asks a question → the system searches **only that organization's** documents (optionally scoped to an asset).
3. Relevant manual sections are used to generate a precise answer with **citations** — not generic AI knowledge.
4. The answer is returned in chat, optionally translated or read aloud, and logged for audit.

## Tech stack

- [NestJS](https://nestjs.com/) — API and backend services
- [Better Auth](https://www.better-auth.com/) — authentication and sessions
- [Drizzle ORM](https://orm.drizzle.team/) — PostgreSQL
- [Qdrant](https://qdrant.tech/) — vector search (org-filtered)
- AWS S3 — document storage
- OpenRouter — LLM and embeddings
- TypeScript · pnpm

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for the full backend implementation guide.

## Project setup

```bash
pnpm install
```

## Development

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode
pnpm run start:prod
```

## Database migrations

```bash
pnpm db:generate
pnpm db:migrate
```

## Testing

```bash
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```

## Linting & formatting

```bash
pnpm run lint
pnpm run format
```

## License

UNLICENSED — private project.

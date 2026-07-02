<p align="center">
  <img src="assets/logo.png" alt="Cube AI logo" width="200" />
</p>

<h1 align="center">Cube AI</h1>

<p align="center"><strong>AI UGC Studio</strong> — an automation platform for TikTok, Instagram Reels, and YouTube Shorts.</p>
Cube AI helps creators and businesses turn product knowledge into short-form video content at scale. Upload brand assets, generate on-brand scripts and metadata, and run scheduled content workflows from a single backend.

## What the platform does

Creators and businesses can:

- **Upload product knowledge** — PDFs, websites, product sheets, and brand documents
- **Build a RAG knowledge base** — ingest and index content for context-aware generation
- **Generate UGC video scripts** — tailored for TikTok, Instagram Reels, and YouTube Shorts
- **Generate supporting copy** — captions, hooks, hashtags, and CTAs
- **Create variations automatically** — multiple script and copy variants per product or campaign
- **Schedule workflows** — automate content generation on a recurring or planned basis
- **Track usage and performance** — credits, usage metrics, and analytics

## Core capabilities

| Area | Description |
|------|-------------|
| Knowledge ingestion | Upload and parse product info, PDFs, URLs, and brand docs |
| RAG pipeline | Retrieve relevant context when generating scripts and copy |
| Script generation | Platform-specific UGC scripts for short-form video |
| Copy generation | Hooks, captions, hashtags, and calls-to-action |
| Variations | Batch generation of multiple creative angles |
| Scheduling | Workflow automation for recurring content production |
| Analytics | Usage, credits, and content performance tracking |

## Tech stack

- [NestJS](https://nestjs.com/) — API and backend services
- [Better Auth](https://www.better-auth.com/) — authentication and session management
- TypeScript
- pnpm

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

## Testing

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## Linting & formatting

```bash
pnpm run lint
pnpm run format
```

## License

UNLICENSED — private project.

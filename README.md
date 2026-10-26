# Enterprise Research Agent

A structured, evidence-traced research agent. You ask a business or technology question. It plans sub-questions, searches the web, indexes what it finds, extracts findings grounded only in retrieved evidence, flags contradictions, and writes a cited report where every claim links back to a real source.

It is not a chat wrapper. Each stage is its own module with a defined input and output, and the pipeline runs in a separate worker process.

## How it works

```
Question → Planner → Search → Source collection → Chunk + embed (pgvector)
        → Retrieve evidence → Extract findings → Detect contradictions → Report
```

| Stage | What it does |
|---|---|
| Planner | Breaks the question into 3-6 self-contained sub-questions, returned as schema-validated JSON. |
| Search | Tavily web search, 5 results per sub-question. Only real search results become sources. |
| Chunk + embed | Result text is split into ~500-character chunks and embedded locally with all-MiniLM-L6-v2 (384 dimensions). Vectors are stored in Postgres with pgvector. |
| Retrieval | Top 8 chunks per sub-question by cosine distance. Chunks beyond a relevance cutoff are discarded, so a question with no relevant evidence yields no findings instead of a stretched one. |
| Findings | The model sees numbered excerpts and cites them by number. Citations are resolved against the chunks actually retrieved, and a finding with no valid citation is dropped. |
| Contradictions | One batch pass over all findings in a project, reporting pairs that cannot both be true. |
| Report | Executive summary, methodology, trends, business implications, risks and conclusions. Each statement cites finding numbers, which are resolved to real finding IDs before saving. |

**Traceability:** Conclusion → Finding → Evidence → Chunk → Source → URL. Findings, evidence, chunks and sources are linked by foreign keys, so evidence pointing at a nonexistent source cannot be stored. The report's per-statement finding references are stored as JSON and validated in code, not by a foreign key.

**Model access:** the LLM sits behind an `AIProvider` interface. Groq (`openai/gpt-oss-20b`, strict JSON-schema output, 3 attempts per call) is the only implementation so far.

**Job queue:** the web app inserts a `Job` row. The worker claims jobs with `SELECT ... FOR UPDATE SKIP LOCKED`. A job with no progress for 10 minutes is marked failed.

**Privacy:** every project belongs to a user. Project pages and the status endpoint return 404 for anyone else.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Better Auth (email and password), Prisma 6.19, Zod 4
- PostgreSQL 16 with pgvector (Docker)
- Groq for the LLM, Tavily for search, `@huggingface/transformers` for local embeddings

Prisma is pinned to 6.19 on purpose. Newer major versions were pre-release when this was built.

## Project layout

```
apps/web/              Next.js app: UI, auth, API routes. Owns Prisma migrations.
worker/                Worker process: queue polling and every research stage.
  src/index.ts           poll loop, stage orchestration, stale-job reaper
  src/lib/ai/            AIProvider interface and Groq implementation
  src/lib/pipeline/      planner, search, chunker, embeddings, retrieval,
                         findingExtractor, contradictionDetector, reportGenerator
docker-compose.yml     Postgres 16 + pgvector, migrations, web app, worker
apps/web/Dockerfile    web image
worker/Dockerfile      worker image (embedding model baked in)
```

## Setup

**Prerequisites:** Docker Desktop, a free [Groq](https://console.groq.com) API key, and a free [Tavily](https://app.tavily.com) API key. Free-tier rate limits apply. Node.js 22 or newer is only needed for local development.

**1. Create env files** from the examples:

```
# macOS / Linux
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp worker/.env.example worker/.env

# Windows PowerShell
Copy-Item .env.example .env
Copy-Item apps\web\.env.example apps\web\.env
Copy-Item worker\.env.example worker\.env
```

| File | Values to set |
|---|---|
| `.env` | Postgres user, password and database name. The defaults work for local dev. |
| `apps/web/.env` | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| `worker/.env` | `DATABASE_URL`, `GROQ_API_KEY`, `TAVILY_API_KEY` |

Generate the auth secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. Run the whole stack with Docker**

```
docker compose up -d --build
```

This starts Postgres, a one-shot `migrate` service that applies the database migrations and exits, the web app on http://localhost:3000, and the worker. The first build downloads base images and the ~90 MB embedding model, so it can take a while. Later builds reuse cached layers.

Check it with `docker compose ps -a`: `migrate` should show `Exited (0)`, and `web`, `worker` and `postgres` should be `Up`. Follow the worker with `docker compose logs -f worker`.

Open http://localhost:3000, create an account, and click **New research**.

Stop everything with `docker compose down`. Never add `-v` unless you want to delete the database.

Inside the containers, Compose overrides `DATABASE_URL` to point at the `postgres` service. The `localhost:5433` value in the env files is used by the Prisma CLI and local development on your machine.

**Local development (web app and worker outside Docker)**

Start only the database:

```
docker compose up -d postgres
```

Web app (terminal 1):

```
cd apps/web
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Worker (terminal 2):

```
cd worker
npm install
npx prisma generate
npm start
```

Don't run both modes at once. The web container and `npm run dev` both use port 3000, and two workers would compete for the same job queue.

## Working on the schema

`apps/web` owns migrations. The worker keeps its own copy of `schema.prisma` and only runs `prisma generate`. After a schema change:

1. In `apps/web`: `npx prisma migrate dev --name <change>`
2. Copy `apps/web/prisma/schema.prisma` over `worker/prisma/schema.prisma`
3. In `worker`: `npx prisma generate`, then restart the worker

## Troubleshooting

- **"Password authentication failed" for Postgres.** Postgres reads `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` only when it first initializes an empty volume. Changing them later has no effect. To reset (this deletes all data): `docker compose down -v`, confirm with `docker volume ls` that `enterprise-research-ai-agent_pgdata` is gone, then `docker compose up -d`.
- **A project sits at PENDING with 0 sources.** The worker is not running.
- **A project shows FAILED with an "abandoned" message.** The worker stopped mid-run. Interrupted jobs are failed rather than resumed, because restarting would duplicate already-created rows. Submit the question again.
- **Inspecting data.** The `check-*.sql` files are read-only queries. In PowerShell: `Get-Content check-worker-run.sql | docker exec -i research-postgres psql -U research_admin -d research_agent`

## Known limitations

- Evidence comes from the text Tavily returns for each result, not from full-page scraping, so it is only as deep as that text. Evidence rows reference whole chunks, not precise character spans.
- There is no agreement-detection stage. Only contradictions are surfaced, and the report says so.
- Finding categories are free-form strings, not a fixed set.
- The schema file is duplicated between `apps/web` and `worker`. npm workspaces would remove that.
- Auth is email and password only: no email verification, password reset, or rate limiting.
- Not deployed publicly. The full stack runs locally with Docker Compose.

- **Docker build fails with a DNS or "failed to resolve source metadata" error.** Docker could not reach the image registry. Check your connection, restart Docker Desktop, and retry.

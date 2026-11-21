# docs-qa-copilot

Next.js app that answers questions about policy and benefits PDFs with page-level citations (pgvector retrieval + Claude native citations), plus an evaluation page that shows every failure.

## Commands
- Setup: `npm ci` (Node 24, see `.nvmrc`), `docker compose up -d db` (pgvector on host port 5433)
- Env: `.env.local` with `DATABASE_URL=postgres://rag:rag@localhost:5433/rag`; `ANTHROPIC_API_KEY` only for eval
- DB: `npm run migrate`, then `npm run ingest:corpus`
- Run: `npm run dev`
- Check: `npm run typecheck`, `npm test`, `npm run build` (CI also runs `npm run migrate` against a pgvector service)
- Eval: `npm run eval -- --split dev` (real API calls, about $0.03 per question)

## Map
| Path | What lives there |
|---|---|
| `app/` | pages; `app/api/ask`, `app/api/documents`, `app/api/cron/purge`; `app/eval/` results page |
| `lib/` | core logic with colocated `*.test.ts` (node:test): pdf, chunk, embed, retrieve, answer, score, rate-limit, purge |
| `scripts/` | migrate, ingest-corpus, eval harness |
| `db/schema.sql` | the only schema; raw SQL, no ORM |
| `eval/` | `questions.json` (dev + held-out), `results/latest.json`, `tuning.md` experiment log |

## Non-obvious facts
- The app never reads `ANTHROPIC_API_KEY`. Each visitor pastes their own key; it stays in the browser tab and is sent with each question. Do not set it on Vercel or add a server-side key path. Only `npm run eval` and the real-answer test read it from `.env.local`.
- Held-out questions are for one final run after tuning is frozen: `--split heldout|all` is refused without `--final`. Never tune on held-out results.
- The eval harness calls the same `answerQuestion` (`lib/answer.ts`) as `app/api/ask`; keep it that way so eval numbers describe what ships.
- Each retrieved chunk is its own citation document and chunks never cross a page, so a citation maps to exactly one page. Chunking changes must preserve this.
- Plain vector search beat hybrid full-text on dev; read `eval/tuning.md` before retrying an idea already tested there.
- Embeddings (`bge-small-en-v1.5`) run in the Node process via ONNX: no key or per-call cost, ~57 MB of bundle, model download on cold start.
- Uploads are private to an anonymous cookie, hidden after 24 h and deleted by the daily `/api/cron/purge` (`vercel.json`, needs `CRON_SECRET`). Document text is untrusted input.
- DB tests skip when `DATABASE_URL` is unset.
- Known weakness: multi-column tables lose their columns on extraction; scanned PDFs are rejected (no OCR).
- Deploy: set only `DATABASE_URL` and `CRON_SECRET` (production); the production DB needs pgvector 0.8 or later.

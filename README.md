# Lamma — AI Lesson Generator

A teacher types a subject and grade; an AI pipeline generates a clickable slide
deck of **pedagogical moves** (hook, concept, check-for-understanding,
exit-ticket, video); the teacher fixes what the AI got wrong — including
regenerating a single slide as a *different* move — before using it.

Built as the Fullstack Engineer home assignment for Lamma. The reasoning behind
every choice is in [`docs/DECISIONS.md`](docs/DECISIONS.md); the consolidated
design is in [`docs/superpowers/specs/`](docs/superpowers/specs/).

## What it does

- **One thin input** — subject + grade. The AI infers the lesson structure.
- **Outline-then-fill pipeline** — one call plans the moves, one call per slide
  fills the content (in parallel), each constrained to that slide type's schema.
- **Tier-2 editor** — edit slide text, delete/reorder, and **regenerate a
  single slide** (optionally as a different pedagogical move).
- **Runs without a key** — with no `ANTHROPIC_API_KEY`, the app serves a
  pre-generated demo deck, so a reviewer can run it and the live demo can't be
  sunk by API latency.

## Stack

Python + FastAPI backend, React + Vite + TypeScript frontend, Anthropic Claude
for generation (via structured outputs, so slide JSON is schema-valid).

## Run it locally

You need Python 3.10+ and Node 18+.

### 1. Backend (port 8000)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env      # then paste your key into .env (optional — see below)
uvicorn app.main:app --reload
```

Without a key in `.env`, the backend serves `backend/fallback_deck.json` instead
of calling Claude — everything still works, you just get the demo deck.

### 2. Frontend (port 5273)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5273. The Vite dev server proxies `/api/*` to the backend.

## Where things live

```
backend/app/
  models.py     Pydantic slide types + the "plugin" registry (CONTENT_MODELS)
  pipeline.py   outline-then-fill, per-slide retry + placeholder, fallback deck
  main.py       FastAPI routes: /api/generate, /api/regenerate, /api/health
backend/fallback_deck.json   the demo deck / no-key fallback

frontend/src/
  App.tsx              state + orchestration
  api.ts               fetch wrappers
  components/
    PromptBox.tsx      subject + grade input
    Deck.tsx           click-through viewer + Tier-2 controls
    Slide.tsx          renders a slide BY TYPE (the plugin renderer)
```

A slide type is a *plugin*: one entry in `CONTENT_MODELS` (backend schema) plus
one `case` in `Slide.tsx` (frontend renderer). That pair is the whole boundary.

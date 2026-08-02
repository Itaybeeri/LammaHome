# Lamma — AI Lesson Generator

A K-12 teacher types a **subject and grade**; an AI pipeline generates a
clickable slide deck of **pedagogical moves** (hook, concept,
check-for-understanding, exit-ticket, video); the teacher fixes what the AI got
wrong — including **regenerating a single slide as a _different_ move** — before
using it in class.

Built as the Fullstack Engineer home assignment for [Lamma](https://lamma-ed.com).
It is deliberately small: the app is *evidence* of how a vague brief gets carved
into a defensible product, not a production system. The reasoning behind every
choice is logged in [`docs/DECISIONS.md`](docs/DECISIONS.md), consolidated in
[the design spec](docs/superpowers/specs/2026-07-17-ai-presentation-generator-design.md).

---

## What it does

- **One thin input** — subject + grade. The AI infers the rest of the lesson
  (which moves, how many, in what order).
- **Outline-then-fill pipeline** — one call plans the moves; one call per slide
  fills the content, in parallel, each constrained to that slide type's schema.
- **Color-coded by move** — every pedagogical move has its own color and emoji,
  so the deck is cheerful *and* the slide-type model is legible at a glance.
- **Tier-2 editing** — edit slide text, delete / reorder, and **regenerate a
  single slide** (optionally as a different move).
- **Runs without a key** — with no `ANTHROPIC_API_KEY`, the app serves a
  pre-generated demo deck, so a reviewer can run it immediately and a live demo
  can't be sunk by API latency.

## Tech stack

| Layer     | Choice                                    | Why (short)                                             |
| --------- | ----------------------------------------- | ------------------------------------------------------- |
| Backend   | Python + **FastAPI**                      | Matches Lamma's stack; async fits a fan-out AI pipeline |
| Frontend  | **React** + Vite + TypeScript             | Matches Lamma's stack; fast dev loop                    |
| AI        | **Anthropic Claude** (`claude-haiku-4-5`) | Structured outputs → schema-valid slide JSON, no parsing |

Full rationale (including why *not* a single-language stack): `docs/DECISIONS.md` D-007.

---

## Architecture

```
Teacher types { subject, grade }  (React PromptBox)
        │  POST /api/generate
        ▼
 ┌──────────────────────────────────────────────────────────┐
 │ FastAPI backend                                          │
 │                                                          │
 │  Stage 1 — OUTLINE   one Claude call → ordered moves     │
 │                      + a one-line intent each            │
 │        │                                                 │
 │        ▼                                                 │
 │  Stage 2 — FILL      one call PER slide, async/parallel, │
 │                      schema-constrained to the slide     │
 │                      type; validate → retry once →       │
 │                      placeholder on failure              │
 └──────────────────────────────────────────────────────────┘
        │  Deck (list of typed slides)
        ▼
 React renders each slide BY TYPE  (Slide.tsx — the "plugin" renderer)
        │
        ▼
 Teacher edits / reorders / deletes / regenerates a slide
   └─ regenerate (optionally as a different move) → POST /api/regenerate
```

The generation strategy (outline-then-fill), failure handling (retry → placeholder),
and the "slide = pedagogical move" model are the load-bearing decisions — see
`docs/DECISIONS.md` D-004, D-008, D-010.

---

## Run it locally

You need **Python 3.10+** and **Node 18+**.

### Quick start (one command)

From the repo root:

```bash
./run.ps1     # Windows (PowerShell)
./run.sh      # macOS / Linux
```

The script sets up the Python venv and installs deps on first run, then starts
the backend (port **8123**) and frontend (port **5273**) together. Ctrl+C stops
both. Open **http://localhost:5273**.

> **Windows:** if PowerShell refuses to run the script (execution policy, or the
> "downloaded file" block you get from a ZIP rather than a `git clone`), use:
> ```
> powershell -ExecutionPolicy Bypass -File run.ps1
> ```

> **Re-running after a `git pull`:** the scripts install dependencies only when
> `backend/.venv` / `frontend/node_modules` are *missing*, so they won't pick up
> a changed `requirements.txt` or `package.json` on their own. If the app fails
> to start after pulling, refresh deps by hand:
> ```
> backend/.venv/Scripts/python -m pip install -r backend/requirements.txt   # Windows
> backend/.venv/bin/python     -m pip install -r backend/requirements.txt   # macOS / Linux
> cd frontend && npm install
> ```

**API key:** if no Anthropic key is found, the script prompts you to paste one
and saves it to `backend/.env`. Press Enter to skip — the app then runs in
**offline demo mode** (the pre-generated deck only; "Real AI" is disabled). You
can add or change the key in `backend/.env` anytime. The manual steps below do
the same by hand.

### Manual — backend (port 8123)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate     macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # optional — add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8123
```

### Manual — frontend (port 5273)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend, so the browser talks to one
origin.

---

## Project structure

```
backend/          FastAPI service + AI pipeline   → backend/README.md
frontend/         React app                       → frontend/README.md
docs/
  architecture.html  rendered architecture + decisions overview (open in a browser)
  DECISIONS.md    every choice: chose X over Y because Z (seeds the slide deck)
  superpowers/specs/…  the consolidated design spec
run.ps1 / run.sh  start both servers with one command
```

Each subproject has its own README with a file-by-file tour:
[`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md).

**A slide type is a "plugin":** one entry in `backend/app/models.py`
(`CONTENT_MODELS` — the schema + fill prompt) plus one `case` in
`frontend/src/components/Slide.tsx` (the renderer). That pair is the entire
boundary — adding a new move (e.g. a generated-video slide) touches nothing else.

---

## What works / what doesn't

**Works:** end-to-end generation, the outline-then-fill pipeline, per-slide
regenerate (including as a different move), Tier-2 text edit / delete / reorder,
graceful failure (a failed slide becomes a regeneratable placeholder), and the
no-key fallback deck.

**Deliberately not built (documented as cuts):**

- **Full canvas editing** (Tier 3) — the editor's job is teacher *accountability*,
  not rebuilding Google Slides (D-006).
- **AI-generated video** — video slides ship *embedded*; the video slot is a
  plugin whose generator is swappable (D-002 / §4.3). Live-generated video slides
  show a placeholder with the search query; only the curated demo deck embeds a
  real clip (the model isn't trusted to invent URLs).
- **Persistence** — decks live in memory / client state; not required here.
- **Deployment** — ships local-only *on purpose* (D-011): the brief asks for a
  local run and doesn't grade production polish, and a live cloud+API demo is more
  fragile than driving locally against the fallback deck. With more time:
  containerize, rate-limited pipeline API on ECS/Lambda, key server-side, cache decks.

---

## Deliverables

- **This repo** — accessible to Itay and Yoav, with this README.
- **Slide deck** — seeded by `docs/DECISIONS.md` and the design spec
  (architecture, key decisions, what works/doesn't, how I worked with AI, what
  I'd do with more time).

Contact: itay@lamma-ed.com · yoav@lamma-ed.com

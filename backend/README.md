# Backend — FastAPI service + AI pipeline

The Python half: it turns `{ subject, grade }` into a deck of pedagogical-move
slides, and regenerates individual slides on request. See the
[root README](../README.md) for the big picture; this file is a tour of the
folder for the code walkthrough.

## Files

```
app/
  models.py     Pydantic slide types + the "plugin" registry (CONTENT_MODELS)
  pipeline.py   the AI pipeline: outline → fill → retry → placeholder; fallback deck
  main.py       FastAPI app + routes
fallback_deck.json   the demo deck; also served whenever there is no API key
requirements.txt
.env.example    copy to .env and add ANTHROPIC_API_KEY (optional)
```

Each module has one job:

- **`models.py`** — the domain. `CONTENT_MODELS` maps each slide `type` to the
  Pydantic schema the AI must fill for it. This is the backend half of the
  slide-type plugin; adding a move = adding one entry here.
- **`pipeline.py`** — all Claude calls and orchestration live here. One `_generate`
  helper does schema-constrained generation via `messages.parse` (structured
  outputs), so results are validated for us. No separate client module — it's
  small enough to keep together.
- **`main.py`** — a thin HTTP layer: three routes, CORS for the dev server, and
  `load_dotenv()` before the pipeline reads the key.

## Run it standalone

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate     macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # optional — no key = fallback deck
uvicorn app.main:app --reload --port 8123
```

Serves on **http://localhost:8123**. Interactive API docs at
`http://localhost:8123/docs` (FastAPI/Swagger, free).

## API

| Method | Path             | Body                                   | Returns          |
| ------ | ---------------- | -------------------------------------- | ---------------- |
| GET    | `/api/health`    | —                                      | `{ live_api }`   |
| POST   | `/api/generate`  | `{ subject, grade }`                   | `Deck`           |
| POST   | `/api/regenerate`| `{ subject, grade, slide, target_type? }` | `Slide`       |

`target_type` is what powers "regenerate as a different pedagogical move": it's
the same fill step with a different target type. Text edits, delete, and reorder
are client-side deck-state operations (Tier 2) and need no endpoint.

## How the pipeline works

1. **Outline** (`generate_outline`) — one call returns an ordered list of moves
   with a one-line intent each. If it fails, a safe minimal outline is used so a
   single bad call doesn't sink the whole request.
2. **Fill** (`fill_slide`) — for each planned slide, one call fills *that type's*
   schema, using the outline as context. Validate → retry once → on final
   failure, keep the slot and return a `status="failed"` placeholder the teacher
   can regenerate (decision D-010).
3. Slides are filled **in parallel** (`asyncio.gather`) — FastAPI is async, so a
   6-slide deck costs roughly one fill, not six.

If `ANTHROPIC_API_KEY` is unset, every entry point serves `fallback_deck.json`
instead — the app runs with no key, and the live demo has a guaranteed deck.

## Adding a new slide type

1. Add a `…Content` Pydantic model in `models.py` and register it in
   `CONTENT_MODELS`, and add the type to the `SlideType` literal.
2. Add a `case` for it in the frontend's `Slide.tsx` (+ a `META` entry).

Nothing else changes — the pipeline treats every type the same.

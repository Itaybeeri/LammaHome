"""FastAPI app: the thin HTTP layer over the pipeline.

Three routes, matching the product:
  POST /api/generate    subject + grade  -> a full deck
  POST /api/regenerate  one slide (opt. as a different move) -> the new slide
  GET  /api/health      whether a live API key is configured

Text edits, delete, and reorder are client-side deck-state operations (Tier 2,
DECISIONS D-006) — no endpoint needed while the deck lives in the browser.
"""

from dotenv import load_dotenv

load_dotenv()  # read backend/.env before the pipeline reads ANTHROPIC_API_KEY

import json  # noqa: E402
from collections.abc import AsyncIterator  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402

from . import pipeline  # noqa: E402
from .models import (  # noqa: E402
    BUILTIN_TYPES,
    Deck,
    GenerateRequest,
    RegenerateRequest,
    Slide,
)


def _customs(req: GenerateRequest | RegenerateRequest) -> list[dict] | None:
    """Custom slide-type blocks as plain dicts for the pipeline."""
    return [c.model_dump() for c in req.custom_types] if req.custom_types else None

app = FastAPI(title="Lamma Presentation Generator")

# The Vite dev server runs on a different port; allow it in dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5273"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"live_api": pipeline.has_live_api()}


@app.get("/api/pedagogy")
def pedagogy() -> dict:
    """The fixed base prompt + the default, editable pedagogy blocks the UI shows."""
    return {
        "base_system": pipeline.BASE_OUTLINE_SYSTEM,
        "blocks": [{**b, "enabled": True} for b in pipeline.DEFAULT_PEDAGOGY],
    }


@app.get("/api/slide-types")
def slide_types() -> dict:
    """The built-in slide-type blocks (the proven building blocks the UI shows)."""
    return {"builtin": [{"name": k, "description": v} for k, v in BUILTIN_TYPES.items()]}


@app.post("/api/generate", response_model=Deck)
async def generate(req: GenerateRequest) -> Deck:
    return await pipeline.generate_deck(
        req.subject, req.grade, req.demo, req.pedagogy, _customs(req)
    )


@app.post("/api/regenerate", response_model=Slide)
async def regenerate(req: RegenerateRequest) -> Slide:
    return await pipeline.regenerate_slide(
        req.subject, req.grade, req.slide, req.target_type, req.demo, _customs(req)
    )


# Streaming variants: emit newline-delimited JSON progress events so the UI can
# show the pipeline working. The final event carries the result.
async def _ndjson(events) -> AsyncIterator[str]:
    async for ev in events:
        yield json.dumps(ev) + "\n"


@app.post("/api/generate/stream")
async def generate_stream(req: GenerateRequest) -> StreamingResponse:
    events = pipeline.generate_deck_events(
        req.subject, req.grade, req.demo, req.pedagogy, _customs(req)
    )
    return StreamingResponse(_ndjson(events), media_type="application/x-ndjson")


@app.post("/api/regenerate/stream")
async def regenerate_stream(req: RegenerateRequest) -> StreamingResponse:
    events = pipeline.regenerate_slide_events(
        req.subject, req.grade, req.slide, req.target_type, req.demo, _customs(req)
    )
    return StreamingResponse(_ndjson(events), media_type="application/x-ndjson")

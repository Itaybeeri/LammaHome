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

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import HTMLResponse, Response, StreamingResponse  # noqa: E402

from . import export_pptx, pipeline, share_html, store  # noqa: E402
from .models import (  # noqa: E402
    BUILTIN_TYPES,
    Deck,
    GenerateRequest,
    LessonSummary,
    RegenerateRequest,
    SavedLesson,
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


# --- Saved lessons (file-based store) --------------------------------------


@app.get("/api/lessons", response_model=list[LessonSummary])
def list_lessons() -> list[LessonSummary]:
    return store.list_lessons()


@app.post("/api/lessons", response_model=SavedLesson)
def save_lesson(deck: Deck) -> SavedLesson:
    return store.save_lesson(deck)


@app.get("/api/lessons/{lesson_id}", response_model=SavedLesson)
def get_lesson(lesson_id: str) -> SavedLesson:
    lesson = store.get_lesson(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@app.put("/api/lessons/{lesson_id}", response_model=SavedLesson)
def update_lesson(lesson_id: str, deck: Deck) -> SavedLesson:
    lesson = store.update_lesson(lesson_id, deck)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@app.delete("/api/lessons/{lesson_id}")
def delete_lesson(lesson_id: str) -> dict:
    if not store.delete_lesson(lesson_id):
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {"ok": True}


_PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


def _pptx_response(deck: Deck) -> Response:
    fname = (deck.subject or "lesson").strip().replace(" ", "-") or "lesson"
    return Response(
        content=export_pptx.build_pptx(deck),
        media_type=_PPTX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{fname}.pptx"'},
    )


@app.post("/api/export/pptx")
def export_pptx_endpoint(deck: Deck) -> Response:
    """Export the current deck to PowerPoint (no need to save first)."""
    return _pptx_response(deck)


@app.get("/api/lessons/{lesson_id}/pptx")
def lesson_pptx(lesson_id: str) -> Response:
    lesson = store.get_lesson(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return _pptx_response(Deck(subject=lesson.subject, grade=lesson.grade, slides=lesson.slides))


@app.get("/api/lessons/{lesson_id}/view", response_class=HTMLResponse)
def lesson_view(lesson_id: str) -> HTMLResponse:
    """A standalone, shareable HTML page rendering the lesson."""
    lesson = store.get_lesson(lesson_id)
    if lesson is None:
        return HTMLResponse("<h1>Lesson not found</h1>", status_code=404)
    return HTMLResponse(share_html.render_lesson_html(lesson))


@app.get("/api/slide-types")
def slide_types() -> dict:
    """The built-in slide-type blocks (the proven building blocks the UI shows)."""
    return {"builtin": [{"name": k, "description": v} for k, v in BUILTIN_TYPES.items()]}


@app.post("/api/generate", response_model=Deck)
async def generate(req: GenerateRequest) -> Deck:
    return await pipeline.generate_deck(
        req.subject, req.grade, req.demo, req.pedagogy, _customs(req), req.plan
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
        req.subject, req.grade, req.demo, req.pedagogy, _customs(req), req.plan
    )
    return StreamingResponse(_ndjson(events), media_type="application/x-ndjson")


@app.post("/api/regenerate/stream")
async def regenerate_stream(req: RegenerateRequest) -> StreamingResponse:
    events = pipeline.regenerate_slide_events(
        req.subject, req.grade, req.slide, req.target_type, req.demo, _customs(req)
    )
    return StreamingResponse(_ndjson(events), media_type="application/x-ndjson")

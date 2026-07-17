"""The AI pipeline: subject + grade -> a deck of pedagogical-move slides.

Strategy is outline-then-fill (DECISIONS D-008):
  1. one call infers an OUTLINE (which moves, in what order, why)
  2. one call per slide FILLS that slide's content, in parallel

Each fill is schema-constrained (structured outputs) so the model can only
return a shape that matches the slide type. On a bad result we retry once, then
leave a regeneratable placeholder (D-010). The exact same fill step powers
"regenerate this slide" and "regenerate as a different move".

If there is no ANTHROPIC_API_KEY, every entry point serves the pre-generated
fallback deck instead — so the app runs (and the demo is safe) without a key.
"""

import asyncio
import json
import os
from pathlib import Path

from anthropic import AsyncAnthropic
from pydantic import BaseModel

from .models import (
    CONTENT_MODELS,
    Deck,
    Outline,
    PlannedSlide,
    Slide,
)

MODEL = "claude-opus-4-8"
_FALLBACK_PATH = Path(__file__).resolve().parent.parent / "fallback_deck.json"

# One client, created lazily. None when no key is configured -> fallback mode.
_client: AsyncAnthropic | None = None
if os.getenv("ANTHROPIC_API_KEY"):
    _client = AsyncAnthropic()


def has_live_api() -> bool:
    return _client is not None


def _next_id(existing: list[Slide]) -> str:
    return f"slide-{len(existing) + 1}"


# --- Structured-output helper ----------------------------------------------


async def _generate(schema: type[BaseModel], system: str, prompt: str) -> BaseModel | None:
    """Ask the model to return an instance of `schema`. Returns a validated
    model, or None if the model refused or produced something invalid."""
    assert _client is not None
    resp = await _client.messages.parse(
        model=MODEL,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        output_format=schema,
    )
    return resp.parsed_output  # None on refusal / unparseable output


# --- Stage 1: outline -------------------------------------------------------

_OUTLINE_SYSTEM = (
    "You are an experienced K-12 curriculum designer. Given a subject and a "
    "grade level, plan a single class lesson as an ordered list of pedagogical "
    "moves. Use these move types: hook, concept, check-for-understanding, "
    "exit-ticket, video. Every lesson opens with a hook, teaches one or two "
    "concepts, verifies understanding with a check, and closes with an "
    "exit-ticket. Include a video move only when a short clip would genuinely "
    "help (e.g. a process worth seeing). Aim for 5-7 slides total. Keep the "
    "reading level appropriate to the grade."
)


async def generate_outline(subject: str, grade: str) -> Outline:
    prompt = f"Subject: {subject}\nGrade: {grade}\n\nPlan the lesson."
    outline = await _generate(Outline, _OUTLINE_SYSTEM, prompt)
    if outline is None:
        # Outline is load-bearing; a minimal safe default beats a hard failure.
        return Outline(
            slides=[
                PlannedSlide(type="hook", intent=f"Get {grade} students curious about {subject}."),
                PlannedSlide(type="concept", intent=f"Teach the core idea of {subject}."),
                PlannedSlide(type="check-for-understanding", intent="Check they understood the concept."),
                PlannedSlide(type="exit-ticket", intent="Have students reflect on what they learned."),
            ]
        )
    return outline


# --- Stage 2: fill one slide ------------------------------------------------

_FILL_SYSTEM = (
    "You write the content for one slide of a K-12 lesson. You are given the "
    "slide's pedagogical move and its intent. Fill only the requested fields. "
    "Match the reading level to the grade. Be factually accurate — a teacher "
    "will show this to a class."
)


async def _fill_once(subject: str, grade: str, planned: PlannedSlide) -> dict | None:
    schema = CONTENT_MODELS[planned.type]
    prompt = (
        f"Subject: {subject}\n"
        f"Grade: {grade}\n"
        f"Slide type: {planned.type}\n"
        f"Intent: {planned.intent}\n\n"
        f"Write this slide."
    )
    content = await _generate(schema, _FILL_SYSTEM, prompt)
    return content.model_dump() if content is not None else None


async def fill_slide(subject: str, grade: str, planned: PlannedSlide, slide_id: str) -> Slide:
    """Fill one slide: try, retry once, then fall back to a placeholder."""
    for _ in range(2):  # one attempt + one retry
        content = await _fill_once(subject, grade, planned)
        if content is not None:
            return Slide(id=slide_id, type=planned.type, intent=planned.intent, content=content)
    # Both attempts failed — keep the slot, let the teacher regenerate it (D-010).
    return Slide(
        id=slide_id,
        type=planned.type,
        intent=planned.intent,
        content={"title": "Couldn't generate this slide", "note": "Try regenerating it."},
        status="failed",
    )


# --- Orchestration ----------------------------------------------------------


async def generate_deck(subject: str, grade: str) -> Deck:
    if _client is None:
        return load_fallback_deck()

    outline = await generate_outline(subject, grade)
    slides = await asyncio.gather(
        *(
            fill_slide(subject, grade, planned, f"slide-{i + 1}")
            for i, planned in enumerate(outline.slides)
        )
    )
    return Deck(subject=subject, grade=grade, slides=list(slides))


async def regenerate_slide(
    subject: str, grade: str, slide: Slide, target_type: str | None
) -> Slide:
    """Re-run the fill step for a single slide. If target_type is given, the
    slide comes back as a different pedagogical move — same machinery, one
    parameter (DECISIONS D-006 / D-009)."""
    if _client is None:
        # No key: hand back a fallback slide of the requested type if we have one.
        fallback = load_fallback_deck()
        wanted = target_type or slide.type
        match = next((s for s in fallback.slides if s.type == wanted), None)
        return match.model_copy(update={"id": slide.id}) if match else slide

    new_type = target_type or slide.type
    planned = PlannedSlide(type=new_type, intent=slide.intent)
    return await fill_slide(subject, grade, planned, slide.id)


# --- Fallback deck ----------------------------------------------------------


def load_fallback_deck() -> Deck:
    data = json.loads(_FALLBACK_PATH.read_text(encoding="utf-8"))
    return Deck.model_validate(data)

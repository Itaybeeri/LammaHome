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
import re
from pathlib import Path

import httpx
from anthropic import AsyncAnthropic
from pydantic import BaseModel

from .models import (
    CONTENT_MODELS,
    Deck,
    Outline,
    PlannedSlide,
    Slide,
)

MODEL = "claude-haiku-4-5"
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
    "You are an experienced K-12 curriculum designer. Plan a single class lesson "
    "for the given subject and grade as an ordered list of pedagogical moves. The "
    "move types are: hook, concept, check-for-understanding, exit-ticket, video.\n\n"
    "YOU decide how many slides the lesson needs and how to sequence the moves — "
    "let the topic drive it, not a fixed template. A simple topic may need only a "
    "few slides; a rich or multi-part topic may need many. Use each move type as "
    "often as it helps: several concepts for a big idea, a check right after a "
    "tricky one, a video when seeing the thing matters, even more than one hook "
    "or check if it serves the lesson. There is no required shape, and no fixed "
    "length — most lessons land around 4 to 8 slides, but use fewer for a simple "
    "topic and more for a rich one; let the content decide.\n\n"
    "Good pedagogy still applies: open in a way that engages or activates prior "
    "knowledge, build understanding in a sensible order, verify it along the way, "
    "and end with something that consolidates or lets the teacher gauge learning. "
    "Match the depth and reading level to the grade. Give each slide a one-line "
    "intent describing what it should accomplish."
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
    "will show this to a class. When the schema has an image_query field, give a "
    "short, concrete search phrase for a real image or diagram (a thing, not a "
    "sentence), and write the slide's other text so it reads well on its own — "
    "do not say 'look at this picture' as if pointing at a specific image."
)


def _fill_prompt(subject: str, grade: str, planned: PlannedSlide) -> str:
    return (
        f"Subject: {subject}\n"
        f"Grade: {grade}\n"
        f"Slide type: {planned.type}\n"
        f"Intent: {planned.intent}\n\n"
        f"Write this slide."
    )


async def _fill_once(subject: str, grade: str, planned: PlannedSlide) -> dict | None:
    schema = CONTENT_MODELS[planned.type]
    content = await _generate(schema, _FILL_SYSTEM, _fill_prompt(subject, grade, planned))
    return content.model_dump() if content is not None else None


async def fill_slide(subject: str, grade: str, planned: PlannedSlide, slide_id: str) -> Slide:
    """Fill one slide: try, retry once, then fall back to a placeholder."""
    for _ in range(2):  # one attempt + one retry
        try:
            content = await _fill_once(subject, grade, planned)
        except Exception:
            content = None  # transient API error -> retry, then placeholder
        if content is not None:
            await _attach_media(content, subject, grade)
            return Slide(id=slide_id, type=planned.type, intent=planned.intent, content=content)
    # Both attempts failed — keep the slot, let the teacher regenerate it (D-010).
    return Slide(
        id=slide_id,
        type=planned.type,
        intent=planned.intent,
        content={"title": "Couldn't generate this slide", "note": "Try regenerating it."},
        status="failed",
    )


# --- Video resolution -------------------------------------------------------
# The model returns a *search intent* for video slides, never a URL (it would
# hallucinate dead links). We resolve that intent to a real, embeddable clip by
# searching YouTube (keyless) and verifying each candidate via oEmbed. This is
# the "embedded-video generator" — a production version would use the YouTube
# Data API instead of scraping the results page.

_YT_ID_RE = re.compile(r'"videoId":"([A-Za-z0-9_-]{11})"')
_YT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": "CONSENT=YES+1",  # skip the EU consent interstitial
}


async def resolve_video(query: str) -> str | None:
    """Return an embeddable YouTube embed URL for `query`, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=8, headers=_YT_HEADERS) as client:
            res = await client.get(
                "https://www.youtube.com/results",
                params={"search_query": query, "hl": "en", "gl": "US"},
            )
            # Dedup the first few videoIds from the search page.
            ids: list[str] = []
            for m in _YT_ID_RE.finditer(res.text):
                if m.group(1) not in ids:
                    ids.append(m.group(1))
                if len(ids) >= 5:
                    break
            # Return the first one that oEmbed confirms is embeddable.
            for vid in ids:
                oe = await client.get(
                    "https://www.youtube.com/oembed",
                    params={"url": f"https://www.youtube.com/watch?v={vid}", "format": "json"},
                )
                if oe.status_code == 200:
                    return f"https://www.youtube.com/embed/{vid}"
    except Exception:
        return None  # network hiccup / markup change -> UI shows the search link
    return None


# Wikimedia asks for a descriptive User-Agent with contact info.
_WIKI_HEADERS = {"User-Agent": "LammaLessonGenerator/1.0 (educational demo; itaybeeri@gmail.com)"}


async def resolve_image(query: str) -> str | None:
    """Return a real, free image URL for `query` from Wikipedia, or None."""
    try:
        async with httpx.AsyncClient(timeout=8, headers=_WIKI_HEADERS) as client:
            res = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "format": "json",
                    "prop": "pageimages",
                    "piprop": "thumbnail",
                    "pithumbsize": "800",
                    "generator": "search",
                    "gsrsearch": query,
                    "gsrlimit": "3",
                    "gsrnamespace": "0",
                },
            )
            pages = res.json().get("query", {}).get("pages", {})
            for page in sorted(pages.values(), key=lambda p: p.get("index", 99)):
                thumb = page.get("thumbnail", {}).get("source")
                if thumb:
                    return thumb
    except Exception:
        return None
    return None


async def _attach_media(content: dict, subject: str, grade: str) -> None:
    """Enrich a slide's content with a real video and/or image, based on the
    search intents the model produced. Best-effort — leaves it out on failure."""
    if content.get("search_query") and not content.get("video_url"):
        url = await resolve_video(str(content["search_query"]))
        if url:
            content["video_url"] = url
    if content.get("image_query") and not content.get("image_url"):
        url = await resolve_image(str(content["image_query"]))
        if url:
            content["image_url"] = url


# --- Orchestration ----------------------------------------------------------


async def generate_deck_events(subject: str, grade: str, demo: bool = False):
    """Run the pipeline, yielding technical progress events (the exact prompt
    sent to the model and the JSON it returned) so the UI can show what's
    happening behind the scenes. The final event is {"type": "done", "deck": …}."""
    if demo or _client is None:
        deck = load_fallback_deck()
        yield {"type": "note", "message": "Demo mode — serving the pre-generated deck (no AI call)."}
        yield {"type": "result", "stage": "outline",
               "response": {"slides": [{"type": s.type, "intent": s.intent} for s in deck.slides]}}
        for s in deck.slides:
            yield {"type": "result", "stage": "fill", "slide_type": s.type,
                   "status": s.status, "response": s.content}
        yield {"type": "done", "deck": deck.model_dump()}
        return

    # Stage 1 — outline.
    outline_prompt = f"Subject: {subject}\nGrade: {grade}\n\nPlan the lesson."
    yield {"type": "call", "stage": "outline", "model": MODEL, "schema": "Outline",
           "system": _OUTLINE_SYSTEM, "prompt": outline_prompt}
    try:
        outline = await generate_outline(subject, grade)
    except Exception as e:
        yield {"type": "error", "message": _friendly_error(e)}
        return
    yield {"type": "result", "stage": "outline", "response": outline.model_dump()}

    # Stage 2 — fill each slide (structured output, one call each, in parallel).
    yield {"type": "note",
           "message": f"Filling {len(outline.slides)} slides in parallel — one structured-output call each."}
    for planned in outline.slides:  # show every request that goes out
        yield {"type": "call", "stage": "fill", "model": MODEL,
               "schema": CONTENT_MODELS[planned.type].__name__, "slide_type": planned.type,
               "system": _FILL_SYSTEM, "prompt": _fill_prompt(subject, grade, planned)}
    tasks = [
        asyncio.create_task(fill_slide(subject, grade, planned, f"slide-{i + 1}"))
        for i, planned in enumerate(outline.slides)
    ]
    by_id: dict[str, Slide] = {}
    for finished in asyncio.as_completed(tasks):  # emit each response as it lands
        slide = await finished
        by_id[slide.id] = slide
        yield {"type": "result", "stage": "fill", "slide_type": slide.type,
               "status": slide.status, "response": slide.content}

    slides = [by_id[f"slide-{i + 1}"] for i in range(len(outline.slides))]
    deck = Deck(subject=subject, grade=grade, slides=slides)
    yield {"type": "done", "deck": deck.model_dump()}


def _friendly_error(e: Exception) -> str:
    """Turn an Anthropic/API exception into a message the teacher can act on."""
    import anthropic

    if isinstance(e, anthropic.AuthenticationError):
        return "The API key is invalid. Check ANTHROPIC_API_KEY in backend/.env, or use demo mode."
    if isinstance(e, anthropic.PermissionDeniedError):
        return "The API key lacks access to this model. Check the key, or use demo mode."
    if isinstance(e, anthropic.RateLimitError):
        return "Rate limited by the API. Wait a moment and retry, or use demo mode."
    if isinstance(e, anthropic.BadRequestError) and "credit" in str(e).lower():
        return "The account is out of credit. Add credit at console.anthropic.com, or use demo mode."
    if isinstance(e, anthropic.APIConnectionError):
        return "Couldn't reach the API (network). Check your connection, or use demo mode."
    return f"AI request failed: {e}. You can switch to demo mode instead."


async def generate_deck(subject: str, grade: str, demo: bool = False) -> Deck:
    """Non-streaming form — consume the event stream and return the final deck."""
    deck: Deck | None = None
    async for ev in generate_deck_events(subject, grade, demo):
        if ev["type"] == "done":
            deck = Deck.model_validate(ev["deck"])
    assert deck is not None
    return deck


async def regenerate_slide(
    subject: str, grade: str, slide: Slide, target_type: str | None, demo: bool = False
) -> Slide:
    """Re-run the fill step for a single slide. If target_type is given, the
    slide comes back as a different pedagogical move — same machinery, one
    parameter (DECISIONS D-006 / D-009)."""
    if demo or _client is None:
        # Demo mode / no key: hand back a fallback slide of the requested type.
        fallback = load_fallback_deck()
        wanted = target_type or slide.type
        match = next((s for s in fallback.slides if s.type == wanted), None)
        return match.model_copy(update={"id": slide.id}) if match else slide

    new_type = target_type or slide.type
    planned = PlannedSlide(type=new_type, intent=slide.intent)
    return await fill_slide(subject, grade, planned, slide.id)


async def regenerate_slide_events(
    subject: str, grade: str, slide: Slide, target_type: str | None, demo: bool = False
):
    """Streaming form of regenerate_slide — yields progress, ends with
    {"type": "done", "slide": …}."""
    new_type = target_type or slide.type
    if not demo and _client is not None:
        planned = PlannedSlide(type=new_type, intent=slide.intent)
        yield {"type": "call", "stage": "fill", "model": MODEL,
               "schema": CONTENT_MODELS[new_type].__name__, "slide_type": new_type,
               "system": _FILL_SYSTEM, "prompt": _fill_prompt(subject, grade, planned)}
    else:
        yield {"type": "note", "message": f"Demo mode — swapping in a {new_type} slide."}
    try:
        new = await regenerate_slide(subject, grade, slide, target_type, demo)
    except Exception as e:
        yield {"type": "error", "message": _friendly_error(e)}
        return
    yield {"type": "result", "stage": "fill", "slide_type": new.type,
           "status": new.status, "response": new.content}
    yield {"type": "done", "slide": new.model_dump()}


# --- Fallback deck ----------------------------------------------------------


def load_fallback_deck() -> Deck:
    data = json.loads(_FALLBACK_PATH.read_text(encoding="utf-8"))
    return Deck.model_validate(data)

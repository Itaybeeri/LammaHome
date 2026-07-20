"""Render a saved lesson as a standalone HTML page — the shareable link. Anyone
who opens /api/lessons/{id}/view sees the deck, no app needed."""

from html import escape

from .models import SavedLesson
from .render import slide_lines, slide_title

_COLORS = {
    "hook": "#d76c07", "concept": "#2f6bf0", "check-for-understanding": "#1c9840",
    "exit-ticket": "#7a30dd", "video": "#dc3550", "sorting-game": "#0891b2",
}
_CSS = """
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.6;
    background: #f4f6f9; color: #1a1f2b; }
  @media (prefers-color-scheme: dark) { body { background: #0e111a; color: #e9ecf3; } .slide { background: #161b26 !important; } }
  main { max-width: 820px; margin: 0 auto; padding: 48px 22px 90px; }
  header h1 { margin: 0 0 4px; font-size: 30px; text-transform: capitalize; }
  header p { margin: 0 0 8px; color: #6a6a7a; }
  .slide { background: #fff; border-left: 5px solid var(--c, #888); border-radius: 12px;
    padding: 22px 26px; margin: 18px 0; box-shadow: 0 8px 24px rgba(80,70,120,.08); }
  .badge { display: inline-block; background: var(--c, #888); color: #fff; font-size: 12px;
    font-weight: 700; padding: 4px 11px; border-radius: 999px; margin-bottom: 12px; }
  .slide h2 { margin: 0 0 12px; color: var(--c, inherit); font-size: 23px; }
  .slide img { max-width: 100%; max-height: 300px; border-radius: 10px; display: block; margin: 0 0 14px; }
  .slide iframe { width: 100%; aspect-ratio: 16/9; border: 0; border-radius: 10px; margin-bottom: 12px; }
  .slide p { margin: 0 0 8px; }
  footer { margin-top: 40px; color: #9a9aa6; font-size: 13px; }
"""


def render_lesson_html(lesson: SavedLesson) -> str:
    parts: list[str] = []
    for slide in lesson.slides:
        color = _COLORS.get(slide.type, "#0a8b7e")
        parts.append(f'<section class="slide" style="--c:{color}">')
        parts.append(f'<span class="badge">{escape(slide.type)}</span>')
        parts.append(f"<h2>{escape(slide_title(slide))}</h2>")

        img = slide.content.get("image_url")
        if isinstance(img, str) and img:
            parts.append(f'<img src="{escape(img, quote=True)}" alt="">')

        vid = slide.content.get("video_url")
        if slide.type == "video" and isinstance(vid, str) and vid:
            parts.append(f'<iframe src="{escape(vid, quote=True)}" allowfullscreen></iframe>')
            parts.append(f"<p>{escape(str(slide.content.get('caption', '')))}</p>")
        else:
            for line in slide_lines(slide):
                parts.append(f"<p>{escape(line)}</p>")
        parts.append("</section>")

    body = "\n".join(parts)
    return (
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<title>{escape(lesson.subject)} — {escape(lesson.grade)}</title>"
        f"<style>{_CSS}</style></head><body><main>"
        f"<header><h1>{escape(lesson.subject)}</h1>"
        f"<p>{escape(lesson.grade)} · {len(lesson.slides)} slides</p></header>"
        f"{body}"
        '<footer>Made with the Lamma Lesson Generator.</footer>'
        "</main></body></html>"
    )

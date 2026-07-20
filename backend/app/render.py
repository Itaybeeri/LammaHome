"""Turn a slide into display lines — shared by the PowerPoint export and the
shareable HTML view so both render a slide the same way."""

from .models import Slide


def slide_title(slide: Slide) -> str:
    title = slide.content.get("title")
    return str(title) if isinstance(title, str) and title else slide.type


def slide_lines(slide: Slide) -> list[str]:
    """The body of a slide as a list of paragraphs (bullets prefixed with '• ')."""
    c = slide.content
    if slide.status == "failed":
        return ["(this slide couldn't be generated — regenerate it)"]

    t = slide.type
    if t == "hook":
        return [str(c.get("hook", ""))]
    if t == "concept":
        return [str(c.get("explanation", ""))] + [f"• {k}" for k in c.get("key_points", [])]
    if t == "check-for-understanding":
        answer = str(c.get("answer", ""))
        lines = [str(c.get("question", ""))]
        for ch in c.get("choices", []):
            lines.append(("✓ " if str(ch) == answer else "• ") + str(ch))
        return lines
    if t == "exit-ticket":
        return [str(c.get("prompt", ""))]
    if t == "video":
        lines = [str(c.get("caption", ""))]
        if c.get("video_url"):
            lines.append("▶ " + str(c["video_url"]))
        elif c.get("search_query"):
            lines.append("Find a clip: " + str(c["search_query"]))
        return lines
    if t == "sorting-game":
        lines = [str(c.get("prompt", ""))]
        items = [it for it in c.get("items", []) if isinstance(it, dict)]
        for cat in c.get("categories", []):
            members = [str(it.get("text", "")) for it in items if it.get("category") == cat]
            lines.append(f"{cat}: " + ", ".join(members))
        return lines

    # custom / generic
    lines = [str(c.get("body", ""))]
    lines += [f"• {b}" for b in c.get("bullets", [])]
    return [ln for ln in lines if ln]

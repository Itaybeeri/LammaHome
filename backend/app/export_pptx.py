"""Export a deck to a real .pptx — the format teachers actually use."""

import io

import httpx
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

from .models import Deck
from .render import slide_lines, slide_title

_ACCENT = RGBColor(0x2E, 0x40, 0xC4)


def _fetch_image(url: str) -> io.BytesIO | None:
    try:
        r = httpx.get(url, timeout=6, follow_redirects=True)
        if r.status_code == 200 and r.content:
            return io.BytesIO(r.content)
    except Exception:
        return None
    return None


def build_pptx(deck: Deck) -> bytes:
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # Title slide.
    cover = prs.slides.add_slide(blank)
    box = cover.shapes.add_textbox(Inches(0.7), Inches(2.6), Inches(8.6), Inches(2))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = deck.subject.title()
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = _ACCENT
    sub = tf.add_paragraph()
    sub.text = deck.grade
    sub.font.size = Pt(20)

    for slide in deck.slides:
        s = prs.slides.add_slide(blank)

        # Title.
        tbox = s.shapes.add_textbox(Inches(0.5), Inches(0.4), Inches(9), Inches(1.1))
        ttf = tbox.text_frame
        ttf.word_wrap = True
        tp = ttf.paragraphs[0]
        tp.text = slide_title(slide)
        tp.font.size = Pt(28)
        tp.font.bold = True
        tp.font.color.rgb = _ACCENT

        # Image (best-effort) on the right; text takes the left column if present.
        img = _fetch_image(str(slide.content.get("image_url", "")))
        content_w = Inches(5.3) if img else Inches(9)
        if img:
            try:
                s.shapes.add_picture(img, Inches(6.0), Inches(1.7), width=Inches(3.5))
            except Exception:
                pass

        # Body.
        cbox = s.shapes.add_textbox(Inches(0.5), Inches(1.7), content_w, Inches(5.2))
        ctf = cbox.text_frame
        ctf.word_wrap = True
        first = True
        for line in slide_lines(slide):
            para = ctf.paragraphs[0] if first else ctf.add_paragraph()
            para.text = line
            para.font.size = Pt(16)
            para.space_after = Pt(8)
            first = False

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()

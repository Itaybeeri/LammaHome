"""Domain model: a slide is a pedagogical *move*, not a generic layout.

The slide `type` drives everything — the schema the AI must fill, the prompt used
to fill it, and (on the frontend) the component that renders it. Adding a new
slide type = adding one entry to CONTENT_MODELS here + one renderer in the UI.
That pair is the whole "plugin" boundary (see docs/DECISIONS.md D-004).
"""

from typing import Literal

from pydantic import BaseModel, Field

# The pedagogical moves the pipeline can emit. A lesson is built out of these.
SlideType = Literal[
    "hook",  # grab attention / activate prior knowledge
    "concept",  # teach one idea
    "check-for-understanding",  # verify they got it
    "exit-ticket",  # a closing prompt the teacher collects
    "video",  # a short clip (shipped embedded; see DECISIONS D-002 / §4.3)
]


# --- What the AI generates for each slide type -----------------------------
# These are ONLY the content fields. `id` and `type` are assigned by the
# backend, never invented by the model.


class HookContent(BaseModel):
    title: str
    hook: str = Field(description="An attention-grabbing question or scenario.")
    image_query: str = Field(
        description="A short, concrete search phrase for a helpful image "
        "(e.g. 'Great Pyramid of Giza'). The backend resolves it to a real image."
    )


class ConceptContent(BaseModel):
    title: str
    explanation: str = Field(description="A clear explanation at the target reading level.")
    key_points: list[str] = Field(description="2-4 short takeaways.")
    image_query: str = Field(
        description="A short, concrete search phrase for a diagram or image that "
        "illustrates this concept (e.g. 'photosynthesis diagram')."
    )


class CheckContent(BaseModel):
    title: str
    question: str
    choices: list[str] = Field(description="3-4 answer options.")
    answer: str = Field(description="The correct option, copied verbatim from choices.")


class ExitTicketContent(BaseModel):
    title: str
    prompt: str = Field(description="A short question the student answers on the way out.")


class VideoContent(BaseModel):
    title: str
    caption: str = Field(description="One sentence on what the clip shows and why.")
    search_query: str = Field(
        description="What to search for to find a fitting clip. The backend maps this "
        "to an embed; the model does not invent URLs."
    )


# The registry. type -> the content schema the AI fills for that type.
CONTENT_MODELS: dict[str, type[BaseModel]] = {
    "hook": HookContent,
    "concept": ConceptContent,
    "check-for-understanding": CheckContent,
    "exit-ticket": ExitTicketContent,
    "video": VideoContent,
}


# --- Stage 1: the outline (the plan the AI infers, shown before slides) -----


class PlannedSlide(BaseModel):
    type: SlideType
    intent: str = Field(description="One line: what this slide should accomplish.")


class Outline(BaseModel):
    slides: list[PlannedSlide]


# --- What the app stores and the frontend renders --------------------------


class Slide(BaseModel):
    """A finished slide. `content` was validated by the matching content model
    when it was created, so we store it as a plain dict for easy JSON transport.
    `status="failed"` marks a placeholder the teacher can regenerate (D-010)."""

    id: str
    type: SlideType
    intent: str
    content: dict
    status: Literal["ok", "failed"] = "ok"


class Deck(BaseModel):
    subject: str
    grade: str
    slides: list[Slide]


# --- API request bodies -----------------------------------------------------


class GenerateRequest(BaseModel):
    subject: str
    grade: str
    demo: bool = Field(
        default=False,
        description="If true, serve the pre-generated demo deck instead of calling the AI.",
    )
    pedagogy: list[str] | None = Field(
        default=None,
        description="Enabled pedagogy-block texts to shape the lesson plan. None = defaults.",
    )


class RegenerateRequest(BaseModel):
    subject: str
    grade: str
    slide: Slide
    target_type: SlideType | None = Field(
        default=None,
        description="If set, regenerate the slide as this different pedagogical move.",
    )
    demo: bool = Field(
        default=False,
        description="If true, use the demo deck instead of calling the AI.",
    )

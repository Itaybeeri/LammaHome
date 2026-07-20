"""File-based lesson store.

Each saved lesson is one JSON file in the repo's `lessons/` folder. That makes a
lesson trivially transferable — copy the file, or commit it to GitHub and anyone
who pulls sees it in their list (a "lesson from GitHub" is just a file that's
present). No database, which keeps the server stateless-ish and git-friendly.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path

from .models import Deck, LessonSummary, SavedLesson

# <repo>/lessons  (app -> backend -> repo root)
LESSONS_DIR = Path(__file__).resolve().parents[2] / "lessons"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _path(lesson_id: str) -> Path:
    return LESSONS_DIR / f"{lesson_id}.json"


def _write(lesson: SavedLesson) -> None:
    LESSONS_DIR.mkdir(parents=True, exist_ok=True)
    _path(lesson.id).write_text(lesson.model_dump_json(indent=2), encoding="utf-8")


def save_lesson(deck: Deck) -> SavedLesson:
    now = _now()
    lesson = SavedLesson(
        id=uuid.uuid4().hex[:10],
        subject=deck.subject,
        grade=deck.grade,
        slides=deck.slides,
        created_at=now,
        updated_at=now,
    )
    _write(lesson)
    return lesson


def get_lesson(lesson_id: str) -> SavedLesson | None:
    path = _path(lesson_id)
    if not path.exists():
        return None
    return SavedLesson.model_validate_json(path.read_text(encoding="utf-8"))


def update_lesson(lesson_id: str, deck: Deck) -> SavedLesson | None:
    existing = get_lesson(lesson_id)
    if existing is None:
        return None
    updated = existing.model_copy(
        update={
            "subject": deck.subject,
            "grade": deck.grade,
            "slides": deck.slides,
            "updated_at": _now(),
        }
    )
    _write(updated)
    return updated


def delete_lesson(lesson_id: str) -> bool:
    path = _path(lesson_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def list_lessons() -> list[LessonSummary]:
    if not LESSONS_DIR.exists():
        return []
    summaries: list[LessonSummary] = []
    for path in LESSONS_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            summaries.append(
                LessonSummary(
                    id=data["id"],
                    subject=data["subject"],
                    grade=data["grade"],
                    slide_count=len(data.get("slides", [])),
                    updated_at=data.get("updated_at", ""),
                )
            )
        except Exception:
            continue  # skip anything malformed
    summaries.sort(key=lambda s: s.updated_at, reverse=True)
    return summaries

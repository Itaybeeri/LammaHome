import { useState } from "react";
import type { LessonSummary } from "../types";

// Saved lessons shown as blocks/cards ("like DB" rows). Lessons are files in
// lessons/ — locally saved ones and any committed to GitHub and pulled both
// appear here.

export default function LessonsList({
  lessons,
  currentId,
  onLoad,
  onDelete,
}: {
  lessons: LessonSummary[];
  currentId: string | null;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="pedagogy">
      <button type="button" className="pedagogy-head" onClick={() => setOpen((o) => !o)}>
        <span>📚 Saved lessons</span>
        <span className="muted">{lessons.length} {open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="pedagogy-body">
          {lessons.length === 0 ? (
            <p className="muted">
              No saved lessons yet. Generate one and click <strong>Save</strong>. Lessons committed
              to <code>lessons/</code> on GitHub appear here after a <code>git pull</code>.
            </p>
          ) : (
            <div className="lesson-cards">
              {lessons.map((l) => (
                <div key={l.id} className={`lesson-card ${l.id === currentId ? "current" : ""}`}>
                  <div className="lesson-subject">{l.subject}</div>
                  <div className="lesson-meta">{l.grade} · {l.slide_count} slides</div>
                  <div className="lesson-date">{fmt(l.updated_at)}</div>
                  <div className="lesson-actions">
                    <button type="button" onClick={() => onLoad(l.id)}>Open</button>
                    <a className="mini-link" href={`/api/lessons/${l.id}/view`} target="_blank" rel="noreferrer">
                      Share
                    </a>
                    <a className="mini-link" href={`/api/lessons/${l.id}/pptx`}>.pptx</a>
                    <button type="button" className="block-remove" onClick={() => onDelete(l.id)} aria-label="Delete">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function fmt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

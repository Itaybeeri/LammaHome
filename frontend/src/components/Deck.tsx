import { useState } from "react";
import type { Deck, Slide } from "../types";
import { SLIDE_TYPES } from "../types";
import SlideView from "./Slide";

// The click-through viewer plus the Tier-2 editor controls (edit text,
// regenerate — including as a different move — delete, reorder).

interface Props {
  deck: Deck;
  busySlideId: string | null;
  customTypeNames: string[];
  onRegenerate: (slide: Slide, targetType: string | null) => void;
  onEdit: (slideId: string, content: Record<string, unknown>) => void;
  onDelete: (slideId: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

export default function DeckView({
  deck,
  busySlideId,
  customTypeNames,
  onRegenerate,
  onEdit,
  onDelete,
  onMove,
}: Props) {
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);

  const i = Math.min(index, deck.slides.length - 1);
  const slide = deck.slides[i];
  const busy = busySlideId === slide.id;

  return (
    <div className="deck">
      {/* The inferred plan: which moves, in order. Click a chip to jump. */}
      <div className="filmstrip">
        {deck.slides.map((s, n) => (
          <button
            key={s.id}
            className={`chip type-${s.type} ${n === i ? "active" : ""} ${s.status === "failed" ? "failed" : ""}`}
            onClick={() => {
              setIndex(n);
              setEditing(false);
            }}
          >
            {n + 1}. {s.type}
          </button>
        ))}
      </div>

      <div className="stage">
        {busy ? (
          <div className="slide-body">Regenerating…</div>
        ) : editing ? (
          <SlideEditor slide={slide} onSave={(content) => { onEdit(slide.id, content); setEditing(false); }} onCancel={() => setEditing(false)} />
        ) : (
          <SlideView slide={slide} />
        )}
      </div>

      <div className="nav">
        <button onClick={() => setIndex(Math.max(0, i - 1))} disabled={i === 0}>← Prev</button>
        <span>{i + 1} / {deck.slides.length}</span>
        <button onClick={() => setIndex(Math.min(deck.slides.length - 1, i + 1))} disabled={i === deck.slides.length - 1}>Next →</button>
      </div>

      {/* Tier-2 controls */}
      <div className="controls">
        <button onClick={() => setEditing((e) => !e)} disabled={busy}>Edit text</button>
        <button onClick={() => onRegenerate(slide, null)} disabled={busy}>Regenerate</button>
        <label className="regen-as">
          Regenerate as
          <select
            value={slide.type}
            disabled={busy}
            onChange={(e) => onRegenerate(slide, e.target.value)}
          >
            {[...SLIDE_TYPES, ...customTypeNames].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <button onClick={() => onMove(i, -1)} disabled={i === 0}>Move ←</button>
        <button onClick={() => onMove(i, 1)} disabled={i === deck.slides.length - 1}>Move →</button>
        <button className="danger" onClick={() => onDelete(slide.id)} disabled={deck.slides.length <= 1}>Delete</button>
      </div>
    </div>
  );
}

// Generic editor: every string field becomes an input, every string-list field
// a newline-separated textarea. Works for any slide type without per-type code.
function SlideEditor({
  slide,
  onSave,
  onCancel,
}: {
  slide: Slide;
  onSave: (content: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...slide.content });

  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="slide-body editor">
      {Object.entries(slide.content).map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <label key={key}>
              {key}
              <textarea
                value={(draft[key] as string[]).join("\n")}
                onChange={(e) => set(key, e.target.value.split("\n"))}
              />
            </label>
          );
        }
        if (typeof value === "string") {
          return (
            <label key={key}>
              {key}
              <input value={draft[key] as string} onChange={(e) => set(key, e.target.value)} />
            </label>
          );
        }
        return null; // non-editable field (e.g. video_url) — leave as-is
      })}
      <div className="editor-actions">
        <button onClick={() => onSave(draft)}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { CustomTypeDef } from "../types";

// Slide types as building blocks. The built-in moves are the proven blocks
// (read-only). A teacher can define CUSTOM blocks (name + emoji + instruction)
// that become first-class moves: the planner can put them in a lesson and they
// render generically — no new code. This is the "add a new slide type" story.

export default function SlideTypesPanel({
  builtins,
  customTypes,
  onChange,
}: {
  builtins: string[];
  customTypes: CustomTypeDef[];
  onChange: (types: CustomTypeDef[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const update = (i: number, patch: Partial<CustomTypeDef>) =>
    onChange(customTypes.map((c, n) => (n === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(customTypes.filter((_, n) => n !== i));
  const add = () => onChange([...customTypes, { name: "", emoji: "🧩", instruction: "" }]);

  return (
    <section className="pedagogy">
      <button type="button" className="pedagogy-head" onClick={() => setOpen((o) => !o)}>
        <span>🧩 Slide-type blocks</span>
        <span className="muted">
          {builtins.length} built-in · {customTypes.length} custom {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="pedagogy-body">
          <p className="muted">Proven built-in moves:</p>
          <div className="builtin-types">
            {builtins.map((b) => (
              <span key={b} className={`chip type-${b}`}>{b}</span>
            ))}
          </div>

          <p className="muted">
            Custom blocks — a key, an emoji, and what the AI should put on that slide. The planner
            can use them and they render generically.
          </p>
          <ul className="block-list">
            {customTypes.map((c, i) => (
              <li key={i}>
                <input
                  className="ct-emoji"
                  value={c.emoji}
                  onChange={(e) => update(i, { emoji: e.target.value })}
                  aria-label="Emoji"
                />
                <input
                  className="ct-name"
                  value={c.name}
                  placeholder="type-key (e.g. mini-game)"
                  onChange={(e) =>
                    update(i, { name: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })
                  }
                />
                <input
                  className="block-text"
                  value={c.instruction}
                  placeholder="What this slide should be…"
                  onChange={(e) => update(i, { instruction: e.target.value })}
                />
                <button type="button" className="block-remove" onClick={() => remove(i)} aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="block-add" onClick={add}>
            + Add custom block
          </button>
        </div>
      )}
    </section>
  );
}

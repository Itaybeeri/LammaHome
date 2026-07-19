import { useState } from "react";
import type { PedagogyBlock } from "../types";

// The pedagogy of a lesson as editable building blocks. The base system prompt
// is fixed (read-only); each pedagogy rule is a block the teacher can toggle,
// edit, remove, or add. Enabled blocks are assembled into the AI's planning
// prompt — so editing here changes how lessons are built (see the "Behind the
// scenes" panel to watch the assembled prompt change).

export default function PedagogyPanel({
  baseSystem,
  blocks,
  onChange,
}: {
  baseSystem: string;
  blocks: PedagogyBlock[];
  onChange: (blocks: PedagogyBlock[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const update = (id: string, patch: Partial<PedagogyBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const add = () =>
    onChange([...blocks, { id: crypto.randomUUID(), label: "Custom", text: "", enabled: true }]);

  const activeCount = blocks.filter((b) => b.enabled).length;

  return (
    <section className="pedagogy">
      <button type="button" className="pedagogy-head" onClick={() => setOpen((o) => !o)}>
        <span>⚙ AI instructions — pedagogy blocks</span>
        <span className="muted">
          {activeCount}/{blocks.length} active {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="pedagogy-body">
          <details className="base-prompt">
            <summary>Base system prompt (fixed)</summary>
            <pre>{baseSystem}</pre>
          </details>

          <p className="muted">
            Enabled blocks are added to the plan-a-lesson prompt. Toggle, edit, remove, or add
            your own.
          </p>

          <ul className="block-list">
            {blocks.map((b) => (
              <li key={b.id} className={b.enabled ? "" : "off"}>
                <input
                  type="checkbox"
                  checked={b.enabled}
                  onChange={(e) => update(b.id, { enabled: e.target.checked })}
                  aria-label={`Enable ${b.label}`}
                />
                <input
                  className="block-text"
                  value={b.text}
                  placeholder="Describe a pedagogy rule…"
                  onChange={(e) => update(b.id, { text: e.target.value })}
                />
                <button type="button" className="block-remove" onClick={() => remove(b.id)} aria-label="Remove block">
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="block-add" onClick={add}>
            + Add block
          </button>
        </div>
      )}
    </section>
  );
}

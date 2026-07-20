// Optional lesson structure. The teacher can compose the exact sequence of
// slide-type blocks (built-in or custom); if they leave it empty, the AI plans
// the lesson itself from the blocks it knows.

export default function StructureComposer({
  availableTypes,
  builtin,
  plan,
  onChange,
}: {
  availableTypes: string[];
  builtin: Set<string>;
  plan: string[];
  onChange: (plan: string[]) => void;
}) {
  const cls = (t: string) => `chip type-${t}${builtin.has(t) ? "" : " ct"}`;
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= plan.length) return;
    const p = [...plan];
    [p[i], p[j]] = [p[j], p[i]];
    onChange(p);
  };

  return (
    <section className="structure">
      <div className="structure-head">
        <span className="field-label">
          Lesson structure <span className="muted">— optional</span>
        </span>
        {plan.length > 0 && (
          <button type="button" className="linkish" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>

      {plan.length === 0 ? (
        <p className="muted structure-hint">
          Leave empty and the AI plans the lesson. Or add blocks below to choose the slides and
          their order yourself.
        </p>
      ) : (
        <ol className="plan-seq">
          {plan.map((t, i) => (
            <li key={i} className={cls(t)}>
              <span className="seq-n">{i + 1}</span>
              {t}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">‹</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === plan.length - 1} aria-label="Move later">›</button>
              <button type="button" onClick={() => onChange(plan.filter((_, n) => n !== i))} aria-label="Remove">✕</button>
            </li>
          ))}
        </ol>
      )}

      <div className="palette">
        <span className="muted">Add block:</span>
        {availableTypes.map((t) => (
          <button type="button" key={t} className={`${cls(t)} addable`} onClick={() => onChange([...plan, t])}>
            + {t}
          </button>
        ))}
      </div>
    </section>
  );
}

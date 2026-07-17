import type { ProgressEvent } from "../api";

// A live "behind the scenes" panel: shows the pipeline events streamed from the
// backend as a deck is generated or a slide is regenerated.

export default function ProcessPanel({ log, busy }: { log: ProgressEvent[]; busy: boolean }) {
  return (
    <aside className="process-panel">
      <h3>Behind the scenes {busy && <span className="spinner" aria-label="working" />}</h3>
      <ol className="process-log">
        {log.map((ev, i) => (
          <li key={i} className={`ev ev-${ev.type}`}>
            {render(ev)}
          </li>
        ))}
      </ol>
    </aside>
  );
}

function render(ev: ProgressEvent) {
  switch (ev.type) {
    case "log":
      return <span>{ev.message}</span>;
    case "outline":
      return (
        <span>
          🧭 {ev.message ?? "Outline ready"}
          {ev.moves && <span className="moves">{ev.moves.join(" → ")}</span>}
        </span>
      );
    case "slide":
      return (
        <span>
          {ev.status === "failed" ? "⚠️" : "✅"} {ev.slide_type}
          {ev.status === "failed" ? " — placeholder (regenerate)" : " ready"}
        </span>
      );
    case "done":
      return <span className="done">🎉 Done</span>;
  }
}

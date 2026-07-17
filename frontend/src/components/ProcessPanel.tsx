import type { ProgressEvent } from "../api";

// A live "behind the scenes" panel showing the real pipeline: the prompt sent
// to the model and the JSON it returned, per call.

export default function ProcessPanel({ log, busy }: { log: ProgressEvent[]; busy: boolean }) {
  return (
    <aside className="process-panel">
      <h3>Behind the scenes {busy && <span className="spinner" aria-label="working" />}</h3>
      <ol className="process-log">
        {log.map((ev, i) => (
          <li key={i}>{render(ev)}</li>
        ))}
      </ol>
    </aside>
  );
}

function render(ev: ProgressEvent) {
  switch (ev.type) {
    case "note":
      return <div className="ev ev-note">{ev.message}</div>;

    case "call":
      return (
        <div className="ev ev-call">
          <div className="ev-head">
            → {ev.stage} request
            {ev.model && <span className="tag">{ev.model}</span>}
            {ev.schema && <span className="tag">schema: {ev.schema}</span>}
            {ev.slide_type && <span className="tag">{ev.slide_type}</span>}
          </div>
          <details>
            <summary>prompt sent</summary>
            <pre>
              {ev.system ? `SYSTEM:\n${ev.system}\n\n` : ""}
              {`USER:\n${ev.prompt ?? ""}`}
            </pre>
          </details>
        </div>
      );

    case "result":
      return (
        <div className="ev ev-result">
          <div className="ev-head">
            ← {ev.stage} response
            {ev.slide_type && <span className="tag">{ev.slide_type}</span>}
            {ev.status === "failed" && <span className="tag warn">⚠ placeholder</span>}
          </div>
          <details>
            <summary>JSON returned</summary>
            <pre>{JSON.stringify(ev.response, null, 2)}</pre>
          </details>
        </div>
      );

    case "error":
      return <div className="ev ev-error">⚠ {ev.message}</div>;

    case "done":
      return <div className="ev ev-done">🎉 Done</div>;
  }
}

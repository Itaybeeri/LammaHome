import type { Slide } from "../types";

// Renders a slide BY TYPE. This switch is the frontend half of the slide-type
// "plugin" (the backend half is CONTENT_MODELS in models.py). Add a type =
// add a case here.

export default function SlideView({ slide }: { slide: Slide }) {
  const c = slide.content;

  if (slide.status === "failed") {
    return (
      <div className="slide-body failed">
        <h2>{str(c.title) || "Couldn't generate this slide"}</h2>
        <p>Use "Regenerate" below to try again.</p>
      </div>
    );
  }

  switch (slide.type) {
    case "hook":
      return (
        <div className="slide-body">
          <h2>{str(c.title)}</h2>
          <p className="lead">{str(c.hook)}</p>
        </div>
      );

    case "concept":
      return (
        <div className="slide-body">
          <h2>{str(c.title)}</h2>
          <p>{str(c.explanation)}</p>
          <ul>{list(c.key_points).map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      );

    case "check-for-understanding":
      return (
        <div className="slide-body">
          <h2>{str(c.title)}</h2>
          <p className="lead">{str(c.question)}</p>
          <ul className="choices">
            {list(c.choices).map((choice, i) => (
              <li key={i} className={choice === str(c.answer) ? "answer" : ""}>
                {choice}
              </li>
            ))}
          </ul>
        </div>
      );

    case "exit-ticket":
      return (
        <div className="slide-body">
          <h2>{str(c.title)}</h2>
          <p className="lead">{str(c.prompt)}</p>
        </div>
      );

    case "video":
      return (
        <div className="slide-body">
          <h2>{str(c.title)}</h2>
          {c.video_url ? (
            <iframe
              className="video"
              src={str(c.video_url)}
              title={str(c.title)}
              allowFullScreen
            />
          ) : (
            // Designed for generated video, shipped embedded: when there's no
            // curated URL we show what would be searched for instead.
            <div className="video placeholder">🎬 clip: "{str(c.search_query)}"</div>
          )}
          <p className="caption">{str(c.caption)}</p>
        </div>
      );
  }
}

// content is an untyped bag (it varies by slide type) — narrow at the edge.
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

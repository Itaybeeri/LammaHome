import type { Slide, SlideType } from "../types";

// Renders a slide BY TYPE. This switch is the frontend half of the slide-type
// "plugin" (the backend half is CONTENT_MODELS in models.py). Add a type =
// add a META entry + a case here.

// Each move gets a friendly emoji + label; the matching color lives in the CSS
// `.type-<name>` rules, keyed off the class we set below.
const META: Record<SlideType, { emoji: string; label: string }> = {
  hook: { emoji: "🎣", label: "Hook" },
  concept: { emoji: "💡", label: "Concept" },
  "check-for-understanding": { emoji: "✅", label: "Check for understanding" },
  "exit-ticket": { emoji: "🎟️", label: "Exit ticket" },
  video: { emoji: "🎬", label: "Video" },
};

export default function SlideView({ slide }: { slide: Slide }) {
  const meta = META[slide.type];
  return (
    <div className={`slide-body type-${slide.type}`}>
      <div className="move-badge">
        {meta.emoji} {meta.label}
      </div>
      {slide.status === "failed" ? (
        <div className="failed">
          <h2>{str(slide.content.title) || "Couldn't generate this slide"}</h2>
          <p>Use "Regenerate" below to try again.</p>
        </div>
      ) : (
        <SlideContent slide={slide} />
      )}
    </div>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  const c = slide.content;
  switch (slide.type) {
    case "hook":
      return (
        <>
          <h2>{str(c.title)}</h2>
          <p className="lead">{str(c.hook)}</p>
        </>
      );

    case "concept":
      return (
        <>
          <h2>{str(c.title)}</h2>
          <p>{str(c.explanation)}</p>
          <ul>{list(c.key_points).map((p, i) => <li key={i}>{p}</li>)}</ul>
        </>
      );

    case "check-for-understanding":
      return (
        <>
          <h2>{str(c.title)}</h2>
          <p className="lead">{str(c.question)}</p>
          <ul className="choices">
            {list(c.choices).map((choice, i) => (
              <li key={i} className={choice === str(c.answer) ? "answer" : ""}>
                {choice}
              </li>
            ))}
          </ul>
        </>
      );

    case "exit-ticket":
      return (
        <>
          <h2>{str(c.title)}</h2>
          <p className="lead">{str(c.prompt)}</p>
        </>
      );

    case "video": {
      const embed = str(c.video_url);
      // Live-generated slides carry a search intent, not a URL (the model
      // isn't trusted to invent YouTube links). Turn that into a real search.
      const search =
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(str(c.search_query) || str(c.title));
      return (
        <>
          <h2>{str(c.title)}</h2>
          {embed ? (
            <iframe
              className="video"
              src={embed}
              title={str(c.title)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <a className="video placeholder" href={search} target="_blank" rel="noreferrer">
              ▶ Find this clip on YouTube ↗
            </a>
          )}
          <p className="caption">{str(c.caption)}</p>
        </>
      );
    }
  }
}

// content is an untyped bag (it varies by slide type) — narrow at the edge.
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

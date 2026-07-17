import type { Deck, Slide, SlideType } from "./types";

// A progress event from the backend pipeline (newline-delimited JSON).
export interface ProgressEvent {
  type: "log" | "outline" | "slide" | "done";
  message?: string;
  moves?: string[];
  slide_type?: SlideType;
  status?: "ok" | "failed";
  deck?: Deck;
  slide?: Slide;
}

// POST a JSON body and read the NDJSON stream, calling onEvent per line.
async function streamNdjson(
  url: string,
  body: unknown,
  onEvent: (ev: ProgressEvent) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer.trim()));
}

export async function generateDeck(
  subject: string,
  grade: string,
  demo: boolean,
  onEvent: (ev: ProgressEvent) => void,
): Promise<Deck> {
  let deck: Deck | null = null;
  await streamNdjson("/api/generate/stream", { subject, grade, demo }, (ev) => {
    if (ev.type === "done" && ev.deck) deck = ev.deck;
    onEvent(ev);
  });
  if (!deck) throw new Error("No deck returned");
  return deck;
}

export async function regenerateSlide(
  subject: string,
  grade: string,
  slide: Slide,
  targetType: SlideType | null,
  demo: boolean,
  onEvent: (ev: ProgressEvent) => void,
): Promise<Slide> {
  let out: Slide | null = null;
  await streamNdjson(
    "/api/regenerate/stream",
    { subject, grade, slide, target_type: targetType, demo },
    (ev) => {
      if (ev.type === "done" && ev.slide) out = ev.slide;
      onEvent(ev);
    },
  );
  if (!out) throw new Error("No slide returned");
  return out;
}

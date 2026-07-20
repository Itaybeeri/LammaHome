import type { CustomTypeDef, Deck, PedagogyBlock, Slide } from "./types";

// The fixed base prompt + the default, editable pedagogy blocks.
export async function getPedagogy(): Promise<{ base_system: string; blocks: PedagogyBlock[] }> {
  const res = await fetch("/api/pedagogy");
  if (!res.ok) throw new Error(`Pedagogy fetch failed (${res.status})`);
  return res.json();
}

// A progress event from the backend pipeline (newline-delimited JSON).
export interface ProgressEvent {
  type: "note" | "call" | "result" | "error" | "done";
  message?: string;
  stage?: "outline" | "fill";
  model?: string;
  schema?: string;
  system?: string;
  prompt?: string;
  slide_type?: string;
  status?: "ok" | "failed";
  response?: unknown;
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
  pedagogy?: string[] | null,
  customTypes?: CustomTypeDef[] | null,
  plan?: string[] | null,
): Promise<Deck> {
  let deck: Deck | null = null;
  let err: string | null = null;
  const body = { subject, grade, demo, pedagogy, custom_types: customTypes, plan };
  await streamNdjson("/api/generate/stream", body, (ev) => {
    if (ev.type === "done" && ev.deck) deck = ev.deck;
    if (ev.type === "error" && ev.message) err = ev.message;
    onEvent(ev);
  });
  if (err) throw new Error(err);
  if (!deck) throw new Error("No deck returned");
  return deck;
}

export async function regenerateSlide(
  subject: string,
  grade: string,
  slide: Slide,
  targetType: string | null,
  demo: boolean,
  onEvent: (ev: ProgressEvent) => void,
  customTypes?: CustomTypeDef[] | null,
): Promise<Slide> {
  let out: Slide | null = null;
  let err: string | null = null;
  await streamNdjson(
    "/api/regenerate/stream",
    { subject, grade, slide, target_type: targetType, demo, custom_types: customTypes },
    (ev) => {
      if (ev.type === "done" && ev.slide) out = ev.slide;
      if (ev.type === "error" && ev.message) err = ev.message;
      onEvent(ev);
    },
  );
  if (err) throw new Error(err);
  if (!out) throw new Error("No slide returned");
  return out;
}

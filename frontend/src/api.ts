import type { Deck, Slide, SlideType } from "./types";

// Requests go to /api/* and Vite proxies them to the FastAPI backend.

export async function generateDeck(subject: string, grade: string): Promise<Deck> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, grade }),
  });
  if (!res.ok) throw new Error(`Generate failed (${res.status})`);
  return res.json();
}

export async function regenerateSlide(
  subject: string,
  grade: string,
  slide: Slide,
  targetType: SlideType | null,
): Promise<Slide> {
  const res = await fetch("/api/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, grade, slide, target_type: targetType }),
  });
  if (!res.ok) throw new Error(`Regenerate failed (${res.status})`);
  return res.json();
}

// Mirrors backend/app/models.py. Kept deliberately small.

export type SlideType =
  | "hook"
  | "concept"
  | "check-for-understanding"
  | "exit-ticket"
  | "video";

export const SLIDE_TYPES: SlideType[] = [
  "hook",
  "concept",
  "check-for-understanding",
  "exit-ticket",
  "video",
];

export interface Slide {
  id: string;
  type: SlideType;
  intent: string;
  content: Record<string, unknown>;
  status: "ok" | "failed";
}

export interface Deck {
  subject: string;
  grade: string;
  slides: Slide[];
}

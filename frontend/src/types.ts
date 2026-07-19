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
  type: string; // a built-in SlideType or a custom type name
  intent: string;
  content: Record<string, unknown>;
  status: "ok" | "failed";
}

// A teacher-defined slide-type block. It becomes a first-class move the planner
// can use and the renderer shows generically.
export interface CustomTypeDef {
  name: string;
  emoji: string;
  instruction: string;
}

export interface Deck {
  subject: string;
  grade: string;
  slides: Slide[];
}

// An editable pedagogy rule. Enabled blocks are assembled into the AI's lesson-
// planning prompt, so the teacher composes the pedagogy from building blocks.
export interface PedagogyBlock {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
}

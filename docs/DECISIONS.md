# Decisions

A flat, running log of the choices that shape this project: **what I chose, over what, and
why.** Ships with the repo (unlike INTERVIEW-PREP.md). Two jobs:

1. It's the seed for the slide deck — the brief asks me to "document it as an assumption."
2. It means the 15-min code walkthrough has a paper trail: every non-obvious file has a
   reason recorded here.

Format per entry: **Decision → Chosen / Rejected → Why.** Newest at top.
Status tags: `LOCKED` = decided, defend it. `OPEN` = still deciding.

---

## D-003 · Process: run Brainstorm → Plan → Implement once for the whole project  · LOCKED

- **Chosen:** A single lightweight lifecycle for the whole assignment — brainstorm the
  product, write one spec, one implementation plan, then build.
- **Rejected:** (a) My full `project-template` with ADRs, a five-phase *per-feature*
  lifecycle, AI review gates, and a command-center dashboard. (b) No process at all.
- **Why:** The template solves a long-lived, many-feature, multi-month problem — the exact
  opposite of a one-feature, 5–10 hour assignment. Its ceremony would eat the time budget and
  signal the wrong taste for a brief that says "one done well beats three done superficially."
  But zero process loses the paper trail that the code walkthrough rewards. So: keep the
  template's two best *habits* (this file + the brainstorm→plan→build flow), drop its
  machinery.

## D-002 · Presentation is the container; video is one slide type  · LEANING LOCKED

- **Chosen:** Build a slide presentation. Treat "video" not as an alternative output but as
  **one kind of slide** the system can produce when the prompt calls for it.
- **Rejected:** Pick "presentation" OR "video" as the whole output (the brief's framing).
- **Why:** The fork is a false one. Slides are the frame; different slide *types* get
  generated per need. This is the "modular output" bonus arrived at naturally, not checked off
  a list — which makes it defensible. (Generated-vs-embedded video is a separate open call,
  see INTERVIEW-PREP §4.3.)

## D-001 · Fresh, thin repo — not the personal template  · LOCKED

- **Chosen:** Start empty. Add only: `README.md` (required by brief), `docs/DECISIONS.md`
  (this file), and application code. Anything else has to earn its place.
- **Rejected:** Copy `F:\Development\project-template` in as the starting structure.
- **Why:** The 15-min code walkthrough grades whether every file has a reason to exist *for
  this project*. "It came from my template" is the one answer that actively hurts. Thin repo =
  higher signal-per-file.

---

## Open decisions (not yet made — placeholders so they don't get lost)

- **D-00x · The user.** Leaning K-12 teacher (Lamma's real user). Not locked — waiting on a
  demo scenario I actually find compelling. `OPEN`
- **D-00x · What *is* a slide?** Generic (`title/bullets/image`) vs. pedagogical "moves"
  (hook / concept / check-for-understanding / exit-ticket). `OPEN`
- **D-00x · Generation strategy.** One-shot whole deck vs. outline-then-fill-each-slide.
  `OPEN`
- **D-00x · Editor scope.** Edit text only vs. edit structure/slide types. `OPEN`
- **D-00x · Generated vs. embedded video.** Design for generated, ship embedded? `OPEN`
- **D-00x · Tech stack.** Their stack = Python backend + React frontend; my choice is
  discussed in the follow-up. `OPEN`

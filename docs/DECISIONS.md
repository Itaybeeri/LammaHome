# Decisions

A flat, running log of the choices that shape this project: **what I chose, over what, and
why.** Ships with the repo (unlike INTERVIEW-PREP.md). Two jobs:

1. It's the seed for the slide deck — the brief asks me to "document it as an assumption."
2. It means the 15-min code walkthrough has a paper trail: every non-obvious file has a
   reason recorded here.

Format per entry: **Decision → Chosen / Rejected → Why.** Newest at top.
Status tags: `LOCKED` = decided, defend it. `OPEN` = still deciding.

---

## D-007 · Tech stack: match Lamma — Python backend + React frontend  · LOCKED

- **Chosen:** Python backend, React frontend — deliberately mirroring Lamma's stack.
- **Rejected:** A single-language / faster-for-me stack (e.g. all-TS Next.js).
- **Why:** I'm fluent in both, so matching costs nothing and buys the "can drop into your
  codebase day one" signal for free. When you're equally fast in their stack, matching it is
  strictly dominant. (If I were faster elsewhere the answer would flip — the brief rewards
  productivity, not résumé stack.)
- **Sub-picks (defaults, low-controversy):** FastAPI (async, typed, ideal for an AI
  pipeline); Vite + React + TypeScript; **AI provider = Anthropic (Claude)** — its tool-use
  makes "return valid slide JSON" reliable, which the whole pipeline leans on.

## D-006 · Editor scope: fix-and-regenerate, not full canvas editing  · LOCKED

- **Chosen (Tier 2):** The teacher can edit a slide's text, **regenerate a single slide**
  ("redo this, simpler"), and delete / reorder slides.
- **Rejected:** Tier 3 full editability (add arbitrary slides, change a slide's type,
  drag-canvas editing, undo/redo) — and Tier 1 (text-only).
- **Why:** The editor's *purpose* is teacher **accountability** — fix what the AI got wrong
  before it's in front of 30 kids — not rebuilding Google Slides. Tier 2 satisfies that and
  *feels* like full control in a demo, at ~half the cost. Crucially, full editing would pour
  the scarce 5–10h budget into UI plumbing they **don't** grade, starving the pipeline they
  **do**. The cut is itself a strong interview answer (brief says: document cuts as
  assumptions).
- **Killer feature:** "regenerate this one slide" proves the pipeline is addressable at slide
  granularity — the best demo moment for an *AI* product, and it lives in Tier 2.

## D-005 · User = K-12 teacher prepping a lesson  · LOCKED

- **Chosen:** The user is a K-12 teacher building tomorrow's lesson (Lamma's real user).
- **Rejected:** Adjacent ed users (student/tutor/lecturer); non-ed users (sales/conference).
- **Why:** Reached this by *consequence*, not persuasion — D-004's domain slide types
  (`check-for-understanding`, `exit-ticket`) only make sense with a classroom behind them, and
  D-006's "accountability" framing only bites for someone answerable to a class. The domain's
  real constraints (curriculum, grade reading level, factual stakes) are what make the
  engineering interesting. Risk (judged by domain-expert founders) is handled by stating the
  boundary of what I know, not faking fluency — see INTERVIEW-PREP §4.1.

## D-004 · Slide = a pedagogical "move," rendered PowerPoint-style  · LOCKED

- **Chosen:** Keep a familiar PowerPoint interaction/rendering model (slides you click
  through), but the slide **`type`** field takes *domain* values — e.g. `hook`, `concept`,
  `check-for-understanding`, `exit-ticket` — not generic ones. The pipeline emits a
  structured lesson; each type is its own little schema + renderer.
- **Rejected:** Generic slide types (`title` / `bullets` / `image` / `quote`) = literal
  PowerPoint.
- **Why:** The two are *orthogonal* — same PowerPoint feel, same build cost (it's a `type`
  string either way), identical demo. The only difference is defensibility: "why these types?"
  has a real answer ("a lesson has a hook, a concept, a comprehension check, an exit ticket —
  my slide types are the teacher's actual moves") vs. "...they're the standard ones." Same
  cost, all the signal. This resolves the "what is a slide?" open question and ties the
  product to Lamma's user (K-12 teacher).
- **Consequence:** confirms the leaning-K-12-teacher user (needs its own entry once the demo
  scenario is set), and makes the "slide type = plugin" modular-output story concrete.

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

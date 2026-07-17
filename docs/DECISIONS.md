# Decisions

A flat, running log of the choices that shape this project: **what I chose, over what, and
why.** Ships with the repo (unlike INTERVIEW-PREP.md). Two jobs:

1. It's the seed for the slide deck — the brief asks me to "document it as an assumption."
2. It means the 15-min code walkthrough has a paper trail: every non-obvious file has a
   reason recorded here.

Format per entry: **Decision → Chosen / Rejected → Why.** Newest at top.
Status tags: `LOCKED` = decided, defend it. `OPEN` = still deciding.

---

## D-011 · Ship local-only — do not deploy; document the production path instead  · LOCKED

- **Chosen:** Deliver a locally-run app (README + `run.ps1` / `run.sh`). Do **not** deploy to
  AWS or any host.
- **Rejected:** Standing the app up at a public URL (AWS ECS / Amplify / Lambda, etc.).
- **Why:** the brief asks for a repo + "a README explaining how to run it **locally**," grades
  reasoning / end-to-end / code-understanding, and *explicitly* does not reward production
  polish ("we're not looking for a production-grade product"). Deploying would spend ~2-4 of the
  5-10h budget on **ungraded** infra — the wrong taste under "one done well beats three done
  superficially." It's also *worse* for the demo: a live cloud + live-API URL is **more** fragile
  than driving locally against the pre-generated fallback deck (D-009), reintroducing the exact
  latency/flakiness risk that deck was built to remove. BYO-key + public deploy adds
  secret-management and metered-cost risk for zero upside.
- **With more time (the interview answer):** containerize the two services; put the pipeline
  behind a rate-limited API on ECS/Lambda; move the key server-side; cache generated decks; add
  persistence. Deciding *not* to build this is itself the signal — knowing when infra is scope
  creep vs. when it earns its cost.

## D-010 · Failure handling: retry once, then a regeneratable placeholder slide  · LOCKED

- **Chosen:** Prevent → validate → retry → placeholder. (1) Generate each slide via Claude
  **tool-use / JSON schema** so malformed output is rare *by construction* (the D-007 reason
  for picking Claude). (2) **Validate** each fill result against that slide type's Pydantic
  schema. (3) On failure, **retry once**, feeding the validation error back to the model. (4)
  On final failure, **keep the outline slot** and render a placeholder card ("this slide
  couldn't be generated — regenerate") that the teacher re-runs with the **existing regenerate
  action**.
- **Rejected:** (a) *silently drop* the failed slide — briefly chosen, then reversed: it hides
  the failure and thins the lesson arc (worst case drops a load-bearing slide). (b) Fail the
  *whole deck* on one bad slide — worst UX, throws away good slides.
- **Why:** the failure path **reuses the happy path** — a failed slide is just a slide waiting
  to be regenerated, the *same button* as the D-009 peak / D-006 killer feature. No special
  "error mode." Failure stays **visible** (accountability thesis, D-005). Keeping the outline
  slot means the deck never thins, which resolves "does the flow still read reasonably after a
  failure?" better than drop did — the load-bearing-slide edge case disappears. Per-slide blast
  radius (D-008) makes it cheap: one slot, one retry, one card.
- **Interview line:** "I didn't special-case failure — I made the unhappy path fall back onto
  a tool I already had. The regenerate button has two triggers: user intent, and generation
  failure."

## D-009 · Demo scenario: one thin prompt, peak = regenerate a slide as a different pedagogical move  · LOCKED

- **Chosen:** The live demo runs ONE scripted scenario. Prompt = `photosynthesis for 7th
  grade` (subject + grade only). Arc: type prompt → AI shows the **inferred plan** (~6 slides,
  the moves, ~40 min) → click through the deck → hit a `video` slide ("plugin, swappable
  generator") → **PEAK: on a `concept` slide, regenerate it as a `check-for-understanding`**
  ("they won't get this from explanation alone — let me verify they did") → inline-edit one
  slide's text. Runs against a **pre-generated fallback deck** so latency / API flakiness can't
  sink it.
- **Rejected:** (a) rich prompt where the teacher specifies structure/length — less magic,
  makes the pipeline look like templating; (b) "regenerate *simpler*" as the peak — only shows
  a text transformation any LLM does, not *my* slide model; (c) a clever topic (e.g. French
  Revolution) — steals the audience's attention onto whether the AI got the *domain* right.
- **Why:** the peak is the one beat that can *only* exist because slides are pedagogical moves
  (D-004) — a domain-expert audience (Itay + Yoav) reads it instantly. Thin prompt shows the AI
  doing *pedagogical reasoning* (Lamma's whole pitch); grade is the one required input that
  visibly drives reading level. Cliché topic = clear glass, attention stays on the system.
  `concept → check` is the most natural real-teacher move and the *least* arc-breaking swap
  (a lesson wants a check after a concept).
- **Input decision (locked here):** teacher types **subject + grade**; the AI infers
  structure/length. (Chosen over "just the idea" = too much guessing on grade, which is the
  factual-stakes axis; and over "idea + grade + structure" = kills the reasoning demo.)
- **Honest limit to *bait* in Q&A:** changing one slide's move can break the lesson arc; v1
  swaps in place, v2 would re-validate the whole outline after an edit. (= the "how you think
  about failure" signal, handed over for free.)

## D-008 · Generation strategy: outline-then-fill, not one-shot  · LOCKED

- **Chosen:** Two-stage pipeline. **Stage 1** generates an *outline* (ordered list of moves +
  a one-line intent per slide) from subject + grade. **Stage 2** *fills* each slide
  independently (async / in parallel) using that outline as context.
- **Rejected:** one-shot whole-deck generation (a single call returns the entire deck JSON).
- **Why:** it makes every locked feature *cheap* instead of bolted-on. "Regenerate this slide"
  = re-run *fill* for one slide; "regenerate as a different move" (D-009 peak) = re-run *fill*
  with a different target type — both fall out for free. Failure handling shrinks to **one
  slide's** JSON (validate + retry per slide, small blast radius) instead of a whole deck's.
  The outline is the artifact the demo shows in beat 2. FastAPI's async (D-007) fills slides in
  parallel, softening the only real downside (more calls = more latency).
- **Cost / mitigation:** outline↔fill *drift* — a slide can wander off its planned intent.
  Mitigated by passing the outline into each fill call as context.
- **Provenance:** this fell OUT of the demo (D-009). Showing the plan *and* per-slide
  regeneration both require a plan-as-artifact + per-slide-generation primitive — which *is*
  outline-then-fill. The demo forced the architecturally coherent choice.

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
- **Rejected:** Tier 3 full editability (add arbitrary slides, **manual** canvas type-change
  via a dropdown, drag-canvas editing, undo/redo) — and Tier 1 (text-only).
- **Boundary clarified (see D-009):** "regenerate this slide as a *different pedagogical move*"
  is IN scope and stays Tier 2 — it's an **AI** operation (re-run the fill step with a
  different target type per D-008), *not* the manual canvas type-change we rejected. Same
  machinery as per-slide regenerate + one parameter; costs ~nothing on top of Tier 2.
- **Why:** The editor's *purpose* is teacher **accountability** — fix what the AI got wrong
  before it's in front of 30 kids — not rebuilding Google Slides. Tier 2 satisfies that and
  *feels* like full control in a demo, at ~half the cost. Crucially, full editing would pour
  the scarce 5–10h budget into UI plumbing they **don't** grade, starving the pipeline they
  **do**. The cut is itself a strong interview answer (brief says: document cuts as
  assumptions).
- **Killer feature:** "regenerate this slide **as a different pedagogical move**" (D-009 peak)
  proves the pipeline is addressable at slide granularity *and* that the slide model is real —
  the best demo moment for an *AI* product, and it lives in Tier 2.

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

- **D-00x · Failure handling.** What happens when a *fill* call (D-008) returns invalid JSON:
  validate against the slide-type schema, retry N times, then fall back to what? (Per-slide
  blast radius, per D-008.) ← **next up.** `OPEN`
- **D-00x · Generated vs. embedded video.** Design for generated, ship embedded? (§4.3 of
  INTERVIEW-PREP.) `OPEN`
- **D-00x · Slide-type "plugin" boundary in code.** What exactly each type owns (schema +
  renderer + fill-prompt) and how a new type is registered. `OPEN`

*Resolved and promoted above: the user (D-005), what a slide is (D-004), generation strategy
(D-008), editor scope (D-006), tech stack (D-007), demo scenario + input shape (D-009).*

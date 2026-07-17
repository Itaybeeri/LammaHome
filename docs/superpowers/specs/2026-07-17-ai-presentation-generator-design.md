# Design: AI Presentation Generator (Lamma home assignment)

> Consolidated design spec. Ships with the repo — it doubles as the "architecture overview"
> deliverable. Every choice here has a full "chose X over Y because Z" entry in
> [`docs/DECISIONS.md`](../../DECISIONS.md); decision IDs (D-0xx) cross-reference it.
>
> Status: **design complete (D-001..D-010).** Next step: implementation plan (writing-plans).
> Date: 2026-07-17.

---

## 1. One-sentence version

A K-12 teacher types a lesson idea (subject + grade) into a browser; an AI pipeline generates a
clickable slide deck of **pedagogical moves**; the teacher fixes what the AI got wrong —
including regenerating a single slide as a *different* move — before using it.

The app is deliberately small (≈2 evenings). It is **evidence of reasoning**, not a product:
the brief grades how I frame a vague problem, work end-to-end, collaborate with AI, and
understand every line I ship.

## 2. The user  (D-005)

**A K-12 teacher prepping tomorrow's lesson** — Lamma's real user.

The teacher is reached *by consequence*, not asserted up front: the domain slide types (§3) and
the editor's accountability purpose (§6) only make sense with a classroom behind them. The
domain's real constraints — curriculum, grade reading level, class-period length, and **factual
correctness with stakes** (wrong info = the teacher's credibility in front of 30 kids) — are
what make the engineering non-trivial. A generic "sales deck" user would make this a text-to-JSON
toy with nothing to defend.

Known risk: I am not a teacher, and I am judged by domain-expert founders. Handled by **stating
the boundary of what I assumed** (3 assumptions about this user, what changes if they're wrong,
how I'd validate them in week one) rather than faking fluency.

## 3. The output model: a slide is a pedagogical "move"  (D-002, D-004)

- **The presentation is the container; a video is one *type* of slide** (D-002), not an
  alternative output. This is the brief's "presentation or video" fork refused — the
  "modular output" bonus arrived at naturally.
- **Interaction/rendering is PowerPoint-style** (click through slides). Familiar, cheap.
- **The slide `type` field takes *domain* values, not generic ones** (D-004): `hook`,
  `concept`, `check-for-understanding`, `exit-ticket`, `video`. Same build cost as
  `title/bullets/image` (it's a `type` string either way), but defensible: "a lesson has a
  hook, a concept, a comprehension check, an exit ticket — my slide types are the teacher's
  actual moves."

### Slide type = a plugin

Each slide type owns three things:

| Piece        | Backend                          | Frontend                     |
|--------------|----------------------------------|------------------------------|
| **Schema**   | Pydantic model (validates fills) | TypeScript type              |
| **Fill prompt** | how stage 2 generates *this* type | —                         |
| **Renderer** | —                                | React component for the type |

Adding a new type (e.g. a *generated*-video slide, or an interactive quiz) = registering one
more `{schema, fill-prompt, renderer}` triple. The exact registry shape is left to settle during
implementation (it is not load-bearing to the design).

## 4. Architecture & data flow  (D-007, D-008)

**Stack (D-007):** Python + FastAPI backend, React + Vite + TypeScript frontend — deliberately
matching Lamma's stack (equal fluency → matching is strictly dominant for the "drop into your
codebase day one" signal). **AI provider = Anthropic Claude**, chosen because its **tool-use**
makes "return valid slide JSON" reliable — the whole pipeline leans on that.

**Generation strategy: outline-then-fill (D-008), not one-shot.**

```
Teacher types {subject, grade}
        │
        ▼
POST /generate ──► Stage 1: OUTLINE  (1 Claude tool-use call)
                     → ordered list of moves + one-line intent each
                     → shown to the teacher (demo beat 2)
        │
        ▼
                   Stage 2: FILL  (1 tool-use call PER slide, async / parallel)
                     → each call is schema-constrained to its slide type
                     → the outline is passed in as context (anti-drift)
                     → validate (Pydantic) ─► on failure: retry once ─► placeholder (§6)
        │
        ▼
Deck = ordered list of typed slides ──► React renders each slide BY TYPE (§3 plugin)
```

Why outline-then-fill wins here: it makes every locked feature *cheap*.
- "Regenerate this slide" = re-run **fill** for one slide.
- "Regenerate as a different move" = re-run **fill** with a different target type.
- Failure handling shrinks to **one slide's** JSON (§7), not a whole deck's.
- The outline is a first-class artifact — the thing the demo shows before slides exist.
- FastAPI async fills slides in parallel, softening the only downside (more calls = more latency).

The one cost — outline↔fill **drift** (a slide wandering off its planned intent) — is mitigated
by passing the outline into each fill call.

### Endpoints (thin)

- `POST /generate {subject, grade}` → runs stages 1–2, returns the deck.
- `POST /regenerate {slide_id, targetType?}` → re-runs **fill** for one slide. **One endpoint,
  two callers:** the teacher regenerating a slide as a different move (§5 editor / §7 demo peak)
  *and* recreating a failed placeholder (§6). No special error path.
- Inline text edits + delete/reorder are deck-state operations (client-authoritative; a save
  endpoint if persistence is added — persistence is not required for the assignment).

## 5. The editor  (D-006)

**Tier 2 — fix-and-regenerate, not full canvas editing.** The teacher can:
1. **Edit a slide's text** inline.
2. **Regenerate a single slide** — including *as a different pedagogical move* (an **AI**
   operation via `/regenerate`, distinct from the rejected *manual dropdown* type-change).
3. **Delete / reorder** slides.

Rejected: Tier 3 (add arbitrary slides, manual canvas type-change, drag-editing, undo/redo) —
it pours the scarce 5–10h budget into UI plumbing the brief doesn't grade, starving the pipeline
it does. Rejected: Tier 1 (text-only) — too thin to show the pipeline is addressable.

The editor's *purpose* is teacher **accountability**: fix what the AI got wrong before it's in
front of 30 kids — not rebuilding Google Slides. "Regenerate this one slide" is the killer
feature: it proves the pipeline is addressable at slide granularity, the best demo moment for an
*AI* product.

## 6. Failure handling  (D-010)

Four layers, cheap because of the per-slide blast radius (D-008):

1. **Prevent** — generate via Claude tool-use / JSON schema, so malformed output is rare *by
   construction*.
2. **Validate** — each fill result against its slide type's Pydantic schema.
3. **Retry once** — feeding the validation error back to the model.
4. **Placeholder** — on final failure, **keep the outline slot** and render a "this slide
   couldn't be generated — regenerate" card the teacher re-runs with the **existing regenerate
   action** (§4).

The failure path **reuses the happy path**: a failed slide is just a slide waiting to be
regenerated — same button as §5's killer feature. No special "error mode." Failure stays
*visible* (accountability, §2), and keeping the slot means the deck never thins.

Rejected: silently dropping the failed slide (hides failure, can drop a load-bearing slide);
failing the whole deck on one bad slide (worst UX).

## 7. The demo  (D-009)

One scripted 10-minute run — **it drives the whole product design**:

1. Type `photosynthesis for 7th grade` (input = **subject + grade** only; the AI infers
   structure/length). Hit generate.
2. **AI shows its inferred plan** (~6 slides: hook → 2× concept → check → exit ticket, ~40 min).
   *This is outline-then-fill (§4) made visible.*
3. Click through the deck. Land on the `video` slide → "this type is a plugin; same interface,
   swap the generator."
4. **PEAK — on a `concept` slide:** "they won't get this from explanation alone — let me verify
   they did" → **regenerate it as a `check-for-understanding`.** One click proves the slide model
   is real, the pipeline is addressable per-slide, and the teacher overrides the AI's call.
5. **Inline-edit** one slide's text (the Tier 2 proof).
6. Runs against a **pre-generated fallback deck** so live-API latency/flakiness can't sink it.

Topic is a cliché *on purpose* — a clear pane of glass so a domain-expert audience watches the
*system*, not whether the AI got the domain right.

Q&A limit to **bait, not hide:** changing one slide's move can break the lesson arc; v1 swaps in
place, v2 would re-validate the outline after an edit. (= the "how you think about failure"
signal.)

## 8. Process, repo, scope discipline  (D-001, D-003)

- **Thin repo** (D-001): only `README.md`, `docs/`, and application code. Every file must earn
  its place — the 15-min code walkthrough grades exactly that.
- **Lightweight process once** (D-003): one brainstorm → one spec (this file) → one plan → build.
  Not the heavyweight per-feature template; not zero process.

## 9. What's deferred (not blocking the build)

- **Generated vs. embedded video** — design for generated, **ship embedded** (a YouTube embed).
  "Generated-video slide" is just a plugin (§3) not yet written; demo the embed working, say
  "same interface, swap the generator." Architectural credit for the hard version without
  betting the demo on a black box. Decide when building the video type.
- **Exact plugin-registry shape** — settles itself when the first slide type is written.
- **Persistence** — not required for the assignment; decks live in memory / client state.

## 10. Deliverables mapping (so nothing is orphaned)

- **Code + README** → the app above, thin repo, run instructions in README (written once there's
  something to run).
- **Slide deck** → seeded by this spec + `docs/DECISIONS.md`: architecture (§4), key design
  decisions (all of it), what works/doesn't (§9 + honest limits), how I worked with AI (fill in
  from the actual build), what I'd do with more time (§6 placeholder→richer recovery, §7 arc
  re-validation, generated video, persistence).
- Repo must be accessible to **itay@lamma-ed.com** and **yoav@lamma-ed.com** before the deadline
  (~2026-07-22) — add as collaborators on the private repo, or make it public.

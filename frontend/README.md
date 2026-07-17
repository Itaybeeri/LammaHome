# Frontend — React + Vite + TypeScript

The browser half: a prompt box, a click-through slide viewer, and the Tier-2
editor controls. See the [root README](../README.md) for the big picture; this
file is a tour of the folder for the code walkthrough.

## Files

```
src/
  App.tsx              app state + orchestration (owns the deck)
  api.ts               fetch wrappers for /api/generate and /api/regenerate
  types.ts             TS mirror of the backend slide models
  index.css            styling; per-move color themes live here
  components/
    PromptBox.tsx      subject (datalist of 20 ideas + free text) + grade dropdown
    Deck.tsx           filmstrip, click-through stage, Tier-2 controls, text editor
    Slide.tsx          renders a slide BY TYPE — the frontend "plugin" renderer
```

## Run it standalone

```bash
npm install
npm run dev
```

Serves on **http://localhost:5273**. `vite.config.ts` proxies `/api/*` to the
backend on port 8000, so start the backend too (or use the root `run` script,
which starts both).

## How it fits together

- **`App.tsx`** holds the only real state: the current `deck`, plus loading /
  busy / error flags. Generate replaces the deck; regenerate swaps one slide;
  edit / delete / reorder are pure local updates to the deck array (no server
  round-trip — that's what makes them Tier 2 and cheap).
- **`Slide.tsx`** is the plugin renderer: a `META` map (emoji + label per move)
  and a `switch` on `slide.type`. The `type-<name>` class it sets is what drives
  the per-move color in `index.css`. Add a move = add a `META` entry + a `case`.
- **`Deck.tsx`** is the viewer + controls. The filmstrip chips show the inferred
  plan (the outline made visible). The `SlideEditor` is generic: every string
  field in a slide's content becomes an input, every string-list a textarea, so
  it works for any slide type without per-type edit code.

## The color coding

Each pedagogical move has its own color + emoji (hook = orange 🎣, concept =
blue 💡, check = green ✅, exit-ticket = purple 🎟️, video = pink 🎬), defined as
`.type-<name>` CSS variables in `index.css` and applied via the class `Slide.tsx`
sets. It's cheerful, and it makes a move-change visible — regenerating a blue
`concept` into a green `check` visibly changes the card's color.

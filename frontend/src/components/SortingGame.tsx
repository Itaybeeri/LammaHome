import { useMemo, useState } from "react";

// An actual, playable sort-into-categories game. The AI produces the data
// (categories + items with their correct category); the student clicks an item
// then a bucket to place it, then checks. Correct = green, wrong = red.

interface GameItem { text: string; category: string; }

export default function SortingGame({ content }: { content: Record<string, unknown> }) {
  const prompt = typeof content.prompt === "string" ? content.prompt : "";
  const categories = useMemo(
    () => (Array.isArray(content.categories) ? content.categories.map(String) : []),
    [content.categories],
  );
  const items = useMemo<GameItem[]>(
    () =>
      (Array.isArray(content.items) ? content.items : [])
        .map((it) => it as GameItem)
        .filter((it) => it && typeof it.text === "string"),
    [content.items],
  );

  // placement[i] = category index the item is in, or -1 for the unsorted pool.
  const [placement, setPlacement] = useState<number[]>(() => items.map(() => -1));
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  if (!categories.length || !items.length) {
    return <p>{prompt || "This game has no items."}</p>;
  }

  const place = (cat: number) => {
    if (selected === null) return;
    setPlacement((p) => p.map((v, i) => (i === selected ? cat : v)));
    setSelected(null);
    setChecked(false);
  };
  const pick = (i: number) => {
    setSelected((s) => (s === i ? null : i));
  };
  const reset = () => {
    setPlacement(items.map(() => -1));
    setSelected(null);
    setChecked(false);
  };

  const isCorrect = (i: number) => placement[i] >= 0 && categories[placement[i]] === items[i].category;
  const allPlaced = placement.every((p) => p >= 0);
  const correctCount = items.filter((_, i) => isCorrect(i)).length;
  const solved = checked && correctCount === items.length;

  const chip = (i: number) => {
    const cls = ["game-chip"];
    if (selected === i) cls.push("selected");
    if (checked && placement[i] >= 0) cls.push(isCorrect(i) ? "right" : "wrong");
    return (
      <button type="button" key={i} className={cls.join(" ")} onClick={() => pick(i)}>
        {items[i].text}
      </button>
    );
  };

  return (
    <div className="game">
      <p className="game-prompt">{prompt}</p>

      <div className="game-pool" aria-label="Unsorted items">
        {items.map((_, i) => (placement[i] === -1 ? chip(i) : null))}
        {allPlaced && <span className="game-hint">All placed — check your answers!</span>}
      </div>

      <div className="game-bins">
        {categories.map((cat, c) => (
          <div key={c} className="game-bin">
            <button type="button" className="game-bin-head" onClick={() => place(c)}>
              {cat}
              {selected !== null && <span className="drop-hint"> ← drop here</span>}
            </button>
            <div className="game-bin-body">
              {items.map((_, i) => (placement[i] === c ? chip(i) : null))}
            </div>
          </div>
        ))}
      </div>

      <div className="game-controls">
        <button type="button" className="game-check" onClick={() => setChecked(true)} disabled={!allPlaced}>
          Check answers
        </button>
        <button type="button" onClick={reset}>Reset</button>
        {checked && (
          <span className={`game-score ${solved ? "solved" : ""}`}>
            {solved ? "🎉 Solved!" : `${correctCount} / ${items.length} correct`}
          </span>
        )}
      </div>
    </div>
  );
}

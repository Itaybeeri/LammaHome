import { useEffect, useState } from "react";
import PromptBox from "./components/PromptBox";
import DeckView from "./components/Deck";
import ProcessPanel from "./components/ProcessPanel";
import { generateDeck, regenerateSlide, type ProgressEvent } from "./api";
import type { Deck, Slide, SlideType } from "./types";

export default function App() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(false);
  const [busySlideId, setBusySlideId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveApi, setLiveApi] = useState<boolean | null>(null);
  // Source: "ai" calls Claude, "demo" serves the pre-generated deck. Chosen in
  // the UI so the live demo can run without depending on the API (D-009).
  const [mode, setMode] = useState<"ai" | "demo">("ai");
  // Live pipeline events for the "behind the scenes" panel.
  const [log, setLog] = useState<ProgressEvent[]>([]);

  // On load, find out whether a key is configured. If not, force demo mode.
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setLiveApi(d.live_api);
        if (!d.live_api) setMode("demo");
      })
      .catch(() => setLiveApi(null));
  }, []);

  const demo = mode === "demo";

  const append = (ev: ProgressEvent) => setLog((l) => [...l, ev]);

  async function handleGenerate(subject: string, grade: string) {
    setLoading(true);
    setError(null);
    setLog([]);
    try {
      setDeck(await generateDeck(subject, grade, demo, append));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(slide: Slide, targetType: SlideType | null) {
    if (!deck) return;
    setBusySlideId(slide.id);
    setError(null);
    setLog([]);
    try {
      const updated = await regenerateSlide(deck.subject, deck.grade, slide, targetType, demo, append);
      setDeck({ ...deck, slides: deck.slides.map((s) => (s.id === slide.id ? updated : s)) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusySlideId(null);
    }
  }

  // Text edits, delete, and reorder are local deck-state operations (Tier 2).
  function handleEdit(slideId: string, content: Record<string, unknown>) {
    if (!deck) return;
    setDeck({ ...deck, slides: deck.slides.map((s) => (s.id === slideId ? { ...s, content } : s)) });
  }

  function handleDelete(slideId: string) {
    if (!deck) return;
    setDeck({ ...deck, slides: deck.slides.filter((s) => s.id !== slideId) });
  }

  function handleMove(index: number, direction: -1 | 1) {
    if (!deck) return;
    const target = index + direction;
    if (target < 0 || target >= deck.slides.length) return;
    const slides = [...deck.slides];
    [slides[index], slides[target]] = [slides[target], slides[index]];
    setDeck({ ...deck, slides });
  }

  return (
    <main>
      <header>
        <h1>Lesson Generator</h1>
        <p className="tagline">Type a subject and grade — get a clickable, editable lesson.</p>
      </header>

      <PromptBox
        onGenerate={handleGenerate}
        loading={loading}
        mode={mode}
        onModeChange={setMode}
        liveApi={liveApi}
      />

      {liveApi === false && (
        <p className="banner">No API key set — "Real AI" is disabled; using the demo deck.</p>
      )}
      {error && <p className="banner error">{error}</p>}

      <div className="workspace">
        {deck && (
          <DeckView
            deck={deck}
            busySlideId={busySlideId}
            onRegenerate={handleRegenerate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMove={handleMove}
          />
        )}
        {log.length > 0 && (
          <ProcessPanel log={log} busy={loading || busySlideId !== null} />
        )}
      </div>
    </main>
  );
}

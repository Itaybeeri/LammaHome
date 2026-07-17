import { useEffect, useState } from "react";
import PromptBox from "./components/PromptBox";
import DeckView from "./components/Deck";
import { generateDeck, regenerateSlide } from "./api";
import type { Deck, Slide, SlideType } from "./types";

export default function App() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(false);
  const [busySlideId, setBusySlideId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveApi, setLiveApi] = useState<boolean | null>(null);

  // Tell the user whether they're seeing live AI output or the fallback deck.
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setLiveApi(d.live_api))
      .catch(() => setLiveApi(null));
  }, []);

  async function handleGenerate(subject: string, grade: string) {
    setLoading(true);
    setError(null);
    try {
      setDeck(await generateDeck(subject, grade));
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
    try {
      const updated = await regenerateSlide(deck.subject, deck.grade, slide, targetType);
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

      <PromptBox onGenerate={handleGenerate} loading={loading} />

      {liveApi === false && (
        <p className="banner">No API key set — showing the pre-generated demo deck.</p>
      )}
      {error && <p className="banner error">{error}</p>}

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
    </main>
  );
}

import { useEffect, useState } from "react";
import PromptBox from "./components/PromptBox";
import StructureComposer from "./components/StructureComposer";
import DeckView from "./components/Deck";
import ProcessPanel from "./components/ProcessPanel";
import PedagogyPanel from "./components/PedagogyPanel";
import SlideTypesPanel from "./components/SlideTypesPanel";
import { generateDeck, getPedagogy, regenerateSlide, type ProgressEvent } from "./api";
import { SLIDE_TYPES, type CustomTypeDef, type Deck, type PedagogyBlock, type Slide } from "./types";

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
  // Editable pedagogy building blocks (loaded from the backend).
  const [baseSystem, setBaseSystem] = useState("");
  const [pedagogy, setPedagogy] = useState<PedagogyBlock[]>([]);
  const [pedagogyLoaded, setPedagogyLoaded] = useState(false);
  // Custom slide-type blocks (seeded with one example so the feature is visible).
  const [customTypes, setCustomTypes] = useState<CustomTypeDef[]>([
    {
      name: "mini-game",
      emoji: "🎮",
      instruction: "A short on-screen interactive game students play to practice the idea.",
    },
  ]);
  // Optional teacher-chosen slide sequence (empty = let the AI plan).
  const [plan, setPlan] = useState<string[]>([]);

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

  // Load the editable pedagogy blocks.
  useEffect(() => {
    getPedagogy()
      .then((p) => {
        setBaseSystem(p.base_system);
        setPedagogy(p.blocks);
        setPedagogyLoaded(true);
      })
      .catch(() => setPedagogyLoaded(false));
  }, []);

  const demo = mode === "demo";
  // Enabled block texts to send with a generate; null = backend defaults.
  const pedagogyRules = pedagogyLoaded
    ? pedagogy.filter((b) => b.enabled).map((b) => b.text.trim()).filter(Boolean)
    : null;
  // Only send fully-specified custom blocks.
  const customTypesToSend = customTypes.filter((c) => c.name.trim() && c.instruction.trim());
  // Optional teacher-chosen slide sequence (empty = AI plans).
  const builtinTypes = new Set(SLIDE_TYPES);
  const availableTypes = [...SLIDE_TYPES, ...customTypesToSend.map((c) => c.name)];

  const append = (ev: ProgressEvent) => setLog((l) => [...l, ev]);

  async function handleGenerate(subject: string, grade: string) {
    setLoading(true);
    setError(null);
    setLog([]);
    try {
      setDeck(
        await generateDeck(
          subject, grade, demo, append, pedagogyRules, customTypesToSend, plan.length ? plan : null,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(slide: Slide, targetType: string | null) {
    if (!deck) return;
    setBusySlideId(slide.id);
    setError(null);
    setLog([]);
    try {
      const updated = await regenerateSlide(
        deck.subject, deck.grade, slide, targetType, demo, append, customTypesToSend,
      );
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

      <StructureComposer
        availableTypes={availableTypes}
        builtin={builtinTypes}
        plan={plan}
        onChange={setPlan}
      />

      {liveApi === false && (
        <p className="banner">No API key set — "Real AI" is disabled; using the demo deck.</p>
      )}
      {error && <p className="banner error">{error}</p>}

      {pedagogyLoaded && (
        <PedagogyPanel baseSystem={baseSystem} blocks={pedagogy} onChange={setPedagogy} />
      )}
      <SlideTypesPanel builtins={SLIDE_TYPES} customTypes={customTypes} onChange={setCustomTypes} />

      <div className="workspace">
        {deck && (
          <DeckView
            deck={deck}
            busySlideId={busySlideId}
            customTypeNames={customTypesToSend.map((c) => c.name)}
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

import { useState } from "react";
import SubjectCombo from "./SubjectCombo";

// The whole input surface: a subject and a grade. Everything else about the
// lesson (length, structure, which moves) is inferred by the AI.

// Suggested subjects — shown as a dropdown, but the field still accepts free
// text. Chosen to lean on visual processes and factual stakes, where the
// pedagogical-move slide model has the most to work with.
const SUBJECT_IDEAS = [
  "Photosynthesis",
  "The water cycle",
  "Newton's laws of motion",
  "Adding and subtracting fractions",
  "The American Revolution",
  "Ancient Egypt",
  "The solar system",
  "Cell structure and function",
  "The causes of World War I",
  "How volcanoes form",
  "The Pythagorean theorem",
  "Ecosystems and food chains",
  "The human circulatory system",
  "Supply and demand",
  "The states of matter",
  "Plate tectonics",
  "Parts of speech",
  "The scientific method",
  "The Civil Rights Movement",
  "Electricity and simple circuits",
];

const GRADES = [
  "Kindergarten",
  "1st grade",
  "2nd grade",
  "3rd grade",
  "4th grade",
  "5th grade",
  "6th grade",
  "7th grade",
  "8th grade",
  "9th grade",
  "10th grade",
  "11th grade",
  "12th grade",
];

export default function PromptBox({
  onGenerate,
  loading,
  mode,
  onModeChange,
  liveApi,
}: {
  onGenerate: (subject: string, grade: string) => void;
  loading: boolean;
  mode: "ai" | "demo";
  onModeChange: (m: "ai" | "demo") => void;
  liveApi: boolean | null;
}) {
  const [subject, setSubject] = useState("Photosynthesis");
  const [grade, setGrade] = useState("7th grade");

  return (
    <form
      className="prompt-box"
      onSubmit={(e) => {
        e.preventDefault();
        if (subject.trim() && grade.trim()) onGenerate(subject.trim(), grade.trim());
      }}
    >
      <label>
        Subject
        <SubjectCombo value={subject} onChange={setSubject} options={SUBJECT_IDEAS} />
      </label>
      <label>
        Grade
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      {/* Choose the source: live Claude, or the pre-generated demo deck.
          "Real AI" is disabled until a key is configured. */}
      <div className="field">
        <span className="field-label">Source</span>
        <div className="mode-toggle" role="group" aria-label="Generation source">
          <button
            type="button"
            className={mode === "ai" ? "active" : ""}
            onClick={() => onModeChange("ai")}
            disabled={liveApi === false}
            title={liveApi === false ? "No API key configured" : undefined}
          >
            Real AI
          </button>
          <button
            type="button"
            className={mode === "demo" ? "active" : ""}
            onClick={() => onModeChange("demo")}
          >
            Pre-generated demo
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Generating..." : "Generate lesson"}
      </button>
    </form>
  );
}

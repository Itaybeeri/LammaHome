import { useState } from "react";

// The whole input surface: a subject and a grade. Everything else about the
// lesson (length, structure, which moves) is inferred by the AI.

export default function PromptBox({
  onGenerate,
  loading,
}: {
  onGenerate: (subject: string, grade: string) => void;
  loading: boolean;
}) {
  const [subject, setSubject] = useState("photosynthesis");
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
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. photosynthesis" />
      </label>
      <label>
        Grade
        <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 7th grade" />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Generating..." : "Generate lesson"}
      </button>
    </form>
  );
}

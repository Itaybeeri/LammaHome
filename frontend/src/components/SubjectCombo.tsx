import { useEffect, useRef, useState } from "react";

// A subject picker that behaves like a dropdown AND a free-text field: the
// chevron opens the full list of ideas no matter what's already typed, and you
// can still type anything. (A native <datalist> filters to matches, so it can't
// show the whole list once a value is present.)

export default function SubjectCombo({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside the control.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="combo" ref={ref}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Pick one or type your own"
      />
      <button
        type="button"
        className="combo-toggle"
        aria-label="Show subjects"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ▾
      </button>
      {open && (
        <ul className="combo-list">
          {options.map((opt) => (
            <li
              key={opt}
              className={opt === value ? "sel" : ""}
              // mousedown (not click) so selection fires before input blur.
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

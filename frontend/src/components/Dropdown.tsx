import { useEffect, useRef, useState } from "react";

// One dropdown used for both Subject and Grade so they look identical. The
// chevron opens the FULL list regardless of the current value. With
// editable=true (Subject) you can also type a custom value; otherwise it's
// pick-from-list (Grade). Deliberately not wrapped in a <label> — a label
// forwards clicks to its input and fights the chevron/list clicks.

export default function Dropdown({
  value,
  onChange,
  options,
  editable = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  editable?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className={editable ? undefined : "readonly"}
        value={value}
        readOnly={!editable}
        placeholder={placeholder}
        onChange={editable ? (e) => onChange(e.target.value) : undefined}
        onFocus={editable ? () => setOpen(true) : undefined}
        onClick={editable ? undefined : () => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      <button
        type="button"
        className="combo-toggle"
        aria-label="Show options"
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

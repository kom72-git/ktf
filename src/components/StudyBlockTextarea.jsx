import React from "react";

function appendBlock(currentValue, blockValue) {
  const current = String(currentValue ?? "");
  const block = String(blockValue ?? "").trim();
  if (!block) return current;
  if (!current.trim()) return block;

  if (current.endsWith("\n\n")) return `${current}${block}`;
  if (current.endsWith("\n")) return `${current}\n${block}`;
  return `${current}\n\n${block}`;
}

export default function StudyBlockTextarea({
  id,
  value,
  onChange,
  onSave,
  suggestionValues,
  rows = 10,
  placeholder,
  textareaClassName,
  buttonClassName,
  selectClassName,
  selectPlaceholder = "Vložit dříve použitý blok…",
}) {
  const normalizedSuggestions = React.useMemo(() => {
    const values = Array.isArray(suggestionValues) ? suggestionValues : [];
    if (!values.length) return [];

    const unique = new Set();
    values.forEach((entry) => {
      const text = String(entry ?? "").trim();
      if (text) unique.add(text);
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b, "cs"));
  }, [suggestionValues]);

  return (
    <>
      <div className="edit-field-row ktf-edit-row-full">
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={textareaClassName}
          placeholder={placeholder}
          rows={rows}
        />
        <button
          type="button"
          onClick={() => onSave(value)}
          className={buttonClassName}
        >
          ✓
        </button>
      </div>
      {normalizedSuggestions.length > 0 && (
        <div className="admin-suggestions-mt">
          <select
            defaultValue=""
            onChange={(event) => {
              const selectedValue = event.target.value;
              if (!selectedValue) return;
              onChange(appendBlock(value, selectedValue));
              event.target.value = "";
            }}
            className={selectClassName}
            title="Rozbal seznam a najeď na položku pro zobrazení celého textu"
          >
            <option value="">{selectPlaceholder}</option>
            {normalizedSuggestions.map((entry) => {
              const compact = entry.replace(/\s+/g, " ").trim();
              return (
                <option key={entry} value={entry} title={entry}>
                  {compact.length > 120 ? `${compact.slice(0, 120)}…` : compact}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </>
  );
}
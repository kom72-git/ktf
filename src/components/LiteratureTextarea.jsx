import React from "react";

function stripLiteraturePrefix(line) {
  return String(line ?? "").replace(/^\s*\d+\)\s*/, "").trim();
}

function formatLiteratureLines(rawValue) {
  const normalized = String(rawValue ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const strippedLines = lines.map((line) => {
    const content = stripLiteraturePrefix(line);
    return content ? content : "";
  });
  const nonEmptyCount = strippedLines.filter(Boolean).length;

  if (nonEmptyCount <= 1) {
    return strippedLines.join("\n");
  }

  let index = 1;
  return strippedLines
    .map((line) => (line ? `${index++}) ${line}` : ""))
    .join("\n");
}

function getLiteratureCurrentLineQuery(rawValue) {
  const lines = String(rawValue ?? "").replace(/\r\n/g, "\n").split("\n");
  const currentLine = lines[lines.length - 1] ?? "";
  return stripLiteraturePrefix(currentLine).trim().toLowerCase();
}

export default function LiteratureTextarea({
  id,
  value,
  onChange,
  onSave,
  suggestionValues,
  resetKey,
  rows = 5,
  placeholder,
  textareaClassName,
  buttonClassName,
  selectClassName,
  selectPlaceholder = "Vybrat dříve použitou literaturu…",
}) {
  const [filterTouched, setFilterTouched] = React.useState(false);

  React.useEffect(() => {
    setFilterTouched(false);
  }, [resetKey]);

  const expandedSuggestions = React.useMemo(() => {
    const inputValues = Array.isArray(suggestionValues) ? suggestionValues : [];
    if (!inputValues.length) return [];

    const values = new Set();
    inputValues.forEach((entry) => {
      String(entry ?? "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map(stripLiteraturePrefix)
        .forEach((line) => {
          if (line) values.add(line);
        });
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, "cs"));
  }, [suggestionValues]);

  const filteredSuggestions = React.useMemo(() => {
    if (!expandedSuggestions.length) return [];
    if (!filterTouched) return expandedSuggestions;
    const query = getLiteratureCurrentLineQuery(value);
    if (!query) return expandedSuggestions;
    return expandedSuggestions.filter((entry) =>
      String(entry ?? "").toLowerCase().includes(query)
    );
  }, [expandedSuggestions, filterTouched, value]);

  const handleChange = (event) => {
    setFilterTouched(true);
    onChange(formatLiteratureLines(event.target.value));
  };

  const handleSave = async () => {
    setFilterTouched(false);
    await onSave(formatLiteratureLines(value));
  };

  const handleSuggestionPick = (selectedValue) => {
    const suggestion = String(selectedValue ?? "").trim();
    if (!suggestion) return;

    const currentLines = String(value ?? "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(stripLiteraturePrefix)
      .filter(Boolean);

    const suggestionLines = suggestion
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(stripLiteraturePrefix)
      .filter(Boolean);

    const merged = [...currentLines];
    suggestionLines.forEach((line) => {
      if (!merged.some((existing) => existing.toLowerCase() === line.toLowerCase())) {
        merged.push(line);
      }
    });

    setFilterTouched(false);
    onChange(formatLiteratureLines(merged.join("\n")));
  };

  return (
    <>
      <div className="edit-field-row ktf-edit-row-full">
        <textarea
          id={id}
          value={value}
          onChange={handleChange}
          className={textareaClassName}
          placeholder={placeholder}
          rows={rows}
        />
        <button type="button" onClick={handleSave} className={buttonClassName}>✓</button>
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="admin-suggestions-mt">
          <select
            defaultValue=""
            onChange={(event) => {
              const selectedValue = event.target.value;
              if (!selectedValue) return;
              handleSuggestionPick(selectedValue);
              event.target.value = "";
            }}
            className={selectClassName}
            title="Rozbal seznam a najeď na položku pro zobrazení celého textu"
          >
            <option value="">{selectPlaceholder}</option>
            {filteredSuggestions.map((entry) => {
              const compactValue = String(entry).replace(/\s+/g, " ").trim();
              return (
                <option key={entry} value={entry} title={entry}>
                  {compactValue.length > 100 ? `${compactValue.slice(0, 100)}…` : compactValue}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </>
  );
}
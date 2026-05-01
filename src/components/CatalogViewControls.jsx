// Komponenta CatalogViewControls zobrazuje ovládací prvky vpravo pod filtry:
// výběr počtu emisí na stránku, způsob řazení a tlačítko pro rozbalení/sbalení všech boxů.
// Používá se na hlavní stránce katalogu.
import React from "react";

export default function CatalogViewControls({
  isHomepageDefault,
  homeBoxLimit,
  setHomeBoxLimit,
  homeBoxLimitOptions,
  HOMEPAGE_BOX_LIMIT,
  homeSortMode,
  setHomeSortMode,
  handleToggleVisibleBoxes,
  visibleExpandableKeys,
  areAllVisibleExpanded
}) {
  if (!isHomepageDefault) return null;
  return (
    <div className="count-controls">
      <span className="count-controls-hint">Zobrazit:</span>
      <select
        className="count-control-select count-control-select--count"
        value={homeBoxLimit}
        onChange={(e) => setHomeBoxLimit(e.target.value)}
        title="Počet emisí"
        aria-label="Počet boxů na homepage"
      >
        <option value="__count_label" disabled>-- Počet --</option>
        <option value={String(HOMEPAGE_BOX_LIMIT)} hidden>{HOMEPAGE_BOX_LIMIT}</option>
        {homeBoxLimitOptions.map((limit) => (
          <option key={limit} value={String(limit)}>
            {limit === HOMEPAGE_BOX_LIMIT ? `${limit} (výchozí)` : limit}
          </option>
        ))}
        <option value="all">vše</option>
      </select>
      <select
        className="count-control-select count-control-select--sort"
        value={homeSortMode}
        onChange={(e) => setHomeSortMode(e.target.value)}
        title="Řazení emisí"
        aria-label="Řazení boxů na homepage"
      >
        <option value="__sort_label" disabled>-- Řadit --</option>
        <option value="db" hidden>nové</option>
        <option value="alpha" hidden>emise</option>
        <option value="num" hidden>katalog</option>
        <option value="db">nové (výchozí)</option>
        <option value="alpha">emise (A-Z)</option>
        <option value="num">katalog (0-9)</option>
      </select>
      <button
        type="button"
        className="count-control-toggle"
        onClick={handleToggleVisibleBoxes}
        disabled={visibleExpandableKeys.length === 0}
        title={areAllVisibleExpanded ? "Zavřít všechny rozbalené emise" : "Otevřít všechny sbalené emise"}
        aria-label={areAllVisibleExpanded ? "Zavřít všechny rozbalené emise" : "Otevřít všechny sbalené emise"}
      >
        <svg
          className="count-control-diag-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          {areAllVisibleExpanded ? (
            <>
              <path d="M19 5 L14 10" />
              <path d="M14 10 L18 10" />
              <path d="M14 10 L14 6" />
              <path d="M5 19 L10 14" />
              <path d="M10 14 L6 14" />
              <path d="M10 14 L10 18" />
            </>
          ) : (
            <>
              <path d="M10 14 L5 19" />
              <path d="M5 19 L9 19" />
              <path d="M5 19 L5 15" />
              <path d="M14 10 L19 5" />
              <path d="M19 5 L15 5" />
              <path d="M19 5 L19 9" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

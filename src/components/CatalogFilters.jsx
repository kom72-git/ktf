// Komponenta CatalogFilters zobrazuje horní filtrační řádek katalogu:
// vyhledávání, výběr roku, emise, katalogového čísla a tlačítko pro vyčištění filtrů.
// Používá se na hlavní stránce katalogu.
import React, { useEffect, useRef, useState } from "react";

export default function CatalogFilters({
  query,
  setQuery,
  year,
  setYear,
  years,
  emission,
  setEmission,
  emissions,
  catalog,
  setCatalog,
  catalogs,
  onClear,
  navigate,
  emissionToSlug
}) {
  // Při úzkém poli se popisek "Katalogové číslo" zkrátí, aby se vešel.
  const catalogRef = useRef(null);
  const [shortCatalogLabel, setShortCatalogLabel] = useState(false);
  useEffect(() => {
    const el = catalogRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setShortCatalogLabel(el.clientWidth < 165);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="search-row">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Vyhledat…"
      />
      <select className="filter-year" value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="all">Rok</option>
        {years.filter(y => y !== "all").map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select className="filter-emission" value={emission} onChange={(e) => setEmission(e.target.value)}>
        <option value="all">Emise</option>
        {emissions.filter(em => em !== "all").map((em) => (
          <option key={em} value={em}>{em}</option>
        ))}
      </select>
      <select className="filter-catalog" ref={catalogRef} value={catalog} onChange={(e) => setCatalog(e.target.value)}>
        <option value="all">{shortCatalogLabel ? "Kat. č." : "Katalogové číslo"}</option>
        {catalogs.filter(c => c !== "all").map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        title="Vyčistit filtry"
        aria-label="Vyčistit filtry"
        onClick={onClear}
      >
        Vyčistit
      </button>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE ||
    (window.location.hostname.endsWith("app.github.dev")
      ? `https://${window.location.hostname}`
      : window.location.hostname.endsWith("vercel.app")
      ? ""
      : "http://localhost:3001")
  );
}

function sortByCatalog(a, b) {
  return String(a || "").localeCompare(String(b || ""), "cs", {
    numeric: true,
    sensitivity: "base",
  });
}

function sortDefects(a, b) {
  const whereCmp = String(a.umisteniVady || "").localeCompare(String(b.umisteniVady || ""), "cs", {
    numeric: true,
    sensitivity: "base",
  });
  if (whereCmp !== 0) return whereCmp;
  return String(a.popisVady || "").localeCompare(String(b.popisVady || ""), "cs", {
    numeric: true,
    sensitivity: "base",
  });
}

function isSharedVariant(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (raw.includes(",")) return true;
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("SPOLECNE");
}

function stripAnnotations(text) {
  return String(text || "")
    .replace(/\[\[[^\]]*\]\]/g, "")         // odstraní [[...]]
    .replace(/<[^>]+>/g, "")                // odstraní HTML značky
    .trim();
}
function formatDefect(defect) {
  const where = stripAnnotations(defect?.umisteniVady);
  const desc = stripAnnotations(defect?.popisVady);
  if (where && desc) return `${where} - ${desc}`;
  if (where) return where;
  if (desc) return desc;
  return "bez popisu";
}

export default function VariantOverview() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stamps, setStamps] = useState([]);
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("");
  const [highlightQuery, setHighlightQuery] = useState("");

  useEffect(() => {
    try {
      setIsAdmin(localStorage.getItem("ktf_admin_session") === "active");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const base = getApiBase();
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`${base}/api/stamps`).then((res) => {
        if (!res.ok) throw new Error("Nepodařilo se načíst známky");
        return res.json();
      }),
      fetch(`${base}/api/defects`).then((res) => {
        if (!res.ok) throw new Error("Nepodařilo se načíst vady");
        return res.json();
      }),
    ])
      .then(([stampData, defectData]) => {
        setStamps(Array.isArray(stampData) ? stampData : []);
        setDefects(Array.isArray(defectData) ? defectData : []);
      })
      .catch((err) => {
        setError(err?.message || "Chyba při načítání dat");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAdmin]);

  const emissionGroups = useMemo(() => {
    const stampById = new Map((stamps || []).map((s) => [s.idZnamky, s]));
    const variantMap = new Map();

    (defects || []).forEach((defect) => {
      const stampId = defect?.idZnamky;
      if (!stampId) return;
      const variantLabel = String(defect?.variantaVady || "").trim() || "(bez varianty)";
      const key = `${stampId}__${variantLabel}`;
      if (!variantMap.has(key)) {
        variantMap.set(key, { stampId, variantLabel, defects: [] });
      }
      variantMap.get(key).defects.push(defect);
    });

    const stampRows = [];
    variantMap.forEach((entry) => {
      const cleanedDefects = [...entry.defects].sort(sortDefects);

      let row = stampRows.find((item) => item.stampId === entry.stampId);
      if (!row) {
        row = {
          stampId: entry.stampId,
          stamp: stampById.get(entry.stampId) || { idZnamky: entry.stampId },
          variants: [],
        };
        stampRows.push(row);
      }

      row.variants.push({
        variantLabel: entry.variantLabel,
        defects: cleanedDefects,
      });
    });

    stampRows.forEach((row) => {
      row.variants.sort((a, b) => {
        // Sdílené varianty (obsahují čárku, např. "A, B") vždy na konec
        const aShared = String(a.variantLabel).includes(",");
        const bShared = String(b.variantLabel).includes(",");
        if (aShared !== bShared) return aShared ? 1 : -1;
        return String(a.variantLabel).localeCompare(String(b.variantLabel), "cs", {
          numeric: true,
          sensitivity: "base",
        });
      });
    });

    stampRows.sort((a, b) => {
      const yearDiff = Number(a.stamp?.rok || 0) - Number(b.stamp?.rok || 0);
      if (yearDiff !== 0) return yearDiff;
      const emiseCmp = String(a.stamp?.emise || "").localeCompare(String(b.stamp?.emise || ""), "cs", {
        sensitivity: "base",
      });
      if (emiseCmp !== 0) return emiseCmp;
      return sortByCatalog(a.stamp?.katalogCislo, b.stamp?.katalogCislo);
    });

    const groups = [];
    const groupsByKey = new Map();

    stampRows.forEach((stampRow) => {
      const key = `${stampRow.stamp?.rok || "?"}-${stampRow.stamp?.emise || "(bez emise)"}`;
      if (!groupsByKey.has(key)) {
        const group = {
          emissionKey: key,
          rok: stampRow.stamp?.rok,
          emise: stampRow.stamp?.emise,
          stamps: [],
        };
        groups.push(group);
        groupsByKey.set(key, group);
      }
      groupsByKey.get(key).stamps.push(stampRow);
    });

    return groups;
  }, [stamps, defects]);

  const totalVariantCount = useMemo(() => {
    if (!Array.isArray(defects) || defects.length === 0) return 0;

    const variantsByStamp = new Map();

    defects.forEach((defect) => {
      const stampId = String(defect?.idZnamky || "").trim();
      if (!stampId) return;

      const rawVariant = String(defect?.variantaVady || "").trim();
      if (!rawVariant) return;
      if (isSharedVariant(rawVariant)) return;

      const normalizedVariant = rawVariant.replace(/\s+/g, "").toUpperCase();

      if (!variantsByStamp.has(stampId)) {
        variantsByStamp.set(stampId, new Set());
      }
      variantsByStamp.get(stampId).add(normalizedVariant);
    });

    let total = 0;

    variantsByStamp.forEach((variants) => {
      const variantList = Array.from(variants);

      const hasChildVariant = (variant) => {
        return variantList.some((candidate) => {
          if (candidate === variant) return false;

          if (candidate.startsWith(`${variant}.`)) return true;

          if (/^[A-Z]$/.test(variant) && new RegExp(`^${variant}\\d`).test(candidate)) {
            return true;
          }

          return false;
        });
      };

      variantList.forEach((variant) => {
        if (hasChildVariant(variant)) return;
        total += 1;
      });
    });

    return total;
  }, [defects]);

  const totalLegacyCount = 0; // odstraněno

  const matchedByCustomFilterCount = useMemo(() => {
    const needle = String(highlightQuery || "").trim().toLowerCase();
    if (!needle) return 0;
    const needleCompact = needle.replace(/\s+/g, "");
    const needleHasSpaces = needle !== needleCompact;

    let count = 0;
    emissionGroups.forEach((group) => {
      group.stamps.forEach((stampRow) => {
        stampRow.variants.forEach((variant) => {
          const hay = `${variant.variantLabel} ${variant.defects.map((d) => formatDefect(d)).join("; ")}`.toLowerCase();
          const isMatch = hay.includes(needle) || (!needleHasSpaces && hay.replace(/\s+/g, "").includes(needleCompact));
          if (isMatch) count += 1;
        });
      });
    });
    return count;
  }, [emissionGroups, highlightQuery]);

  const copyText = useMemo(() => {
    if (!emissionGroups.length) return "Žádné varianty.";

    return emissionGroups
      .map((group) => {
        const header = `${group.emise || "(bez emise)"} (${group.rok || "?"})`;
        const lines = group.stamps.flatMap((stampRow) => {
          const kat = stampRow.stamp?.katalogCislo || stampRow.stampId;
          return stampRow.variants.map((variant) => {
            const details = variant.defects.map((d) => formatDefect(d)).join("; ");
            const legacyFlag = variant.hasLegacyPrefix ? " [legacy-prefix]" : "";
            return `• ${kat} ${variant.variantLabel}${legacyFlag} - ${details}`;
          });
        });
        return [header, ...lines].join("\n");
      })
      .join("\n\n");
  }, [emissionGroups]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyState("Zkopírováno");
      setTimeout(() => setCopyState(""), 1500);
    } catch {
      setCopyState("Kopírování se nepodařilo");
      setTimeout(() => setCopyState(""), 2000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-bg">
        <Header navigate={navigate} />
        <main className="main">
          <section className="stamp-detail-block missing-page" aria-labelledby="variant-overview-title">
            <div className="detail-title help-main-title-wrap">
              <h1 id="variant-overview-title" className="detail-title-text">Přehled variant</h1>
            </div>
            <p>Tato stránka je dostupná pouze v admin režimu.</p>
            <button type="button" className="back-btn" onClick={() => navigate("/")}>← Zpět</button>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        <section className="stamp-detail-block missing-page" aria-labelledby="variant-overview-title">
          <div className="variant-overview-top-row">
            <div className="missing-header-row">
              <button type="button" className="back-btn" onClick={() => navigate("/chybenka")}>← Zpět na Chyběnku</button>
              <button type="button" className="ktf-btn-confirm" onClick={handleCopy}>Kopírovat text</button>
            </div>

            <div className="variant-overview-filter-row">
              <label htmlFor="variant-overview-filter" className="variant-overview-filter-label">Zvýraznit text:</label>
              <input
                id="variant-overview-filter"
                type="text"
                className="variant-overview-filter-input"
                value={highlightQuery}
                onChange={(e) => setHighlightQuery(e.target.value)}
                placeholder="např. [A], ZP1, ZP 1, tečka"
              />
              <button type="button" className="back-btn" onClick={() => setHighlightQuery("")}>Vymazat</button>
            </div>
          </div>

          <div className="detail-title help-main-title-wrap">
            <h1 id="variant-overview-title" className="detail-title-text">Přehled variant</h1>
          </div>

          <p className="missing-summary">
            Varianty celkem: <strong>{totalVariantCount}</strong>
          </p>
          <p className="variant-overview-hint">
            Zvýraznění funguje podle textu nahoře (bez ohledu na velikost písmen; navíc toleruje mezery, takže `ZP1` najde i `ZP 1`).
          </p>
          {String(highlightQuery || "").trim() ? (
            <p className="variant-overview-match-summary">
              Shody pro filtr <strong>{highlightQuery}</strong>: <strong>{matchedByCustomFilterCount}</strong>
            </p>
          ) : null}
          {copyState ? <p className="missing-copy-state">{copyState}</p> : null}

          {loading ? <p>Načítám…</p> : null}
          {!loading && error ? <p className="missing-error">{error}</p> : null}
          {!loading && !error && emissionGroups.length === 0 ? <p>Aktuálně není evidovaná žádná varianta.</p> : null}

          {!loading && !error && emissionGroups.length > 0 ? (
            <div className="missing-list">
              {emissionGroups.map((group, index) => {
                const previousYear = index > 0 ? emissionGroups[index - 1]?.rok : null;
                const isYearStart = index === 0 || String(group.rok || "") !== String(previousYear || "");

                return (
                <section key={group.emissionKey} className="missing-emission-block">
                  <div className="variant-overview-emission-head">
                    <h2 className="missing-emission-title">
                      {group.emise || "(bez emise)"} ({group.rok || "?"})
                    </h2>
                    {isYearStart ? (
                      <span className="variant-overview-year-start-badge">Rok {group.rok || "?"}</span>
                    ) : null}
                  </div>

                  <ul className="missing-stamp-list">
                    {group.stamps.map((stampRow) => (
                      <li key={stampRow.stampId} className="missing-stamp-row">
                        <a href={`#/detail/${stampRow.stampId}`} className="missing-stamp-link">
                          {stampRow.stamp?.katalogCislo || stampRow.stampId}
                        </a>
                        <ul className="missing-variant-list">
                          {stampRow.variants.map((variant) => {
                            const defectLines = variant.defects.map((d) => formatDefect(d));
                            const detailsText = defectLines.join("; "); // pro hay/match
                            const hay = `${variant.variantLabel} ${detailsText}`.toLowerCase();
                            const needle = String(highlightQuery || "").trim().toLowerCase();
                            const needleCompact = needle.replace(/\s+/g, "");
                            const needleHasSpaces = needle !== needleCompact;
                            const isCustomMatch = !!needle && (hay.includes(needle) || (!needleHasSpaces && hay.replace(/\s+/g, "").includes(needleCompact)));

                            return (
                              <li
                                key={variant.variantLabel}
                                className={`missing-variant-line variant-overview-line${isCustomMatch ? " variant-overview-line-custom" : ""}`}
                              >
                                <span className="missing-variant-label">{variant.variantLabel}</span>
                                {isCustomMatch ? <span className="variant-overview-flag variant-overview-flag-custom"> shoda</span> : null}
                                <ul className="variant-overview-defect-list">
                                  {defectLines.map((line, i) => (
                                    <li key={i} className="variant-overview-defect-item">{line}</li>
                                  ))}
                                </ul>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </section>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}

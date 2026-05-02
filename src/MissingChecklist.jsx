import React, { useEffect, useMemo, useState } from "react";

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

function isSharedVariantLabel(label) {
  return String(label || "").includes(",");
}

function sortDefects(a, b) {
  return String(a.umisteniVady || "").localeCompare(String(b.umisteniVady || ""), "cs", {
    numeric: true,
    sensitivity: "base",
  });
}

function formatDefectInline(defect) {
  const where = String(defect?.umisteniVady || "").trim();
  const desc = String(defect?.popisVady || "").trim();
  if (where && desc) return `${where} - ${desc}`;
  if (where) return where;
  if (desc) return desc;
  return "bez popisu";
}

export default function MissingChecklist() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stamps, setStamps] = useState([]);
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("");

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

  // emissionGroups: [ { emissionKey, rok, emise, stamps: [ { stampId, stamp, missingItems } ] } ]
  const emissionGroups = useMemo(() => {
    const stampById = new Map((stamps || []).map((s) => [s.idZnamky, s]));

    // Seskup VŠECHNY vady (mam=true i false) podle stampId+variantaVady
    const defectsByKey = new Map();
    (defects || []).forEach((defect) => {
      const variantLabel = String(defect?.variantaVady || "").trim();
      if (!variantLabel) return;
      if (isSharedVariantLabel(variantLabel)) return;
      const stampId = defect?.idZnamky;
      if (!stampId) return;

      const key = `${stampId}__${variantLabel}`;
      if (!defectsByKey.has(key)) defectsByKey.set(key, { stampId, variantLabel, all: [] });
      defectsByKey.get(key).all.push(defect);
    });

    // Pro každou skupinu zjisti, zda celá varianta chybí nebo jen část
    const stampMissingMap = new Map();
    defectsByKey.forEach(({ stampId, variantLabel, all: varDefects }) => {
      const someMissing = varDefects.some((d) => !d.mam);
      if (!someMissing) return;

      if (!stampMissingMap.has(stampId)) stampMissingMap.set(stampId, []);

      const allMissing = varDefects.every((d) => !d.mam);
      if (allMissing) {
        // Celá varianta chybí – stačí zobrazit jen písmeno varianty
        stampMissingMap.get(stampId).push({ type: "whole", variantLabel, defects: [] });
      } else {
        // Jen část sub-vad chybí – zobraz konkrétní chybějící vady
        const missing = varDefects.filter((d) => !d.mam).sort(sortDefects);
        stampMissingMap.get(stampId).push({ type: "partial", variantLabel, defects: missing });
      }
    });

    // Sestav řádky po známkách
    const stampRows = [];
    stampMissingMap.forEach((missingItems, stampId) => {
      missingItems.sort((a, b) => a.variantLabel.localeCompare(b.variantLabel, "cs"));
      stampRows.push({
        stampId,
        stamp: stampById.get(stampId) || { idZnamky: stampId },
        missingItems,
      });
    });

    stampRows.sort((a, b) => {
      const yearDiff = Number(a.stamp?.rok || 0) - Number(b.stamp?.rok || 0);
      if (yearDiff !== 0) return yearDiff;
      const emiseCmp = String(a.stamp?.emise || "").localeCompare(String(b.stamp?.emise || ""), "cs");
      if (emiseCmp !== 0) return emiseCmp;
      return String(a.stamp?.katalogCislo || "").localeCompare(String(b.stamp?.katalogCislo || ""), "cs", {
        numeric: true,
        sensitivity: "base",
      });
    });

    // Seskup do emisí
    const groups = [];
    const groupsByKey = new Map();
    stampRows.forEach((stampRow) => {
      const emissionKey = `${stampRow.stamp?.rok || "?"}-${stampRow.stamp?.emise || "(bez emise)"}`;
      if (!groupsByKey.has(emissionKey)) {
        const group = { emissionKey, rok: stampRow.stamp?.rok, emise: stampRow.stamp?.emise, stamps: [] };
        groups.push(group);
        groupsByKey.set(emissionKey, group);
      }
      groupsByKey.get(emissionKey).stamps.push(stampRow);
    });

    return groups;
  }, [stamps, defects]);

  const totalMissingVariants = useMemo(
    () => emissionGroups.reduce((sum, g) => sum + g.stamps.reduce((s2, st) => s2 + st.missingItems.length, 0), 0),
    [emissionGroups]
  );

  const totalMissingStamps = useMemo(
    () => emissionGroups.reduce((sum, g) => sum + g.stamps.length, 0),
    [emissionGroups]
  );

  const copyText = useMemo(() => {
    if (!emissionGroups.length) return "Žádné chybějící varianty.";

    return emissionGroups
      .map((group) => {
        const header = `${group.emise || "(bez emise)"} (${group.rok || "?"})`;
        const lines = group.stamps.flatMap((stampRow) => {
          const kat = stampRow.stamp?.katalogCislo || stampRow.stampId;
          return stampRow.missingItems.map((item) => {
            if (item.type === "whole") return `\u2022 ${kat} ${item.variantLabel}`;
            const detail = item.defects.map((d) => formatDefectInline(d)).join("; ");
            return `\u2022 ${kat} ${item.variantLabel} - ${detail}`;
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
      <main className="missing-page">
        <h1>Chyběnka</h1>
        <p>Tato stránka je dostupná pouze v admin režimu.</p>
        <a href="#/" className="back-btn">← Zpět</a>
      </main>
    );
  }

  return (
    <main className="missing-page">
      <div className="missing-header-row">
        <a href="#/" className="back-btn">← Zpět</a>
        <button type="button" className="ktf-btn-confirm" onClick={handleCopy}>Kopírovat text</button>
      </div>

      <h1>Chyběnka</h1>
      <p className="missing-summary">
        Chybějící varianty: <strong>{totalMissingVariants}</strong> | Známky s chybějícími variantami: <strong>{totalMissingStamps}</strong>
      </p>
      {copyState ? <p className="missing-copy-state">{copyState}</p> : null}

      {loading ? <p>Načítám…</p> : null}
      {!loading && error ? <p className="missing-error">{error}</p> : null}

      {!loading && !error && emissionGroups.length === 0 ? (
        <p>Aktuálně není evidovaná žádná chybějící varianta.</p>
      ) : null}

      {!loading && !error && emissionGroups.length > 0 ? (
        <div className="missing-list">
          {emissionGroups.map((group) => (
            <section key={group.emissionKey} className="missing-emission-block">
              <h2 className="missing-emission-title">
                {group.emise || "(bez emise)"} ({group.rok || "?"})
              </h2>
              <ul className="missing-stamp-list">
                {group.stamps.map((stampRow) => (
                  <li key={stampRow.stampId} className="missing-stamp-row">
                    <a href={`#/detail/${stampRow.stampId}`} className="missing-stamp-link">
                      {stampRow.stamp?.katalogCislo || stampRow.stampId}
                    </a>
                    <ul className="missing-variant-list">
                      {stampRow.missingItems.map((item) => (
                        <li key={item.variantLabel} className={`missing-variant-line missing-variant-${item.type}`}>
                          <span className="missing-variant-label">{item.variantLabel}</span>
                          {item.type === "partial" ? (
                            <span className="missing-variant-detail"> - {item.defects.map((d) => formatDefectInline(d)).join("; ")}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}

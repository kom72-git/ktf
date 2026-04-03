import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from './Header';
import Footer from './Footer';
import AdminPanel from "./AdminPanel";
import DetailPage from "./StampDetail.jsx";
import EmissionTitleAbbr from "./components/EmissionTitleAbbr.jsx";
import {
  replaceAbbreviations,
  sklonujPolozka,
  sklonujEmise,
  sklonujZnamek,
  sklonujPosledniVlozeneEmise
} from './utils/formatovaniTextu.jsx';
import { katalogSort, emissionToSlug, slugToEmission } from './utils/katalog.js';
import { normalizeStampImagePath } from "./utils/obrazekCesta.js";
import "./App.css";

function getCatalogDisplayParts(stamp) {
  const katalogCislo = String(stamp?.katalogCislo || "").trim();
  const idZnamky = String(stamp?.idZnamky || "").trim();
  const catalogMatch = katalogCislo.match(/^([A-ZČŘŽŠĚÚŮ]+)?\s*(\d+)([A-ZČŘŽŠĚÚŮ]*)$/i);

  if (!catalogMatch) {
    return {
      prefix: "",
      number: katalogCislo,
      suffix: "",
      value: katalogCislo,
    };
  }

  const prefix = (catalogMatch[1] || "").trim();
  const number = catalogMatch[2];
  let suffix = (catalogMatch[3] || "").trim();

  if (!suffix) {
    const idMatch = idZnamky.match(new RegExp(`${number}([A-ZČŘŽŠĚÚŮ]+)$`, "i"));
    if (idMatch) {
      suffix = (idMatch[1] || "").trim().toUpperCase();
    }
  }

  return {
    prefix,
    number,
    suffix,
    value: `${number}${suffix}`,
  };
}

function getCatalogBaseKey(stamp) {
  const katalogCislo = String(stamp?.katalogCislo || "").trim();
  const idZnamky = String(stamp?.idZnamky || "").trim();
  const match = katalogCislo.match(/^([A-ZČŘŽŠĚÚŮ]+)?\s*(\d+)([A-ZČŘŽŠĚÚŮ]*)$/i);
  if (match) {
    const prefix = (match[1] || "").trim().toUpperCase();
    const number = match[2];
    return `${prefix}|${number}`;
  }
  return `__single__|${idZnamky || katalogCislo}`;
}

function formatGroupedCatalogText(groupItems) {
  const parsed = groupItems.map(getCatalogDisplayParts).filter(p => p.value);
  if (parsed.length === 0) return "";
  const allSamePrefix = parsed.every(p => p.prefix === parsed[0].prefix);
  if (allSamePrefix && parsed[0].prefix) {
    // Special case: only A/B pair for the same catalog number -> "A 2273A/B"
    if (
      parsed.length === 2
      && parsed[0].number === parsed[1].number
    ) {
      const suffixes = parsed.map(p => (p.suffix || "").toUpperCase()).sort();
      if (suffixes[0] === "A" && suffixes[1] === "B") {
        return `${parsed[0].prefix} ${parsed[0].number}A/B`;
      }
    }

    const numbers = parsed.map(p => (p.suffix ? p.value : p.number));
    return `${parsed[0].prefix} ${numbers.join(", ")}`;
  }
  return groupItems.map(s => s?.katalogCislo).filter(Boolean).join(", ");
}


export default function StampCatalog(props) {
  const HOMEPAGE_BOX_LIMIT = 12; // 👈 zde měň výchozí počet zobrazených boxů/emisí na HomePage
  const HOME_BOX_LIMIT_OPTIONS = [4, HOMEPAGE_BOX_LIMIT, 8, 20, 40]; // 👈 zde měň výchozí počty v rozevíracím seznamu na HomePage
  const homeBoxLimitOptions = Array.from(new Set(HOME_BOX_LIMIT_OPTIONS)).sort((a, b) => a - b);
  // Stav pro rozbalené boxy (klíč: emise|rok)
  const [expandedBoxes, setExpandedBoxes] = useState([]);
  const [homeBoxLimit, setHomeBoxLimit] = useState(
    () => localStorage.getItem("ktf_home_box_limit") || String(HOMEPAGE_BOX_LIMIT)
  );
  const [homeSortMode, setHomeSortMode] = useState(
    () => localStorage.getItem("ktf_home_sort_mode") || "db"
  );
  const location = typeof useLocation === 'function' ? useLocation() : {};

  // Automatické rozbalení boxu po příchodu z hlavní stránky
  useEffect(() => {
    if (location && location.state && location.state.openBoxKey) {
      setExpandedBoxes([location.state.openBoxKey]);
    }
  }, [location && location.state && location.state.openBoxKey]);

  function handleToggleBox(key) {
    setExpandedBoxes(expanded =>
      expanded.includes(key)
        ? expanded.filter(k => k !== key)
        : [...expanded, key]
    );
  }
  const navigate = typeof useNavigate === 'function' ? useNavigate() : null;

  // Deklarace všech useState na úplný začátek
  const [isAdmin, setIsAdmin] = useState(() => {
    // Zachovej admin session i po reloadu/přechodu
    return localStorage.getItem('ktf_admin_session') === 'active';
  });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stamps, setStamps] = useState([]);
  const [defects, setDefects] = useState([]);
  const [query, setQuery] = useState("");
  // ...existing code...
  // Emise a rok vždy odvozujeme pouze z props (tedy z URL)
  // Všechny filtry a zobrazení budou vycházet pouze z těchto hodnot
  let emission = "all";
  let year = "all";
  const normalizedInitialYear = props.initialYear === "all-years" ? "all" : props.initialYear;
  if (props.onlyYear) {
    year = normalizedInitialYear || "all";
    emission = "all";
  } else if (props.initialEmissionSlug) {
    const match = props.initialEmissionSlug.match(/^(.*)-(\d{4})$/);
    if (match) {
      const slug = match[1];
      const rok = match[2];
      emission = slugToEmission(slug, stamps) || "all";
      year = rok || "all";
    } else {
      emission = slugToEmission(props.initialEmissionSlug, stamps) || "all";
      year = normalizedInitialYear || "all";
    }
  }
  const [catalog, setCatalog] = useState("all");
  const [internalDetailId, setInternalDetailId] = useState(null);
  const detailId = props && props.detailId ? props.detailId : internalDetailId;
  const setDetailId = props && props.setDetailId ? props.setDetailId : setInternalDetailId;
  // (Synchronizace stavu emise a roku už není potřeba, vše je odvozeno z props)

  // Funkce pro admin login/logout
  const handleAdminLogin = (password) => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === adminPassword) {
      localStorage.setItem('ktf_admin_session', 'active');
      setIsAdmin(true);
      setShowAdminLogin(false);
      window.dispatchEvent(new Event('ktf-admin-refresh'));
    } else {
      alert('Nesprávné heslo');
    }
  };
  const handleAdminLogout = () => {
    localStorage.removeItem('ktf_admin_session');
    setIsAdmin(false);
    window.dispatchEvent(new Event('ktf-admin-refresh'));
  };

  // (Synchronizace s URL už není potřeba, vše je řízeno routerem)

  // ...zbytek kódu beze změny...

  useEffect(() => {
    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      (window.location.hostname.endsWith("app.github.dev")
        ? `https://${window.location.hostname}`
        : window.location.hostname.endsWith("vercel.app")
        ? "" // Pro Vercel používáme relativní cesty, backend bude na stejné doméně
        : "http://localhost:3001"); // Lokální vývoj
        fetch(`${API_BASE}/api/stamps`)
      .then(res => {
        console.log('Stamps response:', res);
        return res.json();
      })
      .then(data => {
        console.log("Načtené známky:", data);
        setStamps(data);
      })
      .catch(err => console.error("Chyba při načítání známek:", err));
    fetch(`${API_BASE}/api/defects`)
      .then(res => {
        console.log('Defects response:', res);
        return res.json();
      })
      .then(data => {
        console.log("Načtené vady:", data);
        setDefects(data);
      })
      .catch(err => console.error("Chyba při načítání vad:", err));
  }, []);

  useEffect(() => {
    const openLogin = () => setShowAdminLogin(true);
    window.addEventListener('ktf-admin-open-login', openLogin);
    return () => {
      window.removeEventListener('ktf-admin-open-login', openLogin);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("ktf_home_box_limit", homeBoxLimit);
  }, [homeBoxLimit]);

  useEffect(() => {
    localStorage.setItem("ktf_home_sort_mode", homeSortMode);
  }, [homeSortMode]);

  useEffect(() => {
    if (detailId) {
      const item = stamps.find(d => d.idZnamky === detailId);
      document.title = item ? `${item.emise} (${item.rok}) | Katalog TF` : 'Katalog TF';
    } else if (emission !== "all") {
      document.title = `${emission} | Katalog TF`;
    } else {
      document.title = 'Katalog TF';
    }
  }, [detailId, stamps, emission]);

  const getEmissionFilterName = (stamp) => {
    const group = typeof stamp?.emiseSkupina === "string" ? stamp.emiseSkupina.trim() : "";
    if (group) return group;
    return stamp?.emise || "";
  };

  const years = useMemo(() => {
    const s = new Set(stamps.map((d) => d.rok));
    return ["all", ...Array.from(s).sort((a, b) => a - b)]; // od nejstaršího nahoru
  }, [stamps]);

  const filteredEmissions = useMemo(() => {
    let filtered = stamps;
    if (year !== "all") {
      filtered = filtered.filter((d) => d.rok === Number(year));
    }
    const s = new Set(filtered.map((d) => getEmissionFilterName(d)).filter(Boolean));
    return ["all", ...Array.from(s).sort()];
  }, [year, stamps]);

  const filteredYears = useMemo(() => {
    let filtered = stamps;
    if (emission !== "all") {
      filtered = filtered.filter((d) => getEmissionFilterName(d) === emission);
    }
    const s = new Set(filtered.map((d) => d.rok));
    return ["all", ...Array.from(s).sort((a, b) => a - b)];
  }, [emission, stamps]);

  const filteredCatalogs = useMemo(() => {
    let filtered = stamps;
    if (year !== "all") {
      filtered = filtered.filter((d) => d.rok === Number(year));
    }
    if (emission !== "all") {
      filtered = filtered.filter((d) => getEmissionFilterName(d) === emission);
    }
    const s = new Set(filtered.map((d) => d.katalogCislo));
    return ["all", ...Array.from(s).sort(katalogSort)];
  }, [year, emission, stamps]);

  const fieldSuggestions = useMemo(() => {
    const fields = [
      "emise",
      "rok",
      "katalogCislo",
      "obrazek",
      "obrazekStudie",
      "datumVydani",
      "navrh",
      "rytec",
      "druhTisku",
      "tiskovaForma",
      "zoubkovani",
      "papir",
      "rozmer",
      "naklad",
      "schemaTF",
      "Studie",
      "studieUrl",
    "popisObrazkuStudie",
    "popisStudie",
    "popisStudie2",
    "obrazekAutor",
    ];
    const collect = (field) => {
      const values = new Set();
      stamps.forEach((stamp) => {
        const raw = stamp[field];
        if (raw === null || raw === undefined) return;
        const value = typeof raw === "string" ? raw.trim() : String(raw).trim();
        if (value) {
          values.add(value);
        }
      });
      return Array.from(values).sort((a, b) => a.localeCompare(b, "cs"));
    };
    return fields.reduce((acc, field) => {
      acc[field] = collect(field);
      return acc;
    }, {});
  }, [stamps]);

  // Výchozí náhled: všechny známky (nikde se neřeže na 20) a pro homepage se 4 boxy omezí až v rendereru.
  const filtered = useMemo(() => {
    let arr = stamps
      .filter((d) => {
        if (year !== "all" && d.rok !== Number(year)) return false;
        if (emission !== "all" && getEmissionFilterName(d) !== emission) return false;
        if (catalog !== "all" && d.katalogCislo !== catalog) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            (d.emise && d.emise.toLowerCase().includes(q)) ||
            (d.emiseSkupina && d.emiseSkupina.toLowerCase().includes(q)) ||
            (d.katalogCislo && d.katalogCislo.toLowerCase().includes(q)) ||
            (d.rok && String(d.rok).includes(q))
          );
        }
        return true;
      });
    const isAnyFilterActive = year !== "all" || emission !== "all" || catalog !== "all" || !!query;
    if (isAnyFilterActive) {
      arr = [...arr].sort((a, b) => {
        const yearCmp = Number(a.rok) - Number(b.rok);
        if (yearCmp !== 0) return yearCmp;
        return katalogSort(a, b);
      });
    }
    // Pokud nejsou použity žádné filtry, řadíme podle posledního přidání, bez omezení počtu položek.
    if (
      year === "all" &&
      emission === "all" &&
      catalog === "all" &&
      !query
    ) {
      arr = [...arr].sort((a, b) => b._id.localeCompare(a._id));
    }
    return arr;
  }, [query, year, emission, catalog, stamps]);

  // Počet boxů, které máme ve filtrovaném seznamu (skupina emise|rok)
  const totalBoxCount = useMemo(() => {
    const unique = new Set(filtered.map((d) => `${d.emise}|${d.rok}`));
    return unique.size;
  }, [filtered]);

  const isHomepageDefault =
    year === "all" && emission === "all" && catalog === "all" && !query;
  const groupedBoxes = useMemo(() => {
    const extractCatalogSerial = (value = "") => {
      const text = String(value || "");
      const match = text.match(/(\d{3,4})/);
      if (!match) return Number.POSITIVE_INFINITY;
      return Number(match[1]);
    };

    const emissionMap = new Map();
    const sortedStamps = [...filtered].sort((a, b) => b._id.localeCompare(a._id));
    sortedStamps.forEach(item => {
      const key = `${item.emise}|${item.rok}`;
      if (!emissionMap.has(key)) {
        emissionMap.set(key, [item]);
      } else {
        emissionMap.get(key).push(item);
      }
    });

    return Array.from(emissionMap.entries()).sort((a, b) => {
      const itemA = a[1][0];
      const itemB = b[1][0];

      if (isHomepageDefault) {
        if (homeSortMode === "db") {
          return itemB._id.localeCompare(itemA._id);
        }

        if (homeSortMode === "alpha") {
          const emiseA = (itemA.emise || "").toString();
          const emiseB = (itemB.emise || "").toString();
          const alphaCmp = emiseA.localeCompare(emiseB, "cs", { sensitivity: "base", numeric: true });
          if (alphaCmp !== 0) {
            return alphaCmp;
          }
          const yearCmp = Number(itemA.rok) - Number(itemB.rok);
          if (yearCmp !== 0) {
            return yearCmp;
          }
          return itemA._id.localeCompare(itemB._id);
        }

        if (homeSortMode === "num") {
          const sortedCatalogA = [...a[1]].sort(katalogSort);
          const sortedCatalogB = [...b[1]].sort(katalogSort);
          const catalogA = sortedCatalogA[0]?.katalogCislo || "";
          const catalogB = sortedCatalogB[0]?.katalogCislo || "";
          const serialA = extractCatalogSerial(catalogA);
          const serialB = extractCatalogSerial(catalogB);
          if (serialA !== serialB) {
            return serialA - serialB;
          }
          return itemA._id.localeCompare(itemB._id);
        }

        return itemB._id.localeCompare(itemA._id);
      }

      const yearCmp = Number(itemA.rok) - Number(itemB.rok);
      if (yearCmp !== 0) {
        return yearCmp;
      }
      const firstCatalogA = [...a[1]].sort(katalogSort)[0];
      const firstCatalogB = [...b[1]].sort(katalogSort)[0];
      return katalogSort(firstCatalogA, firstCatalogB);
    });
  }, [filtered, isHomepageDefault, homeSortMode]);

  const boxesToRender = useMemo(() => {
    if (!isHomepageDefault) {
      return groupedBoxes;
    }

    if (homeBoxLimit === "all") {
      return groupedBoxes;
    }

    const parsedLimit = Number(homeBoxLimit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return groupedBoxes.slice(0, HOMEPAGE_BOX_LIMIT);
    }

    return groupedBoxes.slice(0, parsedLimit);
  }, [groupedBoxes, isHomepageDefault, homeBoxLimit, HOMEPAGE_BOX_LIMIT]);

  const displayedBoxCount = boxesToRender.length;

  const displayedStampCount = useMemo(() => {
    return boxesToRender.reduce((sum, [, items]) => sum + items.length, 0);
  }, [boxesToRender]);

  const visibleExpandableKeys = useMemo(() => {
    return boxesToRender
      .filter(([, items]) => items.length > 1)
      .map(([key]) => key);
  }, [boxesToRender]);

  const areAllVisibleExpanded = useMemo(() => {
    if (visibleExpandableKeys.length === 0) return false;
    return visibleExpandableKeys.every((key) => expandedBoxes.includes(key));
  }, [visibleExpandableKeys, expandedBoxes]);

  function handleToggleVisibleBoxes() {
    if (visibleExpandableKeys.length === 0) return;

    setExpandedBoxes((prev) => {
      const next = new Set(prev);
      const shouldExpand = !visibleExpandableKeys.every((key) => next.has(key));

      if (shouldExpand) {
        visibleExpandableKeys.forEach((key) => next.add(key));
      } else {
        visibleExpandableKeys.forEach((key) => next.delete(key));
      }

      return Array.from(next);
    });
  }

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        {/* ...existující kód bez testovacího výpisu... */}
        {detailId ? (
          <DetailPage
            id={detailId}
            onBack={() => setDetailId(null)}
            defects={defects}
            isAdmin={isAdmin}
            fieldSuggestions={fieldSuggestions}
            allStamps={stamps}
          />
        ) : (
          <>
            {/* Tlačítko pro přidání nové známky pro admina */}
            {isAdmin && (
              <div style={{textAlign: 'right', marginBottom: '12px'}}>
                <button className="ktf-btn-confirm" onClick={() => setShowAddModal(true)}>
                  + Přidat známku
                </button>
              </div>
            )}
            <section className="search-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Vyhledat…"
              />
                  {/* debug výpis odstraněn */}
              <select value={year} onChange={(e) => {
                const newYear = e.target.value;
                if (emission !== "all" && newYear !== "all") {
                  const slug = emissionToSlug(emission);
                  navigate(`/emise/${slug}-${newYear}`);
                } else if (emission !== "all") {
                  const slug = emissionToSlug(emission);
                  navigate(`/emise/${slug}`);
                } else if (newYear !== "all") {
                  navigate(`/rok/${newYear}`);
                } else {
                  navigate(`/`);
                }
              }}>
                <option value="all">Rok</option>
                {filteredYears.filter(y => y !== "all").map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={emission} onChange={(e) => {
                const newEmission = e.target.value;
                if (newEmission !== "all" && year !== "all") {
                  const slug = emissionToSlug(newEmission);
                  navigate(`/emise/${slug}-${year}`);
                } else if (newEmission !== "all") {
                  const slug = emissionToSlug(newEmission);
                  navigate(`/emise/${slug}`);
                } else {
                  navigate(`/`);
                }
              }}>
                <option value="all">Emise</option>
                {filteredEmissions.filter(em => em !== "all").map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
              <select value={catalog} onChange={(e) => {
                const newCatalog = e.target.value;
                setCatalog(newCatalog);
                if (newCatalog !== "all") {
                  const matches = stamps.filter((s) => {
                    if (s.katalogCislo !== newCatalog) return false;
                    if (year !== "all" && s.rok !== Number(year)) return false;
                    if (emission !== "all" && getEmissionFilterName(s) !== emission) return false;
                    if (query) {
                      const q = query.toLowerCase();
                      const matchesQuery =
                        (s.emise && s.emise.toLowerCase().includes(q)) ||
                        (s.emiseSkupina && s.emiseSkupina.toLowerCase().includes(q)) ||
                        (s.katalogCislo && s.katalogCislo.toLowerCase().includes(q)) ||
                        (s.rok && String(s.rok).includes(q));
                      if (!matchesQuery) return false;
                    }
                    return true;
                  });
                  if (matches.length === 1) {
                    const targetId = matches[0].idZnamky;
                    if (props && props.setDetailId) {
                      props.setDetailId(targetId);
                    } else if (navigate) {
                      navigate(`/detail/${targetId}`);
                    } else {
                      window.location.href = `/detail/${targetId}`;
                    }
                  }
                }
              }}>
                <option value="all">Katalogové číslo</option>
                {filteredCatalogs.filter(c => c !== "all").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                title="Vyčistit filtry"
                aria-label="Vyčistit filtry"
                onClick={() => {
                  setQuery("");
                  setCatalog("all");
                  setHomeBoxLimit(String(HOMEPAGE_BOX_LIMIT));
                  setHomeSortMode("db");
                  setExpandedBoxes([]);
                  if (navigate) {
                    navigate(`/`);
                  } else {
                    window.location.href = `/`;
                  }
                }}>
                Vyčistit
              </button>
            </section>
            <div className="count-info-row">
              <div className="count-info">
                {isHomepageDefault ? (
                  homeSortMode === "db" ? (
                    <>
                      Zobrazeno: <strong>{displayedBoxCount}</strong> z <strong>{totalBoxCount}</strong> posledních vložených emisí do katalogu (<strong>{displayedStampCount}</strong> {sklonujZnamek(displayedStampCount)})
                    </>
                  ) : (
                    <>
                      Zobrazeno: <strong>{displayedBoxCount}</strong> z <strong>{totalBoxCount}</strong> emisí do katalogu (<strong>{displayedStampCount}</strong> {sklonujZnamek(displayedStampCount)})
                    </>
                  )
                ) : (
                  <>
                    Obsahuje: <strong>{totalBoxCount}</strong> {sklonujEmise(totalBoxCount)} (<strong>{filtered.length}</strong> {sklonujZnamek(filtered.length)})
                  </>
                )}
              </div>
              {isHomepageDefault && (
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
                    {areAllVisibleExpanded ? "⤡" : "⤢"}
                  </button>
                </div>
              )}
            </div>
            <div className="stamp-list-layout">
              {(() => {
                {
                  return boxesToRender.flatMap(([key, items]) => {
                      const sortedItems = [...items].sort(katalogSort);
                      const item = sortedItems[0];
                      const isSingle = sortedItems.length === 1;
                      const [emise, rok] = key.split('|');
                      const slug = emissionToSlug(emise);
                      const expanded = expandedBoxes.includes(key);
                      if (!expanded) {
                        // SLOUČENÝ BOX
                        // Výpis katalogových čísel všech známek v boxu
                        const groupedForCollapsed = new Map();
                        sortedItems.forEach((entry) => {
                          const groupKey = getCatalogBaseKey(entry);
                          if (!groupedForCollapsed.has(groupKey)) {
                            groupedForCollapsed.set(groupKey, [entry]);
                          } else {
                            groupedForCollapsed.get(groupKey).push(entry);
                          }
                        });

                        const groupedTexts = Array.from(groupedForCollapsed.values())
                          .map((group) => formatGroupedCatalogText([...group].sort(katalogSort)))
                          .filter(Boolean);

                        let katalogText = groupedTexts.join(', ');
                        if (groupedTexts.length > 1) {
                          const firstParts = groupedTexts[0].match(/^([A-ZČŘŽŠĚÚŮ]+)\s+(.+)$/i);
                          if (firstParts) {
                            const sharedPrefix = firstParts[1];
                            const hasAllSamePrefix = groupedTexts.every((text) => text.startsWith(`${sharedPrefix} `));
                            if (hasAllSamePrefix) {
                              katalogText = groupedTexts
                                .map((text, index) => (index === 0 ? text : text.replace(new RegExp(`^${sharedPrefix}\\s+`), '')))
                                .join(', ');
                            }
                          }
                        }
                        return (
                          <div key={key} className="stamp-card stamp-card-pointer"
                            style={{position: 'relative'}}
                            onClick={() => {
                              if (isSingle) {
                                if (props && props.setDetailId) {
                                  props.setDetailId(item.idZnamky);
                                } else if (navigate) {
                                  navigate(`/detail/${item.idZnamky}`);
                                } else {
                                  window.location.href = `/detail/${item.idZnamky}`;
                                }
                              } else {
                                if (navigate) {
                                  // Předat klíč boxu do state
                                  navigate(`/emise/${slug}-${rok}`, { state: { openBoxKey: key } });
                                } else {
                                  window.location.href = `/emise/${slug}-${rok}`;
                                }
                              }
                            }}>
                            {!isSingle && (
                              <button className="stamp-box-toggle" title="Rozbalit box" style={{right: 2, top: 2, position: 'absolute'}}
                                onClick={e => { e.stopPropagation(); handleToggleBox(key); }}
                              >+</button>
                            )}
                            <div className="stamp-img-bg">
                              {item.obrazek ? (
                                <img
                                  src={item.obrazek}
                                  alt={item.emise}
                                  onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                                />
                              ) : (
                                <div className="stamp-img-missing">obrázek chybí</div>
                              )}
                            </div>
                            <div className="stamp-title stamp-title-abbr">
                              <EmissionTitleAbbr>{replaceAbbreviations(`${emise} (${rok})`)}</EmissionTitleAbbr>
                            </div>
                            <div className="stamp-bottom">
                              <div>Katalog: <span className="catalog">{katalogText}</span></div>
                              {isSingle && (
                                <span className="details-link" style={{marginLeft: 8, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer'}}>detaily</span>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        // ROZBALENÉ BOXy – zvýraznění pouze zde
                        const groupedForExpanded = new Map();
                        sortedItems.forEach((entry) => {
                          const groupKey = getCatalogBaseKey(entry);
                          if (!groupedForExpanded.has(groupKey)) {
                            groupedForExpanded.set(groupKey, [entry]);
                          } else {
                            groupedForExpanded.get(groupKey).push(entry);
                          }
                        });
                        const expandedCards = Array.from(groupedForExpanded.values()).map((group) => {
                          const groupSorted = [...group].sort(katalogSort);
                          return {
                            item: groupSorted[0],
                            katalogText: formatGroupedCatalogText(groupSorted),
                          };
                        });

                        return expandedCards.map(({ item, katalogText }, idx) => (
                          <div key={key + '-' + idx} className="stamp-card stamp-card-grouped stamp-card-pointer"
                            style={{position: 'relative'}}
                            onClick={() => {
                              if (props && props.setDetailId) {
                                props.setDetailId(item.idZnamky);
                              } else if (navigate) {
                                navigate(`/detail/${item.idZnamky}`);
                              } else {
                                window.location.href = `/detail/${item.idZnamky}`;
                              }
                            }}>
                            {idx === 0 && (
                              <button className="stamp-box-toggle" title="Sloučit boxy" style={{right: 2, top: 2, position: 'absolute'}}
                                onClick={e => { e.stopPropagation(); handleToggleBox(key); }}
                              >−</button>
                            )}
                            <div className="stamp-img-bg">
                              {item.obrazek ? (
                                <img
                                  src={item.obrazek}
                                  alt={item.emise}
                                  onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                                />
                              ) : (
                                <div className="stamp-img-missing">obrázek chybí</div>
                              )}
                            </div>
                            <div className="stamp-title stamp-title-abbr">
                              <EmissionTitleAbbr>{replaceAbbreviations(`${item.emise} (${item.rok})`)}</EmissionTitleAbbr>
                            </div>
                            <div className="stamp-bottom">
                              <div>Katalog: <span className="catalog">{katalogText || item.katalogCislo}</span></div>
                              <span className="details-link" style={{marginLeft: 8, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer'}}>detaily</span>
                            </div>
                          </div>
                        ));
                      }
                    });
                }
              })()}
            </div>
          </>
        )}
      </main>
      <Footer
        isAdmin={isAdmin}
        onAdminLogin={() => setShowAdminLogin(true)}
        onAdminLogout={handleAdminLogout}
      />
      {/* AdminPanel je nyní vykresleno mimo footer, aby modal byl překryvný */}
      <AdminPanel
        isAdmin={isAdmin}
        onLogout={handleAdminLogout}
        onLogin={handleAdminLogin}
        showAdminLogin={showAdminLogin}
        setShowAdminLogin={setShowAdminLogin}
        handleAdminLogin={handleAdminLogin}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        onAddStamp={async (stampData) => {
          const normalizedStampData = {
            ...stampData,
            obrazek: normalizeStampImagePath(stampData.obrazek, stampData.rok),
            obrazekStudie: normalizeStampImagePath(stampData.obrazekStudie, stampData.rok)
          };
          // Odeslání na backend
          const API_BASE =
            import.meta.env.VITE_API_BASE ||
            (window.location.hostname.endsWith("app.github.dev")
              ? `https://${window.location.hostname}`
              : window.location.hostname.endsWith("vercel.app")
              ? ""
              : "http://localhost:3001");
          try {
            const response = await fetch(`${API_BASE}/api/stamps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(normalizedStampData)
            });
            if (response.ok) {
              const newStamp = await response.json();
              setStamps(prev => [newStamp, ...prev]);
              setShowAddModal(false);
            } else {
              alert('Chyba při přidávání známky');
            }
          } catch (err) {
            alert('Chyba při komunikaci se serverem');
          }
        }}
        fieldSuggestions={fieldSuggestions}
      />
    </div>
  );
}


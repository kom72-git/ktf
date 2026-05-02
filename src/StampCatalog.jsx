import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from './Header';
import Footer from './Footer';
import AdminPanel from "./AdminPanel";
import DetailPage from "./StampDetail.jsx";
import Pagination from "./components/Pagination.jsx";
import CatalogFilters from "./components/CatalogFilters.jsx";
import CatalogViewControls from "./components/CatalogViewControls.jsx";
import StampBoxList from "./components/StampBoxList.jsx";
import {
  replaceAbbreviations,
  sklonujPolozka,
  sklonujEmise,
  sklonujZnamek,
  sklonujVariant,
  sklonujPosledniVlozeneEmise
} from './utils/formatovaniTextu.jsx';
import { katalogSort, emissionToSlug, slugToEmission, getCatalogBaseKey } from './utils/katalog.js';
import {
  normalizeStampImagePath,
  normalizeStampImagePathForStorage
} from "./utils/obrazekCesta.js";
import "./App.css";

// Pomocná fce: vrátí čas (ms) pro řazení podle data publikování.
// Primárně používá publishedAt; pokud není, odvozen timestamp z MongoDB ObjectId.
function getPublishTime(item) {
  if (item.publishedAt) return new Date(item.publishedAt).getTime();
  return parseInt(item._id.substring(0, 8), 16) * 1000;
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
  const [homePage, setHomePage] = useState(1);
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
      "nominal",
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
    "literatura",
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
      arr = [...arr].sort((a, b) => getPublishTime(b) - getPublishTime(a));
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
    const sortedStamps = [...filtered].sort((a, b) => getPublishTime(b) - getPublishTime(a));
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
          return getPublishTime(itemB) - getPublishTime(itemA);
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

  const homepagePageSize = useMemo(() => {
    if (homeBoxLimit === "all") {
      return null;
    }

    const parsedLimit = Number(homeBoxLimit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return HOMEPAGE_BOX_LIMIT;
    }

    return parsedLimit;
  }, [homeBoxLimit, HOMEPAGE_BOX_LIMIT]);

  const isHomepagePaginationActive = isHomepageDefault && homepagePageSize !== null;

  const totalHomepagePages = useMemo(() => {
    if (!isHomepagePaginationActive || !homepagePageSize) {
      return 1;
    }

    return Math.max(1, Math.ceil(groupedBoxes.length / homepagePageSize));
  }, [groupedBoxes.length, homepagePageSize, isHomepagePaginationActive]);

  useEffect(() => {
    if (!isHomepageDefault) {
      setHomePage(1);
      return;
    }

    setHomePage(1);
    setExpandedBoxes([]);
  }, [isHomepageDefault, homeSortMode, homeBoxLimit]);

  useEffect(() => {
    if (!isHomepagePaginationActive) {
      if (homePage !== 1) {
        setHomePage(1);
      }
      return;
    }

    if (homePage > totalHomepagePages) {
      setHomePage(totalHomepagePages);
    }
  }, [homePage, isHomepagePaginationActive, totalHomepagePages]);

  const homepageVisiblePages = useMemo(() => {
    if (!isHomepagePaginationActive || totalHomepagePages <= 1) {
      return [];
    }

    const windowSize = 4;

    if (totalHomepagePages <= windowSize) {
      return Array.from({ length: totalHomepagePages }, (_, idx) => idx + 1);
    }

    let start;
    let end;

    if (homePage <= windowSize - 1) {
      start = 1;
      end = windowSize;
    } else if (homePage >= totalHomepagePages - (windowSize - 1)) {
      end = totalHomepagePages;
      start = totalHomepagePages - windowSize + 1;
    } else {
      start = homePage - 1;
      end = start + windowSize - 1;
    }

    const sortedPages = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
    const tokens = [];

    if (start > 1) {
      tokens.push(1);
      if (start > 2) {
        tokens.push("ellipsis-left");
      }
    }

    sortedPages.forEach((page, index) => {
      tokens.push(page);
      const nextPage = sortedPages[index + 1];
      if (typeof nextPage === "number" && nextPage - page > 1) {
        tokens.push(`ellipsis-${page}-${nextPage}`);
      }
    });

    if (end < totalHomepagePages) {
      if (end < totalHomepagePages - 1) {
        tokens.push("ellipsis-right");
      }
      tokens.push(totalHomepagePages);
    }

    return tokens;
  }, [homePage, isHomepagePaginationActive, totalHomepagePages]);

  function handleHomepagePageChange(nextPage) {
    const safePage = Math.max(1, Math.min(nextPage, totalHomepagePages));
    if (safePage === homePage) return;
    setExpandedBoxes([]);
    setHomePage(safePage);
  }

  const boxesToRender = useMemo(() => {
    if (!isHomepageDefault) {
      return groupedBoxes;
    }

    if (!isHomepagePaginationActive || !homepagePageSize) {
      return groupedBoxes;
    }

    const startIndex = (homePage - 1) * homepagePageSize;
    const endIndex = startIndex + homepagePageSize;
    return groupedBoxes.slice(startIndex, endIndex);
  }, [groupedBoxes, isHomepageDefault, isHomepagePaginationActive, homepagePageSize, homePage]);

  const displayedBoxCount = boxesToRender.length;

  const displayedStampCount = useMemo(() => {
    return boxesToRender.reduce((sum, [, items]) => sum + items.length, 0);
  }, [boxesToRender]);

  const displayedVariantCount = useMemo(() => {
    if (!Array.isArray(defects) || defects.length === 0) return 0;
    const displayedStampIds = new Set(
      boxesToRender.flatMap(([, items]) => items.map((stamp) => String(stamp.idZnamky)))
    );

    // PŮVODNÍ STAV: počítal všechny vložené DV (řádky defects) pro zobrazené známky.
    // const displayedDvCount = defects.reduce((sum, defect) => {
    //   return displayedStampIds.has(String(defect.idZnamky)) ? sum + 1 : sum;
    // }, 0);

    // NOVĚ: počítáme skutečný počet variant (unikátní variantaVady na známku),
    // tj. více rozlišovacích DV stejné varianty se započítá jen jednou.
    const variantsByStamp = new Map();

    const isSharedVariant = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return false;
      // Společné varianty (např. "A, B") nechceme do počtu zahrnovat.
      if (raw.includes(",")) return true;
      const normalized = raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
      return normalized.includes("SPOLECNE");
    };

    defects.forEach((defect) => {
      const stampId = String(defect?.idZnamky || "").trim();
      if (!displayedStampIds.has(stampId)) return;

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

          // Přímá hierarchie se zapisuje tečkou: B1 -> B1.1, B1.2 ...
          if (candidate.startsWith(`${variant}.`)) return true;

          // Základní písmeno je rodič číselných větví: A -> A1, A2 ...
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
  }, [boxesToRender, defects]);

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
            onStampUpdated={(updatedStamp) => {
              if (!updatedStamp || !updatedStamp.idZnamky) return;
              setStamps((prev) => {
                let found = false;
                const next = prev.map((stamp) => {
                  if (stamp.idZnamky !== updatedStamp.idZnamky) return stamp;
                  found = true;
                  return updatedStamp;
                });
                return found ? next : prev;
              });
            }}
          />
        ) : (
          <>
            {/* Tlačítko pro přidání nové známky pro admina */}
            {isAdmin && (
              <div className="catalog-admin-add-row">
                <button className="ktf-btn-confirm" onClick={() => setShowAddModal(true)}>
                  + Přidat známku
                </button>
              </div>
            )}
            <CatalogFilters
              query={query}
              setQuery={setQuery}
              year={year}
              setYear={(newYear) => {
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
              }}
              years={filteredYears}
              emission={emission}
              setEmission={(newEmission) => {
                if (newEmission !== "all" && year !== "all") {
                  const slug = emissionToSlug(newEmission);
                  navigate(`/emise/${slug}-${year}`);
                } else if (newEmission !== "all") {
                  const slug = emissionToSlug(newEmission);
                  navigate(`/emise/${slug}`);
                } else {
                  navigate(`/`);
                }
              }}
              emissions={filteredEmissions}
              catalog={catalog}
              setCatalog={(newCatalog) => {
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
              }}
              catalogs={filteredCatalogs}
              onClear={() => {
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
              }}
              navigate={navigate}
              emissionToSlug={emissionToSlug}
            />
            <div className="count-info-row">
              <div className="count-info">
                {isHomepageDefault ? (
                  homeSortMode === "db" ? (
                    <>
                      Zobrazeno: <strong>{displayedBoxCount}</strong> z <strong>{totalBoxCount}</strong> posledních vložených emisí do katalogu (<strong>{displayedStampCount}</strong> {sklonujZnamek(displayedStampCount)}, <strong>{displayedVariantCount}</strong> {sklonujVariant(displayedVariantCount)})
                    </>
                  ) : (
                    <>
                      Zobrazeno: <strong>{displayedBoxCount}</strong> z <strong>{totalBoxCount}</strong> emisí do katalogu (<strong>{displayedStampCount}</strong> {sklonujZnamek(displayedStampCount)}, <strong>{displayedVariantCount}</strong> {sklonujVariant(displayedVariantCount)})
                    </>
                  )
                ) : (
                  <>
                    Obsahuje: <strong>{totalBoxCount}</strong> {sklonujEmise(totalBoxCount)} (<strong>{filtered.length}</strong> {sklonujZnamek(filtered.length)}, <strong>{displayedVariantCount}</strong> {sklonujVariant(displayedVariantCount)})
                  </>
                )}
              </div>
              <CatalogViewControls
                isHomepageDefault={isHomepageDefault}
                homeBoxLimit={homeBoxLimit}
                setHomeBoxLimit={setHomeBoxLimit}
                homeBoxLimitOptions={homeBoxLimitOptions}
                HOMEPAGE_BOX_LIMIT={HOMEPAGE_BOX_LIMIT}
                homeSortMode={homeSortMode}
                setHomeSortMode={setHomeSortMode}
                handleToggleVisibleBoxes={handleToggleVisibleBoxes}
                visibleExpandableKeys={visibleExpandableKeys}
                areAllVisibleExpanded={areAllVisibleExpanded}
              />
            </div>
            <StampBoxList
              boxesToRender={boxesToRender}
              expandedBoxes={expandedBoxes}
              handleToggleBox={handleToggleBox}
              onNavigateToDetail={(id) => {
                if (props && props.setDetailId) {
                  props.setDetailId(id);
                } else if (navigate) {
                  navigate(`/detail/${id}`);
                } else {
                  window.location.href = `/detail/${id}`;
                }
              }}
              onNavigateToEmission={(slug, rok, key) => {
                if (navigate) {
                  navigate(`/emise/${slug}-${rok}`, { state: { openBoxKey: key } });
                } else {
                  window.location.href = `/emise/${slug}-${rok}`;
                }
              }}
            />

            {isHomepagePaginationActive && totalHomepagePages > 1 && (
              <Pagination
                homePage={homePage}
                totalHomepagePages={totalHomepagePages}
                homepageVisiblePages={homepageVisiblePages}
                onPageChange={handleHomepagePageChange}
              />
            )}
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
            isHidden: stampData.isHidden ?? true,
            obrazek: normalizeStampImagePathForStorage(stampData.obrazek, stampData.rok),
            obrazekStudie: normalizeStampImagePathForStorage(stampData.obrazekStudie, stampData.rok),
            schemaTF: normalizeStampImagePathForStorage(stampData.schemaTF, stampData.rok)
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


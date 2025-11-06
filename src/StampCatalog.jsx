import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from './Header';
import Footer from './Footer';
import AdminPanel from "./AdminPanel";
import DetailPage from "./StampDetail.jsx";
import EmissionTitleAbbr from "./components/EmissionTitleAbbr.jsx";
import {
  replaceAbbreviations,
  sklonujPolozka
} from './utils/formatovaniTextu.jsx';
import { katalogSort } from './utils/katalog.js';
import "./App.css";


export default function StampCatalog(props) {
  // Stav pro rozbalené boxy (klíč: emise|rok)
  const [expandedBoxes, setExpandedBoxes] = useState([]);
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
  if (props.onlyYear) {
    year = props.initialYear || "all";
    emission = "all";
  } else if (props.initialEmissionSlug) {
    const match = props.initialEmissionSlug.match(/^(.*)-(\d{4})$/);
    if (match) {
      const slug = match[1];
      const rok = match[2];
      emission = slugToEmission(slug) || "all";
      year = rok || "all";
    } else {
      emission = slugToEmission(props.initialEmissionSlug) || "all";
      year = props.initialYear || "all";
    }
  }
  const [catalog, setCatalog] = useState("all");
  const [internalDetailId, setInternalDetailId] = useState(null);
  const detailId = props && props.detailId ? props.detailId : internalDetailId;
  const setDetailId = props && props.setDetailId ? props.setDetailId : setInternalDetailId;

  // Pomocná funkce na převod názvu emise na slug (bez diakritiky, malá písmena, pomlčky)
  function emissionToSlug(emise) {
    return emise
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
  // Pomocná funkce na převod slug zpět na název emise (najde v seznamu emisí)
  function slugToEmission(slug) {
    if (!slug) return null;
    const allEmissions = stamps.map(s => s.emise);
    // Porovnávej slugy bez diakritiky, malá písmena, pomlčky
    return allEmissions.find(em => emissionToSlug(em) === slug.toLowerCase()) || null;
  }

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
    if (detailId) {
      const item = stamps.find(d => d.idZnamky === detailId);
      document.title = item ? `${item.emise} (${item.rok}) | Katalog TF` : 'Katalog TF';
    } else if (emission !== "all") {
      document.title = `${emission} | Katalog TF`;
    } else {
      document.title = 'Katalog TF';
    }
  }, [detailId, stamps, emission]);

  const years = useMemo(() => {
    const s = new Set(stamps.map((d) => d.rok));
    return ["all", ...Array.from(s).sort((a, b) => a - b)]; // od nejstaršího nahoru
  }, [stamps]);

  const filteredEmissions = useMemo(() => {
    let filtered = stamps;
    if (year !== "all") {
      filtered = filtered.filter((d) => d.rok === Number(year));
    }
    const s = new Set(filtered.map((d) => d.emise));
    return ["all", ...Array.from(s).sort()];
  }, [year, stamps]);

  const filteredCatalogs = useMemo(() => {
    let filtered = stamps;
    if (year !== "all") {
      filtered = filtered.filter((d) => d.rok === Number(year));
    }
    const s = new Set(filtered.map((d) => d.katalogCislo));
    // Nejprve podle čísla, pak podle prefixu
    return ["all", ...Array.from(s).sort(katalogSort)];
  }, [year, stamps]);

  // Výchozí náhled: 20 nejnovějších známek podle _id (největší = nejnovější)
  const filtered = useMemo(() => {
    let arr = stamps
      .filter((d) => {
        if (year !== "all" && d.rok !== Number(year)) return false;
        if (emission !== "all" && d.emise !== emission) return false;
        if (catalog !== "all" && d.katalogCislo !== catalog) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            (d.emise && d.emise.toLowerCase().includes(q)) ||
            (d.katalogCislo && d.katalogCislo.toLowerCase().includes(q)) ||
            (d.rok && String(d.rok).includes(q))
          );
        }
        return true;
      });
    // Pokud je vybrán konkrétní rok, řadíme podle katalogového čísla (primárně číslo, pak prefix)
    if (year !== "all") {
      arr = [...arr].sort(katalogSort);
    }
    // Pokud nejsou použity žádné filtry, zobrazíme pouze 20 nejnovějších
    if (
      year === "all" &&
      emission === "all" &&
      catalog === "all" &&
      !query
    ) {
      arr = [...arr].sort((a, b) => b._id.localeCompare(a._id)).slice(0, 20);
    }
    return arr;
  }, [query, year, emission, catalog, stamps]);


  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        {/* ...existující kód bez testovacího výpisu... */}
        {detailId ? (
          <DetailPage id={detailId} onBack={() => setDetailId(null)} defects={defects} isAdmin={isAdmin} />
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
                {years.filter(y => y !== "all").map((y) => (
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
                setCatalog(e.target.value);
                // Neprováděj žádnou navigaci, pouze filtruj v paměti
              }}>
                <option value="all">Katalogové číslo</option>
                {filteredCatalogs.filter(c => c !== "all").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={() => {
                setQuery("");
                setCatalog("all");
                if (navigate) {
                  navigate(`/`);
                } else {
                  window.location.href = `/`;
                }
              }}>Vyčistit</button>
            </section>
            <div className="count-info">
              {year === "all" && emission === "all" && catalog === "all" && !query
                ? <>Poslední přidané položky z celkových <strong>{stamps.length}</strong> v katalogu</>
                : <>Obsahuje: <strong>{filtered.length}</strong> {sklonujPolozka(filtered.length)}</>}
            </div>
            <div className="stamp-list-layout">
              {(() => {
                // Pokud je aktivní pouze filtr roku (adresa /rok/XXXX), zobrazíme přímo známky z daného roku
                // VŽDY seskupovat do boxů podle (emise, rok), i při použití filtrů
                {
                  // Vezmi vždy aktuální filtered pole (po všech filtrech)
                  const stampsToShow = filtered;
                  // Seskupení boxů podle (emise, rok)
                  const emissionMap = new Map();
                  // Nejprve seřadíme stamps podle _id sestupně (nejnovější první)
                  const sortedStamps = [...stampsToShow].sort((a, b) => b._id.localeCompare(a._id));
                  sortedStamps.forEach(item => {
                    const key = `${item.emise}|${item.rok}`;
                    if (!emissionMap.has(key)) {
                      emissionMap.set(key, [item]);
                    } else {
                      emissionMap.get(key).push(item);
                    }
                  });
                  return Array.from(emissionMap.entries())
                    .sort((a, b) => b[1][0]._id.localeCompare(a[1][0]._id))
                    .flatMap(([key, items]) => {
                      const sortedItems = [...items].sort(katalogSort);
                      const item = sortedItems[0];
                      const isSingle = sortedItems.length === 1;
                      const [emise, rok] = key.split('|');
                      const slug = emissionToSlug(emise);
                      const expanded = expandedBoxes.includes(key);
                      if (!expanded) {
                        // SLOUČENÝ BOX
                        // Výpis katalogových čísel všech známek v boxu
                        const katalogCisla = sortedItems.map(z => z.katalogCislo).filter(Boolean);
                        // Rozparsovat prefixy a čísla
                        const parsed = katalogCisla.map(kat => {
                          const m = kat.match(/^([A-ZČŘŽŠĚÚŮ]+)?\s*(\d+)/i);
                          return m ? { prefix: (m[1] || '').trim(), cislo: m[2] } : { prefix: '', cislo: kat };
                        });
                        const allSamePrefix = parsed.every(p => p.prefix === parsed[0].prefix);
                        let katalogText = '';
                        if (allSamePrefix && parsed[0].prefix) {
                          // Všechny mají stejný prefix – vždy čárkovaný seznam
                          const cisla = parsed.map(p => p.cislo);
                          katalogText = parsed[0].prefix + ' ' + cisla.join(', ');
                        } else {
                          // Různé prefixy nebo bez prefixu
                          katalogText = katalogCisla.join(', ');
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
                        return sortedItems.map((item, idx) => (
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
                              <div>Katalog: <span className="catalog">{item.katalogCislo}</span></div>
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
              body: JSON.stringify(stampData)
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
      />
    </div>
  );
}


import React, { useState, useMemo, useEffect } from "react";
import { Search, Image } from "lucide-react";
import "./App.css";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "./fancybox-responsive.css";

function DetailPage({ id, onBack, defects }) {
  const [item, setItem] = useState(null);
  useEffect(() => {
    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      (window.location.hostname.endsWith("app.github.dev")
        ? `https://${window.location.hostname}`
        : "");
    fetch(`${API_BASE}/api/stamps/${id}`)
      .then(res => res.json())
      .then(data => {
        console.log("[DetailPage] Načtená data:", data);
        setItem(data);
      })
      .catch(err => {
        console.error("[DetailPage] Chyba při načítání detailu:", err);
      });
  }, [id]);
  if (!item) return <div className="p-8">Načítám…</div>;
  if (item.error) {
    console.error("[DetailPage] API vrátilo chybu:", item.error);
    return <div className="p-8 text-red-600">Chyba: {item.error}</div>;
  }

  // Vady pro tuto známku
  const itemDefects = defects.filter(d => d.idZnamky === item.idZnamky);

  // Seskupení variant podle hlavního písmene (Varianta A, B, ...)
  // Podvarianty (A1, B2.1, ...) se vypisují pod tímto nadpisem, každá jen jednou
  const grouped = {};
  itemDefects.forEach(def => {
    if (!def.variantaVady) return;
    // Hlavní varianta je první písmeno (A, B, ...)
    const main = def.variantaVady.match(/^[A-Z]/i);
    const groupKey = main ? main[0] : '?';
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(def);
  });

  // Fancybox galerie pro skupinu
  const openFancybox = (flatIndex = 0) => {
    if (!itemDefects || itemDefects.length === 0) return;
    const slides = itemDefects.map(def => ({
      src: def.obrazekVady,
      caption:
        `<div style='text-align:center;'>`
        + `<span style='font-weight:700;font-size:1.05em;'>${def.variantaVady || ''}${def.variantaVady && def.umisteniVady ? ' – ' : ''}${def.umisteniVady || ''}</span>`
        + (def.popisVady ? `<br><span style='font-size:1em;font-weight:400;margin-top:8px;display:inline-block;'>${def.popisVady}</span>` : '')
        + `</div>`
    }));
    Fancybox.show(slides, {
      startIndex: flatIndex,
      Toolbar: [ 'thumbs', 'zoom', 'close' ],
      dragToClose: true,
      animated: true,
      compact: false,
      showClass: 'fancybox-zoomIn',
      hideClass: 'fancybox-zoomOut',
      closeButton: 'top',
      defaultType: 'image',
      Carousel: { Thumbs: { showOnStart: false } },
    });
  };

  return (
    <div className="stamp-detail-block">
      <button onClick={onBack} className="back-btn">← Zpět</button>
      <div className="detail-title">{item.emise} ({item.rok})</div>
      <div className="detail-catalog">Katalogové číslo: <strong>{item.katalogCislo}</strong></div>
      <div className="stamp-detail-layout" style={{ display: 'flex', gap: 32 }}>
        <div className="stamp-detail-img-col" style={{ flex: '0 0 auto' }}>
          <div className="stamp-detail-img-bg stamp-detail-img-bg-none">
            <img
              src={item.obrazekStudie || item.obrazek}
              alt={item.emise}
              className="stamp-detail-img stamp-detail-img-main"
              onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
            />
          </div>
        </div>
        <div className="stamp-spec stamp-detail-spec-col" style={{ flex: '1 1 0%' }}>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Datum vydání</span><span className="stamp-spec-value">{item.datumVydani}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Návrh</span><span className="stamp-spec-value">{item.navrh}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Rytec</span><span className="stamp-spec-value">{item.rytec}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Druh tisku</span><span className="stamp-spec-value">{item.druhTisku}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Tisková forma</span><span className="stamp-spec-value">{item.tiskovaForma}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Zoubkování</span><span className="stamp-spec-value">{item.zoubkovani}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Papír</span><span className="stamp-spec-value">{item.papir}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Rozměr</span><span className="stamp-spec-value">{item.rozmer}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Náklad</span><span className="stamp-spec-value">{item.naklad}</span></div>
          <div className="stamp-spec-row"><span className="stamp-spec-label">Schéma TF</span><span className="stamp-spec-value">{item.schemaTF && <img src={item.schemaTF} alt="Schéma TF" className="tf-img" style={{maxWidth:'220px',maxHeight:'120px',width:'auto',height:'auto'}} onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }} />}</span></div>
        </div>
      </div>
      {itemDefects.length > 0 && (
        <div>
          {item.Studie && item.studieUrl ? (() => {
            const parts = item.Studie.split(',');
            const before = parts[0] || '';
            const after = parts.slice(1).join(',').trim();
            return (
              <div className="study-inline-note" style={{ marginTop: 18, marginBottom: 18 }}>
                <span className="study-inline-label">Rozlišeno dle studie:</span> {before}{after && ', '}
                {after && (
                  <a href={item.studieUrl} target="_blank" rel="noopener noreferrer">{after}</a>
                )}
              </div>
            );
          })() : item.Studie && (
            <div className="study-inline-note" style={{ marginTop: 18, marginBottom: 18 }}>
              <span className="study-inline-label">Rozlišeno dle studie:</span> {item.Studie}
            </div>
          )}
          {/* Seskupení variant podle hlavní varianty (A, B, ...) */}
          {Object.entries(grouped).map(([group, defs]) => {
            // --- PŮVODNÍ ČÍSLOVÁNÍ OBRÁZKŮ PODLE SKUPIN ---
            /*
            // Varianta: číslování obrázků v rámci skupiny (A, B, ...)
            // Pokud chcete obnovit tuto logiku, odkomentujte níže:
            let imageCounter = 1;
            ...
            <div className="variant-label">Obr. {currentImageNumber}</div>
            ...
            */

            // NOVÁ VARIANTA: Globální číslování obrázků napříč všemi variantami, číslo obrázku vždy
            const NO_IMAGE = '/img/no-image.png';
            // Vytvoříme pole všech zobrazených variant v pořadí (hlavní + podvarianty napříč skupinami)
            // a pro každou variantu vypíšeme její globální číslo
            // Nejprve sestavíme pole všech variant v pořadí zobrazení
            const allVariantsInOrder = [];
            Object.entries(grouped).forEach(([, d]) => {
              // hlavní varianty
              d.filter(def => def.variantaVady && def.variantaVady.length === 1).forEach(def => allVariantsInOrder.push(def));
              // podvarianty (unikátní)
              const seen = new Set();
              d.filter(def => {
                if (def.variantaVady && def.variantaVady.length > 1) {
                  if (seen.has(def.variantaVady)) return false;
                  seen.add(def.variantaVady);
                  return true;
                }
                return false;
              }).forEach(def => allVariantsInOrder.push(def));
            });
            // Funkce pro zjištění globálního čísla obrázku
            function getGlobalImageNumber(def) {
              return allVariantsInOrder.indexOf(def) + 1;
            }
            const subvariantLabels = (() => {
              const seen = new Set();
              return defs.filter(def => {
                if (def.variantaVady && def.variantaVady.length > 1) {
                  if (seen.has(def.variantaVady)) return false;
                  seen.add(def.variantaVady);
                  return true;
                }
                return false;
              }).map(d => d.variantaVady);
            })();
            const mainDef = defs.find(def => def.variantaVady && def.variantaVady.length === 1);
            const typVarianty = mainDef && mainDef.typVarianty ? mainDef.typVarianty : '';
            return (
              <div key={group}>
                <div className="variant-subtitle">
                  Varianta {group}
                  {typVarianty && (
                    <><span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span><span className="variant-type">{typVarianty}</span></>
                  )}
                </div>
                {subvariantLabels.length > 0 && (
                  <div className="variant-group-info">
                    <span className="variant-group-info-icon" title="Obsahuje podvarianty">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'inline',verticalAlign:'middle'}}>
                        <circle cx="10" cy="10" r="10" fill="#2563eb"/>
                        <text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" fontFamily="Arial,Helvetica,sans-serif">i</text>
                      </svg>
                    </span>
                    <span className="variant-group-info-text">Obsahuje podvarianty: {subvariantLabels.join(", ")}</span>
                  </div>
                )}
                <div className="variants">
                  {/* Nejprve hlavní varianta (A, B, ...) pokud existuje */}
                  {defs.filter(def => def.variantaVady && def.variantaVady.length === 1).map((def, i) => {
                    const flatIndex = itemDefects.findIndex(d => d === def);
                    return (
                      <div key={def.idVady || `main-${i}`} className="variant">
                        <div className="variant-popis">
                          <span className="variant-popis-hlavni">{def.variantaVady}</span>
                          {def.umisteniVady && <><span className="variant-dash">–</span><span className="variant-popis-hlavni">{def.umisteniVady}</span></>}
                        </div>
                        <div className="variant-img-bg variant-img-bg-pointer" onClick={() => openFancybox(flatIndex)}>
                          <img src={def.obrazekVady} alt={def.idVady} onError={e => { e.target.onerror = null; e.target.src = NO_IMAGE; }} />
                        </div>
                        <div className="variant-label">Obr. {getGlobalImageNumber(def)}</div>
                        {def.popisVady && <div className="variant-popis-detail">{def.popisVady}</div>}
                      </div>
                    );
                  })}
                  {/* Poté unikátní podvarianty (A1, B2.1, ...) */}
                  {(() => {
                    const seen = new Set();
                    return defs.filter(def => {
                      if (def.variantaVady && def.variantaVady.length > 1) {
                        if (seen.has(def.variantaVady)) return false;
                        seen.add(def.variantaVady);
                        return true;
                      }
                      return false;
                    }).map((def, i) => {
                      const flatIndex = itemDefects.findIndex(d => d === def);
                      return (
                        <div key={def.idVady || `sub-${i}`} className="variant">
                          <div className="variant-popis">
                            <span className="variant-popis-hlavni">{def.variantaVady}</span>
                            {def.umisteniVady && <><span className="variant-dash">–</span><span className="variant-popis-hlavni">{def.umisteniVady}</span></>}
                          </div>
                          <div className="variant-img-bg variant-img-bg-pointer" onClick={() => openFancybox(flatIndex)}>
                            <img src={def.obrazekVady} alt={def.idVady} onError={e => { e.target.onerror = null; e.target.src = NO_IMAGE; }} />
                          </div>
                          <div className="variant-label">Obr. {getGlobalImageNumber(def)}</div>
                          {def.popisVady && <div className="variant-popis-detail">{def.popisVady}</div>}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StampCatalog(props) {
  const [stamps, setStamps] = useState([]);
  const [defects, setDefects] = useState([]);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [emission, setEmission] = useState("all");
  const [catalog, setCatalog] = useState("all");
  const [internalDetailId, setInternalDetailId] = useState(null);
  const detailId = props && props.detailId ? props.detailId : internalDetailId;
  const setDetailId = props && props.setDetailId ? props.setDetailId : setInternalDetailId;

  useEffect(() => {
    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      (window.location.hostname.endsWith("app.github.dev")
        ? `https://${window.location.hostname}`
        : "");
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
    if (detailId) {
      const item = stamps.find(d => d.idZnamky === detailId);
      document.title = item ? `${item.emise} (${item.rok}) | Katalog TF` : 'Katalog TF';
    } else {
      document.title = 'Katalog TF';
    }
  }, [detailId, stamps]);

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
    // Nejprve podle číselné části, pak podle prefixu
    function katalogSort(a, b) {
      const numA = (a.match(/\d+/) || [""])[0];
      const numB = (b.match(/\d+/) || [""])[0];
      if (numA !== numB) {
        return Number(numA) - Number(numB);
      }
      // Pokud čísla stejná, porovnej prefixy
      const prefixA = a.replace(numA, "");
      const prefixB = b.replace(numB, "");
      return prefixA.localeCompare(prefixB);
    }
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

  function sklonujPolozka(count) {
    if (count === 1) return 'položka';
    if (count >= 2 && count <= 4) return 'položky';
    return 'položek';
  }

  return (
    <div className="page-bg">
      <header className="header">
        <h1 className="main-title">
          <img src="/img/inicialy-K.png" alt="K" className="main-title-img" />atalog <span className="main-title-nowrap"><img src="/img/inicialy-T.png" alt="T" className="main-title-img" />iskových</span> <span className="main-title-nowrap"><img src="/img/inicialy-F.png" alt="F" className="main-title-img" />orem</span> českosloven&shy;ských známek
        </h1>
        <p className="subtitle">Seznam studií rozlišení tiskových forem, desek a polí při tisku československých známek v letech 1945-92.</p>
      </header>
      <main className="main">
        {/* ...existující kód bez testovacího výpisu... */}
        {detailId ? (
          <DetailPage id={detailId} onBack={() => setDetailId(null)} defects={defects} />
        ) : (
          <>
            <section className="search-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Vyhledat…"
              />
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="all">Rok</option>
                {years.filter(y => y !== "all").map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={emission} onChange={(e) => setEmission(e.target.value)}>
                <option value="all">Emise</option>
                {filteredEmissions.filter(em => em !== "all").map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
              <select value={catalog} onChange={(e) => setCatalog(e.target.value)}>
                <option value="all">Katalogové číslo</option>
                {filteredCatalogs.filter(c => c !== "all").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={() => { setQuery(""); setYear("all"); setEmission("all"); setCatalog("all"); }}>Vyčistit</button>
            </section>
            <div className="count-info">
              {year === "all" && emission === "all" && catalog === "all" && !query
                ? <>Poslední přidané položky z celkových <strong>{stamps.length}</strong> v katalogu</>
                : <>Obsahuje: <strong>{filtered.length}</strong> {sklonujPolozka(filtered.length)}</>}
            </div>
            <div className="stamp-list-layout">
              {filtered.map((item) => (
                <div key={item.idZnamky} className="stamp-card stamp-card-pointer"
                  onClick={() => {
                    if (props && props.setDetailId) {
                      props.setDetailId(item.idZnamky);
                    } else {
                      setDetailId(item.idZnamky);
                    }
                  }}>
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
                  <div className="stamp-title">
                    <span className="emission">{item.emise}</span>
                    <span className="year"> ({item.rok})</span>
                  </div>
                  <div className="stamp-bottom">
                    <div>Katalog: <span className="catalog">{item.katalogCislo}</span></div>
                    <a href="#" className="details-link" onClick={e => { e.preventDefault(); 
                      if (props && props.setDetailId) {
                        props.setDetailId(item.idZnamky);
                      } else {
                        setDetailId(item.idZnamky);
                      }
                    }}>Detaily</a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="footer">
        <div className="footer-inner">
          © {new Date().getFullYear()} kom72 &nbsp;|&nbsp; <a href="https://github.com/kom72/ktf" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </footer>
    </div>
  );
}

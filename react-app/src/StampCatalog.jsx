import React, { useState, useMemo } from "react";
// ...existing code...
import sampleData from "./sampleData";
import { Search, Image } from "lucide-react";
import "./App.css";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
// thumbs plugin není importován
import "./fancybox-responsive.css";


function DetailPage({ id, onBack }) {
  // ...existing code...
  const item = sampleData.find((d) => d.id === id);
  if (!item) return <div className="p-8">Nenalezeno</div>;

  // Mapování indexů variant na index v item.defects (podle pořadí v poli)
  const defectIndexMap = {};
  if (item.defects && item.defects.length > 0) {
    item.defects.forEach((def, idx) => {
      defectIndexMap[idx] = idx;
    });
  }
  // Funkce pro otevření Fancyboxu s galerií obrázků variant
         const openFancybox = (startIndex = 0) => {
           if (!item.defects || item.defects.length === 0) return;
           const slides = item.defects.map(def => ({
             src: def.image,
             caption:
               `<div style='text-align:center;'>`
               + `<span style='font-weight:700;font-size:1.05em;'>${def.code || ''}${def.code && def.descriptionText ? ' – ' : ''}${def.descriptionText || ''}</span>`
               + (def.description ? `<br><span style='font-size:1em;font-weight:400;margin-top:8px;display:inline-block;'>${def.description}</span>` : '')
               + `</div>`
           }));
           Fancybox.show(slides, {
             startIndex,
             Toolbar: [
               'thumbs',
               'zoom',
               'close',
             ],
             dragToClose: true,
             animated: true,
             compact: false,
             showClass: 'fancybox-zoomIn',
             hideClass: 'fancybox-zoomOut',
             closeButton: 'top',
             defaultType: 'image',
             Carousel: {
               Thumbs: {
                 showOnStart: false,
               },
             },
           });
  };

  return (
    <div className="stamp-detail-block">
      <button onClick={onBack} className="back-btn">← Zpět</button>
      <div className="detail-title">{item.emission} ({item.year})</div>
      <div className="detail-catalog">Katalogové číslo: <strong>{item.catalogNumber}</strong></div>
      <div className="stamp-detail-layout" style={{ display: 'flex', gap: 32 }}>
        <div className="stamp-detail-img-col" style={{ flex: '0 0 auto' }}>
          <div className="stamp-detail-img-bg stamp-detail-img-bg-none">
            <img
              src={item.images[0]}
              alt={item.emission}
              className="stamp-detail-img stamp-detail-img-main"
              onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
            />
          </div>
        </div>
        <div className="stamp-spec stamp-detail-spec-col" style={{ flex: '1 1 0%' }}>
          {item.specs && item.specs.map((spec, idx) => (
            spec.label === 'Schéma TF' && spec.tfImage ? (
              <div key={idx} className="stamp-spec-row spec-tf-row">
                <span className="stamp-spec-label">{spec.label}</span>
                <span className="stamp-spec-value">
                  <img src={spec.tfImage} alt="Schéma TF" className="tf-img" />
                </span>
              </div>
            ) : (
              <div key={idx} className="stamp-spec-row">
                <span className="stamp-spec-label">{spec.label}</span>
                <span className="stamp-spec-value">{spec.value}</span>
              </div>
            )
          ))}
        </div>
      </div>
      {item.defects && item.defects.length > 0 && (
        <div>
          {item.studyNote && (
            <div className="study-inline-note" style={{ marginTop: 18, marginBottom: 18 }}><span className="study-inline-label">Rozlišeno dle studie:</span> {item.studyNote}</div>
          )}
          {/* Seskupení variant podle prvního písmene code */}
          {(() => {
            // Seskupit varianty podle prvního písmene code
            const groups = {};
            item.defects.forEach((def) => {
              const groupKey = def.code ? def.code[0] : "?";
              if (!groups[groupKey]) groups[groupKey] = [];
              groups[groupKey].push(def);
            });
            return Object.entries(groups).map(([group, defs]) => {
              return (
                <div key={group}>
                  <div className="variant-subtitle">Varianta {group}</div>
                  {/* Info o podvariantách */}
                  {(() => {
                    const subCodes = defs.map(d => d.code).filter(c => c && c.length > 1);
                    const uniqueSubCodes = Array.from(new Set(subCodes));
                    return uniqueSubCodes.length > 0 ? (
                      <div className="variant-group-info">
                        <span className="variant-group-info-icon" title="Tato skupina obsahuje podvarianty">
                          <svg width="1em" height="1em" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="#2563eb"/>
                            <text x="12" y="16" textAnchor="middle" fontSize="14" fill="#fff" fontFamily="Arial" fontWeight="bold">i</text>
                          </svg>
                        </span>
                        <span className="variant-group-info-text">Obsahuje podvarianty: {uniqueSubCodes.join(", ")}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="variants">
                    {defs.map((def, i) => {
                      // ...existing code...
                      const detail = def.description;
                      // Label generovaný podle indexu v item.defects
                      const defectIdx = item.defects.indexOf(def);
                      const autoLabel = def.label ? def.label : `obr. ${defectIdx + 1}`;
                      return (
                        <div key={i} className="variant">
                          {/* Hlavní popisek nad obrázkem */}
                          {(def.code || def.descriptionText) && (
                            <div className="variant-popis">
                              {def.code && <span className="variant-popis-hlavni">{def.code}</span>}
                              {def.code && def.descriptionText ? <span className="variant-dash">–</span> : null}
                              {def.descriptionText && <span className="variant-popis-hlavni">{def.descriptionText}</span>}
                            </div>
                          )}
                          <div
                            className="variant-img-bg variant-img-bg-pointer"
                            onClick={() => openFancybox(defectIdx)}
                          >
                            <img
                              src={def.image}
                              alt={autoLabel}
                              onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                            />
                          </div>
                          <div className="variant-label">{autoLabel}</div>
                          {detail && (
                            <div className="variant-popis-detail">{detail}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

export default function StampCatalog(props) {
  // Funkce pro řazení podle číselné části katalogového čísla
  function katalogSort(a, b) {
    const numA = parseInt(a.catalogNumber.replace(/[^0-9]/g, ""), 10);
    const numB = parseInt(b.catalogNumber.replace(/[^0-9]/g, ""), 10);
    if (numA !== numB) return numA - numB;
    return a.catalogNumber.localeCompare(b.catalogNumber);
  }
  function sklonujPolozka(count) {
    if (count === 1) return 'položka';
    if (count >= 2 && count <= 4) return 'položky';
    return 'položek';
  }
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [emission, setEmission] = useState("all");
  const [catalog, setCatalog] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // DetailId a setDetailId: pokud nejsou v props, použij interní stav
  const [internalDetailId, setInternalDetailId] = useState(null);
  const detailId = props && props.detailId ? props.detailId : internalDetailId;
  const setDetailId = props && props.setDetailId ? props.setDetailId : setInternalDetailId;

  // Dynamický titulek stránky
  React.useEffect(() => {
    if (detailId) {
      const item = sampleData.find(d => d.id === detailId);
      document.title = item ? `${item.emission} (${item.year}) | Katalog TF` : 'Katalog TF';
    } else {
      document.title = 'Katalog TF';
    }
  }, [detailId]);

  const years = useMemo(() => {
    const s = new Set(sampleData.map((d) => d.year));
    return ["all", ...Array.from(s).sort((a, b) => b - a)];
  }, []);

  const emissions = useMemo(() => {
    const s = new Set(sampleData.map((d) => d.emission));
    return ["all", ...Array.from(s).sort()];
  }, []);

  const catalogs = useMemo(() => {
    const s = new Set(sampleData.map((d) => d.catalogNumber));
    return ["all", ...Array.from(s).sort((a, b) => katalogSort({catalogNumber: a}, {catalogNumber: b}))];
  }, []);

  const filtered = useMemo(() => {
    return sampleData
      .filter((d) => {
        if (year !== "all" && d.year !== Number(year)) return false;
        if (emission !== "all" && d.emission !== emission) return false;
        if (catalog !== "all" && d.catalogNumber !== catalog) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            d.description.toLowerCase().includes(q) ||
            d.emission.toLowerCase().includes(q) ||
            (d.catalogNumber && d.catalogNumber.toLowerCase().includes(q)) ||
            (d.face && d.face.toLowerCase().includes(q)) ||
            (d.printingForm && d.printingForm.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort(katalogSort);
  }, [query, year, emission, catalog]);


  return (
    <div className="page-bg">
      <header className="header">
        <h1 className="main-title">Katalog tiskových forem — československé známky</h1>
        <p className="subtitle">Zde bude nějaký doplňující popisek.</p>
      </header>
      <main className="main">
        {detailId ? (
          <DetailPage id={detailId} onBack={() => setDetailId(null)} onLightbox={setLightboxIndex} />
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
                {emissions.filter(em => em !== "all").map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
              <select value={catalog} onChange={(e) => setCatalog(e.target.value)}>
                <option value="all">Katalogové číslo</option>
                {catalogs.filter(c => c !== "all").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={() => { setQuery(""); setYear("all"); setEmission("all"); setCatalog("all"); }}>Vyčistit</button>
            </section>
            <div className="count-info">Zobrazeno: {filtered.length} {sklonujPolozka(filtered.length)}</div>
            <div className="stamp-list-layout">
              {filtered.map((item) => (
                <div key={item.id} className="stamp-card stamp-card-pointer"
                  onClick={() => {
                    // Pokud je setDetailId z routeru, naviguj na detail (změna URL)
                    if (props && props.setDetailId) {
                      props.setDetailId(item.id);
                    } else {
                      setDetailId(item.id);
                    }
                  }}>
                  <div className="stamp-img-bg">
                    {item.images && item.images.length ? (
                      <img
                        src={item.images[0]}
                        alt={item.emission}
                        onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                      />
                    ) : (
                      <div className="stamp-img-missing">obrázek chybí</div>
                    )}
                  </div>
                  <div className="stamp-title">
                    <span className="emission">{item.emission}</span>
                    <span className="year"> ({item.year})</span>
                  </div>
                  <div className="stamp-bottom">
                    <div>Katalog: <span className="catalog">{item.catalogNumber}</span></div>
                    <a href="#" className="details-link" onClick={e => { e.preventDefault(); 
                      if (props && props.setDetailId) {
                        props.setDetailId(item.id);
                      } else {
                        setDetailId(item.id);
                      }
                    }}>Detaily</a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Fancybox lightbox s podporou zoomu, klávesnice a vlastních popisků */}
        {typeof lightboxIndex === 'number' && detailId && (() => {
          const item = sampleData.find((d) => d.id === detailId);
          if (!item || !item.defects) return null;
          // Fancybox potřebuje HTML elementy s data-fancybox atributem
          return (
            <div style={{ display: 'none' }}>
              {item.defects.map((def, i) => (
                <a
                  key={i}
                  href={def.image}
                  data-fancybox="gallery"
                  data-caption={`<div><strong>${def.code || ''}${def.code && def.descriptionText ? ' – ' : ''}${def.descriptionText || ''}</strong><br/>${def.description || ''}</div>`}
                  style={{ display: 'none' }}
                >
                  Obrázek
                </a>
              ))}
            </div>
          );
        })()}
      </main>
    </div>
  );
}

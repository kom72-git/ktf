import React, { useState, useMemo } from "react";
import sampleData from "./sampleData";
import { motion } from "framer-motion";
import { Search, Image } from "lucide-react";
import "./App.css";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";


function DetailPage({ id, onBack, onLightbox }) {
  const item = sampleData.find((d) => d.id === id);
  if (!item) return <div className="p-8">Nenalezeno</div>;

  // Mapování indexů variant na index v item.defects (podle pořadí v poli)
  const defectIndexMap = {};
  if (item.defects && item.defects.length > 0) {
    item.defects.forEach((def, idx) => {
      defectIndexMap[idx] = idx;
    });
  }
  return (
    <div className="stamp-detail-block">
      <button onClick={onBack} className="back-btn">← Zpět</button>
      <div className="detail-title">{item.emission} ({item.year})</div>
      <div className="detail-catalog">Katalogové číslo: <strong>{item.catalogNumber}</strong></div>
      <div className="stamp-detail-layout" style={{ display: 'flex', gap: 32 }}>
        <div className="stamp-detail-img-col" style={{ flex: '0 0 auto' }}>
          <div className="stamp-detail-img-bg stamp-detail-img-bg-none">
            <img src={item.images[0]} alt={item.emission} className="stamp-detail-img stamp-detail-img-main" />
          </div>
        </div>
        <div className="stamp-spec stamp-detail-spec-col" style={{ flex: '1 1 0%' }}>
          {item.specs && item.specs.map((spec, idx) => (
            <div key={idx} className="stamp-spec-row">
              <span className="stamp-spec-label">{spec.label}</span>
              <span className="stamp-spec-value">
                {spec.label === 'Schéma TF' && spec.tfImage ? (
                  <img src={spec.tfImage} alt="Schéma TF" className="tf-img" />
                ) : (
                  spec.value
                )}
              </span>
            </div>
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
              // Najít obecnou vadu (např. B) a podvarianty (B1, B2...)
              const general = defs.find(d => d.code && d.code.length === 1);
              const subs = defs.filter(d => !general || d !== general);
              const showGeneralHighlight = general && subs.length > 0;
              // Najít unikátní podvarianty (např. B1, B2) — pouze ty, které mají kód delší než 1 znak
              const subCodes = subs.map(d => d.code).filter(c => c && c.length > 1);
              return (
                <div key={group}>
                  <div className="variant-subtitle">Varianta {group}</div>
                  {subCodes.length > 0 && (
                    <div className="variant-group-info">
                      <span className="variant-group-info-icon" title="Tato skupina obsahuje podvarianty">&#9432;</span>
                      <span className="variant-group-info-text">Podvarianty: {subCodes.join(", ")}</span>
                    </div>
                  )}
                  <div className="variants">
                    {general && (
                      <div className="variant">
                        <div className="variant-popis">
                          <span className="variant-popis-hlavni">{general.code}</span>
                          {general.descriptionText && (
                            <span className="variant-dash">–</span>
                          )}
                          {general.descriptionText && (
                            <span className="variant-popis-hlavni">{general.descriptionText}</span>
                          )}
                        </div>
                        <div className="variant-img-bg variant-img-bg-pointer" onClick={() => onLightbox(item.defects.indexOf(general))}>
                          <img src={general.image} alt={general.label} />
                        </div>
                        {general.label && (
                          <div className="variant-label">{general.label}</div>
                        )}
                        {general.description && (
                          <div className="variant-popis-detail">{general.description}</div>
                        )}
                      </div>
                    )}
                    {subs.map((def, i) => {
                      const mainCode = def.code ? <span className="variant-popis-hlavni">{def.code}</span> : null;
                      const mainDesc = def.descriptionText ? <span className="variant-popis-hlavni">{def.descriptionText}</span> : null;
                      const detail = def.description;
                      return (
                        <div key={i} className="variant">
                          {(def.code || def.descriptionText) && (
                            <div className="variant-popis">
                              {def.code && <span className="variant-popis-hlavni">{def.code}</span>}
                              {def.code && def.descriptionText ? <span className="variant-dash">–</span> : null}
                              {def.descriptionText && <span className="variant-popis-hlavni">{def.descriptionText}</span>}
                            </div>
                          )}
                          <div
                            className="variant-img-bg variant-img-bg-pointer"
                            onClick={() => onLightbox(item.defects.indexOf(def))}
                          >
                            <img src={def.image} alt={def.label} />
                          </div>
                          {def.label && (
                            <div className="variant-label">{def.label}</div>
                          )}
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
                      <img src={item.images[0]} alt={item.emission} />
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
        {/* Lightbox bez pluginu Captions, plně vlastní popisek */}
        {typeof lightboxIndex === 'number' && detailId && (
          <Lightbox
            open={true}
            close={() => setLightboxIndex(null)}
            index={lightboxIndex}
            slides={(() => {
              const item = sampleData.find((d) => d.id === detailId);
              if (!item || !item.defects) return [];
              return item.defects.map((def, i) => ({
                src: def.image,
                main: [def.code, def.descriptionText].filter(Boolean).join(' – '),
                title: def.label,
                detail: def.description
              }));
            })()}
            render={{
              slide: ({ slide, offset, rect }) => {
                return (
                  <div className="lightbox-slide-outer">
                    {/* Hlavní popisek nad obrázkem */}
                    {slide.main && (
                      <div className="lightbox-slide-main">{slide.main}</div>
                    )}
                    <div className="lightbox-slide-imgwrap">
                      <img
                        src={slide.src}
                        alt={slide.title || ''}
                        className="lightbox-slide-img"
                      />
                    </div>
                    {/* Číslo obrázku hned pod obrázkem */}
                    {slide.title && (
                      <div
                        className="lightbox-slide-title"
                        style={{
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 500,
                          textAlign: 'center',
                          marginTop: '10px',
                          marginBottom: '18px',
                          textShadow: '0 2px 12px #000, 0 0 2px #000',
                          background: 'none',
                          border: 'none',
                          zIndex: 9999
                        }}
                      >
                        {slide.title}
                      </div>
                    )}
                    {/* Detailní popis pod číslem obrázku */}
                    {slide.detail && (
                      <div
                        className="lightbox-slide-detail"
                        style={{
                          color: '#fff',
                          fontSize: '20px',
                          fontWeight: 'normal',
                          textAlign: 'center',
                          marginBottom: '10px',
                          textShadow: '0 2px 12px #000, 0 0 2px #000',
                          background: 'none',
                          border: 'none',
                          zIndex: 9999
                        }}
                      >
                        {slide.detail}
                      </div>
                    )}
                  </div>
                );
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

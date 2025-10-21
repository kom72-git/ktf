import React, { useState, useMemo, useEffect } from "react";
import { Search, Image } from "lucide-react";
import "./App.css";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "./fancybox-responsive.css";

// Helper funkce pro formátování popisů vad - text v [] bude tučný
function formatDefectDescription(text) {
  if (!text) return text;
  
  // Regex pro nalezení textu v hranatých závorkách na začátku
  const regex = /^(\[[^\]]+\])(.*)/;
  const match = text.match(regex);
  
  if (match) {
    return (
      <>
        <strong>{match[1]}</strong>
        {match[2]}
      </>
    );
  }
  
  return text;
}

function DetailPage({ id, onBack, defects, isAdmin = false }) {
  const [item, setItem] = useState(null);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [editStampData, setEditStampData] = useState({});
  useEffect(() => {
    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      (window.location.hostname.endsWith("app.github.dev")
        ? `https://${window.location.hostname}`
        : window.location.hostname.endsWith("vercel.app")
        ? "" // Pro Vercel používáme relativní cesty, backend bude na stejné doméně
        : "http://localhost:3001"); // Lokální vývoj
        fetch(`${API_BASE}/api/stamps/${id}`)
      .then(res => res.json())
      .then(data => {
        console.log("[DetailPage] Načtená data:", data);
        setItem(data);
        // Inicializace editačních dat pro známku
        setEditStampData({
          emise: data.emise || '',
          rok: data.rok || '',
          katalogCislo: data.katalogCislo || '',
          datumVydani: data.datumVydani || '',
          navrh: data.navrh || '',
          rytec: data.rytec || '',
          druhTisku: data.druhTisku || '',
          tiskovaForma: data.tiskovaForma || '',
          zoubkovani: data.zoubkovani || '',
          papir: data.papir || '',
          rozmer: data.rozmer || '',
          naklad: data.naklad || '',
          obrazek: data.obrazek || '',
          schemaTF: data.schemaTF || '',
          Studie: data.Studie || '',
          studieUrl: data.studieUrl || ''
        });
      })
      .catch(err => {
        console.error("[DetailPage] Chyba při načítání detailu:", err);
      });
  }, [id]);

  // Funkce pro editaci vady
  const saveDefectEdit = async (defectId, updatedData) => {
    try {
      console.log('=== SAVING DEFECT ===');
      console.log('defectId:', defectId);
      console.log('updatedData:', updatedData);
      console.log('updatedData.popisVady:', updatedData.popisVady);
      
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001"); // Správný port 3001

      // Zkusme použít MongoDB _id nebo idVady
      const actualId = defectId._id || defectId.idVady || defectId;
      console.log('Using ID for API:', actualId);

      // Pro lokální vývoj použijeme server API
      const isLocal = window.location.hostname === 'localhost';
      const apiUrl = isLocal 
        ? `${API_BASE}/api/defects/${actualId}` // Lokální API server
        : `/api/defects/${actualId}`; // Vercel
      
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (response.ok) {
        console.log('Vada úspěšně aktualizována');
        // Zobraz dočasnou hlášku
        const notification = document.createElement('div');
        notification.textContent = 'Uloženo';
        notification.className = 'ktf-notification';
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
      } else {
        console.error('Chyba při ukládání vady:', responseData);
        alert(`Chyba při ukládání vady: ${responseData.error || 'Neznámá chyba'}`);
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      alert('Chyba při ukládání vady: ' + error.message);
    }
  };

  // Funkce pro uložení změn známky
  const saveStampEdit = async () => {
    try {
      console.log('Saving stamp:', id, editStampData);
      
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");

      const isLocal = window.location.hostname === 'localhost';
      const apiUrl = isLocal 
        ? `${API_BASE}/api/stamps/${id}`
        : `/api/stamps/${id}`;
      
      console.log('Stamp API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStampData)
      });

      const responseData = await response.json();
      console.log('Stamp API Response:', responseData);

      if (response.ok) {
        console.log('Známka úspěšně aktualizována');
        setItem(responseData);
        return true;
      } else {
        console.error('Chyba při ukládání známky:', responseData);
        alert(`Chyba při ukládání známky: ${responseData.error || 'Neznámá chyba'}`);
        return false;
      }
    } catch (error) {
      console.error('Chyba při ukládání známky:', error);
      alert('Chyba při ukládání známky: ' + error.message);
      return false;
    }
  };

  // Funkce pro uložení technických údajů
  const saveTechnicalField = async (field, value) => {
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");

      const response = await fetch(`${API_BASE}/api/stamps/${item.idZnamky}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        const updatedStamp = await response.json();
        setItem(updatedStamp);
        console.log(`Technický údaj ${field} uložen:`, value);
        
        // Zobraz dočasnou hlášku
        const notification = document.createElement('div');
        notification.textContent = 'Uloženo';
        notification.className = 'ktf-notification';
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Chyba při ukládání technického údaje:', errorData);
        alert(`Chyba při ukládání: ${errorData.error || 'Neznámá chyba'}`);
        return false;
      }
    } catch (error) {
      console.error('Chyba při ukládání technického údaje:', error);
      alert('Chyba při ukládání: ' + error.message);
      return false;
    }
  };

  // Funkce pro uložení hlavních informací
  const saveMainField = async (field, value) => {
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");

      const response = await fetch(`${API_BASE}/api/stamps/${item.idZnamky}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        const updatedStamp = await response.json();
        setItem(updatedStamp);
        console.log(`Hlavní údaj ${field} uložen:`, value);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Chyba při ukládání hlavního údaje:', errorData);
        alert(`Chyba při ukládání: ${errorData.error || 'Neznámá chyba'}`);
        return false;
      }
    } catch (error) {
      console.error('Chyba při ukládání hlavního údaje:', error);
      alert('Chyba při ukládání: ' + error.message);
      return false;
    }
  };

  // Funkce pro uložení studijních údajů
  const saveStudyField = async (field, value) => {
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");

      const response = await fetch(`${API_BASE}/api/stamps/${item.idZnamky}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        const updatedStamp = await response.json();
        setItem(updatedStamp);
        console.log(`Studijní údaj ${field} uložen:`, value);
        
        // Zobraz dočasnou hlášku
        const notification = document.createElement('div');
        notification.textContent = 'Uloženo';
        notification.className = 'ktf-notification';
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Chyba při ukládání studijního údaje:', errorData);
        alert(`Chyba při ukládání: ${errorData.error || 'Neznámá chyba'}`);
        return false;
      }
    } catch (error) {
      console.error('Chyba při ukládání studijního údaje:', error);
      alert('Chyba při ukládání: ' + error.message);
      return false;
    }
  };

  // Funkce pro uložení všech změn
  const saveAllChanges = async () => {
    const stampSaved = await saveStampEdit();
    if (stampSaved) {
      setIsEditingAll(false);
      setEditingDefect(null);
    }
  };
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
  `<div class='fancybox-caption-center'>`
  + `<span class='fancybox-caption-variant'>${def.variantaVady || ''}${def.variantaVady && def.umisteniVady ? ' – ' : ''}${def.umisteniVady || ''}</span>`
  + (def.popisVady ? `<br><span class='fancybox-caption-desc'>${def.popisVady}</span>` : '')
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
      <div className="button-row">
        <button onClick={onBack} className="back-btn">← Zpět</button>
        {isAdmin && (
          <>
            <button 
              onClick={() => setIsEditingAll(!isEditingAll)}
              className={isEditingAll ? "admin-edit-btn danger" : "admin-edit-btn success"}
            >
              {isEditingAll ? '❌ Zrušit editaci' : '✏️ Editovat'}
            </button>
          </>
        )}
      </div>
      <div className="detail-title">
        {isEditingAll ? (
          <div className="edit-title-row">
            <input
              type="text"
              value={editStampData.emise}
              onChange={(e) => setEditStampData({...editStampData, emise: e.target.value})}
              className="edit-title-input"
              placeholder="Název emise"
            />
            <button
              onClick={() => saveTechnicalField('emise', editStampData.emise)}
              className="ktf-btn-confirm"
            >
              ✓
            </button>
            <span>(</span>
            <input
              type="text"
              value={editStampData.rok}
              onChange={(e) => setEditStampData({...editStampData, rok: e.target.value})}
              className="edit-year-input"
              placeholder="Rok"
            />
            <button
              onClick={() => saveTechnicalField('rok', editStampData.rok)}
              className="ktf-btn-confirm"
            >
              ✓
            </button>
            <span>)</span>
          </div>
        ) : (
          `${item.emise} (${item.rok})`
        )}
      </div>
      <div className="detail-catalog">
        {isEditingAll ? (
          <div className="label-top-input">
            <label htmlFor="edit-catalog-number">Katalogové číslo:</label>
            <div className="edit-field-row">
              <input
                id="edit-catalog-number"
                type="text"
                value={editStampData.katalogCislo}
                onChange={(e) => setEditStampData({...editStampData, katalogCislo: e.target.value})}
                className="ktf-edit-input-tech"
                placeholder="Katalogové číslo"
              />
              <button
                onClick={() => saveTechnicalField('katalogCislo', editStampData.katalogCislo)}
                className="ktf-btn-confirm"
              >
                ✓
              </button>
            </div>
          </div>
        ) : (
          <>
            <span>Katalogové číslo: </span>
            <strong>{item.katalogCislo}</strong>
          </>
        )}
      </div>
      
      {/* Editační formulář a vykreslení základních údajů známky */}

      {/* Editační pole pro hlavní obrázek - přesunuto nad celý blok s obrázkem */}
      {isEditingAll && (
  <div className="label-top-input">
          <label htmlFor="edit-img-url">Hlavní obrázek:</label>
          <div className="edit-field-row">
            <input
              id="edit-img-url"
              type="text"
              value={editStampData.obrazek}
              onChange={(e) => setEditStampData({...editStampData, obrazek: e.target.value})}
              className="ktf-edit-input-tech"
              placeholder="https://example.com/obrazek.jpg"
            />
            <button
              onClick={() => saveTechnicalField('obrazek', editStampData.obrazek)}
              className="ktf-btn-confirm"
            >
              ✓
            </button>
          </div>
        </div>
      )}
      <div className="stamp-detail-layout">
        <div className="stamp-detail-img-col">
          <div className="stamp-detail-img-bg stamp-detail-img-bg-none stamp-detail-img-bg-pointer" onClick={() => {
            Fancybox.show([{
              src: item.obrazekStudie || item.obrazek,
              caption: `<div class='fancybox-caption-center'><span class='fancybox-caption-variant'>${item.emise} (${item.rok})</span><br><span class='fancybox-caption-desc'>Katalogové číslo: ${item.katalogCislo}</span></div>`
            }], {
              Toolbar: [ 'zoom', 'close' ],
              dragToClose: true,
              animated: true,
              compact: false,
              showClass: 'fancybox-zoomIn',
              hideClass: 'fancybox-zoomOut',
              closeButton: 'top',
              defaultType: 'image'
            });
          }}>
            <img
              src={item.obrazekStudie || item.obrazek}
              alt={item.emise}
              className="stamp-detail-img stamp-detail-img-main"
              onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
            />
          </div>
        </div>
  <div className="stamp-spec stamp-detail-spec-col">

          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Datum vydání</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.datumVydani}
                    onChange={(e) => setEditStampData({...editStampData, datumVydani: e.target.value})}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('datumVydani', editStampData.datumVydani)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                item.datumVydani
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Návrh</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.navrh}
                    onChange={(e) => setEditStampData({...editStampData, navrh: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('navrh', editStampData.navrh)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.navrh : item.navrh
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Rytec</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.rytec}
                    onChange={(e) => setEditStampData({...editStampData, rytec: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('rytec', editStampData.rytec)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.rytec : item.rytec
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Druh tisku</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.druhTisku}
                    onChange={(e) => setEditStampData({...editStampData, druhTisku: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('druhTisku', editStampData.druhTisku)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.druhTisku : item.druhTisku
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Tisková forma</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.tiskovaForma}
                    onChange={(e) => setEditStampData({...editStampData, tiskovaForma: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('tiskovaForma', editStampData.tiskovaForma)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.tiskovaForma : item.tiskovaForma
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Zoubkování</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.zoubkovani}
                    onChange={(e) => setEditStampData({...editStampData, zoubkovani: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('zoubkovani', editStampData.zoubkovani)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.zoubkovani : item.zoubkovani
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Papír</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.papir}
                    onChange={(e) => setEditStampData({...editStampData, papir: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('papir', editStampData.papir)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.papir : item.papir
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Rozměr</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.rozmer}
                    onChange={(e) => setEditStampData({...editStampData, rozmer: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('rozmer', editStampData.rozmer)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.rozmer : item.rozmer
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Náklad</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.naklad}
                    onChange={(e) => setEditStampData({...editStampData, naklad: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                  />
                  <button
                    onClick={() => saveTechnicalField('naklad', editStampData.naklad)}
                    className="ktf-btn-confirm"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                isEditingAll ? editStampData.naklad : item.naklad
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Schéma TF</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div>
                  {item.schemaTF && <img src={item.schemaTF} alt="Schéma TF" className="tf-img" onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }} />}
                  <div className="edit-field-row">
                    <input
                      type="text"
                      value={editStampData.schemaTF}
                      onChange={(e) => setEditStampData({...editStampData, schemaTF: e.target.value})}
                      className="ktf-edit-input-tech"
                      placeholder="https://example.com/schema.jpg"
                    />
                    <button
                      onClick={() => saveTechnicalField('schemaTF', editStampData.schemaTF)}
                      className="ktf-btn-confirm"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ) : (
                item.schemaTF && <img src={item.schemaTF} alt="Schéma TF" className="tf-img" onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }} />
              )}
            </span>
          </div>
        </div>
      </div>
      {itemDefects.length > 0 && (
        <div>
          {isEditingAll ? (
            <div className="study-inline-note">
              <div className="ktf-edit-study-row">
                <div className="ktf-edit-study-col label-top-input">
                  <label htmlFor="edit-study-text">Text studie:</label>
                  <div className="edit-field-row">
                    <input
                      id="edit-study-text"
                      type="text"
                      value={editStampData.Studie || ''}
                      onChange={(e) => setEditStampData({...editStampData, Studie: e.target.value})}
                      className="ktf-edit-input-tech ktf-edit-input-long"
                      placeholder="Rozlišeno dle studie: text, část pro link"
                    />
                    <button
                      onClick={() => {
                        saveStudyField('Studie', editStampData.Studie || '');
                      }}
                      className="ktf-btn-confirm"
                    >
                      ✓
                    </button>
                  </div>
                </div>
                <div className="ktf-edit-study-col label-top-input">
                  <label htmlFor="edit-study-url">URL pro část za čárkou:</label>
                  <div className="edit-field-row">
                    <input
                      id="edit-study-url"
                      type="text"
                      value={editStampData.studieUrl || ''}
                      onChange={(e) => setEditStampData({...editStampData, studieUrl: e.target.value})}
                      className="ktf-edit-input-tech ktf-edit-input-long"
                      placeholder="https://example.com/studie"
                    />
                    <button
                      onClick={() => {
                        saveStudyField('studieUrl', editStampData.studieUrl || '');
                      }}
                      className="ktf-btn-confirm"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {item.Studie && item.studieUrl ? (() => {
                let before = item.Studie;
                let after = '';
                const idx = item.Studie.indexOf(',');
                if (idx !== -1) {
                  before = item.Studie.slice(0, idx);
                  after = item.Studie.slice(idx + 1).replace(/^\s*/, '');
                }
                return (
                  <div className="study-inline-note" >
                    <span className="study-inline-label">Rozlišeno dle studie:</span> {before}
                    {after && (
                      <>
                        {','}
                        <span dangerouslySetInnerHTML={{__html: '&nbsp;'}} />
                        <a href={item.studieUrl} target="_blank" rel="noopener noreferrer">{after}</a>
                      </>
                    )}
                  </div>
                );
              })() : item.Studie && (
                <div className="study-inline-note" >
                  <span className="study-inline-label">Rozlišeno dle studie:</span> {item.Studie}
                </div>
              )}
            </>
          )}
          {/* Seskupení variant podle hlavní varianty (A, B, ...) */}
          {Object.keys(grouped).sort().map(group => {
            const defs = grouped[group];
            // Deduplicitace podle variantaVady
            const uniqueDefsMap = new Map();
            defs.forEach(def => {
              if (def.variantaVady && !uniqueDefsMap.has(def.variantaVady)) {
                uniqueDefsMap.set(def.variantaVady, def);
              }
            });
            const uniqueDefs = Array.from(uniqueDefsMap.values());
            // Přirozené řazení
            function naturalVariantSort(a, b) {
              const va = a.variantaVady;
              const vb = b.variantaVady;
              const parse = v => {
                const m = v.match(/^([A-Z])(\d+)?(?:\.(\d+))?/i);
                if (!m) return [v, 0, null];
                return [m[1], m[2] ? parseInt(m[2], 10) : 0, m[3] ? parseInt(m[3], 10) : null];
              };
              const [la, na, sa] = parse(va);
              const [lb, nb, sb] = parse(vb);
              if (la !== lb) return la.localeCompare(lb);
              if (na !== nb) return na - nb;
              if (sa === null && sb !== null) return -1;
              if (sa !== null && sb === null) return 1;
              if (sa !== null && sb !== null) return sa - sb;
              return 0;
            }
            const sortedDefs = uniqueDefs.slice().sort(naturalVariantSort);
            // --- úprava číslování obrázků ---
            const NO_IMAGE = '/img/no-image.png';
            // Sestavíme globální pole všech variant v pořadí vykreslení napříč všemi skupinami
            const allVariants = Object.keys(grouped).sort().flatMap(groupKey => {
              const defsInGroup = grouped[groupKey];
              return defsInGroup.slice().sort((a, b) => {
                const cmp = naturalVariantSort(a, b);
                if (cmp !== 0) return cmp;
                function extractBracketOrder(def) {
                  if (!def.popisVady) return null;
                  const m = def.popisVady.match(/^\s*\[([^\]]+)\]/);
                  return m ? m[1] : null;
                }
                const orderA = extractBracketOrder(a);
                const orderB = extractBracketOrder(b);
                if (orderA === null && orderB !== null) return 1;
                if (orderA !== null && orderB === null) return -1;
                if (orderA === null && orderB === null) return 0;
                return orderA.localeCompare(orderB, undefined, { numeric: true });
              });
            });
            // Mapování: def -> pořadí (index+1)
            function getSimpleImageNumber(def) {
              return allVariants.indexOf(def) + 1;
            }
            const subvariantLabels = (() => {
              // Pouze skutečné podvarianty: délka větší než 1 nebo obsahují tečku
              const seen = new Set();
              return sortedDefs.filter(def => {
                if (!def.variantaVady) return false;
                if (def.variantaVady.length === 1) return false; // základní varianta (A, B, ...)
                if (seen.has(def.variantaVady)) return false;
                seen.add(def.variantaVady);
                return true;
              }).map(d => d.variantaVady);
            })();
            const mainDef = sortedDefs.find(def => def.variantaVady && def.variantaVady.length === 1);
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
                      <img src="/img/ico_podvarianty.png" alt="info" className="variant-group-info-icon" />
                    </span>
                    <span className="variant-group-info-text">Obsahuje podvarianty: {subvariantLabels.join(", ")}</span>
                  </div>
                )}
                <div className="variants">
                  {/* Všechny výskyty variant včetně duplicit, v přirozeném pořadí */}
                  {defs.slice().sort((a, b) => {
                    // Nejprve původní naturalVariantSort
                    const cmp = naturalVariantSort(a, b);
                    if (cmp !== 0) return cmp;
                    // Pokud je varianta stejná, řadíme podle popisu v hranatých závorkách
                    function extractBracketOrder(def) {
                      if (!def.popisVady) return null;
                      const m = def.popisVady.match(/^\s*\[([^\]]+)\]/);
                      return m ? m[1] : null;
                    }
                    const orderA = extractBracketOrder(a);
                    const orderB = extractBracketOrder(b);
                    // Nejprve upřednostnit ty, které mají závorku
                    if (orderA === null && orderB !== null) return 1;
                    if (orderA !== null && orderB === null) return -1;
                    if (orderA === null && orderB === null) return 0;
                    // Porovnáme jako string, pokud je více hodnot, řadí se lexikálně
                    return orderA.localeCompare(orderB, undefined, { numeric: true });
                  }).map((def, i) => {
                    const flatIndex = itemDefects.findIndex(d => d === def);
                    return (
                      <div key={def.idVady || `var-${i}`} className="variant" style={{ position: 'relative' }}>
                        <div className="variant-popis">
                          {isEditingAll ? (
                            <div className="edit-variant-row">
                              <input
                                type="text"
                                placeholder="Varianta"
                                defaultValue={def.variantaVady || ''}
                                className="edit-variant-input"
                              />
                              <span>–</span>
                              <textarea
                                placeholder="Umístění"
                                defaultValue={def.umisteniVady || ''}
                                className="edit-variant-textarea"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="variant-popis-hlavni">{def.variantaVady}</span>
                              {def.umisteniVady && <><span className="variant-dash">–</span><span className="variant-popis-hlavni">{def.umisteniVady}</span></>}
                            </>
                          )}
                        </div>
                        <div className="variant-img-bg variant-img-bg-pointer" onClick={() => openFancybox(flatIndex)}>
                          <img src={def.obrazekVady} alt={def.idVady} onError={e => { e.target.onerror = null; e.target.src = NO_IMAGE; }} />
                        </div>
                        {/* Editace URL obrázku vady */}
                        {isEditingAll && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <input
                                type="text"
                                defaultValue={def.obrazekVady || ''}
                                style={{
                                  width: '200px',
                                  padding: '3px 5px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  background: '#fff'
                                }}
                                placeholder="https://example.com/obrazek.jpg"
                              />
                              <button
                                onClick={(e) => {
                                  const container = e.target.closest('.variant');
                                  const imageInput = container.querySelector('input[placeholder*="obrazek.jpg"]');
                                  saveDefectEdit(def._id, { 
                                    ...def, 
                                    obrazekVady: imageInput?.value || ''
                                  });
                                }}
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="variant-label">Obr. {getSimpleImageNumber(def)}</div>
                        {/* Editace nebo zobrazení popisu vady */}
                        {isEditingAll ? (
                          <div style={{ marginTop: '8px' }}>
                            <textarea
                              defaultValue={def.popisVady || ''}
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                minHeight: '60px',
                                resize: 'both',
                                fontFamily: 'inherit'
                              }}
                              placeholder="Popis vady... (Ctrl+Enter pro uložení)"
                              autoFocus
                            />
                            <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                              <button
                                onClick={(e) => {
                                  // Najdeme všechny tři input/textarea prvky v této variantě
                                  const container = e.target.closest('.variant');
                                  const variantInput = container.querySelector('input[placeholder=\"Varianta\"]');
                                  const umisteniInput = container.querySelector('textarea[placeholder=\"Umístění\"]');
                                  const popisTextarea = container.querySelector('textarea:not([placeholder=\"Umístění\"])');
                                  // Uložíme všechny tři hodnoty najednou
                                  saveDefectEdit(def._id, { 
                                    ...def, 
                                    variantaVady: variantInput?.value || '',
                                    umisteniVady: umisteniInput?.value || '',
                                    popisVady: popisTextarea?.value || ''
                                  });
                                }}
                                className="ktf-btn-confirm"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {def.popisVady && (
                              <div className="variant-popis-detail">
                                {formatDefectDescription(def.popisVady)}
                              </div>
                            )}
                            {isEditingAll && !def.popisVady && (
                              <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
                                Klikni na editační ikonu pro přidání popisu
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
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
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  useEffect(() => {
    // Check if admin session exists
    const adminSession = localStorage.getItem('ktf_admin_session');
    if (adminSession === 'active') {
      setIsAdmin(true);
    }
  }, []);

  const handleAdminLogin = (password) => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '590745pp2/admin';
    console.log('Admin login debug:', {
      password,
      adminPassword,
      envVar: import.meta.env.VITE_ADMIN_PASSWORD,
      allEnvVars: import.meta.env
    });
    if (password === adminPassword) {
      localStorage.setItem('ktf_admin_session', 'active');
      setIsAdmin(true);
      setShowAdminLogin(false);
    } else {
      alert('Nesprávné heslo');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('ktf_admin_session');
    setIsAdmin(false);
  };
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
          <DetailPage id={detailId} onBack={() => setDetailId(null)} defects={defects} isAdmin={isAdmin} />
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
          {!isAdmin ? (
            <>
              &nbsp;|&nbsp; 
              <a href="#" onClick={(e) => { e.preventDefault(); setShowAdminLogin(true); }} style={{color: 'inherit', textDecoration: 'none'}}>
                admin
              </a>
            </>
          ) : (
            <>
              &nbsp;|&nbsp; 
              <span style={{color: '#10b981'}}>Admin mode</span>
              &nbsp;|&nbsp; 
              <a href="#" onClick={(e) => { e.preventDefault(); handleAdminLogout(); }} style={{color: '#ef4444', textDecoration: 'none'}}>
                Odhlásit
              </a>
            </>
          )}
        </div>
        
        {/* Admin Login Popup */}
        {showAdminLogin && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{marginTop: 0}}>Admin přístup</h3>
              <input
                type="password"
                placeholder="Heslo"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminLogin(e.target.value);
                  }
                }}
                style={{
                  width: '200px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginRight: '8px'
                }}
              />
              <button
                onClick={(e) => {
                  const popup = e.target.closest('div[style*="position: fixed"]');
                  const input = popup.querySelector('input[type="password"]');
                  handleAdminLogin(input?.value || '');
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
              <br/><br/>
              <button
                onClick={() => setShowAdminLogin(false)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Zrušit
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}


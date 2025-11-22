import React, { useState, useEffect } from "react";
import { Fancybox } from "@fancyapps/ui";
import VariantTooltip from "./components/VariantTooltip.jsx";
import {
  replaceAbbreviations,
  formatPopisWithAll,
  formatDefectDescription
} from "./utils/formatovaniTextu.jsx";
import {
  naturalVariantSort,
  compareVariantsWithBracket
} from "./utils/katalog.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "./fancybox-responsive.css";

export default function DetailPage({ id, onBack, defects, isAdmin = false, fieldSuggestions = {} }) {
  const [item, setItem] = useState(null);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [editStampData, setEditStampData] = useState({});
  const [savedCaption, setSavedCaption] = useState(false);
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
          obrazekStudie: data.obrazekStudie || '',
          schemaTF: data.schemaTF || '',
          Studie: data.Studie || '',
          studieUrl: data.studieUrl || '',
          popisObrazkuStudie: data.popisObrazkuStudie || '',
          popisStudie: data.popisStudie || '',
          popisStudie2: data.popisStudie2 || '',
          obrazekAutor: data.obrazekAutor || ''
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
        ? `${API_BASE}/api/defects/${actualId}` // Lokální API server.
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
  const popisStudie2Raw = typeof item?.popisStudie2 === "string" ? item.popisStudie2 : "";
  const hasPopisStudie2Content = /[^\s,]/.test(popisStudie2Raw);
  const popisStudie2Display = hasPopisStudie2Content ? popisStudie2Raw.trim() : "";
  const authorsRaw = typeof item?.obrazekAutor === "string" ? item.obrazekAutor.trim() : "";
  const hasAuthors = authorsRaw.length > 0;
  const renderAbbrevContent = (value, keyPrefix) => {
    if (Array.isArray(value)) {
      return value.map((part, idx) => (
        <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
      ));
    }
    return value;
  };
  const authorsDisplay = (() => {
    if (!hasAuthors) return null;
    const raw = authorsRaw;
    const segments = [];
    const regex = /\([^)]*\)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const idx = match.index;
      if (idx > lastIndex) {
        segments.push({ text: raw.slice(lastIndex, idx), highlight: true });
      }
      segments.push({ text: match[0], highlight: false });
      lastIndex = idx + match[0].length;
    }
    if (lastIndex < raw.length) {
      segments.push({ text: raw.slice(lastIndex), highlight: true });
    }
    if (segments.length === 0) {
      segments.push({ text: raw, highlight: true });
    }
    const segmentNodes = segments
      .map((segment, idx) => {
        const content = replaceAbbreviations(segment.text);
        if (content === null || content === undefined || content === "") {
          return null;
        }
        if (segment.highlight) {
          return (
            <span key={`author-${idx}`} className="study-note-authors-highlight">
              {renderAbbrevContent(content, `author-${idx}`)}
            </span>
          );
        }
        return (
          <React.Fragment key={`author-${idx}`}>
            {renderAbbrevContent(content, `author-${idx}`)}
          </React.Fragment>
        );
      })
      .filter(Boolean);

    if (!segmentNodes.length) {
      return null;
    }

    return <span className="study-note-authors-line">{segmentNodes}</span>;
  })();
  const authorSuggestionValues = Array.isArray(fieldSuggestions?.obrazekAutor)
    ? fieldSuggestions.obrazekAutor
    : [];
  const authorSuggestionListId = authorSuggestionValues.length
    ? `detail-authors-options-${item.idZnamky || id || "default"}`
    : undefined;
  const studyReferenceBlock = (() => {
    if (!item?.Studie) return null;

    const renderWrapper = (content) => (
      <div className="study-note-reference-wrapper">
        <div className="study-note-reference-shell">
          <span className="study-note-reference-icon" aria-hidden="true" />
          <div className="study-note study-note-reference">
            {content}
          </div>
        </div>
      </div>
    );

    // Funkce pro vykreslení autora se speciální netučnou spojkou 'a'
    const renderEmphasizedWithConj = (value, keyPrefix) => {
      if (!value && value !== 0) return null;
      // Rozdělíme podle spojky 'a' (včetně různých variant s mezerami)
      const parts = String(value).split(/(\s+\ba\b\s*)/i);
      return parts.map((part, idx) => {
        if (/^\s*a\s*$/i.test(part)) {
          return <span key={keyPrefix+"-conj-"+idx} className="study-note-authors-conj">{part}</span>;
        }
        return <span key={keyPrefix+"-bold-"+idx} className="study-note-reference-author">{renderAbbrevContent(part, keyPrefix+"-"+idx)}</span>;
      });
    };

    const rawStudie = item.Studie || "";
    const LINK_MARK = "%";
    const commaIdx = rawStudie.indexOf(",");
    const authorRaw = commaIdx !== -1 ? rawStudie.slice(0, commaIdx) : rawStudie;
    const remainderRawFull = commaIdx !== -1 ? rawStudie.slice(commaIdx + 1) : "";
    const remainderRaw = remainderRawFull.replace(/^\s*/, "");
    const hasRemainder = remainderRaw.length > 0;

    const authorContent = authorRaw ? replaceAbbreviations(authorRaw) : null;
    const authorNode = authorContent ? renderEmphasizedWithConj(authorContent, "study-author") : null;

    if (item.studieUrl) {
      if (hasRemainder) {
        const firstMark = remainderRaw.indexOf(LINK_MARK);
        if (firstMark !== -1) {
          const secondMark = remainderRaw.indexOf(LINK_MARK, firstMark + 1);
          const preLinkRaw = remainderRaw.slice(0, firstMark);
          const linkRaw = secondMark !== -1
            ? remainderRaw.slice(firstMark + 1, secondMark)
            : remainderRaw.slice(firstMark + 1);
          const postLinkRaw = secondMark !== -1 ? remainderRaw.slice(secondMark + 1) : "";

          const linkContent = linkRaw ? replaceAbbreviations(linkRaw) : null;
          if (linkContent) {
            const preLinkContent = preLinkRaw ? replaceAbbreviations(preLinkRaw) : null;
            const postLinkContent = postLinkRaw ? replaceAbbreviations(postLinkRaw) : null;
            return renderWrapper(
              <span className="study-note-reference-text">
                {authorNode}
                {authorNode && (preLinkContent || linkContent || postLinkContent) ? ", " : null}
                {preLinkContent ? renderAbbrevContent(preLinkContent, "study-prelink") : null}
                <a
                  href={item.studieUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="study-note-reference-link"
                >
                  {renderAbbrevContent(linkContent, "study-link")}
                </a>
                {postLinkContent ? renderAbbrevContent(postLinkContent, "study-postlink") : null}
              </span>
            );
          }
        }

        const remainderContent = replaceAbbreviations(remainderRaw);
        return renderWrapper(
          <span className="study-note-reference-text">
            {authorNode}
            {authorNode && remainderContent ? ", " : null}
            {remainderContent ? (
              <a
                href={item.studieUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="study-note-reference-link"
              >
                {renderAbbrevContent(remainderContent, "study-after")}
              </a>
            ) : null}
          </span>
        );
      }

      return renderWrapper(
        <span className="study-note-reference-text">
          {authorNode}
        </span>
      );
    }

    if (hasRemainder) {
      const remainderContent = replaceAbbreviations(remainderRaw);
      return renderWrapper(
        <span className="study-note-reference-text">
          {authorNode}
          {authorNode && remainderContent ? ", " : null}
          {remainderContent ? renderAbbrevContent(remainderContent, "study-after") : null}
        </span>
      );
    }

    return renderWrapper(
      <span className="study-note-reference-text">
        {authorNode}
      </span>
    );
  })();

  // Rozdělení na běžné a plus varianty
  const grouped = {};
  const plusVariants = [];
  itemDefects.forEach(def => {
    if (!def.variantaVady) return;
    if (def.variantaVady.includes(',')) {
      plusVariants.push(def);
      return;
    }
    // Hlavní varianta je první písmeno (A, B, ...)
    const main = def.variantaVady.match(/^[A-Z]/i);
    const groupKey = main ? main[0] : '?';
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(def);
  });

  const groupedKeysSorted = Object.keys(grouped).sort();
  const groupedVariantsOrdered = groupedKeysSorted.flatMap(groupKey =>
    grouped[groupKey].slice().sort(compareVariantsWithBracket)
  );
  const plusVariantsOrdered = plusVariants.slice();
  // Jednotné pořadí všech variant pro konzistentní číslování a Fancybox
  const allVariantsOrdered = [...groupedVariantsOrdered, ...plusVariantsOrdered];
  const getImageNumber = (def) => {
    const idx = allVariantsOrdered.indexOf(def);
    return idx === -1 ? '?' : idx + 1;
  };
  const secondStudyBlockClass = isEditingAll ? 'study-note-block editing' : 'study-note-block';
  const detailHeadingId = `stamp-detail-${item.idZnamky || id}-title`;
  const specHeadingId = `${detailHeadingId}-spec`;
  const studyHeadingId = `${detailHeadingId}-study`;
  const variantsHeadingBaseId = `${detailHeadingId}-variant`;
  const additionalStudyHeadingId = `${detailHeadingId}-study-after`;
  // Fancybox galerie pro skupinu
  const openFancybox = (flatIndex = 0) => {
    if (!allVariantsOrdered || allVariantsOrdered.length === 0) return;
    const slides = allVariantsOrdered.map(def => ({
      src: def.obrazekVady && def.obrazekVady[0] !== '/' && !def.obrazekVady.startsWith('http') ? '/' + def.obrazekVady : def.obrazekVady,
        caption:
          `<div class='fancybox-caption-center'>`
          + `<span class='fancybox-caption-variant'>${def.variantaVady || ''}${def.variantaVady && def.umisteniVady ? ' – ' : ''}${def.umisteniVady || ''}</span>`
          + (def.popisVady ? `<br><span class='fancybox-caption-desc'>${def.popisVady.replace(/\[\[\.\.\.\]\]/g, '')}</span>` : '')
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
    <article className="stamp-detail-block" aria-labelledby={detailHeadingId}>
      <div className="button-row">
        <button onClick={onBack} className="back-btn">← Zpět</button>
        {isAdmin && (
          <>
            <button 
              onClick={() => {
                if (!isEditingAll) {
                  setTimeout(() => {
                    const detailBlock = document.querySelector('.stamp-detail-block');
                    if (detailBlock) {
                      detailBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 0);
                  setIsEditingAll(true);
                } else {
                  // Obnovit editStampData podle aktuálního item
                  setEditStampData({
                    emise: item.emise || '',
                    rok: item.rok || '',
                    katalogCislo: item.katalogCislo || '',
                    datumVydani: item.datumVydani || '',
                    navrh: item.navrh || '',
                    rytec: item.rytec || '',
                    druhTisku: item.druhTisku || '',
                    tiskovaForma: item.tiskovaForma || '',
                    zoubkovani: item.zoubkovani || '',
                    papir: item.papir || '',
                    rozmer: item.rozmer || '',
                    naklad: item.naklad || '',
                    obrazek: item.obrazek || '',
                    obrazekStudie: item.obrazekStudie || '',
                    schemaTF: item.schemaTF || '',
                    Studie: item.Studie || '',
                    studieUrl: item.studieUrl || '',
                    obrazekAutor: item.obrazekAutor || '',
                    popisObrazkuStudie: item.popisObrazkuStudie || '',
                    popisStudie: item.popisStudie || '',
                    popisStudie2: item.popisStudie2 || ''
                  });
                  setIsEditingAll(false);
                }
              }}
              className={isEditingAll ? "admin-edit-btn danger" : "admin-edit-btn success"}
            >
              {isEditingAll ? '❌ Zrušit editaci' : 'Editovat'}
            </button>
            {/* Tlačítko pro otevření modalu v admin panelu */}
            <button
              className="ktf-btn-confirm"
              style={{ marginLeft: '8px' }}
              onClick={() => {
                if (window.setShowAddVariantModal) {
                  window.setShowAddVariantModal(id);
                } else {
                  window.dispatchEvent(new CustomEvent('openAddVariantModal', { detail: { idZnamky: id } }));
                }
              }}
            >
              + Přidat variantu
            </button>
          </>
        )}
      </div>
      <header className="detail-title">
        {isEditingAll ? (
          <>
            <h1 id={detailHeadingId} className="sr-only">
              {replaceAbbreviations(`${item.emise} (${item.rok})`)}
            </h1>
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
                className="ktf-btn-check"
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
                className="ktf-btn-check"
              >
                ✓
              </button>
              <span>)</span>
            </div>
          </>
        ) : (
          <h1 id={detailHeadingId} className="detail-title-text">{replaceAbbreviations(`${item.emise} (${item.rok})`)}</h1>
        )}
      </header>
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
                className="ktf-btn-check"
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

      {/* Editační pole pro hlavní obrázek a obrázek studie vedle sebe, zarovnáno jako u studie */}
      {isEditingAll && (
        <>
          <div className="ktf-edit-study-row">
            <div className="ktf-edit-study-col label-top-input">
              <label htmlFor="edit-img-url">Hlavní obrázek:</label>
              <div className="edit-field-row">
                <input
                  id="edit-img-url"
                  type="text"
                  value={editStampData.obrazek || ''}
                  onChange={(e) => setEditStampData({...editStampData, obrazek: e.target.value})}
                  className="ktf-edit-input-tech ktf-edit-input-long"
                  placeholder="img/rok/obrazek.jpg"
                />
                <button
                  onClick={() => {
                    console.log('[DEBUG] Ukládám obrázek:', editStampData.obrazek);
                    saveTechnicalField('obrazek', editStampData.obrazek || '');
                  }}
                  className="ktf-btn-check"
                >
                  ✓
                </button>
              </div>
            </div>
            <div className="ktf-edit-study-col label-top-input">
              <label htmlFor="edit-img-studie">Obrázek studie:</label>
              <div className="edit-field-row">
                <input
                  id="edit-img-studie"
                  type="text"
                  value={editStampData.obrazekStudie || ''}
                  onChange={(e) => setEditStampData({...editStampData, obrazekStudie: e.target.value})}
                  className="ktf-edit-input-tech ktf-edit-input-long"
                  placeholder="img/rok/studie.jpg"
                />
                <button
                  onClick={() => {
                    console.log('[DEBUG] Ukládám obrázek studie:', editStampData.obrazekStudie);
                    saveTechnicalField('obrazekStudie', editStampData.obrazekStudie || '');
                  }}
                  className="ktf-btn-check"
                >
                  ✓
                </button>
              </div>
              {/* Pole pro popisek pod obrázkem studie bylo odstraněno, zůstává pouze pod obrázkem */}
            </div>
          </div>
        </>
      )}
      <div className="stamp-detail-layout">
        <div className="stamp-detail-img-col">
          <div className="stamp-detail-img-bg stamp-detail-img-bg-none stamp-detail-img-bg-pointer" onClick={e => {
            // Zabránit otevření Fancyboxu při kliknutí na popisek pod obrázkem
            if (e.target.classList.contains('study-img-caption') || e.target.closest('.study-img-caption')) return;
            // Normalizace cesty pro obrázekStudie i hlavní obrázek
            let src = '';
            if (item.obrazekStudie) {
              src = item.obrazekStudie[0] !== '/' && !item.obrazekStudie.startsWith('http') ? '/' + item.obrazekStudie : item.obrazekStudie;
            } else if (item.obrazek) {
              src = item.obrazek[0] !== '/' && !item.obrazek.startsWith('http') ? '/' + item.obrazek : item.obrazek;
            }
            Fancybox.show([
              {
                src,
                caption: ''
              }
            ], {
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
            <figure style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
              <img
                src={(item.obrazekStudie && item.obrazekStudie[0] !== '/' ? '/' + item.obrazekStudie : item.obrazekStudie) || (item.obrazek && item.obrazek[0] !== '/' ? '/' + item.obrazek : item.obrazek)}
                alt={item.emise}
                className="stamp-detail-img stamp-detail-img-main"
                onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
              />
              {/* Popisek pod obrázkem studie */}
              <figcaption className={`study-img-caption${savedCaption ? ' ktf-saved-highlight' : ''}`}>
                {isEditingAll ? (
                  <div className="edit-field-row center-row">
                    <textarea
                      rows={3}
                      defaultValue={editStampData.popisObrazkuStudie || item.popisObrazkuStudie || ''}
                      onChange={e => setEditStampData({...editStampData, popisObrazkuStudie: e.target.value})}
                      className="ktf-edit-input-long study-img-caption-input"
                      style={{resize: 'vertical'}}
                    />
                    <button
                      onClick={async () => {
                        await saveTechnicalField('popisObrazkuStudie', editStampData.popisObrazkuStudie || '');
                        setSavedCaption(true);
                        setTimeout(() => setSavedCaption(false), 700);
                      }}
                      className={`ktf-btn-check${savedCaption ? ' saved' : ''}`}
                    >✓</button>
                  </div>
                ) : (
                  <span className="study-img-caption-text" style={{pointerEvents: 'none'}} dangerouslySetInnerHTML={{__html: item.popisObrazkuStudie || ''}} />
                )}
              </figcaption>
            </figure>
          </div>
        </div>
        <section className="stamp-spec stamp-detail-spec-col" aria-labelledby={specHeadingId}>
          <h2 id={specHeadingId} className="sr-only">Technické údaje</h2>

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
                    className="ktf-btn-check"
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
                    className="ktf-btn-check"
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
                    className="ktf-btn-check"
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
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('druhTisku', editStampData.druhTisku)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                item.druhTisku ? replaceAbbreviations(item.druhTisku) : ''
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
                    className="ktf-btn-check"
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
                    className="ktf-btn-check"
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
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('papir', editStampData.papir)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                item.papir ? replaceAbbreviations(item.papir) : ''
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
                    className="ktf-btn-check"
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
                    className="ktf-btn-check"
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
                      onClick={() => {
                        let val = editStampData.schemaTF || '';
                        if (val && val[0] !== '/' && !val.startsWith('http')) val = '/' + val;
                        saveTechnicalField('schemaTF', val);
                      }}
                      className="ktf-btn-check"
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
        </section>
      </div>
  {(isEditingAll || itemDefects.length > 0 || item.Studie || item.popisStudie || item.obrazekAutor || hasPopisStudie2Content) && (
        <section aria-labelledby={studyHeadingId}>
          <h2 id={studyHeadingId} className="sr-only">Studie a varianty</h2>
          {isEditingAll ? (
            <>
              <div className="study-inline-note">
                <div className="ktf-edit-study-row">
                  <div className="ktf-edit-study-col label-top-input study-input-primary-col">
                    <label htmlFor="edit-study-text">Zpracováno dle studie:</label>
                    <div className="edit-field-row">
                      <input
                        id="edit-study-text"
                        type="text"
                        value={editStampData.Studie || ''}
                        onChange={(e) => setEditStampData({...editStampData, Studie: e.target.value})}
                        className="ktf-edit-input-tech ktf-edit-input-long"
                        placeholder="Zpracováno dle studie: text %klikací část%"
                      />
                      <button
                        onClick={() => {
                          saveStudyField('Studie', editStampData.Studie || '');
                        }}
                        className="ktf-btn-check"
                      >
                        ✓
                      </button>
                    </div>
                    <span className="ktf-edit-hint">Klikací část uzavři mezi %text%.</span>
                  </div>
                  <div className="ktf-edit-study-col label-top-input study-input-secondary-col">
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
                        className="ktf-btn-check"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* --- POPIS STUDIE --- */}
              <div className="ktf-edit-study-popis-row" style={{width: '100%'}}>
                <div className="label-top-input ktf-edit-row-full">
                  <label htmlFor="edit-popis-studie">Popis studie</label>
                  <div className="edit-field-row ktf-edit-row-full">
                    <textarea
                      id="edit-popis-studie"
                      value={typeof editStampData.popisStudie === 'string' ? editStampData.popisStudie : (item.popisStudie || '')}
                      onChange={e => setEditStampData({ ...editStampData, popisStudie: e.target.value })}
                      className="ktf-edit-textarea-long ktf-edit-textarea-study"
                      placeholder="Popis konkrétní studie..."
                      rows={10}
                    />
                    <button
                      onClick={() => saveTechnicalField('popisStudie', editStampData.popisStudie || '')}
                      className="ktf-btn-check"
                    >✓</button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {studyReferenceBlock}
              {/* --- POPIS STUDIE --- */}
              <div className="study-note-section">
                {item.popisStudie ? (
                  <span className="study-note" dangerouslySetInnerHTML={{__html: formatPopisWithAll(item.popisStudie)}} />
                ) : (
                  <span className="study-note-placeholder">–</span>
                )}
              </div>
            </>
          )}
          <div className="study-clear" />
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
            const sortedDefs = uniqueDefs.slice().sort(naturalVariantSort);
            // --- úprava číslování obrázků ---
            const NO_IMAGE = '/img/no-image.png';
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
              <section key={group} aria-labelledby={`${variantsHeadingBaseId}-${group}`}>
                <h3 id={`${variantsHeadingBaseId}-${group}`} className="variant-subtitle">
                  Varianta {group}
                  {typVarianty && (
                    <><span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span><span className="variant-type">{typVarianty}</span></>
                  )}
                </h3>
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
                  {defs.slice().sort(compareVariantsWithBracket).map((def, i) => {
                    const flatIndex = allVariantsOrdered.indexOf(def);
                    return (
                      <div key={def.idVady || `var-${i}`} className="variant" >
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
                          <img
                            src={def.obrazekVady && def.obrazekVady[0] !== '/' && !def.obrazekVady.startsWith('http') ? '/' + def.obrazekVady : def.obrazekVady}
                            alt={def.idVady}
                            onError={e => { e.target.onerror = null; e.target.src = NO_IMAGE; }}
                          />
                        </div>
                        {/* Editace URL obrázku vady */}
                        {isEditingAll && (
                          <div>
                            <div className="edit-field-row">
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
                                onBlur={e => {
                                  let val = e.target.value;
                                  if (val && val[0] !== '/' && !val.startsWith('http')) val = '/' + val;
                                  if (val !== def.obrazekVady) {
                                    saveDefectEdit(def._id, { ...def, obrazekVady: val });
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="variant-label">Obr. {getImageNumber(def)}</div>
                        {/* Editace nebo zobrazení popisu vady */}
                        {isEditingAll ? (
                          <div >
                            <textarea
                              defaultValue={def.popisVady || ''}
                              rows={5}
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                              }}
                              placeholder="Popis vady... (Ctrl+Enter pro uložení)"
                              autoFocus
                            />
                            <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={(e) => {
                                  // Najdeme všechny input/textarea prvky v této variantě
                                  const container = e.target.closest('.variant');
                                  const variantInput = container.querySelector('input[placeholder="Varianta"]');
                                  const umisteniInput = container.querySelector('textarea[placeholder="Umístění"]');
                                  const popisTextarea = container.querySelector('textarea:not([placeholder="Umístění"])');
                                  const imageInput = container.querySelector('input[placeholder="https://example.com/obrazek.jpg"]');
                                  // Uložíme všechny hodnoty najednou
                                  saveDefectEdit(def._id, { 
                                    ...def, 
                                    variantaVady: variantInput?.value || '',
                                    umisteniVady: umisteniInput?.value || '',
                                    popisVady: popisTextarea?.value || '',
                                    obrazekVady: imageInput?.value || ''
                                  });
                                }}
                                className="ktf-btn-check"
                              >
                                ✓
                              </button>
                              <span className="edit-variant-help">Uloží vše</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            {def.popisVady && (() => {
                              const SPLIT_MARK = '[[...]]';
                              const SPLIT_REGEX = /\[\[\s*\.{3}\s*\]\]/;
                              let parts = typeof def.popisVady === 'string' ? def.popisVady.split(SPLIT_REGEX) : [def.popisVady];
                              // Fallback: if split didn't match but exact literal exists, use indexOf split
                              if (parts.length === 1 && typeof def.popisVady === 'string') {
                                const idxExact = def.popisVady.indexOf('[[...]]');
                                if (idxExact !== -1) {
                                  parts = [def.popisVady.slice(0, idxExact), def.popisVady.slice(idxExact + '[[...]]'.length)];
                                }
                              }
                              if (parts.length > 1) {
                                // remove any stray markers left in parts as a safeguard
                                const before = parts[0].replace(SPLIT_REGEX, '');
                                const after = parts.slice(1).join('').replace(SPLIT_REGEX, '');
                                // split parts prepared (no debug logs)
                                return (
                                  <div className="variant-popis-detail" style={{position: 'relative'}}>
                                    <span className="variant-popis-short">{formatDefectDescription(before)}</span>
                                    <VariantTooltip tooltip={<span style={{fontSize: '13px'}}>{formatDefectDescription(after)}</span>}>
                                      …
                                    </VariantTooltip>
                                  </div>
                                );
                              }
                              return (
                                <div className="variant-popis-detail">{formatDefectDescription(def.popisVady)}</div>
                              );
                            })()}
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
              </section>
            );
          })}
          {/* Speciální skupina pro varianty s + */}
          {plusVariantsOrdered.length > 0 && (
            <section aria-labelledby={`${variantsHeadingBaseId}-plus`}>
              <h3 id={`${variantsHeadingBaseId}-plus`} className="variant-subtitle">
                {plusVariantsOrdered[0]?.variantaVady && plusVariantsOrdered[0].variantaVady.includes(',')
                  ? `Společné ${plusVariantsOrdered[0].variantaVady}`
                  : `Varianta ${plusVariantsOrdered[0]?.variantaVady}`}
              </h3>
              <div className="variants">
                {plusVariantsOrdered.map((def, idx) => {
                  const flatIndex = allVariantsOrdered.indexOf(def);
                  return (
                    <div key={def.idVady || def._id || `plusvar-${idx}`} className="variant">
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
                      <img
                        src={def.obrazekVady && def.obrazekVady[0] !== '/' && !def.obrazekVady.startsWith('http') ? '/' + def.obrazekVady : def.obrazekVady}
                        alt={def.idVady}
                        onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                      />
                    </div>
                    {/* Editace URL obrázku vady */}
                    {isEditingAll && (
                      <div>
                        <div className="edit-field-row">
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
                            onBlur={e => {
                              let val = e.target.value;
                              if (val && val[0] !== '/' && !val.startsWith('http')) val = '/' + val;
                              if (val !== def.obrazekVady) {
                                saveDefectEdit(def._id, { ...def, obrazekVady: val });
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="variant-label">Obr. {getImageNumber(def)}</div>
                    {/* Editace nebo zobrazení popisu vady */}
                    {isEditingAll ? (
                      <div >
                        <textarea
                          defaultValue={def.popisVady || ''}
                          rows={5}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                          placeholder="Popis vady... (Ctrl+Enter pro uložení)"
                          autoFocus
                        />
                        <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              // Najdeme všechny input/textarea prvky v této variantě
                              const container = e.target.closest('.variant');
                              const variantInput = container.querySelector('input[placeholder=\"Varianta\"]');
                              const umisteniInput = container.querySelector('textarea[placeholder=\"Umístění\"]');
                              const popisTextarea = container.querySelector('textarea:not([placeholder=\"Umístění\"])');
                              const imageInput = container.querySelector('input[placeholder=\"https://example.com/obrazek.jpg\"]');
                              // Uložíme všechny hodnoty najednou
                              saveDefectEdit(def._id, { 
                                ...def, 
                                variantaVady: variantInput?.value || '',
                                umisteniVady: umisteniInput?.value || '',
                                popisVady: popisTextarea?.value || '',
                                obrazekVady: imageInput?.value || ''
                              });
                            }}
                            className="ktf-btn-check"
                          >
                            ✓
                          </button>
                          <span className="edit-variant-help">Uloží vše</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {def.popisVady && (() => {
                          const SPLIT_REGEX = /\[\[\s*\.{3}\s*\]\]/;
                          let parts = typeof def.popisVady === 'string' ? def.popisVady.split(SPLIT_REGEX) : [def.popisVady];
                          if (parts.length === 1 && typeof def.popisVady === 'string') {
                            const idxExact = def.popisVady.indexOf('[[...]]');
                            if (idxExact !== -1) {
                              parts = [def.popisVady.slice(0, idxExact), def.popisVady.slice(idxExact + '[[...]]'.length)];
                            }
                          }
                          if (parts.length > 1) {
                            const before = parts[0].replace(SPLIT_REGEX, '');
                            const after = parts.slice(1).join('').replace(SPLIT_REGEX, '');
                            return (
                              <div className="variant-popis-detail" style={{position: 'relative'}}>
                                <span className="variant-popis-short">{formatDefectDescription(before)}</span>
                                <VariantTooltip tooltip={<span style={{fontSize: '13px'}}>{formatDefectDescription(after)}</span>}>
                                  …
                                </VariantTooltip>
                              </div>
                            );
                          }
                          // If text is long, show clamped 5 lines and a tooltip with full text
                          const renderedFull2 = formatDefectDescription(def.popisVady);
                          const isLong2 = typeof def.popisVady === 'string' && def.popisVady.length > 500;
                          if (isLong2) {
                            return (
                              <div className="variant-popis-detail" style={{position: 'relative'}}>
                                <span className="variant-popis-short variant-popis-clamped">{renderedFull2}</span>
                                <VariantTooltip tooltip={<div style={{fontSize: '13px'}}>{renderedFull2}</div>}>
                                  …
                                </VariantTooltip>
                              </div>
                            );
                          }
                          return (
                            <div className="variant-popis-detail">{renderedFull2}</div>
                          );
                        })()}
                        {isEditingAll && !def.popisVady && (
                          <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
                            Klikni na editační ikonu pro přidání popisu<br/>
                            <span style={{color:'#b88', fontSize:'11px'}}>Podporuje HTML tagy, např. &lt;b&gt;tučně&lt;/b&gt;</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            </section>
          )}
          <section className={secondStudyBlockClass} aria-labelledby={additionalStudyHeadingId}>
            <h2 id={additionalStudyHeadingId} className="sr-only">Doplňující popis studie</h2>
            {isEditingAll ? (
              <div className="label-top-input ktf-edit-row-full">
                <label htmlFor="edit-popis-studie-2">Popis studie – část za variantami</label>
                <div className="edit-field-row ktf-edit-row-full">
                  <textarea
                    id="edit-popis-studie-2"
                    value={typeof editStampData.popisStudie2 === 'string' ? editStampData.popisStudie2 : popisStudie2Display}
                    onChange={e => setEditStampData({ ...editStampData, popisStudie2: e.target.value })}
                    className="ktf-edit-textarea-long ktf-edit-textarea-study"
                    placeholder="Druhý blok popisu zobrazený za variantami"
                    rows={10}
                  />
                  <button
                    onClick={() => saveTechnicalField('popisStudie2', editStampData.popisStudie2 || '')}
                    className="ktf-btn-check"
                  >✓</button>
                </div>
                <div className="edit-field-row study-authors-row">
                  <label htmlFor="edit-obrazek-autor" className="ktf-edit-inline-label">Zdroj obrázků:</label>
                  <input
                    type="text"
                    id="edit-obrazek-autor"
                    value={typeof editStampData.obrazekAutor === 'string' ? editStampData.obrazekAutor : (item.obrazekAutor || '')}
                    onChange={e => setEditStampData({ ...editStampData, obrazekAutor: e.target.value })}
                    className="ktf-edit-input-tech ktf-edit-input-long ktf-edit-authors-input"
                    placeholder="Např. Jana Nováková, Petr Dvořák"
                    list={authorSuggestionListId}
                    autoComplete="off"
                  />
                  {authorSuggestionListId && (
                    <datalist id={authorSuggestionListId}>
                      {authorSuggestionValues.map(value => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  )}
                  <button
                    onClick={() => saveTechnicalField('obrazekAutor', editStampData.obrazekAutor || '')}
                    className="ktf-btn-check"
                  >✓</button>
                </div>
              </div>
            ) : (
              <>
                {hasPopisStudie2Content && (
                  <span
                    className="study-note"
                    dangerouslySetInnerHTML={{ __html: formatPopisWithAll(popisStudie2Display) }}
                  />
                )}
                {hasAuthors && authorsDisplay && (
                  <>
                    <div className="study-clear" />
                    <div className="study-note-authors-wrapper">
                      <div className="study-note-authors-shell">
                        <span className="study-note-authors-icon" aria-hidden="true" />
                        <div className="study-note study-note-authors">
                          {authorsDisplay}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </section>
      )}
    </article>
  );
}
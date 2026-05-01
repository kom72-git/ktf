import React, { useState, useEffect, useRef } from "react";
import { Fancybox } from "@fancyapps/ui";
import VariantTooltip from "./components/VariantTooltip.jsx";
import {
  replaceAbbreviations,
  formatPopisWithAll,
  formatDefectDescription,
  renderEmissionTitleWithPragaSuffix
} from "./utils/formatovaniTextu.jsx";
import {
  naturalVariantSort,
  compareVariantsWithBracket,
  splitCatalogDisplaySuffix,
  renderCatalogDisplay,
  CATALOG_SUFFIX_SPACING
} from "./utils/katalog.js";
import {
  normalizeStampImagePath,
  normalizeStampImagePathForStorage
} from "./utils/obrazekCesta.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "./fancybox-responsive.css";
import ImageSources from "./components/ImageSources.jsx";
import VariantList from "./components/VariantList.jsx";

const LITERATURE_PREFIX_REGEX = /^\s*(?:\[(\d+)\]|(\d+)([.)]))\s*(.*)$/;
const LITERATURE_URL_REGEX = /(https?:\/\/[^\s]+)/i;
function parseLiteratureEntries(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return [];
  }

  return rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const prefixMatch = line.match(LITERATURE_PREFIX_REGEX);
      if (!prefixMatch) {
        return null;
      }

      const bracketNumber = prefixMatch[1] || "";
      const plainNumber = prefixMatch[2] || "";
      const plainSuffix = prefixMatch[3] || "";
      const textWithOptionalUrl = (prefixMatch[4] || "").trim();
      const prefix = bracketNumber ? `[${bracketNumber}]` : `${plainNumber}${plainSuffix}`;
      const number = bracketNumber || plainNumber;
      const urlMatch = textWithOptionalUrl.match(LITERATURE_URL_REGEX);
      const url = urlMatch ? urlMatch[1] : "";
      const cleanText = url
        ? textWithOptionalUrl.replace(url, "").trim().replace(/[\s,;]+$/, "")
        : textWithOptionalUrl;
      const firstMark = cleanText.indexOf("%");
      const secondMark = firstMark !== -1 ? cleanText.indexOf("%", firstMark + 1) : -1;
      const hasMarkedLink = firstMark !== -1 && secondMark !== -1 && secondMark > firstMark + 1;
      const beforeText = hasMarkedLink ? cleanText.slice(0, firstMark) : "";
      const markedLinkText = hasMarkedLink ? cleanText.slice(firstMark + 1, secondMark) : "";
      const afterText = hasMarkedLink ? cleanText.slice(secondMark + 1) : "";

      return {
        line,
        number,
        prefix,
        text: cleanText || textWithOptionalUrl,
        url,
        beforeText,
        markedLinkText,
        afterText,
        hasMarkedLink,
      };
    })
    .filter(Boolean);
}

export default function DetailPage({ id, onBack, defects, isAdmin = false, fieldSuggestions = {}, allStamps = [] }) {
  const [item, setItem] = useState(null);
  const [localDefects, setLocalDefects] = useState(defects || []);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [editStampData, setEditStampData] = useState({});
  const [savedCaption, setSavedCaption] = useState(false);
  const [isSavingHidden, setIsSavingHidden] = useState(false);
  const [isSavingVerified, setIsSavingVerified] = useState(false);
  const [isSavingAllChanges, setIsSavingAllChanges] = useState(false);
  const [isDeletingStamp, setIsDeletingStamp] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmDigitInput, setDeleteConfirmDigitInput] = useState('');
  const [hoverPreviewId, setHoverPreviewId] = useState(null);
  const technicalTooltipExcludedFields = new Set([]);
  const getSuggestionValues = (field) => {
    const values = fieldSuggestions?.[field];
    return Array.isArray(values) ? values : [];
  };
  const hasSuggestions = (field) => getSuggestionValues(field).length > 0;
  const getSuggestionListId = (field) => `detail-edit-${field}-options`;
  const suggestionEntries = Object.entries(fieldSuggestions || {}).filter(
    ([, values]) => Array.isArray(values) && values.length > 0
  );
  const lastAutoImageBaseRef = useRef("");
  const variantListRef = useRef(null);
  const lastAutoSavedPrefillRef = useRef("");
  const isAutoSavingPrefillRef = useRef(false);

  const buildImageAddressBase = (yearValue, catalogValue) => {
    const year = String(yearValue ?? "").trim();
    const catalog = String(catalogValue ?? "").replace(/\s+/g, "").trim();
    const hasCatalogCore = /\d{3,}/.test(catalog);
    if (!/^\d{4}$/.test(year) || !catalog || !hasCatalogCore) return "";
    return `${year}/${catalog}`;
  };

  const recalculateImageAddressesFromCatalog = (overrides = {}, options = {}) => {
    const { forceResetOnInvalid = false } = options;
    setEditStampData((prev) => {
      const draft = { ...prev, ...overrides };
      const base = buildImageAddressBase(draft.rok || item?.rok, draft.katalogCislo || item?.katalogCislo);
      if (!base) {
        if (!forceResetOnInvalid) return draft;
        return {
          ...draft,
          obrazek: "",
          obrazekStudie: "",
          schemaTF: "",
        };
      }

      return {
        ...draft,
        obrazek: base,
        obrazekStudie: `${base}s`,
        schemaTF: `${base}-TF`,
      };
    });
  };

  const normalizeStampImageFieldValue = (field, value, yearValue) => (
    field === 'obrazek' || field === 'obrazekStudie' || field === 'schemaTF'
      ? normalizeStampImagePathForStorage(value, yearValue)
      : value
  );

  const parseCatalogAB = (catalogValue) => {
    const text = String(catalogValue || "").trim();
    const match = text.match(/^([A-ZČŘŽŠĚÚŮ]+)\s*([\d/]+)([A-Z])$/i);
    if (!match) return null;
    return {
      prefix: (match[1] || "").trim().toUpperCase(),
      number: match[2],
      suffix: (match[3] || "").trim().toUpperCase(),
    };
  };

  const renderTechnicalValue = (field, value) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    if (technicalTooltipExcludedFields.has(field)) {
      return value;
    }

    return typeof value === "string" ? replaceAbbreviations(value) : value;
  };

  useEffect(() => {
    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      (window.location.hostname.endsWith("app.github.dev")
        ? `https://${window.location.hostname}`
        : window.location.hostname.endsWith("vercel.app")
        ? "" // Pro Vercel používáme relativní cesty, backend bude na stejné doméně
        : "http://localhost:3001"); // Lokální vývoj
    fetch(`${API_BASE}/api/stamps/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const error = new Error("Známka nenalezena");
          error.status = res.status;
          throw error;
        }
        return res.json();
      })
      .then(data => {
        console.log("[DetailPage] Načtená data:", data);
        setItem(data);
        // Inicializace editačních dat pro známku
        setEditStampData({
          emise: data.emise || '',
          emiseSkupina: data.emiseSkupina || '',
          rok: data.rok || '',
          katalogCislo: data.katalogCislo || '',
          datumVydani: data.datumVydani || '',
          navrh: data.navrh || '',
          rytec: data.rytec || '',
          druhTisku: data.druhTisku || '',
          tiskovaForma: data.tiskovaForma || '',
          nominal: data.nominal || '',
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
          literatura: data.literatura || '',
          obrazekAutor: data.obrazekAutor || '',
          isHidden: Boolean(data.isHidden),
          overeno: Boolean(data.overeno),
          variantyVylouceneZA: data.variantyVylouceneZA || [],
          variantyMamZA: data.variantyMamZA || {}
        });
      })
      .catch(err => {
        console.error("[DetailPage] Chyba při načítání detailu:", err);
        if (err?.status === 404 && typeof onBack === "function") {
          onBack();
        }
      });
  }, [id, onBack]);

  useEffect(() => {
    setLocalDefects(defects || []);
  }, [defects]);

  useEffect(() => {
    if (!isEditingAll || !item?.idZnamky) return;

    let prefillPayload = null;

    setEditStampData((prev) => {
      const base = buildImageAddressBase(prev.rok || item?.rok, prev.katalogCislo || item?.katalogCislo);
      const previousAutoBase = lastAutoImageBaseRef.current;
      const currentMain = String(prev.obrazek || "").trim();
      const currentStudy = String(prev.obrazekStudie || "").trim();
      const currentTf = String(prev.schemaTF || "").trim();
      const nextPayload = {};
      if (!base) {
        if (previousAutoBase) {
          let changedOnClear = false;
          const cleared = { ...prev };
          if (currentMain === previousAutoBase) {
            cleared.obrazek = "";
            nextPayload.obrazek = "";
            changedOnClear = true;
          }
          if (currentStudy === `${previousAutoBase}s`) {
            cleared.obrazekStudie = "";
            nextPayload.obrazekStudie = "";
            changedOnClear = true;
          }
          if (currentTf === `${previousAutoBase}-TF`) {
            cleared.schemaTF = "";
            nextPayload.schemaTF = "";
            changedOnClear = true;
          }
          if (Object.keys(nextPayload).length > 0) {
            prefillPayload = nextPayload;
          }
          lastAutoImageBaseRef.current = "";
          return changedOnClear ? cleared : prev;
        }
        lastAutoImageBaseRef.current = "";
        return prev;
      }

      let changed = false;
      const next = { ...prev };
      const canAutoUpdateMain = !currentMain || (previousAutoBase && currentMain === previousAutoBase);
      const canAutoUpdateStudy = !currentStudy || (previousAutoBase && currentStudy === `${previousAutoBase}s`);
      const canAutoUpdateTf = !currentTf || (previousAutoBase && currentTf === `${previousAutoBase}-TF`);

      if (canAutoUpdateMain && currentMain !== base) {
        next.obrazek = base;
        nextPayload.obrazek = base;
        changed = true;
      }
      if (canAutoUpdateStudy && currentStudy !== `${base}s`) {
        next.obrazekStudie = `${base}s`;
        nextPayload.obrazekStudie = `${base}s`;
        changed = true;
      }
      if (canAutoUpdateTf && currentTf !== `${base}-TF`) {
        next.schemaTF = `${base}-TF`;
        nextPayload.schemaTF = `${base}-TF`;
        changed = true;
      }

      lastAutoImageBaseRef.current = base;
      if (Object.keys(nextPayload).length > 0) {
        prefillPayload = nextPayload;
      }

      return changed ? next : prev;
    });

    if (!prefillPayload || Object.keys(prefillPayload).length === 0) return;

    const yearForNormalization = editStampData.rok || item?.rok;
    const normalizedPayload = Object.entries(prefillPayload).reduce((acc, [field, value]) => {
      acc[field] = normalizeStampImageFieldValue(field, value, yearForNormalization);
      return acc;
    }, {});
    const signature = `${item.idZnamky}|${JSON.stringify(normalizedPayload)}`;
    if (isAutoSavingPrefillRef.current || lastAutoSavedPrefillRef.current === signature) {
      return;
    }

    isAutoSavingPrefillRef.current = true;
    lastAutoSavedPrefillRef.current = signature;

    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      (window.location.hostname.endsWith("app.github.dev")
        ? `https://${window.location.hostname}`
        : window.location.hostname.endsWith("vercel.app")
        ? ""
        : "http://localhost:3001");

    fetch(`${API_BASE}/api/stamps/${item.idZnamky}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const updatedStamp = await response.json();
        setItem(updatedStamp);
      })
      .catch((error) => {
        console.error('Auto-uložení předvyplněných adres selhalo:', error);
        lastAutoSavedPrefillRef.current = "";
      })
      .finally(() => {
        isAutoSavingPrefillRef.current = false;
      });
  }, [isEditingAll, item?.idZnamky, item?.rok, item?.katalogCislo, editStampData.rok, editStampData.katalogCislo]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTopButton(window.scrollY > 320);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Funkce pro editaci vady
  const saveDefectEdit = async (defectId, updatedData, options = {}) => {
    const { silent = false } = options;
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
      if (!actualId) {
        if (!silent) {
          alert('Chyba při ukládání vady: chybí ID varianty');
        }
        return false;
      }
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

      const responseContentType = response.headers.get('content-type') || '';
      const isJsonResponse = responseContentType.includes('application/json');
      let responseData = null;
      let responseText = '';

      if (response.status !== 204) {
        if (isJsonResponse) {
          responseData = await response.json().catch(() => null);
        } else {
          responseText = await response.text().catch(() => '');
          if (responseText) {
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = null;
            }
          }
        }
      }

      console.log('API Response:', responseData || responseText || `HTTP ${response.status}`);

      if (response.ok) {
        console.log('Vada úspěšně aktualizována');
        const savedDefect = responseData && typeof responseData === 'object'
          ? responseData
          : { ...updatedData, _id: actualId, idVady: actualId };
        setLocalDefects((prev) => prev.map((defect) => {
          const currentId = defect._id?.toString() || defect.idVady;
          return currentId === actualId.toString() ? savedDefect : defect;
        }));
        // Zobraz dočasnou hlášku
        if (!silent) {
          const notification = document.createElement('div');
          notification.textContent = 'Uloženo';
          notification.className = 'ktf-notification';
          document.body.appendChild(notification);
          setTimeout(() => document.body.removeChild(notification), 2000);
        }
        return true;
      } else {
        console.error('Chyba při ukládání vady:', responseData);
        const errorMessage =
          responseData?.error
          || responseText?.trim()
          || `HTTP ${response.status}`;

        // Některé verze backendu vrací tuto hlášku i při no-op update (data již odpovídají DB).
        // V takovém případě bereme výsledek jako úspěch, aby nevznikala falešná chyba v UI.
        if (errorMessage === 'Nepodařilo se aktualizovat vadu') {
          const savedDefect = { ...updatedData, _id: actualId, idVady: actualId };
          setLocalDefects((prev) => prev.map((defect) => {
            const currentId = defect._id?.toString() || defect.idVady;
            return currentId === actualId.toString() ? savedDefect : defect;
          }));
          if (!silent) {
            const notification = document.createElement('div');
            notification.textContent = 'Uloženo';
            notification.className = 'ktf-notification';
            document.body.appendChild(notification);
            setTimeout(() => document.body.removeChild(notification), 2000);
          }
          return true;
        }

        if (!silent) {
          alert(`Chyba při ukládání vady: ${errorMessage}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      if (!silent) {
        alert('Chyba při ukládání vady: ' + error.message);
      }
      return false;
    }
  };

  const deleteDefect = async (defectId) => {
    if (!window.confirm('Opravdu smazat tuto variantu z databáze?')) return;
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");
      const actualId = defectId._id || defectId.idVady || defectId;
      const isVercel = window.location.hostname.endsWith('vercel.app');
      const apiUrl = isVercel
        ? `/api/defects/${actualId}`
        : `${API_BASE}/api/defects/${actualId}`;
      const response = await fetch(apiUrl, { method: 'DELETE' });
      if (response.ok) {
        // Odstraníme z lokálního stavu
        setLocalDefects(prev => prev.filter(d => {
          const dId = d._id?.toString() || d.idVady;
          return dId !== actualId.toString();
        }));
      } else {
        const raw = await response.text();
        let errorMessage = 'Neznámá chyba';
        try {
          const parsed = JSON.parse(raw);
          errorMessage = parsed.error || errorMessage;
        } catch {
          errorMessage = raw?.trim() ? `HTTP ${response.status}` : errorMessage;
        }
        alert(`Chyba při mazání: ${errorMessage}`);
      }
    } catch (error) {
      alert('Chyba při mazání: ' + error.message);
    }
  };

  // Funkce pro uložení změn známky
  const saveStampEdit = async () => {
    try {
      const normalizedEditStampData = {
        ...editStampData,
        obrazek: normalizeStampImageFieldValue('obrazek', editStampData.obrazek, editStampData.rok || item?.rok),
        obrazekStudie: normalizeStampImageFieldValue('obrazekStudie', editStampData.obrazekStudie, editStampData.rok || item?.rok),
        schemaTF: normalizeStampImageFieldValue('schemaTF', editStampData.schemaTF, editStampData.rok || item?.rok),
      };
      console.log('Saving stamp:', id, normalizedEditStampData);
      
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
        body: JSON.stringify(normalizedEditStampData)
      });

      const responseData = await response.json();
      console.log('Stamp API Response:', responseData);

      if (response.ok) {
        console.log('Známka úspěšně aktualizována');
        setItem(responseData);
        return true;
      } else if (responseData.error === 'Nepodařilo se aktualizovat známku') {
        // No-op update (data beze změny) – nepovažujeme za chybu
        console.log('Známka bez změny – ignorujeme');
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
      const normalizedValue = normalizeStampImageFieldValue(field, value, editStampData.rok || item?.rok);
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
        body: JSON.stringify({ [field]: normalizedValue })
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
    setIsSavingAllChanges(true);
    const stampSaved = await saveStampEdit();
    if (stampSaved) {
      setEditingDefect(null);
    }
    await variantListRef.current?.saveAll();
    setIsSavingAllChanges(false);
  };

  const deleteStampWithDefects = () => {
    if (!item?.idZnamky) return;
    setDeleteConfirmDigitInput('');
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteStamp = async () => {
    const requiredDigits = String(item?.katalogCislo || "").replace(/\D+/g, "");
    if (String(deleteConfirmDigitInput).trim() !== requiredDigits) {
      return;
    }
    setDeleteConfirmVisible(false);
    setIsDeletingStamp(true);
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");

      const apiUrl = `${API_BASE}/api/stamps/${item.idZnamky}`;

      const response = await fetch(apiUrl, { method: 'DELETE' });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(`Chyba při mazání známky: ${responseData.error || 'Neznámá chyba'}`);
        return;
      }

      const deletedVariantsCount = responseData.deletedDefectsCount ?? 0;
      const stampLabel = `${item?.emise || 'Neznámá emise'} (${item?.katalogCislo || item?.idZnamky || 'bez katalogu'})`;
      alert(`Smazána známka: ${stampLabel}\nOdstraněno variant: ${deletedVariantsCount}`);
      if (typeof onBack === 'function') {
        onBack();
      }
      window.location.reload();
    } catch (error) {
      alert('Chyba při mazání známky: ' + error.message);
    }
    setIsDeletingStamp(false);
  };

  const handleVisibilityToggle = async (isPublished) => {
    const nextHidden = !isPublished;
    const previous = Boolean(editStampData.isHidden);
    setEditStampData((prev) => ({ ...prev, isHidden: nextHidden }));
    setIsSavingHidden(true);
    const saved = await saveMainField('isHidden', nextHidden);
    setIsSavingHidden(false);
    if (!saved) {
      setEditStampData((prev) => ({ ...prev, isHidden: previous }));
      return;
    }
    const notification = document.createElement('div');
    notification.textContent = 'Uloženo';
    notification.className = 'ktf-notification';
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 1500);
  };

  const handleVerifiedToggle = async (isVerified) => {
    const previous = Boolean(editStampData.overeno);
    setEditStampData((prev) => ({ ...prev, overeno: isVerified }));
    setIsSavingVerified(true);
    const saved = await saveMainField('overeno', isVerified);
    setIsSavingVerified(false);
    if (!saved) {
      setEditStampData((prev) => ({ ...prev, overeno: previous }));
      return;
    }
    const notification = document.createElement('div');
    notification.textContent = 'Uloženo';
    notification.className = 'ktf-notification';
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 1500);
  };

  if (!item) return <div className="p-8">Načítám…</div>;
  if (item.error) {
    console.error("[DetailPage] API vrátilo chybu:", item.error);
    return <div className="p-8 text-red-600">Chyba: {item.error}</div>;
  }

  // Vady pro tuto známku
  const itemDefects = localDefects.filter(d => d.idZnamky === item.idZnamky);
  const thisCatalogAB = parseCatalogAB(item?.katalogCislo);
  const oppositeSuffix = thisCatalogAB?.suffix === "A" ? "B" : thisCatalogAB?.suffix === "B" ? "A" : null;
  const companionStamp = (allStamps || []).find((stamp) => {
    if (!stamp || stamp.idZnamky === item.idZnamky) return false;
    if (stamp.rok !== item.rok) return false;
    if ((stamp.emise || "") !== (item.emise || "")) return false;
    const parsed = parseCatalogAB(stamp.katalogCislo);
    if (!parsed || !thisCatalogAB || !oppositeSuffix) return false;
    return (
      parsed.prefix === thisCatalogAB.prefix
      && parsed.number === thisCatalogAB.number
      && parsed.suffix === oppositeSuffix
    );
  }) || null;
  const companionCatalogAB = companionStamp ? parseCatalogAB(companionStamp.katalogCislo) : null;
  const hasABPair = Boolean(thisCatalogAB && companionCatalogAB);
  const currentIsA = thisCatalogAB?.suffix === "A";
  const aStamp = hasABPair ? (currentIsA ? item : companionStamp) : null;
  const bStamp = hasABPair ? (currentIsA ? companionStamp : item) : null;
  const isViewingBVariant = Boolean(hasABPair && !currentIsA && aStamp);
  const getInheritedDefectKey = (defect) => (
    defect?._id?.toString()
    || defect?.idVady
    || `${defect?.variantaVady || ""}||${defect?.umisteniVady || ""}`
  );
  const isExcludedInheritedDefect = (defect, excludedList) => {
    const defectKey = getInheritedDefectKey(defect);
    const legacyVariantKey = defect?.variantaVady || "";
    return excludedList.includes(defectKey) || (legacyVariantKey && excludedList.includes(legacyVariantKey));
  };
  const inheritedMamMap = (isViewingBVariant && item?.variantyMamZA && typeof item.variantyMamZA === "object")
    ? item.variantyMamZA
    : {};
  const resolveInheritedMam = (defect) => {
    const defectKey = getInheritedDefectKey(defect);
    if (Object.prototype.hasOwnProperty.call(inheritedMamMap, defectKey)) {
      return !!inheritedMamMap[defectKey];
    }
    const legacyVariantKey = defect?.variantaVady || "";
    if (legacyVariantKey && Object.prototype.hasOwnProperty.call(inheritedMamMap, legacyVariantKey)) {
      return !!inheritedMamMap[legacyVariantKey];
    }
    return false;
  };
  // U B kombinujeme vlastní vady s fallbackem z A (po odfiltrování vyloučených).
  const excludedFromA = isViewingBVariant ? (item.variantyVylouceneZA || []) : [];
  const inheritedDefectsFromA = (isViewingBVariant && aStamp)
    ? localDefects
      .filter(d => d.idZnamky === aStamp.idZnamky && !isExcludedInheritedDefect(d, excludedFromA))
      .map((d) => ({
        ...d,
        __inheritedFromA: true,
        __inheritedKey: getInheritedDefectKey(d),
        mam: resolveInheritedMam(d),
      }))
    : [];
  const effectiveDefects = isViewingBVariant
    ? [...itemDefects, ...inheritedDefectsFromA]
    : itemDefects;

  const saveInheritedMamForB = async (defect, mamValue) => {
    if (!isViewingBVariant) return false;
    const defectKey = defect?.__inheritedKey || getInheritedDefectKey(defect);
    const nextMap = { ...(item?.variantyMamZA || {}), [defectKey]: !!mamValue };
    const legacyVariantKey = defect?.variantaVady || "";
    if (legacyVariantKey && Object.prototype.hasOwnProperty.call(nextMap, legacyVariantKey)) {
      delete nextMap[legacyVariantKey];
    }
    setItem((prev) => ({ ...prev, variantyMamZA: nextMap }));
    return saveTechnicalField('variantyMamZA', nextMap);
  };

  const HIDE_TOKEN = "NE";
  const hasNonEmptyValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  };
  const isHiddenByToken = (value) => (
    typeof value === "string" && value.trim().toUpperCase() === HIDE_TOKEN
  );
  const getResolvedFromA = (fieldName, options = {}) => {
    const { inheritFromA = true } = options;
    const currentValue = item?.[fieldName];
    if (isHiddenByToken(currentValue)) return "";
    if (!isViewingBVariant) return currentValue;
    if (hasNonEmptyValue(currentValue)) return currentValue;
    if (!inheritFromA) return "";
    const sourceValue = aStamp?.[fieldName];
    if (isHiddenByToken(sourceValue)) return "";
    return sourceValue;
  };

  const resolvedObrazek = getResolvedFromA("obrazek") || "";
  const resolvedObrazekStudie = getResolvedFromA("obrazekStudie", { inheritFromA: false }) || "";
  const normalizedResolvedObrazekStudie = normalizeStampImagePath(
    resolvedObrazekStudie,
    editStampData.rok || item?.rok
  );
  const resolvedPopisObrazkuStudie = getResolvedFromA("popisObrazkuStudie", { inheritFromA: false }) || "";
  const resolvedDatumVydani = getResolvedFromA("datumVydani") || "";
  const resolvedNavrh = getResolvedFromA("navrh") || "";
  const resolvedRytec = getResolvedFromA("rytec") || "";
  const resolvedDruhTisku = getResolvedFromA("druhTisku") || "";
  const resolvedTiskovaForma = getResolvedFromA("tiskovaForma") || "";
  const resolvedNominal = getResolvedFromA("nominal") || "";
  const resolvedZoubkovani = getResolvedFromA("zoubkovani") || "";
  const resolvedPapir = getResolvedFromA("papir") || "";
  const resolvedRozmer = getResolvedFromA("rozmer") || "";
  const resolvedNaklad = getResolvedFromA("naklad") || "";
  const resolvedSchemaTF = getResolvedFromA("schemaTF") || "";
  const normalizedItemSchemaTF = normalizeStampImagePath(item?.schemaTF || "", editStampData.rok || item?.rok);
  const normalizedResolvedSchemaTF = normalizeStampImagePath(resolvedSchemaTF, editStampData.rok || item?.rok);
  const resolvedStudie = getResolvedFromA("Studie") || "";
  const resolvedStudieUrl = getResolvedFromA("studieUrl") || "";
  const resolvedPopisStudie = getResolvedFromA("popisStudie") || "";
  const resolvedPopisStudie2 = getResolvedFromA("popisStudie2") || "";
  const resolvedObrazekAutor = getResolvedFromA("obrazekAutor") || "";
  const resolvedLiteratura = getResolvedFromA("literatura") || "";

  const popisStudie2Raw = typeof resolvedPopisStudie2 === "string" ? resolvedPopisStudie2 : "";
  const hasPopisStudie2Content = /[^\s,]/.test(popisStudie2Raw);
  const popisStudie2Display = hasPopisStudie2Content ? popisStudie2Raw.trim() : "";
  const authorsRaw = typeof resolvedObrazekAutor === "string" ? resolvedObrazekAutor.trim() : "";
  const hasAuthors = authorsRaw.length > 0;
  const literatureRaw = typeof resolvedLiteratura === "string" ? resolvedLiteratura : "";
  const literatureEntries = parseLiteratureEntries(literatureRaw);
  const hasLiteratureEntries = literatureEntries.length > 0;
  const renderAbbrevContent = (value, keyPrefix) => {
    if (Array.isArray(value)) {
      return value.map((part, idx) => (
        <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
      ));
    }
    return value;
  };
  // Počet zdrojů obrázků (autorů) pro zobrazení v bloku se zdroji
  const authorsCount = authorsRaw.split(',').map(s => s.trim()).filter(Boolean).length;
  const authorSuggestionValues = Array.isArray(fieldSuggestions?.obrazekAutor)
    ? fieldSuggestions.obrazekAutor
    : [];
  const authorSuggestionListId = authorSuggestionValues.length
    ? `detail-authors-options-${item.idZnamky || id || "default"}`
    : undefined;
  const studyReferenceBlock = (() => {
    if (!resolvedStudie) return null;

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

    const rawStudie = resolvedStudie || "";
    const LINK_MARK = "%";
    const commaIdx = rawStudie.indexOf(",");
    const authorRaw = commaIdx !== -1 ? rawStudie.slice(0, commaIdx) : rawStudie;
    const remainderRawFull = commaIdx !== -1 ? rawStudie.slice(commaIdx + 1) : "";
    const remainderRaw = remainderRawFull.replace(/^\s*/, "");
    const hasRemainder = remainderRaw.length > 0;

    const authorContent = authorRaw ? replaceAbbreviations(authorRaw) : null;
    const authorNode = authorContent ? renderEmphasizedWithConj(authorContent, "study-author") : null;

    if (resolvedStudieUrl) {
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
                  href={resolvedStudieUrl}
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
                href={resolvedStudieUrl}
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

  const secondStudyBlockClass = isEditingAll ? 'study-note-block editing' : 'study-note-block';
  const isVerifiedStamp = Boolean(item?.overeno);
  const detailHeadingId = `stamp-detail-${item.idZnamky || id}-title`;
  const specHeadingId = `${detailHeadingId}-spec`;
  const studyHeadingId = `${detailHeadingId}-study`;
  const variantsHeadingBaseId = `${detailHeadingId}-variant`;

  const normalizeImageSrc = (src) => {
    if (!src || typeof src !== "string") return "";
    return src[0] !== "/" && !src.startsWith("http") ? `/${src}` : src;
  };

  const getPreviewImageSrc = (stamp) => {
    if (!stamp) return "/img/no-image.png";
    const normalizedPath = normalizeStampImagePath(stamp.obrazek || "", stamp.rok);
    const src = normalizeImageSrc(normalizedPath);
    return src || "/img/no-image.png";
  };

  const renderCatalogLinkWithPreview = (stamp, text) => {
    if (!stamp) return null;
    const key = stamp.idZnamky || text;
    const isOpen = hoverPreviewId === key;
    return (
      <span
        className="catalog-preview-link-wrap"
        onMouseEnter={() => setHoverPreviewId(key)}
        onMouseLeave={() => setHoverPreviewId((current) => (current === key ? null : current))}
      >
        <a href={`#/detail/${stamp.idZnamky}`}>{renderCatalogDisplay(text, key)}</a>
        {isOpen && (
          <span className="catalog-preview-popover" aria-hidden="true">
            <img
              src={getPreviewImageSrc(stamp)}
              alt={text}
              className="catalog-preview-image"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/img/no-image.png";
              }}
            />
          </span>
        )}
      </span>
    );
  };

  const renderCatalogDisplay = (text, keyPrefix = "catalog") => {
    const { base, suffix } = splitCatalogDisplaySuffix(text);
    if (!suffix) return text;
    return `${base}${CATALOG_SUFFIX_SPACING}${suffix}`;
  };

  const openSingleImageLightbox = (src, caption = "") => {
    const normalizedSrc = normalizeImageSrc(src);
    if (!normalizedSrc) return;
    Fancybox.show(
      [
        {
          src: normalizedSrc,
          caption,
        },
      ],
      {
        Toolbar: ["zoom", "close"],
        dragToClose: true,
        animated: true,
        compact: false,
        showClass: "fancybox-zoomIn",
        hideClass: "fancybox-zoomOut",
        closeButton: "top",
        defaultType: "image",
      }
    );
  };
  const additionalStudyHeadingId = `${detailHeadingId}-study-after`;
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
                    emiseSkupina: item.emiseSkupina || '',
                    rok: item.rok || '',
                    katalogCislo: item.katalogCislo || '',
                    datumVydani: item.datumVydani || '',
                    navrh: item.navrh || '',
                    rytec: item.rytec || '',
                    druhTisku: item.druhTisku || '',
                    tiskovaForma: item.tiskovaForma || '',
                    nominal: item.nominal || '',
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
                    popisStudie2: item.popisStudie2 || '',
                    literatura: item.literatura || '',
                    isHidden: Boolean(item.isHidden),
                    overeno: Boolean(item.overeno)
                  });
                  setIsEditingAll(false);
                }
              }}
              className={isEditingAll ? "admin-edit-btn primary" : "admin-edit-btn success"}
            >
              {isEditingAll ? 'Odejít' : 'Editovat'}
            </button>
            {isEditingAll && (
              <button
                className="ktf-btn-confirm"
                style={{ marginLeft: '8px' }}
                onClick={saveAllChanges}
                disabled={isSavingAllChanges}
              >
                {isSavingAllChanges ? 'Ukládám vše…' : '✔ Ulož vše'}
              </button>
            )}
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
            {isEditingAll && (
              <button
                className="admin-edit-btn danger"
                style={{ marginLeft: '8px' }}
                onClick={deleteStampWithDefects}
                disabled={isDeletingStamp}
                title="Smazat známku z databáze včetně všech jejích variant"
              >
                {isDeletingStamp ? 'Mažu…' : '🗑 Smazat známku'}
              </button>
            )}
            <label
              className="hide-stamp-toggle"
            >
              <input
                type="checkbox"
                checked={!Boolean(editStampData.isHidden)}
                onChange={(e) => handleVisibilityToggle(e.target.checked)}
                disabled={isSavingHidden}
              />
              {isSavingHidden ? 'ukládám…' : 'zveřejněno'}
            </label>
            <label
              className="hide-stamp-toggle verified-toggle"
            >
              <input
                type="checkbox"
                checked={Boolean(editStampData.overeno)}
                onChange={(e) => handleVerifiedToggle(e.target.checked)}
                disabled={isSavingVerified}
              />
              {isSavingVerified ? 'ukládám…' : 'ověřeno'}
            </label>
          </>
        )}
      </div>
      {isVerifiedStamp && (
        <span className="verified-stamp-wrap" role="status" aria-label="Známka je ověřená">
          <img
            src="/img/verified.svg"
            alt="Ověřeno"
            className="verified-stamp-mark"
            loading="lazy"
            decoding="async"
          />
        </span>
      )}
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
                list={hasSuggestions('emise') ? getSuggestionListId('emise') : undefined}
                autoComplete="off"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    recalculateImageAddressesFromCatalog({ rok: e.currentTarget.value }, { forceResetOnInvalid: true });
                  }
                }}
                className="edit-year-input"
                placeholder="Rok"
                list={hasSuggestions('rok') ? getSuggestionListId('rok') : undefined}
                autoComplete="off"
              />
              <span>)</span>
              <button
                onClick={() => saveTechnicalField('rok', editStampData.rok)}
                className="ktf-btn-check"
              >
                ✓
              </button>
            </div>
            <div className="label-top-input edit-title-subfield" style={{ marginTop: 8 }}>
              <label htmlFor="edit-emise-skupina">Skupina emise (jen pro filtr)</label>
              <div className="edit-field-row">
                <input
                  id="edit-emise-skupina"
                  type="text"
                  value={editStampData.emiseSkupina || ''}
                  onChange={(e) => setEditStampData({...editStampData, emiseSkupina: e.target.value})}
                  className="ktf-edit-input-tech ktf-edit-input-long"
                  placeholder="Např. Interkosmos"
                />
                <button
                  onClick={() => saveTechnicalField('emiseSkupina', (editStampData.emiseSkupina || '').trim())}
                  className="ktf-btn-check"
                >
                  ✓
                </button>
              </div>
            </div>
          </>
        ) : (
          <h1 id={detailHeadingId} className="detail-title-text">{renderEmissionTitleWithPragaSuffix(item.emise, item.rok)}</h1>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    recalculateImageAddressesFromCatalog({ katalogCislo: e.currentTarget.value }, { forceResetOnInvalid: true });
                  }
                }}
                className="ktf-edit-input-tech"
                placeholder="Katalogové číslo"
                list={hasSuggestions('katalogCislo') ? getSuggestionListId('katalogCislo') : undefined}
                autoComplete="off"
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
            {hasABPair && aStamp && bStamp ? (
              <>
                {currentIsA ? (
                  <strong>{renderCatalogDisplay(aStamp.katalogCislo, aStamp.idZnamky || "a-stamp")}</strong>
                ) : (
                  renderCatalogLinkWithPreview(aStamp, aStamp.katalogCislo)
                )}
                <span style={{ display: 'inline-block', margin: '0 12px', color: '#6b7280' }}>|</span>
                {currentIsA ? (
                  renderCatalogLinkWithPreview(bStamp, bStamp.katalogCislo)
                ) : (
                  <strong>{renderCatalogDisplay(bStamp.katalogCislo, bStamp.idZnamky || "b-stamp")}</strong>
                )}
              </>
            ) : (
              <>
                <strong>{renderCatalogDisplay(item.katalogCislo, item.idZnamky || "item-stamp")}</strong>
                {companionStamp && companionStamp.katalogCislo && (
                  <>
                    <span style={{ display: 'inline-block', margin: '0 12px', color: '#6b7280' }}>|</span>
                    {renderCatalogLinkWithPreview(companionStamp, companionStamp.katalogCislo)}
                  </>
                )}
              </>
            )}
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
                  list={hasSuggestions('obrazek') ? getSuggestionListId('obrazek') : undefined}
                  autoComplete="off"
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
                  list={hasSuggestions('obrazekStudie') ? getSuggestionListId('obrazekStudie') : undefined}
                  autoComplete="off"
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
            // V detailu preferujeme pouze obrázek studie; když chybí, použijeme no-image.
            let src = '/img/no-image.png';
            if (normalizedResolvedObrazekStudie) {
              src = normalizedResolvedObrazekStudie[0] !== '/' && !normalizedResolvedObrazekStudie.startsWith('http')
                ? '/' + normalizedResolvedObrazekStudie
                : normalizedResolvedObrazekStudie;
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
                src={
                  (normalizedResolvedObrazekStudie && normalizedResolvedObrazekStudie[0] !== '/'
                    ? '/' + normalizedResolvedObrazekStudie
                    : normalizedResolvedObrazekStudie)
                  || '/img/no-image.png'
                }
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
                  <span className="study-img-caption-text" style={{pointerEvents: 'none'}} dangerouslySetInnerHTML={{__html: resolvedPopisObrazkuStudie || ''}} />
                )}
              </figcaption>
            </figure>
          </div>
        </div>
        <section className="stamp-spec stamp-detail-spec-col" aria-labelledby={specHeadingId}>
          <h2 id={specHeadingId} className="sr-only">Technické údaje</h2>
          {isEditingAll && (
            <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
              <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
              <div className="ktf-tip-box">
                <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Pokud nechceš u zkratky tooltip, napiš před ni hvězdičku (např. *HT)</span>
              </div>
            </div>
          )}

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
                    list={hasSuggestions('datumVydani') ? getSuggestionListId('datumVydani') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('datumVydani', editStampData.datumVydani)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('datumVydani', resolvedDatumVydani)
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
                    list={hasSuggestions('navrh') ? getSuggestionListId('navrh') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('navrh', editStampData.navrh)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('navrh', isEditingAll ? editStampData.navrh : resolvedNavrh)
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
                    list={hasSuggestions('rytec') ? getSuggestionListId('rytec') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('rytec', editStampData.rytec)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('rytec', isEditingAll ? editStampData.rytec : resolvedRytec)
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
                    list={hasSuggestions('druhTisku') ? getSuggestionListId('druhTisku') : undefined}
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
                renderTechnicalValue('druhTisku', resolvedDruhTisku)
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
                    list={hasSuggestions('tiskovaForma') ? getSuggestionListId('tiskovaForma') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('tiskovaForma', editStampData.tiskovaForma)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('tiskovaForma', isEditingAll ? editStampData.tiskovaForma : resolvedTiskovaForma)
              )}
            </span>
          </div>
          <div className="stamp-spec-row">
            <span className="stamp-spec-label">Nominál</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div className="edit-field-row">
                  <input
                    type="text"
                    value={editStampData.nominal}
                    onChange={(e) => setEditStampData({...editStampData, nominal: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                      }
                    }}
                    className="ktf-edit-input-tech"
                    list={hasSuggestions('nominal') ? getSuggestionListId('nominal') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('nominal', editStampData.nominal)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('nominal', isEditingAll ? editStampData.nominal : resolvedNominal)
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
                    list={hasSuggestions('zoubkovani') ? getSuggestionListId('zoubkovani') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('zoubkovani', editStampData.zoubkovani)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('zoubkovani', isEditingAll ? editStampData.zoubkovani : resolvedZoubkovani)
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
                    list={hasSuggestions('papir') ? getSuggestionListId('papir') : undefined}
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
                renderTechnicalValue('papir', resolvedPapir)
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
                    list={hasSuggestions('rozmer') ? getSuggestionListId('rozmer') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('rozmer', editStampData.rozmer)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('rozmer', isEditingAll ? editStampData.rozmer : resolvedRozmer)
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
                    list={hasSuggestions('naklad') ? getSuggestionListId('naklad') : undefined}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => saveTechnicalField('naklad', editStampData.naklad)}
                    className="ktf-btn-check"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                renderTechnicalValue('naklad', isEditingAll ? editStampData.naklad : resolvedNaklad)
              )}
            </span>
          </div>
          <div className="stamp-spec-row spec-tf-row">
            <span className="stamp-spec-label">Schéma TF</span>
            <span className="stamp-spec-value">
              {isEditingAll ? (
                <div>
                  {item.schemaTF && (
                    <img
                      src={normalizeImageSrc(normalizedItemSchemaTF)}
                      alt="Schéma TF"
                      className="tf-img tf-img-clickable"
                      onClick={() => openSingleImageLightbox(normalizedItemSchemaTF, "Schéma TF")}
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = '/img/no-image.png';
                      }}
                    />
                  )}
                  <div className="edit-field-row">
                    <input
                      type="text"
                      value={editStampData.schemaTF}
                      onChange={(e) => setEditStampData({...editStampData, schemaTF: e.target.value})}
                      className="ktf-edit-input-tech"
                      list={hasSuggestions('schemaTF') ? getSuggestionListId('schemaTF') : undefined}
                      autoComplete="off"
                    />
                    <button
                      onClick={() => saveTechnicalField('schemaTF', editStampData.schemaTF || '')}
                      className="ktf-btn-check"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ) : (
                normalizedResolvedSchemaTF && (
                  <img
                    src={normalizeImageSrc(normalizedResolvedSchemaTF)}
                    alt="Schéma TF"
                    className="tf-img tf-img-clickable"
                    onClick={() => openSingleImageLightbox(normalizedResolvedSchemaTF, "Schéma TF")}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = '/img/no-image.png';
                    }}
                  />
                )
              )}
            </span>
          </div>
        </section>
      </div>
  {(isEditingAll || effectiveDefects.length > 0 || resolvedStudie || resolvedPopisStudie || resolvedObrazekAutor || hasPopisStudie2Content || hasLiteratureEntries) && (
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
                        list={hasSuggestions('Studie') ? getSuggestionListId('Studie') : undefined}
                        autoComplete="off"
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
                    <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
                      <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
                      <div className="ktf-tip-box">
                        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Klikací část uzavři mezi %text%</span>
                      </div>
                    </div>
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
                        list={hasSuggestions('studieUrl') ? getSuggestionListId('studieUrl') : undefined}
                        autoComplete="off"
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
                  <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
                    <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
                    <div className="ktf-tip-box ktf-tip-box-bulleted">
                      <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Podporované formátování: <code>&apos;text&apos;</code> → šedé zvýraznění ✧ <code>*</code> → zneviditelnění tooltipu</span>
                      <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Redakční blok: <code>[pozn]Tvůj doplněný text[/pozn]</code></span>
                      <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">HTML: <code>&lt;b&gt;&lt;/b&gt;</code> → tučně ✧ <code>&lt;em&gt;&lt;/em&gt;</code> → kurzíva ✧ <code>&lt;u&gt;&lt;/u&gt;</code> → podtržení ✧ <code>&lt;br /&gt;</code> → nový řádek ✧ <code>&lt;sup&gt;&lt;/sup&gt;</code> → horní index ✧ <code>&lt;sub&gt;&lt;/sub&gt;</code> → dolní index</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {studyReferenceBlock}
              {/* --- POPIS STUDIE --- */}
              <div className="study-note-section">
                {resolvedPopisStudie ? (
                  <div className="study-note" dangerouslySetInnerHTML={{__html: formatPopisWithAll(resolvedPopisStudie)}} />
                ) : (
                  <span className="study-note-placeholder">–</span>
                )}
              </div>
            </>
          )}
          <div className="study-clear" />
          <VariantList
            ref={variantListRef}
            effectiveDefects={effectiveDefects}
            isEditingAll={isEditingAll}
            isAdmin={isAdmin}
            isViewingBVariant={isViewingBVariant}
            item={item}
            aStampDefects={isViewingBVariant && aStamp ? localDefects.filter(d => d.idZnamky === aStamp.idZnamky) : []}
            variantsHeadingBaseId={variantsHeadingBaseId}
            saveDefectEdit={saveDefectEdit}
            deleteDefect={deleteDefect}
            onSaveInheritedMam={saveInheritedMamForB}
            onExcludeChange={(newExcluded) => {
              setItem(prev => ({ ...prev, variantyVylouceneZA: newExcluded }));
              saveTechnicalField('variantyVylouceneZA', newExcluded);
            }}
          />
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
                <div className="label-top-input ktf-edit-row-full" style={{ marginTop: 18 }}>
                  <label htmlFor="edit-literatura">Literatura</label>
                  <div className="edit-field-row ktf-edit-row-full">
                    <textarea
                      id="edit-literatura"
                      value={typeof editStampData.literatura === 'string' ? editStampData.literatura : (item.literatura || '')}
                      onChange={e => setEditStampData({ ...editStampData, literatura: e.target.value })}
                      className="ktf-edit-textarea-long ktf-edit-textarea-study"
                      placeholder="[1] Autor: Název ...\n[2] Autor: Název ... https://..."
                      rows={5}
                    />
                    <button
                      onClick={() => saveTechnicalField('literatura', editStampData.literatura || '')}
                      className="ktf-btn-check"
                    >✓</button>
                  </div>
                  <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
                    <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
                    <div className="ktf-tip-box ktf-tip-box-bulleted">
                      <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Každou položku dej na nový řádek a začni <code>1)</code> (možno i např. <code>[1]</code> či <code>1.</code>) a klikací část vymezuj mezi <code>%...%</code></span>
                      <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Příklad:<br />
                        <code>[1] Pavel Hankovec: Dvě varianty aršíku INTERKOSMOS, Filatelie 1980/14 str. 440</code><br />
                        <code>[2] Stanislav Pilař: Ještě k aršíku INTERKOSMOS 80, <strong>%</strong>Filatelie 1984/12 str. 361<strong>%</strong> https://example.com</code>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {hasPopisStudie2Content && (
                  <div
                    className="study-note"
                    dangerouslySetInnerHTML={{ __html: formatPopisWithAll(popisStudie2Display) }}
                  />
                )}
                {(hasAuthors || hasLiteratureEntries) && (
                  <>
                    <div className="study-clear" />
                    {hasAuthors && authorsRaw && (
                      <div className="study-note-authors-wrapper">
                        <div className="study-note-authors-shell">
                          <span className="study-note-authors-icon" aria-hidden="true" />
                          <ImageSources value={authorsRaw} />
                        </div>
                      </div>
                    )}
                    {hasLiteratureEntries && (
                      <div className="study-note-authors-wrapper">
                        <div className="study-note-authors-shell">
                          <span className="study-note-literature-icon" aria-hidden="true" />
                          <div className="study-note study-note-authors study-note-literature">
                            <div className="study-note-authors-heading">
                              <span>Literatura</span>
                              <span className="study-note-authors-count">({literatureEntries.length})</span>
                            </div>
                            <div className="study-note-literature-list">
                              {literatureEntries.map((entry, idx) => {
                                const shouldShowPrefix = literatureEntries.length > 1;
                                const textNode = renderAbbrevContent(
                                  replaceAbbreviations(entry.text || entry.line),
                                  `literature-${idx}`
                                );
                                const beforeNode = renderAbbrevContent(
                                  replaceAbbreviations(entry.beforeText || ""),
                                  `literature-before-${idx}`
                                );
                                const markedNode = renderAbbrevContent(
                                  replaceAbbreviations(entry.markedLinkText || ""),
                                  `literature-marked-${idx}`
                                );
                                const afterNode = renderAbbrevContent(
                                  replaceAbbreviations(entry.afterText || ""),
                                  `literature-after-${idx}`
                                );
                                return (
                                  <div key={`${entry.prefix || entry.number}-${idx}`} className="study-note-literature-item">
                                    {shouldShowPrefix ? (
                                      <>
                                        <span className="study-note-authors-highlight">{entry.prefix}</span>{" "}
                                      </>
                                    ) : null}
                                    {entry.url && entry.hasMarkedLink ? (
                                      <>
                                        {beforeNode ? <span>{beforeNode}</span> : null}
                                        <a
                                          href={entry.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="study-note-reference-link"
                                        >
                                          {markedNode}
                                        </a>
                                        {afterNode ? <span>{afterNode}</span> : null}
                                      </>
                                    ) : entry.url ? (
                                      <a
                                        href={entry.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="study-note-reference-link"
                                      >
                                        {textNode}
                                      </a>
                                    ) : (
                                      <span>{textNode}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </section>
      )}
      {isEditingAll && suggestionEntries.map(([field, values]) => (
        <datalist key={field} id={getSuggestionListId(field)}>
          {values.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      ))}
      {showScrollTopButton && (
        <button
          type="button"
          className="scroll-top-button"
          onClick={scrollToTop}
          aria-label="Zpět na začátek stránky"
          title="Zpět nahoru"
        >
          ↑
        </button>
      )}
      {deleteConfirmVisible && (() => {
        const requiredDigits = String(item?.katalogCislo || "").replace(/\D+/g, "");
        const digitsMatch = String(deleteConfirmDigitInput).trim() === requiredDigits;
        return (
          <div className="ktf-modal-bg" onClick={() => setDeleteConfirmVisible(false)}>
            <div className="ktf-modal" onClick={e => e.stopPropagation()} style={{maxWidth: 420}}>
              <p style={{margin: 0, fontWeight: 600, fontSize: '1.05em'}}>Smazat tuto známku?</p>
              <p style={{margin: 0}}>Budou smazány i všechny její varianty a deskové vady.</p>
              <p style={{margin: 0}}>Mažete: <strong>{item.katalogCislo || item.idZnamky}</strong></p>
              <p style={{margin: 0, color: '#555'}}>Pro potvrzení zadejte číselnou část katalogového čísla:</p>
              <input
                type="text"
                value={deleteConfirmDigitInput}
                onChange={e => setDeleteConfirmDigitInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && digitsMatch) confirmDeleteStamp(); }}
                autoFocus
                style={{width: '100%', padding: '8px 10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box'}}
              />
              <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4}}>
                <button onClick={() => setDeleteConfirmVisible(false)} className="back-btn" style={{marginBottom: 0}}>Zrušit</button>
                <button onClick={confirmDeleteStamp} className="admin-edit-btn danger" disabled={!digitsMatch}>Smazat</button>
              </div>
            </div>
          </div>
        );
      })()}
    </article>
  );
}
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
import { StampImageEditRow, StampCatalogNumberSection, StampTitleSection, StampTechnicalSpecSection, StampStudyTopSection, StampStudyFooterSection } from "./components/StampDetailEdit.jsx";

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
                className="ktf-btn-confirm detail-inline-offset"
                onClick={saveAllChanges}
                disabled={isSavingAllChanges}
              >
                {isSavingAllChanges ? 'Ukládám vše…' : '✔ Ulož vše'}
              </button>
            )}
            {/* Tlačítko pro otevření modalu v admin panelu */}
            <button
              className="ktf-btn-confirm detail-inline-offset"
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
                className="admin-edit-btn danger detail-inline-offset"
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
      <StampTitleSection
        isEditingAll={isEditingAll}
        item={item}
        detailHeadingId={detailHeadingId}
        editStampData={editStampData}
        setEditStampData={setEditStampData}
        recalculateImageAddressesFromCatalog={recalculateImageAddressesFromCatalog}
        hasSuggestions={hasSuggestions}
        getSuggestionListId={getSuggestionListId}
        saveTechnicalField={saveTechnicalField}
        replaceAbbreviations={replaceAbbreviations}
        renderEmissionTitleWithPragaSuffix={renderEmissionTitleWithPragaSuffix}
      />
      <StampCatalogNumberSection
        isEditingAll={isEditingAll}
        editStampData={editStampData}
        setEditStampData={setEditStampData}
        recalculateImageAddressesFromCatalog={recalculateImageAddressesFromCatalog}
        hasSuggestions={hasSuggestions}
        getSuggestionListId={getSuggestionListId}
        saveTechnicalField={saveTechnicalField}
        hasABPair={hasABPair}
        aStamp={aStamp}
        bStamp={bStamp}
        currentIsA={currentIsA}
        renderCatalogDisplay={renderCatalogDisplay}
        renderCatalogLinkWithPreview={renderCatalogLinkWithPreview}
        item={item}
        companionStamp={companionStamp}
      />
      
      {/* Editační formulář a vykreslení základních údajů známky */}

      {/* Editační pole pro hlavní obrázek a obrázek studie vedle sebe, zarovnáno jako u studie */}
      <StampImageEditRow
        isEditingAll={isEditingAll}
        editStampData={editStampData}
        setEditStampData={setEditStampData}
        hasSuggestions={hasSuggestions}
        getSuggestionListId={getSuggestionListId}
        saveTechnicalField={saveTechnicalField}
      />
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
            <figure className="study-image-figure">
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
                      className="ktf-edit-input-long study-img-caption-input study-img-caption-input-resizable"
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
                  <span className="study-img-caption-text study-img-caption-text-passive" dangerouslySetInnerHTML={{__html: resolvedPopisObrazkuStudie || ''}} />
                )}
              </figcaption>
            </figure>
          </div>
        </div>
        <StampTechnicalSpecSection
          isEditingAll={isEditingAll}
          editStampData={editStampData}
          setEditStampData={setEditStampData}
          hasSuggestions={hasSuggestions}
          getSuggestionListId={getSuggestionListId}
          saveTechnicalField={saveTechnicalField}
          renderTechnicalValue={renderTechnicalValue}
          item={item}
          resolvedDatumVydani={resolvedDatumVydani}
          resolvedNavrh={resolvedNavrh}
          resolvedRytec={resolvedRytec}
          resolvedDruhTisku={resolvedDruhTisku}
          resolvedTiskovaForma={resolvedTiskovaForma}
          resolvedNominal={resolvedNominal}
          resolvedZoubkovani={resolvedZoubkovani}
          resolvedPapir={resolvedPapir}
          resolvedRozmer={resolvedRozmer}
          resolvedNaklad={resolvedNaklad}
          normalizeImageSrc={normalizeImageSrc}
          normalizedItemSchemaTF={normalizedItemSchemaTF}
          normalizedResolvedSchemaTF={normalizedResolvedSchemaTF}
          openSingleImageLightbox={openSingleImageLightbox}
          specHeadingId={specHeadingId}
        />
      </div>
  {(isEditingAll || effectiveDefects.length > 0 || resolvedStudie || resolvedPopisStudie || resolvedObrazekAutor || hasPopisStudie2Content || hasLiteratureEntries) && (
        <section aria-labelledby={studyHeadingId}>
          <h2 id={studyHeadingId} className="sr-only">Studie a varianty</h2>
          <StampStudyTopSection
            isEditingAll={isEditingAll}
            editStampData={editStampData}
            setEditStampData={setEditStampData}
            hasSuggestions={hasSuggestions}
            getSuggestionListId={getSuggestionListId}
            saveStudyField={saveStudyField}
            saveTechnicalField={saveTechnicalField}
            studyReferenceBlock={studyReferenceBlock}
            resolvedPopisStudie={resolvedPopisStudie}
            item={item}
          />
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
          <StampStudyFooterSection
            isEditingAll={isEditingAll}
            editStampData={editStampData}
            setEditStampData={setEditStampData}
            item={item}
            saveTechnicalField={saveTechnicalField}
            authorSuggestionListId={authorSuggestionListId}
            authorSuggestionValues={authorSuggestionValues}
            popisStudie2Display={popisStudie2Display}
            hasPopisStudie2Content={hasPopisStudie2Content}
            hasAuthors={hasAuthors}
            authorsRaw={authorsRaw}
            hasLiteratureEntries={hasLiteratureEntries}
            literatureEntries={literatureEntries}
            secondStudyBlockClass={secondStudyBlockClass}
            additionalStudyHeadingId={additionalStudyHeadingId}
          />
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
            <div className="ktf-modal detail-delete-modal" onClick={e => e.stopPropagation()}>
              <p className="detail-delete-title">Smazat tuto známku?</p>
              <p className="detail-delete-text">Budou smazány i všechny její varianty a deskové vady.</p>
              <p className="detail-delete-text">Mažete: <strong>{item.katalogCislo || item.idZnamky}</strong></p>
              <p className="detail-delete-hint">Pro potvrzení zadejte číselnou část katalogového čísla:</p>
              <input
                type="text"
                value={deleteConfirmDigitInput}
                onChange={e => setDeleteConfirmDigitInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && digitsMatch) confirmDeleteStamp(); }}
                autoFocus
                className="detail-delete-input"
              />
              <div className="detail-delete-actions">
                <button onClick={() => setDeleteConfirmVisible(false)} className="back-btn detail-delete-cancel">Zrušit</button>
                <button onClick={confirmDeleteStamp} className="admin-edit-btn danger" disabled={!digitsMatch}>Smazat</button>
              </div>
            </div>
          </div>
        );
      })()}
    </article>
  );
}
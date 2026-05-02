import React, { useState, useEffect, useRef } from "react";
export default function AdminPanel({
  isAdmin,
  onLogout,
  onLogin,
  showAdminLogin,
  setShowAdminLogin,
  handleAdminLogin,
  showAddModal,
  setShowAddModal,
  onAddStamp,
  fieldSuggestions = {},
}) {
  const DEFAULT_DEFECT_DESCRIPTION = "";
  const QUICK_LOCATION_CHIPS = ["ZP1", "ZP2", "ZP3", "ZP4"];
  const LOCATION_PREFIX_OPTIONS = [
    { symbol: "▲", text: "nad " },
    { symbol: "▼", text: "pod " },
    { symbol: "◄", text: "vlevo od " },
    { symbol: "►", text: "vpravo od " },
  ];
  const VARIANT_LETTER_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const [newStampData, setNewStampData] = useState({
    emise: '',
    rok: '',
    katalogCislo: '',
    obrazek: '',
    obrazekStudie: '',
    datumVydani: '',
    navrh: '',
    rytec: '',
    druhTisku: '',
    tiskovaForma: '',
    nominal: '',
    zoubkovani: '',
    papir: '',
    rozmer: '',
    naklad: '',
    schemaTF: '',
    Studie: '',
    studieUrl: '',
    popisObrazkuStudie: '',
    popisStudie: '',
    popisStudie2: '',
    literatura: '',
    obrazekAutor: ''
  });

  // Modal pro přidání varianty
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [newVariantData, setNewVariantData] = useState({
    idZnamky: '',
    variantaVady: '',
    umisteniVady: '',
    poradiVady: '',
    obrazekVady: '',
    popisVady: DEFAULT_DEFECT_DESCRIPTION,
    mam: false
  });
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);
  const [variantSuggestions, setVariantSuggestions] = useState({
    variantaVady: [],
    umisteniVady: []
  });
  const getLocationPrefix = (value) => {
    const match = String(value ?? "").match(/^\s*(nad|pod|vlevo od|vpravo od)(?:\s+|$)/i);
    return match ? `${match[1].toLowerCase()} ` : "";
  };
  const applyLocationPrefix = (prefixText) => {
    setNewVariantData((prev) => {
      const current = String(prev.umisteniVady ?? "").trim();
      const currentPrefix = getLocationPrefix(prev.umisteniVady);
      const withoutPrefix = current.replace(/^\s*(nad|pod|vlevo od|vpravo od)(?:\s+|$)/i, "").trim();
      if (currentPrefix === prefixText) {
        return {
          ...prev,
          umisteniVady: withoutPrefix,
        };
      }
      const nextValue = withoutPrefix ? `${prefixText}${withoutPrefix}` : prefixText;
      return {
        ...prev,
        umisteniVady: nextValue,
      };
    });
  };
  const applyLocationChip = (chip) => {
    setNewVariantData((prev) => {
      const prefix = getLocationPrefix(prev.umisteniVady);
      const locationWithoutPrefix = String(prev.umisteniVady ?? "")
        .trim()
        .replace(/^\s*(nad|pod|vlevo od|vpravo od)(?:\s+|$)/i, "")
        .trim();
      const isSameChip = locationWithoutPrefix.toUpperCase() === chip;
      return {
        ...prev,
        umisteniVady: isSameChip ? prefix : `${prefix}${chip}`,
      };
    });
  };
  const updateVariantDataWithImageSync = (updates = {}, options = {}) => {
    const { forceImageSync = false } = options;
    setNewVariantData((prev) => {
      const next = {
        ...prev,
        ...updates,
      };
      const shouldSyncImage = forceImageSync || isVariantImageAutoManagedRef.current;
      if (shouldSyncImage) {
        const currentBase = String(variantImageBaseRef.current || "").trim();
        const variantForStrip = String(prev.variantaVady ?? "").trim().replace(/\s+/g, "");
        const orderForStrip = String(prev.poradiVady ?? "").trim();
        const previousImage = String(prev.obrazekVady ?? "").trim();
        let fallbackBase = previousImage;
        if (variantForStrip && orderForStrip && fallbackBase.endsWith(`-${variantForStrip}-${orderForStrip}`)) {
          fallbackBase = fallbackBase.slice(0, -(`-${variantForStrip}-${orderForStrip}`).length);
        } else if (variantForStrip && fallbackBase.endsWith(`-${variantForStrip}`)) {
          fallbackBase = fallbackBase.slice(0, -(`-${variantForStrip}`).length);
        }
        const resolvedBase = currentBase || fallbackBase;
        if (resolvedBase && !currentBase) {
          variantImageBaseRef.current = resolvedBase;
        }
        const composedPath = buildVariantImagePath(
          resolvedBase,
          next.variantaVady,
          next.poradiVady
        );
        if (composedPath) {
          next.obrazekVady = composedPath;
        }
      }
      return next;
    });
  };
  const stepVariantLetter = (direction) => {
    const rawValue = String(newVariantData.variantaVady ?? "");
    const match = rawValue.match(/^([A-Ha-h])(.*)$/);
    const fallbackLetter = direction >= 0 ? "A" : "";

    if (!match) {
      updateVariantDataWithImageSync({ variantaVady: fallbackLetter }, { forceImageSync: true });
      return;
    }

    const currentLetter = match[1].toUpperCase();
    const suffix = match[2] || "";
    const currentIndex = VARIANT_LETTER_OPTIONS.indexOf(currentLetter);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = Math.min(
      VARIANT_LETTER_OPTIONS.length - 1,
      Math.max(0, safeIndex + direction)
    );
    const nextLetter = direction < 0 && safeIndex === 0
      ? ""
      : `${VARIANT_LETTER_OPTIONS[nextIndex]}${suffix}`;

    updateVariantDataWithImageSync(
      { variantaVady: nextLetter },
      { forceImageSync: true }
    );
  };
  const stepVariantOrder = (direction) => {
    const raw = String(newVariantData.poradiVady ?? "").trim();
    const parsed = Number.parseInt(raw, 10);
    const base = Number.isFinite(parsed) ? parsed : 0;
    let nextOrder = "";
    if (direction > 0) {
      nextOrder = String(Math.min(99, base + 1));
    } else if (base > 1) {
      nextOrder = String(base - 1);
    }
    updateVariantDataWithImageSync({ poradiVady: nextOrder }, { forceImageSync: true });
  };
  const getSuggestionValues = (field) => {
    const values = fieldSuggestions?.[field];
    return Array.isArray(values) ? values : [];
  };
  const hasSuggestions = (field) => getSuggestionValues(field).length > 0;
  const getSuggestionListId = (field) => `admin-new-${field}-options`;
  const suggestionEntries = Object.entries(fieldSuggestions || {}).filter(
    ([, values]) => Array.isArray(values) && values.length > 0
  );
  const lastAutoImageBaseRef = useRef("");
  const variantImageBaseRef = useRef("");
  const isVariantImageAutoManagedRef = useRef(true);
  const autoManagedImageFieldsRef = useRef({
    obrazek: true,
    obrazekStudie: true,
    schemaTF: true,
  });
  const buildVariantImagePath = (basePath, variantValue, orderValue) => {
    const base = String(basePath ?? "").trim();
    const variant = String(variantValue ?? "").trim().replace(/\s+/g, "");
    const order = String(orderValue ?? "").trim();

    if (!base) return "";
    if (!variant) return base;
    if (!order) return `${base}-${variant}`;
    return `${base}-${variant}-${order}`;
  };
  const buildImageAddressBase = (yearValue, catalogValue, options = {}) => {
    const { allowThreeDigit = false } = options;
    const year = String(yearValue ?? "").trim();
    const catalog = String(catalogValue ?? "").replace(/\s+/g, "").trim();
    const digitMatch = catalog.match(/\d+/);
    const digitLength = digitMatch ? digitMatch[0].length : 0;
    const hasCatalogCore = allowThreeDigit ? digitLength >= 3 : digitLength >= 4;
    if (!/^\d{4}$/.test(year) || !catalog || !hasCatalogCore) return "";
    return `${year}/${catalog}`;
  };

  const applyAutoImagePrefill = (allowThreeDigit = false, overrides = {}, options = {}) => {
    const { forceResetOnInvalid = false } = options;
    if (!showAddModal) return;

    setNewStampData((prev) => {
      const draft = {
        ...prev,
        ...overrides,
      };
      const base = buildImageAddressBase(draft.rok, draft.katalogCislo, { allowThreeDigit });
      const previousAutoBase = lastAutoImageBaseRef.current;
      const currentMain = String(draft.obrazek || "").trim();
      const currentStudy = String(draft.obrazekStudie || "").trim();
      const currentTf = String(draft.schemaTF || "").trim();
      if (!base) {
        if (forceResetOnInvalid) {
          lastAutoImageBaseRef.current = "";
          autoManagedImageFieldsRef.current = {
            obrazek: true,
            obrazekStudie: true,
            schemaTF: true,
          };
          return {
            ...draft,
            obrazek: "",
            obrazekStudie: "",
            schemaTF: "",
          };
        }
        if (previousAutoBase) {
          let changedOnClear = false;
          const cleared = { ...draft };
          if (autoManagedImageFieldsRef.current.obrazek) {
            cleared.obrazek = "";
            changedOnClear = true;
          }
          if (autoManagedImageFieldsRef.current.obrazekStudie) {
            cleared.obrazekStudie = "";
            changedOnClear = true;
          }
          if (autoManagedImageFieldsRef.current.schemaTF) {
            cleared.schemaTF = "";
            changedOnClear = true;
          }
          lastAutoImageBaseRef.current = "";
          return changedOnClear ? cleared : draft;
        }
        lastAutoImageBaseRef.current = "";
        return draft;
      }

      let changed = false;
      const next = { ...draft };
      const canAutoUpdateMain = autoManagedImageFieldsRef.current.obrazek;
      const canAutoUpdateStudy = autoManagedImageFieldsRef.current.obrazekStudie;
      const canAutoUpdateTf = autoManagedImageFieldsRef.current.schemaTF;

      if (canAutoUpdateMain && currentMain !== base) {
        next.obrazek = base;
        autoManagedImageFieldsRef.current.obrazek = true;
        changed = true;
      }
      if (canAutoUpdateStudy && currentStudy !== `${base}s`) {
        next.obrazekStudie = `${base}s`;
        autoManagedImageFieldsRef.current.obrazekStudie = true;
        changed = true;
      }
      if (canAutoUpdateTf && currentTf !== `${base}-TF`) {
        next.schemaTF = `${base}-TF`;
        autoManagedImageFieldsRef.current.schemaTF = true;
        changed = true;
      }

      lastAutoImageBaseRef.current = base;

      return changed ? next : draft;
    });
  };

  useEffect(() => {
    async function loadVariantSuggestions() {
      try {
        const API_BASE =
          import.meta.env.VITE_API_BASE ||
          (window.location.hostname.endsWith("app.github.dev")
            ? `https://${window.location.hostname}`
            : window.location.hostname.endsWith("vercel.app")
            ? ""
            : "http://localhost:3001");
        const response = await fetch(`${API_BASE}/api/defects`);
        if (!response.ok) return;
        const defects = await response.json();
        const collect = (field) => Array.from(
          new Set(
            (Array.isArray(defects) ? defects : [])
              .map((item) => String(item?.[field] || "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "cs", { sensitivity: "base", numeric: true }));
        setVariantSuggestions({
          variantaVady: collect("variantaVady"),
          umisteniVady: collect("umisteniVady")
        });
      } catch (err) {
        // Nápovědy jsou nepovinné, při chybě jen zůstanou prázdné.
      }
    }

    loadVariantSuggestions();
  }, []);

  useEffect(() => {
    if (!showAddModal) {
      return undefined;
    }
    autoManagedImageFieldsRef.current = {
      obrazek: true,
      obrazekStudie: true,
      schemaTF: true,
    };
    lastAutoImageBaseRef.current = "";
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setShowAddModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showAddModal, setShowAddModal]);

  useEffect(() => {
    if (!showAddModal) return;
    // Pri psani cekame na 4 cislice, aby se nepredvyplnovalo prilis brzy (napr. PL287).
    applyAutoImagePrefill(false);
  }, [showAddModal, newStampData.rok, newStampData.katalogCislo]);

  // Otevření modalu na základě eventu z DetailPage
  useEffect(() => {
  // POZOR: Předvyplňování pole obrazekVady probíhá pouze na frontendu při otevření modalu.
  // Backend nikdy nesmí tuto hodnotu přepisovat – uloží se přesně to, co uživatel zadá.
  // Pokud uživatel pole změní, uloží se jeho hodnota. Pokud ponechá předvyplněné, uloží se předvyplněná.
  // Pokud by bylo potřeba změnit logiku předvyplnění, upravujte pouze zde na frontendu.
    async function handleOpenModal(e) {
      const idZnamky = e.detail?.idZnamky || '';
      let obrazekVady = '';
      try {
        const API_BASE =
          import.meta.env.VITE_API_BASE ||
          (window.location.hostname.endsWith("app.github.dev")
            ? `https://${window.location.hostname}`
            : window.location.hostname.endsWith("vercel.app")
            ? ""
            : "http://localhost:3001");
        const response = await fetch(`${API_BASE}/api/stamps/${idZnamky}`);
        if (response.ok) {
          const stamp = await response.json();
          if (stamp && stamp.rok && stamp.katalogCislo) {
            const katalogCisloNoSpace = String(stamp.katalogCislo).replace(/\s+/g, '');
            obrazekVady = `${stamp.rok}/${katalogCisloNoSpace}`;
          }
        }
      } catch (err) {}
      variantImageBaseRef.current = obrazekVady;
      isVariantImageAutoManagedRef.current = true;
      setNewVariantData({
        idZnamky,
        variantaVady: '',
        umisteniVady: '',
        poradiVady: '',
        obrazekVady,
        popisVady: DEFAULT_DEFECT_DESCRIPTION,
        mam: false
      });
      setShowAddVariantModal(true);
    }
    window.addEventListener('openAddVariantModal', handleOpenModal);
    // Globální funkce pro přímé volání
    window.setShowAddVariantModal = async (idZnamky) => {
      let obrazekVady = '';
      try {
        const API_BASE =
          import.meta.env.VITE_API_BASE ||
          (window.location.hostname.endsWith("app.github.dev")
            ? `https://${window.location.hostname}`
            : window.location.hostname.endsWith("vercel.app")
            ? ""
            : "http://localhost:3001");
        const response = await fetch(`${API_BASE}/api/stamps/${idZnamky}`);
        if (response.ok) {
          const stamp = await response.json();
          if (stamp && stamp.rok && stamp.katalogCislo) {
            const katalogCisloNoSpace = String(stamp.katalogCislo).replace(/\s+/g, '');
            obrazekVady = `${stamp.rok}/${katalogCisloNoSpace}`;
          }
        }
      } catch (err) {}
      variantImageBaseRef.current = obrazekVady;
      isVariantImageAutoManagedRef.current = true;
      setNewVariantData({
        idZnamky,
        variantaVady: '',
        umisteniVady: '',
        poradiVady: '',
        obrazekVady,
        popisVady: DEFAULT_DEFECT_DESCRIPTION,
        mam: false
      });
      setShowAddVariantModal(true);
    };
    return () => {
      window.removeEventListener('openAddVariantModal', handleOpenModal);
      delete window.setShowAddVariantModal;
    };
  }, []);

  useEffect(() => {
    if (!showAddVariantModal) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setShowAddVariantModal(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showAddVariantModal]);

  useEffect(() => {
    if (!showAddVariantModal) return;
    if (!isVariantImageAutoManagedRef.current) return;

    setNewVariantData((prev) => {
      const nextImagePath = buildVariantImagePath(
        variantImageBaseRef.current,
        prev.variantaVady,
        prev.poradiVady
      );
      if (!nextImagePath || nextImagePath === prev.obrazekVady) {
        return prev;
      }
      return {
        ...prev,
        obrazekVady: nextImagePath,
      };
    });
  }, [showAddVariantModal, newVariantData.variantaVady, newVariantData.poradiVady]);

  // Funkce pro přidání nové varianty
  const handleAddVariant = async () => {
    setIsSubmittingVariant(true);
    try {
      const normalizedOrderRaw = String(newVariantData.poradiVady ?? '').trim();
      const normalizedOrder = normalizedOrderRaw === '' ? '' : Number(normalizedOrderRaw);
      const payload = {
        ...newVariantData,
        poradiVady: Number.isFinite(normalizedOrder) ? normalizedOrder : ''
      };
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        (window.location.hostname.endsWith("app.github.dev")
          ? `https://${window.location.hostname}`
          : window.location.hostname.endsWith("vercel.app")
          ? ""
          : "http://localhost:3001");
      const response = await fetch(`${API_BASE}/api/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setShowAddVariantModal(false);
        setNewVariantData({
          idZnamky: '',
          variantaVady: '',
          umisteniVady: '',
          poradiVady: '',
          obrazekVady: '',
          popisVady: DEFAULT_DEFECT_DESCRIPTION,
          mam: false
        });
        variantImageBaseRef.current = "";
        isVariantImageAutoManagedRef.current = true;
        window.location.reload();
      } else {
        alert('Chyba při přidávání varianty');
      }
    } catch (err) {
      alert('Chyba při komunikaci se serverem');
    }
    setIsSubmittingVariant(false);
  };

    return (
      <>
      {/* Admin Login Popup */}
      {showAdminLogin && (
        <div className="admin-login-overlay">
          <div className="admin-login-modal">
            <h3 className="admin-login-title">Admin přístup</h3>
            <div className="admin-login-input-row">
            <input
              type="password"
              placeholder="Heslo"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAdminLogin(e.target.value);
                }
              }}
              className="admin-login-input"
            />
            <button
              onClick={(e) => {
                const popup = e.target.closest('.admin-login-overlay');
                const input = popup.querySelector('input[type="password"]');
                handleAdminLogin(input?.value || '');
              }}
              className="admin-login-confirm"
            >
              OK
            </button>
            </div>
            <button
              onClick={() => setShowAdminLogin(false)}
              className="admin-login-cancel"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
  {/* MODAL pro přidání nové známky */}
  {showAddModal && (
        <div className="ktf-modal-bg">
          <div className="ktf-modal">
            <h2>Přidat novou známku</h2>
            <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
              <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
              <div className="ktf-tip-box">
                <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Pokud nechceš u zkratky tooltip, napiš před ni hvězdičku (např. *HT)</span>
              </div>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (onAddStamp) {
                  onAddStamp(newStampData);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            >
              <div className="label-top-input">
                <label>Rok vydání</label>
                <input
                  type="number"
                  value={newStampData.rok}
                  onChange={e => setNewStampData({ ...newStampData, rok: e.target.value })}
                  onBlur={(e) => applyAutoImagePrefill(true, { rok: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyAutoImagePrefill(true, { rok: e.currentTarget.value }, { forceResetOnInvalid: true });
                    }
                  }}
                  list={hasSuggestions('rok') ? getSuggestionListId('rok') : undefined}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="label-top-input">
                <label>Emise</label>
                <input
                  type="text"
                  value={newStampData.emise}
                  onChange={e => setNewStampData({ ...newStampData, emise: e.target.value })}
                  list={hasSuggestions('emise') ? getSuggestionListId('emise') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Katalogové číslo <span className="admin-label-hint">(pro přepočet adres použij Enter)</span></label>
                <input
                  type="text"
                  value={newStampData.katalogCislo}
                  onChange={e => setNewStampData({ ...newStampData, katalogCislo: e.target.value })}
                  onBlur={(e) => applyAutoImagePrefill(true, { katalogCislo: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyAutoImagePrefill(true, { katalogCislo: e.currentTarget.value }, { forceResetOnInvalid: true });
                    }
                  }}
                  list={hasSuggestions('katalogCislo') ? getSuggestionListId('katalogCislo') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Obrázek</label>
                <input
                  type="text"
                  value={newStampData.obrazek}
                  onChange={e => {
                    autoManagedImageFieldsRef.current.obrazek = false;
                    setNewStampData({ ...newStampData, obrazek: e.target.value });
                  }}
                  list={hasSuggestions('obrazek') ? getSuggestionListId('obrazek') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Obrázek studie</label>
                <input
                  type="text"
                  value={newStampData.obrazekStudie}
                  onChange={e => {
                    autoManagedImageFieldsRef.current.obrazekStudie = false;
                    setNewStampData({ ...newStampData, obrazekStudie: e.target.value });
                  }}
                  list={hasSuggestions('obrazekStudie') ? getSuggestionListId('obrazekStudie') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Popisek pod obrázkem studie</label>
                <input
                  type="text"
                  value={newStampData.popisObrazkuStudie}
                  onChange={e => setNewStampData({ ...newStampData, popisObrazkuStudie: e.target.value })}
                  placeholder="Text zobrazený pod obrázkem studie"
                  list={hasSuggestions('popisObrazkuStudie') ? getSuggestionListId('popisObrazkuStudie') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Datum vydání</label>
                <input
                  type="text"
                  value={newStampData.datumVydani}
                  onChange={e => setNewStampData({ ...newStampData, datumVydani: e.target.value })}
                  list={hasSuggestions('datumVydani') ? getSuggestionListId('datumVydani') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Návrh</label>
                <input
                  type="text"
                  value={newStampData.navrh}
                  onChange={e => setNewStampData({ ...newStampData, navrh: e.target.value })}
                  list={hasSuggestions('navrh') ? getSuggestionListId('navrh') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Rytec</label>
                <input
                  type="text"
                  value={newStampData.rytec}
                  onChange={e => setNewStampData({ ...newStampData, rytec: e.target.value })}
                  list={hasSuggestions('rytec') ? getSuggestionListId('rytec') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Druh tisku</label>
                <input
                  type="text"
                  list={hasSuggestions('druhTisku') ? getSuggestionListId('druhTisku') : undefined}
                  value={newStampData.druhTisku}
                  onChange={e => setNewStampData({ ...newStampData, druhTisku: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Tisková forma</label>
                <input
                  type="text"
                  value={newStampData.tiskovaForma}
                  onChange={e => setNewStampData({ ...newStampData, tiskovaForma: e.target.value })}
                  list={hasSuggestions('tiskovaForma') ? getSuggestionListId('tiskovaForma') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Nominál</label>
                <input
                  type="text"
                  value={newStampData.nominal}
                  onChange={e => setNewStampData({ ...newStampData, nominal: e.target.value })}
                  list={hasSuggestions('nominal') ? getSuggestionListId('nominal') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Zoubkování</label>
                <input
                  type="text"
                  value={newStampData.zoubkovani}
                  onChange={e => setNewStampData({ ...newStampData, zoubkovani: e.target.value })}
                  list={hasSuggestions('zoubkovani') ? getSuggestionListId('zoubkovani') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Papír</label>
                <input
                  type="text"
                  list={hasSuggestions('papir') ? getSuggestionListId('papir') : undefined}
                  value={newStampData.papir}
                  onChange={e => setNewStampData({ ...newStampData, papir: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Rozměr</label>
                <input
                  type="text"
                  value={newStampData.rozmer}
                  onChange={e => setNewStampData({ ...newStampData, rozmer: e.target.value })}
                  list={hasSuggestions('rozmer') ? getSuggestionListId('rozmer') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Náklad</label>
                <input
                  type="text"
                  value={newStampData.naklad}
                  onChange={e => setNewStampData({ ...newStampData, naklad: e.target.value })}
                  list={hasSuggestions('naklad') ? getSuggestionListId('naklad') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Schéma TF</label>
                <input
                  type="text"
                  value={newStampData.schemaTF}
                  onChange={e => {
                    autoManagedImageFieldsRef.current.schemaTF = false;
                    setNewStampData({ ...newStampData, schemaTF: e.target.value });
                  }}
                  list={hasSuggestions('schemaTF') ? getSuggestionListId('schemaTF') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="ktf-btn-confirm">Přidat</button>
                <button type="button" className="ktf-btn-cancel" onClick={() => setShowAddModal(false)}>Zrušit</button>
              </div>
            </form>
            {suggestionEntries.map(([field, values]) => (
              <datalist key={field} id={getSuggestionListId(field)}>
                {values.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            ))}
          </div>
        </div>
      )}
  {/* MODAL pro přidání varianty/deskové vady */}
  {showAddVariantModal && (
        <div className="ktf-modal-bg" onClick={() => setShowAddVariantModal(false)}>
          <div className="ktf-modal ktf-modal-narrow" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-h3">Přidat variantu/deskovou vadu</h3>
            <form onSubmit={e => { e.preventDefault(); handleAddVariant(); }}>
              <div className="label-top-input">
                <label>ID známky</label>
                <input type="text" value={newVariantData.idZnamky} disabled className="ktf-edit-input-tech" />
              </div>
              <div className="label-top-input">
                <label>Umístění</label>
                <div className="admin-location-row">
                  <input
                    type="text"
                    value={newVariantData.umisteniVady}
                    onChange={e => setNewVariantData(v => ({ ...v, umisteniVady: e.target.value }))}
                    className="ktf-edit-input-tech admin-location-input"
                    list={variantSuggestions.umisteniVady.length ? "variant-umisteni-options" : undefined}
                    autoComplete="off"
                  />
                  <div className="admin-location-btns">
                    <div className="admin-location-prefix-row">
                      {LOCATION_PREFIX_OPTIONS.map((option) => {
                        const isPrefixActive = getLocationPrefix(newVariantData.umisteniVady) === option.text;
                        return (
                          <button
                            key={option.text}
                            type="button"
                            onClick={() => applyLocationPrefix(option.text)}
                            className={`admin-location-prefix-btn${isPrefixActive ? ' active' : ''}`}
                            title={`Doplnit ${option.text.trim()}`}
                            aria-label={`Doplnit ${option.text.trim()}`}
                          >
                            {option.symbol}
                          </button>
                        );
                      })}
                    </div>
                    <div className="admin-location-chips-row">
                      {QUICK_LOCATION_CHIPS.map((chip) => {
                        const locationWithoutPrefix = String(newVariantData.umisteniVady || '').trim().replace(/^\s*(nad|pod|vlevo od|vpravo od)(?:\s+|$)/i, '');
                        const isActive = locationWithoutPrefix.toUpperCase() === chip;
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => applyLocationChip(chip)}
                            className={`admin-location-chip-btn${isActive ? ' active' : ''}`}
                            title={`Vyplnit ${chip}`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="label-top-input">
                <label>
                  Obrázek vady <span className="admin-label-subhint">(adresa se doplňuje automaticky)</span>
                </label>
                <input
                  type="text"
                  value={newVariantData.obrazekVady}
                  onChange={e => {
                    isVariantImageAutoManagedRef.current = false;
                    setNewVariantData(v => ({ ...v, obrazekVady: e.target.value }));
                  }}
                  className="ktf-edit-input-tech"
                  placeholder="automaticky předvyplneno"
                />
              </div>
              <div className="admin-variant-row">
                <div className="label-top-input admin-varianta-field">
                  <label>Varianta</label>
                  <div className="admin-input-with-stepper">
                    <input
                      type="text"
                      value={newVariantData.variantaVady}
                      onChange={e => updateVariantDataWithImageSync({ variantaVady: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          updateVariantDataWithImageSync({}, { forceImageSync: true });
                        }
                      }}
                      className="ktf-edit-input-tech admin-input-flex"
                      list={variantSuggestions.variantaVady.length ? "variant-varianta-options" : undefined}
                      autoComplete="off"
                      required
                    />
                    <div className="admin-stepper-btns">
                      <button
                        type="button"
                        onClick={() => stepVariantLetter(1)}
                        aria-label="Další písmeno varianty"
                        title="Další písmeno (A-H)"
                        className="admin-stepper-btn"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => stepVariantLetter(-1)}
                        aria-label="Předchozí písmeno varianty"
                        title="Předchozí písmeno (A-H)"
                        className="admin-stepper-btn"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                <div className="label-top-input admin-poradi-field">
                  <label>Pořadí</label>
                  <div className="admin-input-with-stepper">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newVariantData.poradiVady}
                      onChange={e => {
                        const digitsOnly = e.target.value.replace(/\D+/g, '').slice(0, 2);
                        updateVariantDataWithImageSync({ poradiVady: digitsOnly });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          updateVariantDataWithImageSync({}, { forceImageSync: true });
                        }
                      }}
                      className="ktf-edit-input-tech admin-poradi-input"
                    />
                    <div className="admin-stepper-btns">
                      <button
                        type="button"
                        onClick={() => stepVariantOrder(1)}
                        aria-label="Zvýšit pořadí varianty"
                        title="Zvýšit pořadí"
                        className="admin-stepper-btn"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => stepVariantOrder(-1)}
                        aria-label="Snížit pořadí varianty"
                        title="Snížit pořadí"
                        className="admin-stepper-btn"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                <div className="admin-checkbox-row">
                  <input
                    type="checkbox"
                    id="variant-mam-checkbox"
                    checked={newVariantData.mam}
                    onChange={e => setNewVariantData(v => ({ ...v, mam: e.target.checked }))}
                    className="admin-checkbox"
                  />
                  <label htmlFor="variant-mam-checkbox" className="admin-checkbox-label">
                    ✓ Mám
                  </label>
                </div>
              </div>
              <div className="label-top-input">
                <label>Popis vady</label>
                <textarea value={newVariantData.popisVady} onChange={e => setNewVariantData(v => ({ ...v, popisVady: e.target.value }))} className="ktf-edit-input-tech" rows={3} />
                <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
                  <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
                  <div className="ktf-tip-box ktf-tip-box-bulleted">
                    <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Vlož <code>[[...]]</code> kde chceš schovat text, před ní bude text vidět hned a text za ní se zobrazí jen po přejetí myší (…)</span>
                    <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">V adrese obrázku varianty: <code>_</code> na začátku názvu = čárkovaný obrázek ✧ <code>!</code> na začátku názvu = čárkovaný box varianty ✧ <code>!</code> je jen marker v adrese (soubor ukládej bez něj) ✧ <code>(n/a)</code> na konci adresy = trvale nedostupný obrázek</span>
                  </div>
                </div>
              </div>
              {variantSuggestions.variantaVady.length > 0 && (
                <datalist id="variant-varianta-options">
                  {variantSuggestions.variantaVady.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              )}
              {variantSuggestions.umisteniVady.length > 0 && (
                <datalist id="variant-umisteni-options">
                  {variantSuggestions.umisteniVady.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              )}
              <div className="admin-modal-actions">
                <button type="submit" className="ktf-btn-confirm" disabled={isSubmittingVariant}>
                  {isSubmittingVariant ? 'Ukládám…' : 'Přidat variantu'}
                </button>
                <button type="button" className="back-btn" onClick={() => setShowAddVariantModal(false)}>
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
    );
}

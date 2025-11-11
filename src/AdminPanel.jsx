import React, { useState, useEffect } from "react";
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
    obrazekAutor: ''
  });

  // Modal pro přidání varianty
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [newVariantData, setNewVariantData] = useState({
    idZnamky: '',
    variantaVady: '',
    umisteniVady: '',
    obrazekVady: '',
    popisVady: ''
  });
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);
  const getSuggestionValues = (field) => {
    const values = fieldSuggestions?.[field];
    return Array.isArray(values) ? values : [];
  };
  const hasSuggestions = (field) => getSuggestionValues(field).length > 0;
  const getSuggestionListId = (field) => `admin-new-${field}-options`;
  const suggestionEntries = Object.entries(fieldSuggestions || {}).filter(
    ([, values]) => Array.isArray(values) && values.length > 0
  );
  useEffect(() => {
    if (!showAddModal) {
      return undefined;
    }
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
            obrazekVady = `img/${stamp.rok}/${katalogCisloNoSpace}`;
          }
        }
      } catch (err) {}
      setNewVariantData({
        idZnamky,
        variantaVady: '',
        umisteniVady: '',
        obrazekVady,
        popisVady: ''
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
            obrazekVady = `img/${stamp.rok}/${katalogCisloNoSpace}`;
          }
        }
      } catch (err) {}
      setNewVariantData({
        idZnamky,
        variantaVady: '',
        umisteniVady: '',
        obrazekVady,
        popisVady: ''
      });
      setShowAddVariantModal(true);
    };
    return () => {
      window.removeEventListener('openAddVariantModal', handleOpenModal);
      delete window.setShowAddVariantModal;
    };
  }, []);

  // Funkce pro přidání nové varianty
  const handleAddVariant = async () => {
    setIsSubmittingVariant(true);
    try {
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
        body: JSON.stringify(newVariantData)
      });
      if (response.ok) {
        setShowAddVariantModal(false);
        setNewVariantData({
          idZnamky: '',
          variantaVady: '',
          umisteniVady: '',
          obrazekVady: '',
          popisVady: ''
        });
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
  {/* MODAL pro přidání nové známky */}
  {showAddModal && (
        <div className="ktf-modal-bg">
          <div className="ktf-modal">
            <h2>Přidat novou známku</h2>
            <form onSubmit={e => { e.preventDefault(); if (onAddStamp) onAddStamp(newStampData); }}>
              <div className="label-top-input">
                <label>Rok vydání</label>
                <input
                  type="number"
                  value={newStampData.rok}
                  onChange={e => setNewStampData({ ...newStampData, rok: e.target.value })}
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
                <label>Katalogové číslo</label>
                <input
                  type="text"
                  value={newStampData.katalogCislo}
                  onChange={e => setNewStampData({ ...newStampData, katalogCislo: e.target.value })}
                  list={hasSuggestions('katalogCislo') ? getSuggestionListId('katalogCislo') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Obrázek</label>
                <input
                  type="text"
                  value={newStampData.obrazek}
                  onChange={e => setNewStampData({ ...newStampData, obrazek: e.target.value })}
                  placeholder="img/rok/obrazek.jpg"
                  list={hasSuggestions('obrazek') ? getSuggestionListId('obrazek') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Obrázek studie</label>
                <input
                  type="text"
                  value={newStampData.obrazekStudie}
                  onChange={e => setNewStampData({ ...newStampData, obrazekStudie: e.target.value })}
                  placeholder="img/rok/studie.jpg"
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
                  onChange={e => setNewStampData({ ...newStampData, schemaTF: e.target.value })}
                  list={hasSuggestions('schemaTF') ? getSuggestionListId('schemaTF') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Studie (text před čárkou)</label>
                <input
                  type="text"
                  value={newStampData.Studie}
                  onChange={e => setNewStampData({ ...newStampData, Studie: e.target.value })}
                  list={hasSuggestions('Studie') ? getSuggestionListId('Studie') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>URL studie (část za čárkou)</label>
                <input
                  type="text"
                  value={newStampData.studieUrl}
                  onChange={e => setNewStampData({ ...newStampData, studieUrl: e.target.value })}
                  placeholder="https://example.com/studie"
                  list={hasSuggestions('studieUrl') ? getSuggestionListId('studieUrl') : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="label-top-input">
                <label>Popis studie</label>
                <textarea
                  value={newStampData.popisStudie}
                  onChange={e => setNewStampData({ ...newStampData, popisStudie: e.target.value })}
                  placeholder="Text popisu studie zobrazený v detailu"
                  rows={4}
                  style={{ minHeight: 120 }}
                />
                {hasSuggestions('popisStudie') && (
                  <div style={{ marginTop: 8 }}>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        setNewStampData(prev => ({ ...prev, popisStudie: value }));
                        e.target.value = "";
                      }}
                      className="ktf-edit-input-tech"
                    >
                      <option value="">Vybrat dřívější popis…</option>
                      {getSuggestionValues('popisStudie').map((value) => (
                        <option key={value} value={value}>
                          {value.length > 80 ? `${value.slice(0, 80)}…` : value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="label-top-input">
                <label>Popis studie – část za variantami</label>
                <textarea
                  value={newStampData.popisStudie2}
                  onChange={e => setNewStampData({ ...newStampData, popisStudie2: e.target.value })}
                  placeholder="Doplňující text zobrazený pod blokem variant"
                  rows={4}
                  style={{ minHeight: 120 }}
                />
                {hasSuggestions('popisStudie2') && (
                  <div style={{ marginTop: 8 }}>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        setNewStampData(prev => ({ ...prev, popisStudie2: value }));
                        e.target.value = "";
                      }}
                      className="ktf-edit-input-tech"
                    >
                      <option value="">Vybrat dřívější popis…</option>
                      {getSuggestionValues('popisStudie2').map((value) => (
                        <option key={value} value={value}>
                          {value.length > 80 ? `${value.slice(0, 80)}…` : value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="label-top-input">
                <label>Zdroj obrázků variant</label>
                <input
                  type="text"
                  value={newStampData.obrazekAutor}
                  onChange={e => setNewStampData({ ...newStampData, obrazekAutor: e.target.value })}
                  placeholder="Např. Jana Nováková, Petr Dvořák"
                  autoComplete="off"
                />
                {hasSuggestions('obrazekAutor') && (
                  <div style={{ marginTop: 8 }}>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        setNewStampData(prev => ({ ...prev, obrazekAutor: value }));
                        e.target.value = "";
                      }}
                      className="ktf-edit-input-tech"
                    >
                      <option value="">Vybrat dřívější text…</option>
                      {getSuggestionValues('obrazekAutor').map((value) => (
                        <option key={value} value={value}>
                          {value.length > 80 ? `${value.slice(0, 80)}…` : value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div style={{marginTop: '16px', display: 'flex', gap: '12px'}}>
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
          <div className="ktf-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Přidat variantu/deskovou vadu</h3>
            <form onSubmit={e => { e.preventDefault(); handleAddVariant(); }}>
              <div className="label-top-input">
                <label>ID známky</label>
                <input type="text" value={newVariantData.idZnamky} disabled className="ktf-edit-input-tech" />
              </div>
              <div className="label-top-input">
                <label>Varianta</label>
                <input type="text" value={newVariantData.variantaVady} onChange={e => setNewVariantData(v => ({ ...v, variantaVady: e.target.value }))} className="ktf-edit-input-tech" required />
              </div>
              <div className="label-top-input">
                <label>Umístění</label>
                <input type="text" value={newVariantData.umisteniVady} onChange={e => setNewVariantData(v => ({ ...v, umisteniVady: e.target.value }))} className="ktf-edit-input-tech" />
              </div>
              <div className="label-top-input">
                <label>Obrázek vady</label>
                <input type="text" value={newVariantData.obrazekVady} onChange={e => setNewVariantData(v => ({ ...v, obrazekVady: e.target.value }))} className="ktf-edit-input-tech" placeholder="img/rok/vada.jpg" />
              </div>
              <div className="label-top-input">
                <label>Popis vady</label>
                <textarea value={newVariantData.popisVady} onChange={e => setNewVariantData(v => ({ ...v, popisVady: e.target.value }))} className="ktf-edit-input-tech" rows={3} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
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

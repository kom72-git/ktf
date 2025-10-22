import React, { useState } from "react";

export default function AdminPanel({ isAdmin, onLogout, onLogin, showAdminLogin, setShowAdminLogin, handleAdminLogin, showAddModal, setShowAddModal, onAddStamp }) {
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
    studieUrl: ''
  });
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
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Emise:</label>
                <input type="text" value={newStampData.emise} onChange={e => setNewStampData({...newStampData, emise: e.target.value})} required />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Rok:</label>
                <input type="number" value={newStampData.rok} onChange={e => setNewStampData({...newStampData, rok: e.target.value})} required />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Katalogové číslo:</label>
                <input type="text" value={newStampData.katalogCislo} onChange={e => setNewStampData({...newStampData, katalogCislo: e.target.value})} required />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Hlavní obrázek:</label>
                <input type="text" value={newStampData.obrazek} onChange={e => setNewStampData({...newStampData, obrazek: e.target.value})} placeholder="img/rok/obrazek.jpg" />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Obrázek studie:</label>
                <input type="text" value={newStampData.obrazekStudie} onChange={e => setNewStampData({...newStampData, obrazekStudie: e.target.value})} placeholder="img/rok/studie.jpg" />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Datum vydání:</label>
                <input type="text" value={newStampData.datumVydani} onChange={e => setNewStampData({...newStampData, datumVydani: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Návrh:</label>
                <input type="text" value={newStampData.navrh} onChange={e => setNewStampData({...newStampData, navrh: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Rytec:</label>
                <input type="text" value={newStampData.rytec} onChange={e => setNewStampData({...newStampData, rytec: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Druh tisku:</label>
                <input type="text" value={newStampData.druhTisku} onChange={e => setNewStampData({...newStampData, druhTisku: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Tisková forma:</label>
                <input type="text" value={newStampData.tiskovaForma} onChange={e => setNewStampData({...newStampData, tiskovaForma: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Zoubkování:</label>
                <input type="text" value={newStampData.zoubkovani} onChange={e => setNewStampData({...newStampData, zoubkovani: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Papír:</label>
                <input type="text" value={newStampData.papir} onChange={e => setNewStampData({...newStampData, papir: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Rozměr:</label>
                <input type="text" value={newStampData.rozmer} onChange={e => setNewStampData({...newStampData, rozmer: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Náklad:</label>
                <input type="text" value={newStampData.naklad} onChange={e => setNewStampData({...newStampData, naklad: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Schéma TF:</label>
                <input type="text" value={newStampData.schemaTF} onChange={e => setNewStampData({...newStampData, schemaTF: e.target.value})} placeholder="https://example.com/schema.jpg" />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>Studie:</label>
                <input type="text" value={newStampData.Studie} onChange={e => setNewStampData({...newStampData, Studie: e.target.value})} />
              </div>
              <div className="label-top-input" style={{marginBottom: '12px'}}>
                <label>URL studie:</label>
                <input type="text" value={newStampData.studieUrl} onChange={e => setNewStampData({...newStampData, studieUrl: e.target.value})} placeholder="https://example.com/studie" />
              </div>
              <div style={{marginTop: '16px', display: 'flex', gap: '12px'}}>
                <button type="submit" className="ktf-btn-confirm">Přidat</button>
                <button type="button" className="ktf-btn-cancel" onClick={() => setShowAddModal(false)}>Zrušit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

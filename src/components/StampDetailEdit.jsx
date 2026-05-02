// Editační sekce pro StampDetail – všechny editační bloky jsou soustředěny zde.
// Každá exportovaná komponenta odpovídá jednomu vizuálnímu bloku stránky detailu.
// Stav (editStampData) a ukladací funkce zůstávají v rodiči StampDetail.jsx.
import React from "react";
import { replaceAbbreviations, formatPopisWithAll } from "../utils/formatovaniTextu.jsx";
import ImageSources from "./ImageSources.jsx";
import LiteratureTextarea from "./LiteratureTextarea.jsx";
import StudyBlockTextarea from "./StudyBlockTextarea.jsx";

// Interní helper pro vykreslení obsahu s abbrev (pole fragmentů nebo prostý string)
function renderAbbrevContent(value, keyPrefix) {
  if (Array.isArray(value)) {
    return value.map((part, idx) => (
      <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
    ));
  }
  return value;
}

// ─── Nadpis stránky: emise, rok, skupina emise (view + edit) ─────────────────
export function StampTitleSection({
  isEditingAll,
  item,
  detailHeadingId,
  editStampData,
  setEditStampData,
  recalculateImageAddressesFromCatalog,
  hasSuggestions,
  getSuggestionListId,
  saveTechnicalField,
  replaceAbbreviations,
  renderEmissionTitleWithPragaSuffix,
}) {
  return (
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
              onChange={(e) => setEditStampData({ ...editStampData, emise: e.target.value })}
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
              onChange={(e) => setEditStampData({ ...editStampData, rok: e.target.value })}
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
          <div className="label-top-input edit-title-subfield edit-emise-skupina-row">
            <label htmlFor="edit-emise-skupina">Skupina emise (jen pro filtr)</label>
            <div className="edit-field-row">
              <input
                id="edit-emise-skupina"
                type="text"
                value={editStampData.emiseSkupina || ''}
                onChange={(e) => setEditStampData({ ...editStampData, emiseSkupina: e.target.value })}
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
        <h1 id={detailHeadingId} className="detail-title-text">
          {renderEmissionTitleWithPragaSuffix(item.emise, item.rok)}
        </h1>
      )}
    </header>
  );
}


export function StampImageEditRow({
  isEditingAll,
  editStampData,
  setEditStampData,
  hasSuggestions,
  getSuggestionListId,
  saveTechnicalField,
}) {
  if (!isEditingAll) return null;

  return (
    <>
      <div className="ktf-edit-study-row">
        <div className="ktf-edit-study-col label-top-input">
          <label htmlFor="edit-img-url">Hlavní obrázek:</label>
          <div className="edit-field-row">
            <input
              id="edit-img-url"
              type="text"
              value={editStampData.obrazek || ""}
              onChange={(e) => setEditStampData({ ...editStampData, obrazek: e.target.value })}
              className="ktf-edit-input-tech ktf-edit-input-long"
              list={hasSuggestions("obrazek") ? getSuggestionListId("obrazek") : undefined}
              autoComplete="off"
            />
            <button
              onClick={() => {
                console.log("[DEBUG] Ukládám obrázek:", editStampData.obrazek);
                saveTechnicalField("obrazek", editStampData.obrazek || "");
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
              value={editStampData.obrazekStudie || ""}
              onChange={(e) => setEditStampData({ ...editStampData, obrazekStudie: e.target.value })}
              className="ktf-edit-input-tech ktf-edit-input-long"
              list={hasSuggestions("obrazekStudie") ? getSuggestionListId("obrazekStudie") : undefined}
              autoComplete="off"
            />
            <button
              onClick={() => {
                console.log("[DEBUG] Ukládám obrázek studie:", editStampData.obrazekStudie);
                saveTechnicalField("obrazekStudie", editStampData.obrazekStudie || "");
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
  );
}

// ─── Katalogové číslo (view + edit) ──────────────────────────────────────────
export function StampCatalogNumberSection({
  isEditingAll,
  editStampData,
  setEditStampData,
  recalculateImageAddressesFromCatalog,
  hasSuggestions,
  getSuggestionListId,
  saveTechnicalField,
  hasABPair,
  aStamp,
  bStamp,
  currentIsA,
  renderCatalogDisplay,
  renderCatalogLinkWithPreview,
  item,
  companionStamp,
}) {
  return (
    <div className="detail-catalog">
      {isEditingAll ? (
        <div className="label-top-input">
          <label htmlFor="edit-catalog-number">Katalogové číslo:</label>
          <div className="edit-field-row">
            <input
              id="edit-catalog-number"
              type="text"
              value={editStampData.katalogCislo}
              onChange={(e) => setEditStampData({ ...editStampData, katalogCislo: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  recalculateImageAddressesFromCatalog({ katalogCislo: e.currentTarget.value }, { forceResetOnInvalid: true });
                }
              }}
              className="ktf-edit-input-tech"
              placeholder="Katalogové číslo"
              list={hasSuggestions("katalogCislo") ? getSuggestionListId("katalogCislo") : undefined}
              autoComplete="off"
            />
            <button
              onClick={() => saveTechnicalField("katalogCislo", editStampData.katalogCislo)}
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
              <span className="detail-catalog-separator">|</span>
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
                  <span className="detail-catalog-separator">|</span>
                  {renderCatalogLinkWithPreview(companionStamp, companionStamp.katalogCislo)}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Technické údaje (spec rows section) ─────────────────────────────────────
export function StampTechnicalSpecSection({
  isEditingAll,
  editStampData,
  setEditStampData,
  hasSuggestions,
  getSuggestionListId,
  saveTechnicalField,
  renderTechnicalValue,
  item,
  resolvedDatumVydani,
  resolvedNavrh,
  resolvedRytec,
  resolvedDruhTisku,
  resolvedTiskovaForma,
  resolvedNominal,
  resolvedZoubkovani,
  resolvedPapir,
  resolvedRozmer,
  resolvedNaklad,
  normalizeImageSrc,
  normalizedItemSchemaTF,
  normalizedResolvedSchemaTF,
  openSingleImageLightbox,
  specHeadingId,
}) {
  return (
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
              >✓</button>
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('navrh') ? getSuggestionListId('navrh') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('navrh', editStampData.navrh)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('navrh', resolvedNavrh)
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('rytec') ? getSuggestionListId('rytec') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('rytec', editStampData.rytec)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('rytec', resolvedRytec)
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('druhTisku') ? getSuggestionListId('druhTisku') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('druhTisku', editStampData.druhTisku)}
                className="ktf-btn-check"
              >✓</button>
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('tiskovaForma') ? getSuggestionListId('tiskovaForma') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('tiskovaForma', editStampData.tiskovaForma)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('tiskovaForma', resolvedTiskovaForma)
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('nominal') ? getSuggestionListId('nominal') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('nominal', editStampData.nominal)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('nominal', resolvedNominal)
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('zoubkovani') ? getSuggestionListId('zoubkovani') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('zoubkovani', editStampData.zoubkovani)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('zoubkovani', resolvedZoubkovani)
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('papir') ? getSuggestionListId('papir') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('papir', editStampData.papir)}
                className="ktf-btn-check"
              >✓</button>
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('rozmer') ? getSuggestionListId('rozmer') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('rozmer', editStampData.rozmer)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('rozmer', resolvedRozmer)
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
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') {} }}
                className="ktf-edit-input-tech"
                list={hasSuggestions('naklad') ? getSuggestionListId('naklad') : undefined}
                autoComplete="off"
              />
              <button
                onClick={() => saveTechnicalField('naklad', editStampData.naklad)}
                className="ktf-btn-check"
              >✓</button>
            </div>
          ) : (
            renderTechnicalValue('naklad', resolvedNaklad)
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
                  onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
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
                >✓</button>
              </div>
            </div>
          ) : (
            normalizedResolvedSchemaTF && (
              <img
                src={normalizeImageSrc(normalizedResolvedSchemaTF)}
                alt="Schéma TF"
                className="tf-img tf-img-clickable"
                onClick={() => openSingleImageLightbox(normalizedResolvedSchemaTF, "Schéma TF")}
                onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
              />
            )
          )}
        </span>
      </div>
    </section>
  );
}

// ─── Studie a popis studie (edit + view, nad VariantList) ─────────────────────
export function StampStudyTopSection({
  isEditingAll,
  editStampData,
  setEditStampData,
  hasSuggestions,
  getSuggestionListId,
  saveStudyField,
  saveTechnicalField,
  studyReferenceBlock,
  resolvedPopisStudie,
  popisStudieSuggestionValues,
  item,
}) {
  const popisStudieValue =
    typeof editStampData.popisStudie === "string"
      ? editStampData.popisStudie
      : (item.popisStudie || "");

  return isEditingAll ? (
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
                onClick={() => { saveStudyField('Studie', editStampData.Studie || ''); }}
                className="ktf-btn-check"
              >✓</button>
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
                onClick={() => { saveStudyField('studieUrl', editStampData.studieUrl || ''); }}
                className="ktf-btn-check"
              >✓</button>
            </div>
          </div>
        </div>
      </div>
      {/* --- POPIS STUDIE --- */}
      <div className="ktf-edit-study-popis-row ktf-edit-study-popis-row-full">
        <div className="label-top-input ktf-edit-row-full">
          <label htmlFor="edit-popis-studie">Popis studie</label>
          <StudyBlockTextarea
            id="edit-popis-studie"
            value={popisStudieValue}
            onChange={(nextValue) => setEditStampData({ ...editStampData, popisStudie: nextValue })}
            onSave={(nextValue) => saveTechnicalField('popisStudie', nextValue)}
            suggestionValues={popisStudieSuggestionValues}
            rows={10}
            placeholder="Popis konkrétní studie..."
            textareaClassName="ktf-edit-textarea-long ktf-edit-textarea-study"
            buttonClassName="ktf-btn-check"
            selectClassName="ktf-edit-input-tech"
            selectPlaceholder="Vložit dříve použitý blok popisu…"
          />
          <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
            <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
            <div className="ktf-tip-box ktf-tip-box-bulleted">
              <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Podporované formátování: <code>&apos;text&apos;</code> → šedé zvýraznění ✧ <code>*</code> → zneviditelnění tooltipu</span>
              <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Redakční blok: <code>[pozn]Tvůj doplněný text[/pozn]</code></span>
              <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">HTML: <code>&lt;b&gt;&lt;/b&gt;</code> → tučně ✧ <code>&lt;em&gt;&lt;/em&gt;</code> → kurzíva ✧ <code>&lt;u&gt;&lt;/u&gt;</code> → podtržení ✧ <code>&lt;br /&gt;</code> → nový řádek ✧ <code>&lt;sup&gt;&lt;/sup&gt;</code> → horní index ✧ <code>&lt;sub&gt;&lt;/sub&gt;</code> → dolní index</span>
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
  );
}

// ─── Druhý blok studie (popis 2, autoři, literatura) ─────────────────────────
export function StampStudyFooterSection({
  isEditingAll,
  editStampData,
  setEditStampData,
  item,
  saveTechnicalField,
  authorSuggestionListId,
  authorSuggestionValues,
  literatureSuggestionValues,
  popisStudie2SuggestionValues,
  popisStudie2Display,
  hasPopisStudie2Content,
  hasAuthors,
  authorsRaw,
  hasLiteratureEntries,
  literatureEntries,
  secondStudyBlockClass,
  additionalStudyHeadingId,
}) {
  const literatureEditValue =
    typeof editStampData.literatura === "string"
      ? editStampData.literatura
      : (item.literatura || "");
  const popisStudie2Value =
    typeof editStampData.popisStudie2 === "string"
      ? editStampData.popisStudie2
      : popisStudie2Display;

  return (
    <section className={secondStudyBlockClass} aria-labelledby={additionalStudyHeadingId}>
      <h2 id={additionalStudyHeadingId} className="sr-only">Doplňující popis studie</h2>
      {isEditingAll ? (
        <div className="label-top-input ktf-edit-row-full">
          <label htmlFor="edit-popis-studie-2">Popis studie – část za variantami</label>
          <StudyBlockTextarea
            id="edit-popis-studie-2"
            value={popisStudie2Value}
            onChange={(nextValue) => setEditStampData({ ...editStampData, popisStudie2: nextValue })}
            onSave={(nextValue) => saveTechnicalField('popisStudie2', nextValue)}
            suggestionValues={popisStudie2SuggestionValues}
            rows={10}
            placeholder="Druhý blok popisu zobrazený za variantami"
            textareaClassName="ktf-edit-textarea-long ktf-edit-textarea-study"
            buttonClassName="ktf-btn-check"
            selectClassName="ktf-edit-input-tech"
            selectPlaceholder="Vložit dříve použitý blok (část za variantami)…"
          />
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
          <div className="label-top-input ktf-edit-row-full edit-literature-block">
            <label htmlFor="edit-literatura">Literatura</label>
            <LiteratureTextarea
              id="edit-literatura"
              value={literatureEditValue}
              onChange={(nextValue) => setEditStampData({ ...editStampData, literatura: nextValue })}
              onSave={(nextValue) => saveTechnicalField('literatura', nextValue)}
              suggestionValues={literatureSuggestionValues}
              resetKey={`${item?.idZnamky || 'none'}-${isEditingAll ? 'edit' : 'view'}-${literatureEditValue}`}
              rows={5}
              placeholder="[1] Autor: Název ...\n[2] Autor: Název ... https://..."
              textareaClassName="ktf-edit-textarea-long ktf-edit-textarea-study"
              buttonClassName="ktf-btn-check"
              selectClassName="ktf-edit-input-tech"
            />
            <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
              <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
              <div className="ktf-tip-box ktf-tip-box-bulleted">
                <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Příklady:<br />
                  <code>1) Pavel Hankovec: Dvě varianty aršíku INTERKOSMOS, Filatelie 1980/14 str. 440</code><br />
                  <code>2) Stanislav Pilař: Ještě k aršíku INTERKOSMOS 80, <strong>%</strong>Filatelie 1984/12 str. 361<strong>%</strong> https://example.com</code>
                </span>
                <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Každou položku dej na nový řádek. Klikací část vymezuj mezi <code>%...%</code>.</span>
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
  );
}

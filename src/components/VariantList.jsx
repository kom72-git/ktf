// Komponenta VariantList zobrazuje seznam variant (deskových vad) u dané známky.
// V admin edit módu umožňuje editaci všech polí variant přes kontrolovaný stav.
// Přes ref (useImperativeHandle) vystavuje metodu saveAll() pro hromadné uložení z rodiče.

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Fancybox } from "@fancyapps/ui";
import VariantTooltip from "./VariantTooltip.jsx";
import { formatDefectDescription } from "../utils/formatovaniTextu.jsx";
import { naturalVariantSort, compareVariantsWithBracket } from "../utils/katalog.js";

// --- Helper funkce (přesunuty ze StampDetail) ---

function parseDefectImagePathFlags(src) {
  const raw = String(src ?? "").trim();
  const isExplicitUnavailable = /\(n\/a\)\s*$/i.test(raw);
  const value = raw.replace(/\(n\/a\)\s*$/i, "").trim();
  if (!value) {
    return { normalizedPath: "", hasImageDashedMarker: false, hasBoxDashedMarker: false, isExplicitNoImage: isExplicitUnavailable };
  }
  if (/^(https?:|data:)/i.test(value)) {
    return { normalizedPath: value, hasImageDashedMarker: false, hasBoxDashedMarker: false, isExplicitNoImage: isExplicitUnavailable };
  }
  const parts = value.split("/");
  const rawLastPart = parts[parts.length - 1] || "";
  let lastPart = rawLastPart;
  let hasBoxDashedMarker = false;
  if (lastPart.startsWith("!")) {
    hasBoxDashedMarker = true;
    lastPart = lastPart.slice(1);
  }
  const hasImageDashedMarker = lastPart.startsWith("_");
  parts[parts.length - 1] = lastPart;
  return { normalizedPath: parts.join("/"), hasImageDashedMarker, hasBoxDashedMarker, isExplicitNoImage: isExplicitUnavailable };
}

function normalizeDefectImageSrc(src) {
  const { normalizedPath, isExplicitNoImage } = parseDefectImagePathFlags(src);
  const value = normalizedPath;
  if (!value) return "";
  if (isExplicitNoImage) return "/img/no-img.png";
  if (/^(https?:|data:)/i.test(value)) return value;
  const withoutLeadingSlash = value.replace(/^\/+/, "");
  const withImgPrefix = withoutLeadingSlash.startsWith("img/") ? withoutLeadingSlash : `img/${withoutLeadingSlash}`;
  const parts = withImgPrefix.split("/");
  const lastPart = parts[parts.length - 1] || "";
  const hasExtension = /\.[a-z0-9]{2,5}$/i.test(lastPart);
  let normalized = withImgPrefix;
  if (!hasExtension) {
    const typoExtMatch = lastPart.match(/^(.*?)(jpe?g|png|webp|gif)$/i);
    if (typoExtMatch && typoExtMatch[1]) {
      parts[parts.length - 1] = `${typoExtMatch[1]}.${typoExtMatch[2]}`;
      normalized = parts.join("/");
    } else {
      normalized = `${withImgPrefix}.jpg`;
    }
  }
  return `/${normalized}`;
}

function buildDefectDescriptionWithVariant(def) {
  const variant = String(def?.variantaVady || "").trim();
  const description = String(def?.popisVady || "").trim();
  if (!variant) return description;
  if (!description) return `[${variant}]`;
  return `[${variant}] ${description}`;
}

function splitLeadingVariantToken(text) {
  const value = typeof text === "string" ? text : String(text ?? "");
  const match = value.match(/^\s*\[([^\]]+)\]([A-Za-z]?)(.*)$/s);
  if (!match) return { variantToken: null, descriptionText: value };
  const contentRaw = (match[1] || "").trim();
  const suffixRaw = (match[2] || "").trim();
  const rest = (match[3] || "").trimStart();
  if (!contentRaw) return { variantToken: null, descriptionText: value };
  let content = contentRaw;
  let suffix = suffixRaw;
  if (!suffix) {
    const bracketSuffixMatch = contentRaw.match(/^(.*?)\s*\(([A-Za-z])\)$/);
    if (bracketSuffixMatch && bracketSuffixMatch[1]) {
      content = bracketSuffixMatch[1].trim();
      suffix = bracketSuffixMatch[2];
    }
  }
  return { variantToken: { content, suffix }, descriptionText: rest };
}

function renderVariantToken(token, boldBracket) {
  if (!token || !token.content) return null;
  return (
    <>
      {boldBracket ? <strong>{token.content}</strong> : <span>{token.content}</span>}
      {token.suffix ? <span className="variant-suffix">{token.suffix}</span> : null}
    </>
  );
}

function getSubvariantHeadingLabel(rawVariant) {
  const value = String(rawVariant || "").trim();
  if (!value) return "";
  const match = value.match(/^(.*?)\s*\(([A-Za-z])\)$/);
  if (match && match[1]) return match[1].trim();
  return value;
}

function normalizeVariantTokenForCaption(text) {
  const value = typeof text === "string" ? text : String(text ?? "");
  const { variantToken, descriptionText } = splitLeadingVariantToken(value);
  if (!variantToken || !variantToken.content) return value;
  const token = `[${variantToken.content}]${variantToken.suffix || ""}`;
  return descriptionText ? `${token} - ${descriptionText}` : token;
}

function normalizeDefectOrderForSave(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : "";
}

function hasDefectChanges(def, edits) {
  if (!def || !edits) return false;
  const currentOrder = normalizeDefectOrderForSave(def.poradiVady);
  const nextOrder = normalizeDefectOrderForSave(edits.poradiVady);
  return (
    (edits.variantaVady ?? "") !== (def.variantaVady || "")
    || (edits.umisteniVady ?? "") !== (def.umisteniVady || "")
    || (edits.popisVady ?? "") !== (def.popisVady || "")
    || (edits.obrazekVady ?? "") !== (def.obrazekVady || "")
    || nextOrder !== currentOrder
    || !!edits.tucneVSeznamu !== !!def.tucneVSeznamu
    || !!edits.mam !== !!def.mam
  );
}

function getDefectKey(def) {
  return def._id?.toString() || def.idVady || `${def.variantaVady || ""}||${def.umisteniVady || ""}`;
}

function isExcludedFromA(def, excludedList) {
  const key = getDefectKey(def);
  const legacyKey = def?.variantaVady || "";
  return excludedList.includes(key) || (legacyKey && excludedList.includes(legacyKey));
}

const SPLIT_REGEX = /\[\[\s*\.{3}\s*\]\]/;
const NO_IMAGE = "/img/no-image.png";

function renderDefectDescription(descriptionText, tucneVSeznamu) {
  if (!descriptionText) return null;
  let parts = typeof descriptionText === "string" ? descriptionText.split(SPLIT_REGEX) : [descriptionText];
  if (parts.length === 1 && typeof descriptionText === "string") {
    const idxExact = descriptionText.indexOf("[[...]]");
    if (idxExact !== -1) {
      parts = [descriptionText.slice(0, idxExact), descriptionText.slice(idxExact + "[[...]]".length)];
    }
  }
  if (parts.length > 1) {
    const before = parts[0].replace(SPLIT_REGEX, "");
    const after = parts.slice(1).join("").replace(SPLIT_REGEX, "");
    return (
      <div className="variant-popis-detail" style={{ position: "relative" }}>
        <span className="variant-popis-short">{formatDefectDescription(before, { boldBracket: !!tucneVSeznamu })}</span>
        <VariantTooltip tooltip={<span style={{ fontSize: "13px" }}>{formatDefectDescription(after, { boldBracket: !!tucneVSeznamu })}</span>}>
          …
        </VariantTooltip>
      </div>
    );
  }
  const rendered = formatDefectDescription(descriptionText, { boldBracket: !!tucneVSeznamu });
  if (typeof descriptionText === "string" && descriptionText.length > 500) {
    return (
      <div className="variant-popis-detail" style={{ position: "relative" }}>
        <span className="variant-popis-short variant-popis-clamped">{rendered}</span>
        <VariantTooltip tooltip={<div style={{ fontSize: "13px" }}>{rendered}</div>}>…</VariantTooltip>
      </div>
    );
  }
  return <div className="variant-popis-detail">{rendered}</div>;
}

// --- Komponenta ---

const VariantList = forwardRef(function VariantList({
  effectiveDefects,
  isEditingAll,
  isAdmin,
  isViewingBVariant,
  item,
  aStampDefects,
  variantsHeadingBaseId,
  saveDefectEdit,
  deleteDefect,
  onSaveInheritedMam,
  onExcludeChange,
}, ref) {
  // Kontrolovaný stav pro editaci polí každé varianty
  const buildInitialEdits = (defects) =>
    Object.fromEntries((defects || []).map(def => [
      getDefectKey(def),
      {
        variantaVady: def.variantaVady || "",
        umisteniVady: def.umisteniVady || "",
        popisVady: def.popisVady || "",
        obrazekVady: def.obrazekVady || "",
        poradiVady: def.poradiVady ?? "",
        tucneVSeznamu: !!def.tucneVSeznamu,
        mam: !!def.mam,
      }
    ]));

  const [defectEdits, setDefectEdits] = useState(() => buildInitialEdits(effectiveDefects));
  const [dirtyKeys, setDirtyKeys] = useState(() => new Set());

  // Doplní nové varianty do stavu, pokud přibudou (po přidání z AdminPanel)
  useEffect(() => {
    setDefectEdits(prev => {
      const next = { ...prev };
      (effectiveDefects || []).forEach(def => {
        const key = getDefectKey(def);
        if (!next[key]) {
          next[key] = {
            variantaVady: def.variantaVady || "",
            umisteniVady: def.umisteniVady || "",
            popisVady: def.popisVady || "",
            obrazekVady: def.obrazekVady || "",
            poradiVady: def.poradiVady ?? "",
            tucneVSeznamu: !!def.tucneVSeznamu,
            mam: !!def.mam,
          };
        }
      });
      return next;
    });
  }, [effectiveDefects]);

  const updateEdit = (key, field, value) => {
    setDefectEdits(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setDirtyKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // Seskupení variant
  const grouped = {};
  const plusVariants = [];
  (effectiveDefects || []).forEach(def => {
    if (!def.variantaVady) return;
    if (def.variantaVady.includes(",")) { plusVariants.push(def); return; }
    const isNum = /^\d+$/.test(def.variantaVady);
    const lk = !isNum && def.variantaVady.match(/^([A-Z])/i);
    const groupKey = isNum ? "__numeric__" : (lk ? lk[0] : "?");
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(def);
  });
  const groupedKeysSorted = Object.keys(grouped).sort((ka, kb) => {
    if (ka === "__numeric__") return 1;
    if (kb === "__numeric__") return -1;
    return ka.localeCompare(kb);
  });
  const groupedVariantsOrdered = groupedKeysSorted.flatMap(gk => grouped[gk].slice().sort(compareVariantsWithBracket));
  const plusVariantsOrdered = plusVariants.slice();
  const allVariantsOrdered = [...groupedVariantsOrdered, ...plusVariantsOrdered];
  const getImageNumber = (def) => { const idx = allVariantsOrdered.indexOf(def); return idx === -1 ? "?" : idx + 1; };

  // Fancybox galerie
  const openFancybox = (flatIndex = 0, clickedSrc = "") => {
    if (!allVariantsOrdered.length) return;
    const slides = allVariantsOrdered.map(def => {
      const caption = normalizeVariantTokenForCaption(buildDefectDescriptionWithVariant(def));
      return {
        src: normalizeDefectImageSrc(def.obrazekVady) || NO_IMAGE,
        caption:
          `<div class='fancybox-caption-center'>` +
          `<span class='fancybox-caption-variant'>${def.umisteniVady || ""}</span>` +
          (caption ? `<br /><span class='fancybox-caption-desc'>${caption.replace(/\[\[\.\.\.\]\]/g, "")}</span>` : "") +
          `</div>`,
      };
    });
    if (clickedSrc && slides[flatIndex]) slides[flatIndex] = { ...slides[flatIndex], src: clickedSrc };
    Fancybox.show(slides, {
      startIndex: flatIndex,
      Toolbar: ["thumbs", "zoom", "close"],
      dragToClose: true, animated: true, compact: false,
      showClass: "fancybox-zoomIn", hideClass: "fancybox-zoomOut",
      closeButton: "top", defaultType: "image",
      Carousel: { Thumbs: { showOnStart: false } },
    });
  };

  // Hromadné uložení všech variant – voláno z StampDetail přes ref
  useImperativeHandle(ref, () => ({
    saveAll: async () => {
      const seenKeys = new Set();
      const failedCount = { value: 0 };

      const saveTasks = allVariantsOrdered.map(async (def) => {
        const key = getDefectKey(def);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const edits = defectEdits[key];
        if (!edits || !dirtyKeys.has(key)) return;

        if (def.__inheritedFromA) {
          const saved = await onSaveInheritedMam(def, edits.mam);
          if (!saved) failedCount.value += 1;
          return;
        }

        const defectId = def._id || def.idVady;
        if (!defectId) {
          failedCount.value += 1;
          return;
        }

        const saved = await saveDefectEdit(defectId, {
          ...def,
          variantaVady: edits.variantaVady,
          umisteniVady: edits.umisteniVady,
          popisVady: edits.popisVady,
          obrazekVady: edits.obrazekVady,
          poradiVady: normalizeDefectOrderForSave(edits.poradiVady),
          tucneVSeznamu: edits.tucneVSeznamu,
          mam: edits.mam,
        }, { silent: true });

        if (!saved) failedCount.value += 1;
      });

      await Promise.all(saveTasks);

      if (failedCount.value === 0) {
        setDirtyKeys(new Set());
      }

      if (failedCount.value > 0) {
        console.warn(`[VariantList] Některé varianty se nepodařilo uložit (${failedCount.value}).`);
      }
    },
  }), [allVariantsOrdered, defectEdits, dirtyKeys, onSaveInheritedMam, saveDefectEdit]);

  const excluded = item?.variantyVylouceneZA || [];

  if (!effectiveDefects.length && !isEditingAll) return null;

  // Sdílený render jednoho boxu varianty
  const renderVariantBox = (def, i, keyPrefix) => {
    const key = getDefectKey(def);
    const edits = defectEdits[key] || {};
    const flatIndex = allVariantsOrdered.indexOf(def);
    const { hasImageDashedMarker: isSpecial, isExplicitNoImage, hasBoxDashedMarker: isSpecialBox } = parseDefectImagePathFlags(def.obrazekVady);
    const displayDescription = buildDefectDescriptionWithVariant(def);
    const { variantToken, descriptionText } = splitLeadingVariantToken(displayDescription);

    return (
      <div
        key={def.idVady || def._id || `${keyPrefix}-${i}`}
        className={`variant${isSpecialBox ? " variant-special-box" : ""}`}
        style={isAdmin ? { borderBottom: `2px solid ${def.mam ? "#16a34a" : "#dc2626"}` } : {}}
      >
        <div className="variant-popis">
          {isEditingAll ? (
            <textarea
              placeholder="Umístění"
              value={edits.umisteniVady ?? ""}
              onChange={e => updateEdit(key, "umisteniVady", e.target.value)}
              className="edit-variant-textarea"
            />
          ) : (
            <span className="variant-popis-hlavni">{def.umisteniVady || ""}</span>
          )}
        </div>
        <div
          className="variant-img-bg variant-img-bg-pointer"
          onClick={e => openFancybox(flatIndex, e.currentTarget.querySelector("img")?.currentSrc || "")}
        >
          <img
            src={normalizeDefectImageSrc(def.obrazekVady) || NO_IMAGE}
            alt={def.idVady}
            className={`${isSpecial ? "variant-img-special" : ""}${isExplicitNoImage ? " variant-img-no-image" : ""}`.trim()}
            onError={e => { e.target.onerror = null; e.target.src = NO_IMAGE; }}
          />
        </div>
        {isEditingAll && (
          <div>
            <div className="edit-field-row">
              <input
                type="text"
                value={edits.obrazekVady ?? ""}
                onChange={e => updateEdit(key, "obrazekVady", e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: "3px 5px", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "11px", background: "#fff" }}
                placeholder="https://example.com/obrazek.jpg"
              />
              <input
                type="number"
                value={edits.poradiVady ?? ""}
                onChange={e => updateEdit(key, "poradiVady", e.target.value)}
                style={{ width: "26px", height: "26px", flexShrink: 0, borderRadius: "2px", textAlign: "center", padding: "0", border: "1px solid #d1d5db", fontSize: "11px" }}
                min="0" step="1"
              />
            </div>
          </div>
        )}
        <div className="variant-label">
          {variantToken && (
            <span className={`variant-label-token${def.tucneVSeznamu ? " variant-label-token-emph" : ""}`}>
              {renderVariantToken(variantToken, !!def.tucneVSeznamu)}
            </span>
          )}
          <span className="variant-label-prefix">obr.</span>{" "}{getImageNumber(def)}
        </div>
        {isEditingAll ? (
          <div>
            <div className="edit-field-row" style={{ marginBottom: "4px", display: "flex", gap: "8px", alignItems: "center" }}>
              <label title="Tučně v seznamu podvariant" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", flexShrink: 0 }}>
                <b>{"<b>"}</b>
                <input
                  type="checkbox"
                  checked={!!edits.tucneVSeznamu}
                  onChange={e => updateEdit(key, "tucneVSeznamu", e.target.checked)}
                  style={{ width: "13px", height: "13px", cursor: "pointer" }}
                />
              </label>
              <span style={{ fontSize: "12px", color: "#000", flexShrink: 0, fontWeight: "bold" }}>[</span>
              <input
                type="text"
                placeholder="Varianta"
                value={edits.variantaVady ?? ""}
                onChange={e => updateEdit(key, "variantaVady", e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: "3px 5px", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "11px", background: "#fff" }}
              />
              <span style={{ fontSize: "12px", color: "#000", flexShrink: 0, fontWeight: "bold" }}>]</span>
              <label title="Mám tuto variantu" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", flexShrink: 0 }}>
                <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓</span>
                <input
                  type="checkbox"
                  checked={!!edits.mam}
                  onChange={e => {
                    const newVal = e.target.checked;
                    updateEdit(key, "mam", newVal);
                    if (isViewingBVariant && def.__inheritedFromA) onSaveInheritedMam(def, newVal);
                  }}
                  style={{ width: "13px", height: "13px", cursor: "pointer" }}
                />
              </label>
            </div>
            <textarea
              value={edits.popisVady ?? ""}
              onChange={e => updateEdit(key, "popisVady", e.target.value)}
              rows={5}
              style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "12px", resize: "vertical", fontFamily: "inherit" }}
              placeholder="Popis vady..."
            />
            <div style={{ marginTop: "4px", display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => {
                  if (isViewingBVariant && def.__inheritedFromA) { onSaveInheritedMam(def, edits.mam); return; }
                  saveDefectEdit(def._id || def.idVady, {
                    ...def,
                    variantaVady: edits.variantaVady,
                    umisteniVady: edits.umisteniVady,
                    popisVady: edits.popisVady,
                    obrazekVady: edits.obrazekVady,
                    poradiVady: normalizeDefectOrderForSave(edits.poradiVady),
                    tucneVSeznamu: edits.tucneVSeznamu,
                    mam: edits.mam,
                  });
                }}
                className="ktf-btn-check"
              >✓</button>
              <span className="edit-variant-help">Uloží vše</span>
              <button onClick={() => deleteDefect(def._id)} className="ktf-btn-delete" title="Smazat variantu z databáze">🗑</button>
            </div>
          </div>
        ) : (
          renderDefectDescription(descriptionText, def.tucneVSeznamu)
        )}
      </div>
    );
  };

  return (
    <>
      {/* Vyloučení zděděných variant z A (jen admin edit, jen pro B) */}
      {isEditingAll && isViewingBVariant && aStampDefects.length > 0 && (
        <div className="ktf-exclude-variants-box">
          <strong>Varianty zděděné z A</strong> — odškrtni ty, které se u B nezobrazí:
          <div className="ktf-exclude-variants-list">
            {aStampDefects.map(def => (
              <label key={getDefectKey(def)} className="ktf-exclude-variant-item">
                <input
                  type="checkbox"
                  checked={!isExcludedFromA(def, excluded)}
                  onChange={e => {
                    const defectKey = getDefectKey(def);
                    const newExcluded = e.target.checked
                      ? excluded.filter(v => v !== defectKey && v !== def.variantaVady)
                      : [...excluded, defectKey];
                    onExcludeChange(newExcluded);
                  }}
                />
                {def.variantaVady}{def.umisteniVady ? ` – ${def.umisteniVady}` : ""}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Nápověda k editaci variant */}
      {isEditingAll && (
        <div className="ktf-tip-wrap" role="note" aria-label="Nápověda k editaci variant">
          <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
          <div className="ktf-tip-box ktf-tip-box-bulleted">
            <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Vlož <code>{"[[...]]"}</code> kde chceš schovat text, před ní bude text vidět hned a text za ní se zobrazí jen po přejetí myší (…)</span>
            <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">V adrese obrázku varianty: <code>_</code> na začátku názvu = čárkovaný obrázek ✧ <code>!</code> na začátku názvu = čárkovaný box varianty ✧ <code>!</code> je jen marker v adrese (soubor ukládej bez něj) ✧ <code>(n/a)</code> na konci adresy = trvale nedostupný obrázek</span>
          </div>
        </div>
      )}

      {/* Seskupené varianty (A, B, ... nebo číselné) */}
      {groupedKeysSorted.map(group => {
        const defs = grouped[group];
        const uniqueDefsMap = new Map();
        defs.forEach(def => { if (def.variantaVady && !uniqueDefsMap.has(def.variantaVady)) uniqueDefsMap.set(def.variantaVady, def); });
        const uniqueDefs = Array.from(uniqueDefsMap.values());
        const sortedDefs = uniqueDefs.slice().sort(naturalVariantSort);
        const seen = new Set();
        const subvariantLabels = sortedDefs.filter(def => {
          if (!def.variantaVady || def.variantaVady.length === 1 || /^\d+$/.test(def.variantaVady) || seen.has(def.variantaVady)) return false;
          seen.add(def.variantaVady);
          return true;
        }).map(d => ({ label: getSubvariantHeadingLabel(d.variantaVady), bold: !!d.tucneVSeznamu }));
        const hasSubvariants = subvariantLabels.some(s => s.label.includes("."));
        const subvariantTitle = hasSubvariants ? "Obsahuje podvarianty a subvarianty" : "Obsahuje podvarianty";
        const isNumericGroup = group === "__numeric__";
        const numericNums = isNumericGroup
          ? sortedDefs.map(d => parseInt(d.variantaVady, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b)
          : [];
        const numericRangeLabel = numericNums.length > 0
          ? (numericNums.length === 1 ? `${numericNums[0]}` : `${numericNums[0]} - ${numericNums[numericNums.length - 1]}`)
          : "";
        const mainDef = sortedDefs.find(def => def.variantaVady && (def.variantaVady.length === 1 || /^\d+$/.test(def.variantaVady)));
        const typVarianty = mainDef?.typVarianty || "";
        const heading = isNumericGroup ? (
          <>
            <span className="variant-subtitle-prefix">{numericNums.length === 1 ? "Varianta" : "Varianty"}</span>
            <span className="variant-subtitle-name">{numericRangeLabel}</span>
          </>
        ) : (
          <>
            <span className="variant-subtitle-prefix">Varianta</span>
            <span className="variant-subtitle-name">{group}</span>
          </>
        );
        return (
          <section key={group} aria-labelledby={`${variantsHeadingBaseId}-${group}`}>
            <h3 id={`${variantsHeadingBaseId}-${group}`} className="variant-subtitle">
              {heading}
              {isEditingAll && isAdmin && mainDef ? (
                <>
                  <span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span>
                  <input type="text" className="variant-typ-edit-input" defaultValue={typVarianty} placeholder="typ varianty…" id={`typVarianty-input-${group}`} />
                  <button
                    className="ktf-btn-check"
                    title="Uložit typ varianty"
                    style={{ marginLeft: "4px", verticalAlign: "middle" }}
                    onClick={() => {
                      const val = document.getElementById(`typVarianty-input-${group}`)?.value ?? "";
                      saveDefectEdit(mainDef._id || mainDef.idVady, { ...mainDef, typVarianty: val });
                    }}
                  >✓</button>
                </>
              ) : (
                typVarianty && <><span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span><span className="variant-type">{typVarianty}</span></>
              )}
            </h3>
            {subvariantLabels.length > 0 && (
              <div className="variant-group-info">
                <span className="variant-group-info-icon" title={subvariantTitle}>
                  <img src="/img/ico_podvarianty.png" alt="info" className="variant-group-info-icon" />
                </span>
                <span className="variant-group-info-text">
                  {subvariantTitle}: {subvariantLabels.map((s, i) => (
                    <span key={s.label + i}>{i > 0 && ", "}{s.bold ? <strong>{s.label}</strong> : s.label}</span>
                  ))}
                </span>
              </div>
            )}
            <div className="variants">
              {defs.slice().sort(compareVariantsWithBracket).map((def, i) => renderVariantBox(def, i, `var-${group}`))}
            </div>
          </section>
        );
      })}

      {/* Plus varianty (s čárkou v názvu) */}
      {plusVariantsOrdered.length > 0 && (
        <section aria-labelledby={`${variantsHeadingBaseId}-plus`}>
          {(() => {
            const plusVariantLabel = plusVariantsOrdered[0]?.variantaVady || "";
            const isPlural = plusVariantLabel.includes(",");
            const mainPlusDef = plusVariantsOrdered.find(def => def?.variantaVady) || plusVariantsOrdered[0];
            const plusTypVarianty = mainPlusDef?.typVarianty || "";
            return (
              <h3 id={`${variantsHeadingBaseId}-plus`} className="variant-subtitle">
                <span className="variant-subtitle-prefix">{isPlural ? "Varianty" : "Varianta"}</span>
                <span className="variant-subtitle-name">{plusVariantLabel}</span>
                {isEditingAll && isAdmin && mainPlusDef ? (
                  <>
                    <span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span>
                    <input type="text" className="variant-typ-edit-input" defaultValue={plusTypVarianty} placeholder="typ varianty…" id="typVarianty-input-plus" />
                    <button
                      className="ktf-btn-check"
                      title="Uložit typ varianty"
                      style={{ marginLeft: "4px", verticalAlign: "middle" }}
                      onClick={() => {
                        const val = document.getElementById("typVarianty-input-plus")?.value ?? "";
                        saveDefectEdit(mainPlusDef._id || mainPlusDef.idVady, { ...mainPlusDef, typVarianty: val });
                      }}
                    >✓</button>
                  </>
                ) : (
                  plusTypVarianty && <><span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span><span className="variant-type">{plusTypVarianty}</span></>
                )}
              </h3>
            );
          })()}
          <div className="variants">
            {plusVariantsOrdered.map((def, idx) => renderVariantBox(def, idx, "plusvar"))}
          </div>
        </section>
      )}
    </>
  );
});

export default VariantList;

// Komponenta VariantList zobrazuje seznam variant (deskových vad) u dané známky.
// V admin edit módu umožňuje editaci všech polí variant přes kontrolovaný stav.
// Přes ref (useImperativeHandle) vystavuje metodu saveAll() pro hromadné uložení z rodiče.

import React, { useState, useEffect, useLayoutEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { Fancybox } from "@fancyapps/ui";
import { CornerDownRight } from "lucide-react";
import VariantTooltip from "./VariantTooltip.jsx";
import { formatDefectDescription, formatPopisWithAll } from "../utils/formatovaniTextu.jsx";
import { naturalVariantSort, compareVariantsWithBracket } from "../utils/katalog.js";
import { formatVariantLocationDisplay } from "../utils/formatovaniUdaju.js";

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

function isSharedVariantLabel(label) {
  return String(label || "").includes(",");
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
    || (edits.skupinaVarianty ?? "") !== (def.skupinaVarianty || "")
    || (edits.typVarianty ?? "") !== (def.typVarianty || "")
    || (edits.umisteniVady ?? "") !== (def.umisteniVady || "")
    || (edits.popisVady ?? "") !== (def.popisVady || "")
    || (edits.obecnyPopisVarianty ?? "") !== (def.obecnyPopisVarianty || "")
    || (edits.obrazekVady ?? "") !== (def.obrazekVady || "")
    || nextOrder !== currentOrder
    || !!edits.tucneVSeznamu !== !!def.tucneVSeznamu
    || !!edits.mam !== !!def.mam
  );
}

function getDefectKey(def) {
  return def._id?.toString() || def.idVady || `${def.variantaVady || ""}||${def.umisteniVady || ""}`;
}

function makeVariantGroupKey(variant, context) {
  const normalizedContext = String(context || "").trim();
  return normalizedContext ? `${variant}|${encodeURIComponent(normalizedContext)}` : variant;
}

function splitVariantGroupKey(groupKey) {
  const separator = String(groupKey).indexOf("|");
  if (separator < 0) return { variant: String(groupKey), context: "" };
  return {
    variant: String(groupKey).slice(0, separator),
    context: decodeURIComponent(String(groupKey).slice(separator + 1)),
  };
}

function compareVariantGroupKeys(a, b) {
  const left = splitVariantGroupKey(a);
  const right = splitVariantGroupKey(b);
  if (Boolean(left.context) !== Boolean(right.context)) return left.context ? 1 : -1;
  if (left.context && right.context) {
    const contextOrder = left.context.localeCompare(right.context, undefined, { numeric: true, sensitivity: "base" });
    if (contextOrder !== 0) return contextOrder;
  }
  if (left.variant === "__general__" && right.variant !== "__general__") return -1;
  if (right.variant === "__general__" && left.variant !== "__general__") return 1;
  if (left.variant === "__numeric__") return right.variant === "__numeric__" ? left.context.localeCompare(right.context) : 1;
  if (right.variant === "__numeric__") return -1;
  return left.variant.toUpperCase().localeCompare(right.variant.toUpperCase());
}

function isExcludedFromA(def, excludedList) {
  const key = getDefectKey(def);
  const legacyKey = def?.variantaVady || "";
  return excludedList.includes(key) || (legacyKey && excludedList.includes(legacyKey));
}

const SPLIT_REGEX = /\[\[\s*\.{3}\s*\]\]/;
const NO_IMAGE = "/img/no-image.png";
// Podoba popisku pod obrázkem varianty: "hidden" (A 1), "plain" (A obr. 1), "brackets" (A (obr.) 1).
const IMAGE_LABEL_MODE = "hidden";

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
      <div className="variant-popis-detail">
        <span className="variant-popis-short">{formatDefectDescription(before, { boldBracket: !!tucneVSeznamu })}</span>
        <VariantTooltip tooltip={<span className="variant-tooltip-content">{formatDefectDescription(after, { boldBracket: !!tucneVSeznamu })}</span>}>
          …
        </VariantTooltip>
      </div>
    );
  }
  const rendered = formatDefectDescription(descriptionText, { boldBracket: !!tucneVSeznamu });
  if (typeof descriptionText === "string" && descriptionText.length > 500) {
    return (
      <div className="variant-popis-detail">
        <span className="variant-popis-short variant-popis-clamped">{rendered}</span>
        <VariantTooltip tooltip={<div className="variant-tooltip-content">{rendered}</div>}>…</VariantTooltip>
      </div>
    );
  }
  return <div className="variant-popis-detail">{rendered}</div>;
}

export function VariantEditHelp() {
  return (
    <div className="ktf-tip-wrap" role="note" aria-label="Nápověda k editaci variant">
      <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
      <div className="ktf-tip-box ktf-tip-box-bulleted">
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Prázdná varianta = obecné znaky.</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Skupina: stejné číslo spojí související vady do jednoho bloku; jiné číslo vytvoří oddělený blok. Prázdné = bez skupiny.</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line"><code>*čn</code> = (část nákladu)</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line"><code>&apos;text&apos;</code> → šedé zvýraznění</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Vlož <code>{"[[...]]"}</code> kde chceš schovat text, před ní bude text vidět hned a text za ní se zobrazí jen po přejetí myší (…)</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line ktf-tip-line-plain">V adrese obrázku varianty:</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line ktf-tip-line-plain ktf-tip-line-indent"><strong><code>_</code></strong> na začátku názvu obrázku = čárkovaný obrázek</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line ktf-tip-line-plain ktf-tip-line-indent"><strong><code>!</code></strong> na začátku adresy = čárkovaný box (vykřičník je jen značka v adrese, název souboru ho neobsahuje)</span>
        <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line ktf-tip-line-plain ktf-tip-line-indent"><strong><code>(n/a)</code></strong> na konci adresy = trvale nedostupný obrázek</span>
      </div>
    </div>
  );
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
  sharedVariantPositions = {},
  onSharedVariantPositionChange,
  onSharedVariantPositionSave,
  variantGroupHeadings = {},
  onVariantGroupHeadingChange,
  onVariantGroupHeadingSave,
  variantGroupAccentColors = {},
  onVariantGroupAccentColorChange,
  saveDefectEdit,
  deleteDefect,
  onSaveInheritedMam,
  onExcludeChange,
}, ref) {
  const variantGroupsRef = useRef(null);
  const [previewGroupAccentColors, setPreviewGroupAccentColors] = useState({});

  // Kontrolovaný stav pro editaci polí každé varianty
  const buildInitialEdits = (defects) =>
    Object.fromEntries((defects || []).map(def => [
      getDefectKey(def),
      {
        variantaVady: def.variantaVady || "",
        skupinaVarianty: def.skupinaVarianty || "",
        typVarianty: def.typVarianty || "",
        umisteniVady: def.umisteniVady || "",
        popisVady: def.popisVady || "",
        obecnyPopisVarianty: def.obecnyPopisVarianty || "",
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
            skupinaVarianty: def.skupinaVarianty || "",
            typVarianty: def.typVarianty || "",
            umisteniVady: def.umisteniVady || "",
            popisVady: def.popisVady || "",
            obecnyPopisVarianty: def.obecnyPopisVarianty || "",
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

  const clearDirtyKey = (key) => {
    setDirtyKeys(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const saveVariantType = async (def) => {
    const key = getDefectKey(def);
    const edits = defectEdits[key] || {};
    const saved = await saveDefectEdit(def._id || def.idVady, {
      ...def,
      ...edits,
      typVarianty: edits.typVarianty ?? def.typVarianty ?? "",
    });
    if (saved) clearDirtyKey(key);
  };

  const saveCheckboxChangeImmediately = async (def, key, edits, field, value) => {
    const nextEdits = { ...edits, [field]: value };

    if (def.__inheritedFromA) {
      if (!isViewingBVariant || field !== "mam") return;
      const saved = await onSaveInheritedMam(def, value);
      if (saved) clearDirtyKey(key);
      return;
    }

    const defectId = def._id || def.idVady;
    if (!defectId) return;

    const saved = await saveDefectEdit(defectId, {
      ...def,
      variantaVady: nextEdits.variantaVady,
      skupinaVarianty: nextEdits.skupinaVarianty,
      typVarianty: nextEdits.typVarianty,
      umisteniVady: nextEdits.umisteniVady,
      popisVady: nextEdits.popisVady,
      obecnyPopisVarianty: nextEdits.obecnyPopisVarianty,
      obrazekVady: nextEdits.obrazekVady,
      poradiVady: normalizeDefectOrderForSave(nextEdits.poradiVady),
      tucneVSeznamu: nextEdits.tucneVSeznamu,
      mam: nextEdits.mam,
    }, { silent: true });

    if (saved) clearDirtyKey(key);
  };

  // Seskupení variant
  const grouped = {};
  const plusVariants = [];
  const sharedVariantsByLabel = new Map();
  (effectiveDefects || []).forEach(def => {
    const variantValue = String(def.variantaVady || "").trim();
    if (!variantValue) {
      const groupKey = makeVariantGroupKey("__general__", def.skupinaVarianty);
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(def);
      return;
    }
    if (variantValue.includes(",")) {
      plusVariants.push(def);
      const label = variantValue.split(",").map(part => part.trim()).filter(Boolean).join(", ");
      const key = makeVariantGroupKey(label, def.skupinaVarianty);
      if (!sharedVariantsByLabel.has(key)) sharedVariantsByLabel.set(key, { key, label, defs: [] });
      sharedVariantsByLabel.get(key).defs.push(def);
      return;
    }
    const isNum = /^\d+$/.test(variantValue);
    const lk = !isNum && variantValue.match(/^([A-Z])/i);
    const baseGroupKey = isNum ? "__numeric__" : (lk ? lk[0] : "?");
    const groupKey = makeVariantGroupKey(baseGroupKey, def.skupinaVarianty);
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(def);
  });
  const groupedKeysSorted = Object.keys(grouped).sort(compareVariantGroupKeys);
  const sharedVariantGroupsOrdered = Array.from(sharedVariantsByLabel.values());
  const sharedVariantSlots = new Map();
  sharedVariantGroupsOrdered.forEach(group => {
    const position = sharedVariantPositions[group.key] || sharedVariantPositions[group.label] || "after";
    const match = position.match(/^(before|after):(.+)$/);
    const targetIndex = match
      ? groupedKeysSorted.findIndex(groupKey => compareVariantGroupKeys(groupKey, match[2]) === 0)
      : -1;
    const slot = position === "before"
      ? 0
      : match && targetIndex >= 0
        ? targetIndex + (match[1] === "after" ? 1 : 0)
        : groupedKeysSorted.length;
    const groupsAtSlot = sharedVariantSlots.get(slot) || [];
    groupsAtSlot.push(group);
    sharedVariantSlots.set(slot, groupsAtSlot);
  });
  const allVariantsOrdered = [];
  for (let slot = 0; slot <= groupedKeysSorted.length; slot += 1) {
    (sharedVariantSlots.get(slot) || []).forEach(group => allVariantsOrdered.push(...group.defs));
    if (slot < groupedKeysSorted.length) {
      allVariantsOrdered.push(...grouped[groupedKeysSorted[slot]].slice().sort(compareVariantsWithBracket));
    }
  }
  const getImageNumber = (def) => { const idx = allVariantsOrdered.indexOf(def); return idx === -1 ? "?" : idx + 1; };

  useLayoutEffect(() => {
    const container = variantGroupsRef.current;
    if (!container) return undefined;

    let frame = 0;
    const equalizeGroupHeaders = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sections = Array.from(container.children);
        const rows = new Map();

        sections.forEach(section => {
          const header = section.querySelector(".variant-group-header");
          if (!header) return;
          header.style.minHeight = "";
        });

        sections.forEach(section => {
          const header = section.querySelector(".variant-group-header");
          if (!header) return;
          const rowTop = Math.round(section.getBoundingClientRect().top);
          const row = rows.get(rowTop) || [];
          row.push(header);
          rows.set(rowTop, row);
        });

        rows.forEach(headers => {
          if (headers.length < 2) return;
          const maxHeight = Math.max(...headers.map(header => header.getBoundingClientRect().height));
          headers.forEach(header => {
            header.style.minHeight = `${maxHeight}px`;
          });
        });

        const captions = Array.from(container.querySelectorAll(".variants > .variant .variant-popis"));
        captions.forEach(caption => {
          caption.style.minHeight = "";
        });

        const captionRows = new Map();
        captions.forEach(caption => {
          const card = caption.closest(".variant");
          if (!card) return;
          const rowTop = Math.round(card.getBoundingClientRect().top);
          const row = captionRows.get(rowTop) || [];
          row.push(caption);
          captionRows.set(rowTop, row);
        });

        captionRows.forEach(rowCaptions => {
          if (rowCaptions.length < 2) return;
          const maxHeight = Math.max(...rowCaptions.map(caption => caption.getBoundingClientRect().height));
          rowCaptions.forEach(caption => {
            caption.style.minHeight = `${maxHeight}px`;
          });
        });
      });
    };

    equalizeGroupHeaders();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(equalizeGroupHeaders);
    observer?.observe(container);
    window.addEventListener("resize", equalizeGroupHeaders);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", equalizeGroupHeaders);
    };
  }, [effectiveDefects, groupedKeysSorted.join("|")]);

  // Fancybox galerie
  const openFancybox = (flatIndex = 0, clickedSrc = "") => {
    if (!allVariantsOrdered.length) return;
    const slides = allVariantsOrdered.map(def => {
      const caption = normalizeVariantTokenForCaption(buildDefectDescriptionWithVariant(def));
      return {
        src: normalizeDefectImageSrc(def.obrazekVady) || NO_IMAGE,
        caption:
          `<div class='fancybox-caption-center'>` +
          `<span class='fancybox-caption-variant'>${formatVariantLocationDisplay(def.umisteniVady) || ""}</span>` +
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
          skupinaVarianty: edits.skupinaVarianty,
          typVarianty: edits.typVarianty,
          umisteniVady: edits.umisteniVady,
          popisVady: edits.popisVady,
          obecnyPopisVarianty: edits.obecnyPopisVarianty,
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
  const inheritedDefectsOrdered = (aStampDefects || []).slice().sort(compareVariantsWithBracket);
  const inheritedDisplayCounts = inheritedDefectsOrdered.reduce((acc, def) => {
    const displayVariant = String(def?.variantaVady || "").trim();
    const displayLocation = formatVariantLocationDisplay(def?.umisteniVady) || "";
    const displayKey = `${displayVariant}||${displayLocation}`;
    acc[displayKey] = (acc[displayKey] || 0) + 1;
    return acc;
  }, {});

  if (!effectiveDefects.length && !isEditingAll) return null;

  const renderGroupDescription = (def, label) => {
    if (!def) return null;
    const key = getDefectKey(def);
    const edits = defectEdits[key] || {};
    const value = edits.obecnyPopisVarianty ?? def.obecnyPopisVarianty ?? "";
    if (isEditingAll && isAdmin && !def.__inheritedFromA) {
      const inputId = `${variantsHeadingBaseId}-description-${key}`;
      return (
        <div className="variant-group-description-edit">
          <label htmlFor={inputId}>Obecný popis varianty {label}</label>
          <div className="edit-field-row">
            <textarea
              id={inputId}
              className="ktf-edit-textarea-long variant-group-description-input"
              rows={3}
              lang="cs-CZ"
              spellCheck
              value={value}
              onChange={(event) => updateEdit(key, "obecnyPopisVarianty", event.target.value)}
            />
            <button
              type="button"
              className="ktf-btn-check"
              title="Uložit obecný popis varianty"
              aria-label="Uložit obecný popis varianty"
              onClick={async () => {
                const saved = await saveDefectEdit(def._id || def.idVady, {
                  ...def,
                  ...edits,
                  poradiVady: normalizeDefectOrderForSave(edits.poradiVady ?? def.poradiVady),
                });
                if (saved) clearDirtyKey(key);
              }}
            >✓</button>
          </div>
        </div>
      );
    }
    return def.obecnyPopisVarianty?.trim()
      ? <div className="variant-group-description" dangerouslySetInnerHTML={{ __html: formatPopisWithAll(def.obecnyPopisVarianty) }} />
      : null;
  };

  // Sdílený render jednoho boxu varianty
  const renderVariantBox = (def, i, keyPrefix) => {
    const key = getDefectKey(def);
    const edits = defectEdits[key] || {};
    const flatIndex = allVariantsOrdered.indexOf(def);
    const { hasImageDashedMarker: isSpecial, isExplicitNoImage, hasBoxDashedMarker: isSpecialBox } = parseDefectImagePathFlags(def.obrazekVady);
    const variantLabelForMam = edits.variantaVady ?? def?.variantaVady;
    const showMamControl = !isSharedVariantLabel(variantLabelForMam);
    const hasMamBottomBorder = isAdmin && showMamControl;
    const displayDescription = buildDefectDescriptionWithVariant(def);
    const { variantToken, descriptionText } = splitLeadingVariantToken(displayDescription);
    const rawVariantLabel = String(def?.variantaVady || "").trim();
    const isSubvariantLabel = rawVariantLabel.length > 1
      && !/^\d+$/.test(rawVariantLabel)
      && !rawVariantLabel.includes(",");
    const isNestedSubvariantLabel = isSubvariantLabel && rawVariantLabel.includes(".");
    const variantLevelClass = !isSubvariantLabel
      ? "variant-label-token-root"
      : isNestedSubvariantLabel
        ? "variant-label-token-nested"
        : "variant-label-token-sub";

    return (
      <div
        key={def.idVady || def._id || `${keyPrefix}-${i}`}
        className={`variant${isSpecialBox ? " variant-special-box" : ""}`}
        style={hasMamBottomBorder ? { borderBottom: `2px solid ${def.mam ? "#16a34a" : "#dc2626"}` } : {}}
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
            <span className="variant-popis-hlavni">{formatVariantLocationDisplay(def.umisteniVady) || ""}</span>
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
                className="variant-edit-inline-input"
                placeholder="https://example.com/obrazek.jpg"
              />
              <input
                type="number"
                value={edits.poradiVady ?? ""}
                onChange={e => updateEdit(key, "poradiVady", e.target.value)}
                className="variant-edit-order-input"
                min="0" step="1"
              />
            </div>
          </div>
        )}
        <div className="variant-label">
          {variantToken && (
            <span className={`variant-label-token ${variantLevelClass}`}>
              {renderVariantToken(variantToken, false)}
            </span>
          )}
          {IMAGE_LABEL_MODE === "brackets" ? (
            <>(<span className="variant-label-prefix">obr.</span>){" "}{getImageNumber(def)}</>
          ) : IMAGE_LABEL_MODE === "plain" ? (
            <><span className="variant-label-prefix">obr.</span>{" "}{getImageNumber(def)}</>
          ) : getImageNumber(def)}
        </div>
        {isEditingAll ? (
          <div>
            <div className="edit-field-row variant-edit-controls-row">
              <label title="Tučně v seznamu podvariant" className="variant-edit-flag-label">
                <b>{"<b>"}</b>
                <input
                  type="checkbox"
                  checked={!!edits.tucneVSeznamu}
                  onChange={e => {
                    const newVal = e.target.checked;
                    updateEdit(key, "tucneVSeznamu", newVal);
                    saveCheckboxChangeImmediately(def, key, edits, "tucneVSeznamu", newVal);
                  }}
                  className="variant-edit-flag-checkbox"
                />
              </label>
              <span className="variant-edit-bracket">[</span>
              <input
                type="text"
                placeholder="Varianta"
                value={edits.variantaVady ?? ""}
                onChange={e => updateEdit(key, "variantaVady", e.target.value)}
                className="variant-edit-inline-input"
              />
              <span className="variant-edit-bracket">]</span>
              {showMamControl ? (
                <label title="Mám tuto variantu" className="variant-edit-flag-label">
                  <span className="variant-edit-check-mark">✓</span>
                  <input
                    type="checkbox"
                    checked={!!edits.mam}
                    onChange={e => {
                      const newVal = e.target.checked;
                      updateEdit(key, "mam", newVal);
                      saveCheckboxChangeImmediately(def, key, edits, "mam", newVal);
                    }}
                    className="variant-edit-flag-checkbox"
                  />
                </label>
              ) : null}
            </div>
            <label className="variant-context-id-row">
              <span>Skupina:</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Číslo skupiny varianty"
                value={edits.skupinaVarianty ?? ""}
                onChange={e => updateEdit(key, "skupinaVarianty", e.target.value.replace(/\D+/g, ""))}
                className="variant-context-id-input"
              />
            </label>
            <textarea
              value={edits.popisVady ?? ""}
              onChange={e => updateEdit(key, "popisVady", e.target.value)}
              rows={5}
              className="variant-edit-description"
              placeholder="Popis vady..."
            />
            <div className="variant-edit-actions">
              <button
                onClick={() => {
                  if (isViewingBVariant && def.__inheritedFromA) { onSaveInheritedMam(def, edits.mam); return; }
                  saveDefectEdit(def._id || def.idVady, {
                    ...def,
                    variantaVady: edits.variantaVady,
                    skupinaVarianty: edits.skupinaVarianty,
                    typVarianty: edits.typVarianty,
                    umisteniVady: edits.umisteniVady,
                    popisVady: edits.popisVady,
                    obecnyPopisVarianty: edits.obecnyPopisVarianty,
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

  const renderSharedVariantGroup = (group, index) => {
    const mainDef = group.defs[0];
    const typeLabel = mainDef?.typVarianty || "";
    const headingId = `${variantsHeadingBaseId}-shared-${index}`;
    const position = sharedVariantPositions[group.key] || sharedVariantPositions[group.label] || "after";
    return (
      <section key={group.key} className="variant-group-shared" aria-labelledby={headingId}>
        <div className="variant-group-header">
          <div className="variant-shared-position-row">
            <h3 id={headingId} className="variant-subtitle">
              <span className="variant-subtitle-prefix">Varianty</span>
              <span className="variant-subtitle-name">{group.label}</span>
              {isEditingAll && isAdmin ? (
                <>
                  <span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span>
                  <input
                    type="text"
                    className="variant-typ-edit-input"
                    value={defectEdits[getDefectKey(mainDef)]?.typVarianty ?? typeLabel}
                    onChange={event => updateEdit(getDefectKey(mainDef), "typVarianty", event.target.value)}
                    placeholder="typ varianty…"
                    id={`typVarianty-input-shared-${index}`}
                  />
                  <button
                    className="ktf-btn-check variant-type-save-button"
                    title="Uložit typ varianty"
                    onClick={() => saveVariantType(mainDef)}
                  >✓</button>
                </>
              ) : (
                typeLabel && <><span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span><span className="variant-type">{typeLabel}</span></>
              )}
            </h3>
            {isEditingAll && isAdmin && (
              <div className="variant-shared-position-control">
                <span>Umístění</span>
                <select
                  className="variant-shared-position-select"
                  value={position}
                  aria-label={`Umístění společné skupiny ${group.label}`}
                  onChange={event => onSharedVariantPositionChange?.(group.key, event.target.value)}
                >
                  {groupedKeysSorted.map(groupKey => (
                    <option key={groupKey} value={`before:${groupKey}`}>
                      Před {groupKey === "__numeric__" ? "číselnými variantami" : groupKey === "?" ? "ostatními variantami" : groupKey}
                    </option>
                  ))}
                  <option value="after">Na konec</option>
                </select>
                <button
                  type="button"
                  className="ktf-btn-check variant-shared-position-save"
                  title={`Uložit umístění společné varianty ${group.label}`}
                  aria-label={`Uložit umístění společné varianty ${group.label}`}
                  onClick={() => onSharedVariantPositionSave?.(group.key, position)}
                >✓</button>
              </div>
            )}
          </div>
          {renderGroupDescription(mainDef, group.label)}
        </div>
        <div className="variants">
          {group.defs.map((def, defectIndex) => renderVariantBox(def, defectIndex, `shared-${index}`))}
        </div>
      </section>
    );
  };
  const sharedVariantSectionByLabel = new Map(
    sharedVariantGroupsOrdered.map((group, index) => [group.key, renderSharedVariantGroup(group, index)])
  );
  const orderedGroupContexts = Array.from(new Set([
    ...groupedKeysSorted.map(groupKey => splitVariantGroupKey(groupKey).context),
    ...sharedVariantGroupsOrdered.map(group => splitVariantGroupKey(group.key).context),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  const firstGroupContext = orderedGroupContexts[0] || "";
  const renderedGroupHeadingContexts = new Set();
  const renderGroupContextHeading = (context) => {
    const groupContext = String(context || "").trim();
    if (!groupContext || renderedGroupHeadingContexts.has(groupContext)) return null;
    renderedGroupHeadingContexts.add(groupContext);
    const groupHeading = String(variantGroupHeadings[groupContext] || "").trim();
    const accentColor = previewGroupAccentColors[groupContext] || variantGroupAccentColors[groupContext] || "#7997bb";
    if (!(isEditingAll && isAdmin) && !groupHeading) return null;

    return (
      <div
        className={`variant-group-context-heading${groupContext !== firstGroupContext ? " variant-group-context-heading-later" : ""}`}
        style={{ borderLeftColor: accentColor }}
      >
        {isEditingAll && isAdmin ? (
          <div className="variant-group-context-heading-edit">
            <input
              type="text"
              className="variant-group-context-heading-input"
              aria-label={`Název skupiny ${groupContext}`}
              value={variantGroupHeadings[groupContext] || ""}
              onChange={event => onVariantGroupHeadingChange?.(groupContext, event.target.value)}
              placeholder="Název skupiny"
            />
            <input
              type="color"
              className="variant-group-accent-preview"
              aria-label={`Náhledová barva akcentu skupiny ${groupContext}, neukládá se`}
              title="Náhled barvy akcentu"
              value={accentColor}
              onChange={event => {
                const color = event.target.value;
                setPreviewGroupAccentColors(prev => ({ ...prev, [groupContext]: color }));
                onVariantGroupAccentColorChange?.(groupContext, color);
              }}
            />
            <button
              type="button"
              className="ktf-btn-check"
              title={`Uložit název skupiny ${groupContext}`}
              aria-label={`Uložit název skupiny ${groupContext}`}
              onClick={() => onVariantGroupHeadingSave?.(groupContext, variantGroupHeadings[groupContext] || "", accentColor)}
            >✓</button>
          </div>
        ) : (
          <span className="variant-group-context-heading-title">{groupHeading}</span>
        )}
      </div>
    );
  };
  const renderSharedVariantSlot = (slot) => (sharedVariantSlots.get(slot) || []).map(group => (
    <React.Fragment key={group.key}>
      {renderGroupContextHeading(splitVariantGroupKey(group.key).context)}
      {sharedVariantSectionByLabel.get(group.key)}
    </React.Fragment>
  ));

  return (
    <>
      {/* Vyloučení zděděných variant z A (jen admin edit, jen pro B) */}
      {isEditingAll && isViewingBVariant && aStampDefects.length > 0 && (
        <div className="ktf-exclude-variants-box">
          <strong>Varianty zděděné z A</strong> — odškrtni ty, které se u B nezobrazí:
          <div className="ktf-exclude-variants-list">
            {inheritedDefectsOrdered.map(def => {
              const displayVariant = String(def?.variantaVady || "").trim();
              const displayLocation = formatVariantLocationDisplay(def?.umisteniVady) || "";
              const displayKey = `${displayVariant}||${displayLocation}`;
              const hasVisibleDuplicate = (inheritedDisplayCounts[displayKey] || 0) > 1;
              const orderValue = def?.poradiVady;
              const hasOrderValue = orderValue !== null && orderValue !== undefined && String(orderValue).trim() !== "";
              const orderSuffix = hasVisibleDuplicate && hasOrderValue ? ` (${orderValue})` : "";

              return (
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
                  {displayVariant}{displayLocation ? ` – ${displayLocation}` : ""}{orderSuffix}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="variant-groups" ref={variantGroupsRef}>
      {renderSharedVariantSlot(0)}
      {/* Seskupené varianty (A, B, ... nebo číselné) */}
      {groupedKeysSorted.map((group, groupIndex) => {
        const groupContext = splitVariantGroupKey(group).context;
        const previousContext = groupIndex > 0 ? splitVariantGroupKey(groupedKeysSorted[groupIndex - 1]).context : "";
        const beginsContextRow = Boolean(groupContext) && groupContext !== previousContext;
        const defs = grouped[group];
        const { variant: displayGroup } = splitVariantGroupKey(group);
        const isGeneralGroup = displayGroup === "__general__";
        const uniqueDefsMap = new Map();
        defs.forEach(def => {
          if (isGeneralGroup || (def.variantaVady && !uniqueDefsMap.has(def.variantaVady))) {
            uniqueDefsMap.set(isGeneralGroup ? getDefectKey(def) : def.variantaVady, def);
          }
        });
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
        const isNumericGroup = displayGroup === "__numeric__";
        const numericNums = isNumericGroup
          ? sortedDefs.map(d => parseInt(d.variantaVady, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b)
          : [];
        const numericRangeLabel = numericNums.length > 0
          ? (numericNums.length === 1 ? `${numericNums[0]}` : `${numericNums[0]} - ${numericNums[numericNums.length - 1]}`)
          : "";
        const mainDef = sortedDefs.find(def => def.variantaVady && (def.variantaVady.length === 1 || /^\d+$/.test(def.variantaVady))) || sortedDefs[0];
        const typVarianty = mainDef?.typVarianty || "";
        const heading = isGeneralGroup ? (
          <span className="variant-subtitle-prefix">Obecné znaky</span>
        ) : isNumericGroup ? (
          <>
            <span className="variant-subtitle-prefix">{numericNums.length === 1 ? "Varianta" : "Varianty"}</span>
            <span className="variant-subtitle-name">{numericRangeLabel}</span>
          </>
        ) : (
          <>
            <span className="variant-subtitle-prefix">Varianta</span>
            <span className="variant-subtitle-name">{displayGroup}</span>
          </>
        );
        return (
          <React.Fragment key={group}>
            {beginsContextRow && <span className="variant-group-context-break" aria-hidden="true" />}
            {beginsContextRow && renderGroupContextHeading(groupContext)}
          <section aria-labelledby={`${variantsHeadingBaseId}-${group}`}>
            <div className="variant-group-header">
              <h3 id={`${variantsHeadingBaseId}-${group}`} className="variant-subtitle">
                {heading}
                {isEditingAll && isAdmin ? (
                  <>
                    <span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span>
                    <input
                      type="text"
                      className="variant-typ-edit-input"
                      value={defectEdits[getDefectKey(mainDef)]?.typVarianty ?? typVarianty}
                      onChange={(event) => updateEdit(getDefectKey(mainDef), "typVarianty", event.target.value)}
                      placeholder="typ varianty…"
                      id={`typVarianty-input-${group}`}
                    />
                    <button
                      className="ktf-btn-check variant-type-save-button"
                      title="Uložit typ varianty"
                      onClick={() => saveVariantType(mainDef)}
                    >✓</button>
                  </>
                ) : (
                  typVarianty && <><span className="variant-type-sep">&nbsp;&ndash;&nbsp;</span><span className="variant-type">{typVarianty}</span></>
                )}
              </h3>
              {subvariantLabels.length > 0 && (
                <div className="variant-group-info">
                  <CornerDownRight className="variant-group-info-icon" size={18} strokeWidth={1.8} aria-label="Podvarianty" role="img" title={subvariantTitle} />
                  <span className="variant-group-info-text">
                    {subvariantTitle}: {subvariantLabels.map((s, i) => (
                      <span key={s.label + i}>{i > 0 && ", "}{s.bold ? <strong>{s.label}</strong> : s.label}</span>
                    ))}
                  </span>
                </div>
              )}
              {renderGroupDescription(mainDef, isGeneralGroup ? "Obecné znaky" : isNumericGroup ? numericRangeLabel : group)}
              {isEditingAll && isAdmin && groupIndex === 0 && <VariantEditHelp />}
            </div>
            <div className="variants">
              {defs.slice().sort(compareVariantsWithBracket).map((def, i) => renderVariantBox(def, i, `var-${group}`))}
            </div>
          </section>
            {renderSharedVariantSlot(groupIndex + 1)}
            </React.Fragment>
        );
      })}
      </div>
    </>
  );
});

export default VariantList;

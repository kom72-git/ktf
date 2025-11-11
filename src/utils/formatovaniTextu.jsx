import React from "react";
import AbbrWithTooltip from "../components/AbbrWithTooltip.jsx";
import ZKRATKY_TOOLTIPY from "../zkratky-tooltips";

// Univerzální formátování popisu: apostrofy → zvýraznění, hranaté závorky → tučně, známé zkratky → tooltip HTML
export function formatPopisWithAll(text) {
  if (!text) return "";
  let s = text.replace(/'([^']+)'/g, '<span class="variant-popis-apostrof">$1</span>');
  s = s.replace(/\[([^\]]+)\]/g, (match, content) => {
    const mainMatch = content.match(/^([A-Z]\d{1,2})([a-z])?$/);
    if (mainMatch) {
      const [, mainPart, suffix] = mainMatch;
      if (suffix) {
        return `<strong>[${mainPart}</strong>${suffix}<strong>]</strong>`;
      }
      return `<strong>[${mainPart}]</strong>`;
    }
    if (/^[a-z]+$/.test(content)) {
      return `<strong>[${content}]</strong>`;
    }
    return `<strong>[${content}]</strong>`;
  });
  const abbrs = Object.keys(ZKRATKY_TOOLTIPY)
    .sort((a, b) => b.length - a.length)
    .map(a => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (abbrs.length > 0) {
    const regex = new RegExp(
      `((?<=^|[\\s\\(\\[\\{{,;:])\\*?(${abbrs.join("|")})(?=[\\s\\)\\]\\}},;:.!?]|$))|\\b\\*?(${abbrs.join("|")})\\b`,
      "g"
    );
    // Marker `*` před zkratkou potlačí tooltip a marker se odstraní
    s = s.replace(regex, (match, _g1, abbr1, abbr2) => {
      const abbr = abbr1 || abbr2;
      if (!abbr) return match;
      if (match.startsWith("*")) {
        return abbr;
      }
      if (ZKRATKY_TOOLTIPY[abbr]) {
        return `<span class=\"ktf-abbr-tooltip-wrapper\"><abbr class=\"ktf-abbr-tooltip-abbr\" title=\"${ZKRATKY_TOOLTIPY[abbr]}\">${abbr}</abbr></span>`;
      }
      return abbr;
    });
  }
  return s;
}

// Pro použití s dangerouslySetInnerHTML: nahradí zkratky za HTML variantu s tooltipem
export function replaceAbbreviationsWithHtml(text) {
  if (!text) return "";
  const abbrs = Object.keys(ZKRATKY_TOOLTIPY)
    .sort((a, b) => b.length - a.length)
    .map(a => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (abbrs.length === 0) return text;
  const regex = new RegExp(
    `((?<=^|[\\s\\(\\[\\{{,;:])\\*?(${abbrs.join("|")})(?=[\\s\\)\\]\\}},;:.!?]|$))|\\b\\*?(${abbrs.join("|")})\\b`,
    "g"
  );
  // Marker `*` před zkratkou potlačí tooltip i v HTML reprezentaci
  return text.replace(regex, (match, _g1, abbr1, abbr2) => {
    const abbr = abbr1 || abbr2;
    if (!abbr) return match;
    if (match.startsWith("*")) {
      return abbr;
    }
    if (ZKRATKY_TOOLTIPY[abbr]) {
      return `<span class="ktf-abbr-tooltip-wrapper"><abbr class="ktf-abbr-tooltip-abbr" title="${ZKRATKY_TOOLTIPY[abbr]}">${abbr}</abbr></span>`;
    }
    return abbr;
  });
}

// Vrátí pole/řetězec s React komponentami tooltipů – používá se ve vykreslovaném textu
export function replaceAbbreviations(text) {
  if (!text) return text;
  const abbrs = Object.keys(ZKRATKY_TOOLTIPY)
    .sort((a, b) => b.length - a.length)
    .map(a => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (abbrs.length === 0) return text;
  const regex = new RegExp(
    `((?<=^|[\\s\\(\\[\\{{,;:])\\*?(${abbrs.join("|")})(?=[\\s\\)\\]\\}},;:.!?]|$))|\\b\\*?(${abbrs.join("|")})\\b`,
    "g"
  );
  const result = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawMatch = match[0];
    const abbr = match[2] || match[3];
    if (!abbr) continue;
    const idx = match.index;
    if (idx > lastIndex) {
      result.push(text.slice(lastIndex, idx));
    }
    // Marker `*` před zkratkou zajistí běžný text bez tooltipu
    if (rawMatch.startsWith("*")) {
      result.push(abbr);
    } else if (ZKRATKY_TOOLTIPY[abbr]) {
      result.push(
        <span style={{ pointerEvents: "auto" }} key={`${idx}-${abbr}`}>
          <AbbrWithTooltip abbr={abbr} title={ZKRATKY_TOOLTIPY[abbr]} />
        </span>
      );
    } else if (match[0]) {
      result.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result.length === 1 ? result[0] : result;
}

// Formátování popisu vady včetně hranatých závorek a apostrofů, vrací React fragment
export function formatDefectDescription(text) {
  if (!text) return text;
  const regex = /^\[([^\]]+)\](.*)/i;
  const match = text.match(regex);

  const formatInnerHtml = (str) => {
    if (!str) return "";
    const withApostrophes = str.replace(/'([^']+)'/g, '<span class="variant-popis-apostrof">$1</span>');
    const withItalics = italicizeCastNakladu(withApostrophes);
    return replaceAbbreviationsWithHtml(withItalics);
  };

  if (match) {
    const bracketContent = match[1];
    const suffixText = formatInnerHtml(match[2]);
    const mainMatch = bracketContent.match(/^([A-Z]\d{1,2})([a-z])?$/);
    if (mainMatch) {
      const [, mainPart, suffix] = mainMatch;
      return (
        <>
          <strong>[{mainPart}</strong>
          {suffix && <span>{suffix}</span>}
          <strong>]</strong>
          <span dangerouslySetInnerHTML={{ __html: suffixText }} />
        </>
      );
    }
    if (/^[a-z]+$/.test(bracketContent)) {
      return (
        <>
          <strong>[{bracketContent}]</strong>
          <span dangerouslySetInnerHTML={{ __html: suffixText }} />
        </>
      );
    }
    return (
      <>
        <strong>[{bracketContent}]</strong>
        <span dangerouslySetInnerHTML={{ __html: suffixText }} />
      </>
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: formatInnerHtml(text) }} />;
}

/*
// --- Autoři obrázků: jednoduchá heuristika pro skloňování titulku ---
// Zachováno pro případné budoucí použití; aktuální UI zobrazuje pouze neutrální label.
const FEMALE_SURNAME_SUFFIX = "ová";

const hasMultipleAuthors = (raw = "") => {
  if (!raw) return false;
  if (raw.includes(";")) return true;
  if (/\)\s*,/.test(raw)) return true;
  if (/\sa\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(raw)) return true;
  const withoutParens = raw.replace(/\([^)]*\)/g, "");
  const commaCount = (withoutParens.match(/,/g) || []).length;
  return commaCount > 1;
};

const isFemaleAuthor = (raw = "") => {
  if (!raw) return false;
  const withoutParens = raw.replace(/\([^)]*\)/g, "");
  const beforeComma = withoutParens.split(",")[0] || "";
  const trimmed = beforeComma.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  const surname = parts[parts.length - 1].replace(/[.,;]+$/, "");
  return surname.toLowerCase().endsWith(FEMALE_SURNAME_SUFFIX);
};

export function resolveAuthorsLabel(raw = "") {
  if (!raw || typeof raw !== "string" || raw.trim() === "") return null;
  if (hasMultipleAuthors(raw)) return "Obrázky poskytli:";
  return isFemaleAuthor(raw) ? "Obrázky poskytla:" : "Obrázky poskytl:";
}
*/

// Skloňování slova „položka“ podle počtu záznamů při použití FILTRŮ či VYHLEDÁVÁNÍ
export function sklonujPolozka(count) {
  if (count === 1) return "položku";
  if (count >= 2 && count <= 4) return "položky";
  return "položek";
}

// --- Varianty: zvýraznění textu „část nákladu“ kurzívou ---
const italicizeCastNakladu = (value = "") =>
  value.replace(/(\(část nákladu\)|část nákladu)/gi, (match, _p1, offset, source) => {
    const before = source.slice(0, offset);
    const after = source.slice(offset + match.length);
    if (before.endsWith("<em>") && after.startsWith("</em>")) {
      return match;
    }
    return `<em>${match}</em>`;
  });


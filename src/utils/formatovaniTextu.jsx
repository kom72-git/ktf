import React from "react";
import AbbrWithTooltip from "../components/AbbrWithTooltip.jsx";
import ZKRATKY_TOOLTIPY from "../zkratky-tooltips";

// Univerzální formátování popisu: apostrofy → zvýraznění, hranaté závorky → tučně, známé zkratky → tooltip HTML
export function formatPopisWithAll(text) {
  if (!text) return "";
  let s = text.replace(/'([^']+)'/g, '<span class="variant-popis-apostrof">$1</span>');
  s = s.replace(/\[([A-Z]\d{1,2})([a-z])?\]/gi, (m, p1, p2) => {
    if (p2) {
      return `<strong>[${p1}</strong>${p2}<strong>]</strong>`;
    }
    return `<strong>[${p1}]</strong>`;
  });
  const abbrs = Object.keys(ZKRATKY_TOOLTIPY)
    .sort((a, b) => b.length - a.length)
    .map(a => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (abbrs.length > 0) {
    const regex = new RegExp(
      `((?<=^|[\\s\\(\\[\\{{,;:])(${abbrs.join("|")})(?=[\\s\\)\\]\\}},;:.!?]|$))|\\b(${abbrs.join("|")})\\b`,
      "g"
    );
    s = s.replace(regex, (match, _g1, abbr1, abbr2) => {
      const abbr = abbr1 || abbr2;
      if (abbr && ZKRATKY_TOOLTIPY[abbr]) {
        return `<span class=\"ktf-abbr-tooltip-wrapper\"><abbr class=\"ktf-abbr-tooltip-abbr\" title=\"${ZKRATKY_TOOLTIPY[abbr]}\">${abbr}</abbr></span>`;
      }
      return match;
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
    `((?<=^|[\\s\\(\\[\\{{,;:])(${abbrs.join("|")})(?=[\\s\\)\\]\\}},;:.!?]|$))|\\b(${abbrs.join("|")})\\b`,
    "g"
  );
  return text.replace(regex, (match, _g1, abbr1, abbr2) => {
    const abbr = abbr1 || abbr2;
    if (abbr && ZKRATKY_TOOLTIPY[abbr]) {
      return `<span class=\"ktf-abbr-tooltip-wrapper\"><abbr class=\"ktf-abbr-tooltip-abbr\" title=\"${ZKRATKY_TOOLTIPY[abbr]}\">${abbr}</abbr></span>`;
    }
    return match;
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
    `((?<=^|[\\s\\(\\[\\{{,;:])(${abbrs.join("|")})(?=[\\s\\)\\]\\}},;:.!?]|$))|\\b(${abbrs.join("|")})\\b`,
    "g"
  );
  const result = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const matchText = match[2] || match[3];
    const abbr = matchText;
    const idx = match.index;
    if (idx > lastIndex) {
      result.push(text.slice(lastIndex, idx));
    }
    if (abbr && ZKRATKY_TOOLTIPY[abbr]) {
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
  const regex = /^\[([A-Z]\d{1,2})([a-z])?\](.*)/i;
  const match = text.match(regex);

  const formatInnerHtml = (str) => {
    if (!str) return "";
    const withApostrophes = str.replace(/'([^']+)'/g, '<span class="variant-popis-apostrof">$1</span>');
    return replaceAbbreviationsWithHtml(withApostrophes);
  };

  if (match) {
    return (
      <>
        <strong>[{match[1]}</strong>
        {match[2] && <span>{match[2]}</span>}
        <strong>]</strong>
        <span dangerouslySetInnerHTML={{ __html: formatInnerHtml(match[3]) }} />
      </>
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: formatInnerHtml(text) }} />;
}

// Skloňování slova „položka“ podle počtu záznamů při použití FILTRŮ či VYHLEDÁVÁNÍ
export function sklonujPolozka(count) {
  if (count === 1) return "položku";
  if (count >= 2 && count <= 4) return "položky";
  return "položek";
}

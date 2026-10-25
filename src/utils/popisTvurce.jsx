// Popis tvůrce: odkazy se zapisují jako [text](https://adresa).
import React from "react";

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderPopis(text) {
  const src = String(text || "");
  const nodes = [];
  let last = 0;
  let match;
  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(src))) {
    if (match.index > last) nodes.push(src.slice(last, match.index));
    nodes.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer nofollow">{match[1]}</a>
    );
    last = match.index + match[0].length;
  }
  if (last < src.length) nodes.push(src.slice(last));
  return nodes;
}

// Text bez zápisu odkazů (pro bublinu a zkracování)
export function plainPopis(text) {
  return String(text || "").replace(LINK_RE, "$1");
}

// Zdroj textu: buď čistá adresa, nebo [název](adresa)
export function parseZdroj(value) {
  const v = String(value || "").trim();
  const m = v.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (m) return { label: m[1], url: m[2] };
  if (/^https?:\/\//i.test(v)) {
    let label = v;
    try { label = new URL(v).hostname.replace(/^www\./, ""); } catch { /* ponechat adresu */ }
    return { label, url: v };
  }
  return null;
}

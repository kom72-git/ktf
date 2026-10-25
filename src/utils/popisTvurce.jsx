// Popis tvůrce: odkazy [text](https://adresa) a značky <b> <strong> <i> <em> <u> <sup> <sub> <br />.
import React from "react";

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const TAG_RE = /<\/?(?:b|strong|i|em|u|sup|sub)\s*>|<br\s*\/?>/gi;
const TOKEN_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|<br\s*\/?>|<(\/?)(b|strong|i|em|u|sup|sub)\s*>/gi;
const TAG_NAMES = { b: "strong", strong: "strong", i: "em", em: "em", u: "u", sup: "sup", sub: "sub" };

export function renderPopis(text) {
  const src = String(text || "");
  const root = { tag: null, children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const closeTop = () => {
    const n = stack.pop();
    top().children.push(n);
  };
  let last = 0;
  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(src))) {
    if (match.index > last) top().children.push(src.slice(last, match.index));
    if (match[4]) {
      const name = match[4].toLowerCase();
      if (!match[3]) {
        stack.push({ tag: TAG_NAMES[name], name, children: [] });
      } else {
        const idx = stack.map((n) => n.name).lastIndexOf(name);
        if (idx > 0) {
          while (stack.length > idx + 1) closeTop();
          closeTop();
        }
      }
    } else if (match[1]) {
      top().children.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer nofollow">{match[1]}</a>
      );
    } else {
      top().children.push({ tag: "br", children: [] });
    }
    last = match.index + match[0].length;
  }
  if (last < src.length) top().children.push(src.slice(last));
  while (stack.length > 1) closeTop();
  const build = (children, prefix) =>
    children.map((c, i) => {
      if (c && c.tag === "br") return <br key={`${prefix}${i}`} />;
      if (c && c.tag) {
        const Tag = c.tag;
        return <Tag key={`${prefix}${i}`}>{build(c.children, `${prefix}${i}-`)}</Tag>;
      }
      return c;
    });
  return build(root.children, "n");
}

// Text bez zápisu odkazů a značek (pro bublinu a zkracování)
export function plainPopis(text) {
  return String(text || "").replace(LINK_RE, "$1").replace(TAG_RE, (m) => (/^<br/i.test(m) ? " " : ""));
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

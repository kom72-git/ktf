// Popis tvůrce: odkazy [text](https://adresa) a značky <b> <strong> <i> <em> <u> <sup> <sub> <br />.
import React, { useEffect, useRef } from "react";

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

// Více zdrojů: každý na vlastním řádku
export function parseZdroje(value) {
  return String(value || "").split(/\r?\n/).map(parseZdroj).filter(Boolean);
}

// Odkazy na zdroje oddělené čárkou
export function renderZdroje(value) {
  const list = parseZdroje(value);
  const groups = new Map();
  list.forEach((source, index) => {
    let domain;
    try {
      domain = new URL(source.url).hostname.replace(/^www\./i, "");
    } catch {
      domain = `${source.label}-${index}`;
    }
    const group = groups.get(domain) || [];
    group.push(source);
    groups.set(domain, group);
  });

  return Array.from(groups, ([domain, sources], i) => (
    <React.Fragment key={domain}>
      {i > 0 && ", "}
      {sources.length === 1 ? (
        <a href={sources[0].url} target="_blank" rel="noopener noreferrer nofollow">{sources[0].label}</a>
      ) : (
        <SourceGroup key={domain} domain={domain} sources={sources} />
      )}
    </React.Fragment>
  ));
}

function SourceGroup({ domain, sources }) {
  const detailsRef = useRef(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!details.contains(event.target)) details.open = false;
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && details.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details className="author-source-group" ref={detailsRef}>
      <summary>{domain} ({sources.length})</summary>
      <div className="author-source-links">
        {sources.map((source, index) => {
          let label = source.label;
          try {
            const url = new URL(source.url);
            const path = `${url.pathname}${url.search}${url.hash}`;
            if (!source.customLabel) label = `...${path}`;
          } catch {
            label = source.url;
          }
          return (
            <a key={`${source.url}-${index}`} href={source.url} title={source.url} target="_blank" rel="noopener noreferrer nofollow">{label}</a>
          );
        })}
      </div>
    </details>
  );
}

// Zdroj textu: buď čistá adresa, nebo [název](adresa)
export function parseZdroj(value) {
  const v = String(value || "").trim();
  const m = v.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (m) return { label: m[1], url: m[2], customLabel: true };
  if (/^https?:\/\//i.test(v)) {
    let label = v;
    try { label = new URL(v).hostname.replace(/^www\./, ""); } catch { /* ponechat adresu */ }
    return { label, url: v, customLabel: false };
  }
  return null;
}

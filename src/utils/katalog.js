// Pomocné funkce pro práci s katalogem a variantami

// Odstraní vícenásobné mezery a trim
function normalizeCatalogPrefix(value) {
  return value.trim().replace(/\s+/g, " ");
}

function parseCatalogNumber(katalogCislo) {
  const fromString = String(katalogCislo || "").trim();
  const match = fromString.match(/^([\s\S]*?)(\d+)([A-Za-z]*)$/);
  if (!match) {
    return {
      prefix: normalizeCatalogPrefix(fromString),
      number: NaN,
      suffix: "",
      original: fromString,
    };
  }
  const rawPrefix = match[1] || "";
  const rawNumber = match[2] || "0";
  const rawSuffix = match[3] || "";
  return {
    prefix: normalizeCatalogPrefix(rawPrefix),
    number: Number(rawNumber),
    suffix: rawSuffix.toUpperCase(),
    original: fromString,
  };
}

// ŘAZENÍ KATALOGOVÝCH ČÍSEL A VARIANT
// Řadí podle prefixu (před číslem), pak varianty (sufix za číslem: A/B etc.), a potom čísla.
export function katalogSort(a, b) {
  const getKat = (x) => {
    if (typeof x === "string") return x;
    if (x && typeof x === "object") return x.katalogCislo || "";
    return "";
  };

  const katA = getKat(a);
  const katB = getKat(b);
  const parsedA = parseCatalogNumber(katA);
  const parsedB = parseCatalogNumber(katB);

  const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, undefined, {
    sensitivity: "base",
    numeric: true,
  });
  if (prefixCompare !== 0) return prefixCompare;

  // Nejprve řadíme podle varianty (sufix A/B); pokud u obou není sufix, pokračujeme na číslo.
  const hasSuffixA = parsedA.suffix !== "";
  const hasSuffixB = parsedB.suffix !== "";
  if (hasSuffixA !== hasSuffixB) {
    return hasSuffixA ? 1 : -1;
  }

  if (parsedA.suffix !== parsedB.suffix) {
    if (!parsedA.suffix) return -1;
    if (!parsedB.suffix) return 1;
    const suffixCompare = parsedA.suffix.localeCompare(parsedB.suffix, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    if (suffixCompare !== 0) return suffixCompare;
  }

  if (parsedA.number !== parsedB.number) {
    // Pokud chceme, aby varianty zůstaly seskupeny: součet se pochytá v sufixu, pak teprve v čísle.
    return parsedA.number - parsedB.number;
  }

  // Fallback přes celý text
  return parsedA.original.localeCompare(parsedB.original, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

// Přirozené řazení variant typu A, A1, A1.1 …
export function naturalVariantSort(a, b) {
  const va = a?.variantaVady || "";
  const vb = b?.variantaVady || "";
  const parse = value => {
    const str = String(value);
    // Čistě číselná varianta: 1, 2, 10, 11 ...
    if (/^\d+$/.test(str)) return ['\x00', parseInt(str, 10), null];
    const match = str.match(/^([A-Z])([0-9]+)?(?:\.([0-9]+))?/i);
    if (!match) return [str, 0, null];
    return [match[1], match[2] ? parseInt(match[2], 10) : 0, match[3] ? parseInt(match[3], 10) : null];
  };
  const [la, na, sa] = parse(va);
  const [lb, nb, sb] = parse(vb);
  if (la !== lb) return la.localeCompare(lb);
  if (na !== nb) return na - nb;
  if (sa === null && sb !== null) return -1;
  if (sa !== null && sb === null) return 1;
  if (sa !== null && sb !== null) return sa - sb;
  return 0;
}

// Vrací hodnotu z hranatých závorek na začátku popisu (pokud existuje)
export function extractBracketOrder(defect) {
  const popis = defect?.popisVady;
  if (!popis) return null;
  const match = popis.match(/^\s*\[([^\]]+)\]/);
  return match ? match[1] : null;
}

// Komparátor variant – nejprve přirozené řazení, poté fallback podle hodnoty v hranatých závorkách
export function compareVariantsWithBracket(a, b) {
  const base = naturalVariantSort(a, b);
  if (base !== 0) return base;
  const orderA = extractBracketOrder(a);
  const orderB = extractBracketOrder(b);
  if (orderA === null && orderB !== null) return 1;
  if (orderA !== null && orderB === null) return -1;
  if (orderA === null && orderB === null) return 0;
  const tokenize = (value) => (
    String(value)
      .match(/[A-Za-z]+|\d+|[^A-Za-z0-9]+/g)
      || []
  );
  const tokensA = tokenize(orderA);
  const tokensB = tokenize(orderB);
  const maxLength = Math.max(tokensA.length, tokensB.length);
  for (let i = 0; i < maxLength; i += 1) {
    const partA = tokensA[i];
    const partB = tokensB[i];
    if (partA === undefined) return -1;
    if (partB === undefined) return 1;
    if (partA === partB) continue;
    const isNumA = /^\d+$/.test(partA);
    const isNumB = /^\d+$/.test(partB);
    if (isNumA && isNumB) {
      const diff = Number(partA) - Number(partB);
      if (diff !== 0) return diff;
      continue;
    }
    const diff = partA.localeCompare(partB, undefined, { sensitivity: "base" });
    if (diff !== 0) return diff;
  }
  return tokensA.length - tokensB.length;
}


// DALŠÍ BLOKY

// Slugování názvů emisí pro použití v URL (HashRouter apod.)
export function emissionToSlug(emise = "") {
  if (!emise) return "";
  return String(emise)
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// Vyhledání původního názvu emise podle slugu
export function slugToEmission(slug, items = []) {
  if (!slug) return null;
  const normalizedSlug = String(slug).toLowerCase();
  if (!Array.isArray(items) || items.length === 0) return null;
  const names = items
    .map(item => {
      if (!item) return null;
      if (typeof item === "string") return item;
      if (typeof item === "object" && item.emise) return item.emise;
      return null;
    })
    .filter(Boolean);
  return names.find(name => emissionToSlug(name) === normalizedSlug) || null;
}

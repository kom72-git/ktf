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

const parseOrderValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const compareObjectIdLike = (a, b) => {
  const idA = String(a?._id || "").trim();
  const idB = String(b?._id || "").trim();
  if (!idA && !idB) return 0;
  if (!idA) return 1;
  if (!idB) return -1;
  return idA.localeCompare(idB, undefined, { sensitivity: "base", numeric: true });
};

// Komparátor variant: nejprve přirozené řazení podle variantaVady,
// při shodě poradiVady (pokud je vyplněné), jinak fallback na pořadí vložení (_id).
export function compareVariantsWithBracket(a, b) {
  const base = naturalVariantSort(a, b);
  if (base !== 0) return base;

  const orderA = parseOrderValue(a?.poradiVady);
  const orderB = parseOrderValue(b?.poradiVady);

  if (orderA !== null && orderB !== null) {
    if (orderA !== orderB) return orderA - orderB;
  } else if (orderA !== null) {
    return -1;
  } else if (orderB !== null) {
    return 1;
  }

  return compareObjectIdLike(a, b);
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
      if (typeof item === "object") {
        const group = typeof item.emiseSkupina === "string" ? item.emiseSkupina.trim() : "";
        if (group) return group;
        if (item.emise) return item.emise;
      }
      return null;
    })
    .filter(Boolean);
  return names.find(name => emissionToSlug(name) === normalizedSlug) || null;
}

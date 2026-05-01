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
// Řadí primárně podle čísla katalogu (v praxi 3-4 cifry),
// potom podle prefixu (před číslem) a následně podle sufixu (za číslem: A/B ...).
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

  const hasNumberA = Number.isFinite(parsedA.number);
  const hasNumberB = Number.isFinite(parsedB.number);

  if (hasNumberA !== hasNumberB) {
    return hasNumberA ? -1 : 1;
  }

  if (hasNumberA && hasNumberB && parsedA.number !== parsedB.number) {
    return parsedA.number - parsedB.number;
  }

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

// --- Pomocné funkce pro zobrazení katalogových čísel v boxech ---

const CATALOG_DISPLAY_SUFFIX_RE = /^(.*?\d+(?:\/\d+)?)([A-Za-zČŘŽŠĚÚŮ]+(?:\/[A-Za-zČŘŽŠĚÚŮ]+)*)$/i;
export const CATALOG_SUFFIX_SPACING = "\u202F";

export function splitCatalogDisplaySuffix(text) {
  const normalizedText = String(text || "").trim();
  const match = normalizedText.match(CATALOG_DISPLAY_SUFFIX_RE);
  return {
    base: match ? match[1] : normalizedText,
    suffix: match ? match[2] : "",
  };
}

export function getCatalogDisplayParts(stamp) {
  const katalogCislo = String(stamp?.katalogCislo || "").trim();
  const idZnamky = String(stamp?.idZnamky || "").trim();
  const catalogMatch = katalogCislo.match(/^([A-ZČŘŽŠĚÚŮ]+)?\s*([\d/]+)([A-ZČŘŽŠĚÚŮ]*)$/i);
  if (!catalogMatch) {
    return { prefix: "", number: katalogCislo, suffix: "", value: katalogCislo };
  }
  const prefix = (catalogMatch[1] || "").trim();
  const number = catalogMatch[2];
  let suffix = (catalogMatch[3] || "").trim();
  if (!suffix) {
    const idMatch = idZnamky.match(new RegExp(`${number}([A-ZČŘŽŠĚÚŮ]+)$`, "i"));
    if (idMatch) suffix = (idMatch[1] || "").trim().toUpperCase();
  }
  return { prefix, number, suffix, value: `${number}${suffix}` };
}

export function getCatalogBaseKey(stamp) {
  const katalogCislo = String(stamp?.katalogCislo || "").trim();
  const idZnamky = String(stamp?.idZnamky || "").trim();
  const match = katalogCislo.match(/^([A-ZČŘŽŠĚÚŮ]+)?\s*([\d/]+)([A-ZČŘŽŠĚÚŮ]*)$/i);
  if (match) {
    const prefix = (match[1] || "").trim().toUpperCase();
    const number = match[2];
    return `${prefix}|${number}`;
  }
  return `__single__|${idZnamky || katalogCislo}`;
}

export function formatGroupedCatalogText(groupItems) {
  const parsed = groupItems.map(getCatalogDisplayParts).filter(p => p.value);
  if (parsed.length === 0) return "";
  const allSamePrefix = parsed.every(p => p.prefix === parsed[0].prefix);
  if (allSamePrefix && parsed[0].prefix) {
    if (
      parsed.length === 2 &&
      parsed[0].number === parsed[1].number
    ) {
      const suffixes = parsed.map(p => (p.suffix || "").toUpperCase()).sort();
      if (suffixes[0] === "A" && suffixes[1] === "B") {
        return `${parsed[0].prefix} ${parsed[0].number}A/B`;
      }
    }
    const numbers = parsed.map(p => (p.suffix ? p.value : p.number));
    return `${parsed[0].prefix} ${numbers.join(", ")}`;
  }
  return groupItems.map(s => s?.katalogCislo).filter(Boolean).join(", ");
}

export function renderCatalogDisplay(text) {
  const { base, suffix } = splitCatalogDisplaySuffix(text);
  if (!suffix) return text;
  return `${base}${CATALOG_SUFFIX_SPACING}${suffix}`;
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

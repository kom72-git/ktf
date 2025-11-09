// Pomocné funkce pro práci s katalogem a variantami

// ŘAZENÍ KATALOGOVÝCH ČÍSEL A VARIANT
// Řazení katalogových čísel: nejprve číslo, následně písmenkový prefix
export function katalogSort(a, b) {
  const getKat = x => (typeof x === "string" ? x : x.katalogCislo || "");
  const katA = getKat(a);
  const katB = getKat(b);
  const numA = (katA.match(/\d+/) || [""])[0];
  const numB = (katB.match(/\d+/) || [""])[0];
  if (numA !== numB) {
    return Number(numA) - Number(numB);
  }
  const prefixA = katA.replace(numA, "").replace(/\s+/g, "");
  const prefixB = katB.replace(numB, "").replace(/\s+/g, "");
  return prefixA.localeCompare(prefixB);
}

// Přirozené řazení variant typu A, A1, A1.1 …
export function naturalVariantSort(a, b) {
  const va = a?.variantaVady || "";
  const vb = b?.variantaVady || "";
  const parse = value => {
    const match = String(value).match(/^([A-Z])([0-9]+)?(?:\.([0-9]+))?/i);
    if (!match) return [String(value), 0, null];
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

const EXTENSION_RE = /\.[a-z0-9]{2,5}$/i;
const UNAVAILABLE_IMAGE_SUFFIX_RE = /\(n\/a\)\s*$/i;

function hasExplicitExtension(value) {
  return EXTENSION_RE.test(value);
}

// Umozni zadat jen nazev souboru (napr. A2273A-1-1) a automaticky doplni img/rok a .jpg.
export function normalizeStampImagePath(rawValue, stampYear) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return "";

  const isExplicitUnavailable = UNAVAILABLE_IMAGE_SUFFIX_RE.test(raw);
  const value = raw.replace(UNAVAILABLE_IMAGE_SUFFIX_RE, "").trim();
  if (isExplicitUnavailable) {
    return "img/no-img.png";
  }
  if (!value) return "";

  // Externi URL, data URI nebo absolutni cesta mimo img ponechame beze zmen.
  if (/^(https?:|data:)/i.test(value)) {
    return value;
  }

  const cleanedValue = value.replace(/^\/+/, "");

  // Pokud uz je vyplnena cesta se slozkami, jen doplnime pripadnou koncovku.
  if (cleanedValue.includes("/")) {
    const parts = cleanedValue.split("/");
    const last = parts[parts.length - 1] || "";
    if (!last || hasExplicitExtension(last)) {
      return cleanedValue;
    }
    return `${cleanedValue}.jpg`;
  }

  // Shorthand bez cesty: slozime img/rok/soubor[.ext].
  const year = String(stampYear ?? "").trim();
  const fileName = hasExplicitExtension(cleanedValue) ? cleanedValue : `${cleanedValue}.jpg`;
  if (/^\d{4}$/.test(year)) {
    return `img/${year}/${fileName}`;
  }
  return `img/${fileName}`;
}

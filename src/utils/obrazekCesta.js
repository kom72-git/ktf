const EXTENSION_RE = /\.[a-z0-9]{2,5}$/i;

function hasExplicitExtension(value) {
  return EXTENSION_RE.test(value);
}

// Umozni zadat jen nazev souboru (napr. A2273A-1-1) a automaticky doplni img/rok a .jpg.
export function normalizeStampImagePath(rawValue, stampYear) {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";

  // Externi URL, data URI nebo absolutni cesta mimo img ponechame beze zmen.
  if (/^(https?:|data:)/i.test(value)) {
    return value;
  }

  // Pokud uz je vyplnena cesta se slozkami, jen doplnime pripadnou koncovku.
  if (value.includes("/")) {
    const parts = value.split("/");
    const last = parts[parts.length - 1] || "";
    if (!last || hasExplicitExtension(last)) {
      return value;
    }
    return `${value}.jpg`;
  }

  // Shorthand bez cesty: slozime img/rok/soubor[.ext].
  const year = String(stampYear ?? "").trim();
  const fileName = hasExplicitExtension(value) ? value : `${value}.jpg`;
  if (/^\d{4}$/.test(year)) {
    return `img/${year}/${fileName}`;
  }
  return `img/${fileName}`;
}

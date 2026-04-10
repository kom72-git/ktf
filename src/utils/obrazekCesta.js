const EXTENSION_RE = /\.[a-z0-9]{2,5}$/i;
const UNAVAILABLE_IMAGE_SUFFIX_RE = /\(n\/a\)\s*$/i;

function hasExplicitExtension(value) {
  return EXTENSION_RE.test(value);
}

function normalizeStampImageBase(rawValue, stampYear) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return "";

  const value = raw.replace(UNAVAILABLE_IMAGE_SUFFIX_RE, "").trim();
  if (!value) return "";

  // Externi URL, data URI nebo absolutni cesta mimo img ponechame beze zmen.
  if (/^(https?:|data:)/i.test(value)) {
    return value;
  }

  const cleanedValue = value.replace(/^\/+/, "");

  // Pokud uz je vyplnena cesta se slozkami, jen doplnime pripadnou koncovku.
  if (cleanedValue.includes("/")) {
    const withImgPrefix = /^img\//i.test(cleanedValue)
      ? cleanedValue
      : (/^\d{4}\//.test(cleanedValue) ? `img/${cleanedValue}` : cleanedValue);
    const parts = withImgPrefix.split("/");
    const last = parts[parts.length - 1] || "";
    if (!last || hasExplicitExtension(last)) {
      return withImgPrefix;
    }
    return `${withImgPrefix}.jpg`;
  }

  // Shorthand bez cesty: slozime img/rok/soubor[.ext].
  const year = String(stampYear ?? "").trim();
  const fileName = hasExplicitExtension(cleanedValue) ? cleanedValue : `${cleanedValue}.jpg`;
  if (/^\d{4}$/.test(year)) {
    return `img/${year}/${fileName}`;
  }
  return `img/${fileName}`;
}

// Normalizace pro ulozeni do DB: zachova explicitni suffix (n/a), aby bylo mozne
// v editaci videt puvodni hodnotu a stale rozpoznat, ze jde o trvale nedostupny obrazek.
export function normalizeStampImagePathForStorage(rawValue, stampYear) {
  void stampYear;
  return String(rawValue ?? "").trim();
}

// Normalizace pro vykresleni: explicitni suffix (n/a) mapuje na no-img placeholder.
export function normalizeStampImagePath(rawValue, stampYear) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return "";

  if (UNAVAILABLE_IMAGE_SUFFIX_RE.test(raw)) {
    return "img/no-img.png";
  }

  return normalizeStampImageBase(raw, stampYear);
}

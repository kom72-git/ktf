const SITE_ORIGIN = "https://www.filatelium.cz";
const DEFAULT_DESCRIPTION =
  "Katalog československých poštovních známek z let 1945–1992 se studiemi tiskových forem, desek, polí a jejich variant.";

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function setPageMetadata({ title, description = DEFAULT_DESCRIPTION, path = "/", noIndex = false }) {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = new URL(canonicalPath, SITE_ORIGIN).href;

  document.title = title;
  setMeta("name", "description", description);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", "Filatelium");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", canonicalUrl);
  setMeta("name", "twitter:card", "summary");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  const robots = document.head.querySelector('meta[name="robots"]');
  if (noIndex) {
    setMeta("name", "robots", "noindex, nofollow");
  } else {
    robots?.remove();
  }

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
}

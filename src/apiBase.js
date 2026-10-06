// Lokálně (localhost) běží backend na portu 3001, jinde (Vercel, vlastní doména) je API na stejné doméně.
export function getApiBase() {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  const host = window.location.hostname;
  if (host.endsWith("app.github.dev")) return `https://${host}`;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3001";
  return "";
}

export function apiFetch(url, options = {}) {
  return fetch(url, { ...options, credentials: options.credentials ?? "include" });
}

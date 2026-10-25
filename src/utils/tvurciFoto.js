// "Václav Fajt" -> /img/tvurci/fajt_vaclav.jpg
export function autoFoto(name) {
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!parts.length) return "";
  return `/img/tvurci/${[parts[parts.length - 1], ...parts.slice(0, -1)].join("_")}.jpg`;
}

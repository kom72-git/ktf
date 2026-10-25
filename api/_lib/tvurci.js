import { emissionToSlug } from "../../src/utils/katalog.js";

// Společná logika kolekce "tvurci" pro Vercel (api/tvurci.js) i lokální server.
// Dokument: { slug, jmeno, role: ["navrhar","rytec"], foto, narozen, zemrel, popis, zdroj, zdrojUrl }

const ROLES = ["navrhar", "rytec"];
const TEXT_FIELDS = ["jmeno", "foto", "narozen", "zemrel", "popis", "zdroj", "zdrojUrl"];

export function authorSlug(name) {
  return emissionToSlug(String(name || "").trim());
}

// Vrací { error } nebo { slug, data } připravené k uložení.
export function validateAuthor(body = {}) {
  const jmeno = String(body.jmeno || "").trim();
  if (!jmeno) return { error: "Chybí jméno autora" };
  const slug = authorSlug(jmeno);
  if (!slug) return { error: "Jméno autora je neplatné" };

  const data = {};
  for (const field of TEXT_FIELDS) {
    data[field] = String(body[field] ?? "").trim();
  }
  data.role = Array.isArray(body.role) ? body.role.filter((r) => ROLES.includes(r)) : [];
  return { slug, data };
}

export async function saveAuthor(collection, body) {
  const { error, slug, data } = validateAuthor(body);
  if (error) return { error };
  await collection.updateOne(
    { slug },
    { $set: { ...data, slug, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  return { author: await collection.findOne({ slug }) };
}

// Jména ve známce mohou být oddělena čárkou nebo " a "
export function splitAuthorNames(value) {
  return String(value || "")
    .split(/\s*,\s*|\s+a\s+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

// Role seřazené podle četnosti (při shodě návrhář před rytcem)
export function sortedRoleKeys(roles) {
  return ["navrhar", "rytec"].filter((r) => roles.get(r)).sort((a, b) => roles.get(b) - roles.get(a));
}

// Z veřejných známek sestaví mapu slug -> { name, roles (role -> počet), count }
export function collectAuthors(stamps) {
  const map = new Map();
  const add = (name, role) => {
    const slug = authorSlug(name);
    if (!slug) return;
    const entry = map.get(slug) || { slug, name, roles: new Map(), count: 0 };
    entry.roles.set(role, (entry.roles.get(role) || 0) + 1);
    map.set(slug, entry);
  };
  for (const stamp of stamps) {
    const seen = new Set();
    for (const name of splitAuthorNames(stamp.navrh)) { add(name, "navrhar"); seen.add(authorSlug(name)); }
    for (const name of splitAuthorNames(stamp.rytec)) { add(name, "rytec"); seen.add(authorSlug(name)); }
    seen.forEach((slug) => { const e = map.get(slug); if (e) e.count += 1; });
  }
  return map;
}

const ROLE_NAMES = { navrhar: ["návrhář", "návrhářka"], rytec: ["rytec", "rytkyně"] };
// České ženské příjmení končí na „á"
export function roleLabel(role, name) {
  return ROLE_NAMES[role][/á$/i.test(String(name || "").trim()) ? 1 : 0];
}

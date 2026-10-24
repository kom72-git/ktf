import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { emissionToSlug } from "../src/utils/katalog.js";
import { normalizeStampImagePath } from "../src/utils/obrazekCesta.js";
import { formatDatumVydaniDisplay } from "../src/utils/formatovaniUdaju.js";

// Vrací index.html s doplněnými náhledovými značkami (og:*) pro sdílení odkazů
// (WhatsApp, Facebook apod. nespouštějí JavaScript, čtou jen HTML).

const SITE_URL = "https://www.filatelium.cz";
const MONGODB_URI = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(MONGODB_URI);
  return cachedDb;
}

const publicStampsQuery = {
  $nor: [
    { stav: "interni" },
    { stav: { $exists: false }, isHidden: true }
  ]
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const clean = (value) => String(value ?? "").replace(/[\s\u00a0\u202f]+/g, " ").trim();

function stampMeta(stamp) {
  const parts = [];
  if (stamp.katalogCislo) parts.push(`Katalog ${clean(stamp.katalogCislo)}`);
  if (stamp.datumVydani) parts.push(`vydáno ${clean(formatDatumVydaniDisplay(stamp.datumVydani))}`);
  if (stamp.druhTisku) parts.push(`druh tisku ${clean(stamp.druhTisku)}`);
  if (stamp.navrh) parts.push(`návrh ${clean(stamp.navrh)}`);
  if (stamp.rytec) parts.push(`rytec ${clean(stamp.rytec)}`);
  const shortParts = [];
  if (stamp.katalogCislo) shortParts.push(`Katalog ${clean(stamp.katalogCislo)}`);
  if (stamp.datumVydani) shortParts.push(`vydáno ${clean(formatDatumVydaniDisplay(stamp.datumVydani))}`);
  if (stamp.druhTisku) shortParts.push(clean(stamp.druhTisku));
  const head = `${clean(stamp.emise)} (${stamp.rok}), československá poštovní známka.`;
  return {
    title: `${clean(stamp.emise)} (${stamp.rok}) | Filatelium`,
    shareTitle: `${clean(stamp.emise)} (${stamp.rok})`,
    shareDescription: `${shortParts.join(" · ")}. Studie tiskové formy, polí a variant.`,
    description: `${head} ${parts.length ? `${parts.join(", ")}. ` : ""}Studie tiskové formy, deskových polí a variant.`,
    image: normalizeStampImagePath(stamp.obrazek, stamp.rok),
  };
}

const getEmissionName = (stamp) => {
  const group = typeof stamp.emiseSkupina === "string" ? stamp.emiseSkupina.trim() : "";
  return group || stamp.emise;
};

async function resolveMeta(query) {
  await connectToDatabase();
  const collection = mongoose.connection.db.collection("stamps");

  if (query.type === "detail" && query.id) {
    const stamp = await collection.findOne({ ...publicStampsQuery, idZnamky: String(query.id) });
    return stamp ? { ...stampMeta(stamp), path: `/detail/${query.id}` } : null;
  }

  if (query.type === "emise" && query.slug) {
    const match = String(query.slug).match(/^(.+)-(\d{4})$/);
    const slug = match ? match[1] : String(query.slug);
    const year = match ? match[2] : null;
    const filter = year ? { ...publicStampsQuery, rok: { $in: [year, Number(year)] } } : publicStampsQuery;
    const stamps = await collection.find(filter).toArray();
    const items = stamps.filter(s => emissionToSlug(getEmissionName(s)) === slug);
    if (!items.length) return null;
    const name = clean(getEmissionName(items[0]));
    const first = items[0];
    return {
      title: year ? `${name} (${year}) | Filatelium` : `${name} | Filatelium`,
      shareTitle: year ? `${name} (${year})` : name,
      shareDescription: `Československé poštovní známky${year ? ` z roku ${year}` : ""}: katalogová čísla a varianty.`,
      description: `Československé poštovní známky emise ${name}${year ? ` z roku ${year}` : ""}. Prohlédněte si katalogová čísla a jejich varianty.`,
      image: normalizeStampImagePath(first.obrazek, first.rok),
      path: `/emise/${query.slug}`,
    };
  }

  return null;
}

function injectMeta(html, meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const shareTitle = escapeHtml(meta.shareTitle || meta.title);
  const shareDescription = escapeHtml(meta.shareDescription || meta.description);
  const url = escapeHtml(SITE_URL + meta.path);
  const hasImage = meta.image && !/no-img/.test(meta.image);
  const image = hasImage
    ? escapeHtml(`${SITE_URL}/api/thumb?src=${encodeURIComponent(meta.image)}`)
    : `${SITE_URL}/favicon-192.png`;
  const size = hasImage ? 300 : 192;

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${shareTitle}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${shareDescription}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${shareTitle}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${shareDescription}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/<meta (?:property="og:image(?::width|:height)?"|name="twitter:image")[^>]*>\s*/g, "")
    .replace(/<meta name="twitter:card"[^>]*>/, `<meta name="twitter:card" content="summary" />\n    <meta property="og:image" content="${image}" />\n    <meta property="og:image:width" content="${size}" />\n    <meta property="og:image:height" content="${size}" />\n    <meta name="twitter:image" content="${image}" />`);

  return out;
}

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";

  let html;
  try {
    const response = await fetch(`${proto}://${host}/index.html`);
    html = await response.text();
  } catch (err) {
    console.error("Share: index.html nelze načíst", err);
    return res.status(500).send("Stránku se nepodařilo načíst");
  }

  try {
    const meta = await resolveMeta(req.query || {});
    if (meta) html = injectMeta(html, meta);
  } catch (err) {
    // Při chybě DB se vrátí běžné index.html, aplikace funguje dál.
    console.error("Share error:", err);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
  return res.status(200).send(html);
}

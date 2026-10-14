import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { emissionToSlug } from "../src/utils/katalog.js";

const SITE_URL = "https://www.filatelium.cz";
const PUBLIC_STATIC_PATHS = ["/napoveda", "/kontakt"];
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://<username>:<password>@cluster0.3y2ox5f.mongodb.net/?retryWrites=true&w=majority";
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(MONGODB_URI);
  return cachedDb;
}

// Stejný filtr jako veřejné API: skryje 'interni' a legacy isHidden: true.
const publicStampsQuery = {
  $nor: [
    { stav: 'interni' },
    { stav: { $exists: false }, isHidden: true }
  ]
};

const escapeXml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

// Stejné pravidlo jako v katalogu: publishedAt, jinak čas z MongoDB ObjectId.
function getPublishTime(stamp) {
  if (stamp.publishedAt) {
    const time = new Date(stamp.publishedAt).getTime();
    if (!Number.isNaN(time)) return time;
  }
  const time = parseInt(String(stamp._id).substring(0, 8), 16) * 1000;
  return Number.isNaN(time) ? 0 : time;
}

const toDate = (time) => (time ? new Date(time).toISOString().slice(0, 10) : null);

function buildSitemap(stamps) {
  // Klíč = URL emise; hodnota = nejnovější čas publikace známek v ní.
  const emissionPages = new Map();
  let newest = 0;

  for (const stamp of stamps) {
    const group = typeof stamp.emiseSkupina === "string" ? stamp.emiseSkupina.trim() : "";
    const name = group || stamp.emise;
    const slug = emissionToSlug(name);
    if (!slug || !stamp.rok) continue;

    const path = `/emise/${slug}-${stamp.rok}`;
    const time = getPublishTime(stamp);
    emissionPages.set(path, Math.max(emissionPages.get(path) || 0, time));
    newest = Math.max(newest, time);
  }

  const entries = [
    { path: "/", time: newest },
    ...PUBLIC_STATIC_PATHS.map(path => ({ path, time: 0 })),
  ];
  [...emissionPages.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([path, time]) => entries.push({ path, time }));

  const urls = entries.map(({ path, time }) => {
    const lastmod = toDate(time);
    return [
      "  <url>",
      `    <loc>${escapeXml(SITE_URL + path)}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      "  </url>",
    ].filter(Boolean).join("\n");
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export default async function handler(req, res) {
  try {
    await connectToDatabase();
    const stamps = await mongoose.connection.db
      .collection("stamps")
      .find(publicStampsQuery, { projection: { emise: 1, emiseSkupina: 1, rok: 1, publishedAt: 1 } })
      .toArray();

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(buildSitemap(stamps));
  } catch (err) {
    console.error("Sitemap error:", err);
    return res.status(500).send("Sitemap se nepodařilo vygenerovat");
  }
}

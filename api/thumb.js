import sharp from "sharp";

// Zmenšený obrázek pro náhled při sdílení odkazu (malý čtverec vlevo od textu).
const SIZE = 300;

export default async function handler(req, res) {
  const src = String(req.query?.src || "");
  if (!/^\/img\/[\w\-./ ()%]+\.(jpe?g|png|webp)$/i.test(src) || src.includes("..")) {
    return res.status(400).send("Neplatný obrázek");
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";

  try {
    const response = await fetch(`${proto}://${host}${src}`);
    if (!response.ok) return res.status(404).send("Obrázek nenalezen");
    const input = Buffer.from(await response.arrayBuffer());
    const output = await sharp(input)
      .resize(SIZE, SIZE, { fit: "contain", background: "#ffffff" })
      .jpeg({ quality: 80 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, s-maxage=31536000, max-age=86400, stale-while-revalidate=86400");
    return res.status(200).send(output);
  } catch (err) {
    console.error("Thumb error:", err);
    return res.status(500).send("Obrázek se nepodařilo zmenšit");
  }
}

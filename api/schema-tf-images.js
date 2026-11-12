import path from "node:path";
import { setApiCors } from "./_lib/adminAuth.js";
import { listSchemaTfImagePaths } from "./_lib/schemaTfImages.js";

export default async function handler(req, res) {
  setApiCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Metoda není podporována" });

  try {
    const directory = path.join(process.cwd(), "public", "img", "TF");
    const paths = await listSchemaTfImagePaths(directory);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(paths);
  } catch (error) {
    console.error("Načtení obrázků schémat TF selhalo:", error);
    return res.status(500).json({ error: "Nepodařilo se načíst obrázky schémat TF" });
  }
}

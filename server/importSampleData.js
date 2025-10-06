import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Stamp from "./Stamp.js";

// Získání cesty k sampleData.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataPath = path.resolve(__dirname, "../react-app/src/sampleData.js");

// Načtení sampleData.js jako text
const fileContent = fs.readFileSync(sampleDataPath, "utf-8");
// Extrakce pole sampleData z textu
const match = fileContent.match(/const sampleData = (\[.*\]);/s);
if (!match) {
  console.error("Nepodařilo se najít pole sampleData v sampleData.js");
  process.exit(1);
}
const sampleData = eval(match[1]); // Pozor: eval pouze pro jednorázový import!

const MONGODB_URI = process.env.MONGODB_URI;

async function importData() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Připojeno k MongoDB");

  // Import pouze prvních 3 známek podle pořadí v sampleData.js
  for (const s of sampleData.slice(0, 3)) {
    const stamp = {
      idZnamky: s.id,
      rok: s.year,
      katalogCislo: s.catalogNumber,
      emise: s.emission,
      obrazek: Array.isArray(s.images) ? s.images[0] : s.images,
      datumVydani: s.specs?.find(x => x.label === "Datum vydání")?.value || "",
      navrh: s.specs?.find(x => x.label === "Návrh")?.value || "",
      rytec: s.specs?.find(x => x.label === "Rytec")?.value || "",
      druhTisku: s.specs?.find(x => x.label === "Druh tisku")?.value || "",
      tiskovaForma: s.specs?.find(x => x.label === "Tisková forma")?.value || "",
      zoubkovani: s.specs?.find(x => x.label === "Zoubkování")?.value || "",
      papir: s.specs?.find(x => x.label === "Papír")?.value || "",
      rozmer: s.specs?.find(x => x.label === "Rozměr")?.value || "",
      naklad: s.specs?.find(x => x.label === "Náklad")?.value || "",
      schemaTF: s.specs?.find(x => x.label === "Schéma TF")?.tfImage || "",
      Studie: s.studyNote
      // vady ignorujeme
    };
    await Stamp.deleteOne({ idZnamky: stamp.idZnamky }); // Smazat případný starý záznam podle idZnamky
    await Stamp.create(stamp);
    console.log("Importována známka:", stamp.idZnamky);
  }

  await mongoose.disconnect();
  console.log("Hotovo");
}

importData().catch(err => {
  console.error("Chyba při importu:", err);
  process.exit(1);
});

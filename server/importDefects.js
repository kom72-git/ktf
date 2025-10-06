import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Získání cesty k sampleData.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataPath = path.resolve(__dirname, "../react-app/src/sampleData.js");

// Načtení sampleData.js jako text
const fileContent = fs.readFileSync(sampleDataPath, "utf-8");
const match = fileContent.match(/const sampleData = (\[.*\]);/s);
if (!match) {
  console.error("Nepodařilo se najít pole sampleData v sampleData.js");
  process.exit(1);
}
const sampleData = eval(match[1]);

const MONGODB_URI = process.env.MONGODB_URI;

const DefectSchema = new mongoose.Schema({
  idZnamky: { type: String, required: true },
  idVady: { type: String, required: true, unique: true },
  variantaVady: String,
  umisteniVady: String,
  popisVady: String,
  obrazekVady: String
});

const Defect = mongoose.model("Defect", DefectSchema);

async function importDefects() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Připojeno k MongoDB");

  // Smazat všechny vady před importem
  await Defect.deleteMany({});

  let count = 0;
  let csvRows = [];
  for (const s of sampleData.slice(0, 3)) {
    if (Array.isArray(s.defects)) {
      for (let i = 0; i < s.defects.length; i++) {
        const d = s.defects[i];
        // Generování idVady: cz-1983-01(01), cz-1983-01(02), ...
        const num = String(i + 1).padStart(2, '0');
        const idVady = `${s.id}(${num})`;
        const defect = {
          idZnamky: s.id,
          idVady,
          variantaVady: d.code,
          umisteniVady: d.descriptionText,
          popisVady: d.description,
          obrazekVady: d.image
        };
        await Defect.create(defect);
        csvRows.push(defect);
        count++;
      }
    }
  }
  // Seřadit podle idZnamky a idVady
  csvRows.sort((a, b) => {
    if (a.idZnamky < b.idZnamky) return -1;
    if (a.idZnamky > b.idZnamky) return 1;
    if (a.idVady < b.idVady) return -1;
    if (a.idVady > b.idVady) return 1;
    return 0;
  });
  // Vygenerovat CSV, první sloupec idZnamky, druhý idVady
  const header = "idZnamky,idVady,variantaVady,umisteniVady,popisVady,obrazekVady";
  const csv = [header, ...csvRows.map(d => `${d.idZnamky},${d.idVady},${d.variantaVady},${d.umisteniVady},${d.popisVady},${d.obrazekVady}`)].join("\n");
  fs.writeFileSync(path.resolve(__dirname, "vady.csv"), csv, "utf-8");
  console.log(`Importováno vad: ${count}`);
  await mongoose.disconnect();
  console.log("Hotovo, CSV vygenerováno jako vady.csv");
}

importDefects().catch(err => {
  console.error("Chyba při importu vad:", err);
  process.exit(1);
});

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { isAdminRequest, setApiCors } from "./_lib/adminAuth.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://<username>:<password>@cluster0.3y2ox5f.mongodb.net/?retryWrites=true&w=majority";
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    cachedDb = connection;
    console.log("MongoDB connected for stamps");
    return connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// Dotaz pro veřejné výpisy: skryje 'interni' a legacy isHidden: true.
const publicStampsQuery = {
  $nor: [
    { stav: 'interni' },
    { stav: { $exists: false }, isHidden: true }
  ]
};

export default async function handler(req, res) {
  setApiCors(req, res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: "Vyžadováno přihlášení správce" });
    }
    try {
      await connectToDatabase();
      const newStamp = { ...(req.body || {}) };
      const defaultIsHidden = typeof newStamp.isHidden === 'boolean' ? newStamp.isHidden : true;
      if (!newStamp.stav) {
        newStamp.stav = defaultIsHidden ? 'interni' : 'zverejneno';
      }
      newStamp.isHidden = newStamp.stav === 'interni';

      const rok = Number(newStamp.rok);
      if (!newStamp.rok || isNaN(rok) || String(newStamp.rok).length !== 4) {
        return res.status(400).json({ error: "Rok je povinný, musí být číslo a ve formátu YYYY!" });
      }
      newStamp.rok = rok;

      const collection = mongoose.connection.db.collection("stamps");
      const stampsForYear = await collection.find({ rok }).toArray();
      const usedNN = stampsForYear
        .map(stamp => {
          const match = String(stamp.idZnamky || "").match(/^cz-\d{4}-(\d{2})$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(nn => nn !== null);
      let nextNN = 1;
      while (usedNN.includes(nextNN)) nextNN++;

      newStamp.idZnamky = `cz-${rok}-${String(nextNN).padStart(2, '0')}`;
      delete newStamp._id;

      const result = await collection.insertOne(newStamp);
      if (!result.insertedId) {
        return res.status(400).json({ error: "Známku se nepodařilo vložit" });
      }
      const inserted = await collection.findOne({ _id: result.insertedId });
      return res.status(201).json(inserted);
    } catch (err) {
      console.error("Chyba při vkládání známky:", err);
      return res.status(500).json({ error: "Chyba při vkládání známky", details: err.message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Metoda není podporována" });
  }

  try {
    await connectToDatabase();
    console.log("Getting stamps from database...");
    const includeInternalForAdmin = isAdminRequest(req);
    const query = includeInternalForAdmin ? {} : publicStampsQuery;
    const stamps = await mongoose.connection.db.collection("stamps").find(query).toArray();
    console.log("Found stamps:", stamps.length);
    return res.status(200).json(stamps);
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Chyba serveru", details: err.message });
  }
}
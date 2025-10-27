import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

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
    return connection;
  } catch (err) {
    throw err;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    await connectToDatabase();
    if (req.method === 'GET') {
      const defects = await mongoose.connection.db.collection("defects").find({}).toArray();
      return res.status(200).json(defects);
    }
    if (req.method === 'POST') {
      // Přidání nové vady
      const { idZnamky, variantaVady, umisteniVady, obrazekVady, popisVady } = req.body;
      if (!idZnamky || !variantaVady) {
        return res.status(400).json({ error: "Chybí povinné pole idZnamky nebo variantaVady" });
      }
      // Vytvoření nového záznamu
      const defect = {
        idZnamky,
        variantaVady,
        umisteniVady: umisteniVady || '',
        obrazekVady: obrazekVady || '',
        popisVady: popisVady || ''
      };
      const result = await mongoose.connection.db.collection("defects").insertOne(defect);
      if (result.insertedId) {
        const newDefect = await mongoose.connection.db.collection("defects").findOne({ _id: result.insertedId });
        return res.status(201).json(newDefect);
      } else {
        return res.status(500).json({ error: "Nepodařilo se uložit vadu" });
      }
    }
    return res.status(405).json({ error: "Metoda není podporována" });
  } catch (err) {
    return res.status(500).json({ error: "Chyba serveru", details: err.message });
  }
}
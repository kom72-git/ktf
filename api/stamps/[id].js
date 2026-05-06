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

// Dotaz pro veřejné výpisy: skryje 'interni' a legacy isHidden: true.
function publicStampQuery(id) {
  return {
    idZnamky: id,
    $nor: [
      { stav: 'interni' },
      { stav: { $exists: false }, isHidden: true }
    ]
  };
}

function getAdminSecret() {
  return process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '';
}

function isAdminRequest(req) {
  const expected = getAdminSecret();
  if (!expected) return false;
  const provided = req.headers['x-admin-password'];
  return typeof provided === 'string' && provided === expected;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Password');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    await connectToDatabase();
    
    // Získáme ID známky z URL
    const { id } = req.query;
    console.log("Looking for stamp with idZnamky:", id);

    if (req.method === 'PUT') {
      const updateData = { ...(req.body || {}) };
      delete updateData._id;
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      const result = await mongoose.connection.db.collection("stamps").updateOne(
        { idZnamky: id },
        { $set: updatePayload }
      );

      if (!result.matchedCount) {
        return res.status(404).json({ error: "Známka nenalezena" });
      }

      const updatedStamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: id });
      return res.status(200).json(updatedStamp);
    }

    if (req.method === 'DELETE') {
      const stampResult = await mongoose.connection.db.collection("stamps").deleteOne({ idZnamky: id });
      if (!stampResult.deletedCount) {
        return res.status(404).json({ error: "Známka nenalezena nebo již smazána" });
      }

      const defectsResult = await mongoose.connection.db.collection("defects").deleteMany({ idZnamky: id });
      return res.status(200).json({
        success: true,
        deletedStampId: id,
        deletedDefectsCount: defectsResult.deletedCount
      });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: "Metoda není podporována" });
    }

    const includeInternalForAdmin = isAdminRequest(req);
    const stampQuery = includeInternalForAdmin ? { idZnamky: id } : publicStampQuery(id);
    const stamp = await mongoose.connection.db.collection("stamps").findOne(stampQuery);
    
    if (!stamp) {
      console.log("Stamp not found for id:", id);
      return res.status(404).json({ error: "Známka nenalezena" });
    }
    
    console.log("Found stamp:", stamp.idZnamky);
    return res.status(200).json(stamp);
    
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Chyba serveru", details: err.message });
  }
}
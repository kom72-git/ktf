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

function includeHiddenForRequest(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  return host.includes("localhost") || host.includes("127.0.0.1") || host.includes("app.github.dev");
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
    
    // Získáme ID známky z URL
    const { id } = req.query;
    console.log("Looking for stamp with idZnamky:", id);

    if (req.method === 'PUT') {
      const updateData = { ...(req.body || {}) };
      delete updateData._id;

      const result = await mongoose.connection.db.collection("stamps").updateOne(
        { idZnamky: id },
        { $set: updateData }
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

    const includeHidden = includeHiddenForRequest(req);
    const query = includeHidden
      ? { idZnamky: id }
      : {
          idZnamky: id,
          $or: [
            { isHidden: { $exists: false } },
            { isHidden: false }
          ]
        };

    const stamp = await mongoose.connection.db.collection("stamps").findOne(query);
    
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
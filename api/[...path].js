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
    const path = req.query.path || [];
    
    // Pokud je path string, převedeme na array
    const pathArray = Array.isArray(path) ? path : [path];
    
    console.log("API called with path:", pathArray);
    
    if (pathArray.length === 0) {
      return res.status(200).json({ message: "API běží" });
    }
    if (pathArray[0] === 'stamps') {
      const includeHidden = includeHiddenForRequest(req);
      if (pathArray.length === 1) {
        const query = includeHidden
          ? {}
          : {
              $or: [
                { isHidden: { $exists: false } },
                { isHidden: false }
              ]
            };
        const stamps = await mongoose.connection.db.collection("stamps").find(query).toArray();
        console.log("Loaded stamps:", stamps.length);
        return res.status(200).json(stamps);
      } else {
        if (req.method === 'PUT') {
          const updateData = { ...(req.body || {}) };
          delete updateData._id;
          const result = await mongoose.connection.db.collection("stamps").updateOne(
            { idZnamky: pathArray[1] },
            { $set: updateData }
          );
          if (!result.matchedCount) {
            return res.status(404).json({ error: "Známka nenalezena" });
          }
          const updatedStamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: pathArray[1] });
          return res.status(200).json(updatedStamp);
        }

        if (req.method !== 'GET') {
          return res.status(405).json({ error: "Metoda není podporována" });
        }

        const query = includeHidden
          ? { idZnamky: pathArray[1] }
          : {
              idZnamky: pathArray[1],
              $or: [
                { isHidden: { $exists: false } },
                { isHidden: false }
              ]
            };
        const stamp = await mongoose.connection.db.collection("stamps").findOne(query);
        if (!stamp) return res.status(404).json({ error: "Známka nenalezena" });
        return res.status(200).json(stamp);
      }
    }
    if (pathArray[0] === 'defects') {
      const defects = await mongoose.connection.db.collection("defects").find({}).toArray();
      return res.status(200).json(defects);
    }
    if (pathArray[0] === 'stamps-ids') {
      const ids = await mongoose.connection.db.collection("stamps").find({}, { projection: { idZnamky: 1, _id: 0 } }).toArray();
      return res.status(200).json(ids.map(d => d.idZnamky));
    }
    return res.status(404).json({ error: "Endpoint nenalezen" });
  } catch (err) {
    return res.status(500).json({ error: "Chyba serveru" });
  }
}
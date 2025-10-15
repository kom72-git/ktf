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
    
    // Získáme ID známky z URL
    const { id } = req.query;
    console.log("Looking for stamp with idZnamky:", id);
    
    const stamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: id });
    
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
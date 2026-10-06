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
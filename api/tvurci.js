import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { isAdminRequest, setApiCors } from "./_lib/adminAuth.js";
import { saveAuthor } from "./_lib/tvurci.js";

const MONGODB_URI = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(MONGODB_URI);
  return cachedDb;
}

// Autoři (návrháři a rytci): GET veřejně, zápis jen pro správce.
export default async function handler(req, res) {
  setApiCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (["POST", "DELETE"].includes(req.method) && !isAdminRequest(req)) {
      return res.status(401).json({ error: "Vyžadováno přihlášení správce" });
    }
    await connectToDatabase();
    const collection = mongoose.connection.db.collection("tvurci");

    if (req.method === "GET") {
      return res.status(200).json(await collection.find({}).toArray());
    }
    if (req.method === "POST") {
      const { error, author } = await saveAuthor(collection, req.body);
      if (error) return res.status(400).json({ error });
      return res.status(200).json(author);
    }
    if (req.method === "DELETE") {
      const slug = String(req.query?.slug || "");
      if (!slug) return res.status(400).json({ error: "Chybí slug autora" });
      await collection.deleteOne({ slug });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Metoda není podporována" });
  } catch (err) {
    console.error("Tvurci error:", err);
    return res.status(500).json({ error: "Chyba při práci s autory" });
  }
}

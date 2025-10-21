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
    
    const { id } = req.query;
    
    if (req.method === 'GET') {
      const defect = await mongoose.connection.db.collection("defects").findOne({ _id: new mongoose.Types.ObjectId(id) });
      
      if (!defect) {
        return res.status(404).json({ error: "Vada nenalezena" });
      }
      
      return res.status(200).json(defect);
    }
    
    if (req.method === 'PUT') {
      console.log("Updating defect with _id:", id);
      console.log("Update data:", req.body);
      
      // Zkusme nejdřív najít vadu
      let defect;
      try {
        defect = await mongoose.connection.db.collection("defects").findOne({ _id: new mongoose.Types.ObjectId(id) });
        console.log("Found existing defect:", defect ? "YES" : "NO");
      } catch (idError) {
        console.log("ObjectId error, trying idVady:", idError.message);
        // Zkusme najít podle idVady místo _id
        defect = await mongoose.connection.db.collection("defects").findOne({ idVady: id });
        console.log("Found by idVady:", defect ? "YES" : "NO");
      }
      
      if (!defect) {
        return res.status(404).json({ error: "Vada nenalezena", searchedId: id });
      }
      
      const updateData = { ...req.body };
      delete updateData._id;
      
      let result;
      try {
        // Zkusme update podle _id
        result = await mongoose.connection.db.collection("defects").updateOne(
          { _id: new mongoose.Types.ObjectId(id) },
          { $set: updateData }
        );
      } catch (idError) {
        // Pokud _id nefunguje, zkusme idVady
        result = await mongoose.connection.db.collection("defects").updateOne(
          { idVady: id },
          { $set: updateData }
        );
      }
      
      if (result.modifiedCount === 0) {
        return res.status(400).json({ error: "Nepodařilo se aktualizovat vadu", result });
      }
      
      // Vrátíme aktualizovanou vadu
      let updatedDefect;
      try {
        updatedDefect = await mongoose.connection.db.collection("defects").findOne({ _id: new mongoose.Types.ObjectId(id) });
      } catch (idError) {
        updatedDefect = await mongoose.connection.db.collection("defects").findOne({ idVady: id });
      }
      
      console.log("Successfully updated defect:", id);
      return res.status(200).json(updatedDefect);
    }    return res.status(405).json({ error: "Metoda není podporována" });
    
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Chyba serveru", details: err.message });
  }
}
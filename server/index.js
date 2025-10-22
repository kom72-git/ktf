import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import Stamp from "./Stamp.js";


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'https://ktf.vercel.app',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    // Povolit všechny Codespaces subdomény a lokální vývoj
    if (!origin || allowed.includes(origin) || origin.endsWith('.app.github.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Připojení k MongoDB (connection string doplníme později)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://<username>:<password>@cluster0.3y2ox5f.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB připojeno"))
  .catch((err) => console.error("Chyba připojení k MongoDB:", err));

app.get("/", (req, res) => {
  res.send("API běží");
});

// Endpoint pro všechny známky
app.get("/api/stamps", async (req, res) => {
// Endpoint pro přidání nové známky
app.post("/api/stamps", async (req, res) => {
  try {
    const newStamp = { ...req.body };
    // Pokud není idZnamky, vygeneruj ho (např. podle katalogCislo nebo timestamp)
    if (!newStamp.idZnamky) {
      // Zkus použít katalogCislo, jinak timestamp
      newStamp.idZnamky = newStamp.katalogCislo || ("stamp_" + Date.now());
    }
    // Odstraň _id pokud je přítomen
    delete newStamp._id;
    const result = await mongoose.connection.db.collection("stamps").insertOne(newStamp);
    if (result.insertedId) {
      // Najdi a vrať nově vloženou známku
      const inserted = await mongoose.connection.db.collection("stamps").findOne({ _id: result.insertedId });
      res.status(201).json(inserted);
    } else {
      res.status(400).json({ error: "Známku se nepodařilo vložit" });
    }
  } catch (err) {
    console.error("Chyba při vkládání známky:", err);
    res.status(500).json({ error: "Chyba při vkládání známky", details: err.message });
  }
});
  try {
    const stamps = await mongoose.connection.db.collection("stamps").find({}).toArray();
    res.json(stamps);
  } catch (err) {
    res.status(500).json({ error: "Chyba při načítání známek" });
  }
});

// Endpoint pro detail známky podle idZnamky
app.get("/api/stamps/:id", async (req, res) => {
  try {
    console.log("[API] Detail známky: požadované id:", req.params.id);
    const stamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: req.params.id });
    console.log("[API] Výsledek dotazu:", stamp);
    if (!stamp) {
      console.log("[API] Známka nenalezena pro id:", req.params.id);
      return res.status(404).json({ error: "Známka nenalezena" });
    }
    res.json(stamp);
  } catch (err) {
    console.error("[API] Chyba při načítání známky:", err);
    res.status(500).json({ error: "Chyba při načítání známky" });
  }
});

// Endpoint pro editaci známky podle idZnamky
app.put("/api/stamps/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Updating stamp with idZnamky:", id);
    console.log("Update data:", req.body);
    
    // Najít známku podle idZnamky
    const stamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: id });
    if (!stamp) {
      return res.status(404).json({ error: "Známka nenalezena", searchedId: id });
    }
    
    const updateData = { ...req.body };
    delete updateData._id;
    
    const result = await mongoose.connection.db.collection("stamps").updateOne(
      { idZnamky: id },
      { $set: updateData }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "Nepodařilo se aktualizovat známku" });
    }
    
    // Vrátíme aktualizovanou známku
    const updatedStamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: id });
    console.log("Successfully updated stamp:", id);
    res.json(updatedStamp);
  } catch (err) {
    console.error("Chyba při editaci známky:", err);
    res.status(500).json({ error: "Chyba při editaci známky", details: err.message });
  }
});

// Endpoint pro všechny vady
app.get("/api/defects", async (req, res) => {
  try {
    const defects = await mongoose.connection.db.collection("defects").find({}).toArray();
    res.json(defects);
  } catch (err) {
    res.status(500).json({ error: "Chyba při načítání vad" });
  }
});

// Endpoint pro editaci vady podle ID
app.put("/api/defects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Updating defect with ID:", id);
    console.log("Update data:", req.body);
    
    // Zkusme najít vadu podle _id nebo idVady
    let defect;
    try {
      defect = await mongoose.connection.db.collection("defects").findOne({ _id: new mongoose.Types.ObjectId(id) });
    } catch (idError) {
      defect = await mongoose.connection.db.collection("defects").findOne({ idVady: id });
    }
    
    if (!defect) {
      return res.status(404).json({ error: "Vada nenalezena", searchedId: id });
    }
    
    const updateData = { ...req.body };
    delete updateData._id;
    
    let result;
    try {
      result = await mongoose.connection.db.collection("defects").updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: updateData }
      );
    } catch (idError) {
      result = await mongoose.connection.db.collection("defects").updateOne(
        { idVady: id },
        { $set: updateData }
      );
    }
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "Nepodařilo se aktualizovat vadu" });
    }
    
    // Vrátíme aktualizovanou vadu
    let updatedDefect;
    try {
      updatedDefect = await mongoose.connection.db.collection("defects").findOne({ _id: new mongoose.Types.ObjectId(id) });
    } catch (idError) {
      updatedDefect = await mongoose.connection.db.collection("defects").findOne({ idVady: id });
    }
    
    console.log("Successfully updated defect:", id);
    res.json(updatedDefect);
  } catch (err) {
    console.error("Chyba při editaci vady:", err);
    res.status(500).json({ error: "Chyba při editaci vady", details: err.message });
  }
});

// Endpoint pro výpis všech idZnamky
app.get("/api/stamps-ids", async (req, res) => {
  try {
    const ids = await mongoose.connection.db.collection("stamps").find({}, { projection: { idZnamky: 1, _id: 0 } }).toArray();
    res.json(ids.map(d => d.idZnamky));
  } catch (err) {
    res.status(500).json({ error: "Chyba při načítání idZnamky" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server běží na portu ${PORT}`);
});
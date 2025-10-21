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

// Endpoint pro všechny vady
app.get("/api/defects", async (req, res) => {
  try {
    const defects = await mongoose.connection.db.collection("defects").find({}).toArray();
    res.json(defects);
  } catch (err) {
    res.status(500).json({ error: "Chyba při načítání vad" });
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

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});
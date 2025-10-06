import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import Stamp from "./Stamp.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
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
    const stamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: req.params.id });
    if (!stamp) return res.status(404).json({ error: "Známka nenalezena" });
    res.json(stamp);
  } catch (err) {
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

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});

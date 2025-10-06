import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function dropIdIndex() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Připojeno k MongoDB");
  try {
    const result = await mongoose.connection.db.collection("stamps").dropIndex("id_1");
    console.log("Index id_1 odstraněn:", result);
  } catch (err) {
    if (err.codeName === "IndexNotFound") {
      console.log("Index id_1 nenalezen, není co mazat.");
    } else {
      console.error("Chyba při mazání indexu:", err);
    }
  }
  await mongoose.disconnect();
  console.log("Hotovo");
}

dropIdIndex();

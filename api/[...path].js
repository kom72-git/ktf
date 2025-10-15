const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

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

module.exports = async (req, res) => {
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
    if (path.length === 0) {
      return res.status(200).json({ message: "API běží" });
    }
    if (path[0] === 'stamps') {
      if (path.length === 1) {
        const stamps = await mongoose.connection.db.collection("stamps").find({}).toArray();
        return res.status(200).json(stamps);
      } else {
        const stamp = await mongoose.connection.db.collection("stamps").findOne({ idZnamky: path[1] });
        if (!stamp) return res.status(404).json({ error: "Známka nenalezena" });
        return res.status(200).json(stamp);
      }
    }
    if (path[0] === 'defects') {
      const defects = await mongoose.connection.db.collection("defects").find({}).toArray();
      return res.status(200).json(defects);
    }
    if (path[0] === 'stamps-ids') {
      const ids = await mongoose.connection.db.collection("stamps").find({}, { projection: { idZnamky: 1, _id: 0 } }).toArray();
      return res.status(200).json(ids.map(d => d.idZnamky));
    }
    return res.status(404).json({ error: "Endpoint nenalezen" });
  } catch (err) {
    return res.status(500).json({ error: "Chyba serveru" });
  }
};
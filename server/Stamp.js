import mongoose from "mongoose";

const SpecSchema = new mongoose.Schema({
  label: String,
  value: String,
  tfImage: String
}, { _id: false });

const DefectSchema = new mongoose.Schema({
  code: String,
  descriptionText: String,
  description: String,
  image: String
}, { _id: false });

const StampSchema = new mongoose.Schema({
  idZnamky: { type: String, required: true, unique: true },
  rok: Number,
  katalogCislo: String,
  emise: String,
  obrazek: String,
  datumVydani: String,
  navrh: String,
  rytec: String,
  druhTisku: String,
  tiskovaForma: String,
  zoubkovani: String,
  papir: String,
  rozmer: String,
  naklad: String,
  schemaTF: String,
  Studie: String,
  popisObrazkuStudie: String // nový popisek pod obrázkem studie
});

export default mongoose.model("Stamp", StampSchema);

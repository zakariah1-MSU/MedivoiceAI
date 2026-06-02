import { mongoose } from "../db/mongoose";

const medicineSchema = new mongoose.Schema({
  medicine_id: { type: String },
  name: { type: String, required: true },
  category: { type: String },
  manufacturer: { type: String },
  price_per_unit: { type: Number },
  stock_quantity: { type: Number },
  expiry_date: { type: String },
  description: { type: String },
  seasonal_demand: [{ type: String }],
  discount: { type: Number, default: 0 },
}, { collection: "Medicines", strict: false });

export const Medicine = mongoose.models.Medicine || mongoose.model("Medicine", medicineSchema, "Medicines");

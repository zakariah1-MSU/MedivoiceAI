import { mongoose } from "../db/mongoose";

const pharmacySchema = new mongoose.Schema({
  pharmacy_id: { type: String },
  name: { type: String, required: true },
  contact: { type: String },
  location: { type: String },
  language_preference: { type: String, default: "English" },
  business_type: { type: String },
  preferred_brands: [{ type: String }],
  discount_tier: { type: String, enum: ["Gold", "Silver", "Bronze"], default: "Silver" },
  last_order_date: { type: String },
}, { collection: "Pharmacies", strict: false });

if ((mongoose.models as any).Pharmacy) {
  delete (mongoose.models as any).Pharmacy;
}
export const Pharmacy = mongoose.model("Pharmacy", pharmacySchema, "Pharmacies");

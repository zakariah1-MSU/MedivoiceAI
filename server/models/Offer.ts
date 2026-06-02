import { mongoose } from "../db/mongoose";

const offerSchema = new mongoose.Schema({
  offer_id: { type: String },
  offer_name: { type: String, required: true },
  description: { type: String },
  valid_from: { type: String },
  valid_to: { type: String },
  applicable_medicines: [{ type: String }],
  discount_percent: { type: Number },
  target_group: { type: String },
  promotion_channel: [{ type: String }],
  status: { type: String, default: "Active" },
}, { collection: "Offers", strict: false });

export const Offer = mongoose.models.Offer || mongoose.model("Offer", offerSchema, "Offers");

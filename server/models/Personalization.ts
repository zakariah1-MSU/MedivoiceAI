import { mongoose } from "../db/mongoose";

const personalizationSchema = new mongoose.Schema({
  personalization_id: { type: String },
  pharmacist_id: { type: String },
  preferred_medicines: [{ type: String }],
  preferred_discount_range: { type: String },
  communication_tone: { type: String },
  seasonal_patterns: { type: mongoose.Schema.Types.Mixed },
  last_offer_accepted: { type: String },
  reorder_frequency_days: { type: Number },
  average_order_value: { type: Number },
  repeat_call_frequency: { type: mongoose.Schema.Types.Mixed },
  notes: { type: String },
  embedding_vector_id: { type: String },
  last_updated: { type: Date },
}, { collection: "Personalization", strict: false });

export const Personalization = mongoose.models.Personalization || mongoose.model("Personalization", personalizationSchema, "Personalization");

import { mongoose } from "../db/mongoose";

const triggerWordSchema = new mongoose.Schema({
  pharmacy_name: { type: String },
  pharmacy_id:   { type: String },
  medicine:      { type: String },
  intent:        { type: String },
  summary:       { type: String },
  transcript:    { type: String },
  language:      { type: String },
  source:        { type: String },
  created_at:    { type: Date, default: Date.now },
}, { collection: "keyword_extractions", strict: false });

export const TriggerWord = mongoose.models.TriggerWord
  || mongoose.model("TriggerWord", triggerWordSchema, "keyword_extractions");
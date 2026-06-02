import { mongoose } from "../db/mongoose";

const conversationSchema = new mongoose.Schema({
  pharmacy_name: { type: String },
  pharmacist_text: { type: String },
  ai_response: { type: String },
  timestamp: { type: Date, default: Date.now },
  audio_bytes: { type: String },
  transcript: { type: String },
  summary: { type: String },
  type: { type: String, default: "inbound" },
  status: { type: String, default: "completed" },
}, { collection: "Live_Conversations", strict: false });

export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema, "Live_Conversations");

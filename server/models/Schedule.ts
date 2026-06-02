import { mongoose } from "../db/mongoose";

const scheduleSchema = new mongoose.Schema({
  schedule_id: { type: String },
  pharmacist_id: { type: String },
  schedule_type: { type: String },
  medicine_ids: [{ type: String }],
  offer_ids: [{ type: String }],
  scheduled_time: { type: Date },
  repeat_frequency: { type: String },
  status: { type: String, default: "pending" },
  notes: { type: String },
  last_executed: { type: Date },
  next_execution: { type: Date },
}, { collection: "Schedules", strict: false });

export const Schedule = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema, "Schedules");

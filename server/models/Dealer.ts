import { mongoose } from "../db/mongoose";

const dealerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  companyName: { type: String },
  gstNumber: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Dealer = mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);

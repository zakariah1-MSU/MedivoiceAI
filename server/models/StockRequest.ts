import { mongoose } from "../db/mongoose";

const orderItemSchema = new mongoose.Schema({
  medicine_name: { type: String },
  quantity: { type: Number },
  unit_price: { type: Number },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  order_id: { type: String },
  pharmacist_id: { type: String },
  conversation_id: { type: String },
  items: [orderItemSchema],
  total_amount: { type: Number },
  status: { type: String, default: "Pending" },
  delivery_date: { type: String },
  payment_status: { type: String, default: "Pending" },
  mode_of_payment: { type: String },
  order_timestamp: { type: String },
  order_date: { type: String },
}, { collection: "Orders", strict: false });

export const StockRequest = mongoose.models.StockRequest || mongoose.model("StockRequest", orderSchema, "Orders");

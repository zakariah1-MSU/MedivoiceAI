import { mongoose } from "../db/mongoose";

const inventorySchema = new mongoose.Schema({
  inventory_id: { type: String },
  medicine_id: { type: String },
  medicine_name: { type: String },
  stock_quantity: { type: Number, default: 0 },
  warehouse_location: { type: String },
  last_restock_date: { type: String },
  next_restock_due: { type: String },
  order_limit: { type: Number },
  status: { type: String, enum: ["in_stock", "low_stock", "out_of_stock"], default: "in_stock" },
}, { collection: "Inventory", strict: false });

export const Inventory = mongoose.models.Inventory || mongoose.model("Inventory", inventorySchema, "Inventory");

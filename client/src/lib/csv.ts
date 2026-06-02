export function toCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;

  const escape = (val: any): string => {
    if (val === null || val === undefined) return "";
    const s = String(val).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ordersToCSV(orders: any[]) {
  const rows = orders.map(o => ({
    "Order ID": o.order_id || o._id,
    "Pharmacist ID": o.pharmacist_id || "",
    "Status": o.status || "",
    "Payment Status": o.payment_status || "",
    "Payment Mode": o.mode_of_payment || "",
    "Total Amount ($)": o.total_amount ?? "",
    "Items": (o.items || []).map((i: any) => `${i.medicine_name} x${i.quantity}`).join("; "),
    "Order Date": o.order_timestamp || o.order_date || "",
    "Delivery Date": o.delivery_date || "",
    "Conversation ID": o.conversation_id || "",
  }));
  toCSV(rows, `orders_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function inventoryToCSV(items: any[]) {
  const rows = items.map(i => ({
    "Medicine Name": i.medicine_name || "",
    "Stock Quantity": i.stock_quantity ?? "",
    "Status": i.status || "",
    "Warehouse Location": i.warehouse_location || "",
    "Order Limit": i.order_limit ?? "",
    "Next Restock": i.next_restock_due || "",
    "Supplier": i.supplier || "",
    "Batch Number": i.batch_number || "",
    "Expiry Date": i.expiry_date || "",
  }));
  toCSV(rows, `inventory_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function medicinesToCSV(medicines: any[]) {
  const rows = medicines.map(m => ({
    "Name": m.name || "",
    "Manufacturer": m.manufacturer || "",
    "Category": m.category || "",
    "Price per Unit ($)": m.price_per_unit ?? "",
    "Stock Quantity": m.stock_quantity ?? "",
    "Discount (%)": m.discount ?? "",
    "Expiry Date": m.expiry_date || "",
    "Description": m.description || "",
  }));
  toCSV(rows, `medicines_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function conversationsToCSV(conversations: any[]) {
  const rows = conversations.map(c => ({
    "Pharmacy": c.pharmacy_name || "",
    "Type": c.type || "",
    "Pharmacist Text": c.pharmacist_text || "",
    "AI Response": c.ai_response || "",
    "Date": c.timestamp ? new Date(c.timestamp).toLocaleString() : "",
    "Conversation ID": c._id || "",
  }));
  toCSV(rows, `call_logs_${new Date().toISOString().slice(0, 10)}.csv`);
}

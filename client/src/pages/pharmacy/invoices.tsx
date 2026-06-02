import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Search, Package, Calendar, CreditCard,
  CheckCircle, Clock, XCircle, AlertCircle, Download, ChevronDown, ChevronUp, Printer
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmacyContext } from "@/lib/pharmacy-context";

const PAYMENT_CONFIG: Record<string, { cls: string; icon: any }> = {
  Paid:    { cls: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200", icon: CheckCircle },
  Pending: { cls: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200",   icon: Clock },
  Overdue: { cls: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200",             icon: AlertCircle },
  Credit:  { cls: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200",        icon: CreditCard },
};

const STATUS_BAR: Record<string, string> = {
  Delivered:  "bg-emerald-500",
  Processing: "bg-blue-500",
  Pending:    "bg-amber-400",
  Cancelled:  "bg-red-400",
};

function printInvoice(order: any) {
  const items = (order.items || []).map((item: any) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${item.medicine_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">$${item.unit_price?.toFixed(2) ?? "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">$${item.unit_price ? (item.unit_price * item.quantity).toFixed(2) : "—"}</td>
    </tr>`
  ).join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Invoice ${order.order_id || order._id}</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#111}
    table{width:100%;border-collapse:collapse}
    th{background:#f8f8f8;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888}
    .total{font-size:18px;font-weight:bold;text-align:right;margin-top:16px}
    .header{display:flex;justify-content:space-between;margin-bottom:32px}
    .badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
    .paid{background:#dcfce7;color:#15803d}.pending{background:#fef9c3;color:#92400e}
    </style></head>
    <body>
    <div class="header">
      <div><h1 style="margin:0;color:#0d9488">MediVoice AI</h1><p style="margin:4px 0;color:#888">Invoice</p></div>
      <div style="text-align:right">
        <h2 style="margin:0">${order.order_id || `#${String(order._id).slice(-8).toUpperCase()}`}</h2>
        <p style="margin:4px 0;color:#888">${order.order_timestamp ? new Date(order.order_timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
        <span class="badge ${(order.payment_status || "").toLowerCase()}">${order.payment_status || "—"}</span>
      </div>
    </div>
    <p><strong>Pharmacist ID:</strong> ${order.pharmacist_id || "—"}</p>
    <p><strong>Order Status:</strong> ${order.status || "—"} ${order.delivery_date ? `· Delivery: ${order.delivery_date}` : ""}</p>
    <table><thead><tr><th>Medicine</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${items}</tbody></table>
    <div class="total">Total: $${order.total_amount?.toFixed(2) ?? "—"}</div>
    ${order.mode_of_payment ? `<p style="color:#888;font-size:13px;margin-top:8px">Payment: ${order.mode_of_payment}</p>` : ""}
    <script>window.onload=()=>{window.print();}</script>
    </body></html>
  `);
  win.document.close();
}

function InvoiceCard({ order, index }: { order: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const paymentKey = order.payment_status || "Pending";
  const payCfg = PAYMENT_CONFIG[paymentKey] || PAYMENT_CONFIG.Pending;
  const PayIcon = payCfg.icon;
  const barColor = STATUS_BAR[order.status] || STATUS_BAR.Pending;
  const invoiceId = order.order_id || `INV-${String(order._id).slice(-8).toUpperCase()}`;
  const total = order.total_amount;
  const date = order.order_timestamp
    ? new Date(order.order_timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`card-invoice-${order._id}`}
    >
      <div className={`h-1 w-full ${barColor}`} />
      <CardContent className="p-0">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-invoice-${order._id}`}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-bold text-sm" data-testid={`text-invoice-id-${order._id}`}>{invoiceId}</p>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${payCfg.cls}`}>
                  <PayIcon className="h-3 w-3" />{paymentKey}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>
                {order.items?.length > 0 && (
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  order.status === "Delivered" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" :
                  order.status === "Processing" ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" :
                  "bg-muted text-muted-foreground"
                }`}>{order.status}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              {total !== undefined && (
                <p className="font-bold text-lg">${total.toFixed(2)}</p>
              )}
              {order.mode_of_payment && (
                <p className="text-xs text-muted-foreground">{order.mode_of_payment}</p>
              )}
            </div>

            <div className="text-muted-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border px-5 pb-4 space-y-3 animate-fade-in">
            {order.items?.length > 0 ? (
              <div className="space-y-1.5 pt-3">
                <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium uppercase tracking-wide pb-1">
                  <span className="col-span-2">Medicine</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Amount</span>
                </div>
                {order.items.map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-4 text-sm bg-muted/40 rounded-lg px-3 py-2">
                    <span className="col-span-2 font-medium truncate">{item.medicine_name}</span>
                    <span className="text-right text-muted-foreground">×{item.quantity}</span>
                    <span className="text-right font-semibold">
                      {item.unit_price ? `$${(item.unit_price * item.quantity).toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-xl font-bold">{total !== undefined ? `$${total.toFixed(2)}` : "—"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-3">No line items recorded.</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs rounded-xl"
                onClick={() => printInvoice(order)}
                data-testid={`button-print-invoice-${order._id}`}
              >
                <Printer className="h-3.5 w-3.5" /> Print Invoice
              </Button>
              {order.delivery_date && (
                <div className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl ${
                  order.status === "Delivered"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {order.status === "Delivered" ? `Delivered ${order.delivery_date}` : `Est. ${order.delivery_date}`}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PharmacyInvoices() {
  const { pharmacyName, pharmacyCode } = usePharmacyContext();
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stock-requests", pharmacyCode],
    queryFn: async () => {
      const params = pharmacyCode ? `?pharmacist_id=${encodeURIComponent(pharmacyCode)}` : "";
      const res = await fetch(`/api/stock-requests${params}`);
      return res.json();
    },
  });

  const filtered = orders.filter((o: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_id?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q) ||
      o.payment_status?.toLowerCase().includes(q) ||
      o.items?.some((i: any) => i.medicine_name?.toLowerCase().includes(q))
    );
  });

  const totalPaid = orders.filter((o: any) => o.payment_status === "Paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const totalPending = orders.filter((o: any) => o.payment_status !== "Paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-xl animate-fade-in-down" style={{background:"linear-gradient(135deg, #065f46 0%, #059669 40%, #0284c7 100%)"}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-blink" />
            <span className="text-xs text-emerald-200 font-semibold uppercase tracking-wider">
              {pharmacyName || "My Pharmacy"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Invoices</h1>
          <p className="text-emerald-200 text-sm mt-1">All orders and invoices from your pharmacy</p>

          {!isLoading && orders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-white/15 backdrop-blur border border-white/20 rounded-xl p-3 space-y-1">
                <p className="text-xs text-emerald-200 font-medium">Total Invoices</p>
                <p className="text-2xl font-bold text-white">{orders.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur border border-white/20 rounded-xl p-3 space-y-1">
                <p className="text-xs text-emerald-200 font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-white">${totalPaid.toFixed(0)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur border border-white/20 rounded-xl p-3 space-y-1">
                <p className="text-xs text-emerald-200 font-medium">Pending Payment</p>
                <p className="text-2xl font-bold text-white">${totalPending.toFixed(0)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur border border-white/20 rounded-xl p-3 space-y-1">
                <p className="text-xs text-emerald-200 font-medium">Delivered</p>
                <p className="text-2xl font-bold text-white">{orders.filter((o: any) => o.status === "Delivered").length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search invoices or medicines…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-invoice"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <FileText className="h-8 w-8 text-muted-foreground opacity-40" />
          </div>
          <p className="text-muted-foreground font-medium">
            {search ? "No invoices match your search." : "No invoices yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any, i: number) => (
            <InvoiceCard key={o._id} order={o} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

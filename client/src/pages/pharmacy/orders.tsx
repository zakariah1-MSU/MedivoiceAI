import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList, User, Calendar, CreditCard, Package, TrendingUp,
  Mic, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, XCircle,
  ExternalLink
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { usePharmacyContext } from "@/lib/pharmacy-context";

const STATUS_CONFIG: Record<string, { bg: string; dot: string; label: string; bar: string; icon: any }> = {
  Pending:    { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900", dot: "bg-amber-500", label: "Pending", bar: "bg-amber-400", icon: Clock },
  Processing: { bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900", dot: "bg-blue-500 animate-blink", label: "Processing", bar: "bg-blue-400", icon: Clock },
  Delivered:  { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900", dot: "bg-emerald-500", label: "Delivered", bar: "bg-emerald-400", icon: CheckCircle2 },
  Cancelled:  { bg: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900", dot: "bg-red-500", label: "Cancelled", bar: "bg-red-400", icon: XCircle },
};

const PIPELINE_STEPS = [
  { key: "Pending", label: "Order Placed", icon: Circle },
  { key: "Processing", label: "Processing", icon: Clock },
  { key: "Delivered", label: "Delivered", icon: CheckCircle2 },
];

function OrderTimeline({ status }: { status: string }) {
  const currentIdx = PIPELINE_STEPS.findIndex(s => s.key === status);
  if (status === "Cancelled") {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 mt-1">
        <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> Order was cancelled
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0 mt-1">
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = done || active ? CheckCircle2 : Circle;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all duration-500 ${done ? "bg-emerald-500 text-white" : active ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Clock className={`h-3.5 w-3.5 ${active ? "animate-spin" : ""}`} style={active ? { animationDuration: "3s" } : {}} /> : <Circle className="h-3.5 w-3.5 opacity-40" />}
              </div>
              <span className={`text-[9px] font-medium whitespace-nowrap ${done ? "text-emerald-600 dark:text-emerald-400" : active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground opacity-60"}`}>
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-3.5 mx-1 rounded-full transition-all duration-500 ${done ? "bg-emerald-400" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, index }: { order: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;

  return (
    <Card
      className="hover-elevate hover-shine border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`card-order-${order._id}`}
    >
      <div className={`h-1.5 w-full transition-all duration-300 group-hover:h-2 ${order.status === "Delivered" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : order.status === "Processing" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : order.status === "Cancelled" ? "bg-gradient-to-r from-red-500 to-rose-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm">{order.order_id || `Order #${String(order._id).slice(-6).toUpperCase()}`}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">ID: {order.pharmacist_id || "—"}</span>
            </div>
            {order.order_timestamp && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>{new Date(order.order_timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border flex-shrink-0 ${cfg.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {order.status}
          </div>
        </div>

        <OrderTimeline status={order.status} />

        {order.items?.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{order.items.length} item{order.items.length > 1 ? "s" : ""}</p>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                data-testid={`button-expand-order-${order._id}`}
              >
                {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Show items</>}
              </button>
            </div>
            {expanded && (
              <div className="mt-2 space-y-1.5 animate-fade-in-up">
                {order.items.map((item: any, i: number) => {
                  const qty = Number(item.quantity ?? item.order_quantity ?? 0) || 0;
                  const unitPrice = Number(item.unit_price ?? 0) || 0;
                  const lineTotal = unitPrice * qty;
                  const name = item.medicine_name || item.medicine_id || "Item";
                  return (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>×{qty}</span>
                        {lineTotal > 0 && <span className="font-semibold text-foreground">${lineTotal.toFixed(2)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {Number.isFinite(Number(order.total_amount)) && (
              <p className="font-bold text-base">${Number(order.total_amount).toFixed(2)}</p>
            )}
            {order.payment_status && (
              <div className="flex items-center gap-1 text-xs">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                <span className={`font-medium ${order.payment_status === "Paid" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {order.payment_status}
                </span>
                {order.mode_of_payment && <span className="text-muted-foreground">· {order.mode_of_payment}</span>}
              </div>
            )}
          </div>
          {order.delivery_date && (
            <p className={`text-xs font-medium ${order.status === "Delivered" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {order.status === "Delivered" ? `✓ Delivered ${order.delivery_date}` : `Est. ${order.delivery_date}`}
            </p>
          )}
        </div>

        {order.payment_link && order.payment_status !== "Paid" && order.status !== "Cancelled" && (
          <a
            href={order.payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
            data-testid={`link-pay-${order._id}`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pay with Stripe
            <ExternalLink className="h-3 w-3 opacity-80" />
          </a>
        )}
        {order.payment_link && order.payment_status === "Paid" && (
          <a
            href={order.payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full text-xs font-medium px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            data-testid={`link-pay-${order._id}`}
          >
            <ExternalLink className="h-3 w-3" />
            View payment link
          </a>
        )}
      </CardContent>
    </Card>
  );
}

const FILTER_TABS = [
  { key: "all", label: "All Orders" },
  { key: "active", label: "In Progress" },
  { key: "Delivered", label: "Delivered" },
  { key: "Cancelled", label: "Cancelled" },
];

export default function PharmacyOrders() {
  const { pharmacyCode } = usePharmacyContext();
  const [tab, setTab] = useState("all");

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stock-requests", pharmacyCode],
    queryFn: async () => {
      const params = pharmacyCode ? `?pharmacist_id=${encodeURIComponent(pharmacyCode)}` : "";
      const res = await fetch(`/api/stock-requests${params}`);
      return res.json();
    },
  });

  const filtered = orders.filter((o: any) => {
    if (tab === "all") return true;
    if (tab === "active") return o.status === "Pending" || o.status === "Processing";
    return o.status === tab;
  });

  const delivered = orders.filter((o: any) => o.status === "Delivered").length;
  const active = orders.filter((o: any) => o.status === "Pending" || o.status === "Processing").length;
  const totalSpend = orders.filter((o: any) => o.status === "Delivered").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-xl animate-fade-in-down" style={{background:"linear-gradient(135deg, #0369a1 0%, #0891b2 50%, #059669 100%)"}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-cyan-200 font-semibold uppercase tracking-wider">My Orders</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">My Orders</h1>
              <p className="text-cyan-200 text-sm mt-1">Medicine orders placed through MediVoice AI — click to expand items</p>
            </div>
          </div>
          {!isLoading && orders.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center border border-white/20">
                <p className="text-2xl font-bold text-white">{active}</p>
                <p className="text-xs text-cyan-200 mt-0.5">In Progress</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center border border-white/20">
                <p className="text-2xl font-bold text-white">{delivered}</p>
                <p className="text-xs text-cyan-200 mt-0.5">Delivered</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center border border-white/20">
                <p className="text-2xl font-bold text-white">${totalSpend.toFixed(0)}</p>
                <p className="text-xs text-cyan-200 mt-0.5">Total Spend</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit animate-fade-in">
        {FILTER_TABS.map(t => {
          const count = t.key === "all" ? orders.length : t.key === "active" ? active : orders.filter((o: any) => o.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`tab-orders-${t.key}`}
            >
              {t.label}
              {count > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">
              {tab === "all" ? "No orders yet." : `No ${tab === "active" ? "in-progress" : tab.toLowerCase()} orders.`}
            </p>
            {tab === "all" && (
              <Link href="/pharmacy/voice">
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-3 hover:underline cursor-pointer">
                  <Mic className="h-4 w-4" /> Call MediVoice AI to place an order
                </span>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((o: any, i: number) => <OrderCard key={o._id} order={o} index={i} />)}
        </div>
      )}
    </div>
  );
}

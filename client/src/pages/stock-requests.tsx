import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClipboardList, User, Calendar, CreditCard, Package, ChevronRight, TrendingUp, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersToCSV } from "@/lib/csv";

const STATUS_CONFIG: Record<string, { bg: string; dot: string; textColor: string }> = {
  Pending:    { bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400", dot: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400" },
  Processing: { bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400", dot: "bg-blue-500 animate-blink", textColor: "text-blue-700 dark:text-blue-400" },
  Delivered:  { bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", textColor: "text-emerald-700 dark:text-emerald-400" },
  Cancelled:  { bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400", dot: "bg-red-500", textColor: "text-red-700 dark:text-red-400" },
};

const NEXT_STATUS: Record<string, string> = {
  Pending: "Processing",
  Processing: "Delivered",
};

function OrderCard({ request, index }: { request: any; index: number }) {
  const { toast } = useToast();
  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.Pending;
  const nextStatus = NEXT_STATUS[request.status];

  const mutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PUT", `/api/stock-requests/${request._id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Order status updated" });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  return (
    <Card
      className="hover-elevate hover-shine border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`card-order-${request._id}`}
    >
      <div className={`h-1.5 w-full transition-all duration-300 group-hover:h-2 ${request.status === "Delivered" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : request.status === "Processing" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : request.status === "Cancelled" ? "bg-gradient-to-r from-red-500 to-rose-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-sm tracking-wide">{request.order_id || `#${String(request._id).slice(-6).toUpperCase()}`}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">ID: {request.pharmacist_id || "—"}</span>
            </div>
            {request.order_timestamp && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(request.order_timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${cfg.bg} flex-shrink-0`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {request.status}
          </div>
        </div>

        {request.items?.length > 0 && (
          <div className="space-y-1.5">
            {request.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{item.medicine_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>×{item.quantity}</span>
                  {item.unit_price && <span className="font-semibold text-foreground">${(item.unit_price * item.quantity).toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border gap-2">
          <div>
            {request.total_amount !== undefined && (
              <p className="font-bold text-base">${request.total_amount.toFixed(2)}</p>
            )}
            {request.payment_status && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CreditCard className="h-3 w-3" />
                <span>{request.payment_status}{request.mode_of_payment ? ` · ${request.mode_of_payment}` : ""}</span>
              </div>
            )}
          </div>
          {nextStatus && (
            <Button
              size="sm"
              className={`gap-1 text-xs ${nextStatus === "Delivered" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              onClick={() => mutation.mutate(nextStatus)}
              disabled={mutation.isPending}
              data-testid={`button-advance-status-${request._id}`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Mark {nextStatus}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const FILTERS = [
  { value: "all", label: "All Orders" },
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function StockRequests() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stock-requests", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/stock-requests${params}`);
      return res.json();
    }
  });

  const pending = requests.filter((r: any) => r.status === "Pending").length;
  const processing = requests.filter((r: any) => r.status === "Processing").length;

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden hero-orange p-6 shadow-xl animate-fade-in-down">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-orange-200 font-semibold uppercase tracking-wider">Order Management</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Orders</h1>
            <p className="text-orange-200 text-sm mt-1">Medicine orders from pharmacies — advance through the pipeline below</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => ordersToCSV(requests)}
            disabled={!requests.length}
            data-testid="button-download-orders-csv"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        </div>
      </div>

      {!isLoading && requests.length > 0 && (
        <div className="flex gap-3 flex-wrap animate-fade-in">
          {pending > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{pending} pending
            </div>
          )}
          {processing > 0 && (
            <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-900/60">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-blink" />{processing} processing
            </div>
          )}
          <div className="flex items-center gap-2 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            <TrendingUp className="h-3 w-3" />{requests.length} total
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">No orders found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((r: any, i: number) => <OrderCard key={r._id} request={r} index={i} />)}
        </div>
      )}
    </div>
  );
}

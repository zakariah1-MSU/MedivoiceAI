import { useLocation, Link } from "wouter";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePharmacyContext } from "@/lib/pharmacy-context";

const PAGE_TITLES: Record<string, string> = {
  "/pharmacy":                 "Dashboard",
  "/pharmacy/orders":          "My Orders",
  "/pharmacy/invoices":        "Invoices",
  "/pharmacy/catalogue":       "Medicine Catalogue",
  "/pharmacy/voice":           "Call AI Bot",
  "/pharmacy/conversations":   "Call History",
  "/pharmacy/payment-methods": "Payment Methods",
  "/pharmacy/profile":         "Profile",
};

export function PharmacyTopbar() {
  const [location] = useLocation();
  const { pharmacyName, pharmacyCode } = usePharmacyContext();

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-requests", pharmacyCode],
    queryFn: async () => {
      const params = pharmacyCode ? `?pharmacist_id=${encodeURIComponent(pharmacyCode)}` : "";
      const res = await fetch(`/api/stock-requests${params}`);
      return res.json();
    },
    enabled: !!pharmacyCode,
    refetchInterval: 30000,
  });

  const pendingOrders  = orders.filter((o: any) => o.status === "Pending" || o.status === "Processing").length;
  const unpaidInvoices = orders.filter((o: any) => o.payment_status === "Unpaid" || o.payment_status === "Pending").length;

  const pageTitle = PAGE_TITLES[location] ||
    (location.startsWith("/pharmacy/conversations/") ? "Call Detail" : "Pharmacist Portal");

  return (
    <header className="sticky top-0 z-40 h-13 flex items-center gap-3 px-4 bg-background/95 backdrop-blur-sm border-b border-border/60 flex-shrink-0">
      {/* Sidebar toggle */}
      <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors -ml-1" data-testid="button-sidebar-toggle" />
      <Separator orientation="vertical" className="h-5 opacity-40" />

      {/* Page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-semibold text-sm text-foreground truncate">{pageTitle}</span>
        {location === "/pharmacy/voice" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-blink" />
            AI Online
          </span>
        )}
      </div>

      {/* Alerts */}
      <div className="hidden sm:flex items-center gap-2">
        {pendingOrders > 0 && (
          <Link href="/pharmacy/orders">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-blink" />
              <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">{pendingOrders} order{pendingOrders > 1 ? "s" : ""}</span>
            </div>
          </Link>
        )}
        {unpaidInvoices > 0 && (
          <Link href="/pharmacy/invoices">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{unpaidInvoices} unpaid</span>
            </div>
          </Link>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-0.5">
        <div className="[&_button]:text-muted-foreground [&_button:hover]:text-foreground [&_button:hover]:bg-accent [&_button]:rounded-lg">
          <ThemeToggle />
        </div>
        <Link href="/">
          <button
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            data-testid="link-pharmacy-exit"
            title="Exit to home"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </header>
  );
}

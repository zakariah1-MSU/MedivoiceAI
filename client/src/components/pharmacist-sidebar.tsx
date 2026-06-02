import { useLocation, Link } from "wouter";
import { LayoutDashboard, Building2, MessageSquare, Pill, ClipboardList, Phone, FileText, LogOut, Zap } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { usePharmacyContext } from "@/lib/pharmacy-context";
import { useQuery } from "@tanstack/react-query";

function LiveBadge({ count, color = "bg-emerald-500" }: { count?: number; color?: string }) {
  if (!count) return null;
  return (
    <span className={`ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full ${color} text-white text-[10px] font-bold animate-scale-in leading-none`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function PharmacistSidebar() {
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

  const pendingOrders = orders.filter((o: any) => o.status === "Pending" || o.status === "Processing").length;
  const unpaidInvoices = orders.filter((o: any) => o.payment_status === "Unpaid" || o.payment_status === "Pending").length;

  const navItems = [
    { label: "Overview", items: [
      { title: "Dashboard", url: "/pharmacy", icon: LayoutDashboard, exact: true },
    ]},
    { label: "Orders & Finance", items: [
      { title: "My Orders", url: "/pharmacy/orders", icon: ClipboardList, badge: pendingOrders, badgeColor: "bg-orange-500" },
      { title: "Invoices", url: "/pharmacy/invoices", icon: FileText, badge: unpaidInvoices, badgeColor: "bg-amber-500" },
    ]},
    { label: "Medicines", items: [
      { title: "Browse Catalogue", url: "/pharmacy/catalogue", icon: Pill },
    ]},
    { label: "MediVoice AI", items: [
      { title: "Call Bot", url: "/pharmacy/voice", icon: Phone, highlight: true },
      { title: "Call History", url: "/pharmacy/conversations", icon: MessageSquare },
    ]},
    { label: "Account", items: [
      { title: "Payment Methods", url: "/pharmacy/payment-methods", icon: FileText },
    ]},
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Building2 className="text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-background animate-blink" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">
              {pharmacyName || "Pharmacist Portal"}
            </p>
            <p className="text-xs text-muted-foreground">MediVoice AI</p>
          </div>
        </div>
        {pendingOrders > 0 && (
          <Link href="/pharmacy/orders">
            <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors animate-fade-in-up">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-blink flex-shrink-0" />
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">{pendingOrders} order{pendingOrders > 1 ? "s" : ""} in progress</p>
            </div>
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        {navItems.map((group, gi) => (
          <SidebarGroup key={group.label} className="animate-fade-in-up" style={{ animationDelay: `${gi * 60}ms` }}>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider px-3 uppercase text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item: any, ii) => {
                  const isActive = item.exact ? location === item.url : location.startsWith(item.url);
                  const isHighlight = item.highlight;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="relative group transition-all duration-200"
                      >
                        <Link
                          href={item.url}
                          data-testid={`link-pharmacy-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${(gi * 5 + ii) * 40}ms` }}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-emerald-500" />
                          )}
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            isActive ? "bg-emerald-100 dark:bg-emerald-900/60" :
                            isHighlight ? "bg-emerald-50 dark:bg-emerald-950/40 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40" :
                            "bg-transparent group-hover:bg-muted"
                          }`}>
                            <item.icon className={`h-3.5 w-3.5 ${
                              isActive ? "text-emerald-600 dark:text-emerald-400" :
                              isHighlight ? "text-emerald-500" :
                              "text-muted-foreground"
                            }`} />
                          </div>
                          <span className={`font-medium flex-1 ${
                            isActive ? "text-emerald-700 dark:text-emerald-300" :
                            isHighlight ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""
                          }`}>{item.title}</span>
                          {isHighlight && !isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-blink" />
                          )}
                          {isActive
                            ? <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-blink" />
                            : <LiveBadge count={item.badge} color={item.badgeColor} />
                          }
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 mb-2 border border-emerald-100 dark:border-emerald-900/60">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <Zap className="h-3 w-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">AI Call Bot</p>
            <p className="text-xs text-muted-foreground truncate">OpenAI + Twilio</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-blink flex-shrink-0" />
        </div>
        <Link href="/">
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 w-full px-2 py-2 rounded-lg"
            data-testid="link-pharmacy-exit"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Switch Portal</span>
          </button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

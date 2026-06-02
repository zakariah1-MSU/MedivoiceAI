import { useLocation, Link } from "wouter";
import { LayoutDashboard, Store, Building2, MessageSquare, Package, Pill, ClipboardList, Tag, LogOut, Activity, AlertTriangle, Plus, Zap } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";

function LiveBadge({ count, color = "bg-amber-500" }: { count?: number; color?: string }) {
  if (!count) return null;
  return (
    <span className={`ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full ${color} text-white text-[10px] font-bold leading-none`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function DealerSidebar() {
  const [location] = useLocation();
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const pendingOrders = stats?.pendingOrders || 0;
  const lowStockAlerts = stats?.lowStock || 0;

  const navItems = [
    { label: "Overview", items: [
      { title: "Dashboard", url: "/dealer", icon: LayoutDashboard, exact: true },
    ]},
    { label: "Operations", items: [
      { title: "Pharmacies",         url: "/dealer/pharmacies", icon: Building2 },
      { title: "Medicine Catalogue", url: "/dealer/medicines",  icon: Pill },
      { title: "Inventory",          url: "/dealer/inventory",  icon: Package,      badge: lowStockAlerts, badgeColor: "bg-amber-500" },
      { title: "Orders",             url: "/dealer/orders",     icon: ClipboardList, badge: pendingOrders,  badgeColor: "bg-orange-500" },
      { title: "Offers",             url: "/dealer/offers",     icon: Tag },
    ]},
    { label: "AI Calls", items: [
      { title: "Call Logs",      url: "/dealer/conversations",  icon: MessageSquare },
      { title: "Trigger Words",  url: "/dealer/trigger-words",  icon: Zap },
    ]},
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        {/* Medical blue portal header */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Store className="text-white" style={{ width: 17, height: 17 }} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-sidebar animate-blink" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Dealer Portal</p>
            <p className="text-xs text-muted-foreground">MediVoice AI</p>
          </div>
        </div>

        {/* Alert pills */}
        {(pendingOrders > 0 || lowStockAlerts > 0) && (
          <div className="mt-2.5 flex flex-col gap-1.5">
            {pendingOrders > 0 && (
              <Link href="/dealer/orders">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 cursor-pointer hover:bg-orange-100 transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">{pendingOrders} pending order{pendingOrders > 1 ? "s" : ""}</p>
                </div>
              </Link>
            )}
            {lowStockAlerts > 0 && (
              <Link href="/dealer/inventory">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 cursor-pointer hover:bg-amber-100 transition-colors">
                  <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{lowStockAlerts} low stock alert{lowStockAlerts > 1 ? "s" : ""}</p>
                </div>
              </Link>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        {navItems.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider px-3 uppercase text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item: any) => {
                  const isActive = item.exact ? location === item.url : location.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} className="relative group transition-all duration-150">
                        <Link href={item.url} data-testid={`link-dealer-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          {/* Medical blue active indicator */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600" />
                          )}
                          <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-blue-100 dark:bg-blue-900/50" : "bg-transparent group-hover:bg-muted"}`}>
                            <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`font-medium flex-1 ${isActive ? "text-blue-700 dark:text-blue-300" : ""}`}>{item.title}</span>
                          {!isActive && <LiveBadge count={item.badge} color={item.badgeColor} />}
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

      <SidebarFooter className="px-4 py-4 border-t border-sidebar-border">
        {/* AI status — medical blue */}
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 mb-2 border border-blue-100 dark:border-blue-900/50">
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Activity className="h-3 w-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">AI Connected</p>
            <p className="text-xs text-muted-foreground truncate">OpenAI + Twilio</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-teal-400 flex-shrink-0" />
        </div>
        <Link href="/">
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full px-2 py-2 rounded-lg" data-testid="link-dealer-exit">
            <LogOut className="h-3.5 w-3.5" />
            <span>Switch Portal</span>
          </button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

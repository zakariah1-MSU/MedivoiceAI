import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Store, Building2, MessageSquare,
  Package, Pill, ClipboardList, Tag, Phone, Mic
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";

const pharmacistItems = [
  { title: "Pharmacist Portal", url: "/pharmacist", icon: Building2 },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Medicines", url: "/medicines", icon: Pill },
];

const dealerItems = [
  { title: "Dealer Portal", url: "/dealer", icon: Store },
  { title: "Stock Requests", url: "/stock-requests", icon: ClipboardList },
  { title: "Offers", url: "/offers", icon: Tag },
];

const callItems = [
  { title: "Conversations", url: "/conversations", icon: MessageSquare },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Mic className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">MediVoice AI</p>
            <p className="text-xs text-muted-foreground">Pharmacy Intelligence</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/" data-testid="link-dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Pharmacist</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pharmacistItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Dealer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dealerItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>AI Calls</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {callItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.startsWith(item.url)}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t">
        <p className="text-xs text-muted-foreground">Powered by OpenAI + Twilio</p>
      </SidebarFooter>
    </Sidebar>
  );
}

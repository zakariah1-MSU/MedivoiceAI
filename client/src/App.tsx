import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DealerSidebar } from "@/components/dealer-sidebar";
import { PharmacistSidebar } from "@/components/pharmacist-sidebar";
import { DealerTopbar } from "@/components/dealer-topbar";
import { PharmacyTopbar } from "@/components/pharmacy-topbar";
import { ThemeProvider } from "@/components/theme-provider";
import { PharmacyProvider, usePharmacyContext } from "@/lib/pharmacy-context";

import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

import DealerDashboard from "@/pages/dealer/dashboard";
import PharmaciesPage from "@/pages/dealer/pharmacies";

import Medicines from "@/pages/medicines";
import Inventory from "@/pages/inventory";
import StockRequests from "@/pages/stock-requests";
import Offers from "@/pages/offers";
import Conversations from "@/pages/conversations";
import ConversationDetail from "@/pages/conversation-detail";
import TriggerWords from "@/pages/dealer/trigger-words";

import PharmacyDashboard from "@/pages/pharmacy/dashboard";
import PharmacyProfile from "@/pages/pharmacy/profile";
import PharmacyCatalogue from "@/pages/pharmacy/catalogue";
import PharmacyOrders from "@/pages/pharmacy/orders";
import PharmacyVoice from "@/pages/pharmacy/voice";
import PharmacyConversations from "@/pages/pharmacy/conversations";
import PharmacyInvoices from "@/pages/pharmacy/invoices";
import PharmacySelector from "@/pages/pharmacy/selector";
import PharmacyPaymentMethods from "@/pages/pharmacy/payment-methods";

function DealerRouter() {
  return (
    <Switch>
      <Route path="/dealer" component={DealerDashboard} />
      <Route path="/dealer/pharmacies" component={PharmaciesPage} />
      <Route path="/dealer/medicines" component={Medicines} />
      <Route path="/dealer/inventory" component={Inventory} />
      <Route path="/dealer/orders" component={StockRequests} />
      <Route path="/dealer/offers" component={Offers} />
      <Route path="/dealer/conversations" component={Conversations} />
      <Route path="/dealer/conversations/:id" component={ConversationDetail} />
      <Route path="/dealer/trigger-words" component={TriggerWords} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PharmacyRouter() {
  return (
    <Switch>
      <Route path="/pharmacy" component={PharmacyDashboard} />
      <Route path="/pharmacy/profile" component={PharmacyProfile} />
      <Route path="/pharmacy/catalogue" component={PharmacyCatalogue} />
      <Route path="/pharmacy/orders" component={PharmacyOrders} />
      <Route path="/pharmacy/invoices" component={PharmacyInvoices} />
      <Route path="/pharmacy/voice" component={PharmacyVoice} />
      <Route path="/pharmacy/conversations" component={PharmacyConversations} />
      <Route path="/pharmacy/conversations/:id" component={ConversationDetail} />
      <Route path="/pharmacy/payment-methods" component={PharmacyPaymentMethods} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DealerLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <DealerSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <DealerTopbar />
          <main className="flex-1 overflow-auto">
            <DealerRouter />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function PharmacyLayout() {
  const { pharmacyId } = usePharmacyContext();

  if (!pharmacyId) {
    return <PharmacySelector />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <PharmacistSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <PharmacyTopbar />
          <main className="flex-1 overflow-auto">
            <PharmacyRouter />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const [location] = useLocation();
  if (location === "/") return <Landing />;
  if (location.startsWith("/dealer")) return <DealerLayout />;
  if (location.startsWith("/pharmacy")) return <PharmacyLayout />;
  return <Landing />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <PharmacyProvider>
            <AppRouter />
            <Toaster />
          </PharmacyProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

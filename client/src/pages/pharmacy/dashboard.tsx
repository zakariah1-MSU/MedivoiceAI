import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Phone, Package, MessageSquare, FileText, ChevronRight,
  Activity, Star, PhoneCall, Clock, Bot, Building2,
  TrendingUp, AlertCircle, CheckCircle2, ArrowUpRight, Sparkles,
  ShieldCheck, Pill, Wallet, BarChart2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmacyContext } from "@/lib/pharmacy-context";

function useCountUp(target: number | undefined, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === undefined) return;
    setValue(0);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({ title, target, icon: Icon, gradient, href, delay = 0, subtitle, glowClass = "" }: {
  title: string; target?: number; icon: any; gradient: string; href?: string; delay?: number; subtitle?: string; glowClass?: string;
}) {
  const value = useCountUp(target);
  const content = (
    <Card className={`hover-elevate hover-shine cursor-pointer overflow-hidden group relative border-0 shadow-md animate-fade-in-up transition-all duration-300 ${glowClass}`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`} />
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 group-hover:opacity-10 transition-opacity -translate-y-1/2 translate-x-1/2" style={{ background: "currentColor" }} />
      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className={`p-2.5 rounded-xl text-white shadow-md group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 ${gradient}`}>
          <Icon className="h-4 w-4 icon-bounce" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {target === undefined ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="text-4xl font-black tracking-tight group-hover:scale-105 transition-transform duration-200 origin-left">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <Activity className="h-3 w-3 text-emerald-500" />
          {subtitle || "Live data"}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function HealthRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-24 w-24 flex items-center justify-center flex-shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.22,.68,0,1.2)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground font-semibold uppercase">Score</span>
      </div>
    </div>
  );
}


export default function PharmacyDashboard() {
  const { pharmacyName, pharmacyCode } = usePharmacyContext();
  const [healthScore, setHealthScore] = useState(0);

  const { data: stats } = useQuery<any>({ queryKey: ["/api/stats"] });
  const { data: convsData, isLoading: convsLoading } = useQuery<any>({ queryKey: ["/api/conversations"] });
  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/stock-requests", pharmacyCode],
    queryFn: async () => {
      const params = pharmacyCode ? `?pharmacist_id=${encodeURIComponent(pharmacyCode)}` : "";
      const res = await fetch(`/api/stock-requests${params}`);
      return res.json();
    },
  });
  const { data: twilioStatus } = useQuery<any>({ queryKey: ["/api/twilio/status"] });

  const conversations = convsData?.conversations || [];
  const recentConvs = conversations.slice(0, 3);
  const pendingOrders = orders?.filter((o: any) => o.status === "Pending" || o.status === "Processing") || [];
  const deliveredOrders = orders?.filter((o: any) => o.status === "Delivered") || [];
  const totalOwed = orders?.filter((o: any) => o.payment_status !== "Paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0;
  const totalSpend = deliveredOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

  useEffect(() => {
    if (!orders) return;
    const total = orders.length || 1;
    const delivered = deliveredOrders.length;
    const hasCalls = (convsData?.total || 0) > 0;
    const score = Math.min(100, Math.round((delivered / total) * 60 + (hasCalls ? 25 : 0) + 15));
    const t = setTimeout(() => setHealthScore(score), 400);
    return () => clearTimeout(t);
  }, [orders, convsData]);

  return (
    <div className="p-6 space-y-6">
      <div className="relative rounded-2xl overflow-hidden hero-pharmacy p-6 shadow-xl animate-fade-in-down">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4 animate-float-slow" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4 animate-float" />
          <div className="absolute top-1/2 right-1/3 w-24 h-24 rounded-full bg-white/5 animate-float delay-300" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-blink" />
              <span className="text-xs text-emerald-200 font-semibold uppercase tracking-wider">{greeting()}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">{pharmacyName || "Dashboard"}</h1>
            <p className="text-emerald-200 text-sm mt-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              MediVoice AI — your pharmacy intelligence hub
            </p>
          </div>
          <div className="flex items-center gap-4">
            <HealthRing score={healthScore} />
            <div className="text-right hidden sm:block">
              <p className="text-white font-bold text-sm">Pharmacy Score</p>
              <p className="text-emerald-200 text-xs mt-0.5">Based on orders & calls</p>
              <p className="text-white/60 text-[10px] mt-1">
                {healthScore >= 80 ? "Excellent" : healthScore >= 50 ? "Good" : "Getting started"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" target={orders?.length} icon={Package} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" href="/pharmacy/orders" delay={0} subtitle={`${deliveredOrders.length} delivered`} glowClass="stat-card-emerald" />
        <StatCard title="AI Calls" target={convsData?.total} icon={MessageSquare} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" href="/pharmacy/conversations" delay={80} subtitle="Recorded & saved" glowClass="stat-card-blue" />
        <StatCard title="In Progress" target={pendingOrders.length} icon={Clock} gradient="bg-gradient-to-br from-orange-500 to-amber-500" href="/pharmacy/orders" delay={160} subtitle="Awaiting delivery" glowClass="stat-card-orange" />
        <StatCard title="Active Offers" target={stats?.offers} icon={Star} gradient="bg-gradient-to-br from-violet-500 to-purple-600" href="/pharmacy/catalogue" delay={240} subtitle="Ask AI about them" glowClass="stat-card-purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Link href="/pharmacy/voice">
            <div className="relative group cursor-pointer rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 animate-scale-in">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3 animate-float" />
                <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3 animate-float delay-300" />
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3 border border-white/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-blink" />
                      Call MediVoice AI · 24/7
                    </div>
                    <h2 className="text-xl font-black text-white">Call MediVoice AI Now</h2>
                    <p className="text-emerald-100 text-sm mt-1.5 leading-relaxed max-w-xs">
                      Dial the AI bot to check stock, get pricing, reorder medicines, and hear active offers — all in one call.
                    </p>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Phone className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl animate-pulse-ring-purple opacity-50" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5 items-end h-7">
                    {[14, 22, 10, 28, 16, 24, 12, 20, 18, 26].map((h, i) => (
                      <div key={i} className="wave-bar bg-emerald-200/70 rounded-full" style={{ height: `${h}px`, width: "3px" }} />
                    ))}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-xs text-emerald-200">Twilio + OpenAI GPT-4</p>
                    <div className="flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl group-hover:bg-emerald-50 transition-colors shadow-md">
                      <PhoneCall className="h-3.5 w-3.5" /> Open Hotline
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm animate-fade-in-up delay-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Spend</p>
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black">${totalSpend.toFixed(0)}</p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (totalSpend / 5000) * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">across {deliveredOrders.length} deliveries</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm animate-fade-in-up delay-150">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Delivery Rate</p>
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-black">
                  {orders?.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0}%
                </p>
                <div className="flex gap-1 mt-2">
                  {(orders || []).slice(0, 8).map((o: any, i: number) => (
                    <div key={i} className={`flex-1 h-4 rounded-sm ${o.status === "Delivered" ? "bg-emerald-500" : o.status === "Processing" ? "bg-blue-400" : "bg-muted"}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">orders fulfilled</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-500" /> Recent AI Calls
              </h2>
              <Link href="/pharmacy/conversations">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium transition-colors">
                  View all <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            {convsLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : recentConvs.length === 0 ? (
              <Card className="border-dashed border-2 border-border bg-muted/20">
                <CardContent className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Phone className="h-6 w-6 text-muted-foreground opacity-40" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">No calls yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Dial the MediVoice AI hotline to get started</p>
                  <Link href="/pharmacy/voice">
                    <div className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer">
                      <PhoneCall className="h-3 w-3" /> Go to hotline
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentConvs.map((c: any, i: number) => (
                  <Link key={c._id} href={`/pharmacy/conversations/${c._id}`}>
                    <Card className="hover-elevate cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up group"
                      style={{ animationDelay: `${i * 60}ms` }}>
                      <CardContent className="flex items-center gap-3 py-3 px-4">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{c.pharmacy_name || "MediVoice AI Call"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.ai_response?.slice(0, 65) || c.pharmacist_text?.slice(0, 65) || "—"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "—"}
                          </div>
                          {c.type && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${c.type === "inbound" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"}`}>
                              {c.type}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {totalOwed > 0 && (
            <Link href="/pharmacy/invoices">
              <Card className="border-0 shadow-sm animate-slide-right delay-200 hover-elevate cursor-pointer group overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" /> Pending Payment
                    </p>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">${totalOwed.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click to view & clear invoices</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {pendingOrders.length > 0 && (
            <Card className="border-0 shadow-sm animate-slide-right delay-300 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <CardHeader className="pb-2 pt-4">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" /> Active Orders
                  <span className="ml-auto bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-bold">{pendingOrders.length}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {pendingOrders.slice(0, 3).map((order: any, i: number) => (
                  <div key={order._id || i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/50 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${order.status === "Processing" ? "bg-blue-500 animate-blink" : "bg-orange-400"}`} />
                    <span className="font-semibold truncate flex-1">{order.order_id || `Order #${i + 1}`}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.status === "Processing" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"}`}>
                      {order.status}
                    </span>
                  </div>
                ))}
                <Link href="/pharmacy/orders">
                  <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 hover:underline cursor-pointer">
                    View all orders <ChevronRight className="h-3 w-3" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Floating AI Call Bot button ── bottom-left */}
      <Link href="/pharmacy/voice">
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
          <div className="relative">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white animate-ping" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white" />
          </div>
          <div className="leading-tight">
            <p className="text-xs font-black">AI Call Bot</p>
            <p className="text-[10px] text-emerald-100">Schedule a call</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

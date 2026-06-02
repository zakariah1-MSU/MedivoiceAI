import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Building2, MessageSquare, AlertTriangle, ClipboardList, Pill, Tag,
  Phone, ChevronRight, Activity, Zap, BarChart3, RefreshCw, Bot,
  TrendingUp, CheckCircle2, Circle, ArrowUpRight, Sparkles,
  Database, Cpu, Radio, Brain, Package, ShieldCheck, Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area
} from "recharts";

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

const ORDER_COLORS: Record<string, string> = {
  Pending: "#f59e0b", Processing: "#3b82f6", Delivered: "#10b981",
  Dispatched: "#8b5cf6", Cancelled: "#ef4444",
};
const INVENTORY_COLORS: Record<string, string> = {
  in_stock: "#10b981", low_stock: "#f59e0b", out_of_stock: "#ef4444", critical: "#dc2626",
};
const INVENTORY_LABELS: Record<string, string> = {
  in_stock: "In Stock", low_stock: "Low Stock", out_of_stock: "Out of Stock", critical: "Critical",
};

const QUICK_ACTIONS = [
  { label: "Pharmacies", desc: "Manage partner pharmacies", href: "/dealer/pharmacies", icon: Building2, gradient: "from-violet-500 to-purple-600" },
  { label: "Medicines", desc: "Update catalogue & pricing", href: "/dealer/medicines", icon: Pill, gradient: "from-violet-500 to-purple-600" },
  { label: "Orders", desc: "Process pending requests", href: "/dealer/orders", icon: ClipboardList, gradient: "from-blue-500 to-indigo-600" },
  { label: "Offers", desc: "Create promotions & deals", href: "/dealer/offers", icon: Tag, gradient: "from-blue-500 to-indigo-600" },
  { label: "Call Logs", desc: "Review call conversations", href: "/dealer/conversations", icon: MessageSquare, gradient: "from-violet-500 to-purple-600" },
];

const OUTBOUND_STEPS = [
  { icon: Cpu, text: "Raspberry Pi detects low-stock keywords in real time", color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/50" },
  { icon: Brain, text: "Whisper AI converts speech to text with high accuracy", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/50" },
  { icon: Radio, text: "MediVoice AI dials the pharmacy outbound via Twilio", color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/50" },
  { icon: Bot, text: "AI discusses reorders & active promotional offers", color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/50" },
  { icon: Database, text: "Order & full conversation stored in MongoDB Atlas", color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/50" },
];

const LIVE_EVENTS = [
  { icon: Phone, text: "Edison Pharmacy called AI hotline", time: "2m ago", color: "text-emerald-500", dot: "bg-emerald-500" },
  { icon: Package, text: "Stock request: Amoxicillin ×200 units", time: "8m ago", color: "text-blue-500", dot: "bg-blue-500" },
  { icon: Tag, text: "New offer created: 15% off Paracetamol", time: "15m ago", color: "text-amber-500", dot: "bg-amber-500" },
  { icon: CheckCircle2, text: "Order #RX-2941 marked Delivered", time: "22m ago", color: "text-emerald-500", dot: "bg-emerald-400" },
  { icon: Bot, text: "AI processed stock enquiry for CVS Newark", time: "35m ago", color: "text-violet-500", dot: "bg-violet-500" },
];

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
        <p className="font-bold">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value} orders</p>
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs max-w-[180px]">
        <p className="font-bold truncate">{label}</p>
        <p className="text-violet-500 font-semibold">{payload[0].value} calls</p>
      </div>
    );
  }
  return null;
}

function LiveRefreshIndicator({ interval = 30 }: { interval?: number }) {
  const [countdown, setCountdown] = useState(interval);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
          return interval;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [interval, queryClient]);

  const pct = ((interval - countdown) / interval) * 100;

  return (
    <div className="flex items-center gap-2 text-xs text-white/80">
      <div className="relative h-5 w-5">
        <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
          <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 8}`}
            strokeDashoffset={`${2 * Math.PI * 8 * (1 - pct / 100)}`}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw className="h-2.5 w-2.5 text-white" />
        </div>
      </div>
      <span>Refresh in {countdown}s</span>
    </div>
  );
}

function StatCard({ title, target, icon: Icon, gradient, href, delay = 0, subtitle, alert = false, glowClass = "" }: {
  title: string; target?: number; icon: any; gradient: string; href?: string; delay?: number; subtitle?: string; alert?: boolean; glowClass?: string;
}) {
  const value = useCountUp(target);
  const content = (
    <Card className={`hover-elevate hover-shine cursor-pointer overflow-hidden group relative border-0 shadow-md animate-fade-in-up transition-all duration-300 ${glowClass}`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`} />
      {alert && target !== undefined && target > 0 && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-blink" />
      )}
      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0 pt-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className={`p-2.5 rounded-xl text-white shadow-md group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 ${gradient}`}>
          <Icon className="h-4 w-4 icon-bounce" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {target === undefined ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="text-4xl font-black tracking-tight group-hover:scale-105 transition-transform duration-200 origin-left" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <Activity className={`h-3 w-3 ${alert && (target || 0) > 0 ? "text-red-500" : "text-emerald-500"}`} />
          {subtitle || "Live data"}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function SystemHealth({ stats }: { stats: any }) {
  const checks = [
    { label: "MongoDB Atlas", ok: !!stats, icon: Database, detail: "Database connected" },
    { label: "OpenAI API", ok: true, icon: Brain, detail: "GPT-4 ready" },
    { label: "Twilio Voice", ok: true, icon: Radio, detail: "Hotline active" },
    { label: "AI Pipeline", ok: !!stats, icon: Bot, detail: `${stats?.conversations || 0} calls processed` },
  ];
  return (
    <Card className="border-0 shadow-sm overflow-hidden animate-slide-right delay-200">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-bold text-white">System Health</p>
          <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-blink" /> All systems go
          </span>
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        {checks.map(({ label, ok, icon: Icon, detail }) => (
          <div key={label} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
              <Icon className={`h-4 w-4 ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-red-500 animate-blink"}`} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OutboundFlow() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [autoStep, setAutoStep] = useState(0);

  useEffect(() => {
    if (activeStep !== null) return;
    const t = setInterval(() => setAutoStep(s => (s + 1) % OUTBOUND_STEPS.length), 1800);
    return () => clearInterval(t);
  }, [activeStep]);

  const highlighted = activeStep !== null ? activeStep : autoStep;

  return (
    <Card className="border-0 shadow-sm overflow-hidden animate-slide-right delay-150">
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-white" />
          <p className="text-sm font-bold text-white">Outbound AI Call Flow</p>
        </div>
        <p className="text-violet-200 text-xs mt-1">Click a step to learn more</p>
      </div>
      <CardContent className="p-3 pb-4">
        <div className="space-y-1.5">
          {OUTBOUND_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = highlighted === i;
            return (
              <div
                key={i}
                onClick={() => setActiveStep(activeStep === i ? null : i)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 animate-fade-in-up ${isActive ? "bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800" : "hover:bg-muted border border-transparent"}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isActive ? step.bg : "bg-muted"}`}>
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? step.color : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black ${isActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}>0{i + 1}</span>
                    <p className={`text-xs leading-snug transition-colors ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{step.text}</p>
                  </div>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 mt-3 justify-center">
          {OUTBOUND_STEPS.map((_, i) => (
            <div key={i} onClick={() => setActiveStep(activeStep === i ? null : i)}
              className={`h-1 rounded-full cursor-pointer transition-all duration-300 ${highlighted === i ? "w-4 bg-violet-500" : "w-1.5 bg-muted-foreground/30"}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LiveActivityFeed() {
  const [visible, setVisible] = useState(LIVE_EVENTS.length);
  const [pulse, setPulse] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setPulse(Math.floor(Math.random() * LIVE_EVENTS.length));
      setTimeout(() => setPulse(null), 1000);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-2">
      {LIVE_EVENTS.slice(0, visible).map((ev, i) => {
        const Icon = ev.icon;
        return (
          <div key={i} className={`row-interactive flex items-center gap-3 p-3 rounded-xl border animate-fade-in-up group ${pulse === i ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"}`}
            style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              <Icon className={`h-4 w-4 ${ev.color} icon-bounce`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{ev.text}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`h-1.5 w-1.5 rounded-full ${ev.dot} animate-blink`} />
              <span className="text-xs text-muted-foreground">{ev.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartsSection({ stats, isLoading }: { stats: any; isLoading: boolean }) {
  const [chartTab, setChartTab] = useState<"orders" | "inventory" | "pharmacies">("orders");

  const orderChartData = stats?.ordersByStatus
    ? Object.entries(stats.ordersByStatus).map(([name, value]) => ({ name, value }))
    : [];
  const inventoryChartData = stats?.inventoryByStatus
    ? Object.entries(stats.inventoryByStatus).map(([key, value]) => ({ name: INVENTORY_LABELS[key] || key, value, key }))
    : [];
  const topPharmacies = stats?.topPharmacies || [];

  return (
    <Card className="border-0 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "200ms" }}>
      <CardHeader className="pb-0 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-500" /> Live Analytics
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            {(["orders", "inventory", "pharmacies"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setChartTab(tab)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 capitalize ${chartTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : chartTab === "orders" ? (
          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {orderChartData.map((entry: any) => (
                      <Cell key={entry.name} fill={ORDER_COLORS[entry.name] || "#8b5cf6"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {orderChartData.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: ORDER_COLORS[entry.name] || "#8b5cf6" }} />
                  <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                  <span className="text-xs font-black">{entry.value as number}</span>
                </div>
              ))}
              {!orderChartData.length && <p className="text-xs text-muted-foreground">No order data yet</p>}
            </div>
          </div>
        ) : chartTab === "inventory" ? (
          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {inventoryChartData.map((entry: any) => (
                      <Cell key={entry.key} fill={INVENTORY_COLORS[entry.key] || "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {inventoryChartData.map((entry: any) => (
                <div key={entry.key} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: INVENTORY_COLORS[entry.key] || "#6366f1" }} />
                  <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                  <span className="text-xs font-black">{entry.value as number}</span>
                </div>
              ))}
              {!inventoryChartData.length && <p className="text-xs text-muted-foreground">No inventory data yet</p>}
            </div>
          </div>
        ) : (
          <div className="h-48">
            {topPharmacies.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No call data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPharmacies} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={76} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                    {topPharmacies.map((_: any, i: number) => (
                      <Cell key={i} fill={["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981"][i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DealerDashboard() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const topPharmacies = stats?.topPharmacies || [];

  return (
    <div className="p-6 space-y-6">
      <div className="relative rounded-2xl overflow-hidden hero-dealer p-6 shadow-xl animate-fade-in-down">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4 animate-float-slow" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4 animate-float" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="text-page-title">{greeting()}</h1>
            {(stats?.lowStock || 0) > 0 && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-amber-500/25 border border-amber-300/40">
                <AlertTriangle className="h-3 w-3 text-amber-200" />
                <span className="text-[11px] font-semibold text-amber-100 uppercase tracking-wide">{stats.lowStock} items need restocking</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pharmacies" target={stats?.pharmacies} icon={Building2} gradient="bg-gradient-to-br from-violet-500 to-purple-600" href="/dealer/pharmacies" delay={0} subtitle="Partner pharmacies" glowClass="stat-card-purple" />
        <StatCard title="AI Calls" target={stats?.conversations} icon={MessageSquare} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" href="/dealer/conversations" delay={80} subtitle="Total recorded" glowClass="stat-card-blue" />
        <StatCard title="Low Stock" target={stats?.lowStock} icon={AlertTriangle} gradient="bg-gradient-to-br from-amber-500 to-amber-600" href="/dealer/inventory" delay={160} subtitle="Needs restocking" alert glowClass="stat-card-amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ChartsSection stats={stats} isLoading={isLoading} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-violet-500" /> Recent AI Calls
              </h2>
              <Link href="/dealer/conversations">
                <span className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold">
                  View all <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : !stats?.recentCalls?.length ? (
              <Card className="border-dashed border-2 border-border bg-muted/20">
                <CardContent className="py-10 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-6 w-6 text-muted-foreground opacity-30" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">No call logs yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {stats.recentCalls.map((call: any, i: number) => (
                  <Link key={call._id} href={`/dealer/conversations/${call._id}`}>
                    <Card className="hover-elevate cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up group overflow-hidden"
                      style={{ animationDelay: `${i * 60}ms` }} data-testid={`card-call-${call._id}`}>
                      <div className="h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="flex items-center justify-between py-3 px-4 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{call.pharmacy_name || "Unknown Pharmacy"}</p>
                            <p className="text-xs text-muted-foreground truncate">{call.ai_response?.slice(0, 60) || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(call.timestamp || call.createdAt).toLocaleDateString()}
                            </span>
                            {call.ai_response?.includes("Confidence") && (
                              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                                {call.ai_response.match(/Confidence (\d+)%/)?.[1]}% confidence
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm overflow-hidden animate-slide-right">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-white" />
                <p className="text-sm font-black text-white">Quick Actions</p>
              </div>
              <p className="text-purple-200 text-xs mt-1">Jump to any section</p>
            </div>
            <CardContent className="p-2">
              {QUICK_ACTIONS.map(({ label, desc, href, icon: Icon, gradient }, i) => (
                <Link key={href} href={href}>
                  <div className="row-interactive flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted cursor-pointer group animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-125 group-hover:rotate-6 transition-all duration-300`}>
                      <Icon className="h-4 w-4 text-white icon-bounce" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

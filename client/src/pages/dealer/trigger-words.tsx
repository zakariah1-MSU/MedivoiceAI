import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Zap, MessageSquare, Globe, Clock, Building2, AlertTriangle, ShoppingCart, HelpCircle, RefreshCw, TrendingUp, PhoneCall } from "lucide-react";
import { format } from "date-fns";

const INTENT_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  stock_low:             { label: "Stock Low",        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",  icon: AlertTriangle },
  restock_soon:          { label: "Restock Soon",     badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800", icon: RefreshCw },
  reorder:               { label: "Reorder",          badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",    icon: RefreshCw },
  customer_request:      { label: "Customer Request", badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",    icon: ShoppingCart },
  availability_question: { label: "Availability",    badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",    icon: HelpCircle },
  price_inquiry:         { label: "Price Inquiry",    badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800", icon: TrendingUp },
  complaint:             { label: "Complaint",        badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",         icon: AlertTriangle },
};

function getIntent(intent: string) {
  return INTENT_CONFIG[intent?.toLowerCase()] ?? {
    label: intent?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Unknown",
    badge: "bg-muted text-muted-foreground border-border",
    icon: Zap,
  };
}

function langFlag(lang: string) {
  const map: Record<string, string> = { en: "EN", hi: "HI", es: "ES", fr: "FR", de: "DE", ar: "AR", zh: "ZH" };
  return map[lang?.toLowerCase()] ?? lang?.toUpperCase() ?? "";
}

export default function TriggerWordsPage() {
  const [search, setSearch]             = useState("");
  const [intentFilter, setIntentFilter] = useState("all");
  const [debouncedSearch, setDebounced] = useState("");

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__twDebounce);
    (window as any).__twDebounce = setTimeout(() => setDebounced(val), 350);
  };

  const qp = new URLSearchParams({ limit: "100" });
  if (debouncedSearch) qp.set("search", debouncedSearch);
  if (intentFilter !== "all") qp.set("intent", intentFilter);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/trigger-words", debouncedSearch, intentFilter],
    queryFn: () => fetch(`/api/trigger-words?${qp}`).then(r => r.json()),
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const allIntents = Array.from(new Set(
    (data?.items || []).map((i: any) => i.intent).filter(Boolean)
  )) as string[];

  return (
    <div className="p-6 space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap animate-fade-in-down">
        <div>
          <h1 className="text-xl font-bold text-foreground">Trigger Words</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-detected keywords from live pharmacy call transcripts
          </p>
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">{total} entries</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicine, transcript, pharmacy…"
            className="pl-9"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            data-testid="input-trigger-search"
          />
        </div>

        {allIntents.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setIntentFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                intentFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              All
            </button>
            {allIntents.map(i => {
              const cfg = getIntent(i);
              return (
                <button
                  key={i}
                  onClick={() => setIntentFilter(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    intentFilter === i
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-3 opacity-25" />
          <p className="font-medium">No trigger words found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const cfg = getIntent(item.intent);
            const Icon = cfg.icon;
            const timeStr = item.created_at
              ? format(new Date(item.created_at), "MMM d · h:mm a")
              : null;

            return (
              <Card
                key={item._id}
                className="border border-border hover:border-border/80 transition-colors"
                data-testid={`card-trigger-${item._id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.medicine && (
                          <span className="text-sm font-semibold capitalize text-foreground">
                            {item.medicine}
                          </span>
                        )}
                        <Badge variant="outline" className={`text-[11px] font-medium ${cfg.badge}`}>
                          <Icon className="h-3 w-3 mr-1 opacity-70" />
                          {cfg.label}
                        </Badge>
                      </div>

                      {item.summary && (
                        <p className="text-sm text-foreground mt-1.5 leading-snug">
                          {item.summary}
                        </p>
                      )}

                      {item.transcript && (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground italic">"{item.transcript}"</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-muted-foreground">
                        {item.pharmacy_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {item.pharmacy_name}
                          </span>
                        )}
                        {item.language && item.language !== "unknown" && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {langFlag(item.language)}
                          </span>
                        )}
                        {item.source && (
                          <span className="uppercase tracking-wide opacity-60">{item.source}</span>
                        )}
                        {item.auto_call_status && (
                          <Badge
                            variant="outline"
                            className={
                              item.auto_call_status === "initiated"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.auto_call_status === "failed"
                                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                            }
                          >
                            <PhoneCall className="mr-1 h-3 w-3" />
                            {item.auto_call_status === "initiated" ? "Owner Call Started" : item.auto_call_status === "failed" ? "Owner Call Failed" : "Call Skipped"}
                          </Badge>
                        )}
                        {timeStr && (
                          <span className="flex items-center gap-1 ml-auto">
                            <Clock className="h-3 w-3" />
                            {timeStr}
                          </span>
                        )}
                      </div>

                      {item.auto_call_error && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                          Follow-up call error: {item.auto_call_error}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, Search, ArrowRight, Mic, ChevronLeft, ChevronRight, Phone, Download, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { conversationsToCSV } from "@/lib/csv";

const TYPE_FILTERS = [
  { value: "all", label: "All Calls" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

function ConversationCard({ convo, index }: { convo: any; index: number }) {
  const date = convo.timestamp ? new Date(convo.timestamp) : null;
  const snippet = convo.ai_response?.slice(0, 80) || convo.pharmacist_text?.slice(0, 80) || "No content available";

  return (
    <Link href={`/dealer/conversations/${convo._id}`}>
      <Card
        className="hover-elevate hover-shine cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up group stat-card-purple"
        style={{ animationDelay: `${index * 40}ms` }}
        data-testid={`card-conversation-${convo._id}`}
      >
        <CardContent className="flex items-center gap-4 py-4 px-4">
          <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 shadow-sm">
            <Mic className="h-5 w-5 text-violet-600 dark:text-violet-400 icon-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm" data-testid={`text-convo-pharmacy-${convo._id}`}>
                {convo.pharmacy_name || "Unknown Pharmacy"}
              </p>
              {convo.type && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${convo.type === "inbound" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"}`}>
                  {convo.type}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{snippet}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {date ? date.toLocaleString() : "—"}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Conversations() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/conversations", search, page, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("pharmacy", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/conversations?${params}`);
      return res.json();
    }
  });

  const conversations = data?.conversations || [];

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-xl animate-fade-in-down" style={{background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 40%, #4f46e5 100%)"}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-black/10 translate-y-1/2" />
        </div>
        <div className="relative z-10 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-0.5">
                {[...Array(4)].map((_, i) => <div key={i} className="wave-bar h-3 bg-violet-300" style={{animationDelay: `${i*0.1}s`}} />)}
              </div>
              <span className="text-xs text-violet-200 font-semibold uppercase tracking-wider">Call Logs</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Conversations</h1>
            <p className="text-violet-200 text-sm mt-1">AI voice call recordings from pharmacies — stored in MongoDB Atlas</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
            onClick={() => conversationsToCSV(conversations)}
            disabled={!conversations.length}
            data-testid="button-download-conversations-csv"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap animate-fade-in">
        {!isLoading && data?.total > 0 && (
          <div className="flex items-center gap-2 text-xs bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-900/60">
            <Phone className="h-3 w-3" />{data.total} total calls
          </div>
        )}
        <div className="flex items-center gap-1.5 border border-border rounded-lg overflow-hidden">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === f.value ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              data-testid={`button-filter-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by pharmacy name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          data-testid="input-search-conversation"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : conversations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">No conversations found.</p>
            {search && <p className="text-xs text-muted-foreground mt-1">Try a different pharmacy name.</p>}
            {typeFilter !== "all" && <p className="text-xs text-muted-foreground mt-1">No {typeFilter} calls recorded yet.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any, i: number) => <ConversationCard key={c._id} convo={c} index={i} />)}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 animate-fade-in">
          <button
            className="flex items-center gap-1 text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-muted-foreground px-2">
            Page {data.page} of {data.totalPages} · {data.total} calls
          </span>
          <button
            className="flex items-center gap-1 text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
            onClick={() => setPage(p => p + 1)}
            disabled={page === data.totalPages}
            data-testid="button-next-page"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

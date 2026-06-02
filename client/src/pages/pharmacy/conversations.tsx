import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { MessageSquare, Search, ArrowRight, ChevronLeft, ChevronRight, Bot, Phone, Mic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmacyContext } from "@/lib/pharmacy-context";

export default function PharmacyConversations() {
  const { pharmacyName } = usePharmacyContext();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/conversations", pharmacyName, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      const pharmacyFilter = search || pharmacyName;
      if (pharmacyFilter) params.set("pharmacy", pharmacyFilter);
      const res = await fetch(`/api/conversations?${params}`);
      return res.json();
    }
  });

  const conversations = data?.conversations || [];

  return (
    <div className="p-6 space-y-5">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AI History</span>
        </div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Call History</h1>
        <p className="text-muted-foreground text-sm">
          {pharmacyName ? `MediVoice AI calls for ${pharmacyName}` : "All conversations with MediVoice AI"}
        </p>
      </div>

      {!isLoading && (data?.total || 0) > 0 && (
        <div className="flex items-center gap-3 flex-wrap animate-fade-in">
          <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
            <Phone className="h-3 w-3" />{data.total} conversations
          </div>
        </div>
      )}

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search in call history…"
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
            <p className="text-muted-foreground font-medium">No call history yet.</p>
            <Link href="/pharmacy/voice">
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-2 hover:underline cursor-pointer">
                <Mic className="h-4 w-4" /> Start your first MediVoice AI call
              </span>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any, i: number) => {
            const transcript = c.transcript || c.transcript_text || "";
            const transcriptStr = Array.isArray(transcript) ? transcript.join("") : String(transcript);
            const firstLine = transcriptStr.split("\n").find((l: string) => l.trim()) || "";
            const preview =
              c.ai_response ||
              c.pharmacist_text ||
              c.summary ||
              firstLine ||
              "No content";
            return (
              <Link key={c._id} href={`/pharmacy/conversations/${c._id}`}>
                <Card
                  className="hover-elevate hover-shine cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up group stat-card-purple"
                  style={{ animationDelay: `${i * 40}ms` }}
                  data-testid={`card-conversation-${c._id}`}
                >
                  <CardContent className="flex items-center gap-4 py-4 px-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 shadow-sm">
                      <Bot className="h-5 w-5 text-white icon-bounce" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate" data-testid={`text-convo-pharmacy-${c._id}`}>
                        {c.pharmacy_name || "MediVoice AI Call"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {preview.slice(0, 75)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.timestamp ? new Date(c.timestamp).toLocaleString() : "—"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
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
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-xs text-muted-foreground px-2">Page {data.page} of {data.totalPages}</span>
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

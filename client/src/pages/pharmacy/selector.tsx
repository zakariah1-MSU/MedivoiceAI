import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, Award, MapPin, Phone, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePharmacyContext } from "@/lib/pharmacy-context";

const TIER_COLORS: Record<string, string> = {
  Gold:   "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400",
  Silver: "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400",
  Bronze: "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400",
};

export default function PharmacySelector() {
  const [search, setSearch] = useState("");
  const { setPharmacy } = usePharmacyContext();

  const { data: pharmacies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pharmacies"],
    queryFn: async () => {
      const res = await fetch("/api/pharmacies");
      return res.json();
    },
  });

  const filtered = pharmacies.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl mb-4 animate-float">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Select Your Pharmacy</h1>
          <p className="text-muted-foreground text-sm">Choose your pharmacy to access orders, invoices, and MediVoice AI</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-11 rounded-xl"
            placeholder="Search by name or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-pharmacy-selector"
            autoFocus
          />
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? "No pharmacies match your search." : "No pharmacies registered yet."}
            </div>
          ) : (
            filtered.map((p: any, i: number) => (
              <button
                key={p._id}
                className="w-full text-left bg-card border border-border rounded-xl px-4 py-3.5 hover:border-emerald-400 hover:shadow-md transition-all duration-200 animate-fade-in-up group"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => setPharmacy(p._id, p.name, p.pharmacy_id || p._id)}
                data-testid={`button-select-pharmacy-${p._id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      {p.discount_tier && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TIER_COLORS[p.discount_tier] || TIER_COLORS.Bronze}`}>
                          {p.discount_tier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{p.location}
                        </span>
                      )}
                      {p.contact && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{p.contact}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Don't see your pharmacy? Contact your dealer to get registered.
        </p>
      </div>
    </div>
  );
}

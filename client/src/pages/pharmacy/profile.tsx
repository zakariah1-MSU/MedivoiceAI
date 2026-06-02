import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Phone, MapPin, Globe, Tag, Calendar, Package, Star, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TIER_CONFIG: Record<string, { bg: string; icon: string; border: string }> = {
  Gold:   { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400", icon: "🥇", border: "border-amber-200 dark:border-amber-900" },
  Silver: { bg: "bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400", icon: "🥈", border: "border-slate-200 dark:border-slate-800" },
  Bronze: { bg: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400", icon: "🥉", border: "border-orange-200 dark:border-orange-900" },
};

function InfoRow({ icon: Icon, label, value, index = 0 }: { icon: any; label: string; value?: string | string[]; index?: number }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold mt-0.5">{Array.isArray(value) ? value.join(", ") : value}</p>
      </div>
    </div>
  );
}

export default function PharmacyProfile() {
  const { data: pharmacies = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/pharmacies"] });
  const pharmacy = pharmacies[0];
  const tierCfg = pharmacy ? (TIER_CONFIG[pharmacy.discount_tier] || TIER_CONFIG.Bronze) : TIER_CONFIG.Bronze;

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pharmacist Portal</span>
        </div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Pharmacy Profile</h1>
        <p className="text-muted-foreground text-sm">Your pharmacy details registered with MediVoice AI</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !pharmacy ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Building2 className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">No pharmacy profile found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-md overflow-hidden animate-scale-in">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold" data-testid="text-pharmacy-name">{pharmacy.name}</h2>
                    {pharmacy.discount_tier && (
                      <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${tierCfg.bg} ${tierCfg.border}`}>
                        <Award className="h-3 w-3" />
                        {pharmacy.discount_tier} Tier
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{pharmacy.business_type || "Pharmacy"}</p>
                  {pharmacy.pharmacy_id && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {pharmacy.pharmacy_id}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm animate-fade-in-up delay-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" /> Contact & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Phone} label="Contact Number" value={pharmacy.contact} index={0} />
              <InfoRow icon={MapPin} label="Location" value={pharmacy.location} index={1} />
              <InfoRow icon={Globe} label="Language Preference" value={pharmacy.language_preference} index={2} />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm animate-fade-in-up delay-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" /> Preferences & History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pharmacy.preferred_brands?.length > 0 && (
                <div className="animate-fade-in-up">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Preferred Brands</p>
                  <div className="flex flex-wrap gap-2">
                    {pharmacy.preferred_brands.map((b: string) => (
                      <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 font-medium">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <InfoRow icon={Tag} label="Discount Tier" value={pharmacy.discount_tier} index={0} />
              <InfoRow icon={Calendar} label="Last Order Date" value={pharmacy.last_order_date} index={1} />
            </CardContent>
          </Card>
        </>
      )}

      {pharmacies.length > 1 && (
        <div className="animate-fade-in-up delay-300">
          <h2 className="font-semibold mb-3 text-sm">Other Pharmacies in System</h2>
          <div className="space-y-2">
            {pharmacies.slice(1).map((p: any, i: number) => (
              <Card key={p._id} className="border-0 shadow-sm animate-fade-in-up hover-elevate" style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-pharmacy-${p._id}`}>
                <CardContent className="flex items-center justify-between py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.location} · {p.business_type || "Pharmacy"}</p>
                    </div>
                  </div>
                  {p.discount_tier && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${(TIER_CONFIG[p.discount_tier] || TIER_CONFIG.Bronze).bg} ${(TIER_CONFIG[p.discount_tier] || TIER_CONFIG.Bronze).border}`}>
                      {p.discount_tier}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

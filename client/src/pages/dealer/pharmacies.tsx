import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2, Phone, MapPin, Search, Plus, Globe,
  Award, PhoneCall
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TIER_COLORS: Record<string, string> = {
  Gold:   "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  Silver: "bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  Bronze: "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900",
};

function CallPharmacyButton({ pharmacy }: { pharmacy: any }) {
  const hasPhone = !!pharmacy.contact;

  if (!hasPhone) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="gap-1.5 text-xs rounded-xl font-semibold"
      >
        <PhoneCall className="h-3.5 w-3.5" /> No number
      </Button>
    );
  }

  const telHref = `tel:${pharmacy.contact.replace(/[^+\d]/g, "")}`;

  return (
    <a href={telHref} data-testid={`link-call-pharmacy-${pharmacy._id}`}>
      <Button
        size="sm"
        className="gap-1.5 text-xs rounded-xl font-semibold transition-all duration-200 shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        title={`Call ${pharmacy.name} at ${pharmacy.contact}`}
      >
        <PhoneCall className="h-3.5 w-3.5" /> Call {pharmacy.contact}
      </Button>
    </a>
  );
}

function PharmacyCard({ pharmacy, index }: { pharmacy: any; index: number }) {
  const tierClass = TIER_COLORS[pharmacy.discount_tier] || TIER_COLORS.Bronze;

  return (
    <Card
      className="hover-elevate hover-shine card-interactive stat-card-purple border-0 shadow-sm overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${index * 55}ms` }}
      data-testid={`card-pharmacy-${pharmacy._id}`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 group-hover:from-violet-500 group-hover:to-purple-600 transition-all duration-500" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 shadow-sm">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400 icon-bounce" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" data-testid={`text-pharmacy-name-${pharmacy._id}`}>{pharmacy.name}</p>
              <p className="text-xs text-muted-foreground">{pharmacy.business_type || "Pharmacy"}</p>
              {pharmacy.pharmacy_id && <p className="text-xs text-muted-foreground font-mono">ID: {pharmacy.pharmacy_id}</p>}
            </div>
          </div>
          {pharmacy.discount_tier && (
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${tierClass}`}>
              <Award className="h-3 w-3" />{pharmacy.discount_tier}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          {pharmacy.contact && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 text-purple-400 flex-shrink-0" />
              <span className="font-medium text-foreground">{pharmacy.contact}</span>
            </div>
          )}
          {pharmacy.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-purple-400 flex-shrink-0" />
              <span>{pharmacy.location}</span>
            </div>
          )}
          {pharmacy.language_preference && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3 text-purple-400 flex-shrink-0" />
              <span>{pharmacy.language_preference}</span>
            </div>
          )}
        </div>

        {pharmacy.preferred_brands?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pharmacy.preferred_brands.slice(0, 3).map((b: string) => (
              <span key={b} className="badge-pop text-xs px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800 font-medium transition-all duration-200">{b}</span>
            ))}
            {pharmacy.preferred_brands.length > 3 && (
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">+{pharmacy.preferred_brands.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border">
          {pharmacy.last_order_date && (
            <p className="text-xs text-muted-foreground">Last order: {pharmacy.last_order_date}</p>
          )}
          <div className="ml-auto">
            <CallPharmacyButton pharmacy={pharmacy} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddPharmacyDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", contact: "", location: "", business_type: "Retail Pharmacy",
    language_preference: "English", discount_tier: "Silver", preferred_brands: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pharmacies", {
        ...form,
        preferred_brands: form.preferred_brands ? form.preferred_brands.split(",").map(s => s.trim()) : [],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pharmacy added" });
      setOpen(false);
      setForm({ name: "", contact: "", location: "", business_type: "Retail Pharmacy", language_preference: "English", discount_tier: "Silver", preferred_brands: "" });
    },
    onError: () => toast({ title: "Failed to add pharmacy", variant: "destructive" }),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-pharmacy">
          <Plus className="h-4 w-4" />Add Pharmacy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Register New Pharmacy</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Pharmacy Name *</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Edison Pharmacy" data-testid="input-pharmacy-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact Number *</Label>
              <Input value={form.contact} onChange={set("contact")} placeholder="+1 732 555 0101" data-testid="input-pharmacy-contact" />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={set("location")} placeholder="Edison, NJ" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Business Type</Label>
              <Input value={form.business_type} onChange={set("business_type")} placeholder="Retail Pharmacy" />
            </div>
            <div className="space-y-1">
              <Label>Language</Label>
              <Input value={form.language_preference} onChange={set("language_preference")} placeholder="English" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Discount Tier</Label>
            <Select value={form.discount_tier} onValueChange={v => setForm(f => ({ ...f, discount_tier: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Preferred Brands (comma-separated)</Label>
            <Input value={form.preferred_brands} onChange={set("preferred_brands")} placeholder="Cipla, Sun Pharma, Himalaya" />
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.contact || mutation.isPending} className="w-full" data-testid="button-save-pharmacy">
          {mutation.isPending ? "Saving..." : "Register Pharmacy"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function PharmaciesPage() {
  const [search, setSearch] = useState("");
  const { data: pharmacies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pharmacies", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/pharmacies${params}`);
      return res.json();
    }
  });

  const { data: twilioStatus } = useQuery<any>({ queryKey: ["/api/twilio/status"] });

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden hero-dealer p-6 shadow-xl animate-fade-in-down">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-blink" />
              <span className="text-xs text-purple-200 font-semibold uppercase tracking-wider">Registered Pharmacies</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Pharmacies</h1>
            <p className="text-purple-200 text-sm mt-1">Tap "Call AI" to have MediVoice AI call the pharmacy via Twilio</p>
          </div>
          <AddPharmacyDialog />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap animate-fade-in">
        {twilioStatus?.configured ? (
          <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-blink" />
            Twilio active · {twilioStatus.phoneNumber}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            <PhoneOff className="h-3 w-3" /> Twilio not configured
          </div>
        )}
        {!isLoading && pharmacies.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            <Building2 className="h-3 w-3" />{pharmacies.length} pharmacies
          </div>
        )}
      </div>

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-pharmacy"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : pharmacies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Building2 className="h-8 w-8 text-muted-foreground opacity-40" />
          </div>
          <p className="text-muted-foreground font-medium">{search ? "No pharmacies match your search." : "No pharmacies registered yet."}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pharmacies.map((p: any, i: number) => <PharmacyCard key={p._id} pharmacy={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tag, Plus, Percent, Calendar, Users, Megaphone, Pill, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<string, { bg: string; dot: string; text: string }> = {
  Active:    { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900", dot: "bg-emerald-500 animate-blink", text: "Active" },
  Scheduled: { bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900", dot: "bg-blue-500", text: "Scheduled" },
  Expired:   { bg: "bg-muted text-muted-foreground border border-border", dot: "bg-gray-400", text: "Expired" },
};

const TIER_COLORS: Record<string, { pill: string; gradient: string }> = {
  Gold:   { pill: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800", gradient: "from-amber-400 via-yellow-500 to-orange-400" },
  Silver: { pill: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700", gradient: "from-slate-400 via-gray-500 to-zinc-400" },
  Bronze: { pill: "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800", gradient: "from-orange-500 via-amber-500 to-yellow-600" },
};

const CARD_GRADIENTS = [
  "from-violet-600 via-purple-600 to-indigo-600",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-blue-600 via-indigo-500 to-violet-500",
  "from-teal-500 via-emerald-500 to-green-500",
];

function OfferCard({ offer, index }: { offer: any; index: number }) {
  const isExpired = offer.valid_to && new Date(offer.valid_to) < new Date();
  const status = isExpired ? "Expired" : (offer.status || "Active");
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Active;
  const tierInfo = offer.target_group ? TIER_COLORS[offer.target_group] : null;
  const cardGradient = isExpired ? "from-gray-400 via-slate-400 to-gray-500" : CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Card
      className="hover-elevate hover-shine border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`card-offer-${offer._id}`}
    >
      <div className={`relative bg-gradient-to-br ${cardGradient} p-4 pb-5 overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 shadow-sm">
              <Tag className="h-5 w-5 text-white icon-bounce" />
            </div>
            {offer.discount_percent && (
              <div className="flex items-baseline gap-0.5 text-white drop-shadow group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-black leading-none">{offer.discount_percent}</span>
                <Percent className="h-4 w-4" />
              </div>
            )}
          </div>
          <p className="font-bold text-white mt-2 text-sm leading-tight" data-testid={`text-offer-name-${offer._id}`}>{offer.offer_name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {offer.target_group && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/25 text-white border border-white/30">
                {offer.target_group} Tier
              </span>
            )}
            <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/25 text-white border border-white/30">
              <span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-300 animate-blink" : "bg-gray-300"}`} />
              {cfg.text}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-2.5">
        {offer.description && <p className="text-xs text-muted-foreground leading-relaxed">{offer.description}</p>}

        {offer.applicable_medicines?.length > 0 && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Pill className="h-3 w-3 mt-0.5 flex-shrink-0 text-violet-500" />
            <span className="line-clamp-1">{offer.applicable_medicines.join(", ")}</span>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-border">
          {offer.promotion_channel?.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Megaphone className="h-3 w-3 text-violet-500" />
              <span>{offer.promotion_channel.join(", ")}</span>
            </div>
          )}
          {(offer.valid_from || offer.valid_to) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Calendar className="h-3 w-3 text-violet-500" />
              <span>{offer.valid_from} → {offer.valid_to}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddOfferDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    offer_name: "", description: "", discount_percent: "", target_group: "Silver",
    valid_from: "", valid_to: "", applicable_medicines: "", promotion_channel: "Outbound Calls", status: "Active"
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/offers", {
        ...form,
        discount_percent: form.discount_percent ? Number(form.discount_percent) : undefined,
        applicable_medicines: form.applicable_medicines ? form.applicable_medicines.split(",").map(s => s.trim()) : [],
        promotion_channel: form.promotion_channel ? form.promotion_channel.split(",").map(s => s.trim()) : [],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({ title: "Offer created" });
      setOpen(false);
      setForm({ offer_name: "", description: "", discount_percent: "", target_group: "Silver", valid_from: "", valid_to: "", applicable_medicines: "", promotion_channel: "Outbound Calls", status: "Active" });
    },
    onError: () => toast({ title: "Failed to create offer", variant: "destructive" }),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-offer">
          <Plus className="h-4 w-4" />Add Offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Offer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Offer Name *</Label>
            <Input value={form.offer_name} onChange={set("offer_name")} placeholder="Winter Immunity Offer" data-testid="input-offer-name" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={form.description} onChange={set("description")} placeholder="10% off on Vitamin C during winter" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Discount %</Label>
              <Input type="number" value={form.discount_percent} onChange={set("discount_percent")} placeholder="10" />
            </div>
            <div className="space-y-1">
              <Label>Target Group</Label>
              <Input value={form.target_group} onChange={set("target_group")} placeholder="Gold / Silver / Bronze" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valid From</Label>
              <Input value={form.valid_from} onChange={set("valid_from")} placeholder="2025-11-01" />
            </div>
            <div className="space-y-1">
              <Label>Valid To</Label>
              <Input value={form.valid_to} onChange={set("valid_to")} placeholder="2026-01-31" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Applicable Medicines (comma-separated)</Label>
            <Input value={form.applicable_medicines} onChange={set("applicable_medicines")} placeholder="M001, M002, M003" />
          </div>
          <div className="space-y-1">
            <Label>Promotion Channel</Label>
            <Input value={form.promotion_channel} onChange={set("promotion_channel")} placeholder="Outbound Calls, SMS" />
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.offer_name || mutation.isPending} className="w-full" data-testid="button-save-offer">
          {mutation.isPending ? "Saving..." : "Create Offer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function Offers() {
  const { data: offers = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/offers"] });
  const active = offers.filter((o: any) => o.status === "Active" && !(o.valid_to && new Date(o.valid_to) < new Date())).length;

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden hero-rose p-6 shadow-xl animate-fade-in-down">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-black/10 translate-y-1/2" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-pink-200" />
              <span className="text-xs text-pink-200 font-semibold uppercase tracking-wider">Promotions</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Offers & Promotions</h1>
            <p className="text-pink-200 text-sm mt-1">Medicine promotions discussed during MediVoice AI calls</p>
          </div>
          <AddOfferDialog />
        </div>
      </div>

      {!isLoading && offers.length > 0 && (
        <div className="flex gap-3 flex-wrap animate-fade-in">
          <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-blink" />
            <Zap className="h-3 w-3" />{active} active offers
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            {offers.length} total
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : offers.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Tag className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">No offers found in the database.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((o: any, i: number) => <OfferCard key={o._id} offer={o} index={i} />)}
        </div>
      )}
    </div>
  );
}

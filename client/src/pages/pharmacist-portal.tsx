import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Phone, MapPin, Plus, Search, Tag, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TIER_COLORS: Record<string, string> = {
  Gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Silver: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

function PharmacyCard({ pharmacy }: { pharmacy: any }) {
  return (
    <Card className="hover-elevate" data-testid={`card-pharmacy-${pharmacy._id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-sm" data-testid={`text-pharmacy-name-${pharmacy._id}`}>{pharmacy.name}</p>
              <p className="text-xs text-muted-foreground">{pharmacy.business_type || "Pharmacy"}</p>
            </div>
          </div>
          {pharmacy.discount_tier && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[pharmacy.discount_tier] || "bg-muted text-muted-foreground"}`}>
              {pharmacy.discount_tier}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1">
          {pharmacy.contact && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{pharmacy.contact}</span>
            </div>
          )}
          {pharmacy.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{pharmacy.location}</span>
            </div>
          )}
          {pharmacy.language_preference && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>{pharmacy.language_preference}</span>
            </div>
          )}
          {pharmacy.preferred_brands?.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{pharmacy.preferred_brands.join(", ")}</span>
            </div>
          )}
          {pharmacy.last_order_date && (
            <p className="text-xs text-muted-foreground mt-1">Last order: {pharmacy.last_order_date}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddPharmacyDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", contact: "", location: "", business_type: "", language_preference: "English", discount_tier: "Silver", preferred_brands: ""
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        preferred_brands: form.preferred_brands ? form.preferred_brands.split(",").map(b => b.trim()) : [],
      };
      const res = await apiRequest("POST", "/api/pharmacies", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pharmacy added successfully" });
      setOpen(false);
      setForm({ name: "", contact: "", location: "", business_type: "", language_preference: "English", discount_tier: "Silver", preferred_brands: "" });
    },
    onError: () => toast({ title: "Failed to add pharmacy", variant: "destructive" }),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-pharmacy"><Plus className="h-4 w-4 mr-2" />Add Pharmacy</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Pharmacy</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Pharmacy Name *</Label>
            <Input value={form.name} onChange={set("name")} placeholder="CVS Pharmacy" data-testid="input-pharmacy-name" />
          </div>
          <div className="space-y-1">
            <Label>Contact Number</Label>
            <Input value={form.contact} onChange={set("contact")} placeholder="+1 987654321" data-testid="input-pharmacy-contact" />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={form.location} onChange={set("location")} placeholder="Montclair, NJ" />
          </div>
          <div className="space-y-1">
            <Label>Business Type</Label>
            <Input value={form.business_type} onChange={set("business_type")} placeholder="Retail Pharmacy" />
          </div>
          <div className="space-y-1">
            <Label>Language</Label>
            <Input value={form.language_preference} onChange={set("language_preference")} placeholder="English" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Discount Tier</Label>
            <Select value={form.discount_tier} onValueChange={v => setForm(f => ({ ...f, discount_tier: v }))}>
              <SelectTrigger data-testid="select-discount-tier"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Preferred Brands (comma-separated)</Label>
            <Input value={form.preferred_brands} onChange={set("preferred_brands")} placeholder="Pfizer, Cipla, Sun Pharma" />
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending} className="w-full mt-2" data-testid="button-save-pharmacy">
          {mutation.isPending ? "Saving..." : "Save Pharmacy"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function PharmacistPortal() {
  const [search, setSearch] = useState("");
  const { data: pharmacies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pharmacies", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/pharmacies${params}`);
      return res.json();
    }
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Pharmacist Portal</h1>
          <p className="text-muted-foreground text-sm">Manage pharmacy profiles and preferences</p>
        </div>
        <AddPharmacyDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-pharmacy"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-md" />)}
        </div>
      ) : pharmacies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {search ? "No pharmacies match your search." : "No pharmacies found in the database."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pharmacies.map((p: any) => <PharmacyCard key={p._id} pharmacy={p} />)}
        </div>
      )}
    </div>
  );
}

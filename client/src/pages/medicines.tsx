import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pill, Plus, Search, Package, Calendar, Percent, TrendingDown, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { medicinesToCSV } from "@/lib/csv";

function ExpiryStatus({ date }: { date: string }) {
  const expiryDate = new Date(date);
  const now = new Date();
  const soon = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const isExpired = expiryDate < now;
  const isExpiringSoon = !isExpired && expiryDate < soon;
  return (
    <div className={`flex items-center gap-1 text-xs ${isExpired ? "text-red-500" : isExpiringSoon ? "text-orange-500" : "text-muted-foreground"}`}>
      <Calendar className="h-3 w-3" />
      <span>Exp: {date}</span>
      {isExpired && <span className="font-semibold">(Expired)</span>}
      {isExpiringSoon && <span className="font-semibold">(Soon)</span>}
    </div>
  );
}

function MedicineCard({ medicine, index }: { medicine: any; index: number }) {
  const stockPct = medicine.stock_quantity > 0 ? Math.min(100, (medicine.stock_quantity / 1000) * 100) : 0;
  const isLow = medicine.stock_quantity <= 50;

  return (
    <div
      className="row-interactive flex items-center gap-3 py-3.5 px-4 border-b last:border-0 animate-fade-in-up group hover:pl-5"
      style={{ animationDelay: `${index * 40}ms` }}
      data-testid={`row-medicine-${medicine._id}`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm ${medicine.stock_quantity <= 0 ? "bg-red-100 dark:bg-red-900/50" : isLow ? "bg-orange-100 dark:bg-orange-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"}`}>
        <Pill className={`h-5 w-5 icon-bounce ${medicine.stock_quantity <= 0 ? "text-red-600 dark:text-red-400" : isLow ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm" data-testid={`text-medicine-name-${medicine._id}`}>{medicine.name}</p>
          {medicine.category && <Badge variant="outline" className="text-xs h-4">{medicine.category}</Badge>}
          {medicine.discount > 0 && (
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
              <Percent className="h-2.5 w-2.5" />{medicine.discount}% off
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <p className="text-xs text-muted-foreground">{medicine.manufacturer || "—"}</p>
          {medicine.expiry_date && <ExpiryStatus date={medicine.expiry_date} />}
        </div>
        {medicine.stock_quantity !== undefined && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 max-w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${medicine.stock_quantity <= 0 ? "bg-red-500" : isLow ? "bg-orange-500" : "bg-emerald-500"}`}
                style={{ width: `${stockPct}%`, transitionDelay: `${index * 40 + 200}ms` }}
              />
            </div>
            <span className={`text-xs font-medium ${isLow ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
              {medicine.stock_quantity} units{isLow && <TrendingDown className="inline h-3 w-3 ml-0.5" />}
            </span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {medicine.price_per_unit && (
          <p className="text-base font-bold">${medicine.price_per_unit.toFixed(2)}</p>
        )}
        <p className="text-xs text-muted-foreground">per unit</p>
      </div>
    </div>
  );
}

function AddMedicineDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", manufacturer: "", category: "", price_per_unit: "", stock_quantity: "", expiry_date: "", description: "", discount: "0" });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/medicines", {
        ...form,
        price_per_unit: form.price_per_unit ? Number(form.price_per_unit) : undefined,
        stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : undefined,
        discount: form.discount ? Number(form.discount) : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({ title: "Medicine added successfully" });
      setOpen(false);
      setForm({ name: "", manufacturer: "", category: "", price_per_unit: "", stock_quantity: "", expiry_date: "", description: "", discount: "0" });
    },
    onError: () => toast({ title: "Failed to add medicine", variant: "destructive" }),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-medicine">
          <Plus className="h-4 w-4" />Add Medicine
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Medicine</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Medicine Name *</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Paracetamol 500mg" data-testid="input-medicine-name" />
          </div>
          <div className="space-y-1">
            <Label>Manufacturer</Label>
            <Input value={form.manufacturer} onChange={set("manufacturer")} placeholder="Cipla" />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input value={form.category} onChange={set("category")} placeholder="Pain Relief" />
          </div>
          <div className="space-y-1">
            <Label>Price per Unit ($)</Label>
            <Input type="number" value={form.price_per_unit} onChange={set("price_per_unit")} placeholder="0.25" />
          </div>
          <div className="space-y-1">
            <Label>Stock Quantity</Label>
            <Input type="number" value={form.stock_quantity} onChange={set("stock_quantity")} placeholder="500" />
          </div>
          <div className="space-y-1">
            <Label>Expiry Date</Label>
            <Input value={form.expiry_date} onChange={set("expiry_date")} placeholder="2026-05-30" />
          </div>
          <div className="space-y-1">
            <Label>Discount (%)</Label>
            <Input type="number" value={form.discount} onChange={set("discount")} placeholder="10" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Input value={form.description} onChange={set("description")} placeholder="Brief description of the medicine" />
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending} className="w-full" data-testid="button-save-medicine">
          {mutation.isPending ? "Saving..." : "Save Medicine"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function Medicines() {
  const [search, setSearch] = useState("");
  const { data: medicines = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/medicines", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/medicines${params}`);
      return res.json();
    }
  });

  const inStock = medicines.filter((m: any) => m.stock_quantity > 0).length;
  const lowStock = medicines.filter((m: any) => m.stock_quantity > 0 && m.stock_quantity <= 50).length;

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-xl animate-fade-in-down" style={{background: "linear-gradient(135deg, #0891b2 0%, #059669 50%, #7c3aed 100%)"}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-cyan-200 font-semibold uppercase tracking-wider">Product Catalogue</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Medicine Catalogue</h1>
            <p className="text-cyan-100 text-sm mt-1">Dealer warehouse — all medicines with real-time stock levels</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => medicinesToCSV(medicines)}
              disabled={!medicines.length}
              data-testid="button-download-medicines-csv"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <AddMedicineDialog />
          </div>
        </div>
      </div>

      {!isLoading && medicines.length > 0 && (
        <div className="flex gap-4 flex-wrap animate-fade-in">
          <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{inStock} in stock
          </div>
          {lowStock > 0 && (
            <div className="flex items-center gap-2 text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-900/60">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-blink" />{lowStock} low stock
            </div>
          )}
          <div className="flex items-center gap-2 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            {medicines.length} total medicines
          </div>
        </div>
      )}

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-medicine" />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden animate-scale-in">
        {isLoading ? (
          <CardContent className="p-0">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-none border-b" />)}</CardContent>
        ) : medicines.length === 0 ? (
          <CardContent className="py-14 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Pill className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">{search ? "No medicines match your search." : "No medicines in the catalog."}</p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            {medicines.map((m: any, i: number) => <MedicineCard key={m._id} medicine={m} index={i} />)}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

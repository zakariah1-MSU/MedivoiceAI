import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pill, Search, Calendar, Package, Percent, ShoppingCart, Zap,
  LayoutGrid, List, Star, Phone, CheckCircle, AlertTriangle, Info, X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

function StockBar({ quantity, max = 500 }: { quantity: number; max?: number }) {
  const pct = quantity > 0 ? Math.min(100, (quantity / max) * 100) : 0;
  const color = quantity <= 0 ? "bg-red-500" : quantity <= 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MedicineDetailModal({ medicine, onClose }: { medicine: any; onClose: () => void }) {
  const { toast } = useToast();
  const inStock = medicine.stock_quantity === undefined || medicine.stock_quantity > 0;
  const isLow = medicine.stock_quantity !== undefined && medicine.stock_quantity > 0 && medicine.stock_quantity <= 50;
  const isExpired = medicine.expiry_date && new Date(medicine.expiry_date) < new Date();
  const isExpiringSoon = !isExpired && medicine.expiry_date && new Date(medicine.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const priceAfterDiscount = medicine.price_per_unit && medicine.discount > 0
    ? medicine.price_per_unit * (1 - medicine.discount / 100)
    : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${!inStock ? "bg-red-100 dark:bg-red-900/50" : isLow ? "bg-amber-100 dark:bg-amber-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"}`}>
                <Pill className={`h-6 w-6 ${!inStock ? "text-red-500" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold leading-tight">{medicine.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{medicine.manufacturer || "—"}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="flex flex-wrap gap-2">
            {medicine.category && <Badge variant="outline">{medicine.category}</Badge>}
            {medicine.discount > 0 && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0 gap-1">
                <Percent className="h-3 w-3" />{medicine.discount}% off
              </Badge>
            )}
            {!inStock && <Badge variant="destructive">Out of Stock</Badge>}
            {isLow && inStock && <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-0 gap-1"><AlertTriangle className="h-3 w-3" />Low Stock</Badge>}
          </div>

          {medicine.description && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{medicine.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Price per unit</p>
              {medicine.price_per_unit ? (
                <div>
                  <p className="text-xl font-bold">${priceAfterDiscount ? priceAfterDiscount.toFixed(2) : medicine.price_per_unit.toFixed(2)}</p>
                  {priceAfterDiscount && (
                    <p className="text-xs text-muted-foreground line-through">${medicine.price_per_unit.toFixed(2)}</p>
                  )}
                </div>
              ) : <p className="text-sm font-semibold text-muted-foreground">Contact dealer</p>}
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Stock level</p>
              <p className="text-xl font-bold">{medicine.stock_quantity ?? "—"}</p>
              <p className="text-xs text-muted-foreground">units available</p>
            </div>
          </div>

          {medicine.stock_quantity !== undefined && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Stock availability</span>
                <span className={!inStock ? "text-red-500 font-medium" : isLow ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                  {!inStock ? "Out of stock" : isLow ? "Running low" : "Well stocked"}
                </span>
              </div>
              <StockBar quantity={medicine.stock_quantity} />
            </div>
          )}

          {medicine.expiry_date && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${isExpired ? "bg-red-50 dark:bg-red-950/40 text-red-600" : isExpiringSoon ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600" : "bg-muted text-muted-foreground"}`}>
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{isExpired ? "EXPIRED — " : isExpiringSoon ? "Expiring soon — " : "Expiry: "}{medicine.expiry_date}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                toast({
                  title: `Enquiry sent for ${medicine.name}`,
                  description: "Your dealer will be notified. Or call MediVoice AI to confirm stock.",
                });
                onClose();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${inStock ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
              disabled={!inStock}
              data-testid={`button-enquire-modal-${medicine._id}`}
            >
              <ShoppingCart className="h-4 w-4" /> Enquire
            </button>
            <Link href="/pharmacy/voice">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
                <Phone className="h-4 w-4" /> Call AI
              </button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MedicineGridCard({ medicine, index, onClick }: { medicine: any; index: number; onClick: () => void }) {
  const isExpired = medicine.expiry_date && new Date(medicine.expiry_date) < new Date();
  const inStock = medicine.stock_quantity === undefined || medicine.stock_quantity > 0;
  const isLow = medicine.stock_quantity !== undefined && medicine.stock_quantity > 0 && medicine.stock_quantity <= 50;

  return (
    <Card
      className="hover-elevate hover-shine border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in-up group cursor-pointer"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
      data-testid={`card-medicine-${medicine._id}`}
    >
      <div className={`h-1.5 w-full transition-all duration-300 group-hover:h-2 ${!inStock ? "bg-gradient-to-r from-red-500 to-rose-500" : isLow ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 shadow-sm ${!inStock ? "bg-red-100 dark:bg-red-900/50" : isLow ? "bg-amber-100 dark:bg-amber-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"}`}>
              <Pill className={`h-5 w-5 icon-bounce ${!inStock ? "text-red-500" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-medicine-name-${medicine._id}`}>{medicine.name}</p>
              <p className="text-xs text-muted-foreground truncate">{medicine.manufacturer || "—"}</p>
            </div>
          </div>
          {medicine.discount > 0 && (
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 flex-shrink-0">
              <Percent className="h-2.5 w-2.5" />{medicine.discount}%
            </span>
          )}
        </div>

        {medicine.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{medicine.description}</p>
        )}

        {medicine.stock_quantity !== undefined && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={`font-medium ${!inStock ? "text-red-500" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {!inStock ? "Out of stock" : isLow ? `Low: ${medicine.stock_quantity}u` : `${medicine.stock_quantity} units`}
              </span>
              {medicine.category && <Badge variant="outline" className="text-xs h-4 border-0 bg-muted">{medicine.category}</Badge>}
            </div>
            <StockBar quantity={medicine.stock_quantity} />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <div>
            {medicine.price_per_unit ? (
              <span className="font-bold text-base">${medicine.price_per_unit.toFixed(2)}<span className="text-xs font-normal text-muted-foreground ml-1">/unit</span></span>
            ) : <span className="text-xs text-muted-foreground">Price on request</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <Info className="h-3.5 w-3.5" /> Details
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MedicineListRow({ medicine, index, onClick }: { medicine: any; index: number; onClick: () => void }) {
  const inStock = medicine.stock_quantity === undefined || medicine.stock_quantity > 0;
  const isLow = medicine.stock_quantity !== undefined && medicine.stock_quantity > 0 && medicine.stock_quantity <= 50;
  const isExpired = medicine.expiry_date && new Date(medicine.expiry_date) < new Date();
  const isExpiringSoon = !isExpired && medicine.expiry_date && new Date(medicine.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <div
      className="row-interactive flex items-center gap-3 py-3.5 px-4 border-b last:border-0 animate-fade-in-up group cursor-pointer hover:pl-5"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onClick}
      data-testid={`row-medicine-${medicine._id}`}
    >
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 shadow-sm ${!inStock ? "bg-red-100 dark:bg-red-900/50" : isLow ? "bg-amber-100 dark:bg-amber-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"}`}>
        <Pill className={`h-4 w-4 icon-bounce ${!inStock ? "text-red-500" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm" data-testid={`text-medicine-name-${medicine._id}`}>{medicine.name}</p>
          {medicine.category && <Badge variant="outline" className="text-xs h-4">{medicine.category}</Badge>}
          {medicine.discount > 0 && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">{medicine.discount}% off</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          <span>{medicine.manufacturer || "—"}</span>
          {medicine.expiry_date && (
            <span className={isExpired ? "text-red-500 font-medium" : isExpiringSoon ? "text-orange-500" : ""}>
              Exp: {medicine.expiry_date}{isExpired ? " (EXPIRED)" : isExpiringSoon ? " (Soon)" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="w-24 hidden sm:block">
        <StockBar quantity={medicine.stock_quantity ?? 500} />
        <p className={`text-xs mt-1 text-center font-medium ${!inStock ? "text-red-500" : isLow ? "text-amber-500" : "text-muted-foreground"}`}>
          {medicine.stock_quantity ?? "—"} units
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        {medicine.price_per_unit && <p className="font-bold text-sm">${medicine.price_per_unit.toFixed(2)}</p>}
        <p className="text-xs text-muted-foreground">/unit</p>
      </div>
      <Info className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

export default function PharmacyCatalogue() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);

  const { data: medicines = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const res = await fetch(`/api/medicines`);
      return res.json();
    }
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach((m: any) => { if (m.category) cats.add(m.category); });
    return Array.from(cats).sort();
  }, [medicines]);

  const filtered = useMemo(() => {
    let list = medicines;
    if (search) list = list.filter((m: any) => m.name?.toLowerCase().includes(search.toLowerCase()) || m.manufacturer?.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase()));
    if (categoryFilter !== "all") list = list.filter((m: any) => m.category === categoryFilter);
    if (stockFilter === "instock") list = list.filter((m: any) => m.stock_quantity === undefined || m.stock_quantity > 0);
    if (stockFilter === "offers") list = list.filter((m: any) => m.discount > 0);
    return list;
  }, [medicines, search, categoryFilter, stockFilter]);

  const inStockCount = medicines.filter((m: any) => m.stock_quantity === undefined || m.stock_quantity > 0).length;
  const offersCount = medicines.filter((m: any) => m.discount > 0).length;

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-xl animate-fade-in-down" style={{background:"linear-gradient(135deg, #7c3aed 0%, #059669 60%, #0891b2 100%)"}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 p-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-violet-200 font-semibold uppercase tracking-wider">Product Catalogue</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Medicine Catalogue</h1>
            <p className="text-violet-200 text-sm mt-1">Browse and enquire medicines — click any card for full details</p>
          </div>
          <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/15 border border-white/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-white/30 text-white" : "hover:bg-white/10 text-white/70"}`}
              data-testid="button-view-grid"
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-white/30 text-white" : "hover:bg-white/10 text-white/70"}`}
              data-testid="button-view-list"
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link href="/pharmacy/voice">
            <Button size="sm" className="gap-2 bg-white/15 border border-white/30 text-white hover:bg-white/25">
              <Phone className="h-3.5 w-3.5" /> Call AI to Order
            </Button>
          </Link>
          </div>
        </div>
      </div>

      {!isLoading && medicines.length > 0 && (
        <div className="flex gap-2 flex-wrap animate-fade-in">
          {[
            { key: "all", label: `All (${medicines.length})` },
            { key: "instock", label: `In Stock (${inStockCount})` },
            { key: "offers", label: `Offers (${offersCount})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setStockFilter(f.key); if (f.key === "all") setCategoryFilter("all"); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${stockFilter === f.key && (f.key !== "all" || categoryFilter === "all") ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              data-testid={`button-stock-filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
          {categories.length > 0 && (
            <div className="w-px bg-border mx-1 self-stretch" />
          )}
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${categoryFilter === cat ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              data-testid={`button-category-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder="Search by name, manufacturer or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-medicine"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Pill className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground font-medium">{search ? `No medicines matching "${search}".` : "No medicines match these filters."}</p>
            <button onClick={() => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); }} className="mt-3 text-xs text-primary hover:underline">
              Clear all filters
            </button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m: any, i: number) => (
            <MedicineGridCard key={m._id} medicine={m} index={i} onClick={() => setSelectedMedicine(m)} />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden animate-scale-in">
          <CardContent className="p-0">
            {filtered.map((m: any, i: number) => (
              <MedicineListRow key={m._id} medicine={m} index={i} onClick={() => setSelectedMedicine(m)} />
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center animate-fade-in">
          Showing {filtered.length} of {medicines.length} medicines · Click any card for full details
        </p>
      )}

      {selectedMedicine && (
        <MedicineDetailModal medicine={selectedMedicine} onClose={() => setSelectedMedicine(null)} />
      )}
    </div>
  );
}

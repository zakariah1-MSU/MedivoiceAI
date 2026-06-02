import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Plus, Search, AlertTriangle, MapPin, RefreshCw, Warehouse, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { inventoryToCSV } from "@/lib/csv";

const STOCK_CONFIG = {
  in_stock:    { label: "In Stock", bg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  low_stock:   { label: "Low Stock", bg: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400", dot: "bg-amber-500 animate-blink", bar: "bg-amber-500" },
  out_of_stock: { label: "Out of Stock", bg: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400", dot: "bg-red-500", bar: "bg-red-500" },
};

function InventoryRow({ item, index }: { item: any; index: number }) {
  const cfg = STOCK_CONFIG[item.status as keyof typeof STOCK_CONFIG] || STOCK_CONFIG.in_stock;
  const fillPct = item.order_limit ? Math.min(100, (item.stock_quantity / (item.order_limit * 10)) * 100) : Math.min(100, (item.stock_quantity / 500) * 100);

  return (
    <div
      className="row-interactive flex items-center gap-3 py-4 px-4 border-b last:border-0 animate-fade-in-up group hover:pl-5"
      style={{ animationDelay: `${index * 35}ms` }}
      data-testid={`row-inventory-${item._id}`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm ${cfg.bg}`}>
        <Package className="h-5 w-5 icon-bounce" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm" data-testid={`text-inventory-name-${item._id}`}>{item.medicine_name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {item.warehouse_location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /><span>{item.warehouse_location}</span>
            </div>
          )}
          {item.next_restock_due && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" /><span>Restock: {item.next_restock_due}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${fillPct}%`, transitionDelay: `${index * 35 + 200}ms` }} />
          </div>
          {item.order_limit && <span className="text-xs text-muted-foreground">Min: {item.order_limit}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="font-bold text-base">{item.stock_quantity}</p>
          <p className="text-xs text-muted-foreground">units</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
        </div>
      </div>
    </div>
  );
}

function AddInventoryDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ medicine_id: "", medicine_name: "", stock_quantity: "", warehouse_location: "", order_limit: "", status: "in_stock" });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inventory", {
        ...form, stock_quantity: Number(form.stock_quantity), order_limit: form.order_limit ? Number(form.order_limit) : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Inventory item added" });
      setOpen(false);
      setForm({ medicine_id: "", medicine_name: "", stock_quantity: "", warehouse_location: "", order_limit: "", status: "in_stock" });
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-inventory"><Plus className="h-4 w-4" />Add Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Medicine ID</Label><Input value={form.medicine_id} onChange={set("medicine_id")} placeholder="M001" /></div>
          <div className="space-y-1"><Label>Medicine Name *</Label><Input value={form.medicine_name} onChange={set("medicine_name")} placeholder="Paracetamol 500mg" data-testid="input-medicine-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Stock Quantity</Label><Input type="number" value={form.stock_quantity} onChange={set("stock_quantity")} placeholder="250" /></div>
            <div className="space-y-1"><Label>Order Limit</Label><Input type="number" value={form.order_limit} onChange={set("order_limit")} placeholder="50" /></div>
          </div>
          <div className="space-y-1"><Label>Warehouse Location</Label><Input value={form.warehouse_location} onChange={set("warehouse_location")} placeholder="Edison, NJ" /></div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger data-testid="select-inventory-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.medicine_name || mutation.isPending} className="w-full" data-testid="button-save-inventory">
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const { data: allInventory = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/inventory${params}`);
      return res.json();
    }
  });
  const { data: lowStock = [] } = useQuery<any[]>({ queryKey: ["/api/inventory/low-stock"] });

  return (
    <div className="p-6 space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-xl animate-fade-in-down" style={{background: "linear-gradient(135deg, #d97706 0%, #059669 60%, #0891b2 100%)"}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-amber-200 font-semibold uppercase tracking-wider">Warehouse</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-page-title">Warehouse Inventory</h1>
            <p className="text-amber-100 text-sm mt-1">Real-time medicine stock levels across dealer warehouses</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => inventoryToCSV(allInventory)}
              disabled={!allInventory.length}
              data-testid="button-download-inventory-csv"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <AddInventoryDialog />
          </div>
        </div>
      </div>

      {!isLoading && allInventory.length > 0 && (
        <div className="flex gap-3 flex-wrap animate-fade-in">
          <div className="flex items-center gap-2 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            <Warehouse className="h-3 w-3" />{allInventory.length} items tracked
          </div>
          {lowStock.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
              <AlertTriangle className="h-3 w-3" />{lowStock.length} need restocking
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="low" className="gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
            {lowStock.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">{lowStock.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by medicine name..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-inventory" />
          </div>
          <Card className="border-0 shadow-sm overflow-hidden animate-scale-in">
            {isLoading ? (
              <CardContent className="p-0">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-none border-b" />)}</CardContent>
            ) : allInventory.length === 0 ? (
              <CardContent className="py-14 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Package className="h-8 w-8 text-muted-foreground opacity-40" />
                </div>
                <p className="text-muted-foreground font-medium">No inventory items found.</p>
              </CardContent>
            ) : (
              <CardContent className="p-0">{allInventory.map((item: any, i: number) => <InventoryRow key={item._id} item={item} index={i} />)}</CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="low" className="mt-4">
          <Card className="border-0 shadow-sm overflow-hidden animate-scale-in">
            {lowStock.length === 0 ? (
              <CardContent className="py-14 text-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3">
                  <Package className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-muted-foreground font-medium">All stock levels are healthy!</p>
                <p className="text-xs text-muted-foreground mt-1">No items need immediate restocking.</p>
              </CardContent>
            ) : (
              <CardContent className="p-0">{lowStock.map((item: any, i: number) => <InventoryRow key={item._id} item={item} index={i} />)}</CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

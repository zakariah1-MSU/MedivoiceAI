import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Phone, MapPin, Plus, Search, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function DealerCard({ dealer }: { dealer: any }) {
  return (
    <Card className="hover-elevate" data-testid={`card-dealer-${dealer._id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">{dealer.name}</p>
              <p className="text-xs text-muted-foreground">{dealer.companyName || "—"}</p>
            </div>
          </div>
          <Badge variant={dealer.isActive ? "default" : "secondary"} className="text-xs">
            {dealer.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="mt-3 space-y-1">
          {dealer.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /><span>{dealer.phone}</span>
            </div>
          )}
          {(dealer.city || dealer.state) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /><span>{[dealer.city, dealer.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {dealer.gstNumber && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building className="h-3 w-3" /><span>GST: {dealer.gstNumber}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddDealerDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", companyName: "", address: "", city: "", state: "", gstNumber: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dealers", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Dealer added successfully" });
      setOpen(false);
      setForm({ name: "", phone: "", email: "", companyName: "", address: "", city: "", state: "", gstNumber: "" });
    },
    onError: () => toast({ title: "Failed to add dealer", variant: "destructive" }),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-dealer"><Plus className="h-4 w-4 mr-2" />Add Dealer</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Dealer</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Rajesh Kumar" data-testid="input-dealer-name" />
          </div>
          <div className="space-y-1">
            <Label>Company Name</Label>
            <Input value={form.companyName} onChange={set("companyName")} placeholder="Pharma Distributors Ltd" />
          </div>
          <div className="space-y-1">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={set("phone")} placeholder="+91 9876543210" data-testid="input-dealer-phone" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={set("email")} type="email" placeholder="dealer@company.com" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={set("address")} placeholder="456 Commerce Road" />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={set("city")} placeholder="Pune" />
          </div>
          <div className="space-y-1">
            <Label>State</Label>
            <Input value={form.state} onChange={set("state")} placeholder="Maharashtra" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>GST Number</Label>
            <Input value={form.gstNumber} onChange={set("gstNumber")} placeholder="27AABCU9603R1ZX" />
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.phone || mutation.isPending} className="w-full mt-2" data-testid="button-save-dealer">
          {mutation.isPending ? "Saving..." : "Save Dealer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function DealerPortal() {
  const [search, setSearch] = useState("");
  const { data: dealers = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/dealers"] });

  const filtered = dealers.filter((d: any) =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    d.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Dealer Portal</h1>
          <p className="text-muted-foreground text-sm">Manage medicine dealers and distributors</p>
        </div>
        <AddDealerDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search dealers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-dealer"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-md" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {search ? "No dealers match your search." : "No dealers yet. Add your first dealer."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d: any) => <DealerCard key={d._id} dealer={d} />)}
        </div>
      )}
    </div>
  );
}

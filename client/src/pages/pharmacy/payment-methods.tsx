import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  CreditCard, Landmark, Truck, Plus, Trash2, Star, StarOff,
  ShieldCheck, CheckCircle2, AlertCircle, Wallet
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { usePharmacyContext } from "@/lib/pharmacy-context";

type PaymentMethod = {
  id: string;
  type: "credit_card" | "debit_card" | "bank_transfer" | "cash_on_delivery";
  label: string;
  detail: string;
  isDefault: boolean;
};

const TYPE_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  credit_card:       { icon: CreditCard, color: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-100 dark:bg-violet-900/40",  label: "Credit Card" },
  debit_card:        { icon: CreditCard, color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-100 dark:bg-blue-900/40",      label: "Debit Card" },
  bank_transfer:     { icon: Landmark,   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40", label: "Bank Transfer" },
  cash_on_delivery:  { icon: Truck,      color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-100 dark:bg-amber-900/40",    label: "Cash on Delivery" },
};

function MethodCard({ method, onSetDefault, onRemove, isPending }: {
  method: PaymentMethod;
  onSetDefault: () => void;
  onRemove: () => void;
  isPending: boolean;
}) {
  const meta = TYPE_META[method.type];
  const Icon = meta.icon;
  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md ${
        method.isDefault ? "ring-2 ring-emerald-500/40 border-emerald-200 dark:border-emerald-800" : "border"
      }`}
      data-testid={`card-payment-${method.id}`}
    >
      {method.isDefault && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
      )}
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 h-11 w-11 rounded-xl ${meta.bg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm" data-testid={`text-method-label-${method.id}`}>
                {method.label}
              </span>
              {method.isDefault && (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 text-[10px] font-semibold px-1.5 py-0 h-4">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
            {method.detail && (
              <p className="text-xs text-muted-foreground mt-0.5">{method.detail}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!method.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={onSetDefault}
                disabled={isPending}
                data-testid={`button-set-default-${method.id}`}
              >
                <Star className="h-3.5 w-3.5 mr-1" />
                Set Default
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={onRemove}
              disabled={isPending}
              data-testid={`button-remove-${method.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM = { type: "credit_card", label: "", detail: "" };

export default function PaymentMethods() {
  const { pharmacyId } = usePharmacyContext();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: pharmacy, isLoading } = useQuery<any>({
    queryKey: ["/api/pharmacies", pharmacyId],
    queryFn: async () => {
      const res = await fetch(`/api/pharmacies/${pharmacyId}`);
      if (!res.ok) throw new Error("Failed to fetch pharmacy");
      return res.json();
    },
    enabled: !!pharmacyId,
  });

  const methods: PaymentMethod[] = pharmacy?.payment_methods || [];

  const mutation = useMutation({
    mutationFn: async (updated: PaymentMethod[]) => {
      const res = await fetch(`/api/pharmacies/${pharmacyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_methods: updated }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies", pharmacyId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save payment methods.", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!form.label.trim()) {
      toast({ title: "Required", description: "Please enter a name for this payment method.", variant: "destructive" });
      return;
    }
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: form.type as PaymentMethod["type"],
      label: form.label.trim(),
      detail: form.detail.trim(),
      isDefault: methods.length === 0,
    };
    mutation.mutate([...methods, newMethod], {
      onSuccess: () => {
        toast({ title: "Payment method added", description: `${newMethod.label} has been saved.` });
        setDialogOpen(false);
        setForm(EMPTY_FORM);
      },
    });
  };

  const handleSetDefault = (id: string) => {
    mutation.mutate(methods.map(m => ({ ...m, isDefault: m.id === id })), {
      onSuccess: () => toast({ title: "Default updated", description: "New default payment method set." }),
    });
  };

  const handleRemove = (id: string) => {
    const remaining = methods.filter(m => m.id !== id);
    if (remaining.length > 0 && !remaining.some(m => m.isDefault)) {
      remaining[0].isDefault = true;
    }
    mutation.mutate(remaining, {
      onSuccess: () => toast({ title: "Removed", description: "Payment method removed." }),
    });
  };

  const defaultMethod = methods.find(m => m.isDefault);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage the payment methods used for your orders and invoices
          </p>
        </div>
        <Button
          onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
          data-testid="button-add-payment"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Method
        </Button>
      </div>

      {defaultMethod && (
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1">Default Payment Method</p>
                <p className="text-xl font-bold">{defaultMethod.label}</p>
                <p className="text-sm text-emerald-100 mt-0.5">{TYPE_META[defaultMethod.type]?.label}</p>
                {defaultMethod.detail && (
                  <p className="text-xs text-emerald-200 mt-0.5">{defaultMethod.detail}</p>
                )}
              </div>
              <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
                {(() => { const I = TYPE_META[defaultMethod.type]?.icon || Wallet; return <I className="h-7 w-7 text-white" />; })()}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
              <span className="text-xs text-emerald-100">Used for all orders &amp; invoices</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Saved Methods
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : methods.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Wallet className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No payment methods saved</p>
                <p className="text-sm text-muted-foreground mt-0.5">Add a method to streamline your ordering process</p>
              </div>
              <Button
                variant="outline"
                onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}
                data-testid="button-add-payment-empty"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Method
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {methods.map(m => (
              <MethodCard
                key={m.id}
                method={m}
                onSetDefault={() => handleSetDefault(m.id)}
                onRemove={() => handleRemove(m.id)}
                isPending={mutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <Card className="border bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Secure &amp; Private</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Payment method details are stored securely in your pharmacy profile. Full card numbers are never stored.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pm-type">Payment Type</Label>
              <Select
                value={form.type}
                onValueChange={v => setForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger id="pm-type" data-testid="select-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-label">
                {form.type === "bank_transfer" ? "Bank Name" :
                 form.type === "cash_on_delivery" ? "Label" : "Cardholder / Account Name"}
              </Label>
              <Input
                id="pm-label"
                placeholder={
                  form.type === "bank_transfer" ? "e.g. Chase Business Checking" :
                  form.type === "cash_on_delivery" ? "e.g. Cash on Delivery" :
                  "e.g. John Smith"
                }
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                data-testid="input-payment-label"
              />
            </div>
            {form.type !== "cash_on_delivery" && (
              <div className="space-y-1.5">
                <Label htmlFor="pm-detail">
                  {form.type === "bank_transfer" ? "Account Number (last 4)" : "Card Number (last 4 digits)"}
                </Label>
                <Input
                  id="pm-detail"
                  placeholder="e.g. •••• 4242"
                  maxLength={20}
                  value={form.detail}
                  onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                  data-testid="input-payment-detail"
                />
              </div>
            )}
            {(form.type === "credit_card" || form.type === "debit_card") && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">Only the last 4 digits are stored. Full card details are never saved.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-payment">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-save-payment"
            >
              {mutation.isPending ? "Saving…" : "Add Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { formatBDT } from "@/lib/format";
import { createHostingOrder } from "@/lib/orders.functions";
import { bkashCreatePayment } from "@/lib/bkash.functions";
import { useCompanySettings } from "@/lib/company-settings";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/order/hosting/$packageId")({
  component: OrderPage,
});

function OrderPage() {
  const { packageId } = Route.useParams();
  const navigate = useNavigate();
  const { data: company } = useCompanySettings();

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["hosting_package", packageId],
    queryFn: async () => (await supabase.from("hosting_packages").select("*").eq("id", packageId).maybeSingle()).data,
  });

  const { data: bkashGw } = useQuery({
    queryKey: ["bkash_gw_public"],
    queryFn: async () =>
      (await supabase.from("payment_gateways").select("merchant_number, is_active").eq("provider", "bkash").maybeSingle()).data,
  });

  const [domain, setDomain] = useState("");
  const [cycle, setCycle] = useState<string>("");
  const [method, setMethod] = useState<"manual_bkash" | "bkash_online">("manual_bkash");
  const [trxId, setTrxId] = useState("");
  const [sender, setSender] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await createHostingOrder({
        data: {
          package_id: packageId,
          domain_name: domain,
          billing_cycle: cycle || pkg?.billing_cycle || "yearly",
          payment_method: method,
          manual_trx_id: trxId,
          manual_sender: sender,
          customer_notes: notes,
        },
      });
      if (method === "bkash_online") {
        // launch bKash gateway against a pseudo invoice? — for now, just create the order and redirect to invoice on activation
        toast.info("Online bKash payment is not yet linked to this order. Submit manual bKash for now, or wait for admin invoice.");
      }
      return res;
    },
    onSuccess: (res) => {
      setDone(res.order_id);
      toast.success("Order placed — waiting for admin verification");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading…</div>;
  if (!pkg) return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-muted-foreground">Package not found.</p>
      <Button variant="outline" onClick={() => navigate({ to: "/" })}><ArrowLeft className="mr-2 h-4 w-4" />Home</Button>
    </div>
  );

  if (done) return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold">Order received</h2>
          <p className="text-sm text-muted-foreground">
            Your hosting order has been submitted. Admin will verify your payment and activate your hosting shortly.
            You'll be able to see cPanel credentials in your dashboard once it's active.
          </p>
          <div className="flex gap-2 justify-center pt-4">
            <Button asChild><Link to="/hosting">Go to My Hosting</Link></Button>
            <Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order Hosting</h1>
        <p className="text-sm text-muted-foreground">Complete the details to place your order.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Package summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{pkg.name}</span></div>
          {pkg.disk_space && <div className="flex justify-between"><span className="text-muted-foreground">Disk</span><span>{pkg.disk_space}</span></div>}
          {pkg.bandwidth && <div className="flex justify-between"><span className="text-muted-foreground">Bandwidth</span><span>{pkg.bandwidth}</span></div>}
          <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted-foreground">Price</span><span className="font-bold text-lg">{formatBDT(pkg.price)} <span className="text-xs text-muted-foreground">/{pkg.billing_cycle}</span></span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Domain & billing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="domain">Domain name *</Label>
            <Input id="domain" placeholder="yoursite.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Enter the domain you'll host on this plan (existing or new).</p>
          </div>
          <div>
            <Label>Billing cycle</Label>
            <Select value={cycle || pkg.billing_cycle} onValueChange={setCycle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="biennial">2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="manual_bkash" className="mt-1" />
              <div className="flex-1">
                <div className="font-semibold">Manual bKash</div>
                <div className="text-xs text-muted-foreground">Send bKash to the number below and enter the transaction ID.</div>
                {bkashGw?.merchant_number && (
                  <div className="mt-2 rounded-md bg-pink-50 border border-pink-200 p-3 text-sm">
                    <div>Send to: <span className="font-bold text-pink-700">{bkashGw.merchant_number}</span> (Personal)</div>
                    <div className="text-xs text-muted-foreground mt-1">Amount: {formatBDT(pkg.price)}</div>
                  </div>
                )}
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="bkash_online" className="mt-1" disabled={!bkashGw?.is_active} />
              <div className="flex-1">
                <div className="font-semibold">bKash Online Payment {!bkashGw?.is_active && <span className="text-xs text-muted-foreground">(not configured)</span>}</div>
                <div className="text-xs text-muted-foreground">Pay instantly via the bKash gateway.</div>
              </div>
            </label>
          </RadioGroup>

          {method === "manual_bkash" && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label htmlFor="trx">bKash Transaction ID *</Label>
                <Input id="trx" placeholder="e.g. 8N7ABC1234" value={trxId} onChange={(e) => setTrxId(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sender">Sender number (optional)</Label>
                <Input id="sender" placeholder="01XXXXXXXXX" value={sender} onChange={(e) => setSender(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" placeholder="Any special requirements?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>Cancel</Button>
        <Button onClick={() => submit.mutate()} disabled={submit.isPending || !domain.trim()}>
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Place order
        </Button>
      </div>
    </div>
  );
}

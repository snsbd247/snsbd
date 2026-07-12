import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { getMyReferral, applyReferralCode } from "@/lib/referrals.functions";

export function ReferralPanel() {
  const qc = useQueryClient();
  const fetchRef = useServerFn(getMyReferral);
  const apply = useServerFn(applyReferralCode);
  const q = useQuery({ queryKey: ["my-referral"], queryFn: () => fetchRef() });
  const [code, setCode] = useState("");

  const m = useMutation({
    mutationFn: () => apply({ data: { code } }),
    onSuccess: () => { toast.success("Referral applied"); setCode(""); qc.invalidateQueries({ queryKey: ["my-referral"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const d: any = q.data;
  const link = typeof window !== "undefined" && d?.code ? `${window.location.origin}/auth?ref=${d.code}` : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Referrals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {d?.code && (
          <div className="space-y-2">
            <div className="text-sm">Your referral code: <code className="rounded bg-muted px-2 py-1 font-mono">{d.code}</code></div>
            <div className="flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Earn 10% commission on every invoice paid by someone who signs up with your code.</p>
          </div>
        )}

        {!d?.referred_by && (
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Have a referral code?</div>
            <div className="flex gap-2">
              <Input placeholder="ABCD1234" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={16} />
              <Button onClick={() => m.mutate()} disabled={!code || m.isPending}>Apply</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Pending" value={d?.totals?.pending ?? 0} />
          <Stat label="Paid" value={d?.totals?.paid ?? 0} />
          <Stat label="Total earned" value={((d?.totals?.pending ?? 0) + (d?.totals?.paid ?? 0)).toFixed(2)} />
        </div>

        {(d?.commissions ?? []).length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium">Recent commissions</div>
            <ul className="divide-y">
              {(d.commissions as any[]).slice(0, 8).map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{c.profiles?.email ?? c.referred_user_id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{Number(c.amount).toFixed(2)}</span>
                    <Badge variant={c.status === "paid" ? "default" : c.status === "void" ? "destructive" : "secondary"}>{c.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{typeof value === "number" ? Number(value).toFixed(2) : value}</div>
    </div>
  );
}

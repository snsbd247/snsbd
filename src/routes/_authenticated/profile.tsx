import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db-shim";
import { MfaSettings } from "@/components/mfa-settings";
import { ReferralPanel } from "@/components/referral-panel";
import { PushSettings } from "@/components/push-settings";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await db.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const [f, setF] = useState({ full_name: "", phone: "", company: "", address: "" });
  useEffect(() => {
    if (data) setF({ full_name: data.full_name ?? "", phone: data.phone ?? "", company: data.company ?? "", address: data.address ?? "" });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("profiles").update(f).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold">Profile</h1><p className="text-sm text-muted-foreground">Your account information.</p></div>
      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
          <div><Label>Address</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save changes</Button>
        </CardContent>
      </Card>
      <MfaSettings />
      <PushSettings />
      <ReferralPanel />
    </div>
  );
}

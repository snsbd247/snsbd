import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";

type Factor = { id: string; friendly_name?: string; status: string; factor_type: string };

export function MfaSettings() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.all ?? []) as any);
  };
  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    if (!enrolling) return;
    setBusy(true);
    const { data: chall, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (cErr) { setBusy(false); return toast.error(cErr.message); }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrolling.id, challengeId: chall!.id, code });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor auth enabled");
    setEnrolling(null); setCode(""); refresh();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    refresh();
  };

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Two-factor authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">TOTP enabled on this account.</p>
            {verified.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">{f.friendly_name ?? "Authenticator"}</span>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)} disabled={busy}>
                  <ShieldOff className="mr-1 h-4 w-4" /> Remove
                </Button>
              </div>
            ))}
          </div>
        ) : enrolling ? (
          <div className="space-y-3">
            <p className="text-sm">Scan this QR code in Google Authenticator, 1Password, Authy, etc.</p>
            <img src={enrolling.qr} alt="TOTP QR code" className="h-40 w-40 border rounded" />
            <p className="text-xs text-muted-foreground">Or enter secret manually: <code className="font-mono">{enrolling.secret}</code></p>
            <div>
              <Label>6-digit code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="max-w-[10rem]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={verify} disabled={busy || code.length !== 6}>Verify & enable</Button>
              <Button variant="ghost" onClick={() => { setEnrolling(null); setCode(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">Add an extra layer of security with a TOTP authenticator app.</p>
            <Button onClick={startEnroll} disabled={busy}>Enable 2FA</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

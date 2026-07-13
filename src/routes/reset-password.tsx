import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type Search = { admin?: boolean };

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    admin: s.admin === true || s.admin === "true",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { admin } = Route.useSearch();
  const navigate = useNavigate();
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase places tokens on the URL hash after clicking the reset email
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setHasRecovery(true);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setHasRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: admin ? "/admin/login" : "/login" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {hasRecovery
              ? "Enter a new password for your account."
              : "This link is invalid or has expired. Request a new password reset from the login page."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRecovery ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
              </div>
              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          ) : (
            <Link to={admin ? "/admin/login" : "/login"} className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { ShieldCheck, LogOut } from "lucide-react";
import { z } from "zod";

type Search = { redirect?: string };

export const Route = createFileRoute("/admin/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") ? s.redirect : undefined,
  }),
  component: AdminLoginPage,
});

const emailSchema = z.string().email();

async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const id = identifier.trim();
  if (emailSchema.safeParse(id).success) return id;
  const { data, error } = await supabase.rpc("email_for_username", { _username: id });
  if (error) return null;
  return (data as string | null) ?? null;
}

function AdminLoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, role, loading, signOut } = useAuth();
  const { data: company } = useCompanySettings();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (loading || !session) return;
    if (role === "admin") {
      navigate({ to: redirect && redirect.startsWith("/") ? (redirect as string) : "/dashboard" });
    }
    // Non-admin sessions must NOT reach admin. Show sign-out UI (see below).
  }, [loading, session, role, navigate, redirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return toast.error("Enter your username or email");
    setBusy(true);
    const email = await resolveLoginEmail(identifier);
    if (!email) {
      setBusy(false);
      return toast.error("No account found");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    // Role check happens in the effect above; non-admins get bounced.
    toast.success("Signed in");
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!emailSchema.safeParse(forgotEmail.trim()).success) return toast.error("Enter a valid email");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password?admin=true`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
    setMode("signin");
  }

  const nonAdminSignedIn = !loading && session && role && role !== "admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{company?.company_name ?? "Nexus CRM"} — Admin</h1>
          <p className="mt-2 text-sm text-slate-300">Restricted access. Administrators only.</p>
        </div>

        <Card>
          {nonAdminSignedIn ? (
            <>
              <CardHeader>
                <CardTitle>Wrong account</CardTitle>
                <CardDescription>
                  You're signed in as a customer. Sign out to access the admin login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={async () => {
                    await signOut();
                    toast.success("Signed out");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
                <Link to="/client" className="block text-center text-sm text-primary hover:underline">
                  Go to customer portal
                </Link>
              </CardContent>
            </>
          ) : mode === "forgot" ? (
            <>
              <CardHeader>
                <CardTitle>Forgot admin password</CardTitle>
                <CardDescription>Enter the admin email to receive a reset link.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Admin email</Label>
                    <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                  </div>
                  <Button className="w-full" type="submit" disabled={busy}>
                    {busy ? "Sending…" : "Send reset link"}
                  </Button>
                  <button type="button" onClick={() => setMode("signin")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                    Back to sign in
                  </button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Admin sign in</CardTitle>
                <CardDescription>Use your admin credentials to continue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Username or Email</Label>
                    <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="superadmin" required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button className="w-full" type="submit" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in as admin"}
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Are you a customer?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Customer login
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

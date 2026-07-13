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
import { ShieldCheck } from "lucide-react";
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
  const { session, role, loading } = useAuth();
  const { data: company } = useCompanySettings();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && role === "admin") {
      if (redirect) window.location.assign(redirect);
      else navigate({ to: "/dashboard" });
    } else if (!loading && session && role && role !== "admin") {
      toast.error("This login is for admins only");
      supabase.auth.signOut();
    }
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
    toast.success("Welcome back, admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{company?.company_name ?? "Nexus CRM"} — Admin</h1>
          <p className="mt-2 text-sm text-slate-300">Restricted access. Staff & administrators only.</p>
        </div>

        <Card>
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
                <Label>Password</Label>
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
        </Card>
      </div>
    </div>
  );
}

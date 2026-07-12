import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { z } from "zod";

type Search = { mode?: "signin" | "signup"; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : "signin",
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") ? s.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { data: company } = useCompanySettings();
  const [tab, setTab] = useState<"signin" | "signup">(mode ?? "signin");

  useEffect(() => {
    if (!loading && session) {
      if (redirect) window.location.assign(redirect);
      else navigate({ to: "/dashboard" });
    }
  }, [loading, session, navigate, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src={company?.logo_url || "/favicon.png"}
            alt={`${company?.company_name ?? "Sync & Solutions IT"} logo`}
            className="mx-auto h-14 w-auto object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold">{company?.company_name ?? "Sync & Solutions IT"}</h1>
          <p className="text-sm text-muted-foreground">Sign in or create your account</p>
          {redirect && <p className="mt-2 text-xs text-emerald-600">Sign in to continue with your order</p>}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm /></TabsContent>
              <TabsContent value="signup"><SignUpForm /></TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </div>
  );
}

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username too long")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, . _ - allowed");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const emailSchema = z.string().email();

// Synthesize a stable pseudo-email for username-only accounts
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@users.nexus.local`;

async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const id = identifier.trim();
  if (emailSchema.safeParse(id).success) return id;
  const { data, error } = await supabase.rpc("email_for_username", { _username: id });
  if (error) return null;
  return (data as string | null) ?? null;
}

function SignInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return toast.error("Enter your username or email");
    setBusy(true);
    const email = await resolveLoginEmail(identifier);
    if (!email) {
      setBusy(false);
      return toast.error("No account found for that username");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label>Username or Email</Label>
        <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="superadmin" required />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = usernameSchema.safeParse(username);
    if (!u.success) return toast.error(u.error.issues[0].message);
    if (!passwordSchema.safeParse(password).success) return toast.error("Password too short (min 6)");

    const trimmedEmail = email.trim();
    const finalEmail = trimmedEmail
      ? (emailSchema.safeParse(trimmedEmail).success ? trimmedEmail : null)
      : usernameToEmail(username);
    if (!finalEmail) return toast.error("Invalid email address");

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: finalEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName || username, username: username.trim().toLowerCase() },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Username</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="superadmin" required />
      </div>
      <div className="space-y-2">
        <Label>Email <span className="text-muted-foreground">(optional)</span></Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Leave blank to skip" />
        <p className="text-xs text-muted-foreground">Email is optional. If skipped, you'll only log in with your username.</p>
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      <p className="text-xs text-muted-foreground text-center">The first account becomes admin. Others start as customer.</p>
    </form>
  );
}

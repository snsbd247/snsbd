import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { UserRound } from "lucide-react";
import { z } from "zod";

type Search = { mode?: "signin" | "signup"; redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : "signin",
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") ? s.redirect : undefined,
  }),
  component: CustomerLoginPage,
});

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username too long")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, . _ - allowed");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const emailSchema = z.string().email();

const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@users.nexus.local`;

async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const id = identifier.trim();
  if (emailSchema.safeParse(id).success) return id;
  const { data, error } = await supabase.rpc("email_for_username", { _username: id });
  if (error) return null;
  return (data as string | null) ?? null;
}

function CustomerLoginPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const { data: company } = useCompanySettings();
  const [tab, setTab] = useState<"signin" | "signup">(mode ?? "signin");

  useEffect(() => {
    if (!loading && session) {
      if (redirect) window.location.assign(redirect);
      else if (role === "admin") navigate({ to: "/dashboard" });
      else navigate({ to: "/client" });
    }
  }, [loading, session, role, navigate, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="mx-auto h-14 w-auto object-contain" />
          ) : (
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <UserRound className="h-7 w-7 text-primary" />
            </div>
          )}
          <h1 className="mt-2 text-2xl font-bold">{company?.company_name ?? "Sync & Solutions IT"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Customer portal — sign in or create an account</p>
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
          <CardContent>
            <p className="text-center text-xs text-muted-foreground">
              Are you an admin?{" "}
              <Link to="/admin/login" className="text-primary hover:underline">
                Admin login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
    toast.success("Welcome back");
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label>Username or Email</Label>
        <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
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
  const { redirect } = Route.useSearch();

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
        emailRedirectTo: window.location.origin + (redirect ?? "/client"),
        data: { full_name: fullName || username, username: username.trim().toLowerCase() },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Username</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Email <span className="text-muted-foreground">(optional)</span></Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Leave blank to skip" />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
    </form>
  );
}

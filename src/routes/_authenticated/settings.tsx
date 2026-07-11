import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useCompanySettings();

  useEffect(() => {
    if (!loading && role !== "admin") navigate({ to: "/dashboard" });
  }, [loading, role, navigate]);

  const [f, setF] = useState({
    company_name: "",
    logo_url: "",
    favicon_url: "",
    email: "",
    phone: "",
    address: "",
    footer_copyright: "",
  });

  useEffect(() => {
    if (data) {
      setF({
        company_name: data.company_name ?? "",
        logo_url: data.logo_url ?? "",
        favicon_url: data.favicon_url ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        footer_copyright: data.footer_copyright ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        id: true,
        company_name: f.company_name.trim() || "Company",
        logo_url: f.logo_url.trim() || null,
        favicon_url: f.favicon_url.trim() || null,
        email: f.email.trim() || null,
        phone: f.phone.trim() || null,
        address: f.address.trim() || null,
        footer_copyright: f.footer_copyright.trim() || null,
      };
      const { error } = await supabase.from("company_settings").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["company_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">Branding used across invoices, receipts and notifications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Displayed on the sidebar, invoices, and money receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Company name</Label>
              <Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} />
            </div>
            <div>
              <Label>Logo</Label>
              <ImageUpload
                value={f.logo_url}
                onChange={(v) => setF({ ...f, logo_url: v })}
                previewClass="h-14"
                maxKB={500}
              />
            </div>
            <div>
              <Label>Favicon</Label>
              <ImageUpload
                value={f.favicon_url}
                onChange={(v) => setF({ ...f, favicon_url: v })}
                previewClass="h-10 w-10"
                maxKB={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>Shown on invoices, receipts and outgoing emails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
          <CardDescription>Appears at the bottom of documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Copyright text</Label>
            <Input value={f.footer_copyright} placeholder="© 2026 Sync & Solutions IT. All rights reserved." onChange={(e) => setF({ ...f, footer_copyright: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}

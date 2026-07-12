import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyBranding, upsertMyBranding } from "@/lib/branding.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/branding")({
  ssr: false,
  component: BrandingPage,
});

function BrandingPage() {
  const get = useServerFn(getMyBranding);
  const save = useServerFn(upsertMyBranding);
  const { data, refetch } = useQuery({ queryKey: ["my-branding"], queryFn: () => get() });
  const [form, setForm] = useState({ company_name: "", logo_url: "", primary_color: "", custom_hostname: "", support_email: "" });

  useEffect(() => {
    if (data?.branding) {
      setForm({
        company_name: data.branding.company_name ?? "",
        logo_url: data.branding.logo_url ?? "",
        primary_color: data.branding.primary_color ?? "",
        custom_hostname: data.branding.custom_hostname ?? "",
        support_email: data.branding.support_email ?? "",
      });
    }
  }, [data]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">White-label branding</h1>
        <p className="text-sm text-muted-foreground">Your logo, colors, and custom hostname shown to your customers.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Brand identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Company name" v={form.company_name} on={(v) => setForm({ ...form, company_name: v })} />
          <Field label="Logo URL" v={form.logo_url} on={(v) => setForm({ ...form, logo_url: v })} placeholder="https://…/logo.png" />
          <Field label="Primary color (hex)" v={form.primary_color} on={(v) => setForm({ ...form, primary_color: v })} placeholder="#0f172a" />
          <Field label="Custom hostname" v={form.custom_hostname} on={(v) => setForm({ ...form, custom_hostname: v })} placeholder="portal.mybrand.com" />
          <Field label="Support email" v={form.support_email} on={(v) => setForm({ ...form, support_email: v })} placeholder="support@mybrand.com" />
          <p className="text-xs text-muted-foreground">
            Point your custom hostname's DNS to this app and add it as a custom domain in project settings.
          </p>
          <Button onClick={async () => {
            try { await save({ data: form }); toast.success("Saved"); refetch(); }
            catch (e: any) { toast.error(e.message); }
          }}>Save branding</Button>
        </CardContent>
      </Card>
      {form.logo_url && (
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3 p-4 rounded-md" style={{ backgroundColor: form.primary_color || undefined }}>
            <img src={form.logo_url} alt="Logo" className="h-10 w-auto object-contain bg-white p-1 rounded" />
            <div className="text-white font-semibold">{form.company_name || "Your brand"}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

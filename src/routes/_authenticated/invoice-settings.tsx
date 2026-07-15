import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/lib/company-settings";
import {
  DEFAULT_THEME,
  FONT_PAIRS,
  LOGO_STYLES,
  resolveTheme,
  useInvoiceTemplates,
  type InvoiceTheme,
} from "@/lib/invoice-theme";
import { InvoiceRender } from "@/components/invoice/invoice-render";
import { uploadPageMedia } from "@/lib/page-content";

export const Route = createFileRoute("/_authenticated/invoice-settings")({
  component: InvoiceSettingsPage,
});

function InvoiceSettingsPage() {
  const { data: company, refetch } = useCompanySettings();
  const { data: templates } = useInvoiceTemplates();
  const qc = useQueryClient();

  const [templateKey, setTemplateKey] = useState<string>("classic-red");
  const [theme, setTheme] = useState<InvoiceTheme>(DEFAULT_THEME);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from company + selected template
  useEffect(() => {
    if (!company || !templates) return;
    const key = company.invoice_template_key ?? "classic-red";
    setTemplateKey(key);
    const resolved = resolveTheme(
      templates,
      key,
      company.invoice_theme as Partial<InvoiceTheme> | undefined,
      company.invoice_logo_style,
      company.invoice_background_url,
    );
    setTheme(resolved);
    setLogoUrl(company.logo_url ?? null);
  }, [company, templates]);

  const previewCompany = useMemo(
    () => ({ ...(company ?? {}), logo_url: logoUrl }),
    [company, logoUrl],
  );

  const sampleInvoice = useMemo(
    () => ({
      invoice_number: "INV-PREVIEW",
      issue_date: new Date().toISOString(),
      subtotal: 10000,
      tax: 1500,
      total: 11500,
      notes: "Preview invoice — showing your chosen theme.",
      profiles: {
        id: "preview-id",
        full_name: "Sample Customer",
        email: "customer@example.com",
        address: "Dhaka, Bangladesh",
        phone: "+880 1700 000000",
      },
    }),
    [],
  );

  const sampleItems = useMemo(
    () => [
      { id: "1", description: "Web hosting — 1 year", unit_price: 5000, quantity: 1, total: 5000 },
      { id: "2", description: "Domain registration (.com)", unit_price: 1200, quantity: 1, total: 1200 },
      { id: "3", description: "Website design", unit_price: 3800, quantity: 1, total: 3800 },
    ],
    [],
  );

  const save = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase.from("company_settings").select("id").maybeSingle();
      const payload: Record<string, unknown> = {
        invoice_template_key: templateKey,
        invoice_theme: theme,
        invoice_logo_style: theme.logoStyle,
        invoice_background_url: theme.backgroundUrl ?? null,
      };
      if (logoUrl !== company?.logo_url) payload.logo_url = logoUrl;
      if (existing?.id !== undefined) {
        const { error } = await supabase.from("company_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Invoice theme saved");
      qc.invalidateQueries({ queryKey: ["company_settings"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadPageMedia(file, "invoice-logo");
      setLogoUrl(url);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const url = await uploadPageMedia(file, "invoice-bg");
      setTheme((t) => ({ ...t, backgroundUrl: url, showBackground: true }));
      toast.success("Background uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploadingBg(false);
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  }

  function applyTemplate(key: string) {
    setTemplateKey(key);
    const tpl = templates?.find((t) => t.template_key === key)?.theme ?? {};
    setTheme({ ...DEFAULT_THEME, ...tpl });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" /> Invoice Templates & Theme
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a template, tweak colors, fonts, and upload assets. Preview updates in real-time.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* --- CONTROLS --- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template</CardTitle>
              <CardDescription>Pick a built-in style to start with</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(templates ?? []).map((t) => {
                const active = t.template_key === templateKey;
                const th = { ...DEFAULT_THEME, ...t.theme };
                return (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.template_key)}
                    className={`rounded-lg border p-3 text-left transition ${active ? "ring-2 ring-primary border-primary" : "hover:border-primary/60"}`}
                  >
                    <div className="mb-2 flex h-8 overflow-hidden rounded" aria-hidden>
                      <div className="w-1/3" style={{ background: th.primary }} />
                      <div className="w-1/3" style={{ background: th.accent }} />
                      <div className="w-1/3 border" style={{ background: th.textOnPrimary }} />
                    </div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ColorRow label="Primary" value={theme.primary} onChange={(v) => setTheme((t) => ({ ...t, primary: v }))} />
              <ColorRow label="Accent (dark bar)" value={theme.accent} onChange={(v) => setTheme((t) => ({ ...t, accent: v }))} />
              <ColorRow label="Text on primary" value={theme.textOnPrimary} onChange={(v) => setTheme((t) => ({ ...t, textOnPrimary: v }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Font pair</Label>
                <Select
                  value={`${theme.fontHeading}|${theme.fontBody}`}
                  onValueChange={(v) => {
                    const [h, b] = v.split("|");
                    setTheme((t) => ({ ...t, fontHeading: h, fontBody: b }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_PAIRS.map((p) => (
                      <SelectItem key={p.label} value={`${p.heading}|${p.body}`}>
                        <span style={{ fontFamily: `"${p.heading}"` }}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Style</Label>
                <Select value={theme.logoStyle} onValueChange={(v) => setTheme((t) => ({ ...t, logoStyle: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOGO_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Upload logo</Label>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {logoUrl ? "Replace" : "Upload"}
                  </Button>
                  {logoUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>Remove</Button>
                  )}
                </div>
                {logoUrl && (
                  <div className="mt-2 flex items-center justify-center rounded border bg-slate-100 p-2">
                    <img src={logoUrl} alt="logo" className="h-14 object-contain" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Background image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="bg-toggle">Show background</Label>
                <Switch
                  id="bg-toggle"
                  checked={theme.showBackground}
                  onCheckedChange={(v) => setTheme((t) => ({ ...t, showBackground: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Opacity ({Math.round(theme.backgroundOpacity * 100)}%)</Label>
                <Slider
                  value={[theme.backgroundOpacity * 100]}
                  min={0}
                  max={40}
                  step={1}
                  onValueChange={(v) => setTheme((t) => ({ ...t, backgroundOpacity: v[0] / 100 }))}
                />
              </div>
              <div className="space-y-1.5">
                <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFile} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => bgInputRef.current?.click()} disabled={uploadingBg}>
                    {uploadingBg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {theme.backgroundUrl ? "Replace" : "Upload"}
                  </Button>
                  {theme.backgroundUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setTheme((t) => ({ ...t, backgroundUrl: null, showBackground: false }))}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- LIVE PREVIEW --- */}
        <div className="space-y-2">
          <div className="sticky top-16">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
            <div className="overflow-auto rounded-lg border bg-slate-100 p-4" style={{ maxHeight: "calc(100vh - 12rem)" }}>
              <div style={{ transform: "scale(0.72)", transformOrigin: "top left", width: 900 }}>
                <InvoiceRender
                  id="invoice-preview"
                  inv={sampleInvoice as any}
                  items={sampleItems as any}
                  company={previewCompany as any}
                  theme={theme}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="min-w-0 flex-1">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono text-xs" />
      </div>
    </div>
  );
}

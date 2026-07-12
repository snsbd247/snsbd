import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { submitLead } from "@/lib/leads";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  planName?: string;
  source?: string;
};

export function EmailCaptureDialog({ open, onOpenChange, planName, source = "pricing_cta" }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitLead({
        email,
        source,
        plan_name: planName,
        subject: planName ? `Interested in ${planName}` : "Pricing inquiry",
      });
      toast.success("Thanks! Redirecting you to finish signup…");
      onOpenChange(false);
      navigate({ to: "/auth", search: { mode: "signup" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{planName ? `Get started with ${planName}` : "Let's get you started"}</DialogTitle>
          <DialogDescription>
            Enter your email and we'll take you to the checkout in your dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
            {busy ? "Please wait…" : "Continue"}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            We'll email you at <span className="font-mono">{email || "your address"}</span> if anything's missing.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

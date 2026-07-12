import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sslczValidatePayment } from "@/lib/sslcommerz.functions";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPortalClient } from "@/integrations/supabase/portal-client";

export const Route = createFileRoute("/client/sslcz-callback")({
  ssr: false,
  component: Callback,
});

function Callback() {
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [msg, setMsg] = useState("Processing your payment…");

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const st = q.get("st");
      const tran_id = q.get("tran_id") ?? q.get("mer_txnid");
      const val_id = q.get("val_id") ?? undefined;
      if (!tran_id) { setState("fail"); setMsg("Missing transaction ID"); return; }
      if (st && st !== "success" && st !== "ipn") { setState("fail"); setMsg(`SSLCommerz returned: ${st}`); return; }

      const { data } = await getPortalClient().auth.getUser();
      if (!data.user) { setState("fail"); setMsg("Session expired. Please return to portal."); return; }

      try {
        const res = await sslczValidatePayment({ data: { tran_id, val_id } });
        if (res.ok) { setState("ok"); setMsg(`Payment successful.`); }
        else { setState("fail"); setMsg(res.message || "Payment failed"); }
      } catch (e: any) {
        setState("fail"); setMsg(e?.message ?? "Payment failed");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {state === "loading" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
        {state === "ok" && <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />}
        {state === "fail" && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
        <p className="text-sm">{msg}</p>
        <Button onClick={() => (window.location.href = "/client")}>Back to your dashboard</Button>
      </div>
    </div>
  );
}

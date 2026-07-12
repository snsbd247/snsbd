import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { bkashExecutePayment } from "@/lib/bkash.functions";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPortalClient } from "@/integrations/supabase/portal-client";

export const Route = createFileRoute("/client/bkash-callback")({
  ssr: false,
  component: Callback,
});

function Callback() {
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [msg, setMsg] = useState("Processing your payment…");

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const paymentID = q.get("paymentID");
      const status = q.get("status");
      if (!paymentID) { setState("fail"); setMsg("Missing paymentID"); return; }
      if (status && status !== "success") { setState("fail"); setMsg(`bKash returned: ${status}`); return; }

      // Ensure portal session is restored on this new tab (already set in sessionStorage by the pay button).
      const { data } = await getPortalClient().auth.getUser();
      if (!data.user) { setState("fail"); setMsg("Session expired. Please return to portal."); return; }

      try {
        const res = await bkashExecutePayment({ data: { paymentID } });
        if (res.ok) { setState("ok"); setMsg(`Payment successful. TrxID: ${res.trxID}`); }
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

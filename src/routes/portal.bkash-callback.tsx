import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

// Legacy callback URL — bKash payments created before the /portal → /client
// rename still hit this path. Forward to the new callback with search params
// intact so bkashExecutePayment still runs.
export const Route = createFileRoute("/portal/bkash-callback")({
  ssr: false,
  component: LegacyForward,
});

function LegacyForward() {
  useEffect(() => {
    const search = window.location.search;
    window.location.replace("/client/bkash-callback" + search);
  }, []);
  return <div className="p-8 text-sm text-muted-foreground">Redirecting…</div>;
}

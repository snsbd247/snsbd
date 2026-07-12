import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { savePushSubscription, deletePushSubscription } from "@/lib/push.functions";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSettings() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration("/push-sw.js").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub);
    });
  }, []);

  async function enable() {
    if (!vapid) { toast.error("Push not configured (VITE_VAPID_PUBLIC_KEY missing)"); return; }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permission denied");
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await savePushSubscription({
        data: {
          endpoint: json.endpoint!,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          user_agent: navigator.userAgent,
        },
      });
      setEnabled(true);
      toast.success("Push notifications enabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to enable push");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setEnabled(false);
      toast.success("Push notifications disabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  if (!supported) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Push notifications</CardTitle></CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {enabled ? "You'll receive push alerts for invoices and tickets." : "Get browser alerts for invoices and tickets."}
        </div>
        {enabled ? (
          <Button variant="outline" onClick={disable} disabled={busy}><BellOff className="mr-2 h-4 w-4" />Disable</Button>
        ) : (
          <Button onClick={enable} disabled={busy}><Bell className="mr-2 h-4 w-4" />Enable</Button>
        )}
      </CardContent>
    </Card>
  );
}

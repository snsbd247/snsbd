import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isPreviewOrDev() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return (
    !import.meta.env.PROD ||
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    h.endsWith(".beta.lovable.dev") ||
    window.self !== window.top
  );
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewOrDev()) return;
    if (localStorage.getItem("pwa-install-dismissed") === "1") { setDismissed(true); return; }
    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!deferred || dismissed) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
      <Download className="h-4 w-4" />
      <span className="text-sm">Install this app</span>
      <Button size="sm" onClick={async () => { await deferred.prompt(); await deferred.userChoice; setDeferred(null); }}>
        Install
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("pwa-install-dismissed", "1"); setDismissed(true); }}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

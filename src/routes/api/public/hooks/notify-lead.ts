import { createFileRoute } from "@tanstack/react-router";

const NOTIFY_TO = "no-replay@syncsolutionbd.com";

export const Route = createFileRoute("/api/public/hooks/notify-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) {
          // Silently accept; email is optional wiring.
          return Response.json({ ok: true, notified: false, reason: "no_api_key" });
        }

        const subject = `New lead: ${String(body.source ?? "contact")} — ${String(body.email ?? "")}`;
        const html = `
          <div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#0f172a">
            <h2 style="margin:0 0 12px">New marketing lead</h2>
            <table cellpadding="6" style="border-collapse:collapse;font-size:13px">
              ${Object.entries(body)
                .map(
                  ([k, v]) =>
                    `<tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">${escapeHtml(k)}</td><td style="border:1px solid #e2e8f0">${escapeHtml(String(v ?? ""))}</td></tr>`,
                )
                .join("")}
            </table>
            <p style="color:#64748b;margin-top:16px">Submitted from snsbd.lovable.app</p>
          </div>
        `;

        try {
          const { sendLovableEmail } = await import("@lovable.dev/email-js").catch(() => ({
            sendLovableEmail: null as unknown as null,
          }));
          if (typeof sendLovableEmail === "function") {
            await sendLovableEmail({
              to: NOTIFY_TO,
              subject,
              html,
            });
            return Response.json({ ok: true, notified: true });
          }
        } catch (err) {
          console.error("notify-lead: send failed", err);
        }
        return Response.json({ ok: true, notified: false, reason: "email_not_configured" });
      },
    },
  },
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

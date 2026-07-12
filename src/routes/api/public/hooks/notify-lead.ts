import { createFileRoute } from "@tanstack/react-router";

// Notification hook for new leads.
// Email delivery is enabled after the workspace email domain is set up.
// Until then this endpoint just accepts the payload and logs it server-side.
export const Route = createFileRoute("/api/public/hooks/notify-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        console.log("[lead-notify] new submission:", JSON.stringify(body));
        return Response.json({ ok: true, notified: false, reason: "email_domain_not_configured" });
      },
    },
  },
});

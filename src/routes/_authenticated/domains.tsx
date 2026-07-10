import { createFileRoute } from "@tanstack/react-router";
import { ServicesManager } from "@/components/services-manager";

export const Route = createFileRoute("/_authenticated/domains")({
  component: () => <ServicesManager filterType="domain" lockType="domain" title="Domains" subtitle="Manage customer domain registrations and renewals." />,
});

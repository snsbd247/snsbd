import { createFileRoute } from "@tanstack/react-router";
import { ServicesManager } from "@/components/services-manager";

export const Route = createFileRoute("/_authenticated/hosting")({
  component: () => <ServicesManager filterType="hosting" lockType="hosting" title="Hosting" subtitle="Manage customer hosting plans and renewals." />,
});

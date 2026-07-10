import { createFileRoute } from "@tanstack/react-router";
import { ServicesManager } from "@/components/services-manager";

export const Route = createFileRoute("/_authenticated/other-services")({
  component: () => <ServicesManager title="Other Services" subtitle="Software, licenses and miscellaneous services." />,
});

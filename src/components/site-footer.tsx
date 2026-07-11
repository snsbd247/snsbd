import { useCompanySettings } from "@/lib/company-settings";

export function SiteFooter({ className = "" }: { className?: string }) {
  const { data } = useCompanySettings();
  const text =
    data?.footer_copyright?.trim() ||
    `© ${new Date().getFullYear()} ${data?.company_name ?? "Sync & Solutions IT"}. All rights reserved.`;
  return (
    <footer className={`border-t bg-background py-4 text-center text-xs text-muted-foreground ${className}`}>
      {text}
    </footer>
  );
}

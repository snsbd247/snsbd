import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, SidebarInset, SidebarSeparator,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard, Users, Globe, HardDrive, Package, FileText, FolderKanban,
  UserCog, Receipt, LogOut, User as UserIcon, ShoppingCart, Server, ChevronRight, LifeBuoy, RefreshCw, BarChart3, BookOpen, Bell, KeyRound, Webhook, Store, Palette, Tag, Puzzle,
} from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import { useI18n } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings } from "lucide-react";
import { useCompanySettings } from "@/lib/company-settings";
import { useResellerBranding } from "@/lib/reseller-branding";
import { SiteFooter } from "@/components/site-footer";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, loading, role, user, signOut } = useAuth();
  const { data: companyRaw } = useCompanySettings();
  const brand = useResellerBranding();
  const company = {
    ...companyRaw,
    company_name: brand?.company_name || companyRaw?.company_name,
    logo_url: brand?.logo_url || companyRaw?.logo_url,
  } as typeof companyRaw;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Admin-only route prefixes — customers get bounced to /client.
  const ADMIN_ONLY_PREFIXES = [
    "/customers", "/team", "/orders", "/expenses", "/whm-servers",
    "/renewals", "/reports", "/announcements", "/referrals-admin",
    "/resellers", "/audit-log", "/domain-pricing", "/hosting-packages",
    "/service-catalog", "/coupons", "/addons", "/payment-settings",
    "/settings", "/page-contents",
  ];
  const isAdminOnlyPath = ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", search: { redirect: pathname } as any });
      return;
    }
    if (role && role !== "admin" && isAdminOnlyPath) {
      navigate({ to: "/client" });
    }
  }, [loading, session, role, navigate, pathname, isAdminOnlyPath]);

  if (loading || !session || (role && role !== "admin" && isAdminOnlyPath)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }


  const isAdmin = role === "admin";
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b">
          <div className="flex items-center gap-2 px-2 py-3">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={`${company?.company_name ?? "Company"} logo`}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <div className="flex-1">
                <div className="font-semibold text-sm">{company?.company_name ?? "Company"}</div>
                <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                  {isAdmin ? "Admin" : "Customer"}
                </div>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavGroup
                  icon={Package}
                  label={isAdmin ? "Services" : "My Services"}
                  items={[
                    { to: "/projects", label: isAdmin ? "Projects" : "My Projects" },
                    { to: "/domains", label: isAdmin ? "Domains" : "My Domains" },
                    { to: "/hosting", label: isAdmin ? "Hosting" : "My Hosting" },
                    { to: "/other-services", label: isAdmin ? "Other Services" : "Other Services" },
                  ]}
                />
                <NavGroup
                  icon={FileText}
                  label="Billing & Support"
                  items={[
                    { to: "/invoices", label: isAdmin ? "Invoices" : "My Invoices" },
                    { to: "/tickets", label: isAdmin ? "Support Tickets" : "Support" },
                  ]}
                />
                <NavGroup
                  icon={KeyRound}
                  label="Developer"
                  items={[
                    { to: "/api-keys", label: "API Keys" },
                    { to: "/webhooks", label: "Webhooks" },
                    { to: "/branding", label: "Branding" },
                  ]}
                />
              </SidebarMenu>

            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Management</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavGroup
                      icon={Users}
                      label="People"
                      items={[
                        { to: "/customers", label: "Customers" },
                        { to: "/team", label: "Team & Salary" },
                      ]}
                    />
                    <NavGroup
                      icon={ShoppingCart}
                      label="Operations"
                      items={[
                        { to: "/orders", label: "Customer Orders" },
                        { to: "/expenses", label: "Expenses" },
                        { to: "/whm-servers", label: "WHM Servers" },
                        { to: "/renewals", label: "Renewals" },
                        { to: "/reports", label: "Reports & Analytics" },
                      ]}
                    />
                    <NavGroup
                      icon={BookOpen}
                      label="Content"
                      items={[
                        { to: "/kb", label: "Knowledge Base" },
                        { to: "/announcements", label: "Announcements" },
                      ]}
                    />
                    <NavGroup
                      icon={Users}
                      label="Growth & Trust"
                      items={[
                        { to: "/referrals-admin", label: "Referral Commissions" },
                        { to: "/resellers", label: "Resellers" },
                        { to: "/audit-log", label: "Audit Log" },
                      ]}
                    />



                    <NavGroup
                      icon={Package}
                      label="Catalog & Pricing"
                      items={[
                        { to: "/hosting-packages", label: "Hosting Packages" },
                        { to: "/domain-pricing", label: "Domain Pricing" },
                        { to: "/service-catalog", label: "Service Catalog" },
                        { to: "/addons", label: "Add-ons" },
                        { to: "/coupons", label: "Coupons" },
                      ]}
                    />
                    <NavGroup
                      icon={Settings}
                      label="Configuration"
                      items={[
                        { to: "/payment-settings", label: "Payment Gateways" },
                        { to: "/settings", label: "Settings" },
                      ]}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-sidebar-foreground">{user?.email}</div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
          <div className="flex items-center gap-1">
            <LangCurrencySwitcher />
            <NotificationsBell />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
                <span className="text-sm">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>


        <main className="p-6 min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link to={to} className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroup({
  icon: Icon,
  label,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: { to: string; label: string }[];
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hasActive = items.some((i) => path === i.to || path.startsWith(i.to + "/"));
  return (
    <Collapsible defaultOpen={hasActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="data-[state=open]:bg-sidebar-accent/40"
            isActive={hasActive}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((i) => {
              const active = path === i.to || path.startsWith(i.to + "/");
              return (
                <SidebarMenuSubItem key={i.to}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link to={i.to}>{i.label}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function LangCurrencySwitcher() {
  const { lang, setLang } = useI18n();
  const { currency, setCurrency, currencies } = useCurrency();
  return (
    <div className="flex items-center gap-1">
      <Select value={lang} onValueChange={(v) => setLang(v as "en" | "bn")}>
        <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="en">EN</SelectItem>
          <SelectItem value="bn">বাংলা</SelectItem>
        </SelectContent>
      </Select>
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {currencies.map((c) => (<SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}



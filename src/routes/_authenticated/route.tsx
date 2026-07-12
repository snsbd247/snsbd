import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, SidebarInset,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, Globe, HardDrive, Package, FileText, FolderKanban,
  UserCog, Receipt, LogOut, User as UserIcon, ShoppingCart, Server,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings } from "lucide-react";
import { useCompanySettings } from "@/lib/company-settings";
import { SiteFooter } from "@/components/site-footer";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, loading, role, user, signOut } = useAuth();
  const { data: company } = useCompanySettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
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
      <Sidebar className="border-r-0 [&_[data-sidebar=sidebar]]:bg-gradient-to-b [&_[data-sidebar=sidebar]]:from-[oklch(0.22_0.08_275)] [&_[data-sidebar=sidebar]]:via-[oklch(0.2_0.09_295)] [&_[data-sidebar=sidebar]]:to-[oklch(0.18_0.1_320)]">
        <SidebarHeader className="border-b border-sidebar-border/60">
          <div className="flex items-center gap-2 px-2 py-3">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={`${company?.company_name ?? "Company"} logo`}
                className="h-9 w-auto object-contain bg-transparent drop-shadow"
              />
            ) : (
              <div className="flex-1">
                <div className="font-bold text-sm bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  {company?.company_name ?? "Company"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">{isAdmin ? "Admin" : "Customer"}</div>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-fuchsia-300/80 font-semibold tracking-wider">Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" tint="from-fuchsia-500 to-pink-500" />
                <NavItem to="/projects" icon={FolderKanban} label={isAdmin ? "Projects" : "My Projects"} tint="from-violet-500 to-indigo-500" />
                <NavItem to="/domains" icon={Globe} label={isAdmin ? "Domains" : "My Domains"} tint="from-sky-500 to-cyan-500" />
                <NavItem to="/hosting" icon={HardDrive} label={isAdmin ? "Hosting" : "My Hosting"} tint="from-emerald-500 to-teal-500" />
                <NavItem to="/other-services" icon={Package} label={isAdmin ? "Other Services" : "My Services"} tint="from-amber-500 to-orange-500" />
                <NavItem to="/invoices" icon={FileText} label={isAdmin ? "Invoices" : "My Invoices"} tint="from-rose-500 to-red-500" />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-cyan-300/80 font-semibold tracking-wider">Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <NavItem to="/customers" icon={Users} label="Customers" tint="from-pink-500 to-fuchsia-500" />
                  <NavItem to="/orders" icon={ShoppingCart} label="Customer Orders" tint="from-orange-500 to-amber-500" />
                  <NavItem to="/hosting-packages" icon={HardDrive} label="Hosting Packages" tint="from-teal-500 to-emerald-500" />
                  <NavItem to="/domain-pricing" icon={Globe} label="Domain Pricing" tint="from-cyan-500 to-sky-500" />
                  <NavItem to="/service-catalog" icon={Package} label="Service Catalog" tint="from-yellow-500 to-amber-500" />
                  <NavItem to="/team" icon={UserCog} label="Team & Salary" tint="from-purple-500 to-violet-500" />
                  <NavItem to="/expenses" icon={Receipt} label="Expenses" tint="from-red-500 to-rose-500" />
                  <NavItem to="/whm-servers" icon={Server} label="WHM Servers" tint="from-slate-400 to-slate-600" />
                  <NavItem to="/payment-settings" icon={Settings} label="Payment Gateways" tint="from-lime-500 to-green-500" />
                  <NavItem to="/settings" icon={Settings} label="Settings" tint="from-indigo-500 to-blue-500" />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border/60">
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8 ring-2 ring-fuchsia-400/40">
              <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-sidebar-foreground">{user?.email}</div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-gradient-to-r from-white via-fuchsia-50/40 to-indigo-50/40 dark:from-slate-950 dark:via-fuchsia-950/20 dark:to-indigo-950/20 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-6 w-6 ring-2 ring-fuchsia-400/40"><AvatarFallback className="text-[10px] bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white font-bold">{initials}</AvatarFallback></Avatar>
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
        </header>
        <main className="p-6 bg-gradient-to-br from-slate-50 via-white to-fuchsia-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-fuchsia-950/10 min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
        <SiteFooter />
      </SidebarInset>

    </SidebarProvider>
  );
}

function NavItem({ to, icon: Icon, label, tint }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; tint?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        className={active ? `bg-gradient-to-r ${tint ?? "from-fuchsia-500 to-indigo-500"} text-white hover:text-white shadow-md` : "text-sidebar-foreground/85 hover:text-white"}
      >
        <Link to={to} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${active ? "bg-white/20" : `bg-gradient-to-br ${tint ?? "from-fuchsia-500 to-indigo-500"} text-white shadow-sm`}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}


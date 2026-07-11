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
  UserCog, Receipt, LogOut, User as UserIcon, ShoppingCart,
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
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <img
              src={company?.logo_url || "/favicon.png"}
              alt={`${company?.company_name ?? "Company"} logo`}
              className="h-8 w-8 rounded-md bg-white object-contain"
            />
            <div>
              <div className="font-semibold text-sm">{company?.company_name ?? "Company"}</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">{isAdmin ? "Admin" : "Customer"}</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem to="/projects" icon={FolderKanban} label={isAdmin ? "Projects" : "My Projects"} />
                <NavItem to="/domains" icon={Globe} label={isAdmin ? "Domains" : "My Domains"} />
                <NavItem to="/hosting" icon={HardDrive} label={isAdmin ? "Hosting" : "My Hosting"} />
                <NavItem to="/other-services" icon={Package} label={isAdmin ? "Other Services" : "My Services"} />
                <NavItem to="/invoices" icon={FileText} label={isAdmin ? "Invoices" : "My Invoices"} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <NavItem to="/customers" icon={Users} label="Customers" />
                  <NavItem to="/hosting-packages" icon={HardDrive} label="Hosting Packages" />
                  <NavItem to="/service-catalog" icon={Package} label="Service Catalog" />
                  <NavItem to="/team" icon={UserCog} label="Team & Salary" />
                  <NavItem to="/expenses" icon={Receipt} label="Expenses" />
                  <NavItem to="/settings" icon={Settings} label="Settings" />

                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.email}</div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
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
        </header>
        <main className="p-6">
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
        <Link to={to}><Icon className="h-4 w-4" /><span>{label}</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

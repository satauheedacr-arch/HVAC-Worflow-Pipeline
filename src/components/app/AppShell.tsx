import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardCheck,
  Warehouse,
  Database,
  Settings,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FileSpreadsheet,
  CheckCircle2,
  History,
} from "lucide-react";
import { useData } from "@/lib/store";
import { exportToExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_WORKFLOW = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clients & Sites", url: "/sites", icon: Building2 },
  { title: "Purchase & Inward", url: "/purchases", icon: ShoppingCart },
  { title: "Issue & Return", url: "/ledger", icon: ArrowLeftRight },
  { title: "BOQ & Closure", url: "/boq", icon: ClipboardCheck },
  { title: "Completed Projects", url: "/completed", icon: CheckCircle2 },
  { title: "Recent Activities", url: "/activity", icon: History },
  { title: "Store Stock (ACR Office)", url: "/stock", icon: Warehouse },
] as const;

const NAV_ADMIN = [
  { title: "Masters", url: "/masters", icon: Database },
  { title: "Settings & Backup", url: "/settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const data = useData();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const renderNavList = (items: readonly { title: string; url: string; icon: typeof LayoutDashboard }[]) => {
    return (
      <ul className="space-y-1.5 px-2">
        {items.map((item) => {
          const active = isActive(item.url);
          const Icon = item.icon;

          if (collapsed) {
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  title={item.title}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg transition-all mx-auto",
                    active
                      ? "bg-copper text-white shadow-md shadow-copper/30"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.url}>
              <Link
                to={item.url}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-all",
                  active
                    ? "bg-zinc-800 text-white border-l-4 border-copper shadow-sm pl-2.5"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
                )}
              >
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md shrink-0 transition-colors",
                    active ? "text-copper" : "text-zinc-400",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <span className="truncate">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar for Desktop & Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-zinc-950 text-zinc-200 border-r border-zinc-800 transition-all duration-300 no-print",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-copper text-white shadow-md shadow-copper/30 overflow-hidden">
              {data.company.logo ? (
                <img src={data.company.logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
              ) : (
                <Snowflake className="size-5" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold tracking-tight text-white leading-tight">
                  {data.company.name}
                </div>
                <div className="truncate text-[10px] font-bold uppercase tracking-wider text-copper">
                  Material & Site Pipeline
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Collapse toggle (Desktop) */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex size-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>

            {/* Close button (Mobile) */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex lg:hidden size-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          <div>
            {!collapsed && (
              <div className="px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Workflow
              </div>
            )}
            {renderNavList(NAV_WORKFLOW)}
          </div>

          <div>
            {!collapsed && (
              <div className="px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Admin
              </div>
            )}
            {renderNavList(NAV_ADMIN)}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 p-2.5">
          {!collapsed ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel(data)}
                className="w-full justify-start gap-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs h-9"
              >
                <FileSpreadsheet className="size-4 text-emerald-500" />
                <span>Export to Excel</span>
              </Button>
              <div className="rounded-md bg-zinc-900/90 px-3 py-2 text-[11px] leading-tight text-zinc-400 border border-zinc-800/60">
                <span className="font-semibold text-zinc-200">Local Storage Active.</span> Data is safely persisted on this device.
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => exportToExcel(data)}
              title="Export all to Excel"
              className="flex size-11 items-center justify-center rounded-lg text-emerald-500 hover:bg-zinc-800 hover:text-emerald-400 transition-colors mx-auto"
            >
              <FileSpreadsheet className="size-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 min-w-0",
          collapsed ? "lg:pl-[68px]" : "lg:pl-64",
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur no-print sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-md border border-input text-foreground lg:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle navigation</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">
                HVAC Material & Site Pipeline
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-copper-soft text-copper border border-copper/30">
                v2.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(data)}
              className="hidden sm:inline-flex gap-1.5 text-xs h-8"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Excel Export</span>
            </Button>
            <Link to="/settings" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              <Settings className="size-4" />
            </Link>
          </div>
        </header>

        {/* Page Container */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

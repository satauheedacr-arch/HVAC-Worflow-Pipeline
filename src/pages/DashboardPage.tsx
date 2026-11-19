import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  IndianRupee,
  PackagePlus,
  Plus,
  Truck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { lineValue, lowStockItems, storeStock, totalPurchaseValue } from "@/lib/calc";
import { formatDate, formatINR, formatQty } from "@/lib/format";
import { PROJECT_STATUSES } from "@/types";
import { PageHeader, StatusBadge, StatCard } from "@/components/app/ui-bits";
import { SiteFormDialog } from "@/components/app/SiteFormDialog";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const data = useData();
  const [newSiteOpen, setNewSiteOpen] = useState(false);

  const stock = useMemo(() => storeStock(data), [data]);
  const low = useMemo(() => lowStockItems(data, stock), [data, stock]);
  const activeSites = data.sites.filter((s) => s.status !== "Tax Invoiced");
  const spend = totalPurchaseValue(data);
  const sites = new Map(data.sites.map((s) => [s.id, s]));

  const activity = [
    ...data.purchases.map((p) => ({
      id: p.id,
      date: p.date,
      kind: "Purchase" as const,
      no: p.invoiceNo || p.entryNo,
      who: p.vendorName,
      site: p.siteId,
      extra: formatINR(lineValue(p.items)),
    })),
    ...data.issues.map((i) => ({
      id: i.id,
      date: i.date,
      kind: "Issue" as const,
      no: i.slipNo,
      who: i.technician,
      site: i.siteId,
      extra: `${i.items.length} items`,
    })),
    ...data.returns.map((r) => ({
      id: r.id,
      date: r.date,
      kind: "Return" as const,
      no: r.slipNo,
      who: r.technician,
      site: r.siteId,
      extra: `${r.items.length} items`,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of active HVAC sites, store stock alerts, material spend, and team slips."
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Button variant="copper" size="lg" onClick={() => setNewSiteOpen(true)}>
              <Plus className="size-4" /> New Client/Site
            </Button>
            <Button asChild size="lg" variant="default">
              <Link to="/purchases">
                <PackagePlus className="size-4" /> Log Purchase
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/ledger">
                <ArrowUpFromLine className="size-4" /> Issue Material
              </Link>
            </Button>
          </div>
        }
      />

      {/* Top Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Projects / Sites"
          value={String(activeSites.length)}
          icon={<Building2 className="text-info" />}
          tone="bg-info-soft"
          sub={`${data.sites.filter((s) => s.status === "Tax Invoiced").length} completed`}
        />
        <StatCard
          label="Material Inward Spend"
          value={formatINR(spend)}
          icon={<IndianRupee className="text-copper" />}
          tone="bg-copper-soft"
          sub={`${data.purchases.length} total entries`}
        />
        <StatCard
          label="Low Stock Alerts"
          value={String(low.length)}
          icon={<AlertTriangle className={low.length ? "text-destructive" : "text-success"} />}
          tone={low.length ? "bg-danger-soft" : "bg-success-soft"}
          sub={low.length ? "Re-order required" : "All levels healthy"}
        />
        <StatCard
          label="Challans & Slips"
          value={String(data.issues.length + data.returns.length)}
          icon={<Truck className="text-foreground" />}
          tone="bg-muted"
          sub={`${data.issues.length} issues · ${data.returns.length} returns`}
        />
      </div>

      {/* Two Column Section: Low Stock + Pipeline */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Low Stock Alerts */}
        <section className="panel lg:col-span-3 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4 bg-card">
            <div className="flex items-center gap-2">
              <AlertTriangle className={low.length ? "size-4 text-destructive" : "size-4 text-success"} />
              <h2 className="font-bold text-sm">Low-Stock Store Alerts</h2>
            </div>
            <Link
              to="/stock?filter=low"
              className="text-xs font-semibold text-copper hover:underline flex items-center gap-1"
            >
              View Main Store <ArrowRight className="size-3" />
            </Link>
          </div>

          {low.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No low-stock alerts. All catalog items are above their configured minimum threshold.
            </div>
          ) : (
            <ul className="divide-y max-h-[360px] overflow-y-auto">
              {low.map(({ material: m, stock: q }) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-destructive">
                    <AlertTriangle className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.code} · <span className="font-medium text-foreground">{m.category}</span> · min {formatQty(m.minStock)}{" "}
                      {m.issueUnit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm font-bold text-destructive">
                      {formatQty(q)}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {(m.issueUnit.split("/")[0] ?? "").trim()}
                      </span>
                    </div>
                    <div className="text-[10px] text-destructive/80 font-medium">Critical Stock</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Project Pipeline Funnel */}
        <section className="panel lg:col-span-2 overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between bg-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-copper" />
              <h2 className="font-bold text-sm">Project Pipeline</h2>
            </div>
            <Link to="/sites" className="text-xs font-semibold text-copper hover:underline">
              All Sites →
            </Link>
          </div>
          <ul className="space-y-3.5 p-5 max-h-[360px] overflow-y-auto">
            {PROJECT_STATUSES.map((st) => {
              const n = data.sites.filter((s) => s.status === st).length;
              const pct = data.sites.length ? (n / data.sites.length) * 100 : 0;
              return (
                <li key={st}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <StatusBadge status={st} />
                    <span className="num font-bold text-foreground">
                      {n} <span className="font-normal text-muted-foreground text-[10px]">sites</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-copper transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Recent Activity Table */}
      <section className="panel mt-6 overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center justify-between bg-card">
          <h2 className="font-bold text-sm">Recent Activity Log</h2>
          <span className="text-xs text-muted-foreground">Showing last 8 operations</span>
        </div>
        {activity.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No transactions recorded yet. Click{" "}
            <Link to="/settings" className="font-semibold text-copper underline">
              Load Sample Data
            </Link>{" "}
            in Settings to explore full flow.
          </div>
        ) : (
          <ul className="divide-y">
            {activity.map((a) => {
              const s = a.site ? sites.get(a.site) : undefined;
              return (
                <li key={`${a.kind}-${a.id}`} className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-muted/20 transition-colors">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
                      a.kind === "Purchase"
                        ? "bg-copper-soft text-copper"
                        : a.kind === "Issue"
                          ? "bg-info-soft text-info"
                          : "bg-success-soft text-success",
                    )}
                  >
                    {a.kind === "Purchase" ? (
                      <PackagePlus />
                    ) : a.kind === "Issue" ? (
                      <ArrowUpFromLine />
                    ) : (
                      <ArrowDownToLine />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{a.kind}</span>
                      <span className="num text-xs font-semibold px-1.5 py-0.5 rounded bg-muted whitespace-nowrap inline-block">
                        {a.no}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{a.who}</span>
                      {s ? ` → ${s.clientName}` : a.kind === "Purchase" ? " → Main Store" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-xs font-bold text-foreground">{a.extra}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{formatDate(a.date)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* New Site Dialog */}
      <SiteFormDialog open={newSiteOpen} onOpenChange={setNewSiteOpen} />
    </>
  );
}

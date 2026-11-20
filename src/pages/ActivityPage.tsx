import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PackagePlus,
  ArrowUpFromLine,
  ArrowDownToLine,
  Search,
  Filter,
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  FileSpreadsheet,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatDate, formatINR, matchesQuery } from "@/lib/format";
import { lineValue } from "@/lib/calc";
import { PageHeader, StatusBadge } from "@/components/app/ui-bits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActivityPage() {
  const data = useData();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "indent" | "issue" | "return">("all");
  const [siteFilter, setSiteFilter] = useState("all");

  const sitesMap = useMemo(() => new Map(data.sites.map((s) => [s.id, s])), [data.sites]);

  const allActivities = useMemo(() => {
    const list = [
      ...data.purchases.map((p) => ({
        id: p.id,
        rawId: p.id,
        date: p.date,
        kind: "Indent" as const,
        no: p.invoiceNo || p.entryNo,
        who: p.vendorName,
        siteId: p.siteId,
        itemsCount: p.items.length,
        extra: formatINR(lineValue(p.items)),
        viewUrl: `/print/purchase/${p.id}`,
        notes: p.notes,
      })),
      ...data.issues.map((i) => ({
        id: i.id,
        rawId: i.id,
        date: i.date,
        kind: "Issue" as const,
        no: i.slipNo,
        who: i.technician,
        siteId: i.siteId,
        itemsCount: i.items.length,
        extra: `${i.items.length} materials issued`,
        viewUrl: `/print/issue/${i.id}`,
        notes: i.remarks,
      })),
      ...data.returns.map((r) => ({
        id: r.id,
        rawId: r.id,
        date: r.date,
        kind: "Return" as const,
        no: r.slipNo,
        who: r.technician,
        siteId: r.siteId,
        itemsCount: r.items.length,
        extra: `${r.items.length} materials returned`,
        viewUrl: `/print/return/${r.id}`,
        notes: r.remarks,
      })),
    ];

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.purchases, data.issues, data.returns]);

  const filtered = useMemo(() => {
    return allActivities
      .filter((a) => {
        if (typeFilter === "indent") return a.kind === "Indent";
        if (typeFilter === "issue") return a.kind === "Issue";
        if (typeFilter === "return") return a.kind === "Return";
        return true;
      })
      .filter((a) => (siteFilter === "all" ? true : a.siteId === siteFilter))
      .filter((a) => {
        const site = a.siteId ? sitesMap.get(a.siteId) : undefined;
        return matchesQuery(
          `${a.no} ${a.who} ${a.kind} ${a.notes || ""} ${site?.clientName || ""} ${site?.code || ""}`,
          query,
        );
      });
  }, [allActivities, typeFilter, siteFilter, sitesMap, query]);

  return (
    <>
      <PageHeader
        title="Recent Activities Log"
        description="Comprehensive chronological audit trail of all Material Indents, Site Gate Passes (Issues), and Surplus Returns."
        actions={
          <Button asChild variant="outline" className="h-10 text-xs gap-1.5 font-bold">
            <Link to="/">
              <ArrowLeft className="size-4" /> Back to Dashboard
            </Link>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="panel p-4 mb-6 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              typeFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All Activities ({allActivities.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("indent")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              typeFilter === "indent"
                ? "bg-copper text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            Material Indents ({data.purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("issue")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              typeFilter === "issue"
                ? "bg-info text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            Issues / Gate Passes ({data.issues.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("return")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              typeFilter === "return"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            Returns ({data.returns.length})
          </button>
        </div>

        {/* Site Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-xs font-semibold focus-visible:outline-none"
          >
            <option value="all">All Sites / ACR Office</option>
            <option value="main-store">ACR Office</option>
            {data.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.clientName} ({s.code})
              </option>
            ))}
          </select>

          <div className="relative w-56 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search slip, party, notes…"
              className="h-9 pl-8 pr-3 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Activity List Panel */}
      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-3.5 flex items-center justify-between bg-card text-xs">
          <span className="font-semibold text-muted-foreground">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> activities
          </span>
          <span className="text-[11px] text-muted-foreground">Sorted by newest date first</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No activities found matching your filters.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((a) => {
              const s = a.siteId ? sitesMap.get(a.siteId) : undefined;
              return (
                <li
                  key={`${a.kind}-${a.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5",
                        a.kind === "Indent"
                          ? "bg-copper-soft text-copper"
                          : a.kind === "Issue"
                            ? "bg-info-soft text-info"
                            : "bg-success-soft text-success",
                      )}
                    >
                      {a.kind === "Indent" ? (
                        <PackagePlus />
                      ) : a.kind === "Issue" ? (
                        <ArrowUpFromLine />
                      ) : (
                        <ArrowDownToLine />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{a.kind}</span>
                        <span className="num text-xs font-bold px-2 py-0.5 rounded bg-muted whitespace-nowrap inline-block text-copper">
                          {a.no}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{formatDate(a.date)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                        <span className="font-semibold text-foreground">{a.who}</span>
                        {s ? (
                          <span>
                            {" "}
                            → <span className="font-medium text-foreground">{s.clientName}</span> ({s.code})
                          </span>
                        ) : a.kind === "Indent" ? (
                          <span> → ACR Office</span>
                        ) : (
                          ""
                        )}
                        {a.notes ? <span className="italic text-muted-foreground"> — "{a.notes}"</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="num text-xs font-bold text-foreground">{a.extra}</div>
                      <div className="text-[10px] text-muted-foreground">{a.itemsCount} line items</div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold">
                      <Link to={a.viewUrl} target="_blank">
                        View / Export
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

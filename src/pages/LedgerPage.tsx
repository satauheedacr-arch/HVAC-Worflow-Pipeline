import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowUpFromLine,
  ArrowDownToLine,
  Printer,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, updateData } from "@/lib/store";
import type { IssueSlip, ReturnSlip } from "@/types";
import { formatDate, matchesQuery } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/app/ui-bits";
import { SlipForm } from "@/components/app/SlipForm";
import { cn } from "@/lib/utils";

type LedgerTab = "issue" | "return" | "slips";

export function LedgerPage() {
  const data = useData();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as LedgerTab) || "issue";
  const [tab, setTab] = useState<LedgerTab>(initialTab);
  const [editingSlip, setEditingSlip] = useState<{ kind: "issue" | "return"; slip: IssueSlip | ReturnSlip } | null>(null);

  // Filters for Slips History
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "issue" | "return">("all");
  const [filterSiteId, setFilterSiteId] = useState("");

  const sitesMap = useMemo(() => new Map(data.sites.map((s) => [s.id, s])), [data.sites]);
  const matsMap = useMemo(() => new Map(data.materials.map((m) => [m.id, m])), [data.materials]);

  const allSlips = useMemo(() => {
    const list = [
      ...data.issues.map((i) => ({
        ...i,
        kind: "issue" as const,
      })),
      ...data.returns.map((r) => ({
        ...r,
        kind: "return" as const,
        status: "Completed" as const,
      })),
    ];
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.issues, data.returns]);

  const filteredSlips = useMemo(() => {
    return allSlips
      .filter((s) => {
        if (filterType === "issue") return s.kind === "issue";
        if (filterType === "return") return s.kind === "return";
        return true;
      })
      .filter((s) => (!filterSiteId ? true : s.siteId === filterSiteId))
      .filter((s) => {
        const site = sitesMap.get(s.siteId);
        return matchesQuery(
          `${s.slipNo} ${s.technician} ${site?.clientName ?? ""} ${s.remarks} ${s.status}`,
          query,
        );
      });
  }, [allSlips, filterType, filterSiteId, sitesMap, query]);

  const deleteSlip = (kind: "issue" | "return", id: string, slipNo: string) => {
    if (window.confirm(`Delete ${kind === "issue" ? "Issue Slip" : "Return Receipt"} ${slipNo}? Inventory will be recalculated.`)) {
      updateData((d) => {
        if (kind === "issue") {
          return { ...d, issues: d.issues.filter((x) => x.id !== id) };
        } else {
          return { ...d, returns: d.returns.filter((x) => x.id !== id) };
        }
      });
      toast.success(`${slipNo} deleted`);
    }
  };

  return (
    <>
      <PageHeader
        title="Site Issue & Return Ledger"
        description="Issue materials from Main Store to technicians with Gate Passes, and log surplus returns from site."
      />

      {/* Tabs */}
      <div className="flex rounded-lg border bg-muted/40 p-1 max-w-lg mb-6">
        <button
          type="button"
          onClick={() => {
            setTab("issue");
            setEditingSlip(null);
          }}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-xs font-bold transition-all text-center",
            tab === "issue" ? "bg-copper text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowUpFromLine className="size-3.5 inline mr-1.5" />
          Issue Material (Gate Pass)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("return");
            setEditingSlip(null);
          }}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-xs font-bold transition-all text-center",
            tab === "return" ? "bg-copper text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowDownToLine className="size-3.5 inline mr-1.5" />
          Return Unused Material
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("slips");
            setEditingSlip(null);
          }}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-xs font-bold transition-all text-center",
            tab === "slips" ? "bg-copper text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeftRight className="size-3.5 inline mr-1.5" />
          All Slips Log ({allSlips.length})
        </button>
      </div>

      {/* Forms or History View */}
      {tab === "issue" ? (
        <SlipForm
          kind="issue"
          editing={editingSlip?.kind === "issue" ? (editingSlip.slip as IssueSlip) : undefined}
          onDone={() => setEditingSlip(null)}
        />
      ) : tab === "return" ? (
        <SlipForm
          kind="return"
          editing={editingSlip?.kind === "return" ? (editingSlip.slip as ReturnSlip) : undefined}
          onDone={() => setEditingSlip(null)}
        />
      ) : (
        /* All Slips Log */
        <section className="panel overflow-hidden">
          <div className="border-b px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card">
            <div>
              <h2 className="font-bold text-base">Material Movement Slips</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete audit trail of all issues and returns across technicians and sites.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "all" | "issue" | "return")}
                className="h-9 rounded-md border border-input bg-card px-2.5 text-xs font-semibold focus-visible:outline-none"
              >
                <option value="all">All Types</option>
                <option value="issue">Issues Only</option>
                <option value="return">Returns Only</option>
              </select>

              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-2.5 text-xs font-semibold focus-visible:outline-none max-w-[180px] truncate"
              >
                <option value="">All Sites</option>
                {data.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.clientName}
                  </option>
                ))}
              </select>

              <div className="relative sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search slip, tech…"
                  className="h-9 pl-8 pr-3 text-xs"
                />
              </div>
            </div>
          </div>

          {filteredSlips.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No movement slips found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Slip No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Project Site</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Items Count</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSlips.map((s) => {
                    const site = sitesMap.get(s.siteId);
                    const isIssue = s.kind === "issue";

                    return (
                      <tr key={`${s.kind}-${s.id}`} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded whitespace-nowrap",
                              isIssue
                                ? "bg-info-soft text-info border border-info/30"
                                : "bg-success-soft text-success border border-success/30",
                            )}
                          >
                            {isIssue ? <ArrowUpFromLine className="size-3" /> : <ArrowDownToLine className="size-3" />}
                            {isIssue ? "Issue" : "Return"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">
                          <span className="num font-bold text-copper whitespace-nowrap inline-block px-1.5 py-0.5 rounded bg-copper-soft/40 border border-copper/30">{s.slipNo}</span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          {formatDate(s.date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground">{site?.clientName || "—"}</div>
                          <div className="text-[10px] text-muted-foreground">{site?.code}</div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">{s.technician}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground">{s.items.length} materials</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-xs">
                            {s.items
                              .map((it) => matsMap.get(it.materialId)?.name || it.materialId)
                              .slice(0, 2)
                              .join(", ")}
                            {s.items.length > 2 && "..."}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold",
                              s.status === "Completed"
                                ? "bg-muted text-muted-foreground"
                                : "bg-warning-soft text-amber-800",
                            )}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isIssue && (
                              <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Link to={`/print/issue/${s.id}`} target="_blank">
                                  <Printer className="size-3 text-copper" />
                                  <span>Print Gate Pass</span>
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingSlip({ kind: s.kind, slip: s });
                                setTab(s.kind);
                              }}
                              title="Edit slip"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteSlip(s.kind, s.id, s.slipNo)}
                              title="Delete slip"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

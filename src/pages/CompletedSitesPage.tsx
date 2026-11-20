import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Building2,
  Search,
  ClipboardList,
  Printer,
  FileSpreadsheet,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
  Receipt,
  Layers,
} from "lucide-react";
import { useData } from "@/lib/store";
import { boqReconciliation } from "@/lib/calc";
import { formatDate, formatINR, formatQty, matchesQuery } from "@/lib/format";
import type { Site } from "@/types";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/ui-bits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CompletedSitesPage() {
  const data = useData();
  const [query, setQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Filter only closed / completed projects
  const completedSites = useMemo(() => {
    return data.sites.filter(
      (s) =>
        s.status === "Payment Received / Closed" ||
        s.status === "Work Completed" ||
        s.status === "FSR Signed & Handing Over Submitted" ||
        s.status === "Tax Invoice Raised" ||
        (s.status as string) === "Tax Invoiced",
    );
  }, [data.sites]);

  const filtered = useMemo(() => {
    return completedSites.filter((s) =>
      matchesQuery(
        `${s.code} ${s.clientName} ${s.contactPerson} ${s.leadTech} ${s.poNo} ${s.fsrNo} ${s.notes}`,
        query,
      ),
    );
  }, [completedSites, query]);

  const activeSite = useMemo(
    () => (selectedSiteId ? completedSites.find((s) => s.id === selectedSiteId) : null) || filtered[0] || null,
    [selectedSiteId, completedSites, filtered],
  );

  const boqRows = useMemo(() => {
    if (!activeSite) return [];
    return boqReconciliation(activeSite, data);
  }, [activeSite, data]);

  const siteIssues = useMemo(() => {
    if (!activeSite) return [];
    return data.issues.filter((i) => i.siteId === activeSite.id);
  }, [activeSite, data.issues]);

  const siteReturns = useMemo(() => {
    if (!activeSite) return [];
    return data.returns.filter((r) => r.siteId === activeSite.id);
  }, [activeSite, data.returns]);

  return (
    <>
      <PageHeader
        title="Completed Projects"
        description="Dedicated audit archive for closed and tax-invoiced sites. Review final material consumption, work done, and project closure documents."
        actions={
          <div className="flex items-center gap-2">
            {activeSite && (
              <Button asChild variant="copper" className="h-10 text-xs gap-1.5 font-bold">
                <Link to={`/print/boq/${activeSite.id}`} target="_blank">
                  <Printer className="size-4" />
                  <span>View & Print Final FSR / BOQ</span>
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {completedSites.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-10 text-emerald-600" />}
          title="No completed projects yet"
        >
          Sites marked as "Work Completed", "Tax Invoice Raised", or "Payment Received / Closed" will automatically appear on this page for final audit.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Completed Sites List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="panel p-3.5 bg-card">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search completed client, PO, tech…"
                  className="h-10 pl-9 pr-3 text-xs"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Total Completed: {completedSites.length} sites</span>
                {query && <span>Matches: {filtered.length}</span>}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[700px] overflow-y-auto">
              {filtered.map((s) => {
                const isSelected = activeSite?.id === s.id;
                const rows = boqReconciliation(s, data);
                const totalUsedItems = rows.filter((r) => r.netConsumed > 0).length;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSiteId(s.id)}
                    className={cn(
                      "panel p-4 cursor-pointer transition-all border text-left",
                      isSelected
                        ? "border-copper bg-copper-soft/20 shadow-sm ring-1 ring-copper"
                        : "border-border hover:border-foreground/30 bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">{s.clientName}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <span className="num font-bold text-copper px-1.5 py-0.2 rounded bg-muted">
                            {s.code}
                          </span>
                          <span>·</span>
                          <span>{s.leadTech ? `Tech: ${s.leadTech}` : s.address || "Completed"}</span>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Materials Used: <strong className="text-foreground">{totalUsedItems} items</strong></span>
                      {s.poNo && <span>PO: <strong className="num text-foreground">{s.poNo}</strong></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Site Audit Details */}
          <div className="lg:col-span-7">
            {activeSite ? (
              <div className="space-y-6">
                {/* Site Header Overview Panel */}
                <section className="panel p-5 bg-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="num text-xs font-bold text-copper px-2 py-0.5 rounded bg-copper-soft">
                          {activeSite.code}
                        </span>
                        <h2 className="text-lg font-bold text-foreground">{activeSite.clientName}</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{activeSite.address || "No address provided"}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={activeSite.status} />
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Link to={`/boq?site=${activeSite.id}`}>
                          <span>Open in Tracker</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-md bg-muted/30 p-2.5">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Lead Technician</div>
                      <div className="font-semibold text-foreground mt-0.5">{activeSite.leadTech || "—"}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2.5">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Client Contact</div>
                      <div className="font-semibold text-foreground mt-0.5">{activeSite.contactPerson || "—"} {activeSite.phone ? `(${activeSite.phone})` : ""}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2.5">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">PO & FSR Reference</div>
                      <div className="font-semibold text-foreground mt-0.5">PO: {activeSite.poNo || "—"} · FSR: {activeSite.fsrNo || "—"}</div>
                    </div>
                  </div>

                  {activeSite.notes && (
                    <div className="mt-3 rounded bg-muted/20 p-2.5 text-xs text-muted-foreground italic">
                      Work summary / notes: "{activeSite.notes}"
                    </div>
                  )}
                </section>

                {/* Final Net Consumed Materials Table */}
                <section className="panel overflow-hidden">
                  <div className="border-b px-5 py-3.5 flex items-center justify-between bg-card text-xs">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="size-4 text-copper" />
                      <h3 className="font-bold text-sm">Final Material Consumption Audit</h3>
                    </div>
                    <span className="text-muted-foreground font-semibold">
                      {boqRows.length} materials tracked
                    </span>
                  </div>

                  {boqRows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No materials were logged for this site.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5">Code</th>
                            <th className="px-4 py-2.5">Material & Spec</th>
                            <th className="px-4 py-2.5 text-right">Planned BOQ</th>
                            <th className="px-4 py-2.5 text-right">Issued</th>
                            <th className="px-4 py-2.5 text-right">Returned</th>
                            <th className="px-4 py-2.5 text-right font-black text-copper bg-copper-soft/40">Net Consumed</th>
                            <th className="px-4 py-2.5">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {boqRows.map((r, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-4 py-2.5 num font-bold text-foreground whitespace-nowrap">{r.material.code}</td>
                              <td className="px-4 py-2.5">
                                <div className="font-bold text-foreground">{r.material.name}</div>
                                <div className="text-[10px] text-muted-foreground">{r.size ? `Size: ${r.size}` : r.material.spec}</div>
                              </td>
                              <td className="px-4 py-2.5 text-right num text-muted-foreground">{formatQty(r.estimatedQty)}</td>
                              <td className="px-4 py-2.5 text-right num font-semibold text-blue-700">{formatQty(r.totalIssued)}</td>
                              <td className="px-4 py-2.5 text-right num font-semibold text-emerald-700">{formatQty(r.totalReturned)}</td>
                              <td className="px-4 py-2.5 text-right num font-black text-copper bg-copper-soft/20">{formatQty(r.netConsumed)}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{r.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* History of Slips for this Site */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="panel p-4 bg-card">
                    <h4 className="font-bold text-xs border-b pb-2 mb-2 flex items-center justify-between">
                      <span>Gate Passes Issued ({siteIssues.length})</span>
                    </h4>
                    {siteIssues.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No issue slips logged.</p>
                    ) : (
                      <ul className="divide-y text-xs max-h-40 overflow-y-auto">
                        {siteIssues.map((iss) => (
                          <li key={iss.id} className="py-1.5 flex justify-between items-center">
                            <div>
                              <span className="num font-bold text-copper">{iss.slipNo}</span>
                              <span className="text-muted-foreground ml-2">{formatDate(iss.date)}</span>
                            </div>
                            <span className="text-muted-foreground">{iss.items.length} items ({iss.technician})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="panel p-4 bg-card">
                    <h4 className="font-bold text-xs border-b pb-2 mb-2 flex items-center justify-between">
                      <span>Surplus Material Returns ({siteReturns.length})</span>
                    </h4>
                    {siteReturns.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No returns logged.</p>
                    ) : (
                      <ul className="divide-y text-xs max-h-40 overflow-y-auto">
                        {siteReturns.map((ret) => (
                          <li key={ret.id} className="py-1.5 flex justify-between items-center">
                            <div>
                              <span className="num font-bold text-emerald-700">{ret.slipNo}</span>
                              <span className="text-muted-foreground ml-2">{formatDate(ret.date)}</span>
                            </div>
                            <span className="text-muted-foreground">{ret.items.length} items</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

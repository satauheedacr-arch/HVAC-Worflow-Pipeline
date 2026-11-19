import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  Building2,
  Printer,
  CheckCircle2,
  Receipt,
  Edit2,
  Plus,
  ShoppingBag,
  Truck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, updateData } from "@/lib/store";
import { boqReconciliation } from "@/lib/calc";
import { formatQty, formatDate, formatINR } from "@/lib/format";
import type { ProjectStatus, Site } from "@/types";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/ui-bits";
import { EstimatedBoqDialog } from "@/components/app/SiteFormDialog";
import { SearchSelect } from "@/components/app/SearchSelect";
import { MaterialPicker } from "@/components/app/MaterialPicker";
import { COMMON_UNITS } from "@/components/app/LineItemsEditor";
import { cn } from "@/lib/utils";

export function BoqPage() {
  const data = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const siteParam = searchParams.get("site");

  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    siteParam || (data.sites[0]?.id ?? ""),
  );
  const [boqDialogOpen, setBoqDialogOpen] = useState(false);
  const [newMatPickerOpen, setNewMatPickerOpen] = useState(false);
  const [newMatId, setNewMatId] = useState("");

  const site = data.sites.find((s) => s.id === selectedSiteId);

  const siteOptions = useMemo(
    () =>
      data.sites.map((s) => ({
        value: s.id,
        label: s.clientName,
        hint: `${s.code} · ${s.status}`,
      })),
    [data.sites],
  );

  const onSelectSite = (id: string) => {
    setSelectedSiteId(id);
    setSearchParams({ site: id });
  };

  const boqRows = useMemo(() => {
    if (!site) return [];
    return boqReconciliation(site, data);
  }, [site, data]);

  // Linked Vendor Purchases
  const linkedPurchases = useMemo(() => {
    if (!site) return [];
    return data.purchases.filter(
      (p) =>
        ((p.allocation === "single" || (p.allocation as string) === "direct") && p.siteId === site.id) ||
        (p.allocation === "multi" && p.items.some((it) => it.siteId === site.id)),
    );
  }, [site, data.purchases]);

  // Linked Issues & Returns
  const linkedIssues = useMemo(() => {
    if (!site) return [];
    return data.issues.filter((i) => i.siteId === site.id);
  }, [site, data.issues]);

  const linkedReturns = useMemo(() => {
    if (!site) return [];
    return data.returns.filter((r) => r.siteId === site.id);
  }, [site, data.returns]);

  // In-place editable update handler for Estimated BOQ
  const updateEstimatedQty = (materialId: string, size: string | undefined, val: string) => {
    if (!site) return;
    const num = Math.max(0, Number(val) || 0);

    updateData((d) => ({
      ...d,
      sites: d.sites.map((s) => {
        if (s.id !== site.id) return s;
        const exists = s.estimatedBoq.some((it) => it.materialId === materialId && (it.size || "") === (size || ""));
        let updated;
        if (exists) {
          updated = s.estimatedBoq.map((it) =>
            it.materialId === materialId && (it.size || "") === (size || "")
              ? { ...it, qty: num }
              : it,
          );
        } else {
          updated = [...s.estimatedBoq, { materialId, qty: num, size }];
        }
        return { ...s, estimatedBoq: updated };
      }),
    }));
    toast.success("Estimated BOQ updated");
  };

  // In-place editable update handler for Running BOQ / Total Issued / Total Returned / Unit
  const updateTrackerCell = (
    materialId: string,
    size: string | undefined,
    field: "runningBoq" | "issued" | "returned" | "unit",
    val: string,
  ) => {
    if (!site) return;
    const key = `${materialId}__${size ?? ""}`;

    updateData((d) => ({
      ...d,
      sites: d.sites.map((s) => {
        if (s.id !== site.id) return s;
        const curAdjs = s.boqAdjustments || {};
        const curRecord = { ...(curAdjs[key] || {}) };

        if (field === "unit") {
          curRecord.unit = val.trim();
        } else if (field === "runningBoq") {
          curRecord.runningBoq = Number(val) || 0;
        } else if (field === "issued") {
          curRecord.issued = Number(val) || 0;
        } else if (field === "returned") {
          curRecord.returned = Number(val) || 0;
        }

        return {
          ...s,
          boqAdjustments: {
            ...curAdjs,
            [key]: curRecord,
          },
        };
      }),
    }));
    toast.success(`Updated ${field === "runningBoq" ? "Running BOQ" : field}`);
  };

  // Add material to tracker
  const addMaterialToTracker = (matId: string) => {
    if (!site || !matId) return;
    const m = data.materials.find((x) => x.id === matId);
    if (!m) return;

    updateData((d) => ({
      ...d,
      sites: d.sites.map((s) => {
        if (s.id !== site.id) return s;
        const exists = s.estimatedBoq.some((it) => it.materialId === matId);
        if (exists) return s;
        return {
          ...s,
          estimatedBoq: [...s.estimatedBoq, { materialId: matId, qty: 1, unit: m.issueUnit }],
        };
      }),
    }));
    setNewMatId("");
    setNewMatPickerOpen(false);
    toast.success(`Added ${m.name} to BOQ tracker`);
  };

  /**
   * Smart Toggle Logic with Rollback:
   */
  const handleStatusToggle = (targetStatus: ProjectStatus) => {
    if (!site) return;
    const isCurrent = site.status === targetStatus;

    updateData((d) => ({
      ...d,
      sites: d.sites.map((s) => {
        if (s.id !== site.id) return s;

        if (isCurrent) {
          const reverted = s.statusBefore || "Work Under Progress";
          toast.info(`Status reverted to "${reverted}"`);
          return {
            ...s,
            status: reverted,
            statusBefore: null,
          };
        } else {
          toast.success(`Site status updated to "${targetStatus}"`);
          return {
            ...s,
            statusBefore: s.status,
            status: targetStatus,
          };
        }
      }),
    }));
  };

  return (
    <>
      <PageHeader
        title="Site BOQ & Reconciliation Tracker"
        description="Editable side-by-side material reconciliation: Estimated BOQ | Total Issued | Total Returned | Net Consumed (Final BOQ) with live unit editing."
        actions={
          site ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBoqDialogOpen(true)}
                className="gap-1.5 h-9"
              >
                <Edit2 className="size-3.5 text-copper" />
                <span>Bulk Edit Planned BOQ</span>
              </Button>
              <Button asChild variant="copper" size="sm" className="gap-1.5 h-9">
                <Link to={`/print/boq/${site.id}`} target="_blank">
                  <Printer className="size-3.5" />
                  <span>Print Final BOQ / FSR</span>
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Site Selector Bar */}
      <div className="panel p-4 mb-6 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="eyebrow block mb-1.5">Select Project Site for Reconciliation</label>
          <SearchSelect
            options={siteOptions}
            value={selectedSiteId}
            onChange={onSelectSite}
            placeholder="Search site to track…"
          />
        </div>

        {site && (
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Current Milestone</div>
              <div className="mt-1">
                <StatusBadge status={site.status} />
              </div>
            </div>
            {site.leadTech && (
              <div className="border-l pl-3">
                <div className="text-xs text-muted-foreground">Lead Tech</div>
                <div className="text-xs font-bold text-foreground mt-0.5">{site.leadTech}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {!site ? (
        <EmptyState icon={<Building2 className="size-10" />} title="No site selected">
          Please select a project site above to view its material reconciliation and closure pipeline.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {/* Milestone Toggle Buttons with Rollback Logic */}
          <div className="panel p-4 bg-muted/20 border-copper/30">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <span className="eyebrow">Site Milestone Progression</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click a milestone to mark it completed. Clicking an active milestone reverts back to previous status.
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {/* Work Completed Toggle */}
              <button
                type="button"
                onClick={() => handleStatusToggle("Work Completed")}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                  site.status === "Work Completed"
                    ? "border-copper bg-copper text-white shadow-md ring-2 ring-copper/30"
                    : "border-input bg-card hover:border-foreground/40",
                )}
              >
                <div>
                  <div className="font-bold text-xs">1. Work Completed</div>
                  <div
                    className={cn(
                      "text-[10px] mt-0.5",
                      site.status === "Work Completed" ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    All on-site installation finished
                  </div>
                </div>
                <CheckCircle2
                  className={cn(
                    "size-5",
                    site.status === "Work Completed" ? "text-white" : "text-muted-foreground/40",
                  )}
                />
              </button>

              {/* FSR & Handover Toggle */}
              <button
                type="button"
                onClick={() => handleStatusToggle("FSR & Handover")}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                  site.status === "FSR & Handover"
                    ? "border-copper bg-copper text-white shadow-md ring-2 ring-copper/30"
                    : "border-input bg-card hover:border-foreground/40",
                )}
              >
                <div>
                  <div className="font-bold text-xs">2. FSR & Handover</div>
                  <div
                    className={cn(
                      "text-[10px] mt-0.5",
                      site.status === "FSR & Handover" ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    {site.fsrNo ? `FSR No: ${site.fsrNo}` : "Report signed by client"}
                  </div>
                </div>
                <CheckCircle2
                  className={cn(
                    "size-5",
                    site.status === "FSR & Handover" ? "text-white" : "text-muted-foreground/40",
                  )}
                />
              </button>

              {/* Tax Invoiced Toggle */}
              <button
                type="button"
                onClick={() => handleStatusToggle("Tax Invoiced")}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                  site.status === "Tax Invoiced"
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30"
                    : "border-input bg-card hover:border-foreground/40",
                )}
              >
                <div>
                  <div className="font-bold text-xs">3. Tax Invoiced (Closed)</div>
                  <div
                    className={cn(
                      "text-[10px] mt-0.5",
                      site.status === "Tax Invoiced" ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    Final tax invoice raised & handed over
                  </div>
                </div>
                <Receipt
                  className={cn(
                    "size-5",
                    site.status === "Tax Invoiced" ? "text-white" : "text-muted-foreground/40",
                  )}
                />
              </button>
            </div>
          </div>

          {/* Editable Reconciliation Table */}
          <section className="panel overflow-hidden">
            <div className="border-b px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-card">
              <div>
                <h3 className="font-bold text-sm">Material Consumption & BOQ Reconciliation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Directly edit Estimated BOQ, Total Issued, Total Returned, or Units right in the table below.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!newMatPickerOpen ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMatPickerOpen(true)}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="size-3 text-copper" /> Add Material to Tracker
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 w-72">
                    <MaterialPicker
                      materials={data.materials}
                      value={newMatId}
                      onChange={addMaterialToTracker}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setNewMatPickerOpen(false)}>
                      ✕
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {boqRows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No materials logged for this site yet. Click "Add Material to Tracker" or issue materials via Gate Pass.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">#</th>
                      <th className="px-4 py-3 whitespace-nowrap">Material Code</th>
                      <th className="px-4 py-3">Material Name & Specification</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Estimated BOQ</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap text-amber-800 bg-amber-50/60">
                        Running BOQ
                      </th>
                      <th className="px-4 py-3 text-right whitespace-nowrap text-blue-700 bg-blue-50/50">
                        Total Issued
                      </th>
                      <th className="px-4 py-3 text-right whitespace-nowrap text-emerald-700 bg-emerald-50/50">
                        Total Returned
                      </th>
                      <th className="px-4 py-3 text-right whitespace-nowrap font-black text-copper bg-copper-soft/50">
                        Net Consumed (Final)
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {boqRows.map((r, i) => (
                      <tr key={`${r.material.id}-${r.size || ""}`} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5 num text-muted-foreground font-semibold whitespace-nowrap">{i + 1}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="num font-bold text-foreground px-2 py-0.5 rounded bg-muted whitespace-nowrap inline-block">
                            {r.material.code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground text-sm">{r.material.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {r.size ? `Site Size: ${r.size}` : r.material.spec} · {r.material.category}
                          </div>
                        </td>

                        {/* Editable Estimated BOQ */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <input
                            type="number"
                            defaultValue={r.estimatedQty}
                            key={`est-${r.material.id}-${r.size || ""}-${r.estimatedQty}`}
                            onBlur={(e) => {
                              if (e.target.value !== String(r.estimatedQty)) {
                                updateEstimatedQty(r.material.id, r.size, e.target.value);
                              }
                            }}
                            className="num h-7 w-20 rounded border border-input bg-card px-2 text-right text-xs font-semibold outline-none focus:ring-2 focus:ring-copper"
                            title="Directly edit estimated planned quantity"
                          />
                        </td>

                        {/* Editable Running BOQ */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap bg-amber-50/30">
                          <input
                            type="number"
                            defaultValue={r.runningBoq}
                            key={`run-${r.material.id}-${r.size || ""}-${r.runningBoq}`}
                            onBlur={(e) => {
                              if (e.target.value !== String(r.runningBoq)) {
                                updateTrackerCell(r.material.id, r.size, "runningBoq", e.target.value);
                              }
                            }}
                            className="num h-7 w-20 rounded border border-amber-300 bg-white px-2 text-right text-xs font-bold text-amber-800 outline-none focus:ring-2 focus:ring-amber-500"
                            title="Directly edit running BOQ quantity"
                          />
                        </td>

                        {/* Editable Total Issued */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap bg-blue-50/30">
                          <input
                            type="number"
                            defaultValue={r.totalIssued}
                            key={`iss-${r.material.id}-${r.size || ""}-${r.totalIssued}`}
                            onBlur={(e) => {
                              if (e.target.value !== String(r.totalIssued)) {
                                updateTrackerCell(r.material.id, r.size, "issued", e.target.value);
                              }
                            }}
                            className="num h-7 w-20 rounded border border-blue-300 bg-white px-2 text-right text-xs font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                            title="Directly edit / adjust total quantity issued"
                          />
                        </td>

                        {/* Editable Total Returned */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap bg-emerald-50/30">
                          <input
                            type="number"
                            defaultValue={r.totalReturned}
                            key={`ret-${r.material.id}-${r.size || ""}-${r.totalReturned}`}
                            onBlur={(e) => {
                              if (e.target.value !== String(r.totalReturned)) {
                                updateTrackerCell(r.material.id, r.size, "returned", e.target.value);
                              }
                            }}
                            className="num h-7 w-20 rounded border border-emerald-300 bg-white px-2 text-right text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            title="Directly edit / adjust total quantity returned"
                          />
                        </td>

                        {/* Net Consumed (Final BOQ) */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap num font-black text-copper bg-copper-soft/30 text-sm">
                          {formatQty(r.netConsumed)}
                        </td>

                        {/* Editable Unit */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <input
                            type="text"
                            defaultValue={r.unit}
                            key={`unit-${r.material.id}-${r.size || ""}-${r.unit}`}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== r.unit) {
                                updateTrackerCell(r.material.id, r.size, "unit", e.target.value);
                              }
                            }}
                            list={`tracker-unit-list-${r.material.id}`}
                            className="h-7 w-20 rounded border border-input bg-card px-2 text-xs font-semibold uppercase tracking-wider outline-none focus:ring-2 focus:ring-copper"
                            title="Directly change unit (e.g. Kgs, Rmt, Feet, Lengths, Nos)"
                          />
                          <datalist id={`tracker-unit-list-${r.material.id}`}>
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u} />
                            ))}
                          </datalist>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Linked Documents Grid: Vendor Purchases & Technician Slips */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Linked Inward Purchases */}
            <section className="panel overflow-hidden">
              <div className="border-b px-5 py-3.5 flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-copper" />
                  <h3 className="font-bold text-sm">Linked Vendor Orders</h3>
                </div>
                <span className="text-xs text-muted-foreground num">{linkedPurchases.length}</span>
              </div>

              {linkedPurchases.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No orders assigned to this site.
                </div>
              ) : (
                <ul className="divide-y text-xs">
                  {linkedPurchases.map((p) => (
                    <li key={p.id} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                      <div>
                        <div className="font-bold text-foreground">
                          {p.vendorName} · <span className="num">{p.invoiceNo || p.entryNo}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {p.docType} · {formatDate(p.date)} · {p.items.length} items
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link to={`/print/purchase/${p.id}`} target="_blank">
                          <Printer className="size-3 mr-1" /> View / Print
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Linked Movement Slips (Issues & Returns) */}
            <section className="panel overflow-hidden">
              <div className="border-b px-5 py-3.5 flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-copper" />
                  <h3 className="font-bold text-sm">Linked Technician Slips</h3>
                </div>
                <span className="text-xs text-muted-foreground num">
                  {linkedIssues.length + linkedReturns.length}
                </span>
              </div>

              {linkedIssues.length + linkedReturns.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No technician slips recorded for this site yet.
                </div>
              ) : (
                <ul className="divide-y text-xs max-h-[300px] overflow-y-auto">
                  {linkedIssues.map((i) => (
                    <li key={i.id} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-bold text-info">
                            Issue
                          </span>
                          <span className="num font-bold text-foreground">{i.slipNo}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Tech: <span className="font-medium text-foreground">{i.technician}</span> · {formatDate(i.date)} · {i.items.length} items
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link to={`/print/issue/${i.id}`} target="_blank">
                          <Printer className="size-3 mr-1" /> Gate Pass
                        </Link>
                      </Button>
                    </li>
                  ))}

                  {linkedReturns.map((r) => (
                    <li key={r.id} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
                            Return
                          </span>
                          <span className="num font-bold text-foreground">{r.slipNo}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Tech: <span className="font-medium text-foreground">{r.technician}</span> · {formatDate(r.date)} · {r.items.length} items
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link to={`/print/return/${r.id}`} target="_blank">
                          <Printer className="size-3 mr-1" /> Receipt
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Edit Estimated BOQ Dialog */}
      <EstimatedBoqDialog
        open={boqDialogOpen}
        onOpenChange={setBoqDialogOpen}
        site={site}
      />
    </>
  );
}

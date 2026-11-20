import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Printer, X, Plus, Minus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData, updateData } from "@/lib/store";
import { atSiteQty, storeStock } from "@/lib/calc";
import { nextNumber, todayISO, uid, formatQty } from "@/lib/format";
import type { IssueSlip, IssueStatus, ReturnSlip, LineItem } from "@/types";
import { cn } from "@/lib/utils";
import { Field, SegmentedControl } from "./ui-bits";
import { SearchSelect } from "./SearchSelect";
import { LineItemsEditor, emptyLine, fromDrafts, requestedTotals, toDraft, type DraftLine } from "./LineItemsEditor";

type Kind = "issue" | "return";

interface Props {
  kind: Kind;
  editing?: IssueSlip | ReturnSlip;
  onDone?: () => void;
}

export function SlipForm({ kind, editing, onDone }: Props) {
  const data = useData();
  const isIssue = kind === "issue";
  const [siteId, setSiteId] = useState(editing?.siteId ?? "");
  const [technician, setTechnician] = useState(editing?.technician ?? "");
  // Issue status: Only "Dispatched" or "In Progress" (NO "Completed" during issue!)
  const [status, setStatus] = useState<IssueStatus>(
    (editing as IssueSlip | undefined)?.status === "Dispatched" ? "Dispatched" : "In Progress",
  );
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [remarks, setRemarks] = useState(editing?.remarks ?? "");

  // For Issue mode: standard line items editor
  const [lines, setLines] = useState<DraftLine[]>(
    editing ? editing.items.map(toDraft) : [emptyLine()],
  );

  // For Return mode: site-issued materials map { materialId: returnQty }
  const [returnMap, setReturnMap] = useState<Record<string, number>>({});

  const [saved, setSaved] = useState<{ id: string; slipNo: string } | null>(null);

  const site = data.sites.find((s) => s.id === siteId);

  // Live stock in ACR Office
  const currentStoreStock = useMemo(() => storeStock(data), [data]);

  // When editing an issue, add back this slip's own quantities to store stock
  const effectiveStoreStock = useMemo(() => {
    const s = new Map(currentStoreStock);
    if (editing && isIssue) {
      for (const it of editing.items) {
        s.set(it.materialId, (s.get(it.materialId) ?? 0) + Number(it.qty || 0));
      }
    }
    return s;
  }, [currentStoreStock, editing, isIssue]);

  // Materials currently present at the selected site (for Return mode)
  const siteMaterials = useMemo(() => {
    if (!siteId) return [];
    const atSite = atSiteQty(data, siteId);
    // If editing a return slip, add back this slip's returned quantities so they can be re-adjusted
    if (editing && !isIssue && editing.siteId === siteId) {
      for (const it of editing.items) {
        atSite.set(it.materialId, (atSite.get(it.materialId) ?? 0) + Number(it.qty || 0));
      }
    }

    const list: { materialId: string; name: string; code: string; unit: string; qtyAtSite: number }[] = [];
    for (const [matId, qty] of atSite.entries()) {
      if (qty > 0) {
        const m = data.materials.find((x) => x.id === matId);
        list.push({
          materialId: matId,
          name: m?.name || matId,
          code: m?.code || "—",
          unit: m?.issueUnit || "Nos",
          qtyAtSite: qty,
        });
      }
    }
    return list;
  }, [data, siteId, editing, isIssue]);

  // Initialize return map when site or editing changes
  useEffect(() => {
    if (!isIssue && siteId) {
      if (editing && editing.siteId === siteId) {
        const initial: Record<string, number> = {};
        for (const it of editing.items) {
          initial[it.materialId] = Number(it.qty || 0);
        }
        setReturnMap(initial);
      } else {
        setReturnMap({});
      }
    }
  }, [isIssue, siteId, editing]);

  const setReturnItemQty = (matId: string, val: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(val, maxQty));
    setReturnMap((prev) => ({
      ...prev,
      [matId]: clamped,
    }));
  };

  const siteOptions = data.sites
    .filter((s) => s.status !== "Payment Received / Closed" || s.id === siteId)
    .map((s) => ({
      value: s.id,
      label: s.clientName,
      hint: `${s.code} · ${s.status}`,
      keywords: `${s.address} ${s.quotationNo} ${s.poNo}`,
    }));

  const techNames = new Set(data.people.filter((p) => p.role === "Technician").map((p) => p.name));
  if (site?.leadTech) techNames.add(site.leadTech);
  if (technician) techNames.add(technician);
  const techOptions = [...techNames].map((n) => ({
    value: n,
    label: n,
    hint: n === site?.leadTech ? "Lead technician for this site" : undefined,
  }));

  const pickSite = (id: string) => {
    setSiteId(id);
    const s = data.sites.find((x) => x.id === id);
    if (s?.leadTech && !technician) setTechnician(s.leadTech);
  };

  const reset = () => {
    setSiteId("");
    setTechnician("");
    setStatus("In Progress");
    setDate(todayISO());
    setRemarks("");
    setLines([emptyLine()]);
    setReturnMap({});
  };

  const save = () => {
    if (!siteId) return void toast.error("Please select a target site");
    if (!technician) return void toast.error("Please select the technician");

    let items: LineItem[] = [];

    if (isIssue) {
      items = fromDrafts(lines);
      if (!items.length) return void toast.error("Add at least one item with valid quantity");

      // ZERO STOCK VALIDATION: Do not allow issuing if stock is 0 or requested exceeds stock
      for (const item of items) {
        const available = effectiveStoreStock.get(item.materialId) ?? 0;
        const mat = data.materials.find((m) => m.id === item.materialId);
        const name = mat?.name || item.materialId;

        if (available <= 0) {
          toast.error(`Cannot issue "${name}": Available stock in ACR Office is 0.`);
          return;
        }
        if (item.qty > available) {
          toast.error(`Cannot issue ${item.qty} of "${name}": Only ${formatQty(available)} available in ACR Office.`);
          return;
        }
      }
    } else {
      // Return mode: take items from returnMap
      for (const [matId, qty] of Object.entries(returnMap)) {
        if (qty > 0) {
          items.push({
            materialId: matId,
            qty,
          });
        }
      }
      if (!items.length) {
        toast.error("Please set a return quantity greater than 0 for at least one material.");
        return;
      }
    }

    const id = editing?.id ?? uid(isIssue ? "is" : "re");
    let slipNo = editing?.slipNo ?? "";

    updateData((d) => {
      if (isIssue) {
        if (!slipNo) slipNo = nextNumber("ISS", d.issues.map((x) => x.slipNo));
        const rec: IssueSlip = {
          id,
          slipNo,
          date,
          siteId,
          technician,
          status,
          items,
          remarks: "",
        };
        return {
          ...d,
          issues: editing ? d.issues.map((x) => (x.id === id ? rec : x)) : [...d.issues, rec],
        };
      } else {
        if (!slipNo) slipNo = nextNumber("RET", d.returns.map((x) => x.slipNo));
        const rec: ReturnSlip = {
          id,
          slipNo,
          date,
          siteId,
          technician,
          items,
          remarks: remarks.trim(),
        };
        return {
          ...d,
          returns: editing ? d.returns.map((x) => (x.id === id ? rec : x)) : [...d.returns, rec],
        };
      }
    });

    toast.success(`${isIssue ? "Gate Pass / Issue slip" : "Material return receipt"} ${slipNo} saved`);
    if (editing) {
      onDone?.();
      return;
    }
    setSaved({ id, slipNo });
    reset();
  };

  if (saved) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-12 text-center bg-card">
        <CheckCircle2 className="size-14 text-success" />
        <div>
          <div className="text-xl font-bold">
            {isIssue ? "Material Issued to Site" : "Material Return Logged"} —{" "}
            <span className="num text-copper">{saved.slipNo}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {isIssue
              ? "ACR Office inventory has been deducted, and site inventory updated."
              : "Unused items have been credited back into ACR Office stock."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {isIssue && (
            <Button asChild variant="copper" size="lg">
              <Link to={`/print/issue/${saved.id}`} target="_blank">
                <Printer className="size-4" /> Print Gate Pass / Challan
              </Link>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => setSaved(null)}>
            {isIssue ? <ArrowUpFromLine className="size-4" /> : <ArrowDownToLine className="size-4" />}{" "}
            Log Another {isIssue ? "Issue" : "Return"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className={cn("panel p-4 sm:p-6", editing && "ring-2 ring-copper")}>
      <div className="mb-5 flex items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-base font-bold">
            {editing
              ? `Edit ${editing.slipNo}`
              : isIssue
                ? "Issue Material to Site (Gate Pass)"
                : "Log Surplus Material Return from Site"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isIssue
              ? "Generates an official delivery challan and reduces ACR Office stock."
              : "Select a site to view only materials issued to it, then adjust quantities returned."}
          </p>
        </div>
        {editing && onDone && (
          <Button variant="ghost" size="sm" onClick={onDone}>
            <X className="size-4 mr-1" /> Cancel Edit
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="1 · Target Site" required>
          <SearchSelect
            options={siteOptions}
            value={siteId}
            onChange={pickSite}
            placeholder="Select project site"
            emptyText="No active sites found."
          />
        </Field>

        <Field label="2 · Technician" required>
          <SearchSelect
            options={techOptions}
            value={technician}
            onChange={setTechnician}
            placeholder="Select technician"
            emptyText="No technicians found."
            footer={
              <Link to="/masters?tab=people" className="block px-2 py-1 text-xs font-semibold text-copper hover:underline">
                + Add technicians in Masters
              </Link>
            }
          />
        </Field>

        <Field label="Date" required>
          <Input type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {/* For Issue: Work status options: ONLY In Progress or Dispatched (NO Completed) */}
      {isIssue && (
        <div className="mt-4 max-w-md">
          <Field label="3 · Work Dispatch Status at Site">
            <SegmentedControl
              value={status}
              onChange={setStatus}
              options={[
                {
                  value: "In Progress",
                  label: "In Progress",
                  sub: "Technician on site / active work",
                },
                {
                  value: "Dispatched",
                  label: "Dispatched",
                  sub: "Material dispatched with team",
                },
              ]}
            />
          </Field>
        </div>
      )}

      {/* Material Section */}
      <div className="mt-6 border-t pt-4">
        {isIssue ? (
          <>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span className="eyebrow">4 · Items to Issue</span>
              <span className="text-xs text-muted-foreground">
                Green badge shows live available stock in ACR Office. Items with zero stock cannot be issued.
              </span>
            </div>

            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              materials={data.materials}
              mode="issue"
              stock={effectiveStoreStock}
              stockLabel="ACR Office"
            />
          </>
        ) : (
          /* Return Mode: ONLY show materials that have been issued to this specific site */
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">3 · Materials Issued to this Site</span>
              <span className="text-xs text-muted-foreground">
                Only items previously issued to this site are displayed. Adjust return quantity via + / - or direct input.
              </span>
            </div>

            {!siteId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                Please select a target site above to load its issued materials.
              </div>
            ) : siteMaterials.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                No materials are currently recorded at this site. Either no issues were logged yet or all materials were already returned.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Material Code</th>
                      <th className="px-4 py-3">Material Name</th>
                      <th className="px-4 py-3 text-right">Currently at Site</th>
                      <th className="px-4 py-3 text-center w-48">Return Quantity</th>
                      <th className="px-4 py-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {siteMaterials.map((m) => {
                      const qty = returnMap[m.materialId] ?? 0;
                      return (
                        <tr key={m.materialId} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-bold num text-copper whitespace-nowrap">{m.code}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                          <td className="px-4 py-3 text-right num font-bold text-foreground">
                            {formatQty(m.qtyAtSite)} {m.unit}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-7"
                                onClick={() => setReturnItemQty(m.materialId, qty - 1, m.qtyAtSite)}
                                disabled={qty <= 0}
                              >
                                <Minus className="size-3" />
                              </Button>
                              <Input
                                type="number"
                                min={0}
                                max={m.qtyAtSite}
                                value={qty === 0 ? "" : qty}
                                placeholder="0"
                                onChange={(e) =>
                                  setReturnItemQty(m.materialId, Number(e.target.value) || 0, m.qtyAtSite)
                                }
                                className="h-8 w-20 text-center font-bold text-emerald-700"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-7"
                                onClick={() => setReturnItemQty(m.materialId, qty + 1, m.qtyAtSite)}
                                disabled={qty >= m.qtyAtSite}
                              >
                                <Plus className="size-3" />
                              </Button>
                              <button
                                type="button"
                                onClick={() => setReturnItemQty(m.materialId, m.qtyAtSite, m.qtyAtSite)}
                                className="text-[10px] text-copper hover:underline font-bold ml-1"
                              >
                                All
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{m.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-4">
        {/* Only return mode has remarks; Issue Related Notes was removed per user request */}
        {!isIssue ? (
          <div className="flex-1 max-w-md">
            <Field label="Return Condition & Remarks">
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Uncut coils, leftover elbows returned undamaged..."
                className="h-10"
              />
            </Field>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Make sure technician has verified all materials before dispatch.
          </div>
        )}

        <Button variant="copper" size="lg" onClick={save} className="h-11 font-bold gap-1.5 shrink-0">
          {isIssue ? <ArrowUpFromLine className="size-4" /> : <ArrowDownToLine className="size-4" />}
          {editing ? "Save Changes" : isIssue ? "Issue Material & Generate Challan" : "Record Return to ACR Office"}
        </Button>
      </div>
    </section>
  );
}

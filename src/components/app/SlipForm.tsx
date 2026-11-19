import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData, updateData } from "@/lib/store";
import { atSiteQty, storeStock } from "@/lib/calc";
import { nextNumber, todayISO, uid } from "@/lib/format";
import { ISSUE_STATUSES, type IssueSlip, type IssueStatus, type ReturnSlip } from "@/types";
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
  const [status, setStatus] = useState<IssueStatus>(
    (editing as IssueSlip | undefined)?.status ?? "In Progress",
  );
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [remarks, setRemarks] = useState(editing?.remarks ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    editing ? editing.items.map(toDraft) : [emptyLine()],
  );
  const [saved, setSaved] = useState<{ id: string; slipNo: string } | null>(null);

  const site = data.sites.find((s) => s.id === siteId);

  // Live stock for this form. When editing, add back this slip's own quantities.
  const stock = useMemo(() => {
    const base = isIssue ? storeStock(data) : siteId ? atSiteQty(data, siteId) : new Map<string, number>();
    if (editing && (isIssue || editing.siteId === siteId)) {
      for (const l of editing.items) {
        base.set(l.materialId, (base.get(l.materialId) ?? 0) + l.qty);
      }
    }
    return base;
  }, [data, isIssue, siteId, editing]);

  const siteOptions = data.sites
    .filter((s) => s.status !== "Tax Invoiced" || s.id === siteId)
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
  };

  const save = () => {
    const items = fromDrafts(lines);
    if (!siteId) return void toast.error("Please select a target site");
    if (!technician) return void toast.error("Please select the technician");
    if (!items.length) return void toast.error("Add at least one item with valid quantity");

    const totals = requestedTotals(lines);
    const short = [...totals].filter(([id, q]) => q > (stock.get(id) ?? 0));
    if (short.length) {
      const msg = isIssue
        ? `${short.length} item(s) exceed current Main Store stock. Stock will go negative. Proceed and save?`
        : `${short.length} item(s) exceed quantity currently recorded at this site. Save anyway?`;
      if (!window.confirm(msg)) return;
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
          remarks,
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
          remarks,
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
              ? "Main Store inventory has been deducted, and site inventory updated."
              : "Unused items have been credited back into Main Store stock."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <Button asChild variant="copper" size="lg">
            <Link to={isIssue ? `/print/issue/${saved.id}` : `/print/return/${saved.id}`} target="_blank">
              <Printer className="size-4" /> {isIssue ? "Print Gate Pass / Challan" : "Print Return Receipt"}
            </Link>
          </Button>
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
                : "Log Material Return from Site"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isIssue
              ? "Generates an official delivery challan and reduces store stock."
              : "Reclaims unused or surplus material back to store stock."}
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
            placeholder="Select destination site"
            emptyText="No active sites. Add one in Clients & Sites."
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

      {isIssue && (
        <div className="mt-4 max-w-xl">
          <Field label="3 · Work Progress at Site">
            <SegmentedControl
              value={status}
              onChange={setStatus}
              options={ISSUE_STATUSES.map((t) => ({
                value: t,
                label: t,
                sub: t === "Completed" ? "Work finished at site" : "Work still ongoing",
              }))}
            />
          </Field>
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="eyebrow">{isIssue ? "4 · Items to Issue" : "3 · Unused Items Returned"}</span>
          <span className="text-xs text-muted-foreground">
            {isIssue
              ? "Green badge shows live Main Store availability."
              : siteId
                ? "Green badge shows material quantity currently present at this site."
                : "Select a site above to view at-site inventory."}
          </span>
        </div>

        <LineItemsEditor
          lines={lines}
          onChange={setLines}
          materials={data.materials}
          mode={kind}
          stock={isIssue || siteId ? stock : undefined}
          stockLabel={isIssue ? "Store" : "At site"}
        />
      </div>

      <div className="mt-6 grid gap-4 border-t pt-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label={isIssue ? "Issue Related Notes / Reference" : "Return Condition & Remarks"}>
          <Textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={isIssue ? "e.g. Copper piping lot-1, emergency shortage, additional flare nuts..." : "e.g. Uncut coils, leftover elbows returned undamaged..."}
          />
        </Field>

        <Button variant="copper" size="lg" onClick={save} className="h-11">
          {isIssue ? <ArrowUpFromLine className="size-4" /> : <ArrowDownToLine className="size-4" />}
          {editing ? "Save Changes" : isIssue ? "Issue Material & Generate Challan" : "Record Return to Store"}
        </Button>
      </div>
    </section>
  );
}

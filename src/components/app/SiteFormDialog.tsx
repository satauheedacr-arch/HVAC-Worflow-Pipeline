import { useEffect, useState, type ComponentProps } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData, updateData } from "@/lib/store";
import { PROJECT_STATUSES, type ProjectStatus, type Site } from "@/types";
import { blankSite } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { nextNumber, todayISO, uid } from "@/lib/format";
import { Field } from "./ui-bits";
import { LineItemsEditor, emptyLine, fromDrafts, toDraft, type DraftLine } from "./LineItemsEditor";

type SiteForm = Omit<Site, "id" | "code" | "estimatedBoq" | "statusBefore" | "createdAt">;

const blank = (): SiteForm => {
  const { estimatedBoq: _e, statusBefore: _s, ...rest } = blankSite();
  return { ...rest, quotationDate: todayISO() };
};

/** Status picker as tappable chips (no scrolling dropdown) */
export function StatusPicker({
  value,
  onChange,
}: {
  value: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PROJECT_STATUSES.map((st, i) => (
        <button
          key={st}
          type="button"
          onClick={() => onChange(st)}
          className={cn(
            "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all text-left",
            value === st
              ? "border-copper bg-copper text-white shadow-sm ring-2 ring-copper/30"
              : "border-input bg-card text-foreground hover:border-foreground/40 hover:bg-muted/30",
          )}
        >
          <span className="num mr-1 opacity-70">{i + 1}.</span>
          {st}
        </button>
      ))}
    </div>
  );
}

export function SiteFormDialog({
  open,
  onOpenChange,
  site,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  site?: Site;
}) {
  const data = useData();
  const [f, setF] = useState<SiteForm>(blank);

  useEffect(() => {
    if (open) {
      if (site) {
        const { id: _i, code: _c, estimatedBoq: _e, statusBefore: _s, createdAt: _d, ...rest } = site;
        setF({ ...blank(), ...rest });
      } else {
        setF(blank());
      }
    }
  }, [open, site]);

  const set = <K extends keyof SiteForm>(k: K, v: SiteForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const techs = data.people.filter((p) => p.role === "Technician" || p.role === "Supervisor");

  const save = () => {
    if (!f.clientName.trim()) {
      toast.error("Company / Client name is required");
      return;
    }

    if (site) {
      updateData((d) => ({
        ...d,
        sites: d.sites.map((s) => (s.id === site.id ? { ...s, ...f } : s)),
      }));
      toast.success(`Site ${site.code} updated`);
    } else {
      updateData((d) => {
        const newCode = nextNumber("SITE", d.sites.map((s) => s.code), 3);
        const newSite: Site = {
          ...blankSite(),
          ...f,
          id: uid("s"),
          code: newCode,
          createdAt: todayISO(),
        };
        return {
          ...d,
          sites: [...d.sites, newSite],
        };
      });
      toast.success("New site added successfully");
    }
    onOpenChange(false);
  };

  const input = (k: keyof SiteForm, props: ComponentProps<typeof Input> = {}) => (
    <Input
      className="h-11"
      value={String(f[k] ?? "")}
      onChange={(e) => set(k, e.target.value as never)}
      {...props}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{site ? `Edit ${site.code} — ${site.clientName}` : "New Client / Site Pipeline"}</DialogTitle>
          <DialogDescription>
            Record company details, contact person, project status, and technician.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Client Name" required className="sm:col-span-2">
            {input("clientName", { autoFocus: true, placeholder: "e.g. Prestige Tech Park / Infosys SEZ" })}
          </Field>

          <Field label="Contact Person (CP Name)">
            {input("contactPerson", { placeholder: "e.g. Mr. Rajesh Sharma" })}
          </Field>

          <Field label="CP Phone Number">
            {input("phone", { inputMode: "tel", placeholder: "e.g. +91 98765 43210" })}
          </Field>

          <Field label="Site Location / Address" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={f.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Full site address or tower / floor details"
            />
          </Field>

          <Field label="Client GSTIN">
            <Input
              className="h-11 uppercase"
              value={f.gstin}
              onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              placeholder="36AAAAA0000A1Z5"
            />
          </Field>

          <Field label="Lead Technician">
            <Input
              className="h-11"
              list="dl-techs-site"
              value={f.leadTech}
              onChange={(e) => set("leadTech", e.target.value)}
              placeholder="Pick or type technician name"
            />
            <datalist id="dl-techs-site">
              {techs.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </Field>

          <Field label="PO No. (if received)">
            {input("poNo", { placeholder: "PO-2026-XYZ" })}
          </Field>

          <Field label="Quotation No.">
            {input("quotationNo", { placeholder: "QTN-2026-001" })}
          </Field>

          <Field label="Quotation Date">
            {input("quotationDate", { type: "date" })}
          </Field>

          <Field label="FSR No. (Handover)">
            {input("fsrNo", { placeholder: "Filled during handover" })}
          </Field>

          <Field label="Project Pipeline Status" className="sm:col-span-2">
            <StatusPicker value={f.status} onChange={(v) => set("status", v)} />
          </Field>

          <Field label="Scope & Site Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="System details, tonnage, ceiling height, special requirements..."
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="copper" onClick={save}>
            {site ? "Save Changes" : "Create Site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EstimatedBoqDialog({
  open,
  onOpenChange,
  site,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  site?: Site;
}) {
  const data = useData();
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  useEffect(() => {
    if (open && site) {
      setLines(site.estimatedBoq.length ? site.estimatedBoq.map(toDraft) : [emptyLine()]);
    }
  }, [open, site]);

  if (!site) return null;

  const save = () => {
    const items = fromDrafts(lines);
    updateData((d) => ({
      ...d,
      sites: d.sites.map((s) => (s.id === site.id ? { ...s, estimatedBoq: items } : s)),
    }));
    toast.success(`Estimated BOQ saved (${items.length} items)`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Estimated BOQ — {site.clientName}</DialogTitle>
          <DialogDescription>
            Planned material quantities for this site. Changes sync instantly across Sites, BOQ Tracker, and Printouts.
          </DialogDescription>
        </DialogHeader>

        <LineItemsEditor lines={lines} onChange={setLines} materials={data.materials} mode="boq" />

        <DialogFooter className="gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="copper" onClick={save}>
            Save BOQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

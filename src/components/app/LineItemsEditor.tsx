import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LineItem, Material } from "@/types";
import { formatINR, formatQty, uid } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MaterialPicker } from "./MaterialPicker";
import { SearchSelect, type SelectOption } from "./SearchSelect";

export interface DraftLine {
  key: string;
  materialId: string;
  qty: string;
  rate: string;
  unit: string;
  size: string;
  siteId: string;
}

export const COMMON_UNITS = [
  "Kgs",
  "Rmt",
  "Feet",
  "Lengths",
  "Coils",
  "Nos",
  "Mtrs",
  "Sq.ft",
  "Sq.mtrs",
  "Sets",
  "Cylinder",
  "Ltrs",
  "Rolls",
];

export const emptyLine = (): DraftLine => ({
  key: uid("ln"),
  materialId: "",
  qty: "",
  rate: "",
  unit: "",
  size: "",
  siteId: "",
});

export const toDraft = (l: LineItem): DraftLine => ({
  key: uid("ln"),
  materialId: l.materialId,
  qty: String(l.qty || ""),
  rate: l.rate !== undefined ? String(l.rate) : "",
  unit: l.unit ?? "",
  size: l.size ?? "",
  siteId: l.siteId ?? "",
});

/** Keep only complete lines (material + qty > 0) */
export function fromDrafts(
  lines: DraftLine[],
  opts: { rate?: boolean; site?: boolean } = {},
): LineItem[] {
  return lines
    .filter((l) => l.materialId && Number(l.qty) > 0)
    .map((l) => {
      const item: LineItem = {
        materialId: l.materialId,
        qty: Number(l.qty),
      };
      if (opts.rate) item.rate = Number(l.rate) || 0;
      if (l.unit.trim()) item.unit = l.unit.trim();
      if (l.size.trim()) item.size = l.size.trim();
      if (opts.site && l.siteId) item.siteId = l.siteId;
      return item;
    });
}

/** Total requested per material across the form (for stock checks) */
export function requestedTotals(lines: DraftLine[]) {
  const m = new Map<string, number>();
  for (const l of lines) {
    if (l.materialId) {
      m.set(l.materialId, (m.get(l.materialId) ?? 0) + (Number(l.qty) || 0));
    }
  }
  return m;
}

const firstUnit = (u: string) => (u.split("/")[0] ?? "").trim();

interface Props {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  materials: Material[];
  mode: "purchase" | "issue" | "return" | "boq" | "indent";
  stock?: Map<string, number>;
  stockLabel?: string;
  onMaterialPicked?: (materialId: string) => void;
  siteOptions?: SelectOption[];
}

export function LineItemsEditor({
  lines,
  onChange,
  materials,
  mode,
  stock,
  stockLabel,
  onMaterialPicked,
  siteOptions,
}: Props) {
  const mats = new Map(materials.map((m) => [m.id, m]));
  const totals = requestedTotals(lines);
  const withRate = mode === "purchase";

  // Grid columns based on mode
  const cols = withRate
    ? "md:grid-cols-[2rem_minmax(0,1fr)_6.5rem_5.5rem_6.5rem_7rem_2.5rem]"
    : "md:grid-cols-[2rem_minmax(0,1fr)_6.5rem_5.5rem_7.5rem_2.5rem]";

  const set = (key: string, patch: Partial<DraftLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-2.5">
      <div className={cn("hidden gap-2.5 px-1 md:grid font-semibold", cols)}>
        <span className="eyebrow whitespace-nowrap">#</span>
        <span className="eyebrow whitespace-nowrap">Material & Specification</span>
        <span className="eyebrow whitespace-nowrap">Quantity</span>
        <span className="eyebrow whitespace-nowrap">Unit</span>
        {withRate && <span className="eyebrow whitespace-nowrap">Rate (₹)</span>}
        <span className="eyebrow text-right whitespace-nowrap">
          {withRate ? "Amount (₹)" : stock ? `${stockLabel ?? "Store"} Stock` : ""}
        </span>
        <span />
      </div>

      {lines.map((l, idx) => {
        const m = mats.get(l.materialId);
        const available = stock?.get(l.materialId) ?? 0;
        const totalReq = totals.get(l.materialId) ?? 0;
        const over =
          (mode === "issue" || mode === "return") &&
          Boolean(stock) &&
          Boolean(l.materialId) &&
          totalReq > available;
        const defaultUnit = m ? (withRate || mode === "indent" ? m.purchaseUnit : m.issueUnit) : "";
        const effectiveUnit = l.unit || firstUnit(defaultUnit) || "Nos";
        const remove = () =>
          onChange(lines.length === 1 ? [emptyLine()] : lines.filter((x) => x.key !== l.key));

        return (
          <div
            key={l.key}
            className={cn(
              "grid grid-cols-2 gap-2.5 rounded-lg border bg-card p-3 md:items-start md:border-0 md:bg-transparent md:p-0",
              cols,
            )}
          >
            <span className="num hidden h-11 items-center text-sm font-semibold text-muted-foreground md:flex whitespace-nowrap">
              {idx + 1}
            </span>

            {/* Material Picker + optional Size / Site */}
            <div className="col-span-2 space-y-2 md:col-span-1">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <MaterialPicker
                    materials={materials}
                    value={l.materialId}
                    stock={stock}
                    stockLabel={stockLabel}
                    onChange={(id) => {
                      const mat = mats.get(id);
                      const unitVal = mat ? (withRate || mode === "indent" ? firstUnit(mat.purchaseUnit) : firstUnit(mat.issueUnit)) : "";
                      set(l.key, { materialId: id, unit: l.unit || unitVal });
                      onMaterialPicked?.(id);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive md:hidden"
                  onClick={remove}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {m?.customSize && (
                <Input
                  value={l.size}
                  onChange={(e) => set(l.key, { size: e.target.value })}
                  placeholder="Custom site size (e.g. 24x24, 300x200 mm, 8 inch dia)"
                  className="h-9 border-copper/60 bg-copper-soft/50 text-xs font-medium"
                />
              )}

              {siteOptions && (
                <SearchSelect
                  options={siteOptions}
                  value={l.siteId}
                  onChange={(v) => set(l.key, { siteId: v })}
                  placeholder="Select target site for this item"
                  className="h-9 text-xs"
                  invalid={Boolean(l.materialId) && !l.siteId}
                />
              )}
            </div>

            {/* Qty Input */}
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={l.qty}
                onChange={(e) => set(l.key, { qty: e.target.value })}
                placeholder="Qty"
                className={cn(
                  "num h-11 font-semibold",
                  over && "border-destructive ring-1 ring-destructive",
                )}
              />
            </div>

            {/* Changable Unit Input / Datalist */}
            <div className="relative">
              <Input
                value={l.unit || (m ? firstUnit(defaultUnit) : "")}
                onChange={(e) => set(l.key, { unit: e.target.value })}
                placeholder="Unit"
                list={`unit-list-${l.key}`}
                className="h-11 text-xs font-semibold uppercase tracking-wider"
              />
              <datalist id={`unit-list-${l.key}`}>
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            {/* Rate Input (Purchase only) */}
            {withRate && (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={l.rate}
                onChange={(e) => set(l.key, { rate: e.target.value })}
                placeholder="Rate ₹"
                className="num h-11 font-semibold"
              />
            )}

            {/* Amount / Stock Availability */}
            <div
              className={cn(
                "flex h-11 items-center justify-end text-right text-sm whitespace-nowrap",
                withRate && "max-md:col-span-2",
              )}
            >
              {withRate ? (
                <span className="num font-bold text-foreground">
                  {formatINR((Number(l.qty) || 0) * (Number(l.rate) || 0))}
                </span>
              ) : stock && l.materialId ? (
                <span
                  className={cn(
                    "num flex items-center gap-1.5 font-bold text-xs px-2 py-1 rounded whitespace-nowrap",
                    over ? "bg-danger-soft text-destructive border border-destructive/20" : "bg-success-soft text-success border border-success/20",
                  )}
                >
                  {over && <AlertTriangle className="size-3.5 shrink-0" />}
                  <span>{formatQty(available)}</span>
                  <span className="text-[10px] font-medium opacity-80">{effectiveUnit}</span>
                </span>
              ) : null}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-11 w-11 text-muted-foreground hover:text-destructive md:inline-flex"
              onClick={remove}
              aria-label="Remove item"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}

      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...lines, emptyLine()])}
          className="h-10 w-full border-dashed border-border hover:border-copper/60 hover:text-copper md:w-auto text-xs"
        >
          <Plus className="size-4 mr-1" /> Add Another Item
        </Button>
      </div>
    </div>
  );
}

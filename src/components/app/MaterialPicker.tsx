import { useMemo } from "react";
import type { Material } from "@/types";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SearchSelect, type SelectOption } from "./SearchSelect";

interface Props {
  materials: Material[];
  value: string;
  onChange: (id: string) => void;
  stock?: Map<string, number>;
  stockLabel?: string;
  invalid?: boolean;
  className?: string;
}

export function MaterialPicker({
  materials,
  value,
  onChange,
  stock,
  stockLabel = "Store",
  invalid,
  className,
}: Props) {
  const options = useMemo<SelectOption[]>(
    () =>
      materials
        .filter((m) => m.active || m.id === value)
        .map((m) => {
          const qty = stock?.get(m.id) ?? 0;
          return {
            value: m.id,
            label: m.name,
            hint: `${m.code} · ${m.spec} · ${m.category}`,
            keywords: `${m.code} ${m.category} ${m.subCategory} ${m.spec} ${m.notes}`,
            tag: m.rare ? (
              <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 border border-amber-300">
                Rare
              </span>
            ) : undefined,
            meta: stock ? (
              <span
                className={cn(
                  "num rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
                  qty > 0 ? "bg-success-soft text-success border border-success/30" : "bg-danger-soft text-destructive border border-destructive/30",
                )}
                title={`${stockLabel} stock`}
              >
                {formatQty(qty)}{" "}
                <span className="font-normal opacity-80 text-[11px]">
                  {(m.issueUnit.split("/")[0] ?? "").trim()}
                </span>
              </span>
            ) : undefined,
          };
        }),
    [materials, stock, value, stockLabel],
  );

  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Search material — e.g. 1/4, UPVC, elbow, R-32..."
      searchPlaceholder='Type "1/4", "UPVC", "elbow", "R-32", code…'
      emptyText="No material matches. Add it in Masters."
      invalid={invalid}
      className={className}
    />
  );
}

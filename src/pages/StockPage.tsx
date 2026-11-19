import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Warehouse,
  Search,
  AlertTriangle,
  PackagePlus,
  ArrowUpFromLine,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, updateData } from "@/lib/store";
import { storeStock, lowStockItems } from "@/lib/calc";
import { formatQty, matchesQuery } from "@/lib/format";
import { exportToExcel } from "@/lib/excel";
import { PageHeader, EmptyState } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export function StockPage() {
  const data = useData();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lowOnly, setLowOnly] = useState<boolean>(filterParam === "low");

  const stock = useMemo(() => storeStock(data), [data]);
  const lowList = useMemo(() => lowStockItems(data, stock), [data, stock]);

  const categories = useMemo(() => {
    const set = new Set(data.materials.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [data.materials]);

  // Total calculated statistics
  const purchasedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data.purchases) {
      if (p.isIndent || p.allocation !== "bulk") continue;
      for (const it of p.items) {
        map.set(it.materialId, (map.get(it.materialId) ?? 0) + (Number(it.qty) || 0));
      }
    }
    return map;
  }, [data.purchases]);

  const issuedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const is of data.issues) {
      for (const it of is.items) {
        map.set(it.materialId, (map.get(it.materialId) ?? 0) + (Number(it.qty) || 0));
      }
    }
    return map;
  }, [data.issues]);

  const returnedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ret of data.returns) {
      for (const it of ret.items) {
        map.set(it.materialId, (map.get(it.materialId) ?? 0) + (Number(it.qty) || 0));
      }
    }
    return map;
  }, [data.returns]);

  // Inline update Min Stock
  const updateMinStock = (materialId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    updateData((d) => ({
      ...d,
      materials: d.materials.map((m) => (m.id === materialId ? { ...m, minStock: num } : m)),
    }));
    toast.success("Min stock threshold updated");
  };

  // Inline update In-Store Manual Adjustment
  const updateStoreCount = (materialId: string, val: string) => {
    const num = Number(val) || 0;
    // Calculate what adjustment is needed to make final stock match `num`
    const currentBase = (purchasedMap.get(materialId) ?? 0) - (issuedMap.get(materialId) ?? 0) + (returnedMap.get(materialId) ?? 0);
    const neededAdj = num - currentBase;

    updateData((d) => ({
      ...d,
      materials: d.materials.map((m) =>
        m.id === materialId ? { ...m, inStoreAdjustment: neededAdj } : m,
      ),
    }));
    toast.success("Physical store stock updated");
  };

  const filteredMaterials = useMemo(() => {
    return data.materials
      .filter((m) => m.active)
      .filter((m) => (selectedCategory === "all" ? true : m.category === selectedCategory))
      .filter((m) => {
        if (!lowOnly) return true;
        const q = stock.get(m.id) ?? 0;
        return m.minStock > 0 && q <= m.minStock;
      })
      .filter((m) =>
        matchesQuery(
          `${m.code} ${m.name} ${m.spec} ${m.category} ${m.subCategory} ${m.notes}`,
          query,
        ),
      );
  }, [data.materials, selectedCategory, lowOnly, stock, query]);

  return (
    <>
      <PageHeader
        title="Main Store Stock & Inventory"
        description="Central HVAC warehouse inventory, live stock availability, inline min-stock thresholds, and physical count adjustments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(data)}
              className="gap-1.5 h-9"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span>Export Stock Excel</span>
            </Button>
            <Button asChild variant="copper" size="sm" className="h-9">
              <Link to="/purchases">
                <PackagePlus className="size-4 mr-1" /> Re-Order / Inward
              </Link>
            </Button>
          </div>
        }
      />

      {/* Low Stock Warning Banner if any */}
      {lowList.length > 0 && (
        <div className="panel p-4 mb-6 bg-danger-soft/60 border-destructive/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive text-white shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-destructive">
                {lowList.length} Material{lowList.length > 1 ? "s" : ""} Below Minimum Threshold
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Pipes, fittings, or consumables need re-ordering to avoid site stoppages.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLowOnly(!lowOnly)}
            className="text-xs font-bold text-destructive underline hover:opacity-80"
          >
            {lowOnly ? "Show All Items" : "Filter Low Stock Items Only →"}
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="panel p-4 mb-6 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-3 text-xs font-bold focus-visible:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setLowOnly(!lowOnly)}
            className={cn(
              "flex items-center gap-1.5 h-10 px-3 rounded-md border text-xs font-semibold transition-colors",
              lowOnly
                ? "border-destructive bg-destructive text-white"
                : "border-input bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <AlertTriangle className="size-3.5" />
            <span>Low Stock Only ({lowList.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, name, spec…"
            className="h-10 pl-9 pr-3 text-xs"
          />
        </div>
      </div>

      {/* Stock Master Table */}
      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-3.5 flex items-center justify-between bg-card text-xs">
          <span className="font-semibold text-muted-foreground">
            Displaying <span className="text-foreground font-bold">{filteredMaterials.length}</span> materials
          </span>
          <span className="text-[11px] text-muted-foreground">
            💡 Min Stock and Available Stock can be directly typed in the columns below.
          </span>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No materials found matching your current category or search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Material Name & Category</th>
                  <th className="px-4 py-3">Spec / Size</th>
                  <th className="px-4 py-3 text-right">Total Inward</th>
                  <th className="px-4 py-3 text-right">Total Issued</th>
                  <th className="px-4 py-3 text-right">Total Returned</th>
                  <th className="px-4 py-3 text-right bg-copper-soft/30">In-Store Available</th>
                  <th className="px-4 py-3 text-right">Min Stock Alert</th>
                  <th className="px-4 py-3">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaterials.map((m) => {
                  const q = stock.get(m.id) ?? 0;
                  const isLow = m.minStock > 0 && q <= m.minStock;
                  const totalPurchased = purchasedMap.get(m.id) ?? 0;
                  const totalIssued = issuedMap.get(m.id) ?? 0;
                  const totalReturned = returnedMap.get(m.id) ?? 0;

                  return (
                    <tr
                      key={m.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        isLow && "bg-danger-soft/20",
                      )}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="num font-bold text-foreground px-1.5 py-0.5 rounded bg-muted whitespace-nowrap inline-block">
                          {m.code}
                        </span>
                        {m.rare && (
                          <span className="ml-1.5 rounded bg-warning-soft px-1 py-0.2 text-[9px] font-bold text-amber-800 uppercase whitespace-nowrap inline-block">
                            Rare
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground text-sm">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {m.category} · {m.subCategory}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{m.spec || "—"}</td>
                      <td className="px-4 py-3.5 text-right num font-semibold text-foreground">
                        {formatQty(totalPurchased)}
                      </td>
                      <td className="px-4 py-3.5 text-right num font-semibold text-blue-700">
                        {formatQty(totalIssued)}
                      </td>
                      <td className="px-4 py-3.5 text-right num font-semibold text-emerald-700">
                        {formatQty(totalReturned)}
                      </td>

                      {/* Direct Type In-Store Quantity (rare count adjustment) */}
                      <td className="px-4 py-3.5 text-right bg-copper-soft/20">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLow && <AlertTriangle className="size-3.5 text-destructive shrink-0" />}
                          <input
                            type="number"
                            defaultValue={q}
                            key={`stock-${m.id}-${q}`}
                            onBlur={(e) => {
                              if (e.target.value !== String(q)) {
                                updateStoreCount(m.id, e.target.value);
                              }
                            }}
                            className={cn(
                              "num h-7 w-20 rounded border px-2 text-right text-xs font-black outline-none focus:ring-2 focus:ring-copper bg-card",
                              isLow
                                ? "text-destructive border-destructive"
                                : "text-foreground border-input",
                            )}
                            title="Directly edit physical available stock in Main Store"
                          />
                        </div>
                      </td>

                      {/* Direct Type Min Stock Threshold */}
                      <td className="px-4 py-3.5 text-right">
                        <input
                          type="number"
                          defaultValue={m.minStock}
                          key={`min-${m.id}-${m.minStock}`}
                          onBlur={(e) => {
                            if (e.target.value !== String(m.minStock)) {
                              updateMinStock(m.id, e.target.value);
                            }
                          }}
                          className="num h-7 w-16 rounded border border-input bg-card px-2 text-right text-xs font-semibold outline-none focus:ring-2 focus:ring-copper"
                          title="Directly edit minimum stock warning threshold"
                        />
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap text-[11px]">
                        {m.issueUnit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

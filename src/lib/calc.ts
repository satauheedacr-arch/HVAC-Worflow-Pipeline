import type { AppData, LineItem, Material, Site } from "@/types";

/**
 * Calculates current stock in Main Store for all materials.
 * Main Store Stock = Purchases (Single to Store + Multi to Store) - Total Issues + Total Returns + In-Store Adjustment
 */
export function storeStock(data: AppData): Map<string, number> {
  const stock = new Map<string, number>();

  // Initialize all materials with any manual adjustments
  for (const m of data.materials) {
    stock.set(m.id, m.inStoreAdjustment ?? 0);
  }

  // 1. Add store purchases
  for (const p of data.purchases) {
    if (p.isIndent) continue; // Indents are price enquiries, not stock received

    if (p.allocation === "single" || (p.allocation as string) === "bulk") {
      // If allocated to main store or no site specified
      if (!p.siteId || p.siteId === "main-store") {
        for (const item of p.items) {
          const cur = stock.get(item.materialId) ?? 0;
          stock.set(item.materialId, cur + (Number(item.qty) || 0));
        }
      }
    } else if (p.allocation === "multi") {
      // For multi-site purchases, items assigned to main store or without a specific site go to Main Store
      for (const item of p.items) {
        if (!item.siteId || item.siteId === "main-store") {
          const cur = stock.get(item.materialId) ?? 0;
          stock.set(item.materialId, cur + (Number(item.qty) || 0));
        }
      }
    }
  }

  // 2. Subtract issues from Main Store
  for (const issue of data.issues) {
    for (const item of issue.items) {
      const cur = stock.get(item.materialId) ?? 0;
      stock.set(item.materialId, cur - (Number(item.qty) || 0));
    }
  }

  // 3. Add returns back to Main Store
  for (const ret of data.returns) {
    for (const item of ret.items) {
      const cur = stock.get(item.materialId) ?? 0;
      stock.set(item.materialId, cur + (Number(item.qty) || 0));
    }
  }

  return stock;
}

/**
 * Calculates material quantities currently physically present at a specific site.
 * At-Site Qty = Issued from Store + Direct Purchases to Site - Returns from Site
 */
export function atSiteQty(data: AppData, siteId: string): Map<string, number> {
  const map = new Map<string, number>();

  if (!siteId || siteId === "main-store") return map;

  // 1. Purchases delivered straight to this site
  for (const p of data.purchases) {
    if (p.isIndent) continue;
    if ((p.allocation === "single" || (p.allocation as string) === "direct") && p.siteId === siteId) {
      for (const item of p.items) {
        map.set(item.materialId, (map.get(item.materialId) ?? 0) + (Number(item.qty) || 0));
      }
    } else if (p.allocation === "multi") {
      for (const item of p.items) {
        if (item.siteId === siteId) {
          map.set(item.materialId, (map.get(item.materialId) ?? 0) + (Number(item.qty) || 0));
        }
      }
    }
  }

  // 2. Material issued from store to this site
  for (const issue of data.issues) {
    if (issue.siteId === siteId) {
      for (const item of issue.items) {
        map.set(item.materialId, (map.get(item.materialId) ?? 0) + (Number(item.qty) || 0));
      }
    }
  }

  // 3. Subtract returns from this site
  for (const ret of data.returns) {
    if (ret.siteId === siteId) {
      for (const item of ret.items) {
        map.set(item.materialId, (map.get(item.materialId) ?? 0) - (Number(item.qty) || 0));
      }
    }
  }

  return map;
}

/**
 * Returns materials that are at or below their minimum stock alert threshold.
 */
export function lowStockItems(data: AppData, stockMap?: Map<string, number>): { material: Material; stock: number }[] {
  const stock = stockMap ?? storeStock(data);
  const alerts: { material: Material; stock: number }[] = [];

  for (const m of data.materials) {
    if (!m.active || !m.minStock || m.minStock <= 0) continue;
    const q = stock.get(m.id) ?? 0;
    if (q <= m.minStock) {
      alerts.push({ material: m, stock: q });
    }
  }

  return alerts.sort((a, b) => a.stock - b.stock);
}

/** Total value of a list of line items */
export function lineValue(items: LineItem[]): number {
  return items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
}

/** Total value of all purchases */
export function totalPurchaseValue(data: AppData): number {
  return data.purchases
    .filter((p) => !p.isIndent)
    .reduce((acc, p) => acc + lineValue(p.items), 0);
}

export interface BoqRow {
  material: Material;
  size?: string;
  estimatedQty: number;
  runningBoq: number;
  totalIssued: number;
  totalReturned: number;
  netConsumed: number;
  unit: string;
}

/**
 * Generates comprehensive BOQ reconciliation table for a site:
 * Estimated BOQ | Running BOQ | Total Issued | Total Returned | Net Consumed (Final BOQ) | Unit
 */
export function boqReconciliation(site: Site, data: AppData): BoqRow[] {
  const mats = new Map(data.materials.map((m) => [m.id, m]));
  const rowsMap = new Map<
    string,
    { material: Material; size?: string; est: number; running?: number; issued: number; ret: number; unit?: string }
  >();

  // 1. Seed with estimated BOQ
  for (const item of site.estimatedBoq) {
    const m = mats.get(item.materialId);
    if (!m) continue;
    const key = `${item.materialId}__${item.size ?? ""}`;
    rowsMap.set(key, {
      material: m,
      size: item.size,
      est: Number(item.qty) || 0,
      running: Number(item.qty) || 0,
      issued: 0,
      ret: 0,
      unit: item.unit || m.issueUnit,
    });
  }

  // 2. Add direct purchases to site
  for (const p of data.purchases) {
    if (p.isIndent) continue;
    if ((p.allocation === "single" || (p.allocation as string) === "direct") && p.siteId === site.id) {
      for (const item of p.items) {
        const m = mats.get(item.materialId);
        if (!m) continue;
        const key = `${item.materialId}__${item.size ?? ""}`;
        const cur = rowsMap.get(key) ?? { material: m, size: item.size, est: 0, issued: 0, ret: 0, unit: item.unit || m.issueUnit };
        cur.issued += Number(item.qty) || 0;
        rowsMap.set(key, cur);
      }
    } else if (p.allocation === "multi") {
      for (const item of p.items) {
        if (item.siteId === site.id) {
          const m = mats.get(item.materialId);
          if (!m) continue;
          const key = `${item.materialId}__${item.size ?? ""}`;
          const cur = rowsMap.get(key) ?? { material: m, size: item.size, est: 0, issued: 0, ret: 0, unit: item.unit || m.issueUnit };
          cur.issued += Number(item.qty) || 0;
          rowsMap.set(key, cur);
        }
      }
    }
  }

  // 3. Add issues
  for (const issue of data.issues) {
    if (issue.siteId === site.id) {
      for (const item of issue.items) {
        const m = mats.get(item.materialId);
        if (!m) continue;
        const key = `${item.materialId}__${item.size ?? ""}`;
        const cur = rowsMap.get(key) ?? { material: m, size: item.size, est: 0, issued: 0, ret: 0, unit: item.unit || m.issueUnit };
        cur.issued += Number(item.qty) || 0;
        rowsMap.set(key, cur);
      }
    }
  }

  // 4. Subtract returns
  for (const r of data.returns) {
    if (r.siteId === site.id) {
      for (const item of r.items) {
        const m = mats.get(item.materialId);
        if (!m) continue;
        const key = `${item.materialId}__${item.size ?? ""}`;
        const cur = rowsMap.get(key) ?? { material: m, size: item.size, est: 0, issued: 0, ret: 0, unit: item.unit || m.issueUnit };
        cur.ret += Number(item.qty) || 0;
        rowsMap.set(key, cur);
      }
    }
  }

  // 5. Apply any manual direct tracker adjustments saved on this site
  if (site.boqAdjustments) {
    for (const [key, adj] of Object.entries(site.boqAdjustments)) {
      const existing = rowsMap.get(key);
      if (existing) {
        if (adj.runningBoq !== undefined) existing.running = adj.runningBoq;
        if (adj.issued !== undefined) existing.issued = adj.issued;
        if (adj.returned !== undefined) existing.ret = adj.returned;
        if (adj.unit) existing.unit = adj.unit;
      } else {
        const [matId, size] = key.split("__");
        const m = mats.get(matId);
        if (m) {
          rowsMap.set(key, {
            material: m,
            size: size || undefined,
            est: 0,
            running: adj.runningBoq ?? 0,
            issued: adj.issued ?? 0,
            ret: adj.returned ?? 0,
            unit: adj.unit || m.issueUnit,
          });
        }
      }
    }
  }

  return Array.from(rowsMap.values()).map((r) => ({
    material: r.material,
    size: r.size,
    estimatedQty: r.est,
    runningBoq: r.running !== undefined ? r.running : r.est,
    totalIssued: r.issued,
    totalReturned: r.ret,
    netConsumed: r.issued - r.ret,
    unit: r.unit || r.material.issueUnit,
  }));
}

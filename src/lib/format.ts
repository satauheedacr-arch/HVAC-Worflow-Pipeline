/** Currency formatter in Indian Rupees (₹) */
export function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(val);
}

/** Quantity formatter showing clean numbers */
export function formatQty(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  // Round to max 2 decimal places, remove trailing zeros
  const rounded = Number(Math.round(Number(val + "e+2")) + "e-2");
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(rounded);
}

/** Pretty date formatter */
export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return "—";
  try {
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(isoDate);
    return isNaN(d.getTime()) ? isoDate : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return isoDate;
  }
}

/** Returns today in YYYY-MM-DD format */
export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Unique short id generator */
export function uid(prefix = "id"): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}-${time}${rand}`;
}

/** Generate next sequential number like ISS-001, RET-002, SITE-003 */
export function nextNumber(prefix: string, existingList: (string | undefined)[], padding = 3): string {
  let max = 0;
  const regex = new RegExp(`^${prefix}[-_]?0*(\\d+)$`, "i");
  for (const item of existingList) {
    if (!item) continue;
    const match = item.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const next = max + 1;
  return `${prefix}-${String(next).padStart(padding, "0")}`;
}

/** Check if text matches multi-word query */
export function matchesQuery(haystack: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const h = haystack.toLowerCase();
  const terms = query.toLowerCase().trim().split(/\s+/);
  return terms.every((t) => h.includes(t));
}

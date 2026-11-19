import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PackagePlus,
  ShoppingCart,
  FileText,
  Printer,
  Trash2,
  Search,
  Building2,
  Warehouse,
  Send,
  Layers,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData, updateData } from "@/lib/store";
import type { Purchase, PurchaseDocType } from "@/types";
import { PURCHASE_DOC_TYPES } from "@/types";
import { formatINR, formatQty, formatDate, todayISO, nextNumber, uid, matchesQuery } from "@/lib/format";
import { lineValue } from "@/lib/calc";
import { PageHeader, Field, SegmentedControl, EmptyState } from "@/components/app/ui-bits";
import { SearchSelect } from "@/components/app/SearchSelect";
import { LineItemsEditor, emptyLine, fromDrafts, toDraft, type DraftLine } from "@/components/app/LineItemsEditor";
import { cn } from "@/lib/utils";

type Mode = "purchase" | "indent";

export function PurchasesPage() {
  const data = useData();
  const [activeTab, setActiveTab] = useState<Mode>("purchase");
  const [docType, setDocType] = useState<PurchaseDocType>("Purchase Order");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [proformaNo, setProformaNo] = useState("");
  const [poNo, setPoNo] = useState("");
  const [date, setDate] = useState(todayISO());
  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [allocation, setAllocation] = useState<"single" | "multi">("single");
  const [selectedSingleSiteId, setSelectedSingleSiteId] = useState("main-store");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [query, setQuery] = useState("");

  // Vendor options
  const vendorOptions = useMemo(
    () =>
      data.vendors.map((v) => ({
        value: v.id,
        label: v.name,
        hint: v.category,
      })),
    [data.vendors],
  );

  // Available sites including Main Central Store
  const siteOptions = useMemo(
    () => [
      {
        value: "main-store",
        label: "Main Central Store / Central Warehouse",
        hint: "Central stock",
      },
      ...data.sites.map((s) => ({
        value: s.id,
        label: s.clientName,
        hint: `${s.code} · ${s.status}`,
      })),
    ],
    [data.sites],
  );

  const resetForm = () => {
    setInvoiceNo("");
    setProformaNo("");
    setPoNo("");
    setDate(todayISO());
    setVendorId("");
    setVendorName("");
    setVendorAddress("");
    setVendorPhone("");
    setAllocation("single");
    setSelectedSingleSiteId("main-store");
    setNotes("");
    setLines([emptyLine()]);
  };

  // Vendor selection handler: in Indent mode, auto-populate all catalog items mapped to this vendor!
  const onSelectVendor = (id: string) => {
    setVendorId(id);
    const v = data.vendors.find((x) => x.id === id);
    if (v) {
      setVendorName(v.name);
      setVendorAddress(v.address || "");
      setVendorPhone(v.phone || "");
    }

    if (activeTab === "indent" && id) {
      const vendorMaterials = data.materials.filter((m) => m.defaultVendorId === id && m.active);
      if (vendorMaterials.length > 0) {
        const prefilledLines: DraftLine[] = vendorMaterials.map((m) => ({
          key: uid("ln"),
          materialId: m.id,
          qty: "",
          rate: "",
          unit: m.purchaseUnit.split("/")[0].trim(),
          size: "",
          siteId: "",
        }));
        setLines(prefilledLines);
        toast.info(`Loaded ${vendorMaterials.length} materials supplied by ${v?.name}`);
      }
    }
  };

  const onMaterialPicked = (matId: string) => {
    if (!vendorId) {
      const m = data.materials.find((x) => x.id === matId);
      if (m && m.defaultVendorId) {
        const v = data.vendors.find((x) => x.id === m.defaultVendorId);
        if (v) {
          setVendorId(v.id);
          setVendorName(v.name);
          setVendorAddress(v.address || "");
          setVendorPhone(v.phone || "");
          toast.info(`Auto-selected vendor: ${v.name}`);
        }
      }
    }
  };

  // Site-wise breakdown for the boss's budget planning & priority decisions
  const siteWiseBreakdown = useMemo(() => {
    const siteMap = new Map<string, { siteName: string; itemCount: number; totalAmount: number; items: { name: string; qty: number; unit: string; amount: number }[] }>();

    for (const l of lines) {
      if (!l.materialId || Number(l.qty) <= 0) continue;
      const targetId = allocation === "single" ? selectedSingleSiteId : l.siteId || "main-store";
      const siteObj = siteOptions.find((s) => s.value === targetId);
      const siteName = siteObj ? siteObj.label : targetId;
      const mat = data.materials.find((m) => m.id === l.materialId);
      const amount = (Number(l.qty) || 0) * (Number(l.rate) || 0);

      const cur = siteMap.get(targetId) ?? {
        siteName,
        itemCount: 0,
        totalAmount: 0,
        items: [],
      };
      cur.itemCount += 1;
      cur.totalAmount += amount;
      cur.items.push({
        name: mat?.name || l.materialId,
        qty: Number(l.qty),
        unit: l.unit || mat?.purchaseUnit || "Nos",
        amount,
      });
      siteMap.set(targetId, cur);
    }

    return Array.from(siteMap.entries()).map(([siteId, data]) => ({
      siteId,
      ...data,
    }));
  }, [lines, allocation, selectedSingleSiteId, siteOptions, data.materials]);

  const save = () => {
    const isIndent = activeTab === "indent";
    const items = fromDrafts(lines, {
      rate: !isIndent,
      site: allocation === "multi",
    });

    if (!items.length) {
      toast.error("Please add at least one material with quantity");
      return;
    }
    if (!vendorName.trim()) {
      toast.error("Please specify the vendor name");
      return;
    }

    const id = uid(isIndent ? "ind" : "pur");
    let entryNo = "";

    updateData((d) => {
      entryNo = nextNumber(isIndent ? "IND" : "PUR", d.purchases.map((x) => x.entryNo));
      const record: Purchase = {
        id,
        entryNo,
        docType: isIndent ? "Purchase Order" : docType,
        invoiceNo: invoiceNo.trim(),
        proformaNo: proformaNo.trim(),
        poNo: poNo.trim(),
        date,
        vendorId,
        vendorName: vendorName.trim(),
        vendorAddress: vendorAddress.trim(),
        vendorPhone: vendorPhone.trim(),
        allocation,
        siteId: allocation === "single" ? selectedSingleSiteId : "",
        items,
        notes: notes.trim(),
        isIndent,
      };

      return {
        ...d,
        purchases: [record, ...d.purchases],
      };
    });

    toast.success(
      isIndent
        ? `Purchase Indent ${entryNo} created! Ready to print & email.`
        : `Purchase Order / Inward ${entryNo} saved and inventory updated!`,
    );
    resetForm();
  };

  const deletePurchase = (id: string, entryNo: string) => {
    if (window.confirm(`Delete purchase entry ${entryNo}? Store stock will be recalculated.`)) {
      updateData((d) => ({
        ...d,
        purchases: d.purchases.filter((p) => p.id !== id),
      }));
      toast.success(`Purchase ${entryNo} deleted`);
    }
  };

  const filteredPurchases = useMemo(() => {
    return data.purchases.filter((p) =>
      matchesQuery(
        `${p.entryNo} ${p.invoiceNo} ${p.proformaNo} ${p.poNo} ${p.vendorName} ${p.docType} ${p.notes}`,
        query,
      ),
    );
  }, [data.purchases, query]);

  const totalCalculatedAmount = useMemo(() => {
    return lines.reduce(
      (sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0),
      0,
    );
  }, [lines]);

  return (
    <>
      <PageHeader
        title="Purchase & Inward Orders"
        description="Raise official Purchase Orders, generate site-wise vendor indents with letterhead, and manage procurement."
      />

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-lg border bg-muted/40 p-1 max-w-md mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("purchase");
            setLines([emptyLine()]);
          }}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-xs font-bold transition-all text-center",
            activeTab === "purchase"
              ? "bg-copper text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShoppingCart className="size-3.5 inline mr-1.5" />
          Raise Purchase Order / Inward
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("indent");
            setLines([emptyLine()]);
          }}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-xs font-bold transition-all text-center",
            activeTab === "indent"
              ? "bg-copper text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Send className="size-3.5 inline mr-1.5" />
          Create Vendor Indent (Qty Enquiry)
        </button>
      </div>

      {/* Main Entry Panel */}
      <section className="panel p-5 sm:p-6 mb-8 border-t-4 border-t-copper">
        <div className="mb-5 flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-bold">
              {activeTab === "purchase" ? "Raise Purchase Order / Inward Bill" : "Generate Vendor Indent (Quotation Enquiry)"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select Single Site or Multiple Sites to calculate site-wise quantities for budget approval and ordering.
            </p>
          </div>
          {activeTab === "indent" && (
            <span className="rounded bg-info-soft px-2.5 py-1 text-xs font-bold text-info border border-info/30">
              Indent Mode: Rate & Amount Excluded for Quotation
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {/* Doc Type */}
          {activeTab === "purchase" && (
            <Field label="Document Type" required>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as PurchaseDocType)}
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PURCHASE_DOC_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Invoice / Bill No */}
          <Field label={activeTab === "purchase" ? "Vendor Ref / Bill / Inv No." : "Indent Enquiry Ref No."}>
            <Input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder={activeTab === "purchase" ? "e.g. INV-908 or PO-2026-01" : "e.g. IND-RNK-01"}
              className="h-11 font-medium"
            />
          </Field>

          {/* Proforma No */}
          {activeTab === "purchase" && (
            <Field label="Proforma Invoice No.">
              <Input
                value={proformaNo}
                onChange={(e) => setProformaNo(e.target.value)}
                placeholder="e.g. PI-8821"
                className="h-11"
              />
            </Field>
          )}

          {/* Purchase Date */}
          <Field label="Order / Indent Date" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </Field>

          {/* Internal PO No */}
          <Field label="Internal Company PO No.">
            <Input
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              placeholder="e.g. PO-AIR-2026-04"
              className="h-11"
            />
          </Field>

          {/* Vendor Picker */}
          <Field label="Select Supplier Vendor" required className="md:col-span-2">
            <SearchSelect
              options={vendorOptions}
              value={vendorId}
              onChange={onSelectVendor}
              placeholder="Search or pick vendor…"
              emptyText="No vendors found. Add in Masters."
            />
          </Field>

          {/* Vendor Name (Editable) */}
          <Field label="Vendor Name (Printable)" required>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Type vendor name"
              className="h-11 font-semibold"
            />
          </Field>

          {/* Vendor Address (Editable) */}
          <Field label="Vendor Address / City" className="md:col-span-2">
            <Input
              value={vendorAddress}
              onChange={(e) => setVendorAddress(e.target.value)}
              placeholder="Vendor shop / street / city address"
              className="h-11"
            />
          </Field>

          {/* Vendor Phone (Editable) */}
          <Field label="Vendor Phone">
            <Input
              value={vendorPhone}
              onChange={(e) => setVendorPhone(e.target.value)}
              placeholder="+91 98490 12345"
              className="h-11"
            />
          </Field>
        </div>

        {/* SITE ALLOCATION: EXACTLY TWO CHOICES (Single Site vs Multiple Sites) */}
        <div className="mt-5 border-t pt-4">
          <Field label="Site Allocation Option (Both for Indents and Purchase Orders)" required>
            <SegmentedControl
              value={allocation}
              onChange={setAllocation}
              options={[
                {
                  value: "single",
                  label: "Option 1: Single Site",
                  sub: "Order / Indent for one specific site or Main Central Store",
                },
                {
                  value: "multi",
                  label: "Option 2: Multiple Sites",
                  sub: "Combine multiple sites in one order; select site per line item",
                },
              ]}
            />
          </Field>

          {allocation === "single" && (
            <div className="mt-3 max-w-lg">
              <Field label="Select Target Site / Store" required>
                <SearchSelect
                  options={siteOptions}
                  value={selectedSingleSiteId}
                  onChange={setSelectedSingleSiteId}
                  placeholder="Select site or Main Central Store…"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Line Items Editor with changable units */}
        <div className="mt-6 border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">
              {activeTab === "purchase" ? "Materials Ordered" : "Materials for Indent Enquiry"}
            </span>
            {activeTab === "purchase" && (
              <div className="num text-sm font-bold text-copper whitespace-nowrap">
                Total Value: {formatINR(totalCalculatedAmount)}
              </div>
            )}
          </div>

          <LineItemsEditor
            lines={lines}
            onChange={setLines}
            materials={data.materials}
            mode={activeTab === "purchase" ? "purchase" : "indent"}
            onMaterialPicked={onMaterialPicked}
            siteOptions={allocation === "multi" ? siteOptions : undefined}
          />
        </div>

        {/* Site-Wise Breakdown Card (for Boss's Budget Decision & Approval) */}
        {siteWiseBreakdown.length > 0 && (
          <div className="mt-6 rounded-lg border bg-muted/20 p-4 border-dashed border-copper/40">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="size-4 text-copper" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-copper">
                Site-Wise Procurement Breakdown (Boss Review & Decision)
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {siteWiseBreakdown.map((b) => (
                <div key={b.siteId} className="rounded-md border bg-card p-3 shadow-xs">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                    <span className="font-bold text-xs text-foreground truncate max-w-[160px]">
                      {b.siteName}
                    </span>
                    <span className="num text-[10px] font-bold text-muted-foreground">
                      {b.itemCount} item{b.itemCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground max-h-24 overflow-y-auto">
                    {b.items.map((it, idx) => (
                      <li key={idx} className="flex justify-between items-center">
                        <span className="truncate max-w-[140px]">{it.name}</span>
                        <span className="num font-semibold text-foreground whitespace-nowrap">
                          {formatQty(it.qty)} {it.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {activeTab === "purchase" && (
                    <div className="border-t pt-1.5 mt-2 flex justify-between text-xs font-bold text-copper">
                      <span>Site Subtotal:</span>
                      <span className="num whitespace-nowrap">{formatINR(b.totalAmount)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes & Submit */}
        <div className="mt-6 grid gap-4 border-t pt-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Order / Delivery Instructions">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery schedule, vehicle requirements, urgent shortage note..."
            />
          </Field>

          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={resetForm} className="h-11">
              Reset
            </Button>
            <Button variant="copper" size="lg" onClick={save} className="h-11">
              {activeTab === "purchase" ? (
                <>
                  <PackagePlus className="size-4" /> Save Purchase Order
                </>
              ) : (
                <>
                  <Send className="size-4" /> Generate Indent Document
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Purchases Log Table */}
      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card">
          <div>
            <h2 className="font-bold text-base">Purchase & Inward Order Log</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete archive of all Purchase Orders, Vendor Bills, and Indents with print & PDF export.
            </p>
          </div>

          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entry, vendor, ref no…"
              className="h-9 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No purchase records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Entry No</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type / Reference</th>
                  <th className="px-4 py-3 whitespace-nowrap">Vendor</th>
                  <th className="px-4 py-3 whitespace-nowrap">Allocation</th>
                  <th className="px-4 py-3 whitespace-nowrap">Items</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPurchases.map((p) => {
                  const val = lineValue(p.items);
                  const s = p.siteId === "main-store" ? { clientName: "Main Central Store" } : p.siteId ? data.sites.find((x) => x.id === p.siteId) : undefined;

                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="num font-bold text-copper px-2 py-0.5 rounded bg-copper-soft border border-copper/30 whitespace-nowrap inline-block">
                          {p.entryNo}
                        </span>
                        {p.isIndent && (
                          <span className="ml-1.5 rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-bold text-info whitespace-nowrap inline-block">
                            Indent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{p.docType}</div>
                        <div className="num text-[11px] text-muted-foreground whitespace-nowrap">
                          {p.invoiceNo ? `Ref: ${p.invoiceNo}` : p.proformaNo ? `PI: ${p.proformaNo}` : p.poNo ? `PO: ${p.poNo}` : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground whitespace-nowrap">{p.vendorName}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {p.allocation === "single" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap">
                            <Building2 className="size-3" /> {s?.clientName || "Single Site"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 whitespace-nowrap">
                            <Layers className="size-3" /> Multiple Sites
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{p.items.length} items</td>
                      <td className="px-4 py-3.5 text-right num font-bold text-foreground whitespace-nowrap">
                        {p.isIndent ? "—" : formatINR(val)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1 whitespace-nowrap">
                            <Link to={`/print/purchase/${p.id}`} target="_blank">
                              <Printer className="size-3 text-copper" />
                              <span>Open & Print</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePurchase(p.id, p.entryNo)}
                            title="Delete entry"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
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

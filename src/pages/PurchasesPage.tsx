import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PackagePlus,
  Printer,
  Trash2,
  Search,
  Building2,
  Send,
  Layers,
  Calculator,
  Plus,
  Receipt,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useData, updateData } from "@/lib/store";
import type { Purchase } from "@/types";
import { formatINR, formatQty, formatDate, todayISO, nextNumber, uid, matchesQuery } from "@/lib/format";
import { lineValue } from "@/lib/calc";
import { PageHeader, Field, SegmentedControl } from "@/components/app/ui-bits";
import { SearchSelect } from "@/components/app/SearchSelect";
import { LineItemsEditor, emptyLine, fromDrafts, type DraftLine } from "@/components/app/LineItemsEditor";

export function PurchasesPage() {
  const data = useData();
  const [date, setDate] = useState(todayISO());
  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [allocation, setAllocation] = useState<"single" | "multi">("single");
  const [selectedSingleSiteId, setSelectedSingleSiteId] = useState("acr-office");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [siteGroups, setSiteGroups] = useState<{ id: string; siteId: string; lines: DraftLine[] }[]>([
    {
      id: uid("grp"),
      siteId: data.sites[0]?.id || "acr-office",
      lines: [emptyLine()],
    },
  ]);
  const [query, setQuery] = useState("");

  // Invoice Recording Modal state
  const [invoiceModalPurchase, setInvoiceModalPurchase] = useState<Purchase | null>(null);
  const [recordInvNo, setRecordInvNo] = useState("");
  const [recordInvDate, setRecordInvDate] = useState(todayISO());

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

  // Available sites including ACR Office
  const siteOptions = useMemo(
    () => [
      {
        value: "acr-office",
        label: "ACR Office",
        hint: "Central storage & office stock",
      },
      ...data.sites.map((s) => ({
        value: s.id,
        label: s.clientName,
        hint: `${s.code} · ${s.status}`,
      })),
    ],
    [data.sites],
  );

  const effectiveLines: DraftLine[] = useMemo(() => {
    if (allocation === "single") {
      return lines.map((l) => ({ ...l, siteId: selectedSingleSiteId }));
    }
    return siteGroups.flatMap((g) => g.lines.map((l) => ({ ...l, siteId: g.siteId })));
  }, [allocation, lines, selectedSingleSiteId, siteGroups]);

  const addSiteGroup = () => {
    const usedSiteIds = new Set(siteGroups.map((g) => g.siteId));
    const nextSite = siteOptions.find((s) => !usedSiteIds.has(s.value))?.value || data.sites[0]?.id || "acr-office";
    setSiteGroups((prev) => [
      ...prev,
      {
        id: uid("grp"),
        siteId: nextSite,
        lines: [emptyLine()],
      },
    ]);
  };

  const removeSiteGroup = (groupId: string) => {
    if (siteGroups.length <= 1) {
      toast.info("At least one site is required in multiple sites mode");
      return;
    }
    setSiteGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const updateGroupSite = (groupId: string, newSiteId: string) => {
    setSiteGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, siteId: newSiteId } : g)),
    );
  };

  const updateGroupLines = (groupId: string, newLines: DraftLine[]) => {
    setSiteGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, lines: newLines } : g)),
    );
  };

  // Helper: load all materials mapped to the current vendor
  const getVendorMaterials = () => {
    if (!vendorId) return [];
    return data.materials.filter((m) => m.defaultVendorId === vendorId && m.active);
  };

  const loadAllVendorItemsSingle = () => {
    const vm = getVendorMaterials();
    if (vm.length === 0) {
      toast.info("No materials mapped to this vendor in Masters.");
      return;
    }
    const mapped: DraftLine[] = vm.map((m) => ({
      key: uid("ln"),
      materialId: m.id,
      qty: "",
      rate: "",
      unit: m.purchaseUnit.split("/")[0].trim(),
      size: "",
      siteId: selectedSingleSiteId,
    }));
    setLines(mapped);
    toast.success(`Loaded all ${vm.length} materials supplied by ${vendorName}`);
  };

  const clearItemsSingle = () => {
    setLines([emptyLine()]);
    toast.info("Material list cleared");
  };

  const loadVendorItemsForGroup = (groupId: string) => {
    const vm = getVendorMaterials();
    if (vm.length === 0) {
      toast.info("No materials mapped to this vendor in Masters.");
      return;
    }
    const group = siteGroups.find((g) => g.id === groupId);
    const siteId = group?.siteId || "acr-office";
    const mapped: DraftLine[] = vm.map((m) => ({
      key: uid("ln"),
      materialId: m.id,
      qty: "",
      rate: "",
      unit: m.purchaseUnit.split("/")[0].trim(),
      size: "",
      siteId,
    }));
    updateGroupLines(groupId, mapped);
    toast.success(`Loaded all ${vm.length} materials for this site`);
  };

  const clearItemsForGroup = (groupId: string) => {
    updateGroupLines(groupId, [emptyLine()]);
    toast.info("Cleared items for this site");
  };

  const resetForm = () => {
    setDate(todayISO());
    setVendorId("");
    setVendorName("");
    setVendorAddress("");
    setVendorPhone("");
    setAllocation("single");
    setSelectedSingleSiteId("acr-office");
    setLines([emptyLine()]);
    setSiteGroups([
      {
        id: uid("grp"),
        siteId: data.sites[0]?.id || "acr-office",
        lines: [emptyLine()],
      },
    ]);
  };

  const onSelectVendor = (id: string) => {
    setVendorId(id);
    const v = data.vendors.find((x) => x.id === id);
    if (v) {
      setVendorName(v.name);
      setVendorAddress(v.address || "");
      setVendorPhone(v.phone || "");
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
    const siteMap = new Map<
      string,
      {
        siteName: string;
        itemCount: number;
        totalAmount: number;
        items: { name: string; qty: number; unit: string; amount: number }[];
      }
    >();

    for (const l of effectiveLines) {
      if (!l.materialId || Number(l.qty) <= 0) continue;
      const targetId = l.siteId || "acr-office";
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

    return Array.from(siteMap.entries()).map(([siteId, d]) => ({
      siteId,
      ...d,
    }));
  }, [effectiveLines, siteOptions, data.materials]);

  const saveIndent = () => {
    const items = fromDrafts(effectiveLines, {
      rate: false,
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

    const id = uid("ind");
    let entryNo = "";

    updateData((d) => {
      entryNo = nextNumber("IND", d.purchases.map((x) => x.entryNo));
      const record: Purchase = {
        id,
        entryNo,
        docType: "Purchase Order",
        invoiceNo: "",
        proformaNo: "",
        poNo: "",
        date,
        vendorId,
        vendorName: vendorName.trim(),
        vendorAddress: vendorAddress.trim(),
        vendorPhone: vendorPhone.trim(),
        allocation,
        siteId: allocation === "single" ? selectedSingleSiteId : "",
        items,
        notes: "",
        isIndent: true,
      };

      return {
        ...d,
        purchases: [record, ...d.purchases],
      };
    });

    toast.success(`Purchase Indent ${entryNo} created! Ready to view, export, or print.`);
    resetForm();
  };

  const deletePurchase = (id: string, entryNo: string) => {
    if (window.confirm(`Delete purchase indent entry ${entryNo}?`)) {
      updateData((d) => ({
        ...d,
        purchases: d.purchases.filter((p) => p.id !== id),
      }));
      toast.success(`Indent ${entryNo} deleted`);
    }
  };

  const openInvoiceModal = (p: Purchase) => {
    setInvoiceModalPurchase(p);
    setRecordInvNo(p.vendorInvoiceNo || "");
    setRecordInvDate(p.vendorInvoiceDate || todayISO());
  };

  const saveVendorInvoice = () => {
    if (!invoiceModalPurchase) return;
    if (!recordInvNo.trim()) {
      toast.error("Please enter the vendor tax invoice / bill number");
      return;
    }

    updateData((d) => ({
      ...d,
      purchases: d.purchases.map((p) =>
        p.id === invoiceModalPurchase.id
          ? {
              ...p,
              vendorInvoiceNo: recordInvNo.trim(),
              vendorInvoiceDate: recordInvDate,
            }
          : p,
      ),
    }));

    toast.success(`Vendor Tax Invoice ${recordInvNo.trim()} recorded for ${invoiceModalPurchase.entryNo}`);
    setInvoiceModalPurchase(null);
  };

  const filteredPurchases = useMemo(() => {
    return data.purchases.filter((p) =>
      matchesQuery(
        `${p.entryNo} ${p.vendorInvoiceNo || ""} ${p.vendorName} ${p.notes}`,
        query,
      ),
    );
  }, [data.purchases, query]);

  return (
    <>
      <PageHeader
        title="Material Indents & Procurement"
        description="Generate site-wise vendor indents for quotation enquiries. After receiving materials and the vendor's tax invoice, record it here."
      />

      {/* Main Indent Entry Panel */}
      <section className="panel p-5 sm:p-6 mb-8 border-t-4 border-t-copper">
        <div className="mb-5 flex items-center justify-between border-b pb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Create Vendor Material Indent</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select Single Site (or ACR Office) or Multiple Sites to prepare quantity enquiry for the vendor.
            </p>
          </div>
          <span className="rounded bg-info-soft px-2.5 py-1 text-xs font-bold text-info border border-info/30">
            Material Indent Mode: Quantity Enquiry for Vendor
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {/* Order / Indent Date */}
          <Field label="Order / Indent Date" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
          <Field label="Vendor Address / Location" className="md:col-span-2">
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

        {/* SITE ALLOCATION: Single Site (or ACR Office) vs Multiple Sites */}
        <div className="mt-5 border-t pt-4">
          <Field label="Site Allocation Option" required>
            <SegmentedControl
              value={allocation}
              onChange={setAllocation}
              options={[
                {
                  value: "single",
                  label: "Option 1: Single Site",
                  sub: "Indent for one specific site or ACR Office",
                },
                {
                  value: "multi",
                  label: "Option 2: Multiple Sites",
                  sub: "Select a site, add its materials, then add another site as needed",
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
                  placeholder="Select site or ACR Office…"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Materials Section: Single Site vs Grouped Multiple Sites */}
        {allocation === "single" ? (
          <div className="mt-6 border-t pt-4">
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="eyebrow">Materials for Indent Enquiry</span>

              {/* Vendor Fast Actions */}
              <div className="flex items-center gap-2">
                {vendorId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1 text-copper border-copper/40 hover:bg-copper-soft"
                    onClick={loadAllVendorItemsSingle}
                  >
                    <Sparkles className="size-3.5" />
                    <span>All Items in Vendor</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={clearItemsSingle}
                >
                  <RotateCcw className="size-3.5" />
                  <span>Clear Items</span>
                </Button>
              </div>
            </div>

            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              materials={data.materials}
              mode="indent"
              onMaterialPicked={onMaterialPicked}
            />
          </div>
        ) : (
          /* Option 2: Multiple Sites — Grouped site by site */
          <div className="mt-6 border-t pt-4 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="eyebrow">
                  Multiple Sites Material Breakdown ({siteGroups.length} Site{siteGroups.length > 1 ? "s" : ""})
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a site, add its materials, and click "+ Add Another Site" to add more sites.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {siteGroups.map((group, groupIdx) => {
                return (
                  <div
                    key={group.id}
                    className="rounded-lg border-2 border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-copper/40"
                  >
                    {/* Site Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4 bg-muted/40 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 p-3.5 sm:px-5 rounded-t-lg">
                      <div className="flex items-center gap-3 flex-1 max-w-md">
                        <span className="flex size-7 items-center justify-center rounded-full bg-copper text-white font-bold text-xs shrink-0">
                          {groupIdx + 1}
                        </span>
                        <div className="flex-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Target Site / Location
                          </label>
                          <SearchSelect
                            options={siteOptions}
                            value={group.siteId}
                            onChange={(val) => updateGroupSite(group.id, val)}
                            placeholder="Select site for this material batch…"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {vendorId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold gap-1 text-copper border-copper/40 hover:bg-copper-soft"
                            onClick={() => loadVendorItemsForGroup(group.id)}
                          >
                            <Sparkles className="size-3.5" />
                            <span>All Items in Vendor</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                          onClick={() => clearItemsForGroup(group.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          <span>Clear</span>
                        </Button>
                        {siteGroups.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:bg-destructive/10 text-xs gap-1 ml-1"
                            onClick={() => removeSiteGroup(group.id)}
                            title="Remove this site"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Material List for this specific site */}
                    <LineItemsEditor
                      lines={group.lines}
                      onChange={(newLines) => updateGroupLines(group.id, newLines)}
                      materials={data.materials}
                      mode="indent"
                      onMaterialPicked={onMaterialPicked}
                    />
                  </div>
                );
              })}
            </div>

            {/* Add Another Site Button */}
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={addSiteGroup}
                className="gap-2 border-dashed border-2 border-copper/50 hover:border-copper hover:bg-copper-soft text-sm font-bold text-copper"
              >
                <Plus className="size-4" />
                <span>+ Add Another Site to this Indent</span>
              </Button>
            </div>
          </div>
        )}

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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="lg" onClick={resetForm} className="h-11">
            Reset
          </Button>
          <Button variant="copper" size="lg" onClick={saveIndent} className="h-11 gap-1.5 font-bold">
            <Send className="size-4" />
            <span>Generate Indent Document</span>
          </Button>
        </div>
      </section>

      {/* Indents Log Table */}
      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card">
          <div>
            <h2 className="font-bold text-base">Material Indents Log</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Archive of all generated vendor indents. Record company tax invoices after buying.
            </p>
          </div>

          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entry, vendor, tax invoice…"
              className="h-9 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No material indent records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Indent No</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Vendor</th>
                  <th className="px-4 py-3 whitespace-nowrap">Allocation</th>
                  <th className="px-4 py-3 whitespace-nowrap">Items</th>
                  <th className="px-4 py-3 whitespace-nowrap">Vendor Tax Invoice</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPurchases.map((p) => {
                  const s =
                    p.siteId === "main-store" || p.siteId === "acr-office"
                      ? { clientName: "ACR Office" }
                      : p.siteId
                        ? data.sites.find((x) => x.id === p.siteId)
                        : undefined;

                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="num font-bold text-copper px-2 py-0.5 rounded bg-copper-soft border border-copper/30 whitespace-nowrap inline-block">
                          {p.entryNo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.date)}
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
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {p.vendorInvoiceNo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-success-soft text-success border border-success/30 px-2 py-0.5 text-[11px] font-bold num">
                              Inv: {p.vendorInvoiceNo}
                            </span>
                            {p.vendorInvoiceDate && (
                              <span className="text-[10px] text-muted-foreground">({formatDate(p.vendorInvoiceDate)})</span>
                            )}
                            <button
                              type="button"
                              onClick={() => openInvoiceModal(p)}
                              className="text-[10px] text-copper hover:underline font-bold"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openInvoiceModal(p)}
                            className="inline-flex items-center gap-1 rounded border border-copper/40 bg-copper-soft/50 px-2 py-1 text-[11px] font-semibold text-copper hover:bg-copper-soft"
                          >
                            <Receipt className="size-3" />
                            <span>+ Record Tax Invoice</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1 whitespace-nowrap">
                            <Link to={`/print/purchase/${p.id}`} target="_blank">
                              <Printer className="size-3 text-copper" />
                              <span>View / Export</span>
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

      {/* Record Vendor Tax Invoice Modal */}
      {invoiceModalPurchase && (
        <Dialog open={!!invoiceModalPurchase} onOpenChange={() => setInvoiceModalPurchase(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="size-5 text-copper" />
                <span>Record Vendor Tax Invoice / Bill</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Enter the official tax invoice number and date provided by {invoiceModalPurchase.vendorName} for Indent {invoiceModalPurchase.entryNo}.
              </p>
            </DialogHeader>

            <div className="grid gap-3.5 py-3">
              <Field label="Vendor Tax Invoice / Bill No." required>
                <Input
                  value={recordInvNo}
                  onChange={(e) => setRecordInvNo(e.target.value)}
                  placeholder="e.g. GST-2026/8941"
                  className="h-10 font-bold"
                  autoFocus
                />
              </Field>

              <Field label="Tax Invoice Date" required>
                <Input
                  type="date"
                  value={recordInvDate}
                  onChange={(e) => setRecordInvDate(e.target.value)}
                  className="h-10"
                />
              </Field>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInvoiceModalPurchase(null)}>
                Cancel
              </Button>
              <Button variant="copper" onClick={saveVendorInvoice} className="gap-1.5 font-bold">
                <CheckCircle2 className="size-4" />
                <span>Save Tax Invoice</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

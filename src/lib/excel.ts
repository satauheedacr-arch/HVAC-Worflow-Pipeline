import * as XLSX from "xlsx";
import type { AppData } from "@/types";
import { storeStock } from "./calc";

/** Export full database to an Excel (.xlsx) workbook with multiple sheets */
export function exportToExcel(data: AppData) {
  const stock = storeStock(data);
  const wb = XLSX.utils.book_new();

  // 1. Materials & Stock sheet
  const materialsRows = data.materials.map((m) => {
    const curStock = stock.get(m.id) ?? 0;
    return {
      "Item Code": m.code,
      Category: m.category,
      "Sub-Category": m.subCategory,
      "Material Name": m.name,
      "Size / Spec": m.spec,
      "Purchase Unit": m.purchaseUnit,
      "Issue Unit": m.issueUnit,
      "Default Vendor": data.vendors.find((v) => v.id === m.defaultVendorId)?.name ?? m.defaultVendorId,
      "Min Stock Alert": m.minStock,
      "Current Main Store Stock": curStock,
      "Rare Item": m.rare ? "Yes" : "No",
      "Active": m.active ? "Yes" : "No",
      Notes: m.notes,
    };
  });
  const wsMaterials = XLSX.utils.json_to_sheet(materialsRows);
  XLSX.utils.book_append_sheet(wb, wsMaterials, "Materials & Store Stock");

  // 2. Sites sheet
  const sitesRows = data.sites.map((s) => ({
    "Site Code": s.code,
    "Company / Client Name": s.clientName,
    "Contact Person": s.contactPerson,
    "Phone Number": s.phone,
    "Site Address": s.address,
    GSTIN: s.gstin,
    "Lead Technician": s.leadTech,
    "PO No.": s.poNo,
    "Quotation No.": s.quotationNo,
    "Quotation Date": s.quotationDate,
    "FSR No.": s.fsrNo,
    Status: s.status,
    Notes: s.notes,
  }));
  const wsSites = XLSX.utils.json_to_sheet(sitesRows);
  XLSX.utils.book_append_sheet(wb, wsSites, "Sites & Clients");

  // 3. Purchases sheet
  const matsMap = new Map(data.materials.map((m) => [m.id, m]));
  const sitesMap = new Map(data.sites.map((s) => [s.id, s]));

  const purchaseRows = data.purchases.flatMap((p) =>
    p.items.map((item) => {
      const m = matsMap.get(item.materialId);
      const targetSite = p.allocation === "direct" ? sitesMap.get(p.siteId)?.clientName : p.allocation === "multi" ? sitesMap.get(item.siteId ?? "")?.clientName : "Main Store (Bulk)";
      return {
        "Entry No": p.entryNo,
        Date: p.date,
        "Document Type": p.docType,
        "Vendor Invoice / Bill No": p.invoiceNo,
        "Proforma No": p.proformaNo,
        "PO No": p.poNo,
        Vendor: p.vendorName,
        Allocation: p.allocation,
        "Target Destination": targetSite ?? "Main Store",
        "Item Code": m?.code ?? item.materialId,
        "Material Name": m?.name ?? "",
        "Size / Spec": item.size || (m?.spec ?? ""),
        Quantity: item.qty,
        "Unit Rate (₹)": item.rate ?? 0,
        "Total Value (₹)": (item.qty || 0) * (item.rate || 0),
        Remarks: p.notes,
      };
    }),
  );
  const wsPurchases = XLSX.utils.json_to_sheet(purchaseRows);
  XLSX.utils.book_append_sheet(wb, wsPurchases, "Purchases & Inward");

  // 4. Issue & Return Ledger
  const ledgerRows = [
    ...data.issues.flatMap((is) =>
      is.items.map((it) => {
        const m = matsMap.get(it.materialId);
        const s = sitesMap.get(is.siteId);
        return {
          Type: "Issue",
          "Slip / Challan No": is.slipNo,
          Date: is.date,
          Site: s?.clientName ?? is.siteId,
          Technician: is.technician,
          Status: is.status,
          "Item Code": m?.code ?? it.materialId,
          "Material Name": m?.name ?? "",
          "Size / Spec": it.size || (m?.spec ?? ""),
          "Qty Issued": it.qty,
          "Qty Returned": 0,
          Unit: m?.issueUnit ?? "",
          Remarks: is.remarks,
        };
      }),
    ),
    ...data.returns.flatMap((ret) =>
      ret.items.map((it) => {
        const m = matsMap.get(it.materialId);
        const s = sitesMap.get(ret.siteId);
        return {
          Type: "Return",
          "Slip / Challan No": ret.slipNo,
          Date: ret.date,
          Site: s?.clientName ?? ret.siteId,
          Technician: ret.technician,
          Status: "Returned",
          "Item Code": m?.code ?? it.materialId,
          "Material Name": m?.name ?? "",
          "Size / Spec": it.size || (m?.spec ?? ""),
          "Qty Issued": 0,
          "Qty Returned": it.qty,
          Unit: m?.issueUnit ?? "",
          Remarks: ret.remarks,
        };
      }),
    ),
  ].sort((a, b) => b.Date.localeCompare(a.Date));

  const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
  XLSX.utils.book_append_sheet(wb, wsLedger, "Issue & Return Ledger");

  // Write file
  const d = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `HVAC-Material-Pipeline-${d}.xlsx`);
}

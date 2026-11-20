import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Printer, ArrowLeft, Snowflake, Copy, FileSpreadsheet, Check } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useData } from "@/lib/store";
import { formatDate, formatQty, formatINR } from "@/lib/format";
import { lineValue } from "@/lib/calc";
import { Button } from "@/components/ui/button";

export function PrintPurchase() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const [copied, setCopied] = useState(false);

  const purchase = data.purchases.find((p) => p.id === id);
  const vendor = purchase ? data.vendors.find((v) => v.id === purchase.vendorId) : undefined;
  const site = purchase && purchase.siteId ? data.sites.find((s) => s.id === purchase.siteId) : undefined;
  const matsMap = new Map(data.materials.map((m) => [m.id, m]));
  const sitesMap = new Map(data.sites.map((s) => [s.id, s]));

  if (!purchase) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold">Indent / Purchase record not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/purchases">Back to Indents</Link>
        </Button>
      </div>
    );
  }

  const isIndent = purchase.isIndent;
  const totalVal = lineValue(purchase.items);

  // Copy table to clipboard in tab-separated format for direct Excel paste
  const copyToExcelClipboard = () => {
    const headers = [
      "Sl No",
      "Item Code",
      "Material Name",
      "Specification",
      purchase.allocation === "multi" ? "Target Site" : null,
      "Quantity",
      "Unit",
    ].filter(Boolean);

    const rows = purchase.items.map((item, idx) => {
      const m = matsMap.get(item.materialId);
      const targetSite = item.siteId ? sitesMap.get(item.siteId)?.clientName || item.siteId : "ACR Office";
      return [
        idx + 1,
        m?.code || item.materialId,
        m?.name || item.materialId,
        item.size ? `Size: ${item.size}` : m?.spec || "",
        purchase.allocation === "multi" ? targetSite : null,
        item.qty,
        item.unit || m?.purchaseUnit || "Nos",
      ].filter((x) => x !== null);
    });

    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    toast.success("Table copied! Open Excel and press Ctrl+V to paste.");
    setTimeout(() => setCopied(false), 2500);
  };

  // Export as .xlsx file
  const exportIndentExcel = () => {
    const rows = purchase.items.map((item, idx) => {
      const m = matsMap.get(item.materialId);
      const targetSite = item.siteId ? sitesMap.get(item.siteId)?.clientName || item.siteId : "ACR Office";
      return {
        "Sl No": idx + 1,
        "Item Code": m?.code || item.materialId,
        "Material Name": m?.name || item.materialId,
        Specification: item.size ? `Size: ${item.size}` : m?.spec || "",
        ...(purchase.allocation === "multi" ? { "Target Site": targetSite } : {}),
        Quantity: item.qty,
        Unit: item.unit || m?.purchaseUnit || "Nos",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Material Indent");
    XLSX.writeFile(wb, `Indent_${purchase.entryNo}_${purchase.vendorName.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Excel file downloaded!");
  };

  return (
    <div className="min-h-screen bg-zinc-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Top Action Bar */}
      <div className="no-print mx-auto max-w-4xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-card p-4 border shadow-sm">
        <Button asChild variant="ghost" size="sm">
          <Link to="/purchases">
            <ArrowLeft className="size-4 mr-1" /> Back to Indents
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToExcelClipboard}
            className="gap-1.5 text-xs font-semibold"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-copper" />}
            <span>{copied ? "Copied for Excel!" : "Copy Table to Excel"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportIndentExcel}
            className="gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Export Excel (.xlsx)</span>
          </Button>

          <Button variant="copper" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs font-bold">
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="print-page mx-auto max-w-4xl rounded-lg bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-0 border print:border-none text-zinc-900">
        {/* Header / Letterhead */}
        <div className="border-b-2 border-zinc-900 pb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {data.company.logo ? (
                <img src={data.company.logo} alt="Company Logo" className="h-14 max-w-[160px] w-auto object-contain print:h-12" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-lg bg-copper text-white print:border print:border-zinc-800">
                  <Snowflake className="size-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900">
                  {data.company.name}
                </h1>
                <p className="text-xs font-semibold text-copper print:text-zinc-700 tracking-wide">
                  {data.company.tagline}
                </p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-md leading-relaxed">
                  {data.company.address}
                </p>
                <div className="text-[11px] text-zinc-700 font-medium mt-0.5">
                  Ph: {data.company.phone} · Email: {data.company.email}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block rounded bg-zinc-900 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                {isIndent ? "Material Purchase Indent" : purchase.docType}
              </div>
              <div className="num mt-2 text-lg font-bold text-copper print:text-zinc-900">
                {purchase.entryNo}
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">Date: {formatDate(purchase.date)}</div>
              {data.company.gstin && (
                <div className="text-[11px] font-semibold text-zinc-700 mt-0.5">
                  GSTIN: {data.company.gstin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vendor & Delivery Destination */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b text-xs">
          <div>
            <div className="font-bold uppercase tracking-wider text-zinc-500 text-[10px] mb-1">
              Vendor / Supplier Details
            </div>
            <div className="text-sm font-bold text-zinc-900">{purchase.vendorName}</div>
            {(purchase.vendorAddress || vendor?.address) && (
              <div className="text-zinc-700 mt-0.5 whitespace-pre-line">
                {purchase.vendorAddress || vendor?.address}
              </div>
            )}
            {(purchase.vendorPhone || vendor?.phone || vendor?.contactPerson) && (
              <div className="mt-1 font-semibold text-zinc-800">
                {vendor?.contactPerson && `Contact: ${vendor.contactPerson} `}
                {(purchase.vendorPhone || vendor?.phone) && `Ph: ${purchase.vendorPhone || vendor?.phone}`}
              </div>
            )}
            {vendor?.gstin && <div className="text-zinc-600 mt-0.5">Vendor GSTIN: {vendor.gstin}</div>}
          </div>

          <div className="sm:pl-8 sm:border-l space-y-1">
            <div className="font-bold uppercase tracking-wider text-zinc-500 text-[10px] mb-1">
              Delivery & Billing Information
            </div>
            <div>
              <span className="text-zinc-500">Destination:</span>{" "}
              <span className="font-bold text-zinc-900">
                {purchase.allocation === "multi"
                  ? "Multiple Project Sites (Split Inward)"
                  : site
                    ? `Direct to Site: ${site.clientName}`
                    : "ACR Office"}
              </span>
            </div>
            {purchase.invoiceNo && (
              <div>
                <span className="text-zinc-500">Invoice / Bill No:</span>{" "}
                <span className="num font-semibold text-zinc-900">{purchase.invoiceNo}</span>
              </div>
            )}
            {purchase.proformaNo && (
              <div>
                <span className="text-zinc-500">Proforma No:</span>{" "}
                <span className="num font-semibold text-zinc-900">{purchase.proformaNo}</span>
              </div>
            )}
            {purchase.poNo && (
              <div>
                <span className="text-zinc-500">Company PO No:</span>{" "}
                <span className="num font-semibold text-zinc-900">{purchase.poNo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-900 text-zinc-800 uppercase tracking-wider text-[10px] font-black bg-zinc-50 print:bg-transparent">
                <th className="py-2 px-2 w-10">Sl No</th>
                <th className="py-2 px-2 w-28">Item Code</th>
                <th className="py-2 px-2">Material Description & Specification</th>
                {purchase.allocation === "multi" && <th className="py-2 px-2 w-32">Target Site</th>}
                <th className="py-2 px-2 text-right w-24">Quantity</th>
                <th className="py-2 px-2 w-20">Unit</th>
                {!isIndent && (
                  <>
                    <th className="py-2 px-2 text-right w-24">Unit Rate</th>
                    <th className="py-2 px-2 text-right w-28">Amount</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {purchase.items.map((item, index) => {
                const m = matsMap.get(item.materialId);
                const targetSite = item.siteId ? sitesMap.get(item.siteId)?.clientName : "ACR Office";

                return (
                  <tr key={index} className="leading-tight">
                    <td className="py-2.5 px-2 num font-semibold text-zinc-500">{index + 1}</td>
                    <td className="py-2.5 px-2 num font-bold text-zinc-900">{m?.code || item.materialId}</td>
                    <td className="py-2.5 px-2">
                      <div className="font-bold text-zinc-900">{m?.name || item.materialId}</div>
                      <div className="text-[10px] text-zinc-500">
                        {item.size ? `Size: ${item.size}` : m?.spec} · {m?.category}
                      </div>
                    </td>
                    {purchase.allocation === "multi" && (
                      <td className="py-2.5 px-2 text-zinc-700 font-medium text-[11px]">{targetSite}</td>
                    )}
                    <td className="py-2.5 px-2 text-right num font-black text-zinc-900">
                      {formatQty(item.qty)}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-600 font-medium">
                      {item.unit || m?.purchaseUnit || "Nos"}
                    </td>
                    {!isIndent && (
                      <>
                        <td className="py-2.5 px-2 text-right num font-semibold text-zinc-800">
                          {formatINR(item.rate || 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right num font-black text-zinc-900">
                          {formatINR((item.qty || 0) * (item.rate || 0))}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {!isIndent && (
              <tfoot>
                <tr className="border-t-2 border-zinc-900 text-xs font-black">
                  <td
                    colSpan={purchase.allocation === "multi" ? 6 : 5}
                    className="py-3 px-2 text-right uppercase tracking-wider text-zinc-800"
                  >
                    Total Material Value (Excl. GST):
                  </td>
                  <td className="py-3 px-2 text-right num text-sm text-copper font-black">
                    {formatINR(totalVal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Notes */}
        {purchase.notes && (
          <div className="border-t pt-4 text-xs">
            <span className="font-bold text-zinc-700">Remarks / Delivery Instructions: </span>
            <span className="text-zinc-600">{purchase.notes}</span>
          </div>
        )}

        {/* Signature Blocks */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div>
            <div className="border-t border-zinc-400 pt-2 font-bold text-zinc-900">
              Prepared & Verified By
            </div>
            <div className="text-[10px] text-zinc-500">Purchase / Store In-Charge</div>
          </div>
          <div>
            <div className="border-t border-zinc-400 pt-2 font-bold text-zinc-900">
              For {data.company.name}
            </div>
            <div className="text-[10px] text-zinc-500">Authorized Signatory & Seal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

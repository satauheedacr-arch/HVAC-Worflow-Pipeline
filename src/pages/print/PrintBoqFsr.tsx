import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, Snowflake, CheckSquare } from "lucide-react";
import { useData } from "@/lib/store";
import { boqReconciliation } from "@/lib/calc";
import { formatDate, formatQty } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function PrintBoqFsr() {
  const { id } = useParams<{ id: string }>();
  const data = useData();

  const site = data.sites.find((s) => s.id === id);

  if (!site) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold">Site not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/boq">Back to BOQ Tracker</Link>
        </Button>
      </div>
    );
  }

  const boqRows = boqReconciliation(site, data);

  const checklistItems = [
    "Refrigerant copper piping pressure tested with dry Nitrogen at 350-400 PSI for 24 hours.",
    "Nitrile rubber insulation joints sealed with adhesive and wrapped with 50mm vapor barrier tape.",
    "Condensate drain line slope verified and water gravity test completed without leakage.",
    "Indoor and outdoor electrical power and shielded communication cabling terminated and continuity checked.",
    "System vacuumed to < 500 microns before refrigerant charging.",
    "Operating refrigerant pressures, voltage, operating current, and air discharge temperatures logged.",
    "All ceiling grilles, diffusers, and dampers aligned and air balanced as per design CFM.",
    "Site premises cleared of debris, cut copper scraps, and packaging materials.",
  ];

  return (
    <div className="min-h-screen bg-zinc-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Top Floating Bar */}
      <div className="no-print mx-auto max-w-4xl mb-6 flex items-center justify-between rounded-lg bg-card p-4 border shadow-sm">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/boq?site=${site.id}`}>
            <ArrowLeft className="size-4 mr-1" /> Back to BOQ Tracker
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">A4 FSR & Final BOQ Document</span>
          <Button variant="copper" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-4" /> Print Field Service Report
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
                Final BOQ & Handover Report
              </div>
              <div className="num mt-2 text-sm font-bold text-zinc-900">
                Site Ref: <span className="text-copper">{site.code}</span>
              </div>
              {site.fsrNo && (
                <div className="num text-xs font-bold text-zinc-700 mt-0.5">FSR No: {site.fsrNo}</div>
              )}
              {data.company.gstin && (
                <div className="text-[11px] font-semibold text-zinc-700 mt-0.5">
                  GSTIN: {data.company.gstin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project & Client Details */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b text-xs">
          <div>
            <div className="font-bold uppercase tracking-wider text-zinc-500 text-[10px] mb-1">
              Client & Site Information
            </div>
            <div className="text-sm font-bold text-zinc-900">{site.clientName}</div>
            <div className="text-zinc-700 mt-0.5 whitespace-pre-line">{site.address || "—"}</div>
            {site.contactPerson && (
              <div className="mt-1 font-semibold text-zinc-800">
                Contact: {site.contactPerson} {site.phone ? `(${site.phone})` : ""}
              </div>
            )}
            {site.gstin && <div className="text-zinc-600 mt-0.5">Client GSTIN: {site.gstin}</div>}
          </div>

          <div className="sm:pl-8 sm:border-l space-y-1">
            <div className="font-bold uppercase tracking-wider text-zinc-500 text-[10px] mb-1">
              Project Milestone & Sign-off Details
            </div>
            <div>
              <span className="text-zinc-500">Project Status:</span>{" "}
              <span className="font-bold text-zinc-900">{site.status}</span>
            </div>
            <div>
              <span className="text-zinc-500">Lead Technician:</span>{" "}
              <span className="font-semibold text-zinc-800">{site.leadTech || "—"}</span>
            </div>
            {site.poNo && (
              <div>
                <span className="text-zinc-500">PO Number:</span>{" "}
                <span className="num font-semibold text-zinc-900">{site.poNo}</span>
              </div>
            )}
            {site.quotationNo && (
              <div>
                <span className="text-zinc-500">Quotation Ref:</span>{" "}
                <span className="num font-semibold text-zinc-900">{site.quotationNo}</span>
                {site.quotationDate && ` (dated ${formatDate(site.quotationDate)})`}
              </div>
            )}
          </div>
        </div>

        {/* BOQ Reconciliation Table */}
        <div className="py-4">
          <div className="font-bold uppercase tracking-wider text-zinc-800 text-[11px] mb-2">
            Material Reconciliation & Final Net Consumed BOQ
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-900 text-zinc-800 uppercase tracking-wider text-[10px] font-black bg-zinc-50 print:bg-transparent">
                <th className="py-2 px-2 w-10">Sl No</th>
                <th className="py-2 px-2 w-28">Item Code</th>
                <th className="py-2 px-2">Material Description & Specification</th>
                <th className="py-2 px-2 text-right w-24">Planned BOQ</th>
                <th className="py-2 px-2 text-right w-24">Issued</th>
                <th className="py-2 px-2 text-right w-24">Returned</th>
                <th className="py-2 px-2 text-right w-28 font-black">Net Consumed</th>
                <th className="py-2 px-2 w-16">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {boqRows.map((r, index) => (
                <tr key={index} className="leading-tight">
                  <td className="py-2 px-2 num font-semibold text-zinc-500">{index + 1}</td>
                  <td className="py-2 px-2 num font-bold text-zinc-900">{r.material.code}</td>
                  <td className="py-2 px-2">
                    <div className="font-bold text-zinc-900">{r.material.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {r.size ? `Site Size: ${r.size}` : r.material.spec}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right num text-zinc-600">
                    {r.estimatedQty > 0 ? formatQty(r.estimatedQty) : "—"}
                  </td>
                  <td className="py-2 px-2 text-right num text-zinc-800 font-semibold">
                    {formatQty(r.totalIssued)}
                  </td>
                  <td className="py-2 px-2 text-right num text-zinc-800 font-semibold">
                    {formatQty(r.totalReturned)}
                  </td>
                  <td className="py-2 px-2 text-right num font-black text-zinc-900">
                    {formatQty(r.netConsumed)}
                  </td>
                  <td className="py-2 px-2 text-zinc-600 font-medium">{r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quality / Commissioning Checklist */}
        <div className="border-t pt-4">
          <div className="font-bold uppercase tracking-wider text-zinc-800 text-[11px] mb-2">
            Field Service & Commissioning Verification Checklist
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-zinc-700 leading-snug">
                <span className="flex size-4 shrink-0 items-center justify-center rounded border border-zinc-600 text-copper mt-0.5 font-bold text-[10px]">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div>
            <div className="border-t border-zinc-400 pt-2 font-bold text-zinc-900">
              Contractor / Lead Technician
            </div>
            <div className="text-[10px] text-zinc-500">
              {site.leadTech || data.company.name} (Signature & Date)
            </div>
          </div>
          <div>
            <div className="border-t border-zinc-400 pt-2 font-bold text-zinc-900">
              Client Representative Sign-off & Stamp
            </div>
            <div className="text-[10px] text-zinc-500">
              Work Completed & Handed Over Satisfactorily
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

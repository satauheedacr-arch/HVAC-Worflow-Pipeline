import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, Snowflake } from "lucide-react";
import { useData } from "@/lib/store";
import { formatDate, formatQty } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function PrintGatePass() {
  const { id } = useParams<{ id: string }>();
  const data = useData();

  const issue = data.issues.find((i) => i.id === id);
  const site = issue ? data.sites.find((s) => s.id === issue.siteId) : undefined;
  const matsMap = new Map(data.materials.map((m) => [m.id, m]));

  if (!issue) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold">Issue slip not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/ledger">Back to Ledger</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Top Floating Bar for Screen View Only */}
      <div className="no-print mx-auto max-w-4xl mb-6 flex items-center justify-between rounded-lg bg-card p-4 border shadow-sm">
        <Button asChild variant="ghost" size="sm">
          <Link to="/ledger">
            <ArrowLeft className="size-4 mr-1" /> Back to Ledger
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">A4 Delivery Challan Preview</span>
          <Button variant="copper" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-4" /> Print Gate Pass / Challan
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
              <div className="inline-block rounded bg-zinc-900 px-3 py-1 text-xs font-black uppercase tracking-wider text-white print:bg-zinc-800">
                Material Gate Pass
              </div>
              <div className="num mt-2 text-lg font-bold text-copper print:text-zinc-900">
                {issue.slipNo}
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">Date: {formatDate(issue.date)}</div>
              {data.company.gstin && (
                <div className="text-[11px] font-semibold text-zinc-700 mt-1">
                  GSTIN: {data.company.gstin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Site & Movement Details */}
        <div className="grid grid-cols-2 gap-6 py-5 border-b text-xs">
          <div>
            <div className="font-bold uppercase tracking-wider text-zinc-500 text-[10px] mb-1">
              Deliver To (Client & Site Details)
            </div>
            <div className="text-sm font-bold text-zinc-900">{site?.clientName || "Direct Site"}</div>
            <div className="text-zinc-700 mt-0.5 whitespace-pre-line">{site?.address || "—"}</div>
            {site?.contactPerson && (
              <div className="mt-1 font-semibold text-zinc-800">
                Contact: {site.contactPerson} {site.phone ? `(${site.phone})` : ""}
              </div>
            )}
            {site?.gstin && <div className="text-zinc-600 mt-0.5">Client GSTIN: {site.gstin}</div>}
          </div>

          <div className="text-right sm:text-left sm:pl-8 sm:border-l">
            <div className="font-bold uppercase tracking-wider text-zinc-500 text-[10px] mb-1">
              Dispatch & Team Details
            </div>
            <div className="space-y-1">
              <div>
                <span className="text-zinc-500">Technician:</span>{" "}
                <span className="font-bold text-zinc-900">{issue.technician}</span>
              </div>
              <div>
                <span className="text-zinc-500">Dispatched From:</span>{" "}
                <span className="font-semibold text-zinc-800">Main Central Warehouse</span>
              </div>
              <div>
                <span className="text-zinc-500">Work Status:</span>{" "}
                <span className="font-semibold text-zinc-800">{issue.status}</span>
              </div>
              {site?.poNo && (
                <div>
                  <span className="text-zinc-500">Client PO No:</span>{" "}
                  <span className="num font-semibold text-zinc-900">{site.poNo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-900 text-zinc-800 uppercase tracking-wider text-[10px] font-black">
                <th className="py-2.5 px-2 w-10">Sl No</th>
                <th className="py-2.5 px-2 w-28">Item Code</th>
                <th className="py-2.5 px-2">Description & Standard Specification</th>
                <th className="py-2.5 px-2 w-28">Custom Size</th>
                <th className="py-2.5 px-2 text-right w-24">Qty Issued</th>
                <th className="py-2.5 px-2 w-20">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {issue.items.map((item, index) => {
                const m = matsMap.get(item.materialId);
                return (
                  <tr key={index} className="leading-tight">
                    <td className="py-2.5 px-2 num font-semibold text-zinc-500">{index + 1}</td>
                    <td className="py-2.5 px-2 num font-bold text-zinc-900">{m?.code || item.materialId}</td>
                    <td className="py-2.5 px-2">
                      <div className="font-bold text-zinc-900">{m?.name || item.materialId}</div>
                      <div className="text-[11px] text-zinc-500">
                        {m?.category} {m?.spec ? `· ${m.spec}` : ""}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-medium text-zinc-800">{item.size || "—"}</td>
                    <td className="py-2.5 px-2 text-right num font-black text-sm text-zinc-900">
                      {formatQty(item.qty)}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-600 font-medium">{item.unit || m?.issueUnit || "Nos"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Remarks & Terms */}
        <div className="border-t pt-4 text-xs space-y-2">
          {issue.remarks && (
            <div>
              <span className="font-bold text-zinc-700">Remarks / Instructions: </span>
              <span className="text-zinc-600">{issue.remarks}</span>
            </div>
          )}
          {data.company.terms && (
            <div className="rounded bg-zinc-50 p-2.5 text-[10px] text-zinc-600 border border-zinc-200 leading-normal">
              <span className="font-bold uppercase tracking-wider block mb-0.5 text-zinc-700">Terms & Conditions:</span>
              <div className="whitespace-pre-line">{data.company.terms}</div>
            </div>
          )}
        </div>

        {/* Signature Blocks */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div>
            <div className="border-t border-zinc-400 pt-2 font-bold text-zinc-900">
              Issued By (Storekeeper / Dispatcher)
            </div>
            <div className="text-[10px] text-zinc-500">Authorized Signatory & Stamp</div>
          </div>
          <div>
            <div className="border-t border-zinc-400 pt-2 font-bold text-zinc-900">
              Received By (Technician / Site In-Charge)
            </div>
            <div className="text-[10px] text-zinc-500">{issue.technician}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Building,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
  Archive,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useData,
  updateData,
  exportBackupJSON,
  importBackupJSON,
  loadSampleData,
  resetData,
} from "@/lib/store";
import { exportToExcel } from "@/lib/excel";
import type { CompanyProfile } from "@/types";
import { PageHeader, Field, StatusBadge } from "@/components/app/ui-bits";

export function SettingsPage() {
  const data = useData();
  const [company, setCompany] = useState<CompanyProfile>({ ...data.company });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const saveCompany = () => {
    if (!company.name.trim()) return void toast.error("Company name cannot be blank");
    updateData((d) => ({
      ...d,
      company: { ...company },
    }));
    toast.success("Company letterhead & details saved");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please select an image file (PNG, JPG, SVG).");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCompany((c) => ({ ...c, logo: dataUrl }));
      toast.success("Logo uploaded — click Save to apply it to all printouts.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLogo = () => {
    setCompany((c) => ({ ...c, logo: undefined }));
    toast.info("Logo removed — click Save to apply.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importBackupJSON(content)) {
        toast.success("Backup successfully restored!");
      } else {
        toast.error("Failed to parse backup file. Please select a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSample = () => {
    if (window.confirm("Load realistic sample HVAC sites, purchases, and ledger slips?")) {
      loadSampleData();
      toast.success("Sample data loaded successfully!");
    }
  };

  const handleResetCatalog = () => {
    if (
      window.confirm(
        "Reset catalog to fresh seed state? All current custom sites and transactions will be cleared.",
      )
    ) {
      resetData();
      toast.success("Reset to default catalog completed");
    }
  };

  const completedSites = data.sites.filter((s) => s.status === "Tax Invoiced");

  return (
    <>
      <PageHeader
        title="Settings & System Backup"
        description="Configure your official company letterhead, manage local storage backups, import/export Excel files, and review closed projects."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Letterhead Configuration */}
        <section className="panel p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 border-b pb-4 mb-5">
            <Building className="size-5 text-copper" />
            <div>
              <h2 className="text-base font-bold">Company Letterhead & Billing Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                These details appear automatically on all printed Gate Passes, Return Receipts, Indents, and FSRs.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Logo Upload */}
            <div className="sm:col-span-2 rounded-lg border-2 border-dashed border-input bg-muted/20 p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-card border border-input overflow-hidden">
                {company.logo ? (
                  <img src={company.logo} alt="Company Logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Building className="size-7 mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">No Logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="font-bold text-sm mb-0.5">Company Logo</div>
                <div className="text-xs text-muted-foreground mb-3">
                  Appears on printed Gate Passes, Indents, POs and FSRs. PNG, JPG, or SVG recommended.
                  Max display size: 160×60 px on letterhead.
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImagePlus className="size-3.5" />
                    {company.logo ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {company.logo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-9 text-destructive hover:text-destructive"
                      onClick={removeLogo}
                    >
                      <Trash2 className="size-3.5" />
                      Remove Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Field label="Company Name" required className="sm:col-span-2">
              <Input
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                placeholder="e.g. AirPro Engineers & Contractors Pvt Ltd"
                className="h-11 font-bold text-base"
              />
            </Field>

            <Field label="Tagline / Specialization" className="sm:col-span-2">
              <Input
                value={company.tagline}
                onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                placeholder="e.g. HVAC Systems, VRF & Commercial Air Conditioning"
                className="h-10"
              />
            </Field>

            <Field label="Office / Warehouse Address" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                placeholder="Full official office & warehouse address"
              />
            </Field>

            <Field label="Official Phone Numbers">
              <Input
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                placeholder="+91 98490 12345 / 040-27123456"
                className="h-10"
              />
            </Field>

            <Field label="Official Email Address">
              <Input
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                placeholder="projects@company.com"
                className="h-10"
              />
            </Field>

            <Field label="GSTIN Number">
              <Input
                value={company.gstin}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
                placeholder="36AAAAA0000A1Z5"
                className="h-10 uppercase font-semibold"
              />
            </Field>

            <Field label="PAN Number">
              <Input
                value={company.pan}
                onChange={(e) => setCompany({ ...company, pan: e.target.value.toUpperCase() })}
                placeholder="AAAAA0000A"
                className="h-10 uppercase font-semibold"
              />
            </Field>

            <Field label="Bank Details (for Invoices & Challans)" className="sm:col-span-2">
              <Input
                value={company.bankDetails}
                onChange={(e) => setCompany({ ...company, bankDetails: e.target.value })}
                placeholder="Bank Name | A/c No | IFSC | Branch"
                className="h-10"
              />
            </Field>

            <Field label="Standard Terms & Conditions for Printouts" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={company.terms}
                onChange={(e) => setCompany({ ...company, terms: e.target.value })}
                placeholder="Material issued subject to site verification. Damaged items will be charged..."
              />
            </Field>
          </div>

          <div className="mt-5 border-t pt-4 flex justify-end">
            <Button variant="copper" size="lg" onClick={saveCompany}>
              Save Letterhead Details
            </Button>
          </div>
        </section>

        {/* Right Column: Data Backup & Sample Data & Completed Archive */}
        <div className="space-y-6">
          {/* Backup & Data Actions Panel */}
          <section className="panel p-5">
            <h2 className="text-sm font-bold border-b pb-3 mb-4">Data Persistence & Backup</h2>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 h-11"
                onClick={exportBackupJSON}
              >
                <Download className="size-4 text-copper" />
                <div className="text-left">
                  <div className="font-bold text-xs">Export Backup (JSON)</div>
                  <div className="text-[10px] text-muted-foreground">Download full data snapshot file</div>
                </div>
              </Button>

              <label className="flex w-full cursor-pointer items-center justify-start gap-2.5 rounded-md border border-input bg-card px-4 py-2.5 text-xs font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground h-11">
                <Upload className="size-4 text-info" />
                <div className="text-left">
                  <div className="font-bold text-xs">Import Backup (JSON)</div>
                  <div className="text-[10px] text-muted-foreground">Restore previous database file</div>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 h-11"
                onClick={() => exportToExcel(data)}
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <div className="text-left">
                  <div className="font-bold text-xs">Export to Excel (.xlsx)</div>
                  <div className="text-[10px] text-muted-foreground">Multi-sheet workbook of all tables</div>
                </div>
              </Button>
            </div>

            <div className="mt-5 border-t pt-4 space-y-2.5">
              <div className="eyebrow">Demo & Testing</div>

              <Button
                variant="secondary"
                className="w-full justify-start gap-2 h-10 text-xs"
                onClick={handleLoadSample}
              >
                <RefreshCw className="size-3.5 text-copper" />
                <span>Load Sample Demonstration Data</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-10 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleResetCatalog}
              >
                <AlertCircle className="size-3.5" />
                <span>Reset to Clean Master Catalog</span>
              </Button>
            </div>
          </section>

          {/* Completed Projects / Sites Section */}
          <section className="panel p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Archive className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold">Completed Projects Archive</h2>
              </div>
              <span className="num font-bold text-xs text-muted-foreground">
                {completedSites.length}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Sites where work was completed, FSR signed, and final Tax Invoice raised.
            </p>

            {completedSites.length === 0 ? (
              <div className="rounded-md bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                No completed sites yet. Once a site is marked "Tax Invoiced", it will appear here.
              </div>
            ) : (
              <ul className="space-y-2 text-xs max-h-[220px] overflow-y-auto divide-y">
                {completedSites.map((s) => (
                  <li key={s.id} className="pt-2 first:pt-0 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground">{s.clientName}</div>
                      <div className="text-[10px] text-muted-foreground num">
                        {s.code} {s.fsrNo ? `· FSR: ${s.fsrNo}` : ""}
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link to={`/boq?site=${s.id}`}>
                        View <ExternalLink className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 pt-3 border-t">
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <Link to="/sites">View All Sites Directory →</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

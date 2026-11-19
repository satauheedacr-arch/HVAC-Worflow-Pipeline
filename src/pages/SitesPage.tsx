import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  User,
  ClipboardList,
  FileCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, updateData } from "@/lib/store";
import type { ProjectStatus, Site } from "@/types";
import { PROJECT_STATUSES } from "@/types";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/ui-bits";
import { SiteFormDialog, EstimatedBoqDialog, StatusPicker } from "@/components/app/SiteFormDialog";
import { formatDate, matchesQuery } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SitesPage() {
  const data = useData();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"active" | "completed" | "all">("active");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "true");
  const [editingSite, setEditingSite] = useState<Site | undefined>(undefined);
  const [boqSite, setBoqSite] = useState<Site | undefined>(undefined);
  const [statusMenuSiteId, setStatusMenuSiteId] = useState<string | null>(null);

  const filteredSites = useMemo(() => {
    return data.sites
      .filter((s) => {
        if (tab === "active") return s.status !== "Tax Invoiced";
        if (tab === "completed") return s.status === "Tax Invoiced";
        return true;
      })
      .filter((s) =>
        matchesQuery(
          `${s.clientName} ${s.code} ${s.contactPerson} ${s.phone} ${s.address} ${s.leadTech} ${s.poNo} ${s.quotationNo} ${s.status}`,
          query,
        ),
      );
  }, [data.sites, tab, query]);

  const deleteSite = (site: Site) => {
    if (window.confirm(`Are you sure you want to delete ${site.code} (${site.clientName})? This cannot be undone.`)) {
      updateData((d) => ({
        ...d,
        sites: d.sites.filter((s) => s.id !== site.id),
      }));
      toast.success(`Site ${site.code} deleted`);
    }
  };

  const changeStatus = (siteId: string, newStatus: ProjectStatus) => {
    updateData((d) => ({
      ...d,
      sites: d.sites.map((s) =>
        s.id === siteId
          ? {
              ...s,
              statusBefore: s.status,
              status: newStatus,
            }
          : s,
      ),
    }));
    setStatusMenuSiteId(null);
    toast.success(`Updated status to "${newStatus}"`);
  };

  return (
    <>
      <PageHeader
        title="Clients & Sites"
        description="Quotation hub, project statuses, lead technicians, and estimated BOQ management."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="copper" size="lg" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" /> New Client / Site
            </Button>
          </div>
        }
      />

      {/* Filter Tabs & Search Bar & View Mode Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        {/* Tabs */}
        <div className="flex rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              tab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Active Sites ({data.sites.filter((s) => s.status !== "Tax Invoiced").length})
          </button>
          <button
            type="button"
            onClick={() => setTab("completed")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              tab === "completed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Completed ({data.sites.filter((s) => s.status === "Tax Invoiced").length})
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              tab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            All Sites ({data.sites.length})
          </button>
        </div>

        {/* Search & Layout Toggles */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, tech, PO, city…"
              className="h-10 pl-9 pr-3 text-xs"
            />
          </div>

          <div className="flex rounded-md border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Card View"
              className={cn(
                "flex size-9 items-center justify-center rounded-sm transition-colors",
                viewMode === "cards" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={cn(
                "flex size-9 items-center justify-center rounded-sm transition-colors",
                viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sites Listing */}
      {filteredSites.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-10" />}
          title="No sites match your criteria"
        >
          {query ? "Try clearing your search query" : "Get started by adding your first client / project site."}
        </EmptyState>
      ) : viewMode === "cards" ? (
        /* Card View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className="panel flex flex-col justify-between overflow-hidden border transition-all hover:border-copper/50 hover:shadow-md"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="num text-xs font-bold text-copper px-1.5 py-0.5 rounded bg-copper-soft border border-copper/30">
                      {site.code}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1.5 leading-snug line-clamp-1">
                      {site.clientName}
                    </h3>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={site.status} />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-muted-foreground border-t pt-3">
                  {site.contactPerson && (
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{site.contactPerson}</span>
                      {site.phone && (
                        <span className="text-muted-foreground">· {site.phone}</span>
                      )}
                    </div>
                  )}

                  {site.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{site.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    {site.leadTech && (
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Tech:</span>
                        <span>{site.leadTech}</span>
                      </div>
                    )}
                    {site.poNo && (
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">PO:</span>
                        <span className="num">{site.poNo}</span>
                      </div>
                    )}
                    {site.quotationNo && (
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">QTN:</span>
                        <span className="num">{site.quotationNo}</span>
                      </div>
                    )}
                  </div>

                  {site.notes && (
                    <div className="mt-2 rounded bg-muted/40 p-2 text-[11px] text-muted-foreground italic line-clamp-2">
                      "{site.notes}"
                    </div>
                  )}
                </div>

                {/* Quick Status Bar / Change */}
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-semibold">Change Status:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusMenuSiteId(statusMenuSiteId === site.id ? null : site.id)
                      }
                      className="text-copper font-bold hover:underline"
                    >
                      {statusMenuSiteId === site.id ? "Close" : "Update Status ▼"}
                    </button>
                  </div>

                  {statusMenuSiteId === site.id && (
                    <div className="mt-2.5 rounded-lg border bg-muted/20 p-2">
                      <StatusPicker
                        value={site.status}
                        onChange={(newSt) => changeStatus(site.id, newSt)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBoqSite(site)}
                    className="h-8 gap-1 text-[11px]"
                  >
                    <ClipboardList className="size-3.5 text-copper" />
                    <span>BOQ ({site.estimatedBoq.length})</span>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-8 text-[11px]">
                    <Link to={`/boq?site=${site.id}`}>
                      Tracker <ExternalLink className="size-3 ml-0.5" />
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingSite(site)}
                    title="Edit site details"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteSite(site)}
                    title="Delete site"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View (for when a lot of sites come in) */
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/50 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Site Code</th>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">Contact Person & Phone</th>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">PO / QTN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Estimated BOQ</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="num font-bold text-copper px-1.5 py-0.5 rounded bg-copper-soft border border-copper/30 whitespace-nowrap inline-block">
                        {site.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground text-sm">{site.clientName}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {site.address || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{site.contactPerson || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{site.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">{site.leadTech || "—"}</td>
                    <td className="px-4 py-3.5 num text-[11px]">
                      {site.poNo ? <div>PO: {site.poNo}</div> : null}
                      {site.quotationNo ? (
                        <div className="text-muted-foreground">QTN: {site.quotationNo}</div>
                      ) : null}
                      {!site.poNo && !site.quotationNo && "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={site.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBoqSite(site)}
                        className="h-7 text-xs gap-1"
                      >
                        <ClipboardList className="size-3 text-copper" />
                        <span>{site.estimatedBoq.length} items</span>
                      </Button>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Link to={`/boq?site=${site.id}`}>Tracker</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingSite(site)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteSite(site)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New / Edit Site Dialog */}
      <SiteFormDialog
        open={newOpen || Boolean(editingSite)}
        onOpenChange={(o) => {
          if (!o) {
            setNewOpen(false);
            setEditingSite(undefined);
          }
        }}
        site={editingSite}
      />

      {/* Estimated BOQ Editor Dialog */}
      <EstimatedBoqDialog
        open={Boolean(boqSite)}
        onOpenChange={(o) => {
          if (!o) setBoqSite(undefined);
        }}
        site={boqSite}
      />
    </>
  );
}

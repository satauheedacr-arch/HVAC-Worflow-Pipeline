import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  Users,
  Building2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useData, updateData } from "@/lib/store";
import type { Material, Vendor, Person } from "@/types";
import { PageHeader, Field, EmptyState } from "@/components/app/ui-bits";
import { uid, matchesQuery } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "materials" | "vendors" | "people";

export function MastersPage() {
  const data = useData();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "materials";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");

  // Material dialog state
  const [matOpen, setMatOpen] = useState(false);
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [matForm, setMatForm] = useState<Partial<Material>>({});

  // Vendor dialog state
  const [venOpen, setVenOpen] = useState(false);
  const [editingVen, setEditingVen] = useState<Vendor | null>(null);
  const [venForm, setVenForm] = useState<Partial<Vendor>>({});

  // Person dialog state
  const [perOpen, setPerOpen] = useState(false);
  const [editingPer, setEditingPer] = useState<Person | null>(null);
  const [perForm, setPerForm] = useState<Partial<Person>>({});

  // ================= MATERIAL HANDLERS =================
  const openNewMaterial = () => {
    setEditingMat(null);
    setMatForm({
      code: "",
      name: "",
      category: "Copper & Fittings",
      subCategory: "",
      spec: "",
      purchaseUnit: "Nos",
      issueUnit: "Nos",
      defaultVendorId: data.vendors[0]?.id || "",
      notes: "",
      rare: false,
      customSize: false,
      minStock: 0,
      active: true,
    });
    setMatOpen(true);
  };

  const openEditMaterial = (m: Material) => {
    setEditingMat(m);
    setMatForm({ ...m });
    setMatOpen(true);
  };

  const saveMaterial = () => {
    if (!matForm.name?.trim()) return void toast.error("Material name is required");
    if (!matForm.code?.trim()) return void toast.error("Material code is required");

    // If the user typed a vendor name that is not an ID, create the vendor on the fly
    let resolvedVendorId = matForm.defaultVendorId || "";
    const typedVendorName = (matForm as any)._newVendorName?.trim();
    if (typedVendorName) {
      // Check if vendor already exists (by name, case-insensitive)
      const existing = data.vendors.find(
        (v) => v.name.toLowerCase() === typedVendorName.toLowerCase(),
      );
      if (existing) {
        resolvedVendorId = existing.id;
      } else {
        // Auto-create new vendor
        const newVenId = uid("ven");
        const newVen: Vendor = {
          id: newVenId,
          name: typedVendorName,
          category: "",
          contactPerson: "",
          phone: "",
          gstin: "",
          address: "",
        };
        updateData((d) => ({ ...d, vendors: [...d.vendors, newVen] }));
        resolvedVendorId = newVenId;
        toast.info(`New vendor "${typedVendorName}" created automatically`);
      }
    }

    if (editingMat) {
      updateData((d) => ({
        ...d,
        materials: d.materials.map((m) =>
          m.id === editingMat.id ? ({ ...m, ...matForm, defaultVendorId: resolvedVendorId } as Material) : m,
        ),
      }));
      toast.success("Material updated");
    } else {
      const newMat: Material = {
        id: `m-${matForm.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36).slice(-3)}`,
        code: matForm.code.trim().toUpperCase(),
        name: matForm.name.trim(),
        category: matForm.category || "General",
        subCategory: matForm.subCategory || "",
        spec: matForm.spec || "",
        purchaseUnit: matForm.purchaseUnit || "Nos",
        issueUnit: matForm.issueUnit || "Nos",
        defaultVendorId: resolvedVendorId,
        notes: matForm.notes || "",
        rare: Boolean(matForm.rare),
        customSize: Boolean(matForm.customSize),
        minStock: Number(matForm.minStock) || 0,
        active: matForm.active ?? true,
      };
      updateData((d) => ({
        ...d,
        materials: [...d.materials, newMat],
      }));
      toast.success("New material added to master catalog");
    }
    setMatOpen(false);
  };

  const deleteMaterial = (m: Material) => {
    if (window.confirm(`Delete material ${m.code} (${m.name})?`)) {
      updateData((d) => ({
        ...d,
        materials: d.materials.filter((x) => x.id !== m.id),
      }));
      toast.success(`Material ${m.code} removed`);
    }
  };

  // ================= VENDOR HANDLERS =================
  const openNewVendor = () => {
    setEditingVen(null);
    setVenForm({
      name: "",
      category: "",
      contactPerson: "",
      phone: "",
      gstin: "",
      address: "",
    });
    setVenOpen(true);
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVen(v);
    setVenForm({ ...v });
    setVenOpen(true);
  };

  const saveVendor = () => {
    if (!venForm.name?.trim()) return void toast.error("Vendor name is required");

    if (editingVen) {
      updateData((d) => ({
        ...d,
        vendors: d.vendors.map((v) =>
          v.id === editingVen.id ? ({ ...v, ...venForm } as Vendor) : v,
        ),
      }));
      toast.success("Vendor updated");
    } else {
      const newVen: Vendor = {
        id: uid("ven"),
        name: venForm.name.trim(),
        category: venForm.category || "",
        contactPerson: venForm.contactPerson || "",
        phone: venForm.phone || "",
        gstin: venForm.gstin?.toUpperCase() || "",
        address: venForm.address || "",
      };
      updateData((d) => ({
        ...d,
        vendors: [...d.vendors, newVen],
      }));
      toast.success("New vendor added");
    }
    setVenOpen(false);
  };

  const deleteVendor = (v: Vendor) => {
    if (window.confirm(`Delete vendor ${v.name}?`)) {
      updateData((d) => ({
        ...d,
        vendors: d.vendors.filter((x) => x.id !== v.id),
      }));
      toast.success(`Vendor ${v.name} removed`);
    }
  };

  // ================= PEOPLE HANDLERS =================
  const openNewPerson = () => {
    setEditingPer(null);
    setPerForm({
      name: "",
      role: "Technician",
      phone: "",
    });
    setPerOpen(true);
  };

  const openEditPerson = (p: Person) => {
    setEditingPer(p);
    setPerForm({ ...p });
    setPerOpen(true);
  };

  const savePerson = () => {
    if (!perForm.name?.trim()) return void toast.error("Name is required");

    if (editingPer) {
      updateData((d) => ({
        ...d,
        people: d.people.map((p) =>
          p.id === editingPer.id ? ({ ...p, ...perForm } as Person) : p,
        ),
      }));
      toast.success("Team member updated");
    } else {
      const newP: Person = {
        id: uid("p"),
        name: perForm.name.trim(),
        role: perForm.role || "Technician",
        phone: perForm.phone || "",
      };
      updateData((d) => ({
        ...d,
        people: [...d.people, newP],
      }));
      toast.success("Team member added");
    }
    setPerOpen(false);
  };

  const deletePerson = (p: Person) => {
    if (window.confirm(`Delete technician ${p.name}?`)) {
      updateData((d) => ({
        ...d,
        people: d.people.filter((x) => x.id !== p.id),
      }));
      toast.success(`Removed ${p.name}`);
    }
  };

  // Filtered queries
  const filteredMaterials = useMemo(
    () =>
      data.materials.filter((m) =>
        matchesQuery(
          `${m.code} ${m.name} ${m.spec} ${m.category} ${m.subCategory} ${m.notes}`,
          query,
        ),
      ),
    [data.materials, query],
  );

  const filteredVendors = useMemo(
    () =>
      data.vendors.filter((v) =>
        matchesQuery(
          `${v.name} ${v.category} ${v.contactPerson} ${v.phone} ${v.gstin} ${v.address}`,
          query,
        ),
      ),
    [data.vendors, query],
  );

  const filteredPeople = useMemo(
    () =>
      data.people.filter((p) =>
        matchesQuery(`${p.name} ${p.role} ${p.phone}`, query),
      ),
    [data.people, query],
  );

  return (
    <>
      <PageHeader
        title="Master Records"
        description="Maintain standardized HVAC materials, supplier vendors, and technician / team profiles."
        actions={
          <div className="flex items-center gap-2">
            {tab === "materials" && (
              <Button variant="copper" size="lg" onClick={openNewMaterial}>
                <Plus className="size-4" /> Add Material
              </Button>
            )}
            {tab === "vendors" && (
              <Button variant="copper" size="lg" onClick={openNewVendor}>
                <Plus className="size-4" /> Add Vendor
              </Button>
            )}
            {tab === "people" && (
              <Button variant="copper" size="lg" onClick={openNewPerson}>
                <Plus className="size-4" /> Add Technician
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("materials")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-all",
              tab === "materials" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Package className="size-3.5" />
            Materials Catalog ({data.materials.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("vendors")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-all",
              tab === "vendors" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Building2 className="size-3.5" />
            Vendors ({data.vendors.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("people")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-all",
              tab === "people" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="size-3.5" />
            Technicians & Team ({data.people.length})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="h-10 pl-9 pr-3 text-xs"
          />
        </div>
      </div>

      {/* TAB 1: MATERIALS */}
      {tab === "materials" && (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Material Name</th>
                  <th className="px-4 py-3">Category & Sub-Category</th>
                  <th className="px-4 py-3">Size / Spec</th>
                  <th className="px-4 py-3">Purchase Unit</th>
                  <th className="px-4 py-3">Issue Unit</th>
                  <th className="px-4 py-3">Default Vendor</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaterials.map((m) => {
                  const ven = data.vendors.find((v) => v.id === m.defaultVendorId);
                  return (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-bold num text-copper">{m.code}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground text-sm">{m.name}</div>
                        {m.notes && <div className="text-[11px] text-muted-foreground italic">{m.notes}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{m.category}</div>
                        <div className="text-[11px] text-muted-foreground">{m.subCategory}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">{m.spec || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{m.purchaseUnit}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{m.issueUnit}</td>
                      <td className="px-4 py-3.5 font-semibold text-foreground">{ven?.name || "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {m.rare && (
                            <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                              Rare
                            </span>
                          )}
                          {m.customSize && (
                            <span className="rounded bg-copper-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-copper">
                              Custom Size
                            </span>
                          )}
                          {!m.active && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditMaterial(m)}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMaterial(m)}
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
        </section>
      )}

      {/* TAB 2: VENDORS */}
      {tab === "vendors" && (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Vendor Name</th>
                  <th className="px-4 py-3">Category Supplied</th>
                  <th className="px-4 py-3">Contact Person & Phone</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-sm text-foreground">{v.name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-sm">{v.category}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{v.contactPerson || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{v.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5 num text-[11px] font-semibold text-foreground">
                      {v.gstin || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{v.address || "—"}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditVendor(v)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteVendor(v)}
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
        </section>
      )}

      {/* TAB 3: PEOPLE */}
      {tab === "people" && (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Designation / Role</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPeople.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-sm text-foreground">{p.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 num text-muted-foreground">{p.phone || "—"}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditPerson(p)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deletePerson(p)}
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
        </section>
      )}

      {/* ================= MODALS ================= */}

      {/* Material Modal */}
      <Dialog open={matOpen} onOpenChange={setMatOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMat ? "Edit Material Master" : "Add Material to Master Catalog"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item Code" required>
              <Input
                value={matForm.code || ""}
                onChange={(e) => setMatForm({ ...matForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. COP-S-07"
                className="h-10 uppercase"
              />
            </Field>

            <Field label="Category" required>
              <Input
                value={matForm.category || ""}
                onChange={(e) => setMatForm({ ...matForm, category: e.target.value })}
                placeholder="e.g. Copper & Fittings"
                className="h-10"
              />
            </Field>

            <Field label="Standardized Material Name" required className="sm:col-span-2">
              <Input
                value={matForm.name || ""}
                onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                placeholder="e.g. Copper Pipe Soft - 7/8 inch"
                className="h-10"
              />
            </Field>

            <Field label="Sub-Category">
              <Input
                value={matForm.subCategory || ""}
                onChange={(e) => setMatForm({ ...matForm, subCategory: e.target.value })}
                placeholder="e.g. Copper Pipe - Soft"
                className="h-10"
              />
            </Field>

            <Field label="Size / Specification">
              <Input
                value={matForm.spec || ""}
                onChange={(e) => setMatForm({ ...matForm, spec: e.target.value })}
                placeholder='e.g. 7/8" OD x 18G'
                className="h-10"
              />
            </Field>

            <Field label="Purchase Unit">
              <Input
                value={matForm.purchaseUnit || ""}
                onChange={(e) => setMatForm({ ...matForm, purchaseUnit: e.target.value })}
                placeholder="e.g. Kgs or Lengths"
                className="h-10"
              />
            </Field>

            <Field label="Issue Unit">
              <Input
                value={matForm.issueUnit || ""}
                onChange={(e) => setMatForm({ ...matForm, issueUnit: e.target.value })}
                placeholder="e.g. Rmt / Kgs or Nos"
                className="h-10"
              />
            </Field>

            <Field label="Default Vendor (type name or pick from list — new vendors are created automatically)">
              <div className="relative">
                <input
                  list="vendor-datalist"
                  value={
                    // Show the vendor name: if it's an ID, look up the name; if already a free-form name, show it
                    data.vendors.find((v) => v.id === matForm.defaultVendorId)?.name ||
                    (matForm as any)._newVendorName ||
                    matForm.defaultVendorId ||
                    ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    // Try to match to existing vendor by name
                    const matched = data.vendors.find(
                      (v) => v.name.toLowerCase() === val.toLowerCase(),
                    );
                    if (matched) {
                      setMatForm({ ...matForm, defaultVendorId: matched.id, _newVendorName: undefined } as any);
                    } else {
                      // Store free-form name for auto-creation on save
                      setMatForm({ ...matForm, defaultVendorId: "", _newVendorName: val } as any);
                    }
                  }}
                  placeholder="Type vendor name or select from list…"
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-copper"
                />
                <datalist id="vendor-datalist">
                  {data.vendors.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
                {(matForm as any)._newVendorName && (
                  <p className="mt-1 text-[11px] text-amber-700 font-semibold">
                    ✦ "{(matForm as any)._newVendorName}" will be created as a new vendor on save.
                  </p>
                )}
              </div>
            </Field>

            <Field label="Min Stock Alert Threshold">
              <Input
                type="number"
                value={matForm.minStock || 0}
                onChange={(e) => setMatForm({ ...matForm, minStock: Number(e.target.value) || 0 })}
                className="h-10"
              />
            </Field>

            <div className="sm:col-span-2 flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(matForm.rare)}
                  onChange={(e) => setMatForm({ ...matForm, rare: e.target.checked })}
                  className="rounded text-copper focus:ring-copper"
                />
                Mark as Rare Item (Special Procurement)
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(matForm.customSize)}
                  onChange={(e) => setMatForm({ ...matForm, customSize: e.target.checked })}
                  className="rounded text-copper focus:ring-copper"
                />
                Requires Custom Site Size Input (e.g. Diffusers)
              </label>
            </div>

            <Field label="Application / Usage Notes" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={matForm.notes || ""}
                onChange={(e) => setMatForm({ ...matForm, notes: e.target.value })}
                placeholder="Pressure ratings, refrigerant compatibility..."
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMatOpen(false)}>
              Cancel
            </Button>
            <Button variant="copper" onClick={saveMaterial}>
              Save Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Modal */}
      <Dialog open={venOpen} onOpenChange={setVenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVen ? "Edit Vendor Details" : "Add Supplier / Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Vendor / Company Name" required>
              <Input
                value={venForm.name || ""}
                onChange={(e) => setVenForm({ ...venForm, name: e.target.value })}
                placeholder="e.g. Ranko Metal Traders"
                className="h-10"
              />
            </Field>
            <Field label="Products / Category Supplied">
              <Input
                value={venForm.category || ""}
                onChange={(e) => setVenForm({ ...venForm, category: e.target.value })}
                placeholder="e.g. Copper Pipes, Brass Fittings"
                className="h-10"
              />
            </Field>
            <Field label="Contact Person">
              <Input
                value={venForm.contactPerson || ""}
                onChange={(e) => setVenForm({ ...venForm, contactPerson: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="h-10"
              />
            </Field>
            <Field label="Phone Number">
              <Input
                value={venForm.phone || ""}
                onChange={(e) => setVenForm({ ...venForm, phone: e.target.value })}
                placeholder="e.g. +91 98490 12345"
                className="h-10"
              />
            </Field>
            <Field label="GSTIN">
              <Input
                value={venForm.gstin || ""}
                onChange={(e) => setVenForm({ ...venForm, gstin: e.target.value.toUpperCase() })}
                placeholder="36AAAAA0000A1Z5"
                className="h-10 uppercase"
              />
            </Field>
            <Field label="Address / City">
              <Textarea
                rows={2}
                value={venForm.address || ""}
                onChange={(e) => setVenForm({ ...venForm, address: e.target.value })}
                placeholder="Shop No, Market, City"
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVenOpen(false)}>
              Cancel
            </Button>
            <Button variant="copper" onClick={saveVendor}>
              Save Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Person Modal */}
      <Dialog open={perOpen} onOpenChange={setPerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPer ? "Edit Team Member" : "Add Technician / Supervisor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Full Name" required>
              <Input
                value={perForm.name || ""}
                onChange={(e) => setPerForm({ ...perForm, name: e.target.value })}
                placeholder="e.g. Ramesh (Tech)"
                className="h-10"
              />
            </Field>
            <Field label="Role / Designation" required>
              <select
                value={perForm.role || "Technician"}
                onChange={(e) => setPerForm({ ...perForm, role: e.target.value as any })}
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-semibold"
              >
                <option value="Technician">Technician</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Storekeeper">Storekeeper</option>
                <option value="Inspector">Site Inspector</option>
              </select>
            </Field>
            <Field label="Mobile Phone">
              <Input
                value={perForm.phone || ""}
                onChange={(e) => setPerForm({ ...perForm, phone: e.target.value })}
                placeholder="+91 98480 00000"
                className="h-10"
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPerOpen(false)}>
              Cancel
            </Button>
            <Button variant="copper" onClick={savePerson}>
              Save Team Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

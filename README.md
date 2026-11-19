# HVAC Material & Site Pipeline Web Application

A refined, high-performance, and responsive React + Tailwind CSS web application designed specifically for HVAC (Heating, Ventilation & Air Conditioning) contracting companies to manage end-to-end site pipelines, material procurement, site issues, return reconciliation, running/final BOQs, and one-click printable documents on company letterheads.

---

## 🚀 Key Highlights & Refinements

1. **Local Storage First with Zero Data Loss:**
   - Everything runs in the browser using reactive local storage.
   - **Export to JSON Backup** & **Import JSON Backup** to restore previous states anytime.
   - **Export to Excel (.xlsx)**: Generates a complete multi-sheet workbook covering Materials, Sites, Purchases, and Issue/Return Slips.
   - **Load Sample Data**: One-click demo data population for client presentations and testing.

2. **Standardized Master Material Catalog (108 Items):**
   - Pre-loaded with exact HVAC categories and default suppliers:
     - **Copper & Fittings** (Default Vendor: *Ranko*): Soft coils (1/4" to 3/4"), Hard straight pipes (3/4" to 1 5/8"), 90° elbows, couplings, brass flare nuts, copper brazing rods, silver brazing rods (rare).
     - **Insulation** (Default Vendor: *Om Insulation*): Nitrile foam tubing (1/4" to 1 3/8"), Nitrile rubber sheets (9mm closed/open acoustic, 25mm O-class), perforated aluminium sheets, adhesive, masking & PVC tapes.
     - **Electrical & Controls** (Default Vendor: *Sri Ram Sales* / *SM Agencies*): Shielded VRF communication cables, copper power cables, V-Guard stabilizers (3/4/5 KVA).
     - **Drain & PVC** (Default Vendor: *Vinay & Sudhir*): Normal PVC, heavy CPVC, UPVC pipes & fittings (20mm, 25mm, 32mm), rigid conduits, solvents, and Teflon tape.
     - **Fasteners & Supports** (Default Vendor: *AP Fastener*): Threaded rods (8mm, 10mm x 2m), expansion anchor bolts, drop-in shell & nuts, washers, slotted patti (18G, 20G), ODU stands, anti-vibration rubber pads, jumbo clamps, brazing gas kit.
     - **Gases & Refrigerants** (Default Vendor: *General Gas Vendor*): R-22, R-32, R-410A, Oxygen, Nitrogen, Acetylene, LPG.
     - **Ducting & Grilles** (Default Vendor: *Ducting Vendor*): Aluminium linear bar grilles (4" & 6", 15° & 25°, Continuous & Individual), ceiling diffusers (with custom site size inputs), and collar dampers.

3. **Clients & Sites (Quotation Hub):**
   - Fields: Company Name, Contact Person (CP Name), CP Phone, Site Address, Client GSTIN, Assigned Lead Technician, PO No., Quotation No., Quotation Date, FSR No., Notes.
   - **Site Status Progression Flow** (interactive chips, no scrolling dropdown):
     `New Site / PO Received` → `Quotation In Progress` → `Gone for Inspection` → `Quotation Sent` → `Confirmed` → `Work Under Progress` → `Material at Site` → `Work Completed` → `FSR & Handover` → `Tax Invoiced`.
   - **View Toggles**: Switch between **Card View** and compact **List View** for large volumes of sites. Filter by Active, Completed, or All.

4. **Purchase & Inward Stock:**
   - Supports: **Tax Invoice**, **Bill**, **Purchase Order**, and **Proforma Invoice**.
   - Fields: Vendor Invoice No., Proforma Invoice No., editable Purchase Date, Vendor Selection (auto-fills default vendor when item is selected, fully editable).
   - **Three Allocation Modes:**
     1. *Main Store (Bulk Stock)*: Automatically replenishes central warehouse stock.
     2. *Direct to Specific Site*: Bypasses store and delivers straight to target project site.
     3. *Multiple Sites Material Purchase*: Assign individual target destination sites per line item!
   - **Vendor Indent Mode (Quotation Enquiry):**
     - Selecting a vendor automatically loads all materials supplied by that vendor.
     - Rate and Amount columns are omitted, producing clean quantity enquiry indents ready to email to vendors on your company letterhead.
   - **Purchase Log Table**: Open and print any invoice / purchase order / indent with one click.

5. **Site Issue & Return Ledger (Pipeline Core):**
   - **Issue Material Form (Gate Pass)**: Site, Technician, Date, Status (In Progress / Completed), Materials with live store stock availability indicators (green badge when available, red alert when exceeding store stock).
   - **Return Unused Material Form**: Site, Technician, Date, Materials with live at-site inventory displayed so you know exactly what is available to return. Automatically credits items back to Main Store.
   - **Audit History**: Filter all movement slips by Site, Technician, Type (Issue vs. Return), and Date.

6. **Site BOQ & Closure Tracker:**
   - Side-by-side reconciliation table:
     `Estimated BOQ | Total Issued | Total Returned | Net Consumed (Final BOQ) | Unit`
   - **Smart Milestone Toggles**:
     `[Work Completed]` `[FSR & Handover]` `[Tax Invoiced]`
     - Clicking ON transitions the site to that status.
     - Clicking OFF smoothly reverts back to the previous status (`statusBefore`).
   - Direct button to **Edit Planned BOQ** with instant propagation across all views.
   - Lists all linked vendor invoices and technician slips with print links.

7. **Main Store Stock & Inventory:**
   - Central inventory audit view showing Total Inward, Total Issued, Total Returned, and Available Stock.
   - **Direct inline typing** for:
     - Minimum Stock Alert Threshold.
     - Physical Store Stock count adjustments (rare count corrections).
   - Category filter, low-stock warning filter, and search.

8. **Masters Management:**
   - Tabs to Add, Edit, Delete:
     - Materials (with category, units, rare/active tags, custom size flags).
     - Vendors (name, phone, GSTIN, address).
     - Technicians & Supervisors.

9. **Settings & Letterhead Customization:**
   - Configure Company Name, Tagline, Address, Phone, Email, GSTIN, PAN, Bank Details, and Print Terms.
   - Completed Projects Archive section.

10. **One-Click Printable Documents (@media print):**
    - **Material Issue Gate Pass / Delivery Challan**: Client & site details, dispatcher, technician, itemized table, and dual signature blocks.
    - **Material Return Receipt**: Acknowledges returned surplus items.
    - **Running / Final BOQ & Field Service Report (FSR)**: Net consumed reconciliation table, commissioning QA checklist, and Client Sign-off & Stamp block.
    - **Vendor Indent / Purchase Order Document**: Official enquiry / order document for vendors.

11. **Responsive & Collapsible Sidebar UI:**
    - High-contrast industrial copper & slate aesthetic.
    - Collapsible sidebar that collapses into an icon-only mode with perfectly centered icons inside active copper indicators (no distorted text or misplaced highlight boxes).
    - Mobile-friendly navigation drawer.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS + custom color themes (copper, info, warning, success, danger)
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Notifications**: Sonner Toasts
- **Export/Import**: SheetJS (`xlsx`) for Excel spreadsheets & native JSON file generation
- **Hosting Ready**: Pre-configured with `vercel.json` for seamless Vercel SPA deployment.

---

## 💻 Local Development Setup

To run this app on your local machine:

```bash
# 1. Clone or navigate to the repository
cd hvac-material-pipeline

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 📦 Production Build & Testing

```bash
# Build production bundle into /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deploying to Vercel

This app is 100% client-side compatible with HTML5 pushState routing configured via `vercel.json`.

1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of refined HVAC Material & Site Pipeline app"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import your GitHub repository.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build` (output directory: `dist`).
6. Click **Deploy**. Your app will be live with no build or routing errors!

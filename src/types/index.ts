export type ProjectStatus =
  | "New Site / PO Received"
  | "Quotation In Progress"
  | "Gone for Inspection"
  | "Quotation Sent"
  | "Confirmed"
  | "Work Under Progress"
  | "Material at Site"
  | "Work Completed"
  | "FSR & Handover"
  | "Tax Invoiced";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "New Site / PO Received",
  "Quotation In Progress",
  "Gone for Inspection",
  "Quotation Sent",
  "Confirmed",
  "Work Under Progress",
  "Material at Site",
  "Work Completed",
  "FSR & Handover",
  "Tax Invoiced",
];

export type IssueStatus = "In Progress" | "Completed";
export const ISSUE_STATUSES: IssueStatus[] = ["In Progress", "Completed"];

export type PurchaseDocType = "Purchase Order" | "Vendor Bill / Invoice" | "Proforma Invoice" | "Delivery Challan";
export const PURCHASE_DOC_TYPES: PurchaseDocType[] = [
  "Purchase Order",
  "Vendor Bill / Invoice",
  "Proforma Invoice",
  "Delivery Challan",
];

export interface LineItem {
  materialId: string;
  qty: number;
  rate?: number;
  unit?: string; // Changable unit (Kgs, Rmt, Feet, Lengths, Nos, etc.)
  size?: string;
  siteId?: string; // used for Multi-sites allocation
}

export interface Material {
  id: string;
  code: string;
  category: string;
  subCategory: string;
  name: string;
  spec: string;
  purchaseUnit: string;
  issueUnit: string;
  defaultVendorId: string;
  notes: string;
  rare: boolean;
  customSize: boolean;
  minStock: number;
  active: boolean;
  inStoreAdjustment?: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactPerson?: string;
  phone?: string;
  gstin?: string;
  address?: string;
}

export interface Person {
  id: string;
  name: string;
  role: "Technician" | "Supervisor" | "Storekeeper" | "Inspector";
  phone?: string;
}

export interface Site {
  id: string;
  code: string;
  clientName: string;
  contactPerson: string;
  phone: string;
  address: string;
  gstin: string;
  leadTech: string;
  poNo: string;
  quotationNo: string;
  quotationDate: string;
  fsrNo: string;
  status: ProjectStatus;
  statusBefore?: ProjectStatus | null;
  notes: string;
  estimatedBoq: LineItem[];
  // Allow manual direct adjustments per material on the BOQ tracker (Running BOQ, Issued, Returned, Unit)
  boqAdjustments?: Record<string, { runningBoq?: number; issued?: number; returned?: number; unit?: string }>;
  createdAt: string;
}

export interface Purchase {
  id: string;
  entryNo: string;
  docType: PurchaseDocType;
  invoiceNo: string;
  proformaNo: string;
  poNo: string;
  date: string;
  vendorId: string;
  vendorName: string;
  vendorAddress?: string;
  vendorPhone?: string;
  allocation: "single" | "multi";
  siteId: string; // for Single Site
  items: LineItem[];
  notes: string;
  isIndent?: boolean;
}

export interface IssueSlip {
  id: string;
  slipNo: string;
  date: string;
  siteId: string;
  technician: string;
  status: IssueStatus;
  remarks: string;
  items: LineItem[];
}

export interface ReturnSlip {
  id: string;
  slipNo: string;
  date: string;
  siteId: string;
  technician: string;
  remarks: string;
  items: LineItem[];
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  bankDetails: string;
  terms: string;
  logo?: string; // base64 or image URL
}

export interface AppData {
  company: CompanyProfile;
  materials: Material[];
  vendors: Vendor[];
  people: Person[];
  sites: Site[];
  purchases: Purchase[];
  issues: IssueSlip[];
  returns: ReturnSlip[];
}

import type { AppData, CompanyProfile, Person, Site } from "@/types";
import { buildInitialMaterials, SEED_VENDORS } from "./catalog";
import { todayISO } from "./format";

export function defaultCompany(): CompanyProfile {
  return {
    name: "AirPro Engineers & HVAC Contractors",
    tagline: "Commercial & Industrial Air Conditioning Solutions",
    address: "Plot No. 48, Phase-2, IDA Cherlapally, Hyderabad, Telangana - 500051",
    phone: "+91 98490 11223 / +91 40 2712 3456",
    email: "projects@airprohvac.in",
    gstin: "36AABCA9876C1Z8",
    pan: "AABCA9876C",
    bankDetails: "HDFC Bank | A/c No: 50200088997766 | IFSC: HDFC0000456 | Branch: Habsiguda",
    terms: "1. Material issued as per approved site drawing & BOQ.\n2. Unused & undamaged material must be returned with Return Slip within 48 hours of stage completion.\n3. Re-issue against damage or loss requires authorization from Project Manager.",
    logo: "",
  };
}

export function defaultPeople(): Person[] {
  return [
    { id: "p-ramesh", name: "Ramesh (Tech)", role: "Technician", phone: "+91 98480 11111" },
    { id: "p-suresh", name: "Suresh (Tech)", role: "Technician", phone: "+91 98480 22222" },
    { id: "p-imran", name: "Imran (Tech)", role: "Technician", phone: "+91 98480 33333" },
    { id: "p-anand", name: "Anand Kumar", role: "Supervisor", phone: "+91 98480 44444" },
    { id: "p-rajesh", name: "Rajesh Rao", role: "Storekeeper", phone: "+91 98480 55555" },
  ];
}

export function blankSite(): Site {
  return {
    id: "",
    code: "",
    clientName: "",
    contactPerson: "",
    phone: "",
    address: "",
    gstin: "",
    leadTech: "",
    poNo: "",
    quotationNo: "",
    quotationDate: todayISO(),
    fsrNo: "",
    status: "New Site / PO Received",
    statusBefore: null,
    notes: "",
    estimatedBoq: [],
    createdAt: todayISO(),
  };
}

/** Fresh clean baseline with NO dummy transaction data - ready for real use */
export function getSeedData(): AppData {
  return {
    company: defaultCompany(),
    materials: buildInitialMaterials(),
    vendors: SEED_VENDORS,
    people: defaultPeople(),
    sites: [],
    purchases: [],
    issues: [],
    returns: [],
  };
}

/** Rich demonstration data accessible via Settings "Load Sample Demonstration Data" */
export function getSampleData(): AppData {
  const seed = getSeedData();

  return {
    ...seed,
    sites: [
      {
        id: "s-001",
        code: "SITE-001",
        clientName: "CyberCity Towers (Tower 4)",
        contactPerson: "K. Murali (Facility Mgr)",
        phone: "+91 98491 55667",
        address: "HITEC City, Madhapur, Hyderabad",
        gstin: "36AACCC1234D1Z9",
        leadTech: "Ramesh (Tech)",
        poNo: "PO/CCT/2026/092",
        quotationNo: "QTN-2026-042",
        quotationDate: "2026-11-10",
        fsrNo: "",
        status: "Work Under Progress",
        notes: "15 TR VRF installation with indoor ducting across 4th floor executive cabins.",
        estimatedBoq: [
          { materialId: "m-cop-s-02", qty: 60, unit: "Kgs" },
          { materialId: "m-cop-s-03", qty: 45, unit: "Kgs" },
          { materialId: "m-cop-h-01", qty: 8, unit: "Lengths" },
          { materialId: "m-fit-elb-02", qty: 24, unit: "Nos" },
          { materialId: "m-ins-tub-03", qty: 60, unit: "Mtrs" },
          { materialId: "m-ins-tub-05", qty: 45, unit: "Mtrs" },
          { materialId: "m-cbl-02", qty: 120, unit: "Mtrs" },
          { materialId: "m-gas-02", qty: 8, unit: "Kgs" },
        ],
        createdAt: "2026-11-10",
      },
      {
        id: "s-002",
        code: "SITE-002",
        clientName: "KIMS Cuddles Hospital (OT Wing)",
        contactPerson: "Dr. Sandeep / Eng. Vijay",
        phone: "+91 98492 88990",
        address: "Kondapur Main Road, Hyderabad",
        gstin: "36AAACK5566G1Z2",
        leadTech: "Suresh (Tech)",
        poNo: "KIMS-MED-PO-441",
        quotationNo: "QTN-2026-055",
        quotationDate: "2026-11-12",
        fsrNo: "",
        status: "Material at Site",
        notes: "Precision AC copper piping with 19mm nitrile insulation and CPVC drain headers.",
        estimatedBoq: [
          { materialId: "m-cop-h-02", qty: 12, unit: "Lengths" },
          { materialId: "m-cop-h-03", qty: 6, unit: "Lengths" },
          { materialId: "m-ins-tub-04", qty: 40, unit: "Mtrs" },
          { materialId: "m-drn-cpv-02", qty: 15, unit: "Lengths" },
          { materialId: "m-drn-cpv-05", qty: 12, unit: "Nos" },
          { materialId: "m-gas-03", qty: 12, unit: "Kgs" },
        ],
        createdAt: "2026-11-12",
      },
    ],
    purchases: [
      {
        id: "pur-001",
        entryNo: "PUR-001",
        docType: "Purchase Order",
        invoiceNo: "RNK-2026-1182",
        proformaNo: "PI-RNK-88",
        poNo: "PO-AIR-081",
        date: "2026-11-10",
        vendorId: "v-ranko",
        vendorName: "Ranko",
        vendorAddress: "Ranigunj, Secunderabad",
        allocation: "single",
        siteId: "main-store",
        items: [
          { materialId: "m-cop-s-02", qty: 120, rate: 860, unit: "Kgs" },
          { materialId: "m-cop-s-03", qty: 80, rate: 890, unit: "Kgs" },
          { materialId: "m-cop-h-01", qty: 20, rate: 1100, unit: "Lengths" },
          { materialId: "m-fit-elb-02", qty: 60, rate: 65, unit: "Nos" },
          { materialId: "m-brz-01", qty: 15, rate: 1250, unit: "Kgs" },
        ],
        notes: "Primary bulk copper stock inwarded for CyberCity and general sites",
      },
    ],
    issues: [],
    returns: [],
  };
}

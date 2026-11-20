/**
 * HVAC Pipeline – Persistent Data Store
 * ======================================
 * Triple-layer persistence so data NEVER gets lost on browser close:
 *   Layer 1  – localStorage["hvac_pipeline_v3"]          (primary, instant sync)
 *   Layer 2  – localStorage["hvac_pipeline_v3_bak"]      (mirror backup)
 *   Layer 3  – IndexedDB["HVACPipelineDB"]["main"]        (durable, survives cookie/cache clears)
 *
 * On first load: checks ALL layers + ALL legacy keys so old data is never lost.
 * On every update: writes to all three layers immediately.
 */

import { useEffect, useState } from "react";
import type { AppData } from "@/types";
import { getSeedData, getSampleData } from "./defaults";

// ─── Storage Key Constants ─────────────────────────────────────────────────────
// IMPORTANT: also scan legacy keys so users never lose existing data
const LS_PRIMARY  = "hvac_pipeline_v3";
const LS_BACKUP   = "hvac_pipeline_v3_bak";
const SS_KEY      = "hvac_pipeline_session"; // sessionStorage mirror (last-resort)
const IDB_DB      = "HVACPipelineDB";
const IDB_STORE   = "app_data";
const IDB_KEY     = "main";

// All keys that may contain saved data (newest first)
const ALL_LS_KEYS = [
  "hvac_pipeline_v3",
  "hvac_pipeline_v3_bak",
  "hvac_pipeline_data_v3",
  "hvac_pipeline_data_v3_bak",
  "hvac_material_pipeline_v2",
  "hvac_material_pipeline_v2_backup_safe",
];

// ─── Validation ───────────────────────────────────────────────────────────────
function isValid(d: unknown): d is AppData {
  return (
    d !== null &&
    typeof d === "object" &&
    Array.isArray((d as AppData).materials) &&
    Array.isArray((d as AppData).sites) &&
    Array.isArray((d as AppData).purchases)
  );
}

// ─── Synchronous localStorage scan (tries ALL keys) ──────────────────────────
function lsRead(): AppData | null {
  for (const key of ALL_LS_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) {
        console.info(`[store] Loaded data from localStorage key: ${key}`);
        return parsed as AppData;
      }
    } catch {}
  }
  // Last resort: check sessionStorage
  try {
    const raw = sessionStorage.getItem("hvac_pipeline_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) {
        console.info("[store] Restored from sessionStorage");
        return parsed as AppData;
      }
    }
  } catch {}
  return null;
}

function lsWrite(data: AppData): void {
  try {
    const s = JSON.stringify(data);
    localStorage.setItem(LS_PRIMARY, s);
    localStorage.setItem(LS_BACKUP, s);
    // Mirror to sessionStorage as a last-resort in-session safety copy
    try { sessionStorage.setItem("hvac_pipeline_session", s); } catch {}
  } catch (e) {
    console.error("[store] localStorage write error:", e);
  }
}

// ─── Async IndexedDB helpers ──────────────────────────────────────────────────
let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => { _db = req.result; resolve(req.result); };
    req.onerror   = () => reject(req.error);
  });
}

async function idbRead(): Promise<AppData | null> {
  try {
    const db = await openDB();
    return new Promise<AppData | null>((resolve) => {
      const tx  = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(isValid(req.result) ? req.result as AppData : null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

async function idbWrite(data: AppData): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch (e) { console.error("[store] IndexedDB write error:", e); }
}

// ─── Initialise in-memory cache ───────────────────────────────────────────────
// Step 1: Try localStorage (synchronous — no blank flash on first render)
let currentData: AppData = (() => {
  const fromLS = lsRead();
  if (fromLS) {
    // Ensure it's also written to the canonical keys (migration from old keys)
    lsWrite(fromLS);
    return fromLS;
  }
  // Nothing in localStorage → will check IndexedDB asynchronously below
  return getSeedData();
})();

const listeners = new Set<() => void>();

// Step 2: Check IndexedDB in background — may rescue data if localStorage was cleared
idbRead().then((idbData) => {
  if (idbData && !lsRead()) {
    // localStorage is empty but IndexedDB has data → restore
    console.info("[store] ✅ Restored data from IndexedDB (localStorage was empty)");
    currentData = idbData;
    lsWrite(idbData);
    listeners.forEach((fn) => fn());
  } else if (!idbData) {
    // IndexedDB empty → seed it with whatever we have
    idbWrite(currentData);
  }
});

// Step 3: Safety flush on tab/window close
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    lsWrite(currentData);
  });
  // Also flush on visibility change (mobile: app going to background)
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      lsWrite(currentData);
      idbWrite(currentData);
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function getData(): AppData { return currentData; }

export function updateData(updater: (prev: AppData) => AppData): void {
  try {
    const next = updater(currentData);
    currentData = next;
    lsWrite(next);         // sync — instant
    idbWrite(next);        // async — durable
    listeners.forEach((fn) => fn());
  } catch (err) {
    console.error("[store] updateData error:", err);
  }
}

/** React hook — subscribes to store */
export function useData(): AppData {
  const [data, setData] = useState<AppData>(currentData);

  useEffect(() => {
    setData(currentData); // sync in case store changed before effect ran

    const onChange = () => setData({ ...currentData });
    listeners.add(onChange);

    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (ALL_LS_KEYS.includes(e.key ?? "") && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (isValid(parsed)) {
            currentData = parsed as AppData;
            setData({ ...currentData });
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return data;
}

/** Reset everything to fresh seed (clears all data) */
export function resetData(): void { updateData(() => getSeedData()); }

/** Load rich sample data */
export function loadSampleData(): void { updateData(() => getSampleData()); }

/** Export JSON backup file */
export function exportBackupJSON(): void {
  const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `hvac-pipeline-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import JSON backup */
export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!isValid(parsed)) throw new Error("Invalid format");
    updateData(() => parsed as AppData);
    return true;
  } catch (err) {
    console.error("[store] Import error:", err);
    return false;
  }
}

/** Kept for backwards compatibility — no-op now that migration is in lsRead() */
export function migrateLegacyStorage(): void {}

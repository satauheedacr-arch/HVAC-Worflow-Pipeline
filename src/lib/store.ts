/**
 * HVAC Pipeline – Persistent Data Store
 * ======================================
 * Dual-layer persistence:
 *   Layer 1 (Primary)  – IndexedDB  → survives all browser restarts, never auto-cleared
 *   Layer 2 (Fast cache) – localStorage → used for instant synchronous load on first render
 *
 * On every update:
 *   • Writes synchronously to localStorage (both primary + backup keys)
 *   • Writes asynchronously to IndexedDB
 *
 * On load:
 *   • Reads synchronously from localStorage for instant first render (no flicker)
 *   • Checks IndexedDB in background; if IndexedDB has newer/valid data, updates in-memory + localStorage
 */

import { useEffect, useState } from "react";
import type { AppData } from "@/types";
import { getSeedData, getSampleData } from "./defaults";

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const LS_PRIMARY   = "hvac_pipeline_data_v3";
const LS_BACKUP    = "hvac_pipeline_data_v3_bak";
const IDB_DB_NAME  = "HVACPipelineDB";
const IDB_STORE    = "app_data";
const IDB_KEY      = "main";
const IDB_VERSION  = 1;

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

// ─── Synchronous localStorage helpers ─────────────────────────────────────────
function lsRead(): AppData | null {
  for (const key of [LS_PRIMARY, LS_BACKUP]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) return parsed as AppData;
    } catch {}
  }
  return null;
}

function lsWrite(data: AppData): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(LS_PRIMARY, serialized);
    localStorage.setItem(LS_BACKUP, serialized);
  } catch (e) {
    console.error("[store] localStorage write failed:", e);
  }
}

// ─── Async IndexedDB helpers ───────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbRead(): Promise<AppData | null> {
  try {
    const db = await openDB();
    return await new Promise<AppData | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(isValid(req.result) ? (req.result as AppData) : null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbWrite(data: AppData): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch (e) {
    console.error("[store] IndexedDB write failed:", e);
  }
}

// ─── In-memory cache & subscriber list ────────────────────────────────────────
let currentData: AppData = (() => {
  // Try localStorage first (synchronous — no blank flash on load)
  const fromLS = lsRead();
  if (fromLS) return fromLS;

  // Nothing in localStorage — bootstrap with fresh seed
  const seed = getSeedData();
  lsWrite(seed);
  return seed;
})();

const listeners = new Set<() => void>();

// After mount, reconcile with IndexedDB (may have more recent data)
idbRead().then((idbData) => {
  if (!idbData) {
    // IndexedDB is empty — write what we have so it's persisted there too
    idbWrite(currentData);
    return;
  }
  // If IndexedDB has data not in localStorage (e.g. after a browser storage clear),
  // promote the IndexedDB data as authoritative
  const lsCurrent = lsRead();
  if (!lsCurrent) {
    console.info("[store] Restored from IndexedDB after localStorage was cleared");
    currentData = idbData;
    lsWrite(idbData);
    listeners.forEach((fn) => fn());
  }
});

// Safety flush on page close (belt-and-suspenders)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    lsWrite(currentData);
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────
export function getData(): AppData {
  return currentData;
}

export function updateData(updater: (prev: AppData) => AppData): void {
  try {
    const next = updater(currentData);
    currentData = next;
    // Sync write to localStorage so next render is instant
    lsWrite(next);
    // Async write to IndexedDB for durability
    idbWrite(next);
    listeners.forEach((fn) => fn());
  } catch (err) {
    console.error("[store] updateData error:", err);
  }
}

/** React hook — subscribes to store changes */
export function useData(): AppData {
  const [data, setData] = useState<AppData>(currentData);

  useEffect(() => {
    // Update immediately in case store changed between render and effect
    setData(currentData);

    const onChange = () => setData({ ...currentData });
    listeners.add(onChange);

    // Cross-tab sync: if another tab writes to localStorage, pick it up
    const onStorage = (e: StorageEvent) => {
      if ((e.key === LS_PRIMARY || e.key === LS_BACKUP) && e.newValue) {
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

/** Reset to fresh default seed catalog (clears all transactions) */
export function resetData(): void {
  const seed = getSeedData();
  updateData(() => seed);
}

/** Load rich sample demonstration data */
export function loadSampleData(): void {
  updateData(() => getSampleData());
}

/** Export full state snapshot as JSON file */
export function exportBackupJSON(): void {
  const blob = new Blob([JSON.stringify(currentData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hvac-pipeline-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import state from JSON string */
export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!isValid(parsed)) throw new Error("Invalid backup format");
    updateData(() => parsed as AppData);
    return true;
  } catch (err) {
    console.error("[store] Import error:", err);
    return false;
  }
}

/** Migrate data from old localStorage keys to new keys — called once on startup */
export function migrateLegacyStorage(): void {
  const OLD_KEYS = [
    "hvac_material_pipeline_v2",
    "hvac_material_pipeline_v2_backup_safe",
    "hvac_pipeline_v1",
  ];
  for (const oldKey of OLD_KEYS) {
    try {
      const raw = localStorage.getItem(oldKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!isValid(parsed)) continue;
      // Check if primary key already has data
      const primary = localStorage.getItem(LS_PRIMARY);
      if (primary) continue; // already migrated
      console.info(`[store] Migrating data from legacy key: ${oldKey}`);
      lsWrite(parsed as AppData);
      idbWrite(parsed as AppData);
      currentData = parsed as AppData;
      listeners.forEach((fn) => fn());
      break;
    } catch {}
  }
}

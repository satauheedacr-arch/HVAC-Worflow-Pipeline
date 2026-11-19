import { useEffect, useState } from "react";
import type { AppData } from "@/types";
import { getSampleData, getSeedData } from "./defaults";

const STORAGE_KEY = "hvac_material_pipeline_v2";

// Cache in memory for instant synchronous access
let currentData: AppData = loadInitialData();
const listeners = new Set<() => void>();

function loadInitialData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.materials) && Array.isArray(parsed.sites)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load data from localStorage:", err);
  }
  // Start with clean seed data (0 dummy sites, 0 dummy purchases, 0 dummy slips)
  const initial = getSeedData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function getData(): AppData {
  return currentData;
}

export function updateData(updater: (prev: AppData) => AppData): void {
  try {
    const next = updater(currentData);
    currentData = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  } catch (err) {
    console.error("Failed to save data to localStorage:", err);
  }
}

/** React hook for subscribing to store changes */
export function useData(): AppData {
  const [data, setData] = useState<AppData>(currentData);

  useEffect(() => {
    const onChange = () => setData(currentData);
    listeners.add(onChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          currentData = JSON.parse(e.newValue);
          setData(currentData);
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

/** Reset to fresh default seed catalog (empty transactions) */
export function resetData(): void {
  const seed = getSeedData();
  updateData(() => seed);
}

/** Load rich sample demonstration data */
export function loadSampleData(): void {
  const sample = getSampleData();
  updateData(() => sample);
}

/** Export full state snapshot as JSON file */
export function exportBackupJSON(): void {
  const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `hvac-pipeline-backup-${d}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import state from JSON string */
export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.materials) || !Array.isArray(parsed.sites)) {
      throw new Error("Invalid backup JSON format");
    }
    updateData(() => parsed);
    return true;
  } catch (err) {
    console.error("Import error:", err);
    return false;
  }
}

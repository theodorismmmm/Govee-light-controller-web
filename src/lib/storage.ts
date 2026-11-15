import type { Schedule } from "./types";

const API_KEY = "openlights.goveeApiKey";
const DEMO = "openlights.demoMode";
const SCHEDULES = "openlights.schedules";
export const STORAGE_EVENT = "openlights-storage";

function notifyStorage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY, key.trim());
  localStorage.removeItem(DEMO);
  notifyStorage();
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY);
  notifyStorage();
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO) === "1";
}

export function enableDemoMode(): void {
  localStorage.setItem(DEMO, "1");
  localStorage.removeItem(API_KEY);
  notifyStorage();
}

export function clearSession(): void {
  localStorage.removeItem(API_KEY);
  localStorage.removeItem(DEMO);
  notifyStorage();
}

export function getSchedules(): Schedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCHEDULES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Schedule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSchedules(schedules: Schedule[]): void {
  localStorage.setItem(SCHEDULES, JSON.stringify(schedules));
  notifyStorage();
}

import type { ProviderId } from "./providers/types";
import type { Schedule } from "./types";

const API_KEYS = "openlights.providerKeys";
const LEGACY_API_KEY = "openlights.goveeApiKey";
const DEMO = "openlights.demoMode";
const SCHEDULES = "openlights.schedules";
export const STORAGE_EVENT = "openlights-storage";

type KeyMap = Partial<Record<ProviderId, string>>;

function notifyStorage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function readKeyMap(): KeyMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(API_KEYS);
    if (raw) {
      const parsed = JSON.parse(raw) as KeyMap;
      return parsed && typeof parsed === "object" ? parsed : {};
    }
  } catch {
    // fall through to legacy
  }
  const legacy = localStorage.getItem(LEGACY_API_KEY);
  if (legacy) return { govee: legacy };
  return {};
}

function writeKeyMap(map: KeyMap): void {
  localStorage.setItem(API_KEYS, JSON.stringify(map));
  if (map.govee) localStorage.setItem(LEGACY_API_KEY, map.govee);
  else localStorage.removeItem(LEGACY_API_KEY);
  notifyStorage();
}

export function getProviderKeys(): KeyMap {
  return readKeyMap();
}

export function getApiKey(provider: ProviderId = "govee"): string | null {
  const map = readKeyMap();
  return map[provider] ?? null;
}

export function setApiKey(provider: ProviderId, key: string): void {
  const map = readKeyMap();
  map[provider] = key.trim();
  localStorage.removeItem(DEMO);
  writeKeyMap(map);
}

export function removeApiKey(provider: ProviderId): void {
  const map = readKeyMap();
  delete map[provider];
  writeKeyMap(map);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEYS);
  localStorage.removeItem(LEGACY_API_KEY);
  notifyStorage();
}

export function connectedProviders(): ProviderId[] {
  const map = readKeyMap();
  return (Object.keys(map) as ProviderId[]).filter((id) => Boolean(map[id]));
}

export function hasAnyConnection(): boolean {
  return connectedProviders().length > 0 || isDemoMode();
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO) === "1";
}

export function enableDemoMode(): void {
  localStorage.setItem(DEMO, "1");
  localStorage.removeItem(API_KEYS);
  localStorage.removeItem(LEGACY_API_KEY);
  notifyStorage();
}

export function clearSession(): void {
  localStorage.removeItem(API_KEYS);
  localStorage.removeItem(LEGACY_API_KEY);
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

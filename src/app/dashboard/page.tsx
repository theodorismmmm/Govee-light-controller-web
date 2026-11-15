"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { DeviceDetail } from "@/components/dashboard/DeviceDetail";
import { SchedulesPanel } from "@/components/dashboard/SchedulesPanel";
import { useScheduleRunner } from "@/hooks/useScheduleRunner";
import {
  deviceKey,
  fetchDevices,
  setBrightness,
  setColor,
  setColorTemperature,
  setPower,
} from "@/lib/govee-client";
import { getPreset } from "@/lib/presets";
import {
  clearSession,
  getApiKey,
  getSchedules,
  isDemoMode,
  saveSchedules,
} from "@/lib/storage";
import { rgbToHex } from "@/lib/govee-color";
import { controlTargets } from "@/lib/groups";
import type { DeviceView, Schedule } from "@/lib/types";

type Tab = "devices" | "schedules";

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("openlights-storage", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("openlights-storage", onStoreChange);
  };
}

function getSessionSnapshot() {
  return Boolean(getApiKey()) || isDemoMode();
}

function getDemoSnapshot() {
  return isDemoMode();
}

function getSchedulesSnapshot() {
  return JSON.stringify(getSchedules());
}

export default function DashboardPage() {
  const router = useRouter();
  const hasSession = useSyncExternalStore(
    subscribeStorage,
    getSessionSnapshot,
    () => false,
  );
  const demo = useSyncExternalStore(
    subscribeStorage,
    getDemoSnapshot,
    () => false,
  );
  const schedulesJson = useSyncExternalStore(
    subscribeStorage,
    getSchedulesSnapshot,
    () => "[]",
  );
  const storedSchedules = useMemo(
    () => JSON.parse(schedulesJson) as Schedule[],
    [schedulesJson],
  );
  const [tab, setTab] = useState<Tab>("devices");
  const [devices, setDevices] = useState<DeviceView[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOverride, setScheduleOverride] = useState<Schedule[] | null>(
    null,
  );
  const schedules = scheduleOverride ?? storedSchedules;
  const [status, setStatus] = useState<string | null>(null);

  const selected = useMemo(
    () => devices.find((d) => deviceKey(d) === selectedKey) ?? null,
    [devices, selectedKey],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchDevices();
      setDevices(list);
      setSelectedKey((prev) => {
        if (prev && list.some((d) => deviceKey(d) === prev)) return prev;
        return list[0] ? deviceKey(list[0]) : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  const onScheduleRan = useCallback(() => {
    setStatus("Schedule ran");
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hasSession) {
      router.replace("/connect");
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [hasSession, router, refresh]);

  useScheduleRunner(devices, onScheduleRan);

  function updateSchedules(next: Schedule[]) {
    setScheduleOverride(next);
    saveSchedules(next);
  }

  function patchDevices(
    keys: string[],
    patch: (device: DeviceView) => DeviceView,
  ) {
    const keySet = new Set(keys);
    setDevices((prev) =>
      prev.map((d) => (keySet.has(deviceKey(d)) ? patch(d) : d)),
    );
  }

  function targetsFor(device: DeviceView): DeviceView[] {
    return controlTargets(device, devices);
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyToTargets(
    source: DeviceView,
    run: (target: DeviceView) => Promise<void>,
    patch: (device: DeviceView) => DeviceView,
  ) {
    const targets = targetsFor(source);
    const keys = [
      deviceKey(source),
      ...targets.map((t) => deviceKey(t)),
    ];
    patchDevices(keys, patch);
    await withBusy(async () => {
      const results = await Promise.allSettled(targets.map((t) => run(t)));
      const failed = results.find((r) => r.status === "rejected");
      if (failed && failed.status === "rejected") {
        throw failed.reason instanceof Error
          ? failed.reason
          : new Error("Group control failed");
      }
    });
  }

  async function togglePower(device: DeviceView) {
    const next = !device.state.power;
    await applyToTargets(
      device,
      (target) => setPower(target.sku, target.device, next),
      (d) => ({ ...d, state: { ...d.state, power: next } }),
    );
  }

  async function handleBrightness(value: number) {
    if (!selected) return;
    await applyToTargets(
      selected,
      async (target) => {
        if (!target.state.power) {
          await setPower(target.sku, target.device, true);
        }
        await setBrightness(target.sku, target.device, value);
      },
      (d) => ({
        ...d,
        state: { ...d.state, brightness: value, power: true },
      }),
    );
  }

  async function handleColor(color: { r: number; g: number; b: number }) {
    if (!selected) return;
    await applyToTargets(
      selected,
      async (target) => {
        if (!target.state.power) {
          await setPower(target.sku, target.device, true);
        }
        await setColor(target.sku, target.device, color);
      },
      (d) => ({
        ...d,
        state: { ...d.state, color, power: true },
      }),
    );
  }

  async function handleColorTem(kelvin: number) {
    if (!selected) return;
    await applyToTargets(
      selected,
      async (target) => {
        if (!target.state.power) {
          await setPower(target.sku, target.device, true);
        }
        await setColorTemperature(target.sku, target.device, kelvin);
      },
      (d) => ({
        ...d,
        state: { ...d.state, colorTem: kelvin, power: true },
      }),
    );
  }

  async function handlePreset(presetId: string) {
    if (!selected) return;
    const preset = getPreset(presetId);
    if (!preset) return;
    await applyToTargets(
      selected,
      async (target) => {
        await setPower(target.sku, target.device, true);
        await setColor(target.sku, target.device, preset.color);
        await setBrightness(target.sku, target.device, preset.brightness);
        if (preset.colorTem) {
          await setColorTemperature(
            target.sku,
            target.device,
            preset.colorTem,
          );
        }
      },
      (d) => ({
        ...d,
        state: {
          ...d.state,
          power: true,
          color: preset.color,
          brightness: preset.brightness,
          colorTem: preset.colorTem ?? d.state.colorTem,
        },
      }),
    );
  }

  function signOut() {
    clearSession();
    router.push("/");
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--fg-muted)]">
        Loading OpenLights…
      </div>
    );
  }

  const selectedHex = selected
    ? rgbToHex(selected.state.color.r, selected.state.color.g, selected.state.color.b)
    : null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div
        className="pointer-events-none fixed inset-0 opacity-80 transition-all duration-500"
        style={{
          background: selectedHex && selected?.state.power
            ? `radial-gradient(ellipse 55% 40% at 80% 20%, ${selectedHex}33, transparent 60%), radial-gradient(ellipse 50% 30% at 10% 0%, rgba(255,255,255,0.07), transparent 55%)`
            : "radial-gradient(ellipse 50% 30% at 10% 0%, rgba(255,255,255,0.07), transparent 55%), radial-gradient(ellipse 40% 25% at 90% 10%, rgba(255,255,255,0.05), transparent 50%)",
        }}
      />

      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight"
            >
              OpenLights
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {(
                [
                  ["devices", "Devices"],
                  ["schedules", "Schedules"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    tab === id
                      ? "bg-white text-black"
                      : "text-[var(--fg-muted)] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {demo ? (
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                Sample data
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void refresh()}
              className="hidden h-10 rounded-full border border-white/15 px-4 text-sm text-[var(--fg-muted)] transition hover:border-white/35 hover:text-white sm:inline-flex sm:items-center"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={signOut}
              className="h-10 rounded-full border border-white/15 px-4 text-sm text-[var(--fg-muted)] transition hover:border-white/35 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/10 px-4 py-2 sm:hidden">
          {(
            [
              ["devices", "Devices"],
              ["schedules", "Schedules"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-full py-2 text-sm ${
                tab === id ? "bg-white text-black" : "text-[var(--fg-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {(error || status) && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            {error ? (
              <span className="text-white/90">{error}</span>
            ) : (
              <span className="text-[var(--fg-muted)]">{status}</span>
            )}
          </div>
        )}

        {tab === "devices" ? (
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight">
                    Lights
                  </h1>
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    {loading
                      ? "Loading devices…"
                      : `${devices.length} connected · pick one to control`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="h-10 rounded-full border border-white/15 px-4 text-sm text-[var(--fg-muted)] sm:hidden"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                    />
                  ))}
                </div>
              ) : devices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-[var(--fg-muted)]">
                  No lights found for this API key.
                </div>
              ) : (
                <div className="space-y-6">
                  {(["groups", "lights"] as const).map((section) => {
                    const items = devices.filter((d) =>
                      section === "groups"
                        ? d.kind === "sameModeGroup" ||
                          d.kind === "baseGroup" ||
                          d.kind === "modelGroup"
                        : d.kind === "device" || !d.kind,
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={section}>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
                          {section === "groups" ? "Groups" : "Individual lights"}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {items.map((device) => {
                            const key = deviceKey(device);
                            return (
                              <DeviceCard
                                key={key}
                                device={device}
                                selected={selectedKey === key}
                                onSelect={() => setSelectedKey(key)}
                                onTogglePower={() => void togglePower(device)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <DeviceDetail
                device={selected}
                busy={busy}
                onPower={(on) => {
                  if (!selected) return;
                  void applyToTargets(
                    selected,
                    (target) => setPower(target.sku, target.device, on),
                    (d) => ({
                      ...d,
                      state: { ...d.state, power: on },
                    }),
                  );
                }}
                onBrightness={(v) => void handleBrightness(v)}
                onColor={(c) => void handleColor(c)}
                onColorTem={(k) => void handleColorTem(k)}
                onPreset={(id) => void handlePreset(id)}
              />
            </section>
          </div>
        ) : (
          <SchedulesPanel
            devices={devices}
            schedules={schedules}
            onChange={updateSchedules}
          />
        )}
      </main>
    </div>
  );
}

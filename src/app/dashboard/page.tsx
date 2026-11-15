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
import { rgbToHex } from "@/lib/govee-color";
import { controlTargets } from "@/lib/groups";
import {
  deviceKey,
  fetchDevices,
  setBrightness,
  setColor,
  setColorTemperature,
  setPower,
} from "@/lib/lights-client";
import { getPreset } from "@/lib/presets";
import { PROVIDERS, type ProviderId } from "@/lib/providers/types";
import {
  clearSession,
  connectedProviders,
  getApiKey,
  getSchedules,
  hasAnyConnection,
  isDemoMode,
  saveSchedules,
} from "@/lib/storage";
import type { DeviceView, Schedule } from "@/lib/types";

type Tab = "overview" | "schedules";
type Filter = "all" | ProviderId | "groups";

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("openlights-storage", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("openlights-storage", onStoreChange);
  };
}

function getSessionSnapshot() {
  return hasAnyConnection();
}

function getDemoSnapshot() {
  return isDemoMode();
}

function getSchedulesSnapshot() {
  return JSON.stringify(getSchedules());
}

function getProvidersSnapshot() {
  return connectedProviders().join(",");
}

function kindLabel(device: DeviceView): string {
  if (
    device.kind === "sameModeGroup" ||
    device.kind === "baseGroup" ||
    device.kind === "modelGroup"
  ) {
    return "groups";
  }
  return "lights";
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
  const providersCsv = useSyncExternalStore(
    subscribeStorage,
    getProvidersSnapshot,
    () => "",
  );
  const storedSchedules = useMemo(
    () => JSON.parse(schedulesJson) as Schedule[],
    [schedulesJson],
  );
  const linkedProviders = useMemo(
    () =>
      (providersCsv ? providersCsv.split(",") : []) as ProviderId[],
    [providersCsv],
  );

  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState<Filter>("all");
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
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => devices.find((d) => deviceKey(d) === selectedKey) ?? null,
    [devices, selectedKey],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((d) => {
      if (filter === "groups") {
        if (kindLabel(d) !== "groups") return false;
      } else if (filter !== "all") {
        if ((d.provider ?? "govee") !== filter) return false;
        if (kindLabel(d) === "groups" && d.kind === "modelGroup") {
          // keep model groups for that provider
        }
      }
      if (!q) return true;
      return (
        d.deviceName.toLowerCase().includes(q) ||
        d.sku.toLowerCase().includes(q) ||
        (d.provider ?? "").toLowerCase().includes(q)
      );
    });
  }, [devices, filter, query]);

  const litCount = devices.filter(
    (d) => d.kind === "device" && d.state.power,
  ).length;
  const lightCount = devices.filter((d) => d.kind === "device" || !d.kind)
    .length;

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
    const keys = [deviceKey(source), ...targets.map((t) => deviceKey(t))];
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
      (target) =>
        setPower(target.sku, target.device, next, target.provider ?? "govee"),
      (d) => ({ ...d, state: { ...d.state, power: next } }),
    );
  }

  async function handleBrightness(value: number) {
    if (!selected) return;
    await applyToTargets(
      selected,
      async (target) => {
        const provider = target.provider ?? "govee";
        if (!target.state.power) {
          await setPower(target.sku, target.device, true, provider);
        }
        await setBrightness(target.sku, target.device, value, provider);
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
        const provider = target.provider ?? "govee";
        if (!target.state.power) {
          await setPower(target.sku, target.device, true, provider);
        }
        await setColor(target.sku, target.device, color, provider);
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
        const provider = target.provider ?? "govee";
        if (!target.state.power) {
          await setPower(target.sku, target.device, true, provider);
        }
        await setColorTemperature(target.sku, target.device, kelvin, provider);
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
        const provider = target.provider ?? "govee";
        await setPower(target.sku, target.device, true, provider);
        await setColor(target.sku, target.device, preset.color, provider);
        await setBrightness(
          target.sku,
          target.device,
          preset.brightness,
          provider,
        );
        if (preset.colorTem) {
          await setColorTemperature(
            target.sku,
            target.device,
            preset.colorTem,
            provider,
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
    ? rgbToHex(
        selected.state.color.r,
        selected.state.color.g,
        selected.state.color.b,
      )
    : null;

  const filterOptions: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    ...PROVIDERS.filter(
      (p) => demo || linkedProviders.includes(p.id) || getApiKey(p.id),
    ).map((p) => ({ id: p.id as Filter, label: p.shortName })),
    { id: "groups", label: "Groups" },
  ];

  const groupedSections = (
    [
      ["groups", "Groups"],
      ["lights", "Lights"],
    ] as const
  )
    .map(([section, label]) => ({
      section,
      label,
      items: filtered.filter((d) => kindLabel(d) === section),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div
        className="pointer-events-none fixed inset-0 opacity-80 transition-all duration-500"
        style={{
          background:
            selectedHex && selected?.state.power
              ? `radial-gradient(ellipse 50% 35% at 85% 15%, ${selectedHex}28, transparent 60%), radial-gradient(ellipse 40% 25% at 8% 0%, rgba(255,255,255,0.06), transparent 55%)`
              : "radial-gradient(ellipse 40% 25% at 8% 0%, rgba(255,255,255,0.06), transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-black/30 px-4 py-5 backdrop-blur-md lg:flex">
          <Link
            href="/"
            className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight"
          >
            OpenLights
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--fg-dim)]">
            Control room
          </p>

          <nav className="mt-8 space-y-1">
            {(
              [
                ["overview", "Overview"],
                ["schedules", "Schedules"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  tab === id
                    ? "bg-white text-black"
                    : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-dim)]">
              Session
            </div>
            <div className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
              {demo ? (
                <div>Sample data</div>
              ) : linkedProviders.length > 0 ? (
                linkedProviders.map((id) => (
                  <div key={id}>
                    {PROVIDERS.find((p) => p.id === id)?.name ?? id}
                  </div>
                ))
              ) : (
                <div>Connected</div>
              )}
            </div>
            <Link
              href="/connect?add=1"
              className="mt-4 inline-block text-xs text-[var(--fg-dim)] underline-offset-4 hover:text-white hover:underline"
            >
              Add provider
            </Link>
          </div>

          <div className="mt-auto space-y-2 pt-8">
            <button
              type="button"
              onClick={() => void refresh()}
              className="flex h-10 w-full items-center justify-center rounded-full border border-white/15 text-sm text-[var(--fg-muted)] transition hover:border-white/35 hover:text-white"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={signOut}
              className="flex h-10 w-full items-center justify-center rounded-full border border-white/15 text-sm text-[var(--fg-muted)] transition hover:border-white/35 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-black/40 px-4 py-4 backdrop-blur-md md:px-6">
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <Link
                href="/"
                className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight"
              >
                OpenLights
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="h-9 rounded-full border border-white/15 px-3 text-sm text-[var(--fg-muted)]"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="h-9 rounded-full border border-white/15 px-3 text-sm text-[var(--fg-muted)]"
                >
                  Exit
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 lg:pt-0">
              <div className={tab === "overview" ? "lg:pt-1" : "pt-1"}>
                <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight md:text-3xl">
                  {tab === "overview" ? "Overview" : "Schedules"}
                </h1>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  {loading
                    ? "Loading devices…"
                    : tab === "overview"
                      ? `${lightCount} lights · ${litCount} on`
                      : `${schedules.length} scheduled actions`}
                </p>
              </div>
              {demo ? (
                <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                  Sample data
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2 lg:hidden">
              {(
                [
                  ["overview", "Overview"],
                  ["schedules", "Schedules"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-full py-2 text-sm ${
                    tab === id
                      ? "bg-white text-black"
                      : "border border-white/10 text-[var(--fg-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
            {(error || status) && (
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                {error ? (
                  <span className="text-white/90">{error}</span>
                ) : (
                  <span className="text-[var(--fg-muted)]">{status}</span>
                )}
              </div>
            )}

            {tab === "overview" ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.2fr)] xl:items-start">
                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-elevated)]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {filterOptions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFilter(item.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            filter === item.id
                              ? "bg-white text-black"
                              : "text-[var(--fg-muted)] hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <label className="mt-3 block">
                      <span className="sr-only">Search lights</span>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search lights…"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                      />
                    </label>
                  </div>

                  {loading ? (
                    <div className="space-y-0 p-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="mx-2 my-2 h-14 animate-pulse rounded-xl bg-white/[0.04]"
                        />
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-[var(--fg-muted)]">
                      No lights match this view.
                    </div>
                  ) : (
                    <div className="max-h-[min(70vh,720px)] overflow-y-auto scroll-thin">
                      {groupedSections.map(({ section, label, items }) => (
                        <div key={section}>
                          <div className="sticky top-0 z-[1] border-b border-white/[0.06] bg-[var(--bg-elevated)]/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-dim)] backdrop-blur-sm">
                            {label}
                            <span className="ml-2 tabular-nums text-white/35">
                              {items.length}
                            </span>
                          </div>
                          {items.map((device) => {
                            const key = deviceKey(device);
                            return (
                              <DeviceCard
                                key={key}
                                device={device}
                                selected={selectedKey === key}
                                onSelect={() => setSelectedKey(key)}
                                onTogglePower={() => void togglePower(device)}
                                compact
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="min-w-0">
                  <DeviceDetail
                    device={selected}
                    busy={busy}
                    onPower={(on) => {
                      if (!selected) return;
                      void applyToTargets(
                        selected,
                        (target) =>
                          setPower(
                            target.sku,
                            target.device,
                            on,
                            target.provider ?? "govee",
                          ),
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
      </div>
    </div>
  );
}

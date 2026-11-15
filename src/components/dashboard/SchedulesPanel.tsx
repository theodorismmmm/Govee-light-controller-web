"use client";

import { FormEvent, useMemo, useState } from "react";
import { PRESETS } from "@/lib/presets";
import type { DeviceView, Schedule, ScheduleAction } from "@/lib/types";
import { deviceKey } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  devices: DeviceView[];
  schedules: Schedule[];
  onChange: (schedules: Schedule[]) => void;
};

export function SchedulesPanel({ devices, schedules, onChange }: Props) {
  const [name, setName] = useState("Evening on");
  const [time, setTime] = useState("20:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [deviceKeys, setDeviceKeys] = useState<string[]>([]);
  const [actionKind, setActionKind] = useState<ScheduleAction["kind"]>("power");
  const [powerOn, setPowerOn] = useState(true);
  const [brightness, setBrightness] = useState(70);
  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? "warm-white");
  const [color, setColor] = useState("#ffb347");

  const allKeys = useMemo(
    () => devices.map((d) => deviceKey(d)),
    [devices],
  );

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function toggleDevice(key: string) {
    setDeviceKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function buildAction(): ScheduleAction {
    if (actionKind === "power") return { kind: "power", value: powerOn };
    if (actionKind === "brightness") {
      return { kind: "brightness", value: brightness };
    }
    if (actionKind === "preset") return { kind: "preset", presetId };
    const cleaned = color.replace("#", "");
    const n = Number.parseInt(cleaned, 16);
    return {
      kind: "color",
      value: {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
      },
    };
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || days.length === 0 || !time) return;
    const schedule: Schedule = {
      id: crypto.randomUUID(),
      name: name.trim(),
      time,
      days: [...days],
      deviceKeys: deviceKeys.length ? deviceKeys : allKeys,
      action: buildAction(),
      enabled: true,
    };
    onChange([schedule, ...schedules]);
    setName("New schedule");
  }

  function describeAction(action: ScheduleAction): string {
    if (action.kind === "power") return action.value ? "Turn on" : "Turn off";
    if (action.kind === "brightness") return `Brightness ${action.value}%`;
    if (action.kind === "preset") {
      return `Preset ${PRESETS.find((p) => p.id === action.presetId)?.name ?? action.presetId}`;
    }
    return `Color #${[action.value.r, action.value.g, action.value.b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)] p-5 md:p-6"
      >
        <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight">
          New schedule
        </h2>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Schedules run in this browser while OpenLights is open.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 outline-none focus:border-white/40"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Time
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 outline-none focus:border-white/40"
            />
          </label>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Days
            </div>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, index) => {
                const active = days.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`h-10 min-w-12 rounded-full px-3 text-sm transition ${
                      active
                        ? "bg-white text-black"
                        : "border border-white/15 text-[var(--fg-muted)] hover:border-white/35"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Lights
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDeviceKeys([])}
                className={`h-10 rounded-full px-4 text-sm transition ${
                  deviceKeys.length === 0
                    ? "bg-white text-black"
                    : "border border-white/15 text-[var(--fg-muted)]"
                }`}
              >
                All lights
              </button>
              {devices.map((device) => {
                const key = deviceKey(device);
                const active = deviceKeys.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDevice(key)}
                    className={`h-10 rounded-full px-4 text-sm transition ${
                      active
                        ? "bg-white text-black"
                        : "border border-white/15 text-[var(--fg-muted)]"
                    }`}
                  >
                    {device.deviceName || device.sku}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Action
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["power", "Power"],
                  ["brightness", "Brightness"],
                  ["color", "Color"],
                  ["preset", "Preset"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActionKind(kind)}
                  className={`h-10 rounded-full px-4 text-sm transition ${
                    actionKind === kind
                      ? "bg-white text-black"
                      : "border border-white/15 text-[var(--fg-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {actionKind === "power" ? (
                <button
                  type="button"
                  onClick={() => setPowerOn((v) => !v)}
                  className="h-11 rounded-full border border-white/15 px-5 text-sm"
                >
                  {powerOn ? "Turn lights on" : "Turn lights off"}
                </button>
              ) : null}
              {actionKind === "brightness" ? (
                <div className="flex items-center gap-4">
                  <input
                    className="slider"
                    type="range"
                    min={1}
                    max={100}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                  />
                  <span className="w-12 tabular-nums text-sm">{brightness}%</span>
                </div>
              ) : null}
              {actionKind === "color" ? (
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-12 w-20 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
              ) : null}
              {actionKind === "preset" ? (
                <select
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                  className="h-11 rounded-xl border border-white/15 bg-[var(--bg)] px-3"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-full bg-white font-semibold text-black transition hover:bg-zinc-200"
          >
            Add schedule
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)] p-5 md:p-6">
        <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight">
          Active schedules
        </h2>
        <div className="mt-6 space-y-3">
          {schedules.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">
              No schedules yet. Create one to automate your lights.
            </p>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{schedule.name}</div>
                    <div className="mt-1 text-sm text-[var(--fg-muted)]">
                      {schedule.time} ·{" "}
                      {schedule.days.map((d) => DAY_LABELS[d]).join(" ")}
                    </div>
                    <div className="mt-1 text-xs text-[var(--fg-dim)]">
                      {describeAction(schedule.action)} ·{" "}
                      {schedule.deviceKeys.length === allKeys.length ||
                      schedule.deviceKeys.length === 0
                        ? "All lights"
                        : `${schedule.deviceKeys.length} lights`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          schedules.map((s) =>
                            s.id === schedule.id
                              ? { ...s, enabled: !s.enabled }
                              : s,
                          ),
                        )
                      }
                      className={`h-9 rounded-full px-3 text-xs font-semibold ${
                        schedule.enabled
                          ? "bg-white text-black"
                          : "border border-white/15 text-[var(--fg-muted)]"
                      }`}
                    >
                      {schedule.enabled ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(schedules.filter((s) => s.id !== schedule.id))
                      }
                      className="h-9 rounded-full border border-white/15 px-3 text-xs text-[var(--fg-muted)] hover:border-white/35"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

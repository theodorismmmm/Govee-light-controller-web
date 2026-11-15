"use client";

import { rgbToHex } from "@/lib/govee-color";
import type { DeviceView } from "@/lib/types";

type Props = {
  device: DeviceView;
  selected: boolean;
  onSelect: () => void;
  onTogglePower: () => void;
};

export function DeviceCard({
  device,
  selected,
  onSelect,
  onTogglePower,
}: Props) {
  const { state } = device;
  const hex = rgbToHex(state.color.r, state.color.g, state.color.b);
  const glow = state.power
    ? `0 0 28px ${hex}55, inset 0 0 0 1px rgba(255,255,255,0.08)`
    : "inset 0 0 0 1px rgba(255,255,255,0.06)";
  const isGroup =
    device.kind === "sameModeGroup" ||
    device.kind === "baseGroup" ||
    device.kind === "modelGroup";
  const meta =
    device.kind === "sameModeGroup"
      ? "Same model group"
      : device.kind === "baseGroup"
        ? "Basic group"
        : device.kind === "modelGroup"
          ? `${device.memberCount ?? 0} lights · ${device.sku}`
          : `${device.sku} · ${state.online ? "Online" : "Offline"}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`device-glow relative cursor-pointer overflow-hidden rounded-2xl border bg-[var(--bg-elevated)] p-4 text-left ${
        selected ? "border-white/40" : "border-white/10"
      }`}
      style={{ boxShadow: selected ? glow : undefined }}
      aria-pressed={selected}
      aria-label={`Select ${device.deviceName}`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate font-semibold tracking-tight">
              {device.deviceName || device.sku}
            </div>
            {isGroup ? (
              <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--fg-dim)]">
                Group
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-[var(--fg-dim)]">{meta}</div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePower();
          }}
          className={`relative h-10 w-10 shrink-0 rounded-full border transition ${
            state.power
              ? "border-white bg-white text-black"
              : "border-white/20 bg-transparent text-white/70 hover:border-white/40"
          }`}
          aria-pressed={state.power}
          aria-label={state.power ? "Turn off" : "Turn on"}
        >
          <span
            className="absolute inset-[7px] rounded-full border-2"
            style={{
              borderColor: state.power ? "#09090b" : "currentColor",
            }}
          />
        </button>
      </div>

      <div className="relative z-10 mt-5 flex items-end justify-between">
        <div
          className="h-10 w-10 rounded-full border border-white/15 transition"
          style={{
            background: state.power ? hex : "#1a1a1c",
            boxShadow: state.power ? `0 0 18px ${hex}88` : undefined,
            opacity: state.power ? 0.2 + state.brightness / 125 : 0.35,
          }}
        />
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {state.brightness}
            <span className="ml-0.5 text-sm font-medium text-[var(--fg-dim)]">
              %
            </span>
          </div>
          <div className="text-xs uppercase tracking-[0.14em] text-[var(--fg-dim)]">
            Brightness
          </div>
        </div>
      </div>
    </div>
  );
}

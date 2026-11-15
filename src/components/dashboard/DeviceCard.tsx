"use client";

import { rgbToHex } from "@/lib/govee-color";
import { getProvider } from "@/lib/providers/types";
import type { DeviceView } from "@/lib/types";

type Props = {
  device: DeviceView;
  selected: boolean;
  onSelect: () => void;
  onTogglePower: () => void;
  compact?: boolean;
};

export function DeviceCard({
  device,
  selected,
  onSelect,
  onTogglePower,
  compact = false,
}: Props) {
  const { state } = device;
  const hex = rgbToHex(state.color.r, state.color.g, state.color.b);
  const isGroup =
    device.kind === "sameModeGroup" ||
    device.kind === "baseGroup" ||
    device.kind === "modelGroup";
  const provider = getProvider(device.provider ?? "govee");
  const meta =
    device.kind === "sameModeGroup"
      ? "Same model group"
      : device.kind === "baseGroup"
        ? "Basic group"
        : device.kind === "modelGroup"
          ? `${device.memberCount ?? 0} lights`
          : state.online
            ? "Online"
            : "Offline";

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
      className={`group relative flex cursor-pointer items-center gap-3 border-b border-white/[0.06] px-3 transition ${
        compact ? "py-2.5" : "py-3.5"
      } ${
        selected
          ? "bg-white/[0.07]"
          : "hover:bg-white/[0.03]"
      }`}
      aria-pressed={selected}
      aria-label={`Select ${device.deviceName}`}
    >
      {selected ? (
        <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-white" />
      ) : null}

      <div
        className="h-9 w-9 shrink-0 rounded-full border border-white/12"
        style={{
          background: state.power ? hex : "#1a1a1c",
          boxShadow: state.power ? `0 0 14px ${hex}66` : undefined,
          opacity: state.power ? 0.25 + state.brightness / 140 : 0.4,
        }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold tracking-tight">
            {device.deviceName || device.sku}
          </div>
          {isGroup ? (
            <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--fg-dim)]">
              Group
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-dim)]">
          <span>{provider.shortName}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{meta}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{state.brightness}%</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePower();
        }}
        className={`relative h-9 w-9 shrink-0 rounded-full border transition ${
          state.power
            ? "border-white bg-white text-black"
            : "border-white/20 bg-transparent text-white/70 hover:border-white/40"
        }`}
        aria-pressed={state.power}
        aria-label={state.power ? "Turn off" : "Turn on"}
      >
        <span
          className="absolute inset-[6px] rounded-full border-2"
          style={{
            borderColor: state.power ? "#09090b" : "currentColor",
          }}
        />
      </button>
    </div>
  );
}

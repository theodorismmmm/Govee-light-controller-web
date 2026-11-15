"use client";

import { useState } from "react";
import { ColorControls } from "./ColorControls";
import { kelvinToRgb, rgbToHex } from "@/lib/govee-color";
import { getProvider } from "@/lib/providers/types";
import { PRESETS } from "@/lib/presets";
import type { DeviceView } from "@/lib/types";
import { deviceKey } from "@/lib/types";

type Props = {
  device: DeviceView | null;
  busy: boolean;
  onPower: (on: boolean) => void;
  onBrightness: (value: number) => void;
  onColor: (color: { r: number; g: number; b: number }) => void;
  onColorTem: (kelvin: number) => void;
  onPreset: (presetId: string) => void;
};

type Panel = "color" | "white" | "presets";

function hasCap(device: DeviceView, instance: string): boolean {
  return (
    !device.capabilities ||
    device.capabilities.some((c) => c.instance === instance)
  );
}

function DeviceDetailInner({
  device,
  busy,
  onPower,
  onBrightness,
  onColor,
  onColorTem,
  onPreset,
}: Props & { device: DeviceView }) {
  const [dragBrightness, setDragBrightness] = useState<number | null>(null);
  const [dragTem, setDragTem] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>("color");
  const [wheelReset, setWheelReset] = useState(0);

  const brightness = dragBrightness ?? device.state.brightness;
  const colorTem = dragTem ?? device.state.colorTem ?? 4000;
  const supportsColor = hasCap(device, "colorRgb");
  const supportsTem = hasCap(device, "colorTemperatureK");
  const hex = rgbToHex(
    device.state.color.r,
    device.state.color.g,
    device.state.color.b,
  );

  const panels: Array<{ id: Panel; label: string; show: boolean }> = [
    { id: "color", label: "Color", show: supportsColor },
    { id: "white", label: "White", show: supportsTem },
    { id: "presets", label: "Presets", show: true },
  ];
  const visiblePanels = panels.filter((p) => p.show);
  const activePanel = visiblePanels.some((p) => p.id === panel)
    ? panel
    : (visiblePanels[0]?.id ?? "presets");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-elevated)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{
          background: device.state.power
            ? `radial-gradient(ellipse 70% 100% at 50% 0%, ${hex}55, transparent 70%)`
            : "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,255,255,0.06), transparent 70%)",
        }}
      />

      <div className="relative p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: device.state.power ? hex : "#3f3f46",
                  boxShadow: device.state.power ? `0 0 12px ${hex}` : undefined,
                }}
              />
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--fg-dim)]">
                {device.state.online ? "Online" : "Offline"}
                {device.state.power ? " · Lit" : " · Off"}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight md:text-3xl">
              {device.deviceName || device.sku}
            </h2>
            <p className="mt-1 truncate text-sm text-[var(--fg-dim)]">
              {getProvider(device.provider ?? "govee").name}
              {" · "}
              {device.kind === "sameModeGroup"
                ? "Same model group · controls linked lights together"
                : device.kind === "baseGroup"
                  ? "Basic group · power, brightness, and color"
                  : device.kind === "modelGroup"
                    ? `Same model · ${device.memberCount ?? 0} lights · ${device.sku}`
                    : `${device.sku}`}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onPower(!device.state.power)}
            className={`h-12 min-w-28 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50 ${
              device.state.power
                ? "bg-white text-black hover:bg-zinc-200"
                : "border border-white/20 text-white hover:border-white/40"
            }`}
          >
            {device.state.power ? "Turn off" : "Turn on"}
          </button>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Brightness
            </div>
            <div className="tabular-nums text-sm text-[var(--fg-muted)]">
              {brightness}%
            </div>
          </div>
          <input
            className="slider"
            type="range"
            min={1}
            max={100}
            value={brightness}
            disabled={busy || !device.state.power}
            onChange={(e) => setDragBrightness(Number(e.target.value))}
            onMouseUp={() => {
              if (dragBrightness !== null) onBrightness(dragBrightness);
              setDragBrightness(null);
            }}
            onTouchEnd={() => {
              if (dragBrightness !== null) onBrightness(dragBrightness);
              setDragBrightness(null);
            }}
            onKeyUp={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                onBrightness(Number((e.target as HTMLInputElement).value));
                setDragBrightness(null);
              }
            }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Light controls"
          className="relative z-20 mt-8 flex gap-1 rounded-full border border-white/10 bg-black/30 p-1"
          onKeyDown={(e) => {
            const keys = ["ArrowLeft", "ArrowRight", "Home", "End"] as const;
            if (!keys.includes(e.key as (typeof keys)[number])) return;
            e.preventDefault();
            const index = visiblePanels.findIndex((p) => p.id === activePanel);
            if (index < 0) return;
            let next = index;
            if (e.key === "ArrowRight") next = (index + 1) % visiblePanels.length;
            if (e.key === "ArrowLeft") {
              next = (index - 1 + visiblePanels.length) % visiblePanels.length;
            }
            if (e.key === "Home") next = 0;
            if (e.key === "End") next = visiblePanels.length - 1;
            const nextId = visiblePanels[next]?.id;
            if (!nextId) return;
            setPanel(nextId);
            queueMicrotask(() => {
              document.getElementById(`tab-${nextId}`)?.focus();
            });
          }}
        >
          {visiblePanels.map((item) => {
            const selected = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setPanel(item.id)}
                className={`relative z-20 flex-1 rounded-full py-2.5 text-sm font-medium transition ${
                  selected
                    ? "bg-white text-black"
                    : "text-[var(--fg-muted)] hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="relative z-10 mt-6 min-h-[360px] overflow-hidden">
          {activePanel === "color" && supportsColor ? (
            <div
              role="tabpanel"
              id="panel-color"
              aria-labelledby="tab-color"
            >
              <ColorControls
                color={device.state.color}
                disabled={busy || !device.state.power}
                onChange={onColor}
                resetToken={`${deviceKey(device)}-${wheelReset}`}
              />
            </div>
          ) : null}

          {activePanel === "white" && supportsTem ? (
            <div
              role="tabpanel"
              id="panel-white"
              aria-labelledby="tab-white"
              className="space-y-6"
            >
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
                  Color temperature
                </div>
                <p className="text-sm text-[var(--fg-muted)]">
                  Warm amber through daylight to cool white
                </p>
              </div>
              <div
                className="mx-auto h-28 w-28 rounded-full border border-white/15"
                style={{
                  background: `rgb(${kelvinToRgb(colorTem).r}, ${kelvinToRgb(colorTem).g}, ${kelvinToRgb(colorTem).b})`,
                  boxShadow: `0 0 40px rgba(${kelvinToRgb(colorTem).r}, ${kelvinToRgb(colorTem).g}, ${kelvinToRgb(colorTem).b}, 0.35)`,
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                  Warm
                </span>
                <span className="tabular-nums text-sm text-[var(--fg-muted)]">
                  {colorTem}K
                </span>
                <span className="text-xs uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                  Cool
                </span>
              </div>
              <input
                className="slider"
                type="range"
                min={2000}
                max={9000}
                step={100}
                value={colorTem}
                disabled={busy || !device.state.power}
                onChange={(e) => setDragTem(Number(e.target.value))}
                onMouseUp={() => {
                  const value = dragTem ?? colorTem;
                  onColorTem(value);
                  onColor(kelvinToRgb(value));
                  setWheelReset((n) => n + 1);
                  setDragTem(null);
                }}
                onTouchEnd={() => {
                  const value = dragTem ?? colorTem;
                  onColorTem(value);
                  onColor(kelvinToRgb(value));
                  setWheelReset((n) => n + 1);
                  setDragTem(null);
                }}
              />
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Candle", k: 2200 },
                  { label: "Warm", k: 3000 },
                  { label: "Neutral", k: 4000 },
                  { label: "Day", k: 5000 },
                  { label: "Cool", k: 6500 },
                  { label: "Blue sky", k: 8000 },
                ].map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    disabled={busy || !device.state.power}
                    onClick={() => {
                      onColorTem(item.k);
                      onColor(kelvinToRgb(item.k));
                      setWheelReset((n) => n + 1);
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-white/30 disabled:opacity-50"
                  >
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs text-[var(--fg-dim)]">
                      {item.k}K
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activePanel === "presets" ? (
            <div
              role="tabpanel"
              id="panel-presets"
              aria-labelledby="tab-presets"
              className="grid grid-cols-2 gap-2 sm:grid-cols-2"
            >
              {PRESETS.map((preset) => {
                const bg = `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})`;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onPreset(preset.id);
                      setWheelReset((n) => n + 1);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/30 hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    <span
                      className="mb-4 block h-2.5 w-full rounded-full"
                      style={{
                        background: bg,
                        boxShadow: `0 0 18px ${bg}`,
                      }}
                    />
                    <span className="block text-sm font-medium">
                      {preset.name}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--fg-dim)]">
                      {preset.description}
                    </span>
                    <span className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                      {preset.brightness}% brightness
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DeviceDetail(props: Props) {
  if (!props.device) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-[var(--fg-muted)]">
        Select a light to open the control panel.
      </div>
    );
  }

  return (
    <DeviceDetailInner
      {...props}
      device={props.device}
      key={deviceKey(props.device)}
    />
  );
}

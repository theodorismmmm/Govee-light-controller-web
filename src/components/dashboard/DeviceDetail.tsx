"use client";

import { useState } from "react";
import { ColorControls } from "./ColorControls";
import { kelvinToRgb } from "@/lib/govee-color";
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

  const brightness = dragBrightness ?? device.state.brightness;
  const colorTem = dragTem ?? device.state.colorTem ?? 4000;
  const supportsColor = hasCap(device, "colorRgb");
  const supportsTem = hasCap(device, "colorTemperatureK");

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight">
            {device.deviceName || device.sku}
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-dim)]">
            {device.sku} · {device.device}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPower(!device.state.power)}
          className={`h-11 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50 ${
            device.state.power
              ? "bg-white text-black hover:bg-zinc-200"
              : "border border-white/20 text-white hover:border-white/40"
          }`}
        >
          {device.state.power ? "Turn off" : "Turn on"}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        <div>
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

        {supportsColor ? (
          <ColorControls
            color={device.state.color}
            disabled={busy || !device.state.power}
            onChange={onColor}
          />
        ) : null}

        {supportsTem ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
                Color temperature
              </div>
              <div className="tabular-nums text-sm text-[var(--fg-muted)]">
                {colorTem}K
              </div>
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
                setDragTem(null);
              }}
              onTouchEnd={() => {
                const value = dragTem ?? colorTem;
                onColorTem(value);
                onColor(kelvinToRgb(value));
                setDragTem(null);
              }}
            />
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--fg-dim)]">
              <span>Warm</span>
              <span>Cool</span>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
            Presets
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((preset) => {
              const bg = `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})`;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onPreset(preset.id)}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/30 hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <span
                    className="mb-3 block h-2 w-full rounded-full"
                    style={{ background: bg }}
                  />
                  <span className="block text-sm font-medium">{preset.name}</span>
                  <span className="mt-1 block text-xs text-[var(--fg-dim)]">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeviceDetail(props: Props) {
  if (!props.device) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-[var(--fg-muted)]">
        Select a light to adjust color, brightness, and presets.
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

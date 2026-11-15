"use client";

import { useState } from "react";
import { ColorWheel } from "./ColorWheel";
import { hexToRgb, rgbToHex } from "@/lib/govee-color";

const SWATCHES = [
  "#ffffff",
  "#fff2d6",
  "#ffd29a",
  "#ffb347",
  "#ff7a45",
  "#ff3b30",
  "#ff2d95",
  "#c084fc",
  "#7c5cff",
  "#3b82f6",
  "#22d3ee",
  "#34d399",
  "#a3e635",
  "#facc15",
  "#78716c",
  "#111111",
];

type Props = {
  color: { r: number; g: number; b: number };
  onChange: (color: { r: number; g: number; b: number }) => void;
  disabled?: boolean;
  resetToken?: string;
};

export function ColorControls({
  color,
  onChange,
  disabled,
  resetToken = "",
}: Props) {
  const hex = rgbToHex(color.r, color.g, color.b);
  const [localToken, setLocalToken] = useState(0);
  const wheelKey = `${resetToken}-${localToken}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
            Color wheel
          </div>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Drag to set hue and saturation
          </p>
        </div>
        <label className="relative h-11 w-11 overflow-hidden rounded-full border border-white/20">
          <span className="absolute inset-0" style={{ background: hex }} />
          <input
            type="color"
            value={hex}
            disabled={disabled}
            onChange={(e) => {
              onChange(hexToRgb(e.target.value));
              setLocalToken((n) => n + 1);
            }}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label="Pick exact color"
          />
        </label>
      </div>

      <ColorWheel
        key={wheelKey}
        color={color}
        onChange={onChange}
        disabled={disabled}
        size={268}
      />

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
          Quick colors
        </div>
        <div className="color-wheel-grid">
          {SWATCHES.map((swatch) => {
            const active = swatch.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={swatch}
                type="button"
                disabled={disabled}
                aria-label={`Set color ${swatch}`}
                onClick={() => {
                  onChange(hexToRgb(swatch));
                  setLocalToken((n) => n + 1);
                }}
                className={`aspect-square rounded-full border transition ${
                  active
                    ? "scale-110 border-white"
                    : "border-white/20 hover:border-white/50"
                } disabled:opacity-40`}
                style={{ background: swatch }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { hsvToRgb, rgbToHex, rgbToHsv } from "@/lib/govee-color";

type Props = {
  color: { r: number; g: number; b: number };
  onChange: (color: { r: number; g: number; b: number }) => void;
  disabled?: boolean;
  size?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ColorWheel({
  color,
  onChange,
  disabled = false,
  size = 280,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const discRef = useRef<HTMLCanvasElement | null>(null);
  const dragging = useRef(false);
  const [hsv, setHsv] = useState(() => rgbToHsv(color.r, color.g, color.b));

  useEffect(() => {
    const disc = document.createElement("canvas");
    disc.width = size;
    disc.height = size;
    const ctx = disc.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 2;
    const image = ctx.createImageData(size, size);
    const data = image.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * size + x) * 4;
        if (dist > radius) {
          data[i + 3] = 0;
          continue;
        }
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (angle < 0) angle += 360;
        const sat = dist / radius;
        const rgb = hsvToRgb(angle, sat, 1);
        data[i] = rgb.r;
        data[i + 1] = rgb.g;
        data[i + 2] = rgb.b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    discRef.current = disc;
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const disc = discRef.current;
    if (!canvas || !disc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(disc, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 2;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const markerAngle = (hsv.h * Math.PI) / 180;
    const markerR = hsv.s * radius;
    const mx = cx + Math.cos(markerAngle) * markerR;
    const my = cy + Math.sin(markerAngle) * markerR;
    const markerRgb = hsvToRgb(hsv.h, hsv.s, 1);
    const markerColor = rgbToHex(markerRgb.r, markerRgb.g, markerRgb.b);

    ctx.beginPath();
    ctx.arc(mx, my, 11, 0, Math.PI * 2);
    ctx.fillStyle = markerColor;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();
  }, [hsv.h, hsv.s, size]);

  function pointToHsv(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const radius = rect.width / 2 - 2;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const sat = clamp(Math.sqrt(dx * dx + dy * dy) / radius, 0, 1);
    return { h: angle, s: sat, v: 1 };
  }

  function emit(next: { h: number; s: number; v: number }, commit: boolean) {
    setHsv(next);
    if (commit) onChange(hsvToRgb(next.h, next.s, next.v));
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = pointToHsv(e.clientX, e.clientY);
    if (next) emit(next, false);
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!dragging.current || disabled) return;
    const next = pointToHsv(e.clientX, e.clientY);
    if (next) emit(next, false);
  }

  function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    const next = pointToHsv(e.clientX, e.clientY) ?? hsv;
    emit(next, true);
  }

  const preview = hsvToRgb(hsv.h, hsv.s, 1);
  const hex = rgbToHex(preview.r, preview.g, preview.b);

  return (
    <div
      className={`flex flex-col items-center gap-4 ${disabled ? "opacity-45" : ""}`}
    >
      <div className="relative overflow-visible">
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-40 blur-2xl"
          style={{
            background: `radial-gradient(circle, ${hex}88, transparent 68%)`,
          }}
          aria-hidden
        />
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className={`relative z-10 touch-none rounded-full ${
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          aria-label="Color wheel"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          aria-valuetext={hex}
          aria-disabled={disabled}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--fg-muted)]">
        <span
          className="h-5 w-5 rounded-full border border-white/25"
          style={{ background: hex, boxShadow: `0 0 16px ${hex}66` }}
        />
        <span className="font-mono uppercase tracking-wide">{hex}</span>
        <span className="text-[var(--fg-dim)]">
          H {Math.round(hsv.h)} · S {Math.round(hsv.s * 100)}%
        </span>
      </div>
    </div>
  );
}

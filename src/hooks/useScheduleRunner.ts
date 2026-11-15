"use client";

import { useEffect } from "react";
import {
  setBrightness,
  setColor,
  setPower,
} from "@/lib/lights-client";
import { getPreset } from "@/lib/presets";
import { getSchedules, saveSchedules } from "@/lib/storage";
import type { DeviceView, Schedule } from "@/lib/types";
import { deviceKey } from "@/lib/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function runKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function applySchedule(
  schedule: Schedule,
  devices: DeviceView[],
): Promise<void> {
  const targets =
    schedule.deviceKeys.length === 0
      ? devices
      : devices.filter((d) => schedule.deviceKeys.includes(deviceKey(d)));

  for (const device of targets) {
    const provider = device.provider ?? "govee";
    const action = schedule.action;
    if (action.kind === "power") {
      await setPower(device.sku, device.device, action.value, provider);
    } else if (action.kind === "brightness") {
      await setBrightness(device.sku, device.device, action.value, provider);
    } else if (action.kind === "color") {
      await setColor(device.sku, device.device, action.value, provider);
    } else if (action.kind === "preset") {
      const preset = getPreset(action.presetId);
      if (!preset) continue;
      await setColor(device.sku, device.device, preset.color, provider);
      await setBrightness(
        device.sku,
        device.device,
        preset.brightness,
        provider,
      );
      await setPower(device.sku, device.device, true, provider);
    }
  }
}

export function useScheduleRunner(
  devices: DeviceView[],
  onRan?: () => void,
): void {
  useEffect(() => {
    const tick = async () => {
      const now = new Date();
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const day = now.getDay();
      const key = runKey(now);
      const schedules = getSchedules();
      let changed = false;

      for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        if (!schedule.days.includes(day)) continue;
        if (schedule.time !== hhmm) continue;
        if (schedule.lastRunKey === key) continue;

        try {
          await applySchedule(schedule, devices);
          schedule.lastRunKey = key;
          changed = true;
          onRan?.();
        } catch {
          // Keep lastRunKey unset so a later tick can retry within the minute.
        }
      }

      if (changed) saveSchedules(schedules);
    };

    void tick();
    const id = window.setInterval(() => void tick(), 15_000);
    return () => window.clearInterval(id);
  }, [devices, onRan]);
}

import type { DeviceState, DeviceView, GoveeDevice } from "./types";
import { deviceKey, parseStateFromCapabilities } from "./govee-parse";
import {
  annotateDevice,
  buildSyntheticModelGroups,
  isGoveeGroupSku,
} from "./groups";
import { MOCK_DEVICES } from "./mock-devices";
import { getApiKey, isDemoMode } from "./storage";
import { packRgb } from "./govee-color";

async function api(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const key = getApiKey();
  if (!key) throw new Error("Missing Govee API key");
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-govee-api-key": key,
      ...(init?.headers ?? {}),
    },
  });
}

function withSyntheticGroups(devices: DeviceView[]): DeviceView[] {
  const annotated = devices.map(annotateDevice);
  const physical = annotated.filter((d) => d.kind === "device");
  const apiGroups = annotated.filter(
    (d) => d.kind === "sameModeGroup" || d.kind === "baseGroup",
  );
  // Local same-model groups fan out to every light sharing a SKU.
  // API SameModeGroup / BaseGroup entries are controlled as Govee group IDs.
  const synthetic = buildSyntheticModelGroups(physical);
  return [...apiGroups, ...synthetic, ...physical];
}

export async function fetchDevices(): Promise<DeviceView[]> {
  if (isDemoMode()) {
    return withSyntheticGroups(structuredClone(MOCK_DEVICES));
  }

  const res = await api("/api/govee/devices");
  const json = (await res.json()) as {
    error?: string;
    devices?: GoveeDevice[];
  };
  if (!res.ok) throw new Error(json.error || "Could not load devices");

  const devices = json.devices ?? [];
  const withState = await Promise.all(
    devices.map(async (device) => {
      // SameModeGroup / BaseGroup cannot be polled via /device/state.
      if (isGoveeGroupSku(device.sku)) {
        return annotateDevice({
          ...device,
          state: parseStateFromCapabilities(device.capabilities),
        });
      }
      try {
        const state = await fetchDeviceState(device.sku, device.device);
        return annotateDevice({ ...device, state });
      } catch {
        return annotateDevice({
          ...device,
          state: parseStateFromCapabilities(device.capabilities),
        });
      }
    }),
  );
  return withSyntheticGroups(withState);
}

export async function fetchDeviceState(
  sku: string,
  device: string,
): Promise<DeviceState> {
  if (isDemoMode()) {
    const found = MOCK_DEVICES.find(
      (d) => d.sku === sku && d.device === device,
    );
    return found?.state ?? {
      power: false,
      brightness: 50,
      color: { r: 255, g: 255, b: 255 },
      online: true,
    };
  }

  if (isGoveeGroupSku(sku)) {
    throw new Error("Groups do not support state polling");
  }

  const res = await api("/api/govee/state", {
    method: "POST",
    body: JSON.stringify({ sku, device }),
  });
  const json = (await res.json()) as { error?: string; state?: DeviceState };
  if (!res.ok || !json.state) throw new Error(json.error || "State failed");
  return json.state;
}

async function control(
  sku: string,
  device: string,
  capability: { type: string; instance: string; value: unknown },
): Promise<void> {
  if (isDemoMode()) return;

  const res = await api("/api/govee/control", {
    method: "POST",
    body: JSON.stringify({ sku, device, capability }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Control failed");
}

export async function setPower(
  sku: string,
  device: string,
  on: boolean,
): Promise<void> {
  await control(sku, device, {
    type: "devices.capabilities.on_off",
    instance: "powerSwitch",
    value: on ? 1 : 0,
  });
}

export async function setBrightness(
  sku: string,
  device: string,
  value: number,
): Promise<void> {
  await control(sku, device, {
    type: "devices.capabilities.range",
    instance: "brightness",
    value: Math.max(1, Math.min(100, Math.round(value))),
  });
}

export async function setColor(
  sku: string,
  device: string,
  color: { r: number; g: number; b: number },
): Promise<void> {
  await control(sku, device, {
    type: "devices.capabilities.color_setting",
    instance: "colorRgb",
    value: packRgb(color.r, color.g, color.b),
  });
}

export async function setColorTemperature(
  sku: string,
  device: string,
  kelvin: number,
): Promise<void> {
  await control(sku, device, {
    type: "devices.capabilities.color_setting",
    instance: "colorTemperatureK",
    value: Math.round(kelvin),
  });
}

export { deviceKey };

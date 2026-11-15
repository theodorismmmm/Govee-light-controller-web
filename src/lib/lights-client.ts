import type { DeviceState, DeviceView, GoveeDevice } from "./types";
import { deviceKey } from "./types";
import { parseStateFromCapabilities } from "./govee-parse";
import { packRgb } from "./govee-color";
import {
  annotateDevice,
  buildSyntheticModelGroups,
  isGoveeGroupSku,
} from "./groups";
import { MOCK_DEVICES } from "./mock-devices";
import type { ProviderId } from "./providers/types";
import {
  connectedProviders,
  getApiKey,
  isDemoMode,
} from "./storage";

type DeviceRef = Pick<DeviceView, "provider" | "sku" | "device">;

async function goveeApi(path: string, init?: RequestInit): Promise<Response> {
  const key = getApiKey("govee");
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

async function lifxApi(path: string, init?: RequestInit): Promise<Response> {
  const token = getApiKey("lifx");
  if (!token) throw new Error("Missing LIFX token");
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-lifx-token": token,
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
  const synthetic = buildSyntheticModelGroups(physical);
  return [...apiGroups, ...synthetic, ...physical];
}

async function fetchGoveeDevices(): Promise<DeviceView[]> {
  const res = await goveeApi("/api/govee/devices");
  const json = (await res.json()) as {
    error?: string;
    devices?: GoveeDevice[];
  };
  if (!res.ok) throw new Error(json.error || "Could not load Govee devices");

  const devices = (json.devices ?? []).map((d) => ({
    ...d,
    provider: "govee" as const,
  }));

  return Promise.all(
    devices.map(async (device) => {
      if (isGoveeGroupSku(device.sku)) {
        return annotateDevice({
          ...device,
          state: parseStateFromCapabilities(device.capabilities),
        });
      }
      try {
        const state = await fetchGoveeState(device.sku, device.device);
        return annotateDevice({ ...device, state });
      } catch {
        return annotateDevice({
          ...device,
          state: parseStateFromCapabilities(device.capabilities),
        });
      }
    }),
  );
}

async function fetchGoveeState(sku: string, device: string): Promise<DeviceState> {
  if (isGoveeGroupSku(sku)) {
    throw new Error("Groups do not support state polling");
  }
  const res = await goveeApi("/api/govee/state", {
    method: "POST",
    body: JSON.stringify({ sku, device }),
  });
  const json = (await res.json()) as { error?: string; state?: DeviceState };
  if (!res.ok || !json.state) throw new Error(json.error || "State failed");
  return json.state;
}

async function fetchLifxDevices(): Promise<DeviceView[]> {
  const res = await lifxApi("/api/lifx/devices");
  const json = (await res.json()) as {
    error?: string;
    devices?: DeviceView[];
  };
  if (!res.ok) throw new Error(json.error || "Could not load LIFX devices");
  return (json.devices ?? []).map((d) =>
    annotateDevice({ ...d, provider: "lifx", kind: "device" }),
  );
}

export async function fetchDevices(): Promise<DeviceView[]> {
  if (isDemoMode()) {
    return withSyntheticGroups(structuredClone(MOCK_DEVICES));
  }

  const providers = connectedProviders();
  if (providers.length === 0) {
    throw new Error("No light providers connected");
  }

  const results = await Promise.allSettled(
    providers.map(async (id) => {
      if (id === "govee") return fetchGoveeDevices();
      if (id === "lifx") return fetchLifxDevices();
      return [] as DeviceView[];
    }),
  );

  const devices: DeviceView[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") devices.push(...result.value);
    else {
      errors.push(
        result.reason instanceof Error
          ? result.reason.message
          : "Provider failed",
      );
    }
  }

  if (devices.length === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }

  return withSyntheticGroups(devices);
}

export async function fetchDeviceState(
  sku: string,
  device: string,
  provider: ProviderId = "govee",
): Promise<DeviceState> {
  if (isDemoMode()) {
    const found = MOCK_DEVICES.find(
      (d) => d.sku === sku && d.device === device,
    );
    return (
      found?.state ?? {
        power: false,
        brightness: 50,
        color: { r: 255, g: 255, b: 255 },
        online: true,
      }
    );
  }

  if (provider === "lifx") {
    const list = await fetchLifxDevices();
    const found = list.find((d) => d.device === device);
    if (!found) throw new Error("LIFX device not found");
    return found.state;
  }

  return fetchGoveeState(sku, device);
}

async function controlGovee(
  sku: string,
  device: string,
  capability: { type: string; instance: string; value: unknown },
): Promise<void> {
  const res = await goveeApi("/api/govee/control", {
    method: "POST",
    body: JSON.stringify({ sku, device, capability }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Control failed");
}

async function controlLifx(
  device: string,
  action: "power" | "brightness" | "color" | "colorTem",
  value: unknown,
): Promise<void> {
  const res = await lifxApi("/api/lifx/control", {
    method: "POST",
    body: JSON.stringify({ device, action, value }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Control failed");
}

export async function setPower(
  sku: string,
  device: string,
  on: boolean,
  provider: ProviderId = "govee",
): Promise<void> {
  if (isDemoMode()) return;
  if (provider === "lifx") {
    await controlLifx(device, "power", on);
    return;
  }
  await controlGovee(sku, device, {
    type: "devices.capabilities.on_off",
    instance: "powerSwitch",
    value: on ? 1 : 0,
  });
}

export async function setBrightness(
  sku: string,
  device: string,
  value: number,
  provider: ProviderId = "govee",
): Promise<void> {
  if (isDemoMode()) return;
  const brightness = Math.max(1, Math.min(100, Math.round(value)));
  if (provider === "lifx") {
    await controlLifx(device, "brightness", brightness);
    return;
  }
  await controlGovee(sku, device, {
    type: "devices.capabilities.range",
    instance: "brightness",
    value: brightness,
  });
}

export async function setColor(
  sku: string,
  device: string,
  color: { r: number; g: number; b: number },
  provider: ProviderId = "govee",
): Promise<void> {
  if (isDemoMode()) return;
  if (provider === "lifx") {
    await controlLifx(device, "color", color);
    return;
  }
  await controlGovee(sku, device, {
    type: "devices.capabilities.color_setting",
    instance: "colorRgb",
    value: packRgb(color.r, color.g, color.b),
  });
}

export async function setColorTemperature(
  sku: string,
  device: string,
  kelvin: number,
  provider: ProviderId = "govee",
): Promise<void> {
  if (isDemoMode()) return;
  if (provider === "lifx") {
    await controlLifx(device, "colorTem", Math.round(kelvin));
    return;
  }
  await controlGovee(sku, device, {
    type: "devices.capabilities.color_setting",
    instance: "colorTemperatureK",
    value: Math.round(kelvin),
  });
}

export function providerOf(device: DeviceRef): ProviderId {
  return device.provider ?? "govee";
}

export { deviceKey };
export type { DeviceRef };

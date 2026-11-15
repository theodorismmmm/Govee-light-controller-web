import { packRgb } from "./govee-color";
import { parseStateFromCapabilities } from "./govee-parse";
import type { DeviceState, GoveeCapability, GoveeDevice } from "./types";

const GOVEE_BASE = "https://openapi.api.govee.com";

function assertApiKey(apiKey: string | null): string {
  if (!apiKey || apiKey.length < 8 || apiKey.length > 128) {
    throw new Error("Invalid API key");
  }
  if (!/^[a-zA-Z0-9\-_.]+$/.test(apiKey)) {
    throw new Error("Invalid API key format");
  }
  return apiKey;
}

async function goveeFetch(
  path: string,
  apiKey: string,
  init?: RequestInit,
): Promise<Response> {
  const key = assertApiKey(apiKey);
  return fetch(`${GOVEE_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Govee-API-Key": key,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function listDevices(apiKey: string): Promise<GoveeDevice[]> {
  const res = await goveeFetch("/router/api/v1/user/devices", apiKey, {
    method: "GET",
  });
  const json = (await res.json()) as {
    code?: number;
    message?: string;
    data?: GoveeDevice[];
  };
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || `Failed to load devices (${res.status})`);
  }
  const devices = Array.isArray(json.data) ? json.data : [];
  return devices.filter(
    (d) =>
      !d.type ||
      d.type.includes("light") ||
      d.capabilities?.some(
        (c) =>
          c.instance === "brightness" ||
          c.instance === "colorRgb" ||
          c.instance === "powerSwitch",
      ),
  );
}

export async function getDeviceState(
  apiKey: string,
  sku: string,
  device: string,
): Promise<DeviceState> {
  const requestId = crypto.randomUUID();
  const res = await goveeFetch("/router/api/v1/device/state", apiKey, {
    method: "POST",
    body: JSON.stringify({
      requestId,
      payload: { sku, device },
    }),
  });
  const json = (await res.json()) as {
    code?: number;
    message?: string;
    payload?: { capabilities?: GoveeCapability[] };
    data?: { capabilities?: GoveeCapability[] };
  };
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || `Failed to read state (${res.status})`);
  }
  const caps = json.payload?.capabilities ?? json.data?.capabilities ?? [];
  return parseStateFromCapabilities(caps);
}

export type ControlPayload = {
  sku: string;
  device: string;
  capability: {
    type: string;
    instance: string;
    value: unknown;
  };
};

const ALLOWED_CONTROLS = new Set([
  "devices.capabilities.on_off:powerSwitch",
  "devices.capabilities.range:brightness",
  "devices.capabilities.color_setting:colorRgb",
  "devices.capabilities.color_setting:colorTemperatureK",
]);

export function validateControl(payload: ControlPayload): ControlPayload {
  const { sku, device, capability } = payload;
  if (!sku || !device || typeof sku !== "string" || typeof device !== "string") {
    throw new Error("Invalid device identifiers");
  }
  if (sku.length > 64 || device.length > 128) {
    throw new Error("Invalid device identifiers");
  }
  const key = `${capability.type}:${capability.instance}`;
  if (!ALLOWED_CONTROLS.has(key)) {
    throw new Error("Unsupported control");
  }

  let value = capability.value;
  if (capability.instance === "powerSwitch") {
    value = value === 1 || value === true || value === "on" ? 1 : 0;
  } else if (capability.instance === "brightness") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error("Invalid brightness");
    value = Math.max(1, Math.min(100, Math.round(n)));
  } else if (capability.instance === "colorRgb") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error("Invalid color");
    value = Math.max(0, Math.min(16777215, Math.round(n)));
  } else if (capability.instance === "colorTemperatureK") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error("Invalid temperature");
    value = Math.max(2000, Math.min(9000, Math.round(n)));
  }

  return { sku, device, capability: { ...capability, value } };
}

export async function controlDevice(
  apiKey: string,
  payload: ControlPayload,
): Promise<void> {
  const safe = validateControl(payload);
  const requestId = crypto.randomUUID();
  const res = await goveeFetch("/router/api/v1/device/control", apiKey, {
    method: "POST",
    body: JSON.stringify({
      requestId,
      payload: safe,
    }),
  });
  const json = (await res.json()) as { code?: number; message?: string };
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || `Control failed (${res.status})`);
  }
}

export function getApiKeyFromRequest(request: Request): string {
  const key =
    request.headers.get("x-govee-api-key") ||
    request.headers.get("Govee-API-Key");
  return assertApiKey(key);
}

export { packRgb, parseStateFromCapabilities };

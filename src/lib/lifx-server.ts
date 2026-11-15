import type { DeviceState, DeviceView } from "./types";

const LIFX_BASE = "https://api.lifx.com/v1";

function assertToken(token: string | null): string {
  if (!token || token.length < 8 || token.length > 256) {
    throw new Error("Invalid LIFX token");
  }
  if (!/^[a-zA-Z0-9_\-.]+$/.test(token)) {
    throw new Error("Invalid LIFX token format");
  }
  return token;
}

async function lifxFetch(path: string, token: string, init?: RequestInit) {
  const key = assertToken(token);
  return fetch(`${LIFX_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

type LifxLight = {
  id: string;
  uuid?: string;
  label?: string;
  connected?: boolean;
  power?: string;
  brightness?: number;
  color?: {
    hue?: number;
    saturation?: number;
    kelvin?: number;
  };
  product?: { name?: string; identifier?: string };
};

function hsvToRgb(h: number, s: number, v: number) {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function toDevice(light: LifxLight): DeviceView {
  const hue = light.color?.hue ?? 0;
  const sat = light.color?.saturation ?? 0;
  const brightness = Math.max(
    1,
    Math.min(100, Math.round((light.brightness ?? 0.5) * 100)),
  );
  const color =
    sat < 0.02
      ? { r: 255, g: 245, b: 230 }
      : hsvToRgb(hue, sat, 1);

  return {
    provider: "lifx",
    sku: light.product?.identifier || "LIFX",
    device: light.id,
    deviceName: light.label || light.id,
    type: "devices.types.light",
    kind: "device",
    capabilities: [
      { type: "devices.capabilities.on_off", instance: "powerSwitch" },
      { type: "devices.capabilities.range", instance: "brightness" },
      { type: "devices.capabilities.color_setting", instance: "colorRgb" },
      { type: "devices.capabilities.color_setting", instance: "colorTemperatureK" },
    ],
    state: {
      power: light.power === "on",
      brightness,
      color,
      colorTem: light.color?.kelvin,
      online: light.connected !== false,
    },
  };
}

export async function listLifxLights(token: string): Promise<DeviceView[]> {
  const res = await lifxFetch("/lights/all", token, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `LIFX list failed (${res.status})`);
  }
  const json = (await res.json()) as LifxLight[];
  return (Array.isArray(json) ? json : []).map(toDevice);
}

export async function controlLifx(
  token: string,
  selector: string,
  body: Record<string, unknown>,
): Promise<void> {
  if (!selector || selector.length > 128) {
    throw new Error("Invalid LIFX selector");
  }
  const res = await lifxFetch(
    `/lights/${encodeURIComponent(selector)}/state`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `LIFX control failed (${res.status})`);
  }
}

export function getLifxTokenFromRequest(request: Request): string {
  return assertToken(
    request.headers.get("x-lifx-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      null,
  );
}

export function rgbToLifxColor(r: number, g: number, b: number): string {
  return `rgb:${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
}

export type { DeviceState };

import { unpackRgb } from "./govee-color";
import type { DeviceState, GoveeCapability } from "./types";

function readCapValue(caps: GoveeCapability[], instance: string): unknown {
  const cap = caps.find((c) => c.instance === instance);
  if (!cap) return undefined;
  if (cap.state !== undefined && cap.state !== null && typeof cap.state === "object") {
    const stateObj = cap.state as { value?: unknown };
    if ("value" in stateObj) return stateObj.value;
  }
  return cap.value;
}

export function parseStateFromCapabilities(
  capabilities: GoveeCapability[] | undefined,
): DeviceState {
  const caps = capabilities ?? [];
  const powerRaw = readCapValue(caps, "powerSwitch");
  const brightnessRaw = readCapValue(caps, "brightness");
  const colorRaw = readCapValue(caps, "colorRgb");
  const temRaw = readCapValue(caps, "colorTemperatureK");
  const onlineRaw = readCapValue(caps, "online");

  let color = { r: 255, g: 255, b: 255 };
  if (typeof colorRaw === "number") {
    color = unpackRgb(colorRaw);
  } else if (colorRaw && typeof colorRaw === "object") {
    const c = colorRaw as { r?: number; g?: number; b?: number };
    color = {
      r: c.r ?? 255,
      g: c.g ?? 255,
      b: c.b ?? 255,
    };
  }

  return {
    power: powerRaw === 1 || powerRaw === true || powerRaw === "on",
    brightness:
      typeof brightnessRaw === "number"
        ? Math.max(1, Math.min(100, brightnessRaw))
        : 50,
    color,
    colorTem: typeof temRaw === "number" ? temRaw : undefined,
    online: onlineRaw !== false && onlineRaw !== 0,
  };
}

export { deviceKey } from "./types";

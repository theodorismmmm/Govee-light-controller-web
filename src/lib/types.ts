export type GoveeCapability = {
  type: string;
  instance: string;
  value?: unknown;
  state?: unknown;
  parameters?: {
    dataType?: string;
    range?: { min: number; max: number; precision?: number };
    options?: Array<{ name: string; value: unknown }>;
  };
};

export type GoveeDevice = {
  sku: string;
  device: string;
  deviceName: string;
  type?: string;
  capabilities?: GoveeCapability[];
};

export type DeviceState = {
  power: boolean;
  brightness: number;
  color: { r: number; g: number; b: number };
  colorTem?: number;
  online: boolean;
};

export type DeviceView = GoveeDevice & {
  state: DeviceState;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  color: { r: number; g: number; b: number };
  brightness: number;
  colorTem?: number;
};

export type ScheduleAction =
  | { kind: "power"; value: boolean }
  | { kind: "brightness"; value: number }
  | { kind: "color"; value: { r: number; g: number; b: number } }
  | { kind: "preset"; presetId: string };

export type Schedule = {
  id: string;
  name: string;
  deviceKeys: string[];
  time: string;
  days: number[];
  action: ScheduleAction;
  enabled: boolean;
  lastRunKey?: string;
};

export function deviceKey(device: Pick<GoveeDevice, "sku" | "device">): string {
  return `${device.sku}::${device.device}`;
}

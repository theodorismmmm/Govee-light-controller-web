import type { DeviceView } from "./types";

export const MOCK_DEVICES: DeviceView[] = [
  {
    sku: "H605C",
    device: "AA:BB:CC:DD:EE:01",
    deviceName: "Living Room Lamp",
    type: "devices.types.light",
    capabilities: [
      { type: "devices.capabilities.on_off", instance: "powerSwitch" },
      { type: "devices.capabilities.range", instance: "brightness" },
      { type: "devices.capabilities.color_setting", instance: "colorRgb" },
      { type: "devices.capabilities.color_setting", instance: "colorTemperatureK" },
    ],
    state: {
      power: true,
      brightness: 72,
      color: { r: 255, g: 200, b: 140 },
      colorTem: 3200,
      online: true,
    },
  },
  {
    sku: "H615A",
    device: "AA:BB:CC:DD:EE:02",
    deviceName: "Desk Strip",
    type: "devices.types.light",
    capabilities: [
      { type: "devices.capabilities.on_off", instance: "powerSwitch" },
      { type: "devices.capabilities.range", instance: "brightness" },
      { type: "devices.capabilities.color_setting", instance: "colorRgb" },
    ],
    state: {
      power: true,
      brightness: 55,
      color: { r: 80, g: 140, b: 255 },
      online: true,
    },
  },
  {
    sku: "H6008",
    device: "AA:BB:CC:DD:EE:03",
    deviceName: "Bedroom Bulb",
    type: "devices.types.light",
    capabilities: [
      { type: "devices.capabilities.on_off", instance: "powerSwitch" },
      { type: "devices.capabilities.range", instance: "brightness" },
      { type: "devices.capabilities.color_setting", instance: "colorRgb" },
      { type: "devices.capabilities.color_setting", instance: "colorTemperatureK" },
    ],
    state: {
      power: false,
      brightness: 20,
      color: { r: 255, g: 120, b: 40 },
      colorTem: 2700,
      online: true,
    },
  },
  {
    sku: "H61E1",
    device: "AA:BB:CC:DD:EE:04",
    deviceName: "Kitchen Under-cabinet",
    type: "devices.types.light",
    capabilities: [
      { type: "devices.capabilities.on_off", instance: "powerSwitch" },
      { type: "devices.capabilities.range", instance: "brightness" },
      { type: "devices.capabilities.color_setting", instance: "colorTemperatureK" },
    ],
    state: {
      power: true,
      brightness: 88,
      color: { r: 255, g: 245, b: 230 },
      colorTem: 4500,
      online: true,
    },
  },
];

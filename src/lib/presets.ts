import type { Preset } from "./types";

export const PRESETS: Preset[] = [
  {
    id: "warm-white",
    name: "Warm White",
    description: "Soft evening light",
    color: { r: 255, g: 180, b: 90 },
    brightness: 70,
    colorTem: 2700,
  },
  {
    id: "daylight",
    name: "Daylight",
    description: "Clear neutral white",
    color: { r: 255, g: 245, b: 230 },
    brightness: 90,
    colorTem: 5000,
  },
  {
    id: "cool-focus",
    name: "Cool Focus",
    description: "Bright work light",
    color: { r: 210, g: 230, b: 255 },
    brightness: 100,
    colorTem: 6500,
  },
  {
    id: "reading",
    name: "Reading",
    description: "Balanced desk light",
    color: { r: 255, g: 220, b: 170 },
    brightness: 80,
    colorTem: 3500,
  },
  {
    id: "relax",
    name: "Relax",
    description: "Dim amber glow",
    color: { r: 255, g: 120, b: 40 },
    brightness: 35,
  },
  {
    id: "night",
    name: "Night",
    description: "Low red night light",
    color: { r: 180, g: 30, b: 20 },
    brightness: 15,
  },
  {
    id: "cinema",
    name: "Cinema",
    description: "Deep blue ambience",
    color: { r: 40, g: 60, b: 180 },
    brightness: 40,
  },
  {
    id: "party",
    name: "Party",
    description: "Vivid magenta",
    color: { r: 255, g: 20, b: 140 },
    brightness: 95,
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

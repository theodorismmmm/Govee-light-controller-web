import type { DeviceView, GoveeDevice } from "./types";
import { deviceKey } from "./types";

export const GOVEE_GROUP_SKUS = new Set([
  "SameModeGroup",
  "BaseGroup",
]);

export const GOVEE_IGNORE_SKUS = new Set([
  "DreamViewScenic",
  "DreamView",
  "Shortcut",
]);

export function isGoveeGroupSku(sku: string): boolean {
  return GOVEE_GROUP_SKUS.has(sku);
}

export function isSameModeGroup(device: Pick<GoveeDevice, "sku">): boolean {
  return device.sku === "SameModeGroup";
}

export function isIgnorableSku(sku: string): boolean {
  return GOVEE_IGNORE_SKUS.has(sku);
}

export function isPhysicalLight(device: GoveeDevice): boolean {
  if (isGoveeGroupSku(device.sku) || isIgnorableSku(device.sku)) return false;
  return (
    !device.type ||
    device.type.includes("light") ||
    Boolean(
      device.capabilities?.some(
        (c) =>
          c.instance === "brightness" ||
          c.instance === "colorRgb" ||
          c.instance === "powerSwitch",
      ),
    )
  );
}

export function modelGroupKey(sku: string): string {
  return `model-group::${sku}`;
}

export function parseModelGroupSku(key: string): string | null {
  if (!key.startsWith("model-group::")) return null;
  return key.slice("model-group::".length);
}

export function buildSyntheticModelGroups(
  devices: DeviceView[],
): DeviceView[] {
  const bySku = new Map<string, DeviceView[]>();
  for (const device of devices) {
    if (!isPhysicalLight(device)) continue;
    const groupId = `${device.provider ?? "govee"}::${device.sku}`;
    const list = bySku.get(groupId) ?? [];
    list.push(device);
    bySku.set(groupId, list);
  }

  const groups: DeviceView[] = [];
  for (const members of bySku.values()) {
    if (members.length < 2) continue;
    const lead = members[0];
    const sku = lead.sku;
    const onCount = members.filter((m) => m.state.power).length;
    groups.push({
      provider: lead.provider ?? "govee",
      sku,
      device: `model-group:${lead.provider ?? "govee"}:${sku}`,
      deviceName: `Same model · ${sku}`,
      type: "openlights.types.model_group",
      capabilities: lead.capabilities,
      state: {
        power: onCount > 0,
        brightness: Math.round(
          members.reduce((sum, m) => sum + m.state.brightness, 0) /
            members.length,
        ),
        color: lead.state.color,
        colorTem: lead.state.colorTem,
        online: members.some((m) => m.state.online),
      },
      kind: "modelGroup",
      memberKeys: members.map((m) => deviceKey(m)),
      memberCount: members.length,
    });
  }
  return groups;
}

export function annotateDevice(device: DeviceView): DeviceView {
  if (device.sku === "SameModeGroup") {
    return { ...device, kind: "sameModeGroup", memberCount: undefined };
  }
  if (device.sku === "BaseGroup") {
    return { ...device, kind: "baseGroup", memberCount: undefined };
  }
  if (device.type === "openlights.types.model_group") {
    return device;
  }
  return { ...device, kind: "device" };
}

export function controlTargets(
  selected: DeviceView,
  all: DeviceView[],
): DeviceView[] {
  if (selected.kind === "modelGroup" && selected.memberKeys?.length) {
    return all.filter((d) => selected.memberKeys!.includes(deviceKey(d)));
  }
  return [selected];
}

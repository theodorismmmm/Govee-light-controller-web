export type ProviderId = "govee" | "lifx";

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  shortName: string;
  description: string;
  credentialLabel: string;
  credentialHint: string;
  docsHint: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "govee",
    name: "Govee",
    shortName: "Govee",
    description: "Open API for Govee lights, strips, and same-model groups.",
    credentialLabel: "Govee API key",
    credentialHint: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    docsHint: "Create a key in the Govee developer portal.",
  },
  {
    id: "lifx",
    name: "LIFX",
    shortName: "LIFX",
    description: "Cloud API for LIFX bulbs and multizone lights.",
    credentialLabel: "LIFX access token",
    credentialHint: "Personal access token from cloud.lifx.com",
    docsHint: "Generate a token under LIFX Cloud → Account → Personal access tokens.",
  },
];

export function getProvider(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

import { getApiKeyFromRequest, getDeviceState } from "@/lib/govee-server";

export async function POST(request: Request) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    const body = (await request.json()) as { sku?: string; device?: string };
    if (!body.sku || !body.device) {
      return Response.json({ error: "sku and device are required" }, { status: 400 });
    }
    if (body.sku.length > 64 || body.device.length > 128) {
      return Response.json({ error: "Invalid identifiers" }, { status: 400 });
    }
    if (body.sku === "SameModeGroup" || body.sku === "BaseGroup") {
      return Response.json(
        { error: "Groups do not support state polling" },
        { status: 400 },
      );
    }
    const state = await getDeviceState(apiKey, body.sku, body.device);
    return Response.json(
      { state },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message.includes("Invalid API key") ? 401 : 502;
    return Response.json({ error: message }, { status });
  }
}

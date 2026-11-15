import { getApiKeyFromRequest, listDevices } from "@/lib/govee-server";

export async function GET(request: Request) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    const devices = await listDevices(apiKey);
    return Response.json(
      { devices },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message.includes("Invalid API key") ? 401 : 502;
    return Response.json({ error: message }, { status });
  }
}

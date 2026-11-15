import {
  controlDevice,
  getApiKeyFromRequest,
  type ControlPayload,
} from "@/lib/govee-server";

export async function POST(request: Request) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    const body = (await request.json()) as ControlPayload;
    await controlDevice(apiKey, body);
    return Response.json(
      { ok: true },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    let status = 502;
    if (message.includes("Invalid API key")) status = 401;
    else if (
      message.includes("Unsupported") ||
      message.includes("Invalid") ||
      message.includes("required")
    ) {
      status = 400;
    }
    return Response.json({ error: message }, { status });
  }
}

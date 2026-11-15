import { getLifxTokenFromRequest, listLifxLights } from "@/lib/lifx-server";

export async function GET(request: Request) {
  try {
    const token = getLifxTokenFromRequest(request);
    const devices = await listLifxLights(token);
    return Response.json(
      { devices },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message.toLowerCase().includes("invalid") ? 401 : 502;
    return Response.json({ error: message }, { status });
  }
}

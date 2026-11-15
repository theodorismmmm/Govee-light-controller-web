import {
  controlLifx,
  getLifxTokenFromRequest,
  rgbToLifxColor,
} from "@/lib/lifx-server";

type Body = {
  device?: string;
  action?: "power" | "brightness" | "color" | "colorTem";
  value?: unknown;
};

export async function POST(request: Request) {
  try {
    const token = getLifxTokenFromRequest(request);
    const body = (await request.json()) as Body;
    if (!body.device || !body.action) {
      return Response.json(
        { error: "device and action are required" },
        { status: 400 },
      );
    }
    if (body.device.length > 128) {
      return Response.json({ error: "Invalid device" }, { status: 400 });
    }

    const selector = `id:${body.device}`;
    let payload: Record<string, unknown> = {};

    if (body.action === "power") {
      payload = { power: body.value ? "on" : "off" };
    } else if (body.action === "brightness") {
      const n = Number(body.value);
      if (!Number.isFinite(n)) {
        return Response.json({ error: "Invalid brightness" }, { status: 400 });
      }
      payload = {
        power: "on",
        brightness: Math.max(0.01, Math.min(1, Math.round(n) / 100)),
      };
    } else if (body.action === "color") {
      const c = body.value as { r?: number; g?: number; b?: number };
      if (
        typeof c?.r !== "number" ||
        typeof c?.g !== "number" ||
        typeof c?.b !== "number"
      ) {
        return Response.json({ error: "Invalid color" }, { status: 400 });
      }
      payload = {
        power: "on",
        color: rgbToLifxColor(c.r, c.g, c.b),
      };
    } else if (body.action === "colorTem") {
      const k = Number(body.value);
      if (!Number.isFinite(k)) {
        return Response.json({ error: "Invalid temperature" }, { status: 400 });
      }
      payload = {
        power: "on",
        color: `kelvin:${Math.max(1500, Math.min(9000, Math.round(k)))}`,
      };
    } else {
      return Response.json({ error: "Unsupported action" }, { status: 400 });
    }

    await controlLifx(token, selector, payload);
    return Response.json(
      { ok: true },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    let status = 502;
    if (message.toLowerCase().includes("invalid")) status = 401;
    return Response.json({ error: message }, { status });
  }
}

import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiRequest = IncomingMessage & { body?: unknown };
export type ApiResponse = ServerResponse;
export type JsonObject = Record<string, unknown>;

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function json(res: ApiResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(payload));
}

export function empty(res: ApiResponse, status = 204): void {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end();
}

export function bodyObject(req: ApiRequest): JsonObject | null {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) return body as JsonObject;
  if (typeof body === "string" && body.length <= 16_000) {
    try {
      const parsed: unknown = JSON.parse(body);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function sameOrigin(req: ApiRequest, allowMissingReadOrigin = false): boolean {
  const origin = headerValue(req.headers.origin);
  const target = headerValue(req.headers["x-forwarded-host"]) || headerValue(req.headers.host);
  if (!target) return false;
  if (!origin) return allowMissingReadOrigin && req.method === "GET";
  try {
    const originUrl = new URL(origin);
    const targetHost = target.split(",")[0].trim().toLowerCase();
    return (originUrl.protocol === "https:" || originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1")
      && originUrl.host.toLowerCase() === targetHost;
  } catch {
    return false;
  }
}

export function clientIpKey(req: ApiRequest): string {
  const forwarded = headerValue(req.headers["x-forwarded-for"]);
  return (forwarded.split(",")[0]?.trim() || headerValue(req.headers["x-real-ip"]) || "unknown").slice(0, 80);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function stringField(value: unknown, max: number, min = 0): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < min || text.length > max) return null;
  return text;
}

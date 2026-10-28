import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { ApiRequest, ApiResponse } from "./http.js";
import { clientIpKey, json, sameOrigin } from "./http.js";

const COOKIE_NAME = "albugmi2_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

type SessionPayload = { sub: "admin"; iat: number; exp: number; pinVersion: string };

function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
}

function codeFromEnvironment(): string | null {
  const raw = process.env.ADMIN_ACCESS_CODE?.trim() ?? "";
  const code = normalizeDigits(raw);
  return /^[0-9]{6}$/.test(code) ? code : null;
}

function serverSecretFromEnvironment(): string | null {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret?.trim() || null;
}

function sessionSecret(): Buffer | null {
  const serverSecret = serverSecretFromEnvironment();
  if (!serverSecret) return null;
  return createHmac("sha256", serverSecret).update("albugmi2-admin-session-signing-v1", "utf8").digest();
}

function currentPinVersion(secret: Buffer): string {
  const code = codeFromEnvironment();
  return code ? createHmac("sha256", secret).update(`albugmi2-admin-pin-version:${code}`, "utf8").digest("base64url") : "";
}

export function adminIpFingerprint(req: ApiRequest): string | null {
  const serverSecret = serverSecretFromEnvironment();
  if (!serverSecret) return null;
  return createHmac("sha256", serverSecret).update(clientIpKey(req), "utf8").digest("hex");
}

function signature(payloadPart: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(payloadPart).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

export function verifyAccessCode(input: string): boolean {
  const expected = codeFromEnvironment();
  const supplied = normalizeDigits(input.trim());
  return Boolean(expected && /^[0-9]{6}$/.test(supplied) && safeEqual(supplied, expected));
}

function issueToken(secret: Buffer): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: "admin", iat: now, exp: now + SESSION_SECONDS, pinVersion: currentPinVersion(secret) } satisfies SessionPayload)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

function tokenFromCookieHeader(header: string | undefined): string | null {
  if (!header) return null;
  const entry = header.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)); } catch { return null; }
}

function validToken(token: string, secret: Buffer): boolean {
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payloadPart = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  const expected = signature(payloadPart, secret);
  if (!safeEqual(supplied, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > now
      && typeof payload.iat === "number" && payload.iat <= now + 60
      && typeof payload.pinVersion === "string" && safeEqual(payload.pinVersion, currentPinVersion(secret));
  } catch {
    return false;
  }
}

export function setAdminCookie(res: ApiResponse): boolean {
  const secret = sessionSecret();
  if (!secret) return false;
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(issueToken(secret))}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=None`);
  return true;
}

export function clearAdminCookie(res: ApiResponse): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None`);
}

export function requireAdmin(req: ApiRequest, res: ApiResponse): boolean {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!sameOrigin(req, req.method === "GET")) {
    json(res, 403, { error: "طلب غير مسموح." });
    return false;
  }
  if (!codeFromEnvironment()) {
    json(res, 503, { error: "يجب ضبط ADMIN_ACCESS_CODE في Vercel كرمز من 6 أرقام." });
    return false;
  }
  const secret = sessionSecret();
  if (!secret) {
    json(res, 503, { error: "إعدادات الإدارة الخادمية غير مكتملة في Vercel." });
    return false;
  }
  const token = tokenFromCookieHeader(typeof req.headers.cookie === "string" ? req.headers.cookie : undefined);
  if (!token || !validToken(token, secret)) {
    json(res, 401, { error: "انتهت جلسة الإدارة. سجّل الدخول مجددًا." });
    return false;
  }
  return true;
}

export function hasAdminCode(): boolean {
  return codeFromEnvironment() !== null;
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { env } from "./env.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 8;

type AdminTokenPayload = {
  sub: "admin";
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string) {
  return createHmac("sha256", env.appSecret).update(data).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminPassword(password: string) {
  return Boolean(env.adminPassword) && safeEqual(password, env.adminPassword);
}

export function createAdminToken() {
  const payload: AdminTokenPayload = {
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyAdminToken(token: string | undefined) {
  if (!token) return false;

  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, sign(body))) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as Partial<AdminTokenPayload>;
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function getBearerToken(header: string | null | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

export function isAuthorizedRequest(req: Request | IncomingMessage) {
  const authorization =
    req instanceof Request ? req.headers.get("authorization") : req.headers.authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  return verifyAdminToken(getBearerToken(header));
}

import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "@hono/node-server/vercel";
import { eq } from "drizzle-orm";
import { participants, missedRecords } from "../db/schema.js";
import app from "../server/boot.js";
import { createAdminToken, isAuthorizedRequest, verifyAdminPassword } from "../server/lib/auth.js";
import { getDb } from "../server/queries/connection.js";

const honoHandler = handle(app);
const MAX_JSON_BYTES = 3 * 1024 * 1024;
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_JSON_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", Buffer.byteLength(body));
  res.end(body);
}

function getParticipantId(url: string | undefined) {
  const match = url?.match(/^\/api\/admin\/participants\/(\d+)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

function clientKey(req: IncomingMessage) {
  const forwarded = req.headers["x-forwarded-for"];
  return Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function isRateLimited(req: IncomingMessage) {
  const key = clientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LOGIN_MAX_ATTEMPTS;
}

function normalizeImage(input: unknown) {
  if (typeof input !== "string") return null;
  const image = input.trim();
  if (!image) return null;
  if (image.startsWith("data:image/")) return image;
  if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("/")) {
    return image.replace(/\/+$/, "");
  }
  return `/${image.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function getParticipantPayload(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return null;

  return {
    name,
    image: normalizeImage(input.image),
    missedCount: Number(input.missedCount) || 0,
    paidAmount: Number(input.paidAmount) || 0,
    unpaidAmount: Number(input.unpaidAmount) || 0,
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "POST" && req.url?.startsWith("/api/admin/login")) {
    if (isRateLimited(req)) {
      sendJson(res, 429, { success: false, token: null });
      return;
    }

    try {
      const body = await readJson(req);
      const password =
        body && typeof body === "object" && "password" in body
          ? String(body.password)
          : "";

      if (verifyAdminPassword(password)) {
        sendJson(res, 200, { success: true, token: createAdminToken() });
        return;
      }

      sendJson(res, 200, { success: false, token: null });
    } catch {
      sendJson(res, 400, { success: false, token: null });
    }
    return;
  }

  if (req.url?.startsWith("/api/admin/participants")) {
    if (!isAuthorizedRequest(req)) {
      sendJson(res, 401, { success: false, error: "Unauthorized" });
      return;
    }

    try {
      const db = getDb();

      if (req.method === "POST" && req.url === "/api/admin/participants") {
        const payload = getParticipantPayload(await readJson(req));
        if (!payload) {
          sendJson(res, 400, { success: false, error: "Invalid participant" });
          return;
        }

        const [created] = await db
          .insert(participants)
          .values(payload)
          .returning();
        sendJson(res, 200, { success: true, participant: created });
        return;
      }

      if (req.method === "PUT") {
        const id = getParticipantId(req.url);
        const payload = getParticipantPayload(await readJson(req));
        if (!id || !payload) {
          sendJson(res, 400, { success: false, error: "Invalid participant" });
          return;
        }

        await db.update(participants).set(payload).where(eq(participants.id, id));
        sendJson(res, 200, { success: true });
        return;
      }

      if (req.method === "DELETE") {
        const id = getParticipantId(req.url);
        if (!id) {
          sendJson(res, 400, { success: false, error: "Invalid participant" });
          return;
        }

        await db.delete(missedRecords).where(eq(missedRecords.participantId, id));
        await db.delete(participants).where(eq(participants.id, id));
        sendJson(res, 200, { success: true });
        return;
      }

      sendJson(res, 405, { success: false, error: "Method not allowed" });
    } catch (error) {
      console.error(error);
      sendJson(res, error instanceof SyntaxError ? 400 : 500, {
        success: false,
        error: error instanceof SyntaxError ? "Invalid JSON" : "Server error",
      });
    }
    return;
  }

  return honoHandler(req, res);
}

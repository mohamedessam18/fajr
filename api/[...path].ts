import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "@hono/node-server/vercel";
import { put } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { participants, missedRecords, moneyFlow } from "../db/schema.js";
import app from "../server/boot.js";
import { createAdminToken, isAuthorizedRequest, verifyAdminPassword } from "../server/lib/auth.js";
import { ensureActiveCycle, FLOW_TYPES } from "../server/lib/funds.js";
import { closeDb, getDb } from "../server/queries/connection.js";

const honoHandler = handle(app);
const MAX_JSON_BYTES = 30 * 1024 * 1024;
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

function getUploadPayload(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const dataUrl = typeof input.dataUrl === "string" ? input.dataUrl : "";
  const fileName = typeof input.fileName === "string" ? input.fileName : "upload";
  const mimeType = typeof input.mimeType === "string" ? input.mimeType : "application/octet-stream";
  const type = mimeType.startsWith("video/") ? "video" : mimeType.startsWith("image/") ? "image" : null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || !type) return null;
  return {
    data: Buffer.from(match[2], "base64"),
    fileName: fileName.replace(/[^\w.\-\u0600-\u06ff]+/g, "-"),
    mimeType,
    type,
  };
}

function getMissedRecordPayload(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const participantId = Number(input.participantId);
  const amount = Number(input.amount) || 10;
  const paid = Boolean(input.paid);
  if (!Number.isInteger(participantId) || participantId <= 0 || amount <= 0) return null;
  return { participantId, amount, paid };
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

  if (req.method === "POST" && req.url?.startsWith("/api/admin/missed-records")) {
    if (!isAuthorizedRequest(req)) {
      sendJson(res, 401, { success: false, error: "Unauthorized" });
      return;
    }

    try {
      const payload = getMissedRecordPayload(await readJson(req));
      if (!payload) {
        sendJson(res, 400, { success: false, error: "Invalid missed record" });
        return;
      }

      const db = getDb();
      const existing = await db.query.participants.findFirst({
        where: eq(participants.id, payload.participantId),
      });
      if (!existing) {
        sendJson(res, 404, { success: false, error: "Participant not found" });
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const [record] = await db
        .insert(missedRecords)
        .values({
          participantId: payload.participantId,
          date,
          amount: payload.amount,
          paid: payload.paid,
        })
        .returning();

      await db
        .update(participants)
        .set({
          missedCount: sql`${participants.missedCount} + 1`,
          paidAmount: payload.paid
            ? sql`${participants.paidAmount} + ${payload.amount}`
            : sql`${participants.paidAmount}`,
          unpaidAmount: payload.paid
            ? sql`${participants.unpaidAmount}`
            : sql`${participants.unpaidAmount} + ${payload.amount}`,
        })
        .where(eq(participants.id, payload.participantId));

      if (payload.paid) {
        const cycle = await ensureActiveCycle();
        await db.insert(moneyFlow).values({
          cycleId: cycle.id,
          participantId: payload.participantId,
          type: FLOW_TYPES.CONTRIBUTION_IN,
          amount: payload.amount,
          title: "دفع غرامة",
          description: date,
        });
      }

      sendJson(res, 200, { success: true, record });
    } catch (error) {
      console.error(error);
      sendJson(res, error instanceof SyntaxError ? 400 : 500, {
        success: false,
        error: error instanceof SyntaxError ? "Invalid JSON" : "Server error",
      });
    } finally {
      await closeDb();
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
        if (payload.paidAmount > 0) {
          const cycle = await ensureActiveCycle();
          await db.insert(moneyFlow).values({
            cycleId: cycle.id,
            participantId: created.id,
            type: FLOW_TYPES.CONTRIBUTION_IN,
            amount: payload.paidAmount,
            title: "دفع مشارك",
            description: "قيمة مدفوعة عند إضافة مشارك",
          });
        }
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

        const existing = await db.query.participants.findFirst({
          where: eq(participants.id, id),
        });
        await db.update(participants).set(payload).where(eq(participants.id, id));
        const paidDelta = payload.paidAmount - (existing?.paidAmount ?? 0);
        if (paidDelta !== 0) {
          const cycle = await ensureActiveCycle();
          await db.insert(moneyFlow).values({
            cycleId: cycle.id,
            participantId: id,
            type: paidDelta > 0 ? FLOW_TYPES.CONTRIBUTION_IN : FLOW_TYPES.ADJUSTMENT_OUT,
            amount: Math.abs(paidDelta),
            title: paidDelta > 0 ? "زيادة مدفوعات مشارك" : "تعديل مدفوعات مشارك",
            description: "تعديل من لوحة التحكم",
          });
        }
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
    } finally {
      await closeDb();
    }
    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/api/admin/uploads")) {
    if (!isAuthorizedRequest(req)) {
      sendJson(res, 401, { success: false, error: "Unauthorized" });
      return;
    }

    try {
      const payload = getUploadPayload(await readJson(req));
      if (!payload) {
        sendJson(res, 400, { success: false, error: "Invalid upload" });
        return;
      }

      const ext = payload.fileName.includes(".") ? "" : payload.type === "image" ? ".png" : ".mp4";
      const pathname = `donations/${Date.now()}-${payload.fileName}${ext}`;
      const blob = await put(pathname, payload.data, {
        access: "public",
        contentType: payload.mimeType,
      });

      sendJson(res, 200, {
        success: true,
        media: {
          url: blob.url,
          pathname: blob.pathname,
          type: payload.type,
          mimeType: payload.mimeType,
          fileName: payload.fileName,
          size: payload.data.byteLength,
        },
      });
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { success: false, error: "Upload failed" });
    } finally {
      await closeDb();
    }
    return;
  }

  return honoHandler(req, res);
}

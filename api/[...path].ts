import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "@hono/node-server/vercel";
import { eq } from "drizzle-orm";
import { participants, missedRecords } from "../db/schema.js";
import app from "../server/boot.js";
import { getDb } from "../server/queries/connection.js";

const honoHandler = handle(app);
const ADMIN_PASSWORD = "sahseh2025";
const ADMIN_TOKEN = "admin_sahseh_2025_token";

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
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

function isAuthorized(req: IncomingMessage) {
  const header = req.headers.authorization;
  return header === `Bearer ${ADMIN_TOKEN}`;
}

function getParticipantId(url: string | undefined) {
  const match = url?.match(/^\/api\/admin\/participants\/(\d+)(?:\?|$)/);
  return match ? Number(match[1]) : null;
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
    try {
      const body = await readJson(req);
      const password =
        body && typeof body === "object" && "password" in body
          ? String(body.password)
          : "";

      if (password === ADMIN_PASSWORD) {
        sendJson(res, 200, { success: true, token: "admin_sahseh_2025_token" });
        return;
      }

      sendJson(res, 200, { success: false, token: null });
    } catch {
      sendJson(res, 400, { success: false, token: null });
    }
    return;
  }

  if (req.url?.startsWith("/api/admin/participants")) {
    if (!isAuthorized(req)) {
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

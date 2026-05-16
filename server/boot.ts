import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { env } from "./lib/env.js";
import { closeDb } from "./queries/connection.js";

const app = new Hono<{ Bindings: HttpBindings }>();

function setCorsHeaders(headers: Headers, origin?: string, requestHeaders?: string) {
  headers.set("access-control-allow-origin", origin ?? "*");
  headers.set("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", requestHeaders ?? "authorization,content-type");
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "Origin");
}

app.use("*", async (c, next) => {
  const requestHeaders = c.req.header("access-control-request-headers");
  setCorsHeaders(c.res.headers, c.req.header("origin"), requestHeaders);

  try {
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
    c.header("x-content-type-options", "nosniff");
    c.header("referrer-policy", "strict-origin-when-cross-origin");
    c.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    c.header("x-frame-options", "DENY");
    if (env.isProduction) {
      c.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
  } finally {
    await closeDb();
  }
});

app.use("/api/trpc/*", async (c) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
  setCorsHeaders(response.headers, c.req.header("origin"), c.req.header("access-control-request-headers"));
  return response;
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction && !process.env.VERCEL) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite.js");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

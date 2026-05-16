import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { env } from "./lib/env.js";
import { closeDb } from "./queries/connection.js";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use("*", async (c, next) => {
  const requestHeaders = c.req.header("access-control-request-headers");
  c.header("access-control-allow-origin", c.req.header("origin") ?? "*");
  c.header("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  c.header("access-control-allow-headers", requestHeaders ?? "authorization,content-type");
  c.header("access-control-max-age", "86400");
  c.header("vary", "Origin");

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
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
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

import { createRouter, publicQuery } from "./middleware.js";
import { participantRouter } from "./participantRouter.js";
import { adminRouter } from "./adminRouter.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  participant: participantRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

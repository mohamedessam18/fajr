import { createRouter, publicQuery } from "./middleware.js";
import { participantRouter } from "./participantRouter.js";
import { adminRouter } from "./adminRouter.js";
import { donationRouter } from "./donationRouter.js";
import { moneyFlowRouter } from "./moneyFlowRouter.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  participant: participantRouter,
  admin: adminRouter,
  donation: donationRouter,
  moneyFlow: moneyFlowRouter,
});

export type AppRouter = typeof appRouter;

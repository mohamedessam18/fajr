import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { donationMedia, donations } from "../db/schema.js";
import { ensureSeed } from "./participantRouter.js";

export const donationRouter = createRouter({
  list: publicQuery.query(async () => {
    await ensureSeed();
    const db = getDb();
    const items = await db.query.donations.findMany({
      where: eq(donations.published, true),
      orderBy: desc(donations.donatedAt),
      with: {
        media: {
          orderBy: donationMedia.sortOrder,
        },
      },
    });

    return items.map((donation) => ({
      ...donation,
      cover: donation.media[0] ?? null,
    }));
  }),

  byId: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    await ensureSeed();
    const db = getDb();
    const donation = await db.query.donations.findFirst({
      where: and(eq(donations.id, input.id), eq(donations.published, true)),
      with: {
        media: {
          orderBy: donationMedia.sortOrder,
        },
      },
    });

    return donation ?? null;
  }),
});

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { participants, missedRecords, settings } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { ensureSeed } from "./participantRouter.js";

const ADMIN_PASSWORD = "sahseh2025";

export const adminRouter = createRouter({
  login: publicQuery
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      if (input.password === ADMIN_PASSWORD) {
        return { success: true, token: "admin_sahseh_2025_token" };
      }
      return { success: false, token: null };
    }),

  listParticipants: publicQuery.query(async () => {
    await ensureSeed();
    const db = getDb();
    return db.select().from(participants);
  }),

  addParticipant: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        image: z.string().optional(),
        missedCount: z.number().min(0).default(0),
        paidAmount: z.number().min(0).default(0),
        unpaidAmount: z.number().min(0).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(participants).values({
        name: input.name,
        image: input.image || null,
        missedCount: input.missedCount,
        paidAmount: input.paidAmount,
        unpaidAmount: input.unpaidAmount,
      }).returning({ id: participants.id });
      return { id: result[0].id, ...input };
    }),

  updateParticipant: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        image: z.string().optional(),
        missedCount: z.number().min(0).optional(),
        paidAmount: z.number().min(0).optional(),
        unpaidAmount: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.image !== undefined) updateData.image = updates.image;
      if (updates.missedCount !== undefined) updateData.missedCount = updates.missedCount;
      if (updates.paidAmount !== undefined) updateData.paidAmount = updates.paidAmount;
      if (updates.unpaidAmount !== undefined) updateData.unpaidAmount = updates.unpaidAmount;

      await db
        .update(participants)
        .set(updateData)
        .where(eq(participants.id, id));
      return { success: true };
    }),

  deleteParticipant: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(missedRecords).where(eq(missedRecords.participantId, input.id));
      await db.delete(participants).where(eq(participants.id, input.id));
      return { success: true };
    }),

  addMissedRecord: publicQuery
    .input(
      z.object({
        participantId: z.number(),
        date: z.string(),
        amount: z.number().default(10),
        paid: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(missedRecords).values(input);

      const updates: Record<string, unknown> = {
        missedCount: db.$count(missedRecords, eq(missedRecords.participantId, input.participantId)),
      };

      if (input.paid) {
        updates.paidAmount = sql`${participants.paidAmount} + ${input.amount}`;
      } else {
        updates.unpaidAmount = sql`${participants.unpaidAmount} + ${input.amount}`;
      }

      await db
        .update(participants)
        .set(updates)
        .where(eq(participants.id, input.participantId));

      return { success: true };
    }),

  updateMissedRecord: publicQuery
    .input(
      z.object({
        id: z.number(),
        paid: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const record = await db.query.missedRecords.findFirst({
        where: eq(missedRecords.id, input.id),
      });
      if (!record) return { success: false };

      await db
        .update(missedRecords)
        .set({ paid: input.paid })
        .where(eq(missedRecords.id, input.id));

      const amountChange = input.paid ? record.amount : -record.amount;
      await db
        .update(participants)
        .set({
          paidAmount: sql`${participants.paidAmount} + ${amountChange}`,
          unpaidAmount: sql`${participants.unpaidAmount} - ${amountChange}`,
        })
        .where(eq(participants.id, record.participantId));

      return { success: true };
    }),

  getFineAmount: publicQuery.query(async () => {
    const db = getDb();
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "missed_fine_amount"),
    });
    return { amount: setting ? parseInt(setting.value) : 10 };
  }),

  updateFineAmount: publicQuery
    .input(z.object({ amount: z.number().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(settings)
        .set({ value: String(input.amount) })
        .where(eq(settings.key, "missed_fine_amount"));
      return { success: true };
    }),
});

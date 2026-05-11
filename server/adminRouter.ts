import { z } from "zod";
import { adminQuery, createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import {
  donationMedia,
  donations,
  fundCycles,
  missedRecords,
  moneyFlow,
  participants,
  settings,
} from "../db/schema.js";
import { desc, eq, sql } from "drizzle-orm";
import { ensureSeed } from "./participantRouter.js";
import { createAdminToken, verifyAdminPassword } from "./lib/auth.js";
import { ensureActiveCycle, FLOW_TYPES, getCycleSummary } from "./lib/funds.js";

const mediaInput = z.object({
  url: z.string().url(),
  pathname: z.string().optional().nullable(),
  type: z.enum(["image", "video"]),
  mimeType: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  size: z.number().optional().nullable(),
  sortOrder: z.number().optional().default(0),
});

const donationInput = z.object({
  title: z.string().min(1),
  summary: z.string().max(500).optional(),
  description: z.string().min(1),
  amount: z.number().int().positive(),
  donatedAt: z.string().optional(),
  published: z.boolean().default(true),
  media: z.array(mediaInput).default([]),
  confirmCloseCycle: z.boolean().default(false),
});

export const adminRouter = createRouter({
  login: publicQuery
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      if (verifyAdminPassword(input.password)) {
        return { success: true, token: createAdminToken() };
      }
      return { success: false, token: null };
    }),

  listParticipants: adminQuery.query(async () => {
    await ensureSeed();
    const db = getDb();
    return db.select().from(participants);
  }),

  fundSummary: adminQuery.query(async () => {
    await ensureSeed();
    const cycle = await ensureActiveCycle();
    return getCycleSummary(cycle.id);
  }),

  listDonations: adminQuery.query(async () => {
    await ensureSeed();
    const db = getDb();
    return db.query.donations.findMany({
      orderBy: desc(donations.donatedAt),
      with: {
        media: {
          orderBy: donationMedia.sortOrder,
        },
        cycle: true,
      },
    });
  }),

  createDonation: adminQuery.input(donationInput).mutation(async ({ input }) => {
    await ensureSeed();
    const db = getDb();
    const cycle = await ensureActiveCycle();
    const summary = await getCycleSummary(cycle.id);

    if (input.amount > summary.balance) {
      return { success: false, error: "INSUFFICIENT_BALANCE" as const };
    }

    const closesCycle = input.amount === summary.balance;
    if (closesCycle && !input.confirmCloseCycle) {
      return { success: false, error: "CLOSE_CYCLE_CONFIRMATION_REQUIRED" as const };
    }

    const [created] = await db
      .insert(donations)
      .values({
        cycleId: cycle.id,
        title: input.title,
        summary: input.summary || null,
        description: input.description,
        amount: input.amount,
        donatedAt: input.donatedAt ? new Date(input.donatedAt) : new Date(),
        published: input.published,
        closesCycle,
      })
      .returning();

    if (input.media.length) {
      await db.insert(donationMedia).values(
        input.media.map((media, index) => ({
          donationId: created.id,
          url: media.url,
          pathname: media.pathname ?? null,
          type: media.type,
          mimeType: media.mimeType ?? null,
          fileName: media.fileName ?? null,
          size: media.size ?? null,
          sortOrder: media.sortOrder ?? index,
        })),
      );
    }

    await db.insert(moneyFlow).values({
      cycleId: cycle.id,
      donationId: created.id,
      type: FLOW_TYPES.DONATION_OUT,
      amount: input.amount,
      title: `تبرع: ${input.title}`,
      description: input.summary || input.description,
      occurredAt: created.donatedAt,
    });

    if (closesCycle) {
      await db
        .update(fundCycles)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(fundCycles.id, cycle.id));

      await db.delete(missedRecords);
      await db.update(participants).set({
        missedCount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      });

      await db.insert(fundCycles).values({
        title: "الدورة الحالية",
        status: "active",
        startingBalance: 0,
      });
    }

    return { success: true, donationId: created.id, closedCycle: closesCycle };
  }),

  updateDonation: adminQuery
    .input(
      donationInput.extend({
        id: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.donations.findFirst({
        where: eq(donations.id, input.id),
      });
      if (!existing) return { success: false, error: "NOT_FOUND" as const };
      if (existing.amount !== input.amount) {
        return { success: false, error: "AMOUNT_LOCKED" as const };
      }

      await db
        .update(donations)
        .set({
          title: input.title,
          summary: input.summary || null,
          description: input.description,
          donatedAt: input.donatedAt ? new Date(input.donatedAt) : existing.donatedAt,
          published: input.published,
          updatedAt: new Date(),
        })
        .where(eq(donations.id, input.id));

      await db.delete(donationMedia).where(eq(donationMedia.donationId, input.id));
      if (input.media.length) {
        await db.insert(donationMedia).values(
          input.media.map((media, index) => ({
            donationId: input.id,
            url: media.url,
            pathname: media.pathname ?? null,
            type: media.type,
            mimeType: media.mimeType ?? null,
            fileName: media.fileName ?? null,
            size: media.size ?? null,
            sortOrder: media.sortOrder ?? index,
          })),
        );
      }
      return { success: true };
    }),

  deleteDonation: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const existing = await db.query.donations.findFirst({
      where: eq(donations.id, input.id),
    });
    if (!existing) return { success: true };
    if (existing.closesCycle) {
      return { success: false, error: "CLOSED_CYCLE_DONATION_LOCKED" as const };
    }

    await db.delete(moneyFlow).where(eq(moneyFlow.donationId, input.id));
    await db.delete(donations).where(eq(donations.id, input.id));
    return { success: true };
  }),

  addParticipant: adminQuery
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

  updateParticipant: adminQuery
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

  deleteParticipant: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(missedRecords).where(eq(missedRecords.participantId, input.id));
      await db.delete(participants).where(eq(participants.id, input.id));
      return { success: true };
    }),

  addMissedRecord: adminQuery
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
        const cycle = await ensureActiveCycle();
        await db.insert(moneyFlow).values({
          cycleId: cycle.id,
          participantId: input.participantId,
          type: FLOW_TYPES.CONTRIBUTION_IN,
          amount: input.amount,
          title: "دفع غرامة",
          description: input.date,
        });
      } else {
        updates.unpaidAmount = sql`${participants.unpaidAmount} + ${input.amount}`;
      }

      await db
        .update(participants)
        .set(updates)
        .where(eq(participants.id, input.participantId));

      return { success: true };
    }),

  updateMissedRecord: adminQuery
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

      const cycle = await ensureActiveCycle();
      await db.insert(moneyFlow).values({
        cycleId: cycle.id,
        participantId: record.participantId,
        type: input.paid ? FLOW_TYPES.CONTRIBUTION_IN : FLOW_TYPES.ADJUSTMENT_OUT,
        amount: record.amount,
        title: input.paid ? "دفع غرامة" : "إلغاء دفع غرامة",
        description: record.date,
      });

      return { success: true };
    }),

  getFineAmount: adminQuery.query(async () => {
    const db = getDb();
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "missed_fine_amount"),
    });
    return { amount: setting ? parseInt(setting.value) : 10 };
  }),

  updateFineAmount: adminQuery
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

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  charityMonthPayments,
  charityMonths,
  participants,
} from "../db/schema.js";
import { adminQuery, createRouter, publicQuery } from "./middleware.js";
import { FLOW_TYPES, addMoneyFlowEntry, ensureActiveCycle } from "./lib/funds.js";
import { getCurrentHijriParts } from "./lib/hijri.js";
import { ensureSeed } from "./participantRouter.js";
import { getDb } from "./queries/connection.js";

const CONTRIBUTION_AMOUNT = 50;

async function getCircleParticipants() {
  const db = getDb();
  return db.select().from(participants).orderBy(asc(participants.id));
}

async function getRotationParticipantId(circleParticipants: Awaited<ReturnType<typeof getCircleParticipants>>) {
  if (!circleParticipants.length) return null;
  const db = getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(charityMonths)
    .where(eq(charityMonths.status, "closed"));
  const index = Number(count ?? 0) % circleParticipants.length;
  return circleParticipants[index]?.id ?? null;
}

async function syncOpenMonthParticipants(monthId: number) {
  const db = getDb();
  const circleParticipants = await getCircleParticipants();
  const payments = await db
    .select()
    .from(charityMonthPayments)
    .where(eq(charityMonthPayments.monthId, monthId));
  const existingParticipantIds = new Set(payments.map((payment) => payment.participantId));
  const missingParticipants = circleParticipants.filter((participant) => !existingParticipantIds.has(participant.id));

  if (missingParticipants.length) {
    await db.insert(charityMonthPayments).values(
      missingParticipants.map((participant) => ({
        monthId,
        participantId: participant.id,
        amount: CONTRIBUTION_AMOUNT,
        paid: false,
      })),
    );
  }

  const expectedAmount = circleParticipants.length * CONTRIBUTION_AMOUNT;
  await db
    .update(charityMonths)
    .set({ expectedAmount })
    .where(eq(charityMonths.id, monthId));
}

async function ensureActiveCharityMonth() {
  await ensureSeed();
  const db = getDb();

  const openMonth = await db.query.charityMonths.findFirst({
    where: eq(charityMonths.status, "open"),
    orderBy: desc(charityMonths.createdAt),
  });
  if (openMonth) {
    await syncOpenMonthParticipants(openMonth.id);
    return openMonth;
  }

  const hijri = getCurrentHijriParts();
  const currentMonth = await db.query.charityMonths.findFirst({
    where: and(eq(charityMonths.hijriYear, hijri.year), eq(charityMonths.hijriMonth, hijri.month)),
  });
  if (currentMonth) return currentMonth;

  const circleParticipants = await getCircleParticipants();
  if (!circleParticipants.length) return null;

  const [created] = await db
    .insert(charityMonths)
    .values({
      hijriYear: hijri.year,
      hijriMonth: hijri.month,
      hijriMonthName: hijri.monthName,
      rotationParticipantId: await getRotationParticipantId(circleParticipants),
      contributionAmount: CONTRIBUTION_AMOUNT,
      expectedAmount: circleParticipants.length * CONTRIBUTION_AMOUNT,
      status: "open",
    })
    .returning();

  await db.insert(charityMonthPayments).values(
    circleParticipants.map((participant) => ({
      monthId: created.id,
      participantId: participant.id,
      amount: CONTRIBUTION_AMOUNT,
      paid: false,
    })),
  );

  return created;
}

async function getMonthDetails(monthId: number) {
  const db = getDb();
  const month = await db.query.charityMonths.findFirst({
    where: eq(charityMonths.id, monthId),
    with: {
      rotationParticipant: true,
      payments: {
        with: {
          participant: true,
        },
        orderBy: asc(charityMonthPayments.id),
      },
    },
  });
  return month;
}

async function getCharityPayload() {
  await ensureSeed();
  const db = getDb();
  const activeMonth = await ensureActiveCharityMonth();
  const circleParticipants = await getCircleParticipants();
  const active = activeMonth ? await getMonthDetails(activeMonth.id) : null;
  const history = await db.query.charityMonths.findMany({
    where: eq(charityMonths.status, "closed"),
    orderBy: [desc(charityMonths.closedAt), desc(charityMonths.id)],
    with: {
      rotationParticipant: true,
      payments: {
        with: {
          participant: true,
        },
        orderBy: asc(charityMonthPayments.id),
      },
    },
    limit: 12,
  });

  return {
    memberCount: circleParticipants.length,
    contributionAmount: CONTRIBUTION_AMOUNT,
    expectedAmount: circleParticipants.length * CONTRIBUTION_AMOUNT,
    active,
    history,
  };
}

async function closeMonthIfComplete(monthId: number) {
  const db = getDb();
  const month = await getMonthDetails(monthId);
  if (!month || month.status !== "open" || month.moneyFlowId) return false;
  if (!month.payments.length || month.payments.some((payment) => !payment.paid)) return false;

  const cycle = await ensureActiveCycle();
  const ownerName = month.rotationParticipant?.name ?? "صاحب الدور";
  const entry = await addMoneyFlowEntry({
    cycleId: cycle.id,
    participantId: month.rotationParticipantId ?? null,
    type: FLOW_TYPES.CONTRIBUTION_IN,
    amount: month.expectedAmount,
    title: `الجمعية من ${ownerName}`,
    description: `${month.hijriMonthName} ${month.hijriYear} - ${month.payments.length} مشاركين`,
    occurredAt: new Date(),
  });

  await db
    .update(charityMonths)
    .set({
      status: "closed",
      closedAt: new Date(),
      moneyFlowId: entry.id,
    })
    .where(eq(charityMonths.id, month.id));

  return true;
}

export const charityRouter = createRouter({
  publicSummary: publicQuery.query(getCharityPayload),
  adminSummary: adminQuery.query(getCharityPayload),
  setPayment: adminQuery
    .input(
      z.object({
        monthId: z.number(),
        participantId: z.number(),
        paid: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureSeed();
      const db = getDb();
      const month = await db.query.charityMonths.findFirst({
        where: eq(charityMonths.id, input.monthId),
      });
      if (!month) return { success: false, error: "NOT_FOUND" as const };
      if (month.status !== "open") return { success: false, error: "MONTH_CLOSED" as const };

      const payment = await db.query.charityMonthPayments.findFirst({
        where: and(
          eq(charityMonthPayments.monthId, input.monthId),
          eq(charityMonthPayments.participantId, input.participantId),
        ),
      });
      if (!payment) return { success: false, error: "PAYMENT_NOT_FOUND" as const };

      await db
        .update(charityMonthPayments)
        .set({
          paid: input.paid,
          paidAt: input.paid ? new Date() : null,
        })
        .where(eq(charityMonthPayments.id, payment.id));

      const closed = input.paid ? await closeMonthIfComplete(input.monthId) : false;
      return { success: true, closed };
    }),
});

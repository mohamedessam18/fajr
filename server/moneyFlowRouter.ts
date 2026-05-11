import { desc, eq } from "drizzle-orm";
import { adminQuery, createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { donations, fundCycles, moneyFlow, participants } from "../db/schema.js";
import { ensureActiveCycle, getCycleSummary } from "./lib/funds.js";
import { ensureSeed } from "./participantRouter.js";

async function buildLedger({ includeParticipantNames }: { includeParticipantNames: boolean }) {
  await ensureSeed();
  await ensureActiveCycle();
  const db = getDb();
  const cycles = await db.select().from(fundCycles).orderBy(desc(fundCycles.openedAt));
  const selectedCycles = cycles.length ? cycles : [];
  const summaries = await Promise.all(selectedCycles.map((cycle) => getCycleSummary(cycle.id)));

  const entries = await db
    .select({
      id: moneyFlow.id,
      cycleId: moneyFlow.cycleId,
      donationId: moneyFlow.donationId,
      participantId: moneyFlow.participantId,
      participantName: participants.name,
      donationTitle: donations.title,
      type: moneyFlow.type,
      amount: moneyFlow.amount,
      title: moneyFlow.title,
      description: moneyFlow.description,
      occurredAt: moneyFlow.occurredAt,
      createdAt: moneyFlow.createdAt,
    })
    .from(moneyFlow)
    .leftJoin(participants, eq(moneyFlow.participantId, participants.id))
    .leftJoin(donations, eq(moneyFlow.donationId, donations.id))
    .orderBy(desc(moneyFlow.occurredAt), desc(moneyFlow.id));

  return {
    cycles: summaries.map((summary) => ({
      ...summary.cycle,
      totalIn: summary.totalIn,
      totalOut: summary.totalOut,
      balance: summary.balance,
    })),
    entries: entries.map((entry) => ({
      ...entry,
      participantName: includeParticipantNames ? entry.participantName : null,
    })),
  };
}

export const moneyFlowRouter = createRouter({
  publicLedger: publicQuery.query(() => buildLedger({ includeParticipantNames: false })),
  adminLedger: adminQuery.query(() => buildLedger({ includeParticipantNames: true })),
});

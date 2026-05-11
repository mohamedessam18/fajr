import { and, desc, eq, sql } from "drizzle-orm";
import {
  fundCycles,
  moneyFlow,
  participants,
  type FundCycle,
  type InsertMoneyFlow,
} from "../../db/schema.js";
import { getDb } from "../queries/connection.js";

export const FLOW_TYPES = {
  OPENING_BALANCE: "opening_balance",
  CONTRIBUTION_IN: "contribution_in",
  DONATION_OUT: "donation_out",
  ADJUSTMENT_OUT: "adjustment_out",
} as const;

export type CycleSummary = {
  cycle: FundCycle;
  totalIn: number;
  totalOut: number;
  balance: number;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function ensureActiveCycle() {
  const db = getDb();
  const existing = await db.query.fundCycles.findFirst({
    where: eq(fundCycles.status, "active"),
    orderBy: desc(fundCycles.createdAt),
  });
  if (existing) return existing;

  const [{ totalCollected }] = await db
    .select({ totalCollected: sql<number>`coalesce(sum(${participants.paidAmount}), 0)` })
    .from(participants);

  const startingBalance = toNumber(totalCollected);
  const [cycle] = await db
    .insert(fundCycles)
    .values({
      title: "الدورة الحالية",
      status: "active",
      startingBalance,
    })
    .returning();

  if (startingBalance > 0) {
    await db.insert(moneyFlow).values({
      cycleId: cycle.id,
      type: FLOW_TYPES.OPENING_BALANCE,
      amount: startingBalance,
      title: "رصيد افتتاحي",
      description: "الرصيد الموجود قبل تفعيل سجل الفلوس",
    });
  }

  return cycle;
}

export async function getCycleSummary(cycleId?: number): Promise<CycleSummary> {
  const db = getDb();
  const cycle = cycleId
    ? await db.query.fundCycles.findFirst({ where: eq(fundCycles.id, cycleId) })
    : await ensureActiveCycle();

  if (!cycle) throw new Error("Cycle not found");

  const [{ totalIn }] = await db
    .select({
      totalIn: sql<number>`coalesce(sum(${moneyFlow.amount}), 0)`,
    })
    .from(moneyFlow)
    .where(
      and(
        eq(moneyFlow.cycleId, cycle.id),
        sql`${moneyFlow.type} in (${FLOW_TYPES.OPENING_BALANCE}, ${FLOW_TYPES.CONTRIBUTION_IN})`,
      ),
    );

  const [{ totalOut }] = await db
    .select({
      totalOut: sql<number>`coalesce(sum(${moneyFlow.amount}), 0)`,
    })
    .from(moneyFlow)
    .where(
      and(
        eq(moneyFlow.cycleId, cycle.id),
        sql`${moneyFlow.type} in (${FLOW_TYPES.DONATION_OUT}, ${FLOW_TYPES.ADJUSTMENT_OUT})`,
      ),
    );

  const income = toNumber(totalIn);
  const outcome = toNumber(totalOut);
  return {
    cycle,
    totalIn: income,
    totalOut: outcome,
    balance: income - outcome,
  };
}

export async function addMoneyFlowEntry(entry: Omit<InsertMoneyFlow, "cycleId"> & { cycleId?: number }) {
  const db = getDb();
  const cycle = entry.cycleId
    ? await db.query.fundCycles.findFirst({ where: eq(fundCycles.id, entry.cycleId) })
    : await ensureActiveCycle();
  if (!cycle) throw new Error("Cycle not found");

  const [created] = await db
    .insert(moneyFlow)
    .values({ ...entry, cycleId: cycle.id })
    .returning();

  return created;
}

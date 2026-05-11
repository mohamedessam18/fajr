import { z } from "zod";
import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { participants, missedRecords, settings } from "../db/schema.js";
import { eq } from "drizzle-orm";

const PARTICIPANT_DATA = [
  { name: "محمد عصام", missedCount: 3, paidAmount: 30, unpaidAmount: 0 },
  { name: "عمار ياسر", missedCount: 0, paidAmount: 0, unpaidAmount: 0 },
  { name: "محمد حامد", missedCount: 2, paidAmount: 20, unpaidAmount: 0 },
  { name: "زياد محمد", missedCount: 3, paidAmount: 30, unpaidAmount: 0 },
  { name: "محمد ايمن", missedCount: 2, paidAmount: 20, unpaidAmount: 0 },
  { name: "محمود عبد العليم", missedCount: 1, paidAmount: 10, unpaidAmount: 0 },
  { name: "اسامه زغابة", missedCount: 1, paidAmount: 10, unpaidAmount: 0 },
  { name: "وليد خالد", missedCount: 0, paidAmount: 0, unpaidAmount: 0 },
  { name: "احمد حمدان", missedCount: 2, paidAmount: 20, unpaidAmount: 0 },
  { name: "مصطفى عادل", missedCount: 0, paidAmount: 0, unpaidAmount: 0 },
];

const NAME_TO_IMAGE: Record<string, string> = {
  "محمد عصام": "/assets/mohamed essam.jpg",
  "عمار ياسر": "/assets/amar yasser.jpg",
  "محمد حامد": "/assets/mohamed hamed.jpg",
  "زياد محمد": "/assets/zyad mohamed.jpg",
  "محمد ايمن": "/assets/mohamed ayman.jpg",
  "محمود عبد العليم": "/assets/mahmoud abdelalem.jpg",
  "اسامه زغابة": "/assets/osama zaghaba.jpg",
  "وليد خالد": "/assets/waleed khaled.jpg",
  "احمد حمدان": "/assets/ahmed hemdan.jpg",
  "مصطفى عادل": "/assets/mostafa adel.jpg",
};

let seeded = false;

export async function ensureSeed() {
  if (seeded) return;
  seeded = true;
  const db = getDb();
  try {
    const existing = await db.select().from(participants);
    if (existing.length > 0) return;

    for (const p of PARTICIPANT_DATA) {
      await db.insert(participants).values({
        name: p.name,
        image: NAME_TO_IMAGE[p.name] || null,
        missedCount: p.missedCount,
        paidAmount: p.paidAmount,
        unpaidAmount: p.unpaidAmount,
      });
    }

    await db.insert(settings).values({
      key: "missed_fine_amount",
      value: "10",
    });
  } catch (e) {
    console.error("Auto-seed error:", e);
  }
}

export const participantRouter = createRouter({
  list: publicQuery.query(async () => {
    await ensureSeed();
    const db = getDb();
    const allParticipants = await db.select().from(participants);
    return allParticipants;
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureSeed();
      const db = getDb();
      const participant = await db.query.participants.findFirst({
        where: eq(participants.id, input.id),
      });
      if (!participant) return null;

      const records = await db
        .select()
        .from(missedRecords)
        .where(eq(missedRecords.participantId, input.id))
        .orderBy(missedRecords.createdAt);

      return { ...participant, missedRecords: records };
    }),

  stats: publicQuery.query(async () => {
    await ensureSeed();
    const db = getDb();
    const allParticipants = await db.select().from(participants);

    const totalCollected = allParticipants.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalUnpaid = allParticipants.reduce((sum, p) => sum + p.unpaidAmount, 0);
    const totalMissed = allParticipants.reduce((sum, p) => sum + p.missedCount, 0);
    const totalParticipants = allParticipants.length;

    return {
      totalCollected,
      totalUnpaid,
      totalMissed,
      totalParticipants,
    };
  }),
});

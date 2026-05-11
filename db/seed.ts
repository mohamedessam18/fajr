import { closeDb, getDb } from "../server/queries/connection";
import { missedRecords, participants, settings } from "./schema";

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

function getImageForName(name: string): string {
  const nameMap: Record<string, string> = {
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
  return nameMap[name] || "";
}

async function seed() {
  const db = getDb();

  console.log("Checking existing data...");

  let existingParticipants = await db.select().from(participants);

  if (existingParticipants.length > 0) {
    console.log(`Found ${existingParticipants.length} existing participants, keeping them...`);
  } else {
    console.log("Seeding participants...");

    for (const p of PARTICIPANT_DATA) {
      await db.insert(participants).values({
        name: p.name,
        image: getImageForName(p.name),
        missedCount: p.missedCount,
        paidAmount: p.paidAmount,
        unpaidAmount: p.unpaidAmount,
      });
      console.log(`  Added: ${p.name}`);
    }

    existingParticipants = await db.select().from(participants);
  }

  const existingSettings = await db.select().from(settings);
  if (existingSettings.length === 0) {
    console.log("Seeding settings...");
    await db.insert(settings).values({
      key: "missed_fine_amount",
      value: "10",
    });
    console.log("  Added: missed_fine_amount = 10");
  }

  const existingMissedRecords = await db.select().from(missedRecords);
  if (existingMissedRecords.length === 0) {
    console.log("Seeding missed records...");
    for (const participant of existingParticipants) {
      for (let i = 0; i < participant.missedCount; i += 1) {
        const alreadyPaid = i * 10 < participant.paidAmount;
        await db.insert(missedRecords).values({
          participantId: participant.id,
          date: `seeded-${i + 1}`,
          amount: 10,
          paid: alreadyPaid,
        });
      }
    }
    console.log("  Added missed records for current participants");
  }

  console.log("Seed completed successfully!");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });

import { relations } from "drizzle-orm";
import { participants, missedRecords } from "./schema.js";

export const participantsRelations = relations(participants, ({ many }) => ({
  missedRecords: many(missedRecords),
}));

export const missedRecordsRelations = relations(missedRecords, ({ one }) => ({
  participant: one(participants, {
    fields: [missedRecords.participantId],
    references: [participants.id],
  }),
}));

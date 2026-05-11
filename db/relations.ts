import { relations } from "drizzle-orm";
import {
  donationMedia,
  donations,
  fundCycles,
  charityMonthPayments,
  charityMonths,
  missedRecords,
  moneyFlow,
  participants,
} from "./schema.js";

export const participantsRelations = relations(participants, ({ many }) => ({
  missedRecords: many(missedRecords),
  moneyFlow: many(moneyFlow),
  charityPayments: many(charityMonthPayments),
  charityTurns: many(charityMonths),
}));

export const missedRecordsRelations = relations(missedRecords, ({ one }) => ({
  participant: one(participants, {
    fields: [missedRecords.participantId],
    references: [participants.id],
  }),
}));

export const fundCyclesRelations = relations(fundCycles, ({ many }) => ({
  donations: many(donations),
  moneyFlow: many(moneyFlow),
}));

export const donationsRelations = relations(donations, ({ one, many }) => ({
  cycle: one(fundCycles, {
    fields: [donations.cycleId],
    references: [fundCycles.id],
  }),
  media: many(donationMedia),
  moneyFlow: many(moneyFlow),
}));

export const donationMediaRelations = relations(donationMedia, ({ one }) => ({
  donation: one(donations, {
    fields: [donationMedia.donationId],
    references: [donations.id],
  }),
}));

export const moneyFlowRelations = relations(moneyFlow, ({ one }) => ({
  cycle: one(fundCycles, {
    fields: [moneyFlow.cycleId],
    references: [fundCycles.id],
  }),
  donation: one(donations, {
    fields: [moneyFlow.donationId],
    references: [donations.id],
  }),
  participant: one(participants, {
    fields: [moneyFlow.participantId],
    references: [participants.id],
  }),
}));

export const charityMonthsRelations = relations(charityMonths, ({ one, many }) => ({
  rotationParticipant: one(participants, {
    fields: [charityMonths.rotationParticipantId],
    references: [participants.id],
  }),
  moneyFlow: one(moneyFlow, {
    fields: [charityMonths.moneyFlowId],
    references: [moneyFlow.id],
  }),
  payments: many(charityMonthPayments),
}));

export const charityMonthPaymentsRelations = relations(charityMonthPayments, ({ one }) => ({
  month: one(charityMonths, {
    fields: [charityMonthPayments.monthId],
    references: [charityMonths.id],
  }),
  participant: one(participants, {
    fields: [charityMonthPayments.participantId],
    references: [participants.id],
  }),
}));

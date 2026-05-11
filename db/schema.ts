import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  image: text("image"),
  missedCount: integer("missed_count").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  unpaidAmount: integer("unpaid_amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

export const missedRecords = pgTable("missed_records", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 50 }).notNull(),
  amount: integer("amount").notNull().default(10),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MissedRecord = typeof missedRecords.$inferSelect;
export type InsertMissedRecord = typeof missedRecords.$inferInsert;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: varchar("value", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

export const fundCycles = pgTable("fund_cycles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  startingBalance: integer("starting_balance").notNull().default(0),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FundCycle = typeof fundCycles.$inferSelect;
export type InsertFundCycle = typeof fundCycles.$inferInsert;

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id")
    .notNull()
    .references(() => fundCycles.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  summary: varchar("summary", { length: 500 }),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  donatedAt: timestamp("donated_at").defaultNow().notNull(),
  published: boolean("published").notNull().default(true),
  closesCycle: boolean("closes_cycle").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = typeof donations.$inferInsert;

export const donationMedia = pgTable("donation_media", {
  id: serial("id").primaryKey(),
  donationId: integer("donation_id")
    .notNull()
    .references(() => donations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  pathname: text("pathname"),
  type: varchar("type", { length: 20 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  fileName: varchar("file_name", { length: 255 }),
  size: integer("size"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DonationMedia = typeof donationMedia.$inferSelect;
export type InsertDonationMedia = typeof donationMedia.$inferInsert;

export const moneyFlow = pgTable("money_flow", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id")
    .notNull()
    .references(() => fundCycles.id, { onDelete: "restrict" }),
  donationId: integer("donation_id").references(() => donations.id, {
    onDelete: "set null",
  }),
  participantId: integer("participant_id").references(() => participants.id, {
    onDelete: "set null",
  }),
  type: varchar("type", { length: 30 }).notNull(),
  amount: integer("amount").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MoneyFlow = typeof moneyFlow.$inferSelect;
export type InsertMoneyFlow = typeof moneyFlow.$inferInsert;

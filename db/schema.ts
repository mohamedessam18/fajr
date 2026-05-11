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

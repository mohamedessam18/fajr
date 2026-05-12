import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env.js";
import * as schema from "../../db/schema.js";
import * as relations from "../../db/relations.js";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let client: postgres.Sql | undefined;

export function getDb() {
  if (!instance) {
    client = postgres(env.databaseUrl, {
      prepare: false,
      max: 1,
      idle_timeout: 10,
      connect_timeout: 10,
    });
    instance = drizzle(client, {
      schema: fullSchema,
    });
  }
  return instance;
}

export async function closeDb() {
  await client?.end({ timeout: 5 });
  client = undefined;
  instance = undefined as unknown as typeof instance;
}

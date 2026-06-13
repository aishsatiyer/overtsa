import postgres from "postgres";
import { env } from "./env";

export const sql = postgres(env.supabaseDbUrl, {
  ssl: "require",
  max: 1
});

// Applies db/schema.sql to the Neon database and lists resulting tables.
// Idempotent; never prints the connection string.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

loadEnvFile(new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("NO_DATABASE_URL");
  process.exit(1);
}
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const sql = neon(url);

// Strip comment lines first, then split on statement boundaries.
const statements = schema
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
for (const statement of statements) {
  await sql.query(statement);
}
console.log("APPLIED", statements.length, "statements");

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
console.log("TABLES:", tables.map((t) => t.table_name).join(", "));

// Verifies the Neon connection with a real query. Reads DATABASE_URL from
// .env.local; never prints the connection string.
import { neon } from "@neondatabase/serverless";
import { loadEnvFile } from "node:process";

loadEnvFile(new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("NO_DATABASE_URL");
  process.exit(1);
}
const sql = neon(url);
const [row] = await sql`select current_database() as db, version() as version`;
console.log("CONNECTED db:", row.db);
console.log("SERVER:", row.version.split(" on ")[0]);

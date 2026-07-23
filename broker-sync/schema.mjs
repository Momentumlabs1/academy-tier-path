/**
 * schema.mjs — one-off diagnostic. Connects to the broker's SQL Server with the
 * same .env as sync.mjs and prints the REAL tables + column names, so we can map
 * sync.mjs's queries to their actual schema (they only sent a "skeleton").
 *
 * Usage on the VPS:  node schema.mjs
 * Safe: read-only, touches nothing.
 */
import "dotenv/config";
import sql from "mssql";

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env ${k}`); process.exit(1); }
  return v;
};

const MSSQL = {
  server: need("MSSQL_HOST"),
  port: Number(process.env.MSSQL_PORT || 1433),
  database: need("MSSQL_DB"),
  user: need("MSSQL_USER"),
  password: need("MSSQL_PASSWORD"),
  options: { encrypt: true, trustServerCertificate: process.env.MSSQL_TRUST_CERT === "1" },
  requestTimeout: 120_000,
  pool: { max: 2, min: 0 },
};

const pool = await sql.connect(MSSQL);
try {
  const cols = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
     ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`);

  const byTable = {};
  for (const r of cols.recordset) {
    const k = `${r.TABLE_SCHEMA}.${r.TABLE_NAME}`;
    (byTable[k] ??= []).push(`${r.COLUMN_NAME} [${r.DATA_TYPE}]`);
  }

  console.log(`\n================  TABLES: ${Object.keys(byTable).length}  ================`);
  for (const [t, c] of Object.entries(byTable)) {
    console.log(`\n=== ${t} (${c.length} cols) ===`);
    console.log(c.join(", "));
    // row count (best-effort)
    try {
      const cnt = await pool.request().query(`SELECT COUNT(*) AS n FROM ${t}`);
      console.log(`rows: ${cnt.recordset[0].n}`);
    } catch { /* view / perms */ }
  }
  console.log("\n================  END  ================");
} catch (e) {
  console.error("SCHEMA DUMP FAILED:", e.message);
} finally {
  await pool.close();
}

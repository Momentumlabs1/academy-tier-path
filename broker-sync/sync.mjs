/**
 * broker-sync — mirrors the external IB SQL Server DB (TradeQuo/QM) into
 * Supabase, then triggers the academy rollup (deposits → tiers, trades →
 * activity, partner attribution).
 *
 * Runs on a box with a STATIC IP that the broker has whitelisted (see README).
 * Safe to run repeatedly: clients/accounts are full upserts, trades are
 * incremental by CloseTime with an overlap window, the rollup is idempotent.
 *
 * Usage:  node sync.mjs           (one pass — schedule via cron)
 * Env:    see .env.example
 */
import "dotenv/config";
import sql from "mssql";
import { createClient } from "@supabase/supabase-js";

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env ${k} — see .env.example`); process.exit(1); }
  return v;
};

const MSSQL = {
  server: need("MSSQL_HOST"),
  port: Number(process.env.MSSQL_PORT || 1433),
  database: need("MSSQL_DB"),
  user: need("MSSQL_USER"),
  password: need("MSSQL_PASSWORD"),
  // TLS verified by default; set MSSQL_TRUST_CERT=1 only if the broker's
  // endpoint uses a self-signed certificate.
  options: { encrypt: true, trustServerCertificate: process.env.MSSQL_TRUST_CERT === "1" },
  requestTimeout: 300_000,
  pool: { max: 2, min: 0 },
};

const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const CHUNK = 500;             // rows per Supabase upsert
const PAGE = 5000;             // rows per MSSQL trades page
const OVERLAP_DAYS = 3;        // re-read window to catch late-arriving closes

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const ts = (v) => (v ? new Date(v).toISOString() : null);
const str = (v) => (v === null || v === undefined ? null : String(v));

async function upsertChunks(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(slice, { onConflict });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function syncClients(pool) {
  const rs = await pool.request().query(`
    SELECT Brand, FirstName, LastName, Country, ClientID, Email, ClientType,
           Direct_IB_ID, Direct_IB_Email, Registration_Date, First_Deposit_Date,
           CRM_Deposit_USD, CRM_Withdrawal_USD, Net_Deposit, FirstDepositAmount_USD,
           NotionalVolume_USD, IB_Rebates, Pnl_USD, Last_Trade_Date,
           utm_uri, utm_referrer, utm_campaign
      FROM dbo.clients`);
  const rows = rs.recordset.map((r) => ({
    client_id: str(r.ClientID),
    brand: str(r.Brand),
    first_name: str(r.FirstName),
    last_name: str(r.LastName),
    country: str(r.Country),
    email: str(r.Email),
    client_type: str(r.ClientType),
    direct_ib_id: str(r.Direct_IB_ID),
    direct_ib_email: str(r.Direct_IB_Email),
    registration_date: ts(r.Registration_Date),
    first_deposit_date: ts(r.First_Deposit_Date),
    crm_deposit_usd: num(r.CRM_Deposit_USD),
    crm_withdrawal_usd: num(r.CRM_Withdrawal_USD),
    net_deposit: num(r.Net_Deposit),
    first_deposit_amount_usd: num(r.FirstDepositAmount_USD),
    notional_volume_usd: num(r.NotionalVolume_USD),
    ib_rebates: num(r.IB_Rebates),
    pnl_usd: num(r.Pnl_USD),
    last_trade_date: ts(r.Last_Trade_Date),
    utm_uri: str(r.utm_uri),
    utm_referrer: str(r.utm_referrer),
    utm_campaign: str(r.utm_campaign),
    synced_at: new Date().toISOString(),
  })).filter((r) => r.client_id);
  await upsertChunks("broker_clients", rows, "client_id");
  return rows.length;
}

async function syncAccounts(pool) {
  const rs = await pool.request().query(`
    SELECT Brand, ClientID, Email, AccountNumber, Currency,
           Balance_Local, Balance_USD, AccountType, VolumeLots
      FROM dbo.mt_accounts`);
  const rows = rs.recordset.map((r) => ({
    account_number: str(r.AccountNumber),
    brand: str(r.Brand),
    client_id: str(r.ClientID),
    email: str(r.Email),
    currency: str(r.Currency),
    balance_local: num(r.Balance_Local),
    balance_usd: num(r.Balance_USD),
    account_type: str(r.AccountType),
    volume_lots: num(r.VolumeLots),
    synced_at: new Date().toISOString(),
  })).filter((r) => r.account_number);
  await upsertChunks("broker_accounts", rows, "account_number");
  return rows.length;
}

async function tradesWatermark() {
  const { data, error } = await supabase
    .from("broker_trades")
    .select("close_time")
    .order("close_time", { ascending: false })
    .limit(1);
  if (error) throw new Error(`watermark read failed: ${error.message}`);
  if (!data?.length || !data[0].close_time) return null; // empty → full backfill
  const wm = new Date(data[0].close_time);
  wm.setDate(wm.getDate() - OVERLAP_DAYS);
  return wm;
}

async function syncTrades(pool) {
  const since = await tradesWatermark();
  let offset = 0, total = 0;
  for (;;) {
    const req = pool.request();
    let where = "WHERE CloseTime IS NOT NULL";
    if (since) { req.input("since", sql.DateTime2, since); where += " AND CloseTime > @since"; }
    // Total, stable ordering: CloseTime alone is not unique (trades close in
    // bursts), so ties could be sliced differently between page queries and
    // rows silently skipped. TradePositionID as tiebreaker fixes that.
    const rs = await req.query(`
      SELECT TradePositionID, AccountNumber, Symbol, Direction, VolumeLotSize,
             OpenTime, OpenPrice, CloseTime, ClosePrice, Profit, StopLoss, TakeProfit
        FROM dbo.trades
        ${where}
        ORDER BY CloseTime ASC, TradePositionID ASC
        OFFSET ${offset} ROWS FETCH NEXT ${PAGE} ROWS ONLY`);
    const fetched = rs.recordset.length;
    const rows = rs.recordset.map((r) => ({
      trade_position_id: str(r.TradePositionID),
      account_number: str(r.AccountNumber),
      symbol: str(r.Symbol),
      direction: str(r.Direction),
      volume_lots: num(r.VolumeLotSize),
      open_time: ts(r.OpenTime),
      open_price: num(r.OpenPrice),
      close_time: ts(r.CloseTime),
      close_price: num(r.ClosePrice),
      profit: num(r.Profit),
      stop_loss: num(r.StopLoss),
      take_profit: num(r.TakeProfit),
      synced_at: new Date().toISOString(),
    })).filter((r) => r.trade_position_id);
    // Terminate on the RAW fetch count, not the post-filter count — a single
    // NULL TradePositionID must not end the loop and drop remaining pages.
    if (!fetched) break;
    if (rows.length) {
      await upsertChunks("broker_trades", rows, "trade_position_id");
      total += rows.length;
    }
    offset += fetched;
    if (fetched < PAGE) break;
  }
  return total;
}

async function main() {
  const t0 = Date.now();
  const pool = await sql.connect(MSSQL);
  try {
    const clients = await syncClients(pool);
    const accounts = await syncAccounts(pool);
    const trades = await syncTrades(pool);

    // Roll broker truth into the academy (tiers, activity, attribution).
    const { data: rollup, error } = await supabase.rpc("apply_broker_rollup");
    if (error) throw new Error(`apply_broker_rollup failed: ${error.message}`);

    console.log(JSON.stringify({
      ok: true,
      clients, accounts, trades,
      rollup,
      seconds: Math.round((Date.now() - t0) / 1000),
    }));
  } finally {
    await pool.close();
  }
}

main().catch((e) => { console.error("SYNC FAILED:", e.message); process.exit(1); });

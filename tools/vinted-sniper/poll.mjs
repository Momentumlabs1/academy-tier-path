#!/usr/bin/env node
/**
 * Vinted Sniper – Poller-Prototyp
 * --------------------------------
 * Liest docs/vinted-sniper/presets.json, pollt die interne Vinted-Web-API
 * (/api/v2/catalog/items, order=newest_first), dedupt lokal und pusht neue
 * Treffer (optional) per Telegram.
 *
 * BEWUSST simpel & ohne externe Dependencies (nur Node >= 18, native fetch).
 * Es ist ein PROTOTYP zum Prinzip-Zeigen – kein Hochlast-Setup.
 *
 * WICHTIG (ehrlich):
 *  - Vinted schützt sich mit DataDome. Von einer normalen HEIM-IP klappt das
 *    Polling meist; von Servern/Datacenter-IPs (Cloud) wirst du schnell
 *    geblockt (403 / leere Antworten). Dann brauchst du Residential-Proxys.
 *  - Am stabilsten: du gibst deinen echten Login-Cookie aus dem Browser mit
 *    (VINTED_COOKIE). Ohne Cookie versucht das Script eine anonyme Session zu
 *    bootstrappen – das kann von DataDome blockiert werden.
 *
 * Nutzung:
 *   cp .env.example .env    # Werte eintragen, dann:
 *   node poll.mjs --once            # ein einzelner Durchlauf (Test)
 *   node poll.mjs                   # Dauerbetrieb (Intervall aus .env)
 *   node poll.mjs --all-keywords    # jedes Keyword eines Presets abfragen
 *   node poll.mjs --preset fairycore-tops   # nur ein Preset
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRESETS_PATH = join(__dirname, "..", "..", "docs", "vinted-sniper", "presets.json");
const SEEN_PATH = join(__dirname, ".seen.json");

// ---------- .env laden (leichtgewichtig, ohne dotenv-Dependency) ----------
async function loadEnv() {
  const p = join(__dirname, ".env");
  if (!existsSync(p)) return;
  const txt = await readFile(p, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// ---------- CLI-Args ----------
const args = process.argv.slice(2);
const FLAG = (name) => args.includes(`--${name}`);
const OPT = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const CONFIG = {
  domain: () => process.env.VINTED_DOMAIN || "vinted.at",
  cookie: () => process.env.VINTED_COOKIE || "",
  intervalMs: () => Number(process.env.POLL_INTERVAL_MS || 30000),
  jitterMs: () => Number(process.env.POLL_JITTER_MS || 2000),
  perPage: () => Number(process.env.VINTED_PER_PAGE || 20),
  tgToken: () => process.env.TELEGRAM_BOT_TOKEN || "",
  tgChat: () => process.env.TELEGRAM_CHAT_ID || "",
  userAgent: () =>
    process.env.VINTED_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base) => base + Math.floor((base / 2) * (2 * fakeRandom() - 1));
// Deterministischer Pseudo-Zufall (kein Math.random noetig, reicht fuer Jitter)
let _seed = 987654321;
function fakeRandom() {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}

// ---------- Cookie-Bootstrap (anonyme Session), falls kein VINTED_COOKIE ----------
let sessionCookie = "";
async function ensureCookie() {
  if (CONFIG.cookie()) return CONFIG.cookie();
  if (sessionCookie) return sessionCookie;
  const url = `https://www.${CONFIG.domain()}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": CONFIG.userAgent(),
        "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const set =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
    sessionCookie = set
      .map((c) => c.split(";")[0])
      .filter((c) => /^(access_token_web|_vinted_fr_session|v_udt|anon_id|datadome)=/.test(c))
      .join("; ");
    if (!sessionCookie) {
      console.warn(
        "[warn] Konnte keine Session-Cookies bootstrappen (evtl. DataDome). " +
          "Bitte VINTED_COOKIE aus dem eingeloggten Browser setzen."
      );
    }
    return sessionCookie;
  } catch (e) {
    console.warn("[warn] Cookie-Bootstrap fehlgeschlagen:", e.message);
    return "";
  }
}

// ---------- Query bauen ----------
function buildUrl(preset, searchText) {
  const base = `https://www.${CONFIG.domain()}/api/v2/catalog/items`;
  const qs = new URLSearchParams();
  qs.set("page", "1");
  qs.set("per_page", String(CONFIG.perPage()));
  qs.set("order", preset.order || "newest_first");
  if (searchText) qs.set("search_text", searchText);
  if (preset.price_to != null) qs.set("price_to", String(preset.price_to));
  qs.set("currency", preset.currency || "EUR");
  for (const id of preset.catalog_ids || []) qs.append("catalog_ids", String(id));
  for (const id of preset.status_ids || []) qs.append("status_ids", String(id));
  return `${base}?${qs.toString()}`;
}

// ---------- Ein Request ----------
async function fetchItems(url, cookie) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": CONFIG.userAgent(),
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
      Referer: `https://www.${CONFIG.domain()}/catalog`,
      "X-Requested-With": "XMLHttpRequest",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (res.status === 403 || res.status === 401) {
    throw new Error(`Blockiert (${res.status}) – vermutlich DataDome/Cookie abgelaufen.`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

// ---------- Item normalisieren (API-Shape variiert historisch) ----------
function normalizeItem(it, domain) {
  const priceObj = it.price;
  let amount =
    typeof priceObj === "object" && priceObj ? Number(priceObj.amount) : Number(priceObj);
  if (Number.isNaN(amount)) amount = null;
  const currency =
    (typeof priceObj === "object" && priceObj && (priceObj.currency_code || priceObj.currency)) ||
    it.currency ||
    "EUR";
  const photo = it.photo?.url || it.photos?.[0]?.url || null;
  const url = it.url || `https://www.${domain}/items/${it.id}`;
  return {
    id: String(it.id),
    title: it.title || "(ohne Titel)",
    price: amount,
    currency,
    brand: it.brand_title || it.brand?.title || "",
    size: it.size_title || it.size || "",
    condition: it.status || it.condition || "",
    photo,
    url,
  };
}

// ---------- Filter (Preis/Zustand grob; Versand nicht im List-Endpoint) ----------
function passesFilters(item, preset) {
  if (item.price != null && preset.price_to != null && item.price > preset.price_to) return false;
  const neg = (globalNegatives || []).some((w) =>
    (item.title || "").toLowerCase().includes(w.toLowerCase())
  );
  if (neg) return false;
  return true;
}

// ---------- Telegram-Push (optional) ----------
async function pushTelegram(item, preset) {
  const token = CONFIG.tgToken();
  const chat = CONFIG.tgChat();
  if (!token || !chat) return false;
  const caption =
    `🧲 *${preset.label}*\n` +
    `*${escapeMd(item.title)}*\n` +
    `💶 ${item.price ?? "?"} ${item.currency}` +
    (item.brand ? ` · ${escapeMd(item.brand)}` : "") +
    (item.size ? ` · Gr. ${escapeMd(item.size)}` : "") +
    (item.condition ? ` · ${escapeMd(item.condition)}` : "") +
    `\n🎯 Resale ~${preset.resale_est ?? "?"} €\n${item.url}`;
  const api = `https://api.telegram.org/bot${token}/`;
  try {
    if (item.photo) {
      await fetch(api + "sendPhoto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, photo: item.photo, caption, parse_mode: "Markdown" }),
      });
    } else {
      await fetch(api + "sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: caption, parse_mode: "Markdown" }),
      });
    }
    return true;
  } catch (e) {
    console.warn("[warn] Telegram-Push fehlgeschlagen:", e.message);
    return false;
  }
}
const escapeMd = (s) => String(s).replace(/([*_`\[\]])/g, "\\$1");

// ---------- Seen-Store ----------
async function loadSeen() {
  if (!existsSync(SEEN_PATH)) return new Set();
  try {
    const arr = JSON.parse(await readFile(SEEN_PATH, "utf8"));
    return new Set(arr);
  } catch {
    return new Set();
  }
}
async function saveSeen(set) {
  // nur die letzten 5000 IDs behalten, damit die Datei nicht waechst
  const arr = [...set].slice(-5000);
  await writeFile(SEEN_PATH, JSON.stringify(arr));
}

let globalNegatives = [];

// ---------- Ein Durchlauf ----------
async function cycle(presets, seen) {
  const cookie = await ensureCookie();
  const onlyPreset = OPT("preset");
  const allKeywords = FLAG("all-keywords");
  let newHits = 0;

  for (const preset of presets) {
    if (onlyPreset && preset.id !== onlyPreset) continue;
    const keywords = preset.keywords?.length ? preset.keywords : [""];
    const toQuery = allKeywords ? keywords : [keywords[0]];

    for (const kw of toQuery) {
      const url = buildUrl(preset, kw);
      try {
        const rawItems = await fetchItems(url, cookie);
        for (const raw of rawItems) {
          const item = normalizeItem(raw, CONFIG.domain());
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          if (!passesFilters(item, preset)) continue;
          newHits++;
          console.log(
            `✅ [${preset.label}] ${item.title} – ${item.price} ${item.currency}` +
              `${item.brand ? " · " + item.brand : ""} → ${item.url}`
          );
          await pushTelegram(item, preset);
        }
      } catch (e) {
        console.warn(`[warn] ${preset.id} "${kw}": ${e.message}`);
      }
      await sleep(jitter(CONFIG.jitterMs()));
    }
  }
  await saveSeen(seen);
  return newHits;
}

// ---------- Main ----------
async function main() {
  await loadEnv();
  const cfg = JSON.parse(await readFile(PRESETS_PATH, "utf8"));
  globalNegatives = cfg.global_negative_terms || [];
  const presets = cfg.presets || [];
  const seen = await loadSeen();

  console.log(
    `Vinted Sniper Poller · Domain=${CONFIG.domain()} · Presets=${presets.length} · ` +
      `Cookie=${CONFIG.cookie() ? "gesetzt" : "bootstrap"} · ` +
      `Telegram=${CONFIG.tgToken() && CONFIG.tgChat() ? "an" : "aus"}`
  );

  if (FLAG("once")) {
    const n = await cycle(presets, seen);
    console.log(`Fertig. Neue Treffer: ${n}.`);
    return;
  }

  // Dauerbetrieb
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = await cycle(presets, seen);
    if (n > 0) console.log(`— Zyklus fertig, ${n} neue Treffer —`);
    await sleep(jitter(CONFIG.intervalMs()));
  }
}

main().catch((e) => {
  console.error("Fataler Fehler:", e);
  process.exit(1);
});

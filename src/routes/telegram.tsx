/**
 * /telegram — Website-Link, der ohne Zwischenseite in Cosmos Info-Kanal springt.
 *
 * WARUM (Diego, 11.09.): "Ich brauche einen Link fuer die TikTok-Story, direkt
 * zum Info-Kanal — aber es muss ein Link zu einer Website sein, .com muss drin
 * sein." TikTok nimmt in Story-Links keine t.me-Adressen, und t.me-Links werden
 * dort ohnehin oft gesperrt. Also: unsere Domain, die sofort weiterspringt.
 *
 * WIE
 * Ein kleines Skript im <head> laeuft, bevor die App ueberhaupt laedt:
 *   1. Klick festhalten (record_affiliate_click, keepalive — ueberlebt den
 *      Seitenwechsel), UTM-Parameter aus dem Link werden mitgenommen, ohne
 *      Parameter steht utm_source=telegram-link.
 *   2. Nach 120 ms location.replace auf den t.me-Einladungslink. Die t.me-Seite
 *      uebergibt selbst an die App — verlaesslicher aus In-App-Browsern
 *      (TikTok, Instagram) als ein tg://-Link, den diese oft schlucken.
 * Die Komponente darunter ist nur das Netz: ein Knopf, falls ein Browser das
 * Weiterleiten blockt, und derselbe Sprung fuer Navigation innerhalb der App.
 *
 * Zuordnung: der Klick zaehlt fuer das Haus (cosmos-candles). Das Zuordnungs-
 * Cookie eines Partners wird hier nicht angefasst.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { COSMOS_MASTER } from "@/lib/tenants";

const ZIEL = COSMOS_MASTER.telegramChannel;
const RPC = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/record_affiliate_click`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SPRUNG = `(function(){
  if (window.__ccSprung) return; window.__ccSprung = true;
  try {
    var q = new URLSearchParams(location.search), u = {};
    q.forEach(function (v, k) { if (k.indexOf("utm_") === 0 || k === "ref") u[k] = v; });
    if (!u.utm_source) u.utm_source = "telegram-link";
    fetch(${JSON.stringify(RPC)}, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: ${JSON.stringify(KEY)} },
      body: JSON.stringify({ p_slug: "cosmos-candles", p_referrer: document.referrer || null, p_utm: u, p_user_agent: navigator.userAgent.slice(0, 300) })
    }).catch(function () {});
  } catch (e) {}
  setTimeout(function () { location.replace(${JSON.stringify(ZIEL)}); }, 120);
})();`;

export const Route = createFileRoute("/telegram")({
  head: () => ({
    meta: [
      { title: "Cosmos Candles — Telegram" },
      { name: "robots", content: "noindex" },
    ],
    scripts: [{ children: SPRUNG }],
  }),
  component: TelegramSprung,
});

function TelegramSprung() {
  // Netz fuer den Fall, dass das Head-Skript nicht lief (Navigation in der App).
  useEffect(() => {
    const w = window as unknown as { __ccSprung?: boolean };
    if (w.__ccSprung) return;
    w.__ccSprung = true;
    const t = setTimeout(() => window.location.replace(ZIEL), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#05070e] px-6 text-center text-white">
      <div className="text-[15px] text-white/60">Opening Telegram…</div>
      <a
        href={ZIEL}
        className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#2AABEE] px-8 text-[15px] font-bold text-white"
      >
        Join Cosmos Candles on Telegram
      </a>
    </div>
  );
}

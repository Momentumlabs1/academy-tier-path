/**
 * /join — kurzer Deep Link für die Instagram-Bio: cosmos-candles.com/join springt direkt in Cosmos Earth Scan.
 *
 * WARUM (Diego, 25.10.2026): „wir brauchen dann halt aber auch einen Deep Link noch bei Insta am besten, wenn es
 * geht, in der Bio oder so. Und dann halt einen Deep Link, der auch cool aussieht“.
 *
 * WIE wie /telegram (11.09.): Ein Skript im <head> zählt den Klick (record_affiliate_click, keepalive) und springt
 * nach 120 ms per location.replace auf den t.me-Link. Die t.me-Seite übergibt aus In-App-Browsern (Instagram,
 * TikTok) verlässlicher an die Telegram-App als ein tg://-Link, den diese oft schlucken. Ohne UTM im Link liest
 * das Skript die Herkunft aus dem User-Agent (instagram / tiktok), sonst utm_source=join-link.
 * Die Seite darunter ist nur das Netz, falls ein Browser das Weiterleiten blockt: Cosmo und ein Knopf.
 *
 * ZIEL seit 25.10. ~17:40 der Nachrichten-Kanal Earth Scan statt Info: Das Instagram-Video endet mit „join my news
 * channel“, und Diego (16:55): „Der Info-Channel … hat ja was mit Trading zu tun. Das soll weiter unten kommen.“
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
const ZIEL = "https://t.me/+TQaO3Y-pTpVhYTU0"; // Cosmo Earth Scan
const RPC = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/record_affiliate_click`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SPRUNG = `(function(){
  if (window.__ccSprung) return; window.__ccSprung = true;
  try {
    var q = new URLSearchParams(location.search), u = {}, ua = navigator.userAgent;
    q.forEach(function (v, k) { if (k.indexOf("utm_") === 0 || k === "ref") u[k] = v; });
    if (!u.utm_source) u.utm_source = /Instagram/i.test(ua) ? "instagram" : (/musical_ly|TikTok|BytedanceWebview/i.test(ua) ? "tiktok" : "join-link");
    if (!u.utm_medium) u.utm_medium = "deeplink";
    fetch(${JSON.stringify(RPC)}, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: ${JSON.stringify(KEY)} },
      body: JSON.stringify({ p_slug: "cosmos-candles", p_referrer: document.referrer || null, p_utm: u, p_user_agent: ua.slice(0, 300) })
    }).catch(function () {});
  } catch (e) {}
  setTimeout(function () { location.replace(${JSON.stringify(ZIEL)}); }, 120);
})();`;

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Cosmo Earth Scan" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Join Cosmo Earth Scan" },
      { property: "og:description", content: "An alien scans your planet. Buried files and leaked deals, each with its source." },
      { property: "og:image", content: "https://cosmos-candles.com/cosmo/profil-pixel.png" },
      { name: "theme-color", content: "#070B1A" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Silkscreen:wght@700&display=swap" }],
    scripts: [{ children: SPRUNG }],
  }),
  component: JoinSprung,
});

function JoinSprung() {
  // Netz für Navigation innerhalb der App, wenn das Head-Skript nicht lief.
  useEffect(() => {
    const w = window as unknown as { __ccSprung?: boolean };
    if (w.__ccSprung) return;
    w.__ccSprung = true;
    const t = setTimeout(() => window.location.replace(ZIEL), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "24px 16px",
        textAlign: "center",
        color: "#EEF1F8",
        background: "radial-gradient(120% 60% at 50% 115%,#1B2F6B 0%,transparent 60%),#070B1A",
        fontFamily: '"Instrument Sans",system-ui,sans-serif',
      }}
    >
      <img
        src="/cosmo/profil-pixel.png"
        alt="Cosmo"
        width={120}
        height={120}
        style={{ imageRendering: "pixelated", filter: "drop-shadow(0 0 22px #FF3B4E40)" }}
      />
      <div style={{ fontSize: 15, color: "#929BB8" }}>Opening Telegram…</div>
      <a
        href={ZIEL}
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 54,
          padding: "0 26px",
          textDecoration: "none",
          color: "#EEF1F8",
          font: '700 19px/1 Silkscreen,system-ui,sans-serif',
          background: "linear-gradient(#2A0E16,#1A0A12)",
          boxShadow: "inset 0 0 0 3px #FF3B4E",
        }}
      >
        Join Earth Scan
      </a>
      <a href="/cosmo" style={{ fontSize: 13.5, color: "#AAB2CC" }}>
        All of Cosmo's links
      </a>
    </div>
  );
}

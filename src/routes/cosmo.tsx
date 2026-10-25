/**
 * /cosmo — Cosmos Link-Seite für die Instagram-Bio (eigener „Linktree“).
 *
 * WARUM (Diego, 25.10.2026): „Ja, dann bau einen eigenen Linktree … Es soll aber auch wirklich aussehen wie ein
 * Linktree und das Gefühl geben und intuitiv verständlich dann machen, was wir alles haben. Verstehst du? Und auch
 * im Vibe von Cosmo sein.“ Zu V.1: „Der Info-Channel … hat ja was mit Trading zu tun. Das soll weiter unten kommen.
 * Oben soll Cosmo Earth und YouTube verlinken wir und TikTok-mäßig und einen Link für Anfragen. … Und halt dann
 * eben, wie man Geld verdienen kann, mäßig. Halt nicht so in die Fresse, sonst wirkt es scheiße, weißt du.“
 *
 * WIE
 * Aufbau wie ein Linktree: Profilbild (dasselbe wie auf Instagram), Name, ein Satz, darunter Knöpfe.
 * Oben der Inhalt: Earth Scan groß, das Scan-Archiv, YouTube, TikTok und „Ask Cosmo“. Darunter leise, in einer
 * ruhigen Liste ohne Leuchtfarben, die Trading-Seite: Info-Kanal, Signals, Academy, Partner.
 * YouTube und TikTok erscheinen erst, wenn ihre Adresse unten eingetragen ist (nie auf ein fremdes Konto raten).
 * Beim Laden läuft einmal eine rote Scanlinie über die Seite (Cosmos Earth Scan), sonst ruhig.
 *
 * Telegram-Knöpfe sind normale t.me-Links: aus In-App-Browsern (Instagram, TikTok) übergibt die t.me-Seite
 * verlässlicher an die App als ein tg://-Link (Befund /telegram, 11.09.). Gezählt wird über
 * record_affiliate_click (Haus cosmos-candles): ein Aufruf beim Öffnen (utm_content=view) und einer je Knopf.
 *
 * Grenzen (Cosmo-Kern): Cosmo ist eine KI-Figur und steht so im Fuß, Trading-Risiko steht dabei, der
 * Signals-Kanal wird nicht als „free“ beworben (er kommt nach der Einzahlung beim Broker).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { TELEGRAM_ENTRY } from "@/lib/broker";

const INFO = TELEGRAM_ENTRY.url; // Cosmos-Candles-Info (öffentlich, @cosmoscandles), der Trading-Kanal
const EARTH_SCAN = "https://t.me/+TQaO3Y-pTpVhYTU0";
const SIGNALS_BOT = "https://t.me/cosmoscandlesbot?start=linkpage"; // bis Diegos eigenes Konto steht (C136)
const YOUTUBE = ""; // Cosmos Kanal, sobald die Adresse feststeht; leer = Knopf ausgeblendet
const TIKTOK = "";
const FRAGEN = "mailto:kontakt@momentumlabs.at?subject=Question%20for%20Cosmo"; // bis Diegos Telegram-Konto steht
const RPC = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/record_affiliate_click`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const Route = createFileRoute("/cosmo")({
  head: () => ({
    meta: [
      { title: "Cosmo · all links" },
      { name: "description", content: "Cosmo, the alien who scans your planet. Earth Scan, videos and a way to ask him anything." },
      { property: "og:title", content: "Cosmo, the alien who scans your planet" },
      { property: "og:description", content: "Earth Scan, Cosmo's videos and a way to ask him anything. All in one place." },
      { property: "og:image", content: "https://cosmos-candles.com/cosmo/profil.png" },
      { name: "theme-color", content: "#070B1A" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" },
    ],
  }),
  component: CosmoLinks,
});

/** Herkunft ohne UTM aus dem Browser lesen: Instagram und TikTok geben sich im User-Agent zu erkennen. */
function herkunft(): Record<string, string> {
  const u: Record<string, string> = {};
  try {
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (k.startsWith("utm_") || k === "ref") u[k] = v;
    });
    if (!u.utm_source) {
      const ua = navigator.userAgent;
      u.utm_source = /Instagram/i.test(ua) ? "instagram" : /musical_ly|TikTok|BytedanceWebview/i.test(ua) ? "tiktok" : "linkpage";
    }
  } catch {
    /* ohne Herkunft weiter */
  }
  return u;
}

function zaehlen(inhalt: string) {
  try {
    fetch(RPC, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify({
        p_slug: "cosmos-candles",
        p_referrer: document.referrer || null,
        p_utm: { ...herkunft(), utm_medium: "linkpage", utm_content: inhalt },
        p_user_agent: navigator.userAgent.slice(0, 300),
      }),
    }).catch(() => {});
  } catch {
    /* Zählen darf den Klick nie aufhalten */
  }
}

type Knopf = {
  id: string;
  href: string;
  titel: string;
  zeile: string;
  bild?: string;
  icon?: ReactNode;
  extern?: boolean;
};

const PIXEL = { shapeRendering: "crispEdges" as const };

/** 12×12-Pixel-Symbole, gezeichnet wie Cosmos Kunstpixel. */
const SymbolArchiv = (
  <svg viewBox="0 0 12 12" width="30" height="30" aria-hidden="true" style={PIXEL}>
    <path fill="#4C8DFF" d="M4 1h4v1h2v2h1v4h-1v2H8v1H4v-1H2V8H1V4h1V2h2z" />
    <path fill="#64FA64" d="M4 3h2v1h1v2H5V5H3V4h1zM7 7h2v1H8v1H6V8h1z" />
    <path fill="#FF3B4E" d="M0 6h12v1H0z" />
  </svg>
);
const SymbolYoutube = (
  <svg viewBox="0 0 12 12" width="30" height="30" aria-hidden="true" style={PIXEL}>
    <path fill="#FF3B4E" d="M2 2h8v1h1v6h-1v1H2V9H1V3h1z" />
    <path fill="#fff" d="M5 3h1v6H5zM6 4h1v4H6zM7 5h1v2H7z" />
  </svg>
);
const SymbolTiktok = (
  <svg viewBox="0 0 12 12" width="30" height="30" aria-hidden="true" style={PIXEL}>
    <path fill="#25F4EE" d="M6 0h2v7H7v2H6v1H3V9H2V7h1V6h3z" transform="translate(-1 1)" />
    <path fill="#FE2C55" d="M6 0h2v7H7v2H6v1H3V9H2V7h1V6h3z" transform="translate(1 1)" />
    <path fill="#fff" d="M6 0h2v7H7v2H6v1H3V9H2V7h1V6h3zM8 1h1v1h1v1H8z" transform="translate(0 1)" />
  </svg>
);
const SymbolFrage = (
  <svg viewBox="0 0 12 12" width="30" height="30" aria-hidden="true" style={PIXEL}>
    <path fill="#EEF1F8" d="M1 1h10v7H6v1H5v1H4v1H3V8H1z" />
    <path fill="#0E1530" d="M4 2h4v1h1v1H8v1H7v1H5V5h1V4h1V3H5v1H4zM5 6h2v1H5z" />
  </svg>
);
const SymbolAcademy = (
  <svg viewBox="0 0 12 12" width="22" height="22" aria-hidden="true" style={PIXEL}>
    <path fill="currentColor" d="M3 1h1v2H3zM3 9h1v2H3zM2 3h3v6H2zM8 2h1v2H8zM8 7h1v3H8zM7 4h3v3H7z" />
  </svg>
);
const SymbolPartner = (
  <svg viewBox="0 0 12 12" width="22" height="22" aria-hidden="true" style={PIXEL}>
    <path fill="currentColor" d="M4 1h4v1h1v1h1v6H9v1H8v1H4v-1H3V9H2V3h1V2h1zM5 3v1H4v4h1v1h2V8h1V4H7V3z" />
    <path fill="currentColor" d="M5 5h2v2H5z" />
  </svg>
);

/** Oben: Cosmos Inhalt. YouTube und TikTok nur mit eingetragener Adresse. */
const OBEN: Knopf[] = [
  {
    id: "scan-archiv",
    href: "/scan",
    titel: "Watch every scan",
    zeile: "The whole Earth Scan archive, each one as a clip.",
    icon: SymbolArchiv,
  },
  ...(YOUTUBE
    ? [{ id: "youtube", href: YOUTUBE, titel: "Cosmo on YouTube", zeile: "Watch Cosmo's videos.", icon: SymbolYoutube, extern: true }]
    : []),
  ...(TIKTOK
    ? [{ id: "tiktok", href: TIKTOK, titel: "Cosmo on TikTok", zeile: "Cosmo's short clips.", icon: SymbolTiktok, extern: true }]
    : []),
  {
    id: "fragen",
    href: FRAGEN,
    titel: "Ask Cosmo something",
    zeile: "Questions, ideas or business. A human on the team reads it.",
    icon: SymbolFrage,
  },
];

/** Unten, leise: die Trading-Seite. */
const TRADING: Knopf[] = [
  {
    id: "info",
    href: INFO,
    titel: "Trading channel",
    zeile: "Free on Telegram. Gold and NASDAQ, live.",
    bild: "/cosmo/kanal-info-mini.png",
    extern: true,
  },
  {
    id: "signals",
    href: SIGNALS_BOT,
    titel: "Cosmo's signals",
    zeile: "No fees, no subscription.",
    bild: "/cosmo/kanal-signals-mini.png",
    extern: true,
  },
  {
    id: "academy",
    href: "/?utm_source=linkpage&utm_medium=cosmo",
    titel: "Learn to trade",
    zeile: "Lessons, a mentor and a live desk.",
    icon: SymbolAcademy,
  },
  {
    id: "partner",
    href: "/partner-program",
    titel: "Partner program",
    zeile: "Bring traders, get paid for it.",
    icon: SymbolPartner,
  },
];

function aussen(k: Knopf) {
  return k.extern ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function LinkKnopf({ k }: { k: Knopf }) {
  return (
    <a className="lt-knopf" href={k.href} onClick={() => zaehlen(k.id)} {...aussen(k)}>
      <span className="lt-bild">{k.bild ? <img src={k.bild} alt="" width={44} height={44} /> : k.icon}</span>
      <span className="lt-text">
        <span className="lt-titel">{k.titel}</span>
        <span className="lt-zeile">{k.zeile}</span>
      </span>
    </a>
  );
}

function LeiseZeile({ k }: { k: Knopf }) {
  return (
    <a className="lt-leise" href={k.href} onClick={() => zaehlen(k.id)} {...aussen(k)}>
      <span className="lt-mini">{k.bild ? <img src={k.bild} alt="" width={28} height={28} /> : k.icon}</span>
      <span className="lt-text">
        <span className="lt-leise-titel">{k.titel}</span>
        <span className="lt-leise-zeile">{k.zeile}</span>
      </span>
    </a>
  );
}

function CosmoLinks() {
  const [geteilt, setGeteilt] = useState(false);

  useEffect(() => {
    zaehlen("view");
  }, []);

  async function teilen() {
    const url = "https://cosmos-candles.com/cosmo";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cosmo, the alien who scans your planet", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setGeteilt(true);
      setTimeout(() => setGeteilt(false), 1800);
    } catch {
      /* Teilen abgebrochen */
    }
  }

  return (
    <div className="lt">
      <style>{CSS}</style>
      <div className="lt-scan" aria-hidden="true" />
      <main className="lt-spalte">
        <button type="button" className="lt-teilen" onClick={teilen} aria-label="Share this page">
          <svg viewBox="0 0 12 12" width="18" height="18" aria-hidden="true" style={PIXEL}>
            <path fill="currentColor" d="M8 1h3v3H8zM1 5h3v3H1zM8 8h3v3H8zM4 5h1V4h1V3h2v1H7v1H6v1H5v1H4zM4 7h1v1h1v1h1v1h1v1H6V9H5V8H4z" />
          </svg>
          {geteilt ? "Copied" : "Share"}
        </button>

        <header className="lt-kopf">
          <div className="lt-profil">
            <img src="/cosmo/profil.png" alt="Cosmo, a blue pixel alien in his scout probe" width={128} height={128} />
          </div>
          <h1>Cosmo</h1>
          <p className="lt-bio">Alien in a scout probe. I scan your planet and tell you what I find.</p>
        </header>

        <a className="lt-haupt" href={EARTH_SCAN} target="_blank" rel="noopener noreferrer" onClick={() => zaehlen("earth-scan")}>
          <span className="lt-bild">
            <img src="/cosmo/kanal-news-mini.png" alt="" width={52} height={52} />
          </span>
          <span className="lt-text">
            <span className="lt-titel">Cosmo Earth Scan</span>
            <span className="lt-zeile">Free on Telegram. Buried files and leaked deals, each with its source.</span>
          </span>
        </a>

        <div className="lt-liste">
          {OBEN.map((k) => (
            <LinkKnopf key={k.id} k={k} />
          ))}
        </div>

        <section className="lt-trading" aria-labelledby="lt-trading-titel">
          <h2 id="lt-trading-titel">Cosmo also trades</h2>
          {TRADING.map((k) => (
            <LeiseZeile key={k.id} k={k} />
          ))}
        </section>

        <footer className="lt-fuss">
          <p>Cosmo is an AI character. Trading carries risk of loss, and nothing here is financial advice.</p>
          <p>
            <a href="/impressum">Impressum</a>
            <a href="/datenschutz">Privacy</a>
          </p>
        </footer>
      </main>
    </div>
  );
}

/* Treppenecken wie Kunstpixel: 4 px Stufen statt Rundung. */
const STUFEN =
  "polygon(0 8px,4px 8px,4px 4px,8px 4px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 4px,calc(100% - 4px) 4px,calc(100% - 4px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 4px) calc(100% - 8px),calc(100% - 4px) calc(100% - 4px),calc(100% - 8px) calc(100% - 4px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 4px),4px calc(100% - 4px),4px calc(100% - 8px),0 calc(100% - 8px))";

const CSS = `
.lt{--nacht:#070B1A;--tafel:#0E1530;--tafel2:#141D3E;--kante:#2A3563;--weiss:#EEF1F8;--grau:#929BB8;
  --rot:#FF3B4E;--blau:#4C8DFF;--gelb:#F6D648;
  position:relative;min-height:100vh;color:var(--weiss);font-family:"Instrument Sans",system-ui,sans-serif;
  background:
    radial-gradient(1px 1px at 12% 18%,#fff8 50%,transparent 51%),
    radial-gradient(1px 1px at 82% 9%,#fff6 50%,transparent 51%),
    radial-gradient(1.5px 1.5px at 66% 34%,#fff5 50%,transparent 51%),
    radial-gradient(1px 1px at 24% 61%,#fff5 50%,transparent 51%),
    radial-gradient(1.5px 1.5px at 90% 72%,#fff6 50%,transparent 51%),
    radial-gradient(1px 1px at 8% 88%,#fff4 50%,transparent 51%),
    radial-gradient(120% 60% at 50% 115%,#1B2F6B 0%,transparent 60%),
    var(--nacht);
  overflow-x:hidden}
.lt::after{content:"";position:fixed;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)}
.lt-spalte{position:relative;z-index:1;max-width:460px;margin:0 auto;padding:20px 16px 40px}
.lt-teilen{position:absolute;top:16px;right:16px;display:inline-flex;align-items:center;gap:6px;
  font:500 13px/1 Silkscreen,system-ui,sans-serif;color:var(--weiss);background:var(--tafel);
  border:2px solid var(--kante);padding:8px 10px;cursor:pointer;clip-path:${STUFEN}}
.lt-teilen:hover{background:var(--tafel2)}
.lt-kopf{text-align:center;padding-top:28px}
.lt-profil{width:128px;height:128px;margin:0 auto;border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 3px var(--nacht),0 0 0 5px #4C8DFF66,0 0 32px #4C8DFF40}
.lt-profil img{display:block;width:100%;height:100%;image-rendering:auto}
.lt-kopf h1{font:700 32px/1.05 Silkscreen,system-ui,sans-serif;margin:16px 0 2px;letter-spacing:.02em}
.lt-bio{margin:10px auto 22px;max-width:30ch;font-size:16px;line-height:1.45;color:#D6DBEA}
.lt-haupt,.lt-knopf{position:relative;display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--weiss);
  clip-path:${STUFEN};transition:transform .12s steps(2);isolation:isolate}
.lt-haupt::before,.lt-knopf::before{content:"";position:absolute;z-index:-1;inset:var(--rand);clip-path:${STUFEN};background:var(--innen)}
.lt-haupt{--rand:3px;--innen:linear-gradient(#2A0E16,#1A0A12);padding:14px 14px;min-height:84px;background:var(--rot)}
.lt-haupt .lt-titel{font-size:17px}
.lt-haupt .lt-zeile{color:#F7C3CA}
.lt-haupt .lt-bild img{width:52px;height:52px}
.lt-haupt:hover,.lt-knopf:hover{transform:translateY(-2px)}
.lt-haupt:active,.lt-knopf:active{transform:translateY(1px)}
.lt-liste{display:grid;gap:12px;margin-top:12px}
.lt-knopf{--rand:2px;--innen:var(--tafel);padding:12px 14px;min-height:70px;background:#3A4780}
.lt-knopf:hover{--innen:var(--tafel2)}
.lt-bild{flex:none;display:grid;place-items:center;width:52px;height:52px}
.lt-bild img{display:block;width:44px;height:44px;border-radius:50%}
.lt-text{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.lt-titel{font:400 16px/1.2 Silkscreen,system-ui,sans-serif;letter-spacing:.01em}
.lt-zeile{font-size:13.5px;line-height:1.35;color:var(--grau)}
/* Trading leise: eine ruhige Liste, kleine Bilder, keine Leuchtfarben. */
.lt-trading{margin-top:36px;padding-top:6px;border-top:2px dashed #222B52}
.lt-trading h2{font:400 13px/1 Silkscreen,system-ui,sans-serif;color:#7D86A3;margin:14px 2px 6px;letter-spacing:.02em}
.lt-leise{display:flex;align-items:center;gap:12px;padding:10px 4px;text-decoration:none;color:var(--weiss);
  border-bottom:1px solid #1A2244}
.lt-leise:last-child{border-bottom:0}
.lt-leise:hover .lt-leise-titel{text-decoration:underline;text-underline-offset:3px}
.lt-mini{flex:none;display:grid;place-items:center;width:32px;height:32px;color:#8E9AC4}
.lt-mini img{display:block;width:28px;height:28px;border-radius:50%;opacity:.85}
.lt-leise-titel{font-size:14.5px;font-weight:600;color:#C9CFE2}
.lt-leise-zeile{font-size:12.5px;line-height:1.35;color:#7D86A3}
.lt-fuss{margin-top:30px;text-align:center;font-size:12.5px;line-height:1.5;color:#7D86A3}
.lt-fuss p{margin:0 auto 8px;max-width:38ch}
.lt-fuss a{color:#AAB2CC;margin:0 8px}
.lt a:focus-visible,.lt button:focus-visible{outline:3px solid var(--gelb);outline-offset:3px}
/* Cosmos Scan beim Öffnen: eine rote Linie fährt einmal von oben nach unten und legt die Seite frei. */
.lt-scan{position:fixed;left:0;right:0;top:0;height:3px;z-index:3;pointer-events:none;background:var(--rot);
  box-shadow:0 0 12px 2px #FF3B4E99;animation:scanlauf .6s steps(16) both,weg .15s linear .6s both}
.lt-spalte{animation:freilegen .6s steps(16) both}
@keyframes scanlauf{from{transform:translateY(0)}to{transform:translateY(100vh)}}
@keyframes weg{to{opacity:0}}
@keyframes freilegen{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@media (prefers-reduced-motion:reduce){.lt-scan{display:none}.lt-spalte{animation:none}
  .lt-haupt,.lt-knopf{transition:none}}
@media (max-width:360px){.lt-titel{font-size:14px}.lt-haupt .lt-titel{font-size:15px}}
`;

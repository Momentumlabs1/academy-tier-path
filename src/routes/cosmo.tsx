/**
 * /cosmo — Cosmos Link-Seite für die Instagram-Bio (eigener „Linktree“).
 *
 * WARUM (Diego, 25.10.2026): „Ja, dann bau einen eigenen Linktree … Es soll aber auch wirklich aussehen wie ein
 * Linktree und das Gefühl geben und intuitiv verständlich dann machen, was wir alles haben. Verstehst du? Und auch
 * im Vibe von Cosmo sein.“ Davor: „oben halt Informationen … einfach die Infogruppe halt und halt cool gebrandet
 * und unten dann Geld verdienen. Möglichkeiten.“
 *
 * WIE
 * Aufbau wie ein Linktree: Profilbild, Name, ein Satz, darunter Knöpfe. Ganz oben groß die Info-Gruppe, dann
 * Earth Scan und das Scan-Archiv, unten „Trade with Cosmo“ (Signals über den Setter-Bot, Academy, Partner).
 * Jeder Kanal zeigt sein eigenes Telegram-Profilbild (grün Info, rot Earth Scan, blau Signals), damit man ihn
 * in Telegram wiedererkennt. Beim Laden läuft einmal eine Scanlinie über die Seite (Cosmos Scan), sonst ruhig.
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

const INFO = TELEGRAM_ENTRY.url; // Cosmos-Candles-Info (öffentlich, @cosmoscandles)
const EARTH_SCAN = "https://t.me/+TQaO3Y-pTpVhYTU0";
const SIGNALS_BOT = "https://t.me/cosmoscandlesbot?start=linkpage"; // landet als setter_leads.source = linkpage
const RPC = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/record_affiliate_click`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const Route = createFileRoute("/cosmo")({
  head: () => ({
    meta: [
      { title: "Cosmo · all links" },
      { name: "description", content: "Cosmo, the alien trader. Join the info channel, the Earth Scan and the academy." },
      { property: "og:title", content: "Cosmo, the alien trader" },
      { property: "og:description", content: "Info channel, Earth Scan, signals and academy. All in one place." },
      { property: "og:image", content: "https://cosmos-candles.com/cosmo/kanal-info.png" },
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
  farbe: "gruen" | "rot" | "blau" | "gelb" | "grau";
  extern?: boolean;
};

const PIXEL = { shapeRendering: "crispEdges" as const };

/** 12×12-Pixel-Symbole, gezeichnet wie Cosmos Kunstpixel. */
const SymbolArchiv = (
  <svg viewBox="0 0 12 12" width="28" height="28" aria-hidden="true" style={PIXEL}>
    <path fill="currentColor" d="M1 2h10v8H1z" />
    <polygon fill="#0E1530" points="4.5,4 8.5,6 4.5,8" />
  </svg>
);
const SymbolAcademy = (
  <svg viewBox="0 0 12 12" width="28" height="28" aria-hidden="true" style={PIXEL}>
    <path fill="currentColor" d="M3 1h1v2H3zM3 9h1v2H3zM2 3h3v6H2zM8 2h1v2H8zM8 7h1v3H8zM7 4h3v3H7z" />
  </svg>
);
const SymbolPartner = (
  <svg viewBox="0 0 12 12" width="28" height="28" aria-hidden="true" style={PIXEL}>
    <path fill="currentColor" d="M4 1h4v1h1v1h1v6H9v1H8v1H4v-1H3V9H2V3h1V2h1zM5 3v1H4v4h1v1h2V8h1V4H7V3z" />
    <path fill="currentColor" d="M5 5h2v2H5z" />
  </svg>
);

const OBEN: Knopf[] = [
  {
    id: "earth-scan",
    href: EARTH_SCAN,
    titel: "Cosmo Earth Scan",
    zeile: "Buried files and leaked deals. Every scan with its source.",
    bild: "/cosmo/kanal-news-mini.png",
    farbe: "rot",
    extern: true,
  },
  {
    id: "scan-archiv",
    href: "/scan",
    titel: "Watch every scan",
    zeile: "The whole Earth Scan archive, each one as a clip.",
    icon: SymbolArchiv,
    farbe: "rot",
  },
];

const GELD: Knopf[] = [
  {
    id: "signals",
    href: SIGNALS_BOT,
    titel: "Get Cosmo's signals",
    zeile: "No fees, no subscription. Cosmo sets you up in a short chat.",
    bild: "/cosmo/kanal-signals-mini.png",
    farbe: "blau",
    extern: true,
  },
  {
    id: "academy",
    href: "/?utm_source=linkpage&utm_medium=cosmo",
    titel: "Learn to trade",
    zeile: "Lessons, a mentor and a live desk. Your money stays in your account.",
    icon: SymbolAcademy,
    farbe: "blau",
  },
  {
    id: "partner",
    href: "/partner-program",
    titel: "Earn as a partner",
    zeile: "Bring traders to Cosmo and get paid for it.",
    icon: SymbolPartner,
    farbe: "gelb",
  },
];

function LinkKnopf({ k }: { k: Knopf }) {
  return (
    <a
      className={`lt-knopf ${k.farbe}`}
      href={k.href}
      onClick={() => zaehlen(k.id)}
      {...(k.extern ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span className="lt-bild">{k.bild ? <img src={k.bild} alt="" width={44} height={44} /> : k.icon}</span>
      <span className="lt-text">
        <span className="lt-titel">{k.titel}</span>
        <span className="lt-zeile">{k.zeile}</span>
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
        await navigator.share({ title: "Cosmo, the alien trader", url });
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
            <img src="/cosmo/kanal-info.png" alt="Cosmo, a blue pixel alien in his scout probe" width={128} height={128} />
          </div>
          <h1>Cosmo</h1>
          <p className="lt-bio">Alien trader. I scan your planet and its markets, and tell you what I find.</p>
        </header>

        <a className="lt-haupt" href={INFO} target="_blank" rel="noopener noreferrer" onClick={() => zaehlen("info")}>
          <span className="lt-bild">
            <img src="/cosmo/kanal-info-mini.png" alt="" width={52} height={52} />
          </span>
          <span className="lt-text">
            <span className="lt-titel">Join my info channel</span>
            <span className="lt-zeile">Free on Telegram. Gold and NASDAQ, traded live by a real desk.</span>
          </span>
        </a>

        <div className="lt-liste">
          {OBEN.map((k) => (
            <LinkKnopf key={k.id} k={k} />
          ))}
        </div>

        <h2 className="lt-abschnitt">Trade with Cosmo</h2>
        <div className="lt-liste">
          {GELD.map((k) => (
            <LinkKnopf key={k.id} k={k} />
          ))}
        </div>

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
  --gruen:#64FA64;--rot:#FF3B4E;--blau:#4C8DFF;--gelb:#F6D648;
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
.lt-profil{width:128px;height:128px;margin:0 auto;border-radius:50%;overflow:hidden;box-shadow:0 0 30px #64FA6438}
.lt-profil img{display:block;width:100%;height:100%;image-rendering:auto}
.lt-kopf h1{font:700 32px/1.05 Silkscreen,system-ui,sans-serif;margin:16px 0 2px;letter-spacing:.02em}
.lt-bio{margin:10px auto 22px;max-width:30ch;font-size:16px;line-height:1.45;color:#D6DBEA}
.lt-haupt,.lt-knopf{position:relative;display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--weiss);
  clip-path:${STUFEN};transition:transform .12s steps(2)}
.lt-haupt,.lt-knopf{isolation:isolate}
.lt-haupt::before,.lt-knopf::before{content:"";position:absolute;z-index:-1;inset:var(--rand);clip-path:${STUFEN};background:var(--innen)}
.lt-haupt{--rand:3px;--innen:linear-gradient(#123018,#0C1F12);padding:14px 14px;min-height:84px;background:var(--gruen)}
.lt-haupt .lt-titel{font-size:17px}
.lt-haupt .lt-zeile{color:#C6F5C6}
.lt-haupt .lt-bild img{width:52px;height:52px}
.lt-haupt:hover,.lt-knopf:hover{transform:translateY(-2px)}
.lt-haupt:active,.lt-knopf:active{transform:translateY(1px)}
.lt-liste{display:grid;gap:12px;margin-top:12px}
.lt-knopf{--rand:2px;--innen:var(--tafel);padding:12px 14px;min-height:70px;background:var(--kante)}
.lt-knopf:hover{--innen:var(--tafel2)}
.lt-knopf.rot{background:#FF3B4E99}
.lt-knopf.blau{background:#4C8DFF99}
.lt-knopf.gelb{background:#F6D64899}
.lt-knopf.rot .lt-bild{color:var(--rot)}
.lt-knopf.blau .lt-bild{color:var(--blau)}
.lt-knopf.gelb .lt-bild{color:var(--gelb)}
.lt-bild{flex:none;display:grid;place-items:center;width:52px;height:52px}
.lt-bild img{display:block;width:44px;height:44px;border-radius:50%}
.lt-text{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.lt-titel{font:400 16px/1.2 Silkscreen,system-ui,sans-serif;letter-spacing:.01em}
.lt-zeile{font-size:13.5px;line-height:1.35;color:var(--grau)}
.lt-abschnitt{font:700 15px/1 Silkscreen,system-ui,sans-serif;color:var(--grau);margin:30px 2px 0;
  display:flex;align-items:center;gap:10px}
.lt-abschnitt::after{content:"";flex:1;height:2px;background:repeating-linear-gradient(90deg,var(--kante) 0 4px,transparent 4px 8px)}
.lt-fuss{margin-top:34px;text-align:center;font-size:12.5px;line-height:1.5;color:#7D86A3}
.lt-fuss p{margin:0 auto 8px;max-width:38ch}
.lt-fuss a{color:#AAB2CC;margin:0 8px}
.lt a:focus-visible,.lt button:focus-visible{outline:3px solid var(--gelb);outline-offset:3px}
/* Cosmos Scan beim Öffnen: eine Linie fährt einmal von oben nach unten und legt die Seite frei. */
.lt-scan{position:fixed;left:0;right:0;top:0;height:3px;z-index:3;pointer-events:none;background:var(--gruen);
  box-shadow:0 0 12px 2px #64FA6499;animation:scanlauf .6s steps(16) both,weg .15s linear .6s both}
.lt-spalte{animation:freilegen .6s steps(16) both}
@keyframes scanlauf{from{transform:translateY(0)}to{transform:translateY(100vh)}}
@keyframes weg{to{opacity:0}}
@keyframes freilegen{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@media (prefers-reduced-motion:reduce){.lt-scan{display:none}.lt-spalte{animation:none}
  .lt-haupt,.lt-knopf{transition:none}}
@media (max-width:360px){.lt-titel{font-size:14px}.lt-haupt .lt-titel{font-size:15px}}
`;

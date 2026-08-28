/**
 * Smart Website→Telegram handoff.
 *
 * A bare t.me link is the leakiest step of the whole funnel: on mobile it
 * detours through a browser tab, and without the app installed it strands the
 * member on Telegram's download page — nobody comes back from there.
 *
 * So: open the APP directly via tg:// deep link (no tab, no popup blocker —
 * we navigate, external schemes never unload our page). Whether the app took
 * over is observable: the page loses visibility. If it doesn't within the
 * grace period, the member has no Telegram — that's when the caller shows an
 * inline fallback with the right store button and the t.me link as last resort.
 */
import { ArrowUpRight, Send } from "lucide-react";

/** t.me URL → tg:// deep link. Handles +invite, joinchat and bot?start=. */
export function toDeepLink(httpsUrl: string): string | null {
  try {
    const u = new URL(httpsUrl);
    if (!/(^|\.)t\.me$/.test(u.hostname)) return null;
    const path = u.pathname.replace(/^\/+/, "");
    if (path.startsWith("+")) return `tg://join?invite=${path.slice(1)}`;
    if (path.startsWith("joinchat/")) return `tg://join?invite=${path.split("/")[1]}`;
    const name = path.split("/")[0];
    if (!name) return null;
    const start = u.searchParams.get("start");
    return `tg://resolve?domain=${name}${start ? `&start=${encodeURIComponent(start)}` : ""}`;
  } catch {
    return null;
  }
}

/**
 * Try to open the Telegram app. Resolves true if the app visibly took over,
 * false if nothing happened (no app → show the fallback).
 */
export function openTelegramApp(httpsUrl: string, graceMs = 1800): Promise<boolean> {
  return new Promise((resolve) => {
    const deep = toDeepLink(httpsUrl);
    if (!deep) {
      window.open(httpsUrl, "_blank", "noopener");
      resolve(true);
      return;
    }
    let settled = false;
    const done = (opened: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("blur", onHide);
      resolve(opened);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" || !document.hasFocus()) done(true);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("blur", onHide);
    setTimeout(() => done(false), graceMs);
    window.location.href = deep;
  });
}

type Platform = "ios" | "android" | "desktop";
export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const STORES: Record<Platform, { label: string; url: string }> = {
  ios: { label: "Get Telegram from the App Store", url: "https://apps.apple.com/app/telegram-messenger/id686449807" },
  android: { label: "Get Telegram on Google Play", url: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  desktop: { label: "Download Telegram for your computer", url: "https://desktop.telegram.org" },
};

/**
 * Inline fallback when the app didn't open: a preview of what's waiting in the
 * group (so the install feels worth it), the right store button, and the plain
 * t.me link as an escape hatch. No dead ends.
 */
export function TelegramFallback({ url, onRetry }: { url: string; onRetry: () => void }) {
  const store = STORES[detectPlatform()];
  return (
    <div className="mt-4 rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2AABEE]">
          <Send className="h-5 w-5 -translate-x-px text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold">Almost there — you just need Telegram</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Your signal group lives in Telegram. Inside: every signal in real time with entry,
            targets and stop — pushed straight to your phone. Your invite stays linked to this
            account, so nothing is lost.
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
        <a href={store.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#2AABEE] px-4 text-xs font-bold text-white hover:opacity-90">
          {store.label}
        </a>
        <button onClick={onRetry}
          className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-white/12 px-4 text-xs font-semibold text-foreground hover:bg-white/[0.06]">
          I have Telegram — try again
        </button>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Open in browser instead <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

/**
 * MemberAvatar — the member's own face across the app.
 *
 * Uses their uploaded picture when there is one. The fallback is a generated
 * tile, but a deliberately crafted one: a two-stop gradient plus a light sweep
 * and an inner rim, so an account with no photo still looks designed rather
 * than like a placeholder. Hue is derived from their identity, so the same
 * person always gets the same colour.
 *
 * Cosmo is the guide and never stands in for the member's face — that's why
 * this lives apart from the mascot components.
 */
import { cn } from "@/lib/utils";

/** Stable hue per identity so the tile never changes colour between sessions. */
function identityHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}

function initialsOf(name: string, email: string) {
  const base = (name || email || "Trader").trim();
  const parts = base.split(/[ @._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : base.slice(0, 2)).toUpperCase();
}

export function MemberAvatar({
  name = "",
  email = "",
  src,
  size = 56,
  className,
  glow = true,
  ring = true,
}: {
  name?: string;
  email?: string;
  src?: string | null;
  size?: number;
  className?: string;
  glow?: boolean;
  ring?: boolean;
}) {
  const seed = (name || email || "Trader").trim();
  const hue = identityHue(seed);
  const initials = initialsOf(name, email);
  // Letterforms should scale with the tile, not sit at one fixed size.
  const fontSize = Math.round(size * 0.36);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {glow && (
        <div
          className="pointer-events-none absolute inset-0 -m-1.5 rounded-full blur-xl"
          style={{ background: src ? "hsl(150 60% 50% / 0.28)" : `hsl(${hue} 70% 50% / 0.32)` }}
          aria-hidden
        />
      )}

      {src ? (
        <img
          src={src}
          alt={name || email || "Profile picture"}
          className={cn(
            "relative h-full w-full rounded-full object-cover",
            ring && "ring-2 ring-white/15",
          )}
        />
      ) : (
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full",
            "font-display font-black tracking-tight text-white",
            ring && "ring-2 ring-white/15",
          )}
          style={{
            fontSize,
            background: `linear-gradient(135deg, hsl(${hue} 68% 52%), hsl(${(hue + 45) % 360} 72% 36%))`,
          }}
          aria-label={name || email || "Profile"}
        >
          {/* Light sweep + inner rim: what separates a designed tile from a flat swatch. */}
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.28), transparent 55%)" }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 6px rgba(0,0,0,0.25)" }}
            aria-hidden
          />
          <span className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{initials}</span>
        </div>
      )}
    </div>
  );
}

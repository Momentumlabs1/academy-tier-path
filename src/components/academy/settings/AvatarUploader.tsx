/**
 * AvatarUploader — lets a member set their own profile picture.
 *
 * Uploads into the public `avatars` bucket under `<auth-uid>/…`, which is
 * exactly what the storage policy allows, then stores the public URL on the
 * member row. A cache-busting suffix is appended because the file path is
 * stable per user, so browsers would otherwise keep showing the old picture.
 */
import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MemberAvatar } from "@/components/academy/primitives/MemberAvatar";

const MAX_BYTES = 2 * 1024 * 1024; // matches the bucket limit

/** The generated DB types are empty in this project, so writes to `members` go
 *  through the same narrow cast the admin views use. */
type MembersWriter = {
  from: (t: string) => {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export function AvatarUploader({
  name,
  email,
  avatarUrl,
  onChange,
}: {
  name: string;
  email: string;
  avatarUrl: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic preview so the new picture appears the moment it lands.
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? avatarUrl;

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Please pick an image file.");
    if (file.size > MAX_BYTES) return setError("That image is larger than 2 MB.");

    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("Please sign in again.");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Same path every time → without this the browser serves the stale image.
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: dbErr } = await (supabase as unknown as MembersWriter)
        .from("members")
        .update({ avatar_url: url })
        .eq("auth_user_id", uid);
      if (dbErr) throw new Error(dbErr.message);

      setPreview(url);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("Please sign in again.");
      await (supabase as unknown as MembersWriter)
        .from("members")
        .update({ avatar_url: null })
        .eq("auth_user_id", uid);
      setPreview(null);
      onChange("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the picture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="group relative rounded-full transition-transform hover:scale-[1.03] disabled:opacity-60"
        aria-label="Change profile picture"
      >
        <MemberAvatar name={name} email={email} src={shown} size={64} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </span>
        )}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/12 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" /> {shown ? "Change photo" : "Upload photo"}
          </button>
          {shown && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">JPG, PNG, WebP or GIF · up to 2 MB</p>
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

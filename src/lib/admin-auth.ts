// Single-admin gate. Only this ONE email may ever reach /admin — enforced here
// AND by disabling sign-ups in Supabase Auth (so no other account can exist).
// The password is NOT stored in code; it lives (hashed) in Supabase Auth and is
// typed at login. Change it in the Supabase dashboard whenever needed.
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "kontakt@momentumlabs.at";

/** True only if there's a live session AND it belongs to the allowed admin email. */
export async function isAdminSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user?.email?.toLowerCase();
  return !!email && email === ADMIN_EMAIL.toLowerCase();
}

/** Sign in; rejects (and signs out) anything that isn't the allowed admin. */
export async function adminSignIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, error: "Access denied." };
  }
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: "Wrong email or password." };
  // Belt & suspenders: verify the session really is the admin, else drop it.
  if (!(await isAdminSession())) {
    await supabase.auth.signOut();
    return { ok: false, error: "Access denied." };
  }
  return { ok: true };
}

export async function adminSignOut() {
  await supabase.auth.signOut();
}

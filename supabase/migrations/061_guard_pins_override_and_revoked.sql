-- Der Waechter kannte zwei neue Spalten nicht — und die entscheiden alles.
--
-- members_guard_standing (024) friert bei einem Selbst-UPDATE die Spalten ein,
-- an denen Geld und Zugang haengen. Die Liste ist eine Aufzaehlung, keine
-- Regel: was nicht drinsteht, ist frei beschreibbar. Migration 054 hat
-- access_revoked ergaenzt, 055 tier_override — beide OHNE sie hier
-- nachzutragen. Zusammen mit members_self_update ("auth_user_id = auth.uid()")
-- heisst das:
--
--   update members set tier_override = 'elite' where auth_user_id = auth.uid();
--
-- Jedes angemeldete Konto konnte sich die hoechste Stufe schenken — Signale,
-- alle Lektionen, Werkzeuge, Mentor — ohne einen Cent. Und ein vom Admin
-- gesperrtes Konto konnte sich selbst entsperren. Nachgemessen als echtes
-- Mitglied: die Schreibung ging durch, tier_override stand danach auf 'elite'.
--
-- Genau das ist der Fehler, den 024 verhindern soll. Er ist zurueckgekommen,
-- weil eine Aufzaehlung nicht mitwaechst.
create or replace function public.members_guard_standing()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- ACHTUNG: Diese Liste waechst NICHT von selbst mit. Kommt eine Spalte
    -- dazu, die ueber Geld, Stufe oder Zugang entscheidet, gehoert sie hier
    -- hinein — sonst darf das Mitglied sie sich selbst setzen. Genau so ist
    -- 055 (tier_override) zur Selbstbedienung geworden.
    NEW.deposit            := OLD.deposit;
    NEW.tier               := OLD.tier;
    NEW.active             := OLD.active;
    NEW.activity_status    := OLD.activity_status;
    NEW.monthly_lots       := OLD.monthly_lots;
    NEW.referred_by_tenant := OLD.referred_by_tenant;
    NEW.auth_user_id       := OLD.auth_user_id;
    NEW.email              := OLD.email;
    NEW.joined_at          := OLD.joined_at;
    NEW.tier_override      := OLD.tier_override;   -- 055, nachgetragen 061
    NEW.access_revoked     := OLD.access_revoked;  -- 054, nachgetragen 061
    -- BEWUSST NICHT eingefroren: onboarding_seen_at (060) und broker_email_claim
    -- (050). Beide tragen keinen Zugang; das Mitglied soll sie selbst setzen.
  ELSE
    NEW.deposit         := 0;
    NEW.tier            := NULL;
    NEW.active          := false;
    NEW.tier_override   := NULL;
    NEW.access_revoked  := false;
  END IF;

  RETURN NEW;
END;
$function$;

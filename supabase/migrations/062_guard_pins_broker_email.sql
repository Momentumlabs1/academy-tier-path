-- Der Waechter kennt jetzt auch die Spalte, an der fremdes Geld haengt.
--
-- GEFUNDEN 28.08.2026 bei der Nachkontrolle von 061.
--
-- 061 hat tier_override (055) und access_revoked (054) nachgetragen und damit
-- die Selbstbedienung bei der Stufe geschlossen. Uebersehen wurde die dritte
-- Spalte, die nach 024 dazugekommen ist: members.broker_email (036). Sie steht
-- bis heute nicht in der Liste — und sie ist das Feld, ueber das
-- apply_broker_rollup Mitglied und Broker-Kunde zusammenfuehrt:
--
--   join broker_clients bc
--     on lower(bc.email) in (lower(m.email), lower(coalesce(m.broker_email,'#none')))
--
-- Wer sie selbst setzt, bekommt die Einzahlung des Fremden gutgeschrieben —
-- Stufe, Signale, Werkzeuge ohne einen Cent — und Schritt 1 derselben Funktion
-- haengt ihm zusaetzlich das referred_by_tenant des Opfers an. Das ist exakt
-- der Angriff, den Migration 050 beschrieben und geschlossen hat.
--
-- WARUM 050 HIER NICHT REICHT
-- 050 hat den WEG abgesichert, nicht die SPALTE. Sie nimmt set_broker_email()
-- das wirksame Feld weg und laesst die Funktion nur noch broker_email_claim
-- schreiben; erst confirm_broker_email() traegt es nach Admin-Pruefung um.
-- Dieser Umweg ist aber freiwillig: members_self_update ("auth_user_id =
-- auth.uid()") erlaubt dem Mitglied die eigene Zeile, und broker_email ist
-- nicht eingefroren. Ein einziges
--
--   update members set broker_email = 'opfer@...' where auth_user_id = auth.uid();
--
-- geht an der RPC vorbei und damit an allem, was 050 aufgebaut hat: an der
-- '@'-Pruefung, an der Admin-Bestaetigung, an der Kollisionspruefung in
-- confirm_broker_email. Der Eindeutigkeits-Index aus 050 faengt das nicht auf:
-- er deckt nur lower(broker_email) ab, also den Fall, dass die Adresse schon
-- als broker_email eines anderen Mitglieds steht. Die beiden Faelle, auf die
-- es ankommt, laesst er durch — eine Adresse, die bei einem anderen Mitglied
-- als members.email steht, und eine Adresse aus unmatched_broker_clients, also
-- ein Broker-Kunde ganz ohne Konto bei uns. Genau die beiden nennt 050 selbst
-- als die eigentliche Beute.
--
-- Deshalb wandert broker_email in die Liste. Der Wunsch bleibt frei: das
-- Mitglied darf broker_email_claim weiter selbst setzen, denn genau das ist der
-- von 050 vorgesehene Weg — behaupten darf jeder, wirksam macht es ein Mensch.
--
-- AUSSERDEM REPARIERT: 061 hat beim Umschreiben der INSERT-Zweig-Liste
-- NEW.monthly_lots := 0 verloren, das 024 dort hatte. monthly_lots steht im
-- UPDATE-Zweig, gilt also als Standing — beim Selbst-Anlegen der eigenen Zeile
-- war es seit 061 frei setzbar. Hier wieder eingesetzt.
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
    -- hinein — sonst darf das Mitglied sie sich selbst setzen. So ist 055
    -- (tier_override) zur Selbstbedienung geworden und 036 (broker_email) zur
    -- Umleitung fremder Einzahlungen.
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
    NEW.broker_email       := OLD.broker_email;    -- 036, nachgetragen 062

    -- BEWUSST NICHT EINGEFROREN, beides absichtlich vom Mitglied beschreibbar:
    --   broker_email_claim (050) — der unverbindliche Wunsch. Ihn einzufrieren
    --     wuerde set_broker_email() lahmlegen; die Adresse wird ohnehin erst
    --     wirksam, wenn ein Admin sie mit confirm_broker_email() uebernimmt.
    --   onboarding_seen_at (060) — der Merker "Begruessung gesehen". Den setzt
    --     das Willkommensfenster im Dashboard direkt aus dem Browser. Wird er
    --     hier gepinnt, laesst sich die Begruessung nicht mehr wegklicken und
    --     erscheint bei jeder Anmeldung erneut — ohne Fehlermeldung, weil der
    --     Waechter absichtlich nicht wirft. Er traegt keinen Zugang.
  ELSE
    NEW.deposit         := 0;
    NEW.tier            := NULL;
    NEW.active          := false;
    NEW.monthly_lots    := 0;      -- 024, von 061 verloren, hier zurueck
    NEW.tier_override   := NULL;
    NEW.access_revoked  := false;
    NEW.broker_email    := NULL;   -- nur ueber claim + Admin, nie beim Anlegen
  END IF;

  RETURN NEW;
END;
$function$;

-- Der Ausloeser stammt aus 024 und haengt durch CREATE OR REPLACE ohne Luecke
-- an der neuen Fassung. Nur fuer den Fall, dass er irgendwo fehlt, hier
-- idempotent nachgezogen — bewusst ohne DROP, damit kein Fenster ohne Schutz
-- entsteht.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'members_guard_standing_trg'
       AND tgrelid = 'public.members'::regclass
       AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER members_guard_standing_trg
      BEFORE INSERT OR UPDATE ON public.members
      FOR EACH ROW EXECUTE FUNCTION public.members_guard_standing();
  END IF;
END
$do$;

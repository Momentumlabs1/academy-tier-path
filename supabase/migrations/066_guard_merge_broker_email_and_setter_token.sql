-- Der Waechter, vollstaendig — nach einem Fehler beim Bauen.
--
-- WAS PASSIERT IST
-- 062_guard_pins_broker_email und 062b/063 (setter_token) sind an derselben
-- Funktion gebaut worden, ohne voneinander zu wissen. CREATE OR REPLACE kennt
-- kein Zusammenfuehren: die spaetere Fassung hat die fruehere komplett
-- ersetzt. Damit sind zwei Zeilen verschwunden, die vorher da waren:
--
--   NEW.broker_email := OLD.broker_email;   (UPDATE)
--   NEW.monthly_lots := 0;                  (INSERT)
--
-- Nachgemessen am 28.08.: broker_email war wieder frei beschreibbar. Also
-- wieder offen, was 062 geschlossen hatte — ein Mitglied setzt sich die
-- Adresse eines fremden Broker-Kunden und bekommt dessen Einzahlung
-- gutgeschrieben. Genau der Angriff aus 050.
--
-- WAS DARAUS FOLGT
-- Diese Liste ist die einzige Stelle, an der steht, was ein Mitglied NICHT
-- selbst setzen darf, und sie waechst nicht von selbst mit. Sie ist jetzt
-- zum dritten Mal in vier Wochen unvollstaendig gewesen (055, 036, jetzt
-- durch Ueberschreiben). Wer sie anfasst, ersetzt die GANZE Funktion —
-- also vorher lesen, was drinsteht, nicht aus dem Kopf neu schreiben.
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
    -- dazu, die ueber Geld, Stufe, Herkunft oder Zugang entscheidet, gehoert
    -- sie hier hinein — sonst darf das Mitglied sie sich selbst setzen.
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
    NEW.setter_token       := OLD.setter_token;    -- 064, hier zusammengefuehrt

    -- BEWUSST NICHT EINGEFROREN, beides absichtlich vom Mitglied beschreibbar:
    --   broker_email_claim (050) — der unverbindliche Wunsch. Ihn einzufrieren
    --     wuerde set_broker_email() lahmlegen; wirksam wird die Adresse erst
    --     durch confirm_broker_email() bzw. link_setter_identities() (064).
    --   onboarding_seen_at (060) — der Merker "Begruessung gesehen". Gepinnt
    --     liesse sich das Willkommensfenster nicht mehr wegklicken. Er traegt
    --     keinen Zugang.
  ELSE
    NEW.deposit         := 0;
    NEW.tier            := NULL;
    NEW.active          := false;
    NEW.monthly_lots    := 0;      -- 024, von 061 verloren, ab 062 zurueck
    NEW.tier_override   := NULL;
    NEW.access_revoked  := false;
    NEW.broker_email    := NULL;   -- nur ueber claim + Admin, nie beim Anlegen
    NEW.setter_token    := NULL;   -- nur ueber den Link des Bots (064)
  END IF;

  RETURN NEW;
END;
$function$;

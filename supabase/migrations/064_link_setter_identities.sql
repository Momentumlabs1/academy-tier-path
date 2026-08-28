-- Die Brücke: Bot-Gespraech -> Broker-Einzahlung -> Akademie-Konto.
--
-- Bisher hing die Zuordnung an einer Bitte: "nimm bei uns dieselbe E-Mail wie
-- beim Broker" (script.py:167-172). Gemessen am 28.08.: 0 der vom Bot
-- erfragten Adressen haben je ein Mitglied erreicht. setter_leads und members
-- waren zwei Tabellen ohne Verbindung.
--
-- 1) DER TRIGGER REICHT DEN TOKEN DURCH
-- Der Akademie-Link des Bots traegt jetzt ?st=<token> (db.py academy_link).
-- Die Anmeldung legt ihn in die Metadaten, hier landet er in
-- members.setter_token.
CREATE OR REPLACE FUNCTION public.handle_new_academy_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'app', '') <> 'academy' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') = 'affiliate' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.members (auth_user_id, email, name, referred_by_tenant, setter_token, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'referred_by_tenant', ''),
    -- Nur was wie ein Token des Bots aussieht. Die Metadaten kommen vom
    -- Browser; ungeprueft waere das ein Feld, in das jeder schreiben darf.
    (SELECT t FROM (SELECT NULLIF(NEW.raw_user_meta_data->>'setter_token','') AS t) s
      WHERE s.t ~ '^st_[a-f0-9]{12}$'),
    false
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id       = EXCLUDED.auth_user_id,
        referred_by_tenant = COALESCE(members.referred_by_tenant, EXCLUDED.referred_by_tenant),
        name               = COALESCE(NULLIF(members.name, ''), EXCLUDED.name),
        -- Ein einmal gesetzter Token wird nicht ueberschrieben.
        setter_token       = COALESCE(members.setter_token, EXCLUDED.setter_token);

  RETURN NEW;
END;
$function$;


-- 2) DIE VERKNUEPFUNG
-- Fuer jedes Mitglied mit Token, das noch keine bestaetigte Broker-Adresse
-- hat, zwei Wege — in dieser Reihenfolge:
--
--   Weg A (Beweis):  Ein Broker-Kunde traegt unseren Token in utm_campaign
--                    bzw. utm_uri. Dann ist die Zuordnung nicht behauptet,
--                    sondern belegt — der Token war nur in einem Link, und den
--                    hat genau diese Person bekommen.
--
--   Weg B (Aussage): Die Adresse, die der Lead dem Bot genannt hat
--                    (setter_leads.broker_email). Die wird NUR uebernommen,
--                    wenn sie tatsaechlich als Broker-Kunde existiert.
--
-- In BEIDEN Faellen gilt dieselbe Schranke: die Adresse darf keinem anderen
-- Mitglied gehoeren. Das ist genau der Diebstahl-Weg, wegen dem Migration 050
-- die Selbstbedienung abgeschafft hat — eine fremde, schon zugeordnete
-- Adresse wird abgelehnt statt uebernommen.
--
-- Was durch keine der beiden Schranken kommt, wird nicht verworfen, sondern
-- als broker_email_claim hinterlegt. Ein Mensch entscheidet dann.
CREATE OR REPLACE FUNCTION public.link_setter_identities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r          RECORD;
  v_addr     TEXT;
  v_source   TEXT;
  v_by_token INT := 0;
  v_by_claim INT := 0;
  v_parked   INT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('link_setter_identities'));

  FOR r IN
    SELECT m.id,
           m.email,
           m.setter_token,
           lower(NULLIF(btrim(sl.broker_email), '')) AS lead_email
      FROM members m
      LEFT JOIN setter_leads sl ON sl.token = m.setter_token
     WHERE m.setter_token IS NOT NULL
       AND COALESCE(btrim(m.broker_email), '') = ''
  LOOP
    v_addr   := NULL;
    v_source := NULL;

    -- Weg A: der Broker meldet unseren Token zurueck.
    SELECT lower(bc.email) INTO v_addr
      FROM broker_clients bc
     WHERE bc.email IS NOT NULL
       AND (bc.utm_campaign ILIKE '%' || r.setter_token || '%'
         OR bc.utm_uri      ILIKE '%' || r.setter_token || '%')
     ORDER BY bc.registration_date ASC NULLS LAST
     LIMIT 1;

    IF v_addr IS NOT NULL THEN
      v_source := 'token';
    ELSIF r.lead_email IS NOT NULL THEN
      -- Weg B: nur wenn diese Adresse beim Broker wirklich existiert.
      SELECT lower(bc.email) INTO v_addr
        FROM broker_clients bc
       WHERE lower(bc.email) = r.lead_email
       LIMIT 1;
      IF v_addr IS NOT NULL THEN
        v_source := 'claim';
      END IF;
    END IF;

    IF v_addr IS NULL THEN
      CONTINUE;   -- noch nichts zu verknuepfen; naechster Lauf sieht neu nach
    END IF;

    -- Die Schranke: gehoert die Adresse schon jemand anderem?
    IF EXISTS (
      SELECT 1 FROM members o
       WHERE o.id <> r.id
         AND (lower(o.email) = v_addr OR lower(COALESCE(o.broker_email, '')) = v_addr)
    ) THEN
      UPDATE members SET broker_email_claim = v_addr WHERE id = r.id;
      v_parked := v_parked + 1;
      CONTINUE;
    END IF;

    UPDATE members
       SET broker_email       = v_addr,
           broker_email_claim = NULL
     WHERE id = r.id;

    IF v_source = 'token' THEN v_by_token := v_by_token + 1;
    ELSE                       v_by_claim := v_by_claim + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'linked_by_token', v_by_token,
    'linked_by_claim', v_by_claim,
    'parked_for_admin', v_parked
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.link_setter_identities() FROM public, anon, authenticated;

COMMENT ON FUNCTION public.link_setter_identities() IS
  'Verbindet Bot-Leads mit Akademie-Konten: Token zuerst (Beweis), dann die dem '
  'Bot genannte Adresse (nur wenn sie als Broker-Kunde existiert). Eine Adresse, '
  'die schon einem anderen Mitglied gehoert, wird nie uebernommen — sie landet '
  'als broker_email_claim beim Admin. Laeuft vor jedem apply_broker_rollup.';

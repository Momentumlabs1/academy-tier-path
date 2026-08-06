-- Superseded by 027 — kept so the migration history explains itself.
--
-- This tried `REVOKE SELECT (partner_rate, …) ON tenants FROM anon` while anon
-- still held a TABLE-level SELECT grant. PostgreSQL does not reduce a table-wide
-- privilege by revoking individual columns, so it changed nothing: an anonymous
-- request still returned every partner's rate afterwards. 027 does it properly.
REVOKE SELECT (partner_rate, partner_rate_unit, partner_volume, owner_user_id, telegram_channel_id)
  ON public.tenants FROM anon;

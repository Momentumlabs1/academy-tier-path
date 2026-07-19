-- 010 — Admin read access for the remaining dashboard tables.
-- (members/deposit_events/leads/tenants/clicks were covered in 008/009.)

ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_reads_audit ON audit_log;
CREATE POLICY admin_reads_audit ON audit_log
  FOR SELECT USING (is_platform_admin());

ALTER TABLE signal_relays ENABLE ROW LEVEL SECURITY; -- already on in 002; harmless
DROP POLICY IF EXISTS admin_reads_relays ON signal_relays;
CREATE POLICY admin_reads_relays ON signal_relays
  FOR SELECT USING (is_platform_admin());

-- 005 — Seed the zekoglobal tenant row.
--
-- Why: src/lib/tenants.ts defines 4 brands (agent-trading, crypto-masters,
-- fx-elite, zekoglobal) but migrations 001/002 only seeded the first 3.
-- zekoglobal therefore has a public landing page at /t/zekoglobal but NO DB
-- row, so it never appears in /admin/tenants and never receives relayed
-- signals. This adds the missing row and its default relay settings.
--
-- Branding (colors/logo/copy) still lives in tenants.ts and is merged by slug
-- in the admin UI; the DB only needs the operational fields.

INSERT INTO tenants (slug, name, config) VALUES
  ('zekoglobal', 'Zeko Global', '{"primaryColor":"oklch(0.76 0.06 158)","brokerName":"Your Broker"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

UPDATE tenants SET
  broker_affiliate_url = COALESCE(broker_affiliate_url, 'https://broker.example/ref?aff=' || slug),
  signal_footer        = COALESCE(signal_footer, '📈 Trade this signal with our partner broker — free access via your deposit.')
WHERE slug = 'zekoglobal';

-- HQ — Life OS KPI RPCs (applied as migrations life_hq_kpi_rpcs +
-- life_hq_rpcs_allow_service_role). Gate: owner allowlist OR service_role
-- (the life-brief edge function calls these with the service key).

create or replace function public.life_kpi_access_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_life_owner() or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;
revoke all on function public.life_kpi_access_ok() from public, anon;
grant execute on function public.life_kpi_access_ok() to authenticated, service_role;

-- Spy Secret: MRR / paying users / trials / visitors / scans (mirrors the
-- battle-tested price + filter logic of admin-dashboard-v3 v17).
create or replace function public.life_spysecret_kpis()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  tz text := coalesce((select timezone from life_settings where id = 1), 'Europe/Vienna');
  day_start timestamptz;
  yday_start timestamptz;
  result jsonb;
begin
  if not public.life_kpi_access_ok() then
    raise exception 'forbidden';
  end if;

  day_start := date_trunc('day', now() at time zone tz) at time zone tz;
  yday_start := day_start - interval '1 day';

  with price(plan, period, eur) as (
    values ('basic','weekly',0.99::numeric), ('basic','monthly',2.99),
           ('pro','weekly',8.99), ('pro','monthly',29.99), ('pro','yearly',34.99)
  ), subs as (
    select
      lower(plan_type) as plan,
      case
        when lower(coalesce(billing_period,'')) in ('year','annual','annually','yearly') then 'yearly'
        when lower(coalesce(billing_period,'')) like 'week%' then 'weekly'
        when lower(coalesce(billing_period,'')) like 'month%' then 'monthly'
        else lower(coalesce(billing_period,''))
      end as period,
      status, created_at
    from subscriptions
    where lower(plan_type) in ('pro','basic')
  ), enriched as (
    select s.*,
      case s.period when 'weekly' then coalesce(p.eur,0) * 4.345
                    when 'monthly' then coalesce(p.eur,0)
                    when 'yearly' then coalesce(p.eur,0) / 12
                    else 0 end as mrr_eur
    from subs s left join price p on p.plan = s.plan and p.period = s.period
  )
  select jsonb_build_object(
    'mrr_eur',            round(coalesce(sum(mrr_eur) filter (where status = 'active'), 0), 2),
    'paying_active',      count(*) filter (where status = 'active'),
    'pro_active',         count(*) filter (where status = 'active' and plan = 'pro'),
    'basic_active',       count(*) filter (where status = 'active' and plan = 'basic'),
    'in_trial',           count(*) filter (where status = 'in_trial'),
    'past_due',           count(*) filter (where status = 'past_due'),
    'new_paying_today',   count(*) filter (where status <> 'incomplete' and created_at >= day_start)
  ) into result
  from enriched;

  result := result || jsonb_build_object(
    'visitors_today',    (select count(distinct session_id) from landing_visits where created_at >= day_start),
    'visitors_yesterday',(select count(distinct session_id) from landing_visits where created_at >= yday_start and created_at < day_start),
    'scans_today',       (select count(*) from analytics_events where event_name = 'form_submit' and created_at >= day_start),
    'new_users_today',   (select count(*) from auth.users where created_at >= day_start and coalesce(is_anonymous, false) = false),
    'generated_at',      to_jsonb(now())
  );

  return result;
end $$;

-- Content / StrichAbi: UGC video views + AI-creator agency reach.
create or replace function public.life_content_kpis()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.life_kpi_access_ok() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'video_count',   (select count(*) from affiliate_videos),
    'total_views',   (select coalesce(sum(current_views), 0) from affiliate_videos),
    'total_likes',   (select coalesce(sum(current_likes), 0) from affiliate_videos),
    'views_7d',      (
      select coalesce(sum(
        greatest(v.current_views - coalesce(h.views,
          case when v.created_at >= now() - interval '7 days' then 0 else v.current_views end), 0)
      ), 0)
      from affiliate_videos v
      left join lateral (
        select views from affiliate_video_stats_history h
        where h.video_id = v.id and h.fetched_at >= now() - interval '7 days'
        order by h.fetched_at asc limit 1
      ) h on true
    ),
    'top_video', (
      select jsonb_build_object(
        'caption', left(coalesce(caption, '(ohne Caption)'), 80),
        'platform', platform, 'views', current_views, 'url', video_url)
      from affiliate_videos
      order by current_views desc nulls last limit 1
    ),
    'agency_followers', (select coalesce(sum(followers), 0) from agency_social_accounts),
    'agency_views',     (select coalesce(sum(views), 0) from agency_metrics),
    'agency_personas',  (select count(*) from agency_personas),
    'generated_at',     to_jsonb(now())
  ) into result;

  return result;
end $$;

-- 14-day unique-visitor sparkline for the Spy Secret card.
create or replace function public.life_visitors_sparkline()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  tz text := coalesce((select timezone from life_settings where id = 1), 'Europe/Vienna');
  result jsonb;
begin
  if not public.life_kpi_access_ok() then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'visitors', coalesce(v.visitors, 0)) order by d.day), '[]'::jsonb)
  into result
  from (
    select generate_series((now() at time zone tz)::date - 13, (now() at time zone tz)::date, '1 day')::date as day
  ) d
  left join (
    select (created_at at time zone tz)::date as day, count(distinct session_id) as visitors
    from landing_visits
    where created_at >= (now() - interval '15 days')
    group by 1
  ) v on v.day = d.day;

  return result;
end $$;

revoke all on function public.life_spysecret_kpis() from public, anon;
revoke all on function public.life_content_kpis() from public, anon;
revoke all on function public.life_visitors_sparkline() from public, anon;
grant execute on function public.life_spysecret_kpis() to authenticated, service_role;
grant execute on function public.life_content_kpis() to authenticated, service_role;
grant execute on function public.life_visitors_sparkline() to authenticated, service_role;

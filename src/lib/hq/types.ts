// Shared types for the HQ Life-OS dashboard (SPYSECRET life_* tables + RPCs).

export interface Venture {
  slug: string;
  name: string;
  emoji: string;
  kind: "saas" | "trading" | "content" | "personal" | "project";
  url: string | null;
  sort_order: number;
  active: boolean;
}

export interface LifeTask {
  id: string;
  title: string;
  notes: string | null;
  venture_slug: string | null;
  priority: 1 | 2 | 3;
  due_date: string | null; // YYYY-MM-DD
  done_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LifeNote {
  id: string;
  title: string | null;
  body: string;
  kind: "note" | "idea" | "link" | "decision";
  tags: string[];
  venture_slug: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DayPlan {
  day: string; // YYYY-MM-DD
  focus: string | null;
  reflection: string | null;
}

export interface DayBlock {
  id: string;
  day: string;
  start_min: number;
  duration_min: number;
  title: string;
  venture_slug: string | null;
  done: boolean;
}

export interface LifeSettings {
  id: number;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  brief_morning: boolean;
  brief_evening: boolean;
  morning_hour: number;
  evening_hour: number;
  email_fallback: boolean;
  notify_email: string;
  timezone: string;
}

export interface LifeNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  sent_via: string[];
  read_at: string | null;
  created_at: string;
}

export interface SpyKpis {
  mrr_eur: number;
  paying_active: number;
  pro_active: number;
  basic_active: number;
  in_trial: number;
  past_due: number;
  new_paying_today: number;
  visitors_today: number;
  visitors_yesterday: number;
  scans_today: number;
  new_users_today: number;
}

export interface ContentKpis {
  video_count: number;
  total_views: number;
  total_likes: number;
  views_7d: number;
  top_video: { caption: string; platform: string; views: number; url: string } | null;
  agency_followers: number;
  agency_views: number;
  agency_personas: number;
}

export interface SparkPoint {
  day: string;
  visitors: number;
}

/** Trading snapshot read from the academy's own (Lovable Cloud) Supabase. */
export interface TradingSnapshot {
  tenants: number;
  members: number;
  relays24h: number;
  latestSignal: { preview: string; created_at: string } | null;
}

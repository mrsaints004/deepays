-- Depay Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Users table
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  x_id text unique not null,
  x_username text not null,
  x_avatar_url text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_login timestamptz not null default now()
);

-- Tasks table
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  action_url text not null,
  reward_usd numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'paused', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Completions table
create table public.completions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  week_start date not null,
  unique(user_id, task_id)
);

-- Weekly payouts table
create table public.weekly_payouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  total_usd numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  unique(user_id, week_start)
);

-- Indexes for performance
create index idx_completions_user on public.completions(user_id);
create index idx_completions_week on public.completions(week_start);
create index idx_completions_user_week on public.completions(user_id, week_start);
create index idx_weekly_payouts_user on public.weekly_payouts(user_id);
create index idx_weekly_payouts_week on public.weekly_payouts(week_start);
create index idx_tasks_status on public.tasks(status);

-- Row Level Security
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.completions enable row level security;
alter table public.weekly_payouts enable row level security;

-- Public read policies for tasks (anyone authenticated can view active tasks)
create policy "Anyone can view active tasks" on public.tasks
  for select using (true);

-- Users can read their own data
create policy "Users can view own profile" on public.users
  for select using (true);

-- Completions: users can view and insert their own
create policy "Users can view own completions" on public.completions
  for select using (true);

create policy "Users can insert own completions" on public.completions
  for insert with check (true);

-- Weekly payouts: users can view their own
create policy "Users can view own payouts" on public.weekly_payouts
  for select using (true);

-- Insert some sample tasks
insert into public.tasks (title, description, action_url, reward_usd, status) values
  ('Like this post', 'Like the pinned post on @DepayHQ', 'https://x.com/DepayHQ/status/example1', 0.50, 'active'),
  ('Retweet announcement', 'Retweet our latest product announcement', 'https://x.com/DepayHQ/status/example2', 0.75, 'active'),
  ('Follow @DepayHQ', 'Follow our official X account', 'https://x.com/DepayHQ', 1.00, 'active'),
  ('Comment on launch post', 'Leave a thoughtful comment on our launch post', 'https://x.com/DepayHQ/status/example3', 1.50, 'active'),
  ('Quote tweet', 'Quote tweet our latest update with your thoughts', 'https://x.com/DepayHQ/status/example4', 1.25, 'active');

-- Run this in your Supabase SQL editor
-- Create maintenance_requests table

create table if not exists maintenance_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Enable Row Level Security
alter table maintenance_requests enable row level security;

-- Users can only see their own maintenance requests
create policy "Users see own maintenance requests"
  on maintenance_requests for all
  using (auth.uid() = user_id);

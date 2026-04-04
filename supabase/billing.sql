-- Add Stripe billing fields to profiles table
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists stripe_price_id text;
alter table public.profiles add column if not exists plan text default 'free';
alter table public.profiles add column if not exists subscription_status text default 'inactive';
alter table public.profiles add column if not exists trial_ends_at timestamptz;

-- Index for webhook lookups
create index if not exists profiles_stripe_customer_id on public.profiles(stripe_customer_id);
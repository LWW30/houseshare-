import { useState } from 'react'
import Layout from '../../../components/Layout'
import { Check, ExternalLink, Copy, ChevronDown, ChevronUp } from 'lucide-react'

const SQL_SCHEMA = `-- ============================================
-- STEP 1: Create tables
-- ============================================

create table properties (
  id uuid default gen_random_uuid() primary key,
  landlord_id uuid references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  created_at timestamptz default now()
);

create table rooms (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  monthly_rent numeric not null,
  created_at timestamptz default now()
);

create table tenants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  tenancy_start date not null,
  tenancy_end date,
  invite_token text unique default gen_random_uuid()::text,
  created_at timestamptz default now()
);

create table rent_payments (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text default 'pending' check (status in ('pending','paid','late','overdue')),
  notes text,
  created_at timestamptz default now()
);

create table shared_bills (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  amount numeric not null,
  due_date date not null,
  paid boolean default false,
  split_ways integer default 1,
  category text default 'other' check (category in ('broadband','council_tax','electricity','gas','water','other')),
  created_at timestamptz default now()
);

-- ============================================
-- STEP 2: Row Level Security
-- ============================================

alter table properties enable row level security;
alter table rooms enable row level security;
alter table tenants enable row level security;
alter table rent_payments enable row level security;
alter table shared_bills enable row level security;

create policy "landlord owns properties"
  on properties for all
  using (auth.uid() = landlord_id);

create policy "landlord owns rooms"
  on rooms for all
  using (exists (
    select 1 from properties
    where id = rooms.property_id
    and landlord_id = auth.uid()
  ));

create policy "landlord owns tenants"
  on tenants for all
  using (exists (
    select 1 from properties
    where id = tenants.property_id
    and landlord_id = auth.uid()
  ));

create policy "landlord owns payments"
  on rent_payments for all
  using (exists (
    select 1 from properties
    where id = rent_payments.property_id
    and landlord_id = auth.uid()
  ));

create policy "landlord owns bills"
  on shared_bills for all
  using (exists (
    select 1 from properties
    where id = shared_bills.property_id
    and landlord_id = auth.uid()
  ));

-- Tenant portal: allow reading own data by invite token (no auth needed)
create policy "tenant portal read tenants"
  on tenants for select
  using (true);

create policy "tenant portal read payments"
  on rent_payments for select
  using (true);

create policy "tenant portal read bills"
  on shared_bills for select
  using (true);

create policy "tenant portal read rooms"
  on rooms for select
  using (true);

create policy "tenant portal read properties"
  on properties for select
  using (true);

-- ============================================
-- STEP 3: Auto-generate payments when a tenant is added
-- ============================================

-- Function: generates one payment per month from tenancy_start
-- up to 12 months ahead (or tenancy_end, whichever is sooner)
create or replace function generate_rent_payments_for_tenant()
returns trigger as $$
declare
  v_monthly_rent numeric;
  v_current_date date;
  v_end_date date;
begin
  -- Get the room's monthly rent
  select monthly_rent into v_monthly_rent
  from rooms where id = NEW.room_id;

  -- Start from the 1st of the tenant's start month
  v_current_date := date_trunc('month', NEW.tenancy_start)::date;

  -- End at tenancy_end or 12 months from now, whichever is sooner
  v_end_date := least(
    coalesce(NEW.tenancy_end, now()::date + interval '12 months'),
    now()::date + interval '12 months'
  );

  -- Loop month by month and insert a payment row
  while v_current_date <= v_end_date loop
    insert into rent_payments (tenant_id, property_id, amount, due_date, status)
    values (
      NEW.id,
      NEW.property_id,
      v_monthly_rent,
      v_current_date,
      case
        when v_current_date < date_trunc('month', now())::date then 'overdue'
        when v_current_date = date_trunc('month', now())::date then 'pending'
        else 'pending'
      end
    )
    on conflict do nothing;

    v_current_date := v_current_date + interval '1 month';
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: fires after a tenant row is inserted
create trigger on_tenant_created
  after insert on tenants
  for each row execute function generate_rent_payments_for_tenant();

-- ============================================
-- STEP 4: Function to update overdue statuses
-- (run this monthly, or call it manually)
-- ============================================

create or replace function update_overdue_payments()
returns void as $$
begin
  update rent_payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < date_trunc('month', now())::date;
end;
$$ language plpgsql security definer;

-- ============================================
-- STEP 5: Helper to generate payments for
-- tenants added before this trigger existed
-- ============================================

create or replace function backfill_payments_for_tenant(tenant_id uuid)
returns void as $$
declare
  v_tenant tenants%rowtype;
  v_monthly_rent numeric;
  v_current_date date;
  v_end_date date;
begin
  select * into v_tenant from tenants where id = tenant_id;
  select monthly_rent into v_monthly_rent from rooms where id = v_tenant.room_id;

  v_current_date := date_trunc('month', v_tenant.tenancy_start)::date;
  v_end_date := least(
    coalesce(v_tenant.tenancy_end, now()::date + interval '12 months'),
    now()::date + interval '12 months'
  );

  while v_current_date <= v_end_date loop
    insert into rent_payments (tenant_id, property_id, amount, due_date, status)
    values (
      v_tenant.id,
      v_tenant.property_id,
      v_monthly_rent,
      v_current_date,
      case
        when v_current_date < date_trunc('month', now())::date then 'overdue'
        else 'pending'
      end
    )
    on conflict do nothing;

    v_current_date := v_current_date + interval '1 month';
  end loop;
end;
$$ language plpgsql security definer;`

const SQL_MONTHLY_CRON = `-- Run this in Supabase SQL editor once a month
-- to mark any unpaid past payments as overdue
select update_overdue_payments();`

const STEPS = [
  { n: 1, title: 'Create a Supabase project', body: 'Go to supabase.com, sign up free, and create a new project.', link: 'https://supabase.com' },
  { n: 2, title: 'Run the full SQL schema', body: 'In Supabase → SQL Editor → New query. Paste the full schema below and click Run. This creates all tables, security rules, and the auto-payment trigger in one go.' },
  { n: 3, title: 'Copy your credentials', body: 'Go to Project Settings → API. Copy your Project URL and anon/public key.' },
  { n: 4, title: 'Create .env.local in your project folder', body: 'Create a file called .env.local and add these two lines:' },
  { n: 5, title: 'Restart your dev server', body: 'Stop npm run dev (Ctrl+C) then run it again. You should now see a login screen.' },
  { n: 6, title: 'Deploy to Vercel', body: 'Push to GitHub, import on Vercel, add the same two environment variables in Vercel project settings, and deploy.' },
]

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(2)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Connect Supabase to go live with real data</p>
        </div>

        {/* Setup steps */}
        <div className="space-y-2 mb-8">
          {STEPS.map(s => (
            <div key={s.n} className="card overflow-hidden">
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(expanded === s.n ? null : s.n)}
              >
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {s.n}
                </div>
                <span className="font-medium text-sm text-gray-900 flex-1">{s.title}</span>
                {expanded === s.n
                  ? <ChevronUp size={14} className="text-gray-400" />
                  : <ChevronDown size={14} className="text-gray-400" />
                }
              </div>
              {expanded === s.n && (
                <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                  <p className="text-sm text-gray-500">{s.body}</p>
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                      Open Supabase <ExternalLink size={10} />
                    </a>
                  )}
                  {s.n === 4 && (
                    <div className="mt-3 bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400 space-y-1">
                      <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                      <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Full SQL schema */}
        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-medium text-sm text-gray-900">Full database schema</h2>
              <p className="text-xs text-gray-400 mt-0.5">Includes tables, security, and auto-payment trigger</p>
            </div>
            <button onClick={() => copy(SQL_SCHEMA, 'schema')} className="btn-secondary flex items-center gap-1.5 text-xs">
              {copied === 'schema' ? <><Check size={12} className="text-green-500" /> Copied!</> : <><Copy size={12} /> Copy SQL</>}
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed max-h-72 overflow-y-auto">
            {SQL_SCHEMA}
          </pre>
        </div>

        {/* Monthly cron */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-medium text-sm text-gray-900">Mark overdue payments</h2>
              <p className="text-xs text-gray-400 mt-0.5">Run once a month to update statuses</p>
            </div>
            <button onClick={() => copy(SQL_MONTHLY_CRON, 'cron')} className="btn-secondary flex items-center gap-1.5 text-xs">
              {copied === 'cron' ? <><Check size={12} className="text-green-500" /> Copied!</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs leading-relaxed">
            {SQL_MONTHLY_CRON}
          </pre>
          <p className="text-xs text-gray-400 mt-3">
            Run this in the Supabase SQL editor at the start of each month to automatically mark any unpaid past months as overdue.
          </p>
        </div>
      </div>
    </Layout>
  )
}

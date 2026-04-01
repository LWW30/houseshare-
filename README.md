# HouseShare — UK Landlord Dashboard

A simple web app for UK landlords managing house shares. Track rent payments,
shared bills, and give tenants a clean portal to see their status.

## What's included

- **Dashboard** — portfolio overview with rent status and bill summary
- **Properties** — manage your house share properties with compliance tracking
- **Tenants** — add tenants, track payments, copy invite links
- **Payments** — month-by-month rent tracking with mark-paid and reminder buttons
- **Shared Bills** — log broadband, council tax, gas etc. with per-tenant splits
- **Tenant Portal** — a mobile-friendly page tenants access via a link (no login needed)
- **Settings** — step-by-step Supabase setup with SQL schema

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase (free)
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to SQL Editor and run the schema from Settings → Database schema
3. Copy your Project URL and anon key from Settings → API

### 3. Create .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel (free)
1. Push this folder to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add the two environment variables in Vercel project settings
4. Click Deploy — your app is live at yourapp.vercel.app

## Current state

The app runs in **demo mode** with sample data until Supabase is connected.
All forms and modals are built — they just need the database connection to save real data.

## Tech stack
- Next.js 14
- Tailwind CSS
- Supabase (database + auth)
- TypeScript
- Lucide icons

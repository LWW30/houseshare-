import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { Check, Loader2, Zap, ShieldCheck, Landmark, ScrollText, Star, Bell } from 'lucide-react'


const MONTHLY_PRICE  = 29
const ANNUAL_PRICE   = 240
const FOUNDING_PRICE = 199
const FOUNDING_SPOTS = 50


const PRO_FEATURES = [
  'Unlimited properties & rooms',
  'GoCardless Direct Debit collection',
  'Full compliance tracking (gas, EICR, EPC, HMO licence)',
  'RRA 2025-compliant AST generator',
  'Making Tax Digital (MTD) digital records',
  'Automated rent reminders & arrears alerts',
  'Tenant portal with maintenance submissions',
  'S8 & S13 legal notice generator',
  'Deposit tracking (DPS / TDS / MyDeposits)',
  'Tenancy referencing provider directory',
]


const FREE_FEATURES = [
  '1 property, up to 4 rooms',
  'Basic rent tracking',
  'Tenant portal',
  'Maintenance requests',
]


type PlanType = 'monthly' | 'annual' | 'founding'


export default function BillingPage() {
  const router = useRouter()

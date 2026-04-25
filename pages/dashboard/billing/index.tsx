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

function btnCls(active: boolean, accent: string) {
  return 'px-4 py-2 rounded-lg text-sm font-medium transition-all ' +
    (active ? accent + ' shadow-sm' : 'text-gray-500 hover:text-gray-700')
}

export default function BillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile]           = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [plan, setPlan]                 = useState<PlanType>('founding')
  const [upgrading, setUpgrading]       = useState(false)
  const [managing, setManaging]         = useState(false)
  const [spotsLeft, setSpotsLeft]       = useState<number>(FOUNDING_SPOTS)

  useEffect(() => {
    if (!authLoading && user) loadProfile()
  }, [user, authLoading])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    setProfile(data)
    setProfileLoading(false)
    try {
      const res = await fetch('/api/founding-spots')
      if (res.ok) { const d = await res.json(); setSpotsLeft(d.spots) }
    } catch {}
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
        body: JSON.stringify({ plan }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (e: any) { const msg = e.message || 'Payment setup failed. Please check your Stripe is in live mode and prices exist.'; setUpgradeError(msg); setUpgrading(false) }
  }

  async function handleManage() {
    setManaging(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (session?.access_token || '') },
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (e) { console.error(e); setManaging(false) }
  }

  if (authLoading || profileLoading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    </Layout>
  )

  const isPro = profile?.plan === 'pro'
  const foundingAvailable = spotsLeft > 0
  const displayPrice = plan === 'founding' ? FOUNDING_PRICE : plan === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE
  const perMonth = plan === 'monthly'
    ? String(MONTHLY_PRICE)
    : plan === 'annual'
    ? (ANNUAL_PRICE / 12).toFixed(2)
    : (FOUNDING_PRICE / 12).toFixed(2)

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Billing</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your LetFlowUK subscription</p>
        </div>

        {router.query.success && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <Check size={16} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">You&apos;re now on Pro — all features unlocked.</p>
          </div>
        )}

        {isPro ? (
          <div>
            <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Check size={20} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Pro plan active</p>
                  <p className="text-sm text-green-700 mt-0.5">Full access to all LetFlowUK features.</p>
                </div>
              </div>
              <button onClick={handleManage} disabled={managing}
                className="text-sm text-green-700 underline underline-offset-2 hover:no-underline whitespace-nowrap flex items-center gap-1">
                {managing ? <Loader2 size={13} className="animate-spin" /> : null}
                Manage subscription
              </button>
            </div>
            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Your Pro features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={13} className="text-green-500 flex-shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {foundingAvailable && (
              <div className="mb-5 p-4 rounded-2xl flex items-start gap-3 border" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
                <Star size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Founding member offer — limited time</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Lock in {'£'}{FOUNDING_PRICE}/year (normally {'£'}{ANNUAL_PRICE}) forever.
                    <span className="font-semibold ml-1">{spotsLeft} of {FOUNDING_SPOTS} spots remaining.</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-1.5 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {foundingAvailable && (
                <button onClick={() => setPlan('founding')} className={btnCls(plan === 'founding', 'bg-amber-500 text-white')}>
                  Founding — {'£'}{FOUNDING_PRICE}/yr
                </button>
              )}
              <button onClick={() => setPlan('annual')} className={btnCls(plan === 'annual', 'bg-gray-900 text-white')}>
                Annual — {'£'}{ANNUAL_PRICE}/yr
                <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  Save {'£'}{MONTHLY_PRICE * 12 - ANNUAL_PRICE}
                </span>
              </button>
              <button onClick={() => setPlan('monthly')} className={btnCls(plan === 'monthly', 'bg-gray-900 text-white')}>
                Monthly — {'£'}{MONTHLY_PRICE}/mo
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden mb-6 border-2 border-gray-900">
              <div className="bg-gray-900 text-white px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">LetFlowUK</p>
                  <p className="text-xl font-semibold">Pro Plan</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{'£'}{displayPrice}</p>
                  <p className="text-sm text-gray-400">
                    {plan === 'monthly' ? 'per month' : ('per year (£' + perMonth + '/mo)')}
                  </p>
                </div>
              </div>
              <div className="p-6" style={{ background: 'var(--card-bg)' }}>
                <div className="mb-5 p-3 rounded-xl border flex items-start gap-2.5" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <Bell size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">
                    <span className="font-semibold">Making Tax Digital is live from April 2026.</span>{' '}
                    Landlords with {'£'}50k+ rental income must keep digital records. LetFlowUK Pro handles this automatically.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                  {PRO_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={13} className="text-green-500 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
                {upgradeError && (
              <div className="mb-3 p-3 rounded-xl text-xs font-medium text-red-700 bg-red-50 border border-red-200 leading-relaxed">
                ⚠️ {upgradeError}
              </div>
            )}
              <button onClick={() => { setUpgradeError(''); handleUpgrade(); }} disabled={upgrading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {upgrading ? (
                    <><Loader2 size={14} className="animate-spin" /> Redirecting to checkout&hellip;</>
                  ) : plan === 'founding' ? (
                    <><Star size={14} /> Claim founding spot &mdash; {'£'}{FOUNDING_PRICE}/yr</>
                  ) : plan === 'annual' ? (
                    <><Zap size={14} /> Get Pro &mdash; {'£'}{ANNUAL_PRICE}/yr</>
                  ) : (
                    <><Zap size={14} /> Get Pro &mdash; {'£'}{MONTHLY_PRICE}/mo</>
                  )}
                </button>
                <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  {plan === 'founding' ? 'Price locked forever — your rate never increases.' : 'Cancel anytime. No setup fees.'}
                </p>
              </div>
            </div>

            <div className="card p-5 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Currently on Free plan</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {FREE_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={11} className="text-green-500" /> {f}
                  </div>
                ))}
                {['GoCardless Direct Debit','Compliance alerts','AST & legal notices','MTD digital records'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="text-gray-300">x</span> {f}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: ShieldCheck, title: 'RRA 2025 ready',   desc: '32-item compliance checklist. Stay compliant with the Renters Rights Act.' },
            { icon: ScrollText,  title: 'Legal notices',    desc: 'Generate S8 and S13 notices in minutes with tenant data pre-filled.' },
            { icon: Landmark,    title: 'Direct Debit',     desc: 'GoCardless BACS rent collection built in. No other HMO tool offers this.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-4">
              <Icon size={16} className="mb-3 text-green-600" />
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{title}</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Account</div>
          <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{user?.email}</div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Questions?{' '}
            <a href="mailto:hello@letflowuk.com" className="underline hover:no-underline" style={{ color: 'var(--text-secondary)' }}>
              hello@letflowuk.com
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
    }
—

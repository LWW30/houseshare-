import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { Check, Loader2, Zap, ShieldCheck, Landmark, ScrollText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

const FREE_FEATURES = ['Up to 2 properties','Per-room rent tracking','Compliance certificate tracking','Maintenance issue log','Document storage','Shared bills splitting','Tenant portal links','RRA 2025 compliance checklist','Legal notice generator (S8 and S13)']
const PRO_FEATURES = ['Unlimited properties','Everything in Free','GoCardless Direct Debit collection','Automated tenant email reminders','Priority email support']

export default function BillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [managing, setManaging] = useState(false)

  useEffect(() => { if (!authLoading && user) loadProfile() }, [user, authLoading])
  async function loadProfile() { const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single(); setProfile(data); setProfileLoading(false) }
  async function handleUpgrade() { setUpgrading(true); try { const res = await fetch('/api/stripe/checkout', { method: 'POST' }); const { url, error } = await res.json(); if (error) throw new Error(error); window.location.href = url } catch { setUpgrading(false) } }
  async function handleManage() { setManaging(true); try { const res = await fetch('/api/stripe/portal', { method: 'POST' }); const { url, error } = await res.json(); if (error) throw new Error(error); window.location.href = url } catch { setManaging(false) } }

  if (authLoading || profileLoading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>

  const isPro = profile?.plan === 'pro'
  const isTrialing = profile?.subscription_status === 'trialing'
  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / 86400000) : 0

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Billing</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your LetFlow subscription</p>
        </div>

        {router.query.success && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <Check size={16} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">You are now on Pro — welcome! All features are unlocked.</p>
          </div>
        )}

        {isTrialing && daysLeft > 0 && (
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
            <Zap size={16} className="text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">{daysLeft} days left in your free trial</p>
              <p className="text-xs text-blue-600 mt-0.5">Trial ends {trialEnd ? format(trialEnd, 'd MMMM yyyy') : ''}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className={"card p-6 " + (!isPro ? 'ring-2 ring-gray-900' : '')}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Free</div>
                <div className="flex items-baseline gap-1"><span className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>£0</span><span className="text-sm" style={{ color: 'var(--text-muted)' }}>/mo</span></div>
              </div>
              {!isPro && <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">Current plan</span>}
            </div>
            <ul className="space-y-2.5 mb-6">{FREE_FEATURES.map((f,i) => (<li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}><Check size={13} className="text-green-500 flex-shrink-0" />{f}</li>))}</ul>
            {!isPro && <div className="text-xs text-center py-2 rounded-xl border" style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}>Your current plan</div>}
          </div>

          <div className={"rounded-2xl p-6 bg-gray-900 text-white " + (isPro ? 'ring-2 ring-green-400' : '')}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1 text-gray-400">Pro</div>
                <div className="flex items-baseline gap-1"><span className="text-3xl font-semibold text-white">£19</span><span className="text-sm text-gray-400">/mo</span></div>
                <p className="text-xs text-gray-400 mt-0.5">14-day free trial included</p>
              </div>
              {isPro && <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-400 text-green-900">Active</span>}
            </div>
            <ul className="space-y-2.5 mb-5">{PRO_FEATURES.map((f,i) => (<li key={i} className="flex items-center gap-2.5 text-sm text-gray-200"><Check size={13} className="text-green-400 flex-shrink-0" />{f}</li>))}</ul>
            <div className="mb-5 p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2 mb-1"><Landmark size={13} className="text-green-400" /><span className="text-xs font-semibold text-green-300">Direct Debit — coming soon</span></div>
              <p className="text-xs text-gray-400 leading-relaxed">Collect rent automatically via GoCardless BACS. No other HMO tool offers this.</p>
            </div>
            {!isPro ? (
              <button onClick={handleUpgrade} disabled={upgrading} className="w-full py-3 rounded-xl font-semibold text-gray-900 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {upgrading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}{upgrading ? 'Redirecting...' : 'Upgrade to Pro — £19/mo'}
              </button>
            ) : (
              <button onClick={handleManage} disabled={managing} className="w-full py-3 rounded-xl font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {managing ? <Loader2 size={14} className="animate-spin" /> : null}{managing ? 'Opening portal...' : 'Manage subscription'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: ShieldCheck, title: 'RRA 2025 ready', desc: '32-item compliance checklist built in. Stay on the right side of the new law.' },
            { icon: ScrollText, title: 'Legal notices', desc: 'Generate Section 8 and Section 13 notices in minutes with tenant data pre-filled.' },
            { icon: Landmark, title: 'Direct Debit', desc: 'GoCardless BACS collection coming soon to Pro. The only HMO tool with built-in DD.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-4"><Icon size={16} className="mb-3 text-green-600" /><div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{title}</div><p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p></div>
          ))}
        </div>

        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Account</div>
          <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{user?.email}</div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Questions? <a href="mailto:hello@letflowuk.com" className="underline hover:no-underline" style={{ color: 'var(--text-secondary)' }}>hello@letflowuk.com</a></p>
        </div>
      </div>
    </Layout>
  )
}import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'

export default function BillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [managing, setManaging] = useState(false)

  useEffect(() => {
    if (!authLoading && user) loadProfile()
  }, [user, authLoading])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    setProfile(data)
    setProfileLoading(false)
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch { setUpgrading(false) }
  }

  async function handleManage() {
    setManaging(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch { setManaging(false) }
  }

  if (authLoading || profileLoading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    </Layout>
  )

  const isPro = profile?.plan === 'pro'
  const isTrialing = profile?.subscription_status === 'trialing'
  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / 86400000) : 0

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Billing</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Manage your LetFlow subscription</p>

        <div className="rounded-xl border p-6 mb-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Current plan</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{isPro ? 'Pro' : 'Free'}</span>
                {isTrialing && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>Trial</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isPro ? '£9' : '£0'}<span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>/mo</span>
              </div>
            </div>
          </div>

          {isTrialing && daysLeft > 0 && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
              🎉 {daysLeft} days left in your free trial
            </div>
          )}

          {router.query.success && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
              ✅ You are now on Pro! Welcome to LetFlow Pro.
            </div>
          )}

          <div className="space-y-2 mb-6">
            {[
              { text: 'Rent tracking per room', free: true },
              { text: 'Shared bills split', free: true },
              { text: 'Document storage', free: true },
              { text: 'Tenant portal link', free: true },
              { text: 'Unlimited properties', free: false },
              { text: 'Maintenance tracking', free: false },
              { text: 'Compliance cert reminders', free: false },
              { text: 'Automated rent reminders', free: false },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span style={{ color: (isPro || f.free) ? 'var(--green)' : 'var(--text-secondary)' }}>
                  {(isPro || f.free) ? '✓' : '–'}
                </span>
                <span style={{ color: (isPro || f.free) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.text}</span>
                {!f.free && !isPro && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>Pro</span>
                )}
              </div>
            ))}
          </div>

          {!isPro ? (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity"
              style={{ background: 'var(--green)', opacity: upgrading ? 0.7 : 1 }}
            >
              {upgrading ? 'Redirecting to checkout...' : 'Upgrade to Pro — £9/month'}
            </button>
          ) : (
            <button
              onClick={handleManage}
              disabled={managing}
              className="w-full py-3 rounded-xl font-semibold border transition-opacity"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: managing ? 0.7 : 1 }}
            >
              {managing ? 'Opening billing portal...' : 'Manage subscription'}
            </button>
          )}
        </div>

        <div className="rounded-xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Account</div>
          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{user?.email}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Questions? Email <a href="mailto:hello@letflowuk.com" style={{ color: 'var(--green)' }}>hello@letflowuk.com</a>
          </div>
        </div>
      </div>
    </Layout>
  )
}

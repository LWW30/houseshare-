import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import DashboardLayout from '../../components/DashboardLayout'
import { supabase } from '../../lib/supabase'

export default function BillingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [managing, setManaging] = useState(false)

  useEffect(() => {
    loadProfile()
    if (router.query.success) {
      setTimeout(() => router.replace('/dashboard/billing'), 100)
    }
  }, [])

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile({ ...data, email: session.user.email })
    setLoading(false)
  }

  async function handleUpgrade() {
    setUpgrading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    window.location.href = url
  }

  async function handleManage() {
    setManaging(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    window.location.href = url
  }

  const isPro = profile?.plan === 'pro'
  const isTrialing = profile?.subscription_status === 'trialing'
  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / 86400000) : 0

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Billing</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Manage your LetFlow subscription</p>

        {/* Current Plan */}
        <div className="rounded-xl border p-6 mb-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Current plan</div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isPro ? 'Pro' : 'Free'}
                {isTrialing && <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>Trial</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{isPro ? '£9' : '£0'}<span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>/mo</span></div>
            </div>
          </div>

          {isTrialing && daysLeft > 0 && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
              🎉 {daysLeft} days left in your free trial
            </div>
          )}

          {router.query.success && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
              ✅ You're now on Pro! Welcome to LetFlow Pro.
            </div>
          )}

          {router.query.cancelled && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: '#fff3cd', color: '#856404' }}>
              Upgrade cancelled. You can upgrade any time.
            </div>
          )}

          <div className="space-y-2 mb-6">
            {[
              { text: 'Unlimited properties', pro: true, free: false },
              { text: 'Rent tracking per room', pro: true, free: true },
              { text: 'Shared bills split', pro: true, free: true },
              { text: 'Document storage', pro: true, free: true },
              { text: 'Maintenance tracking', pro: true, free: false },
              { text: 'Compliance cert reminders', pro: true, free: false },
              { text: 'Automated rent reminders', pro: true, free: false },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span style={{ color: (isPro || f.free) ? 'var(--green)' : 'var(--text-secondary)' }}>
                  {(isPro || f.free) ? '✓' : '–'}
                </span>
                <span style={{ color: (isPro || f.free) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.text}</span>
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
              {upgrading ? 'Redirecting...' : 'Upgrade to Pro — £9/month'}
            </button>
          ) : (
            <button
              onClick={handleManage}
              disabled={managing}
              className="w-full py-3 rounded-xl font-semibold transition-colors border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: managing ? 0.7 : 1 }}
            >
              {managing ? 'Opening portal...' : 'Manage subscription'}
            </button>
          )}
        </div>

        {/* Account */}
        <div className="rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Account</div>
          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{profile?.email}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Questions? Email hello@letflowuk.com</div>
        </div>
      </div>
    </DashboardLayout>
  )
}
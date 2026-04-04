import { useEffect, useState } from 'react'
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
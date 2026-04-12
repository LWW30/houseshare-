import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { Settings, Bell, Moon, Sun, User, Save, Check } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    landlord_name: '',
    notification_email: '',
  })
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('landlord_name,notification_email').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({ landlord_name: data.landlord_name || '', notification_email: data.notification_email || '' })
        setLoading(false)
      })
    const saved = localStorage.getItem('letflow-theme')
    if (saved === 'dark') setTheme('dark')
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      landlord_name: form.landlord_name || null,
      notification_email: form.notification_email || null,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('letflow-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <Layout>
      <div className="p-8 max-w-xl">
        <div className="flex items-center gap-3 mb-1">
          <Settings size={22} style={{ color: 'var(--text-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Manage your account preferences.</p>

        <div className="space-y-5">
          {/* Profile */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Profile</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Your name</label>
                <input className="input" placeholder="e.g. Luke Walker" value={form.landlord_name} onChange={e => set('landlord_name', e.target.value)} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Used in tenancy agreements and emails</p>
              </div>
              <div>
                <label className="label">Account email</label>
                <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
            </div>
            <div>
              <label className="label">Maintenance alert email</label>
              <input className="input" type="email" placeholder="you@email.com" value={form.notification_email} onChange={e => set('notification_email', e.target.value)} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Where to send alerts when a tenant reports a maintenance issue</p>
            </div>
          </div>

          {/* Appearance */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              {theme === 'light' ? <Sun size={16} style={{ color: 'var(--text-secondary)' }} /> : <Moon size={16} style={{ color: 'var(--text-secondary)' }} />}
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{theme === 'light' ? 'Light mode' : 'Dark mode'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Toggle between light and dark theme</p>
              </div>
              <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
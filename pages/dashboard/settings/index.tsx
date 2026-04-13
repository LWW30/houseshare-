import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { Settings, Bell, User, Save } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('landlord_name,notification_email').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setName(data.landlord_name || '')
          setEmail(data.notification_email || '')
        }
      })
  }, [user])

  const save = async () => {
    if (!user) return
    await supabase.from('profiles').update({ landlord_name: name || null, notification_email: email || null }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout>
      <div className="p-8 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Settings size={22} style={{ color: 'var(--text-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Your name</label>
            <input className="input" placeholder="e.g. Luke Walker" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Maintenance alert email</label>
            <input className="input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button onClick={save} className="btn-primary w-full">{saved ? 'Saved!' : 'Save changes'}</button>
        </div>
      </div>
    </Layout>
  )
}
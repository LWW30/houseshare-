import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { getProperties, type Property } from '../../../lib/supabase'
import { ShieldCheck, AlertTriangle, Check, Plus, X, Calendar } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

type Cert = {
  id: string
  property_id: string
  cert_type: string
  issue_date: string
  expiry_date: string
  notes: string
}

const CERT_TYPES = [
  { key: 'gas_safe', label: 'Gas Safety (CP12)', required: 'Annual', icon: '🔥' },
  { key: 'eicr', label: 'EICR (Electrical)', required: 'Every 5 years', icon: '⚡' },
  { key: 'epc', label: 'EPC', required: 'Every 10 years', icon: '🏠' },
  { key: 'fire_alarm', label: 'Fire Alarm Test', required: 'Annual', icon: '🚨' },
  { key: 'pat', label: 'PAT Test', required: 'Annual', icon: '🔌' },
  { key: 'legionella', label: 'Legionella Risk Assessment', required: 'Periodic', icon: '💧' },
]

function statusColor(expiry: string) {
  const days = differenceInDays(parseISO(expiry), new Date())
  if (days < 0) return { bg: 'bg-red-50', text: 'text-red-700', label: 'EXPIRED', urgent: true }
  if (days < 30) return { bg: 'bg-red-50', text: 'text-red-700', label: days + 'd left', urgent: true }
  if (days < 90) return { bg: 'bg-amber-50', text: 'text-amber-700', label: days + 'd left', urgent: false }
  return { bg: 'bg-green-50', text: 'text-green-700', label: 'Valid', urgent: false }
}

export default function CompliancePage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [certs, setCerts] = useState<Cert[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ property_id: '', cert_type: 'gas_safe', issue_date: '', expiry_date: '', notes: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const load = async () => {
    if (!user) return
    const [props, { data: cs }] = await Promise.all([
      getProperties(user.id),
      supabase.from('compliance_certs').select('*').eq('landlord_id', user.id).order('expiry_date')
    ])
    setProperties(props)
    setCerts(cs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleAdd = async () => {
    if (!user || !form.property_id || !form.expiry_date) return
    await supabase.from('compliance_certs').insert({ ...form, landlord_id: user.id })
    setShowAdd(false)
    setForm({ property_id: '', cert_type: 'gas_safe', issue_date: '', expiry_date: '', notes: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('compliance_certs').delete().eq('id', id)
    load()
  }

  const expiringSoon = certs.filter(c => {
    const days = differenceInDays(parseISO(c.expiry_date), new Date())
    return days < 90
  })

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} style={{ color: 'var(--text-primary)' }} />
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Compliance Certificates</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} />Add certificate
          </button>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Track Gas Safety, EICR, EPC and other legally required certificates across your properties.</p>

        {expiringSoon.length > 0 && (
          <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: '#FEF3C7' }}>
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">{expiringSoon.length} certificate{expiringSoon.length > 1 ? 's' : ''} expiring soon or expired</p>
              <p className="text-amber-700 text-xs mt-0.5">Renew immediately to stay compliant. Fines for non-compliance can exceed £30,000.</p>
            </div>
          </div>
        )}

        {certs.length === 0 ? (
          <div className="card p-12 text-center">
            <ShieldCheck size={32} className="text-gray-300 mx-auto mb-4" />
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No certificates yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Add your Gas Safety, EICR and EPC certificates to track renewal dates.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={14} />Add first certificate</button>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map(c => {
              const certType = CERT_TYPES.find(t => t.key === c.cert_type)
              const status = statusColor(c.expiry_date)
              const prop = properties.find(p => p.id === c.property_id)
              return (
                <div key={c.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{certType?.icon || '📄'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{certType?.label || c.cert_type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>{status.label}</span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {prop?.name || 'Unknown property'} &middot; Expires {format(parseISO(c.expiry_date), 'd MMM yyyy')}
                        {c.issue_date && ` · Issued ${format(parseISO(c.issue_date), 'd MMM yyyy')}`}
                      </p>
                      {c.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100">
                    <X size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="card p-6 w-full max-w-md mx-4">
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add certificate</h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Property</label>
                  <select className="input" value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                    <option value="">Select property...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Certificate type</label>
                  <select className="input" value={form.cert_type} onChange={e => set('cert_type', e.target.value)}>
                    {CERT_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label} ({t.required})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Issue date</label>
                    <input type="date" className="input" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Expiry date *</label>
                    <input type="date" className="input" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <input className="input" placeholder="e.g. Engineer: John Smith, Gas Safe no. 12345" value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdd} disabled={!form.property_id || !form.expiry_date} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check size={14} />Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
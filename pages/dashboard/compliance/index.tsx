import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { ShieldCheck, AlertCircle, CheckCircle2, Clock, Plus, ChevronRight, Info } from 'lucide-react'
import Link from 'next/link'

type CertType = 'gas_safety' | 'eicr' | 'epc' | 'hmo_licence' | 'fire_risk' | 'pat' | 'right_to_rent' | 'selective_licence'

const CERT_LABELS: Record<CertType, { label: string; interval: string; note: string }> = {
  gas_safety:        { label: 'Gas Safety Certificate', interval: 'Annual', note: 'Required every 12 months. Provide to tenants within 28 days of inspection.' },
  eicr:              { label: 'EICR', interval: 'Every 5 years', note: 'Electrical Installation Condition Report. Mandatory for all rental properties.' },
  epc:               { label: 'EPC', interval: 'Every 10 years', note: 'Minimum E rating required. F or G-rated properties are illegal to let.' },
  hmo_licence:       { label: 'HMO Licence', interval: 'Every 5 years', note: 'Mandatory for HMOs with 5+ occupants forming 2+ households.' },
  fire_risk:         { label: 'Fire Risk Assessment', interval: 'Annual (HMO)', note: 'Legally required for all HMOs. Review after any structural changes.' },
  pat:               { label: 'PAT Testing', interval: 'Annual (recommended)', note: 'Portable Appliance Testing for all landlord-supplied electrical items.' },
  right_to_rent:     { label: 'Right to Rent Check', interval: 'Per tenancy', note: 'Must verify tenant immigration status before tenancy start. Keep records.' },
  selective_licence: { label: 'Selective Licence', interval: 'Per local authority', note: 'Some councils require this for all rentals. Check with your local authority.' },
}

const AWAAB_NOTE = "Awaab's Law: Hazardous damp and mould must be investigated within 14 days and repaired within 7 weeks. Emergency repairs must start within 24 hours."

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
function statusColor(days: number | null) {
  if (days === null) return 'text-gray-400'
  if (days < 0) return 'text-red-600'
  if (days < 30) return 'text-amber-600'
  return 'text-green-600'
}
function statusLabel(days: number | null) {
  if (days === null) return 'Not uploaded'
  if (days < 0) return 'Expired ' + Math.abs(days) + 'd ago'
  if (days < 30) return 'Expires in ' + days + 'd'
  return 'Valid — ' + days + 'd remaining'
}

export default function CompliancePage() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('compliance_documents').select('*').eq('landlord_id', user.id),
      supabase.from('properties').select('id, name').eq('user_id', user.id),
    ]).then(([docsRes, propsRes]) => {
      setDocs(docsRes.data || [])
      setProperties(propsRes.data || [])
      setLoading(false)
    })
  }, [user])

  const expired = docs.filter(d => daysUntil(d.expiry_date) < 0).length
  const expiringSoon = docs.filter(d => { const n = daysUntil(d.expiry_date); return n >= 0 && n < 30 }).length
  const valid = docs.length - expired - expiringSoon

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Compliance</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Certificates, licences and legal checks across all your properties</p>
          </div>
          <Link href="/dashboard/documents" className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={15} /> Upload document
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Expired', value: expired, color: 'text-red-500', icon: AlertCircle },
            { label: 'Expiring soon', value: expiringSoon, color: 'text-amber-500', icon: Clock },
            { label: 'Valid', value: valid, color: 'text-green-500', icon: CheckCircle2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center gap-2 mb-1"><Icon size={14} className={color} /><p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p></div>
              <p className={'text-3xl font-semibold ' + color}>{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 p-4 rounded-2xl flex gap-3 border" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">{"Awaab's Law — active from October 2025"}</p>
            <p className="text-xs text-blue-700">{AWAAB_NOTE}</p>
          </div>
        </div>

        {docs.length > 0 && (
          <div className="card overflow-hidden mb-6">
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}>
              <ShieldCheck size={14} className="text-green-600" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your uploaded certificates</h2>
            </div>
            {docs.map((doc, i) => {
              const days = daysUntil(doc.expiry_date)
              const prop = properties.find(p => p.id === doc.property_id)
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{doc.name || CERT_LABELS[doc.type as CertType]?.label || doc.type}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{prop?.name || 'All properties'} · Expires {doc.expiry_date}</p>
                  </div>
                  <span className={'text-xs font-semibold ' + statusColor(days)}>{statusLabel(days)}</span>
                </div>
              )
            })}
          </div>
        )}

        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>UK compliance requirements</h2>
        <div className="space-y-2">
          {(Object.entries(CERT_LABELS) as [CertType, any][]).map(([type, info]) => {
            const uploaded = docs.filter(d => d.type === type)
            const hasValid = uploaded.some(d => daysUntil(d.expiry_date) > 0)
            const hasExpired = uploaded.some(d => daysUntil(d.expiry_date) < 0)
            return (
              <div key={type} className="card p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ' + (hasValid ? 'bg-green-500' : hasExpired ? 'bg-red-500' : 'bg-gray-200')}>
                    {hasValid ? <CheckCircle2 size={12} className="text-white" /> : hasExpired ? <AlertCircle size={12} className="text-white" /> : <Plus size={12} className="text-gray-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{info.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}><span className="font-medium">{info.interval}</span> · {info.note}</p>
                  </div>
                </div>
                <Link href="/dashboard/documents" className="flex items-center gap-1 text-xs whitespace-nowrap flex-shrink-0 hover:underline" style={{ color: 'var(--text-muted)' }}>
                  {uploaded.length === 0 ? 'Upload' : 'Update'} <ChevronRight size={12} />
                </Link>
              </div>
            )
          })}
        </div>

        <div className="mt-6 card p-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong>Important:</strong> Requirements vary by local authority and property type. Always check with your local council — especially for selective licensing and HMO licensing thresholds. This covers standard England & Wales requirements as of April 2026.
          </p>
        </div>
      </div>
    </Layout>
  )
    }—

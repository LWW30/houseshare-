import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { getProperties, type Property } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/router'
import { ScrollText, Download, Zap, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { format, addDays } from 'date-fns'

type NoticeType = 's8' | 's13'

const S8_GROUNDS = [
  { value: '8', label: 'Ground 8 — Rent arrears (mandatory, 2 months+)' },
  { value: '10', label: 'Ground 10 — Rent arrears (discretionary, any amount)' },
  { value: '11', label: 'Ground 11 — Persistent rent delays' },
  { value: '1A', label: 'Ground 1A — Landlord wishes to sell the property' },
  { value: '12', label: 'Ground 12 — Breach of tenancy agreement' },
  { value: '13', label: 'Ground 13 — Deterioration of property' },
  { value: '14', label: 'Ground 14 — Nuisance or criminal behaviour' },
]

export default function NoticesPage() {
  const { user, loading } = useAuth()
  const { isPro, planLoading } = usePlan()
  const router = useRouter()
  const [noticeType, setNoticeType] = useState<NoticeType>('s8')
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [form, setForm] = useState({
    property_id: '',
    tenant_id: '',
    ground: '8',
    arrears_amount: '',
    reason: '',
    hearing_date: '',
    rent_increase: '',
    effective_date: '',
  })
  const [generated, setGenerated] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!user) return
    getProperties(user.id).then(setProperties)
  }, [user])

  useEffect(() => {
    if (!form.property_id) return
    supabase.from('tenants').select('id, name, room:rooms(name, monthly_rent)').eq('property_id', form.property_id).eq('left', false).then(({ data }) => {
      setTenants(data || [])
      setForm(f => ({ ...f, tenant_id: '' }))
    })
  }, [form.property_id])

  const selectedProp = properties.find(p => p.id === form.property_id)
  const selectedTenant = tenants.find(t => t.id === form.tenant_id)
  const today = format(new Date(), 'd MMMM yyyy')
  const s8Notice = format(addDays(new Date(), 14), 'd MMMM yyyy')
  const s13Notice = format(addDays(new Date(), 60), 'd MMMM yyyy')

  const generateS8 = () => {
    if (!selectedProp || !selectedTenant) return
    const ground = S8_GROUNDS.find(g => g.value === form.ground)
    return `SECTION 8 NOTICE SEEKING POSSESSION
Housing Act 1988 (as amended by the Renters Rights Act 2025)

Date of notice: ${today}
Notice is valid from: ${s8Notice} (14 days from date of notice)

LANDLORD DETAILS
Name: [YOUR FULL NAME]
Address: [YOUR ADDRESS]

TENANT DETAILS
Name: ${selectedTenant.name}
Property address: ${selectedProp.address}
Room: ${selectedTenant.room?.name || 'N/A'}

NOTICE
I hereby give you notice that I require possession of the above property.

GROUND(S) FOR POSSESSION
${ground?.label || 'Ground ' + form.ground}
${form.arrears_amount ? 'Outstanding rent arrears: £' + form.arrears_amount : ''}
${form.reason ? 'Particulars: ' + form.reason : ''}

You must leave the property by ${s8Notice} or proceedings for possession may be taken against you.

If you do not leave, I may apply to the County Court for a possession order. You will then be served with a summons to appear at court on ${form.hearing_date || '[DATE TO BE DETERMINED]'}.

IMPORTANT: If you need housing advice, contact your local council or Citizens Advice Bureau.

Signed: ___________________________
Name: [YOUR FULL NAME]
Date: ${today}

---
This notice was prepared using LetFlowUK (letflowuk.com).
This notice is a template only and does not constitute legal advice. Always verify compliance with current legislation before serving. Consider seeking legal advice before proceeding with possession proceedings.`
  }

  const generateS13 = () => {
    if (!selectedProp || !selectedTenant) return
    const currentRent = selectedTenant.room?.monthly_rent || 0
    const newRent = form.rent_increase || '[NEW RENT AMOUNT]'
    return `SECTION 13 NOTICE OF RENT INCREASE
Housing Act 1988 s.13 — Periodic Tenancy

Date of notice: ${today}
Increase takes effect from: ${s13Notice} (minimum 2 months notice)

LANDLORD DETAILS
Name: [YOUR FULL NAME]
Address: [YOUR ADDRESS]

TENANT DETAILS
Name: ${selectedTenant.name}
Property address: ${selectedProp.address}
Room: ${selectedTenant.room?.name || 'N/A'}

NOTICE OF RENT INCREASE
I give you notice that I propose to increase the rent of the above property.

Current monthly rent: £${currentRent}
Proposed new monthly rent: £${newRent}
Effective date: ${form.effective_date || s13Notice}

Your right to challenge: If you believe this rent is above market rate, you may apply to the First-tier Tribunal (Property Chamber) to have the rent determined. You must do this before the effective date shown above.

To challenge this increase, you can apply online at: www.justice.gov.uk/tribunals/residential-property

IMPORTANT: Rent can only be increased once per 12 months under the Renters Rights Act 2025.

Signed: ___________________________
Name: [YOUR FULL NAME]
Date: ${today}

---
This notice was prepared using LetFlowUK (letflowuk.com).
This notice is a template only and does not constitute legal advice. The correct prescribed form for Section 13 notices must be used — verify at legislation.gov.uk.`
  }

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      const text = noticeType === 's8' ? generateS8() : generateS13()
      setGenerated(text || null)
      setGenerating(false)
    }, 300)
  }

  const handleDownload = () => {
    if (!generated) return
    const blob = new Blob([generated], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${noticeType === 's8' ? 'Section-8' : 'Section-13'}-Notice-${selectedTenant?.name || 'tenant'}-${format(new Date(), 'yyyy-MM-dd')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || planLoading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" /></div></Layout>

  if (!isPro) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ScrollText size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Legal notice generator is a Pro feature</h1>
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Generate Section 8 and Section 13 notices in minutes, pre-filled with your tenant data. RRA 2025 compliant.
        </p>
        <Link href="/dashboard/billing" className="btn-primary flex items-center gap-2 px-6 py-2.5">
          <Zap size={14} /> Upgrade to Pro — from £29/mo
        </Link>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>14-day free trial · Cancel any time</p>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Legal Notices</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Generate Section 8 and Section 13 notices pre-filled with tenant data</p>
        </div>

        {/* Notice type tabs */}
        <div className="flex gap-2 mb-6">
          {[{ type: 's8' as NoticeType, label: 'Section 8', desc: 'Possession notice' }, { type: 's13' as NoticeType, label: 'Section 13', desc: 'Rent increase' }].map(({ type, label, desc }) => (
            <button
              key={type}
              onClick={() => { setNoticeType(type); setGenerated(null) }}
              className={`flex-1 py-3 px-4 rounded-2xl border text-left transition-colors ${noticeType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`font-medium text-sm ${noticeType === type ? 'text-white' : ''}`} style={noticeType !== type ? { color: 'var(--text-primary)' } : {}}>{label}</div>
              <div className={`text-xs mt-0.5 ${noticeType === type ? 'text-gray-400' : ''}`} style={noticeType !== type ? { color: 'var(--text-muted)' } : {}}>{desc}</div>
            </button>
          ))}
        </div>

        <div className="card p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="label">Property *</label>
              <select className="input" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                <option value="">Select a property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tenant *</label>
              <select className="input" value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))} disabled={!form.property_id}>
                <option value="">Select a tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} — {t.room?.name}</option>)}
              </select>
            </div>

            {noticeType === 's8' && (
              <>
                <div>
                  <label className="label">Ground for possession *</label>
                  <select className="input" value={form.ground} onChange={e => setForm(f => ({ ...f, ground: e.target.value }))}>
                    {S8_GROUNDS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                {(form.ground === '8' || form.ground === '10') && (
                  <div>
                    <label className="label">Arrears amount (£)</label>
                    <input className="input" type="number" placeholder="e.g. 1200" value={form.arrears_amount} onChange={e => setForm(f => ({ ...f, arrears_amount: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="label">Particulars / reason (optional)</label>
                  <textarea className="input" rows={3} placeholder="Describe the grounds in detail..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
              </>
            )}

            {noticeType === 's13' && (
              <>
                <div>
                  <label className="label">New monthly rent (£) *</label>
                  <input className="input" type="number" placeholder="e.g. 650" value={form.rent_increase} onChange={e => setForm(f => ({ ...f, rent_increase: e.target.value }))} />
                  {selectedTenant?.room?.monthly_rent && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Current rent: £{selectedTenant.room.monthly_rent}/mo</p>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!form.property_id || !form.tenant_id || generating}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <><ScrollText size={14} />Generate notice</>}
          </button>
        </div>

        {generated && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{noticeType === 's8' ? 'Section 8' : 'Section 13'} Notice — Preview</h2>
              <button onClick={handleDownload} className="btn-secondary flex items-center gap-2 text-xs">
                <Download size={13} /> Download .txt
              </button>
            </div>
            <div className="p-5">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{generated}</pre>
            </div>
            <div className="px-5 py-3 border-t text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              ⚠️ Fill in <strong style={{ color: 'var(--text-secondary)' }}>[YOUR NAME]</strong> and <strong style={{ color: 'var(--text-secondary)' }}>[YOUR ADDRESS]</strong> before serving. Always seek legal advice before issuing possession notices.
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

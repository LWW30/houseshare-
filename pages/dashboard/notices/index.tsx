import { useEffect, useState } from 'react'
import { usePlan } from '../../../lib/usePlan'
import Layout from '../../../components/Layout'
import { useRouter } from 'next/router'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, getTenantsByProperty, type Property, type Tenant } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { format, addDays, addMonths } from 'date-fns'
import { FileText, Printer, Copy, Check, AlertCircle, Info, Loader2 } from 'lucide-react'

const S8_GROUNDS = [
  { id: 'g8', label: 'Ground 8 — Serious rent arrears', noticePeriod: '4 weeks', noticeDays: 28, mandatory: true, description: 'Tenant owes at least 2 months rent (if monthly) both when notice is served and at court hearing.', requiresArrears: true },
  { id: 'g8a', label: 'Ground 8A — Repeated rent arrears', noticePeriod: '4 weeks', noticeDays: 28, mandatory: true, description: 'Tenant has been in arrears of at least 2 months rent on 3 separate occasions within the last 3 years.', requiresArrears: true },
  { id: 'g10', label: 'Ground 10 — Some rent arrears', noticePeriod: '4 weeks', noticeDays: 28, mandatory: false, description: 'Tenant owes some rent, but less than the Ground 8 threshold. Court has discretion.', requiresArrears: true },
  { id: 'g11', label: 'Ground 11 — Persistent late payment', noticePeriod: '2 months', noticeDays: 61, mandatory: false, description: 'Tenant has persistently paid rent late, even if currently up to date.', requiresArrears: false },
  { id: 'g12', label: 'Ground 12 — Breach of tenancy obligation', noticePeriod: '2 months', noticeDays: 61, mandatory: false, description: 'Tenant has broken a term of the tenancy agreement (other than rent payment).', requiresArrears: false },
  { id: 'g14', label: 'Ground 14 — Nuisance or annoyance', noticePeriod: '2 weeks', noticeDays: 14, mandatory: false, description: 'Tenant or visitor has caused nuisance or annoyance to neighbours, or the property has been used for illegal purposes.', requiresArrears: false },
  { id: 'g17', label: 'Ground 17 — False statement', noticePeriod: '2 months', noticeDays: 61, mandatory: false, description: 'Tenant obtained the tenancy by making a false or misleading statement.', requiresArrears: false },
] as const

type NoticeType = 's8'|'s13'
type S8Ground = typeof S8_GROUNDS[number]
interface FormState { noticeType: NoticeType; tenantId: string; groundId: string; arrearsAmount: string; arrearsMonths: string; breachDescription: string; currentRent: string; newRent: string; increaseReason: string; serveDate: string; landlordName: string; landlordAddress: string }

export default function NoticesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { isPro, planLoading } = usePlan()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<FormState>({ noticeType: 's8', tenantId: '', groundId: 'g8', arrearsAmount: '', arrearsMonths: '', breachDescription: '', currentRent: '', newRent: '', increaseReason: '', serveDate: today, landlordName: '', landlordAddress: '' })

  useEffect(() => {
    if (!user) return
    async function load() {
      const props = await getProperties(user!.id)
      const all: Tenant[] = []
      for (const p of props) { const ts = await getTenantsByProperty(p.id); all.push(...ts.map(t => ({ ...t, property: p }))) }
      setTenants(all)
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
      if (profile?.full_name) setForm(f => ({ ...f, landlordName: profile.full_name }))
      setDataLoading(false)
    }
    load()
  }, [user])

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))
  const selectedTenant = tenants.find(t => t.id === form.tenantId)
  const selectedGround = S8_GROUNDS.find(g => g.id === form.groundId)
  const possessionDate = form.serveDate && selectedGround ? format(addDays(new Date(form.serveDate), selectedGround.noticeDays), 'd MMMM yyyy') : ''
  const s13Date = form.serveDate ? format(addMonths(new Date(form.serveDate), 2), 'd MMMM yyyy') : ''
  const serveFormatted = form.serveDate ? format(new Date(form.serveDate), 'd MMMM yyyy') : ''

  const isValid = () => {
    if (!form.tenantId || !form.serveDate || !form.landlordName) return false
    if (form.noticeType === 's8' && !form.groundId) return false
    if (form.noticeType === 's8' && selectedGround?.requiresArrears && !form.arrearsAmount) return false
    if (form.noticeType === 's13') { if (!form.currentRent || !form.newRent) return false; if (parseFloat(form.newRent) <= parseFloat(form.currentRent)) return false }
    return true
  }

  const buildS8 = () => !selectedTenant || !selectedGround ? '' : `NOTICE SEEKING POSSESSION
Housing Act 1988 (as amended by the Renters Rights Act 2025) — Section 8

TO: ${selectedTenant.name}
OF: ${(selectedTenant as any).property?.address || ''}
DATE OF SERVICE: ${serveFormatted}

LANDLORD: ${form.landlordName}
ADDRESS: ${form.landlordAddress || ''}

GROUND FOR POSSESSION:
${selectedGround.label}
${selectedGround.mandatory ? 'MANDATORY GROUND — court must make possession order if proved.' : 'DISCRETIONARY GROUND — court may make possession order if reasonable.'}

${selectedGround.description}
${selectedGround.requiresArrears && form.arrearsAmount ? 'Current arrears: £' + form.arrearsAmount + (form.arrearsMonths ? ' (' + form.arrearsMonths + ' months)' : '') : ''}
${form.breachDescription ? 'Details: ' + form.breachDescription : ''}

NOTICE PERIOD: ${selectedGround.noticePeriod}
EARLIEST POSSESSION DATE: ${possessionDate}

You must leave the property on or before the date stated above. If you do not leave, court proceedings may be issued against you.

You are entitled to seek advice from a solicitor or Citizens Advice.

Signed: _________________________ Date: ${serveFormatted}
Name: ${form.landlordName}

IMPORTANT: This is a template — not legal advice. Have this notice reviewed by a qualified solicitor before serving.`

  const buildS13 = () => {
    if (!selectedTenant) return ''
    const curr = parseFloat(form.currentRent) || 0
    const next = parseFloat(form.newRent) || 0
    const inc = next - curr
    const pct = curr > 0 ? ((inc/curr)*100).toFixed(1) : '0'
    return `NOTICE OF RENT INCREASE
Housing Act 1988, Section 13 — Renters Rights Act 2025

TO: ${selectedTenant.name}
OF: ${(selectedTenant as any).property?.address || ''}
DATE OF NOTICE: ${serveFormatted}

LANDLORD: ${form.landlordName}
ADDRESS: ${form.landlordAddress || ''}

PROPOSED RENT INCREASE:
Current rent: £${curr.toFixed(2)} per month
Proposed rent: £${next.toFixed(2)} per month
Increase: £${inc.toFixed(2)} per month (${pct}%)
Effective from: ${s13Date}

REASON: ${form.increaseReason || 'The proposed increase reflects current market rents for comparable properties in the area.'}

YOUR RIGHTS AS A TENANT:
- Rent can only be increased once every 12 months via this statutory notice
- Rent review clauses in your tenancy agreement are no longer enforceable
- You have the right to refer this proposed increase to the First-tier Tribunal (Property Chamber) if you believe it is above market rate
- The tribunal can only reduce the proposed increase

If you do not challenge this notice before ${s13Date}, your rent will increase to £${next.toFixed(2)} per month from that date.

Signed: _________________________ Date: ${serveFormatted}
Name: ${form.landlordName}

IMPORTANT: This is a template — not legal advice. Keep a record of service (recorded delivery or witnessed hand delivery).`
  }

  const noticeText = form.noticeType === 's8' ? buildS8() : buildS13()

  const handleCopy = () => { navigator.clipboard.writeText(noticeText); setCopied(true); setTimeout(() => setCopied(false), 2500) }
  const handlePrint = () => { const w = window.open('','_blank'); if (!w) return; w.document.write('<html><head><title>Notice</title><style>body{font-family:monospace;font-size:12pt;white-space:pre-wrap;margin:40px}</style></head><body>' + noticeText.replace(/</g,'&lt;') + '</body></html>'); w.document.close(); w.print() }

  if (loading || dataLoading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>

  if (!isPro && !planLoading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--text-primary)' }}>
          <span style={{ fontSize: 22 }}>⚡</span>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Legal notice generator is a Pro feature</h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>Generate Section 8 and Section 13 notices in minutes, pre-filled with your tenant data. RRA 2025 compliant.</p>
        <button onClick={() => router.push('/dashboard/billing')} className="btn-primary flex items-center gap-2 px-6 py-2.5">
          ⚡ Upgrade to Pro — £19/mo
        </button>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>14-day free trial · Cancel any time</p>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Legal notices</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Generate Section 8 possession notices and Section 13 rent increase notices</p>
        </div>

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800 mb-0.5">These are templates, not legal advice</p>
            <p className="text-xs text-amber-700 leading-relaxed">Always have legal notices reviewed by a qualified solicitor before serving. Errors can invalidate your notice and delay possession.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card p-5">
              <label className="label mb-3 block">Notice type</label>
              <div className="grid grid-cols-2 gap-2">
                {([{id:'s8',title:'Section 8',sub:'Possession notice'},{id:'s13',title:'Section 13',sub:'Rent increase'}] as const).map(opt => (
                  <button key={opt.id} onClick={() => set('noticeType', opt.id)} className={"p-4 rounded-xl border text-left transition-all " + (form.noticeType===opt.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-400')}>
                    <div className={"font-semibold text-sm " + (form.noticeType===opt.id?'text-white':'')} style={form.noticeType!==opt.id?{color:'var(--text-primary)'}:{}}>{opt.title}</div>
                    <div className={"text-xs mt-0.5 " + (form.noticeType===opt.id?'text-gray-300':'')} style={form.noticeType!==opt.id?{color:'var(--text-muted)'}:{}}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <label className="label">Tenant *</label>
              <select className="input" value={form.tenantId} onChange={e => { const t=tenants.find(t=>t.id===e.target.value); set('tenantId',e.target.value); if(t?.room?.monthly_rent) set('currentRent',String(t.room.monthly_rent)) }}>
                <option value="">Select tenant...</option>
                {tenants.filter(t=>!(t as any).status||(t as any).status==='active').map(t=><option key={t.id} value={t.id}>{t.name} — {(t as any).property?.address?.split(',')[0]} · {t.room?.name}</option>)}
              </select>
              {selectedTenant && <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs space-y-1" style={{color:'var(--text-secondary)'}}><div><span className="font-medium">Email:</span> {selectedTenant.email}</div><div><span className="font-medium">Rent:</span> £{selectedTenant.room?.monthly_rent}/mo</div><div><span className="font-medium">Started:</span> {selectedTenant.tenancy_start ? format(new Date(selectedTenant.tenancy_start),'d MMM yyyy') : '—'}</div></div>}
            </div>

            {form.noticeType === 's8' && (
              <div className="card p-5 space-y-4">
                <div>
                  <label className="label">Ground for possession *</label>
                  <select className="input" value={form.groundId} onChange={e => set('groundId',e.target.value)}>
                    {S8_GROUNDS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                  {selectedGround && <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl"><div className="flex items-start gap-2"><Info size={12} className="text-blue-500 flex-shrink-0 mt-0.5"/><div><p className="text-xs text-blue-700 leading-relaxed">{selectedGround.description}</p><p className="text-xs text-blue-600 mt-1 font-medium">Notice period: {selectedGround.noticePeriod} · {selectedGround.mandatory?'Mandatory':'Discretionary'} ground</p></div></div></div>}
                </div>
                {selectedGround?.requiresArrears && <div className="grid grid-cols-2 gap-3"><div><label className="label">Arrears amount (£) *</label><input className="input" type="number" placeholder="e.g. 1200" value={form.arrearsAmount} onChange={e=>set('arrearsAmount',e.target.value)}/></div><div><label className="label">Months outstanding</label><input className="input" type="number" placeholder="e.g. 2" value={form.arrearsMonths} onChange={e=>set('arrearsMonths',e.target.value)}/></div></div>}
                {(form.groundId==='g12'||form.groundId==='g14') && <div><label className="label">Description of breach</label><textarea className="input" rows={3} style={{resize:'none'}} placeholder="Describe the breach..." value={form.breachDescription} onChange={e=>set('breachDescription',e.target.value)}/></div>}
              </div>
            )}

            {form.noticeType === 's13' && (
              <div className="card p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Current rent (£/mo) *</label><input className="input" type="number" value={form.currentRent} onChange={e=>set('currentRent',e.target.value)}/></div>
                  <div><label className="label">New rent (£/mo) *</label><input className="input" type="number" value={form.newRent} onChange={e=>set('newRent',e.target.value)}/></div>
                </div>
                {form.currentRent && form.newRent && parseFloat(form.newRent) > parseFloat(form.currentRent) && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">Increase: £{(parseFloat(form.newRent)-parseFloat(form.currentRent)).toFixed(2)}/mo · Effective: {s13Date}</div>}
                {form.currentRent && form.newRent && parseFloat(form.newRent) <= parseFloat(form.currentRent) && <p className="text-xs text-red-600">New rent must be higher than current rent.</p>}
                <div><label className="label">Reason for increase</label><textarea className="input" rows={3} style={{resize:'none'}} placeholder="e.g. In line with current market rents..." value={form.increaseReason} onChange={e=>set('increaseReason',e.target.value)}/></div>
              </div>
            )}

            <div className="card p-5 space-y-4">
              <div><label className="label">Date of service *</label><input className="input" type="date" value={form.serveDate} onChange={e=>set('serveDate',e.target.value)}/>
                {possessionDate && form.noticeType==='s8' && <p className="text-xs mt-1.5" style={{color:'var(--text-muted)'}}>Earliest possession date: <strong style={{color:'var(--text-primary)'}}>{possessionDate}</strong></p>}
                {s13Date && form.noticeType==='s13' && <p className="text-xs mt-1.5" style={{color:'var(--text-muted)'}}>Rent increase effective: <strong style={{color:'var(--text-primary)'}}>{s13Date}</strong></p>}
              </div>
              <div><label className="label">Your name (landlord) *</label><input className="input" placeholder="Full legal name" value={form.landlordName} onChange={e=>set('landlordName',e.target.value)}/></div>
              <div><label className="label">Your address</label><input className="input" placeholder="Your correspondence address" value={form.landlordAddress} onChange={e=>set('landlordAddress',e.target.value)}/></div>
            </div>
          </div>

          <div>
            <div className="card overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor:'var(--card-border)'}}>
                <div className="flex items-center gap-2"><FileText size={15} style={{color:'var(--text-secondary)'}}/><span className="font-medium text-sm" style={{color:'var(--text-primary)'}}>{form.noticeType==='s8'?'Section 8 Notice':'Section 13 Notice'}</span></div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy} disabled={!isValid()} className={"flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border " + (isValid()?'bg-gray-50 border-gray-200 hover:bg-gray-100':'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50')} style={{color:'var(--text-secondary)'}}>{copied?<Check size={11} className="text-green-500"/>:<Copy size={11}/>}{copied?'Copied':'Copy'}</button>
                  <button onClick={handlePrint} disabled={!isValid()} className={"flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border " + (isValid()?'bg-gray-900 border-gray-900 text-white hover:bg-gray-700':'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50')}><Printer size={11}/>Print / PDF</button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto font-mono text-xs leading-relaxed" style={{maxHeight:'65vh',color:'var(--text-secondary)',whiteSpace:'pre-wrap',background:'var(--card-bg)'}}>
                {isValid() ? noticeText : <div className="flex flex-col items-center justify-center h-48 text-center"><FileText size={28} className="mb-3" style={{color:'var(--text-muted)'}}/><p className="text-sm font-medium mb-1" style={{color:'var(--text-secondary)'}}>Complete the form to preview</p><p className="text-xs" style={{color:'var(--text-muted)'}}>Select a tenant and fill in required fields</p></div>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-center" style={{color:'var(--text-muted)'}}>Templates based on the Housing Act 1988 as amended by the Renters Rights Act 2025 — <a href="https://www.gov.uk/evict-tenants/section-8" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">Gov.uk possession guidance</a></div>
      </div>
    </Layout>
  )
}

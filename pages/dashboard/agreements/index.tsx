import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { getProperties, type Property } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { FileText, Download, Zap } from 'lucide-react'
import Link from 'next/link'
import { format, addMonths } from 'date-fns'

type Tenant = { id: string; name: string; email: string; rent_amount: number; start_date: string; end_date?: string; room?: { name: string } }

export default function AgreementsPage() {
  const { user } = useAuth()
  const { plan } = usePlan()
  const isPro = plan === 'pro'
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [form, setForm] = useState({
    tenantId: '', landlordName: '', landlordAddress: '', landlordEmail: '',
    depositAmount: '', depositScheme: 'DPS', startDate: format(new Date(), 'yyyy-MM-dd'),
    termMonths: '12', rentDay: '1', specialTerms: ''
  })
  const [loading, setLoading] = useState(true)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!user) return
    Promise.all([
      getProperties(user.id),
      supabase.from('tenants').select('id,name,email,rent_amount,start_date,end_date,rooms(name)').eq('landlord_id', user.id).eq('status', 'active')
    ]).then(([props, { data: ts }]) => {
      setProperties(props)
      setTenants((ts || []).map((t: any) => ({ ...t, room: t.rooms })))
      setLoading(false)
    })
  }, [user])

  const selectedTenant = tenants.find(t => t.id === form.tenantId)
  const selectedProp = selectedTenant ? properties.find(p =>
    tenants.find(t => t.id === form.tenantId)) : null

  const generateAST = () => {
    if (!selectedTenant) return
    const startDate = new Date(form.startDate)
    const endDate = addMonths(startDate, parseInt(form.termMonths))
    const propAddr = selectedProp?.address || '[property address]'

    const ast = `ASSURED SHORTHOLD TENANCY AGREEMENT

This agreement is made under the Housing Act 1988 (as amended by the Housing Act 1996 and the Renters (Reform) Act 2024).

DATE: ${format(new Date(), 'd MMMM yyyy')}

PARTIES
-------
LANDLORD: ${form.landlordName || '[Landlord Name]'}
ADDRESS:  ${form.landlordAddress || '[Landlord Address]'}
EMAIL:    ${form.landlordEmail || '[Landlord Email]'}

TENANT:   ${selectedTenant.name}
EMAIL:    ${selectedTenant.email || '[Tenant Email]'}

PROPERTY
--------
The property let under this agreement ("the Property") is:
${propAddr}${selectedTenant.room ? ', ' + selectedTenant.room.name : ''}

TERM
----
Type:       Fixed term Assured Shorthold Tenancy
Start date: ${format(startDate, 'd MMMM yyyy')}
End date:   ${format(endDate, 'd MMMM yyyy')}
Duration:   ${form.termMonths} months

RENT
----
Monthly rent:   £${selectedTenant.rent_amount?.toFixed(2) || '0.00'}
Payment day:    ${form.rentDay === '1' ? '1st' : form.rentDay === '28' ? '28th' : form.rentDay + 'th'} of each month
Payment method: Bank transfer

DEPOSIT
-------
Deposit amount: £${form.depositAmount || (selectedTenant.rent_amount ? (selectedTenant.rent_amount * 5 / 4).toFixed(2) : '0.00')}
Protection:     ${form.depositScheme}
Note: The deposit will be protected within 30 days of receipt in a government-approved scheme.

LANDLORD OBLIGATIONS
--------------------
1. To maintain the structure and exterior of the Property.
2. To keep in repair and proper working order all installations for the supply of gas, electricity, water and sanitation.
3. To maintain any appliances for space heating or water heating.
4. To ensure the Property meets the Decent Homes Standard.
5. To comply with the Renters Rights Act 2025, including providing required information and not retaliating against tenants exercising their rights.
6. To protect the deposit in a government-approved scheme within 30 days.
7. To give at least 4 months' notice to end the tenancy (after Renters Rights Act 2025 commencement).

TENANT OBLIGATIONS
------------------
1. To pay the rent on time each month.
2. To use the Property as a private dwelling only.
3. Not to sublet or take in lodgers without the landlord's written consent.
4. To keep the Property in a clean and tidy condition.
5. To report any disrepair or defects to the landlord promptly.
6. Not to cause nuisance or annoyance to neighbours.
7. Not to make alterations to the Property without written consent.
8. To allow the landlord access for inspections with at least 24 hours' written notice.
9. To vacate the Property at the end of the tenancy in the condition it was received.

POSSESSION
----------
This is an Assured Shorthold Tenancy. Under the Renters Rights Act 2025, Section 21 'no-fault' evictions have been abolished. The landlord may only recover possession on valid grounds under Schedule 2 of the Housing Act 1988 (as amended), with appropriate notice periods.

${form.specialTerms ? 'SPECIAL TERMS\n-------------\n' + form.specialTerms + '\n\n' : ''}SIGNATURES
----------
By signing below, both parties agree to the terms of this tenancy agreement.

LANDLORD: _________________________ DATE: _____________
          ${form.landlordName || '[Landlord Name]'}

TENANT:   _________________________ DATE: _____________
          ${selectedTenant.name}

---
This agreement was generated by LetFlowUK (app.letflowuk.com).
Note: This is a template. Consider having it reviewed by a solicitor for complex situations.
`
    const blob = new Blob([ast], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AST-${selectedTenant.name.replace(/ /g, '-')}-${format(startDate, 'yyyy-MM-dd')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isPro) return (
    <Layout>
      <div className="p-8 max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <FileText size={22} style={{ color: 'var(--text-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tenancy Agreements</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Generate RRA 2025-compliant Assured Shorthold Tenancy agreements pre-filled with your tenant data.</p>
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Zap size={20} className="text-gray-400" /></div>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Pro feature</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Generate AST agreements pre-filled with your tenant and property data.</p>
          <Link href="/dashboard/billing" className="btn-primary inline-flex items-center gap-2"><Zap size={14} />Upgrade to Pro</Link>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={22} style={{ color: 'var(--text-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tenancy Agreements</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Generate RRA 2025-compliant AST agreements pre-filled with your tenant and property data.</p>

        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Tenant</label>
            <select className="input" value={form.tenantId} onChange={e => set('tenantId', e.target.value)}>
              <option value="">Select tenant...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} — £{t.rent_amount}/mo</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Your full name</label>
              <input className="input" placeholder="e.g. Luke Walker" value={form.landlordName} onChange={e => set('landlordName', e.target.value)} />
            </div>
            <div>
              <label className="label">Your email</label>
              <input className="input" placeholder="you@email.com" value={form.landlordEmail} onChange={e => set('landlordEmail', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Your address</label>
            <input className="input" placeholder="Your home or correspondence address" value={form.landlordAddress} onChange={e => set('landlordAddress', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Tenancy start</label>
              <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Term (months)</label>
              <select className="input" value={form.termMonths} onChange={e => set('termMonths', e.target.value)}>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
              </select>
            </div>
            <div>
              <label className="label">Rent due day</label>
              <select className="input" value={form.rentDay} onChange={e => set('rentDay', e.target.value)}>
                {[1,5,7,10,15,20,25,28].map(d => <option key={d} value={String(d)}>{d}{d===1?'st':d===2?'nd':d===3?'rd':'th'} of month</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deposit amount (£)</label>
              <input type="number" className="input" placeholder={selectedTenant ? String(Math.round(selectedTenant.rent_amount * 5 / 4)) : 'e.g. 625'} value={form.depositAmount} onChange={e => set('depositAmount', e.target.value)} />
            </div>
            <div>
              <label className="label">Deposit scheme</label>
              <select className="input" value={form.depositScheme} onChange={e => set('depositScheme', e.target.value)}>
                <option value="DPS">Deposit Protection Service (DPS)</option>
                <option value="TDS">Tenancy Deposit Scheme (TDS)</option>
                <option value="MyDeposits">MyDeposits</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Special terms (optional)</label>
            <textarea className="input" rows={3} placeholder="e.g. No pets. Parking space included." value={form.specialTerms} onChange={e => set('specialTerms', e.target.value)} />
          </div>

          <button onClick={generateAST} disabled={!form.tenantId || !form.landlordName}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <Download size={16} />Generate & Download AST
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Downloads as a .txt file. Print and sign with your tenant. Consider legal review for complex situations.</p>
        </div>
      </div>
    </Layout>
  )
}
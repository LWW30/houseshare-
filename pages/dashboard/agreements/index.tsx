import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { FileText, Download, ChevronDown } from 'lucide-react'

function generateAST(data: {
  landlordName: string
  landlordAddress: string
  tenantName: string
  tenantEmail: string
  propertyAddress: string
  roomName: string
  monthlyRent: number
  depositAmount: number
  depositScheme: string
  depositRef: string
  startDate: string
  endDate: string
  isPeriodic: boolean
  noticePeriod: number
  includesFurniture: boolean
  billsIncluded: string
  specialConditions: string
}) {
  const formatDate = (d: string) => {
    if (!d) return '___________'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Assured Shorthold Tenancy Agreement</title>
<style>
  @page { margin: 20mm 25mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.5; }
  h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  h2 { font-size: 12pt; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid #000; padding-bottom: 4px; }
  h3 { font-size: 11pt; margin: 14px 0 4px; font-weight: bold; }
  p { margin-bottom: 8px; }
  .subtitle { text-align: center; font-style: italic; margin-bottom: 6px; font-size: 10pt; color: #444; }
  .notice { text-align: center; font-size: 9pt; color: #555; margin-bottom: 24px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0; }
  .party-box { border: 1px solid #ccc; padding: 12px; border-radius: 4px; }
  .party-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 6px; }
  .party-name { font-weight: bold; font-size: 12pt; }
  .key-terms { background: #f9f9f9; border: 1px solid #ddd; padding: 14px; margin: 16px 0; border-radius: 4px; }
  .key-terms table { width: 100%; border-collapse: collapse; }
  .key-terms td { padding: 5px 8px; font-size: 10.5pt; border-bottom: 1px solid #e5e5e5; }
  .key-terms td:first-child { font-weight: bold; width: 45%; color: #333; }
  .clause { margin-bottom: 12px; }
  .clause-num { font-weight: bold; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
  .sig-box { border-top: 1px solid #000; padding-top: 8px; }
  .sig-label { font-size: 9pt; color: #666; }
  .sig-space { height: 50px; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9pt; color: #666; text-align: center; }
  @media print { body { font-size: 10.5pt; } }
</style>
</head>
<body>

<h1>Assured Shorthold Tenancy Agreement</h1>
<p class="subtitle">Housing Act 1988 (as amended by the Housing Act 1996) &amp; Renters Rights Act 2025</p>
<p class="notice">This agreement creates a legal tenancy. Both parties should read it carefully before signing.<br>It is recommended that the tenant seeks independent legal advice before signing.</p>

<h2>1. The Parties</h2>
<div class="parties">
  <div class="party-box">
    <div class="party-label">Landlord</div>
    <div class="party-name">${data.landlordName || 'To be completed'}</div>
    <div style="margin-top:6px; font-size:10pt; color:#444;">${data.landlordAddress || 'Address to be confirmed'}</div>
  </div>
  <div class="party-box">
    <div class="party-label">Tenant</div>
    <div class="party-name">${data.tenantName}</div>
    <div style="margin-top:6px; font-size:10pt; color:#444;">${data.tenantEmail}</div>
  </div>
</div>

<h2>2. Key Terms of the Tenancy</h2>
<div class="key-terms">
  <table>
    <tr><td>Property Address</td><td>${data.propertyAddress}</td></tr>
    <tr><td>Room / Accommodation</td><td>${data.roomName} — exclusive use of the named room, with shared use of all common areas including kitchen, bathroom(s), and living spaces</td></tr>
    <tr><td>Tenancy Type</td><td>Assured Shorthold Tenancy${data.isPeriodic ? ' (periodic — monthly)' : ' (fixed term)'}</td></tr>
    <tr><td>Start Date</td><td>${formatDate(data.startDate)}</td></tr>
    <tr><td>End Date</td><td>${data.isPeriodic ? 'Rolling monthly — continues until notice is served' : formatDate(data.endDate)}</td></tr>
    <tr><td>Monthly Rent</td><td>£${data.monthlyRent.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td></tr>
    <tr><td>Rent Due</td><td>The same date each month as the tenancy start date</td></tr>
    <tr><td>Deposit</td><td>£${data.depositAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td></tr>
    <tr><td>Deposit Protection Scheme</td><td>${data.depositScheme || 'To be confirmed within 30 days of receipt'}</td></tr>
    <tr><td>Deposit Reference</td><td>${data.depositRef || 'To be confirmed'}</td></tr>
    <tr><td>Notice Period</td><td>${data.noticePeriod} months' written notice required by either party</td></tr>
    <tr><td>Furnished</td><td>${data.includesFurniture ? 'Yes — an inventory will be provided at commencement' : 'Unfurnished'}</td></tr>
    <tr><td>Bills / Utilities</td><td>${data.billsIncluded || 'Not included — tenant responsible for their share of all utility bills'}</td></tr>
  </table>
</div>

<h2>3. Landlord's Obligations</h2>
<div class="clause"><span class="clause-num">3.1</span> To allow the tenant quiet enjoyment of the accommodation throughout the tenancy.</div>
<div class="clause"><span class="clause-num">3.2</span> To keep in repair the structure and exterior of the property, including drains, gutters, and external pipes.</div>
<div class="clause"><span class="clause-num">3.3</span> To keep in repair and proper working order the installations for the supply of water, gas, electricity, and sanitation.</div>
<div class="clause"><span class="clause-num">3.4</span> To ensure a valid Gas Safety Certificate is in place at all times and provided to the tenant before or at commencement.</div>
<div class="clause"><span class="clause-num">3.5</span> To ensure a valid Electrical Installation Condition Report (EICR) is in place and provided to the tenant.</div>
<div class="clause"><span class="clause-num">3.6</span> To provide the tenant with a copy of the government's 'How to Rent' guide at commencement.</div>
<div class="clause"><span class="clause-num">3.7</span> To protect the tenant's deposit in a government-approved tenancy deposit scheme within 30 days of receipt and provide the Prescribed Information.</div>
<div class="clause"><span class="clause-num">3.8</span> To provide a minimum of two months' written notice of any proposed rent increase, via a valid Section 13 Notice.</div>
<div class="clause"><span class="clause-num">3.9</span> To ensure the property meets the required HMO standards and licensing requirements where applicable.</div>

<h2>4. Tenant's Obligations</h2>
<div class="clause"><span class="clause-num">4.1</span> To pay the monthly rent on or before the due date. Rent is payable even if a dispute exists, unless a court or tribunal has directed otherwise.</div>
<div class="clause"><span class="clause-num">4.2</span> To keep the accommodation and any shared areas in a clean, tidy, and sanitary condition.</div>
<div class="clause"><span class="clause-num">4.3</span> Not to cause or permit any nuisance, annoyance, or disturbance to neighbouring occupiers or other tenants within the property.</div>
<div class="clause"><span class="clause-num">4.4</span> Not to sub-let, assign, or part with possession of the accommodation or any part of it without the landlord's prior written consent.</div>
<div class="clause"><span class="clause-num">4.5</span> Not to keep pets at the property without the landlord's prior written consent. Consent, if given, will not be unreasonably withheld where the request is reasonable.</div>
<div class="clause"><span class="clause-num">4.6</span> Not to make any alterations, additions, or improvements to the property without the landlord's prior written consent.</div>
<div class="clause"><span class="clause-num">4.7</span> To allow the landlord or their agent access to inspect the property on reasonable notice (normally 24 hours) except in an emergency.</div>
<div class="clause"><span class="clause-num">4.8</span> To report any damage or disrepair to the landlord as soon as reasonably practicable.</div>
<div class="clause"><span class="clause-num">4.9</span> To comply with all reasonable house rules communicated by the landlord from time to time, including rules relating to shared areas.</div>
<div class="clause"><span class="clause-num">4.10</span> To vacate the property at the end of the tenancy in the same condition as at commencement, fair wear and tear excepted.</div>
<div class="clause"><span class="clause-num">4.11</span> Not to smoke in any part of the property.</div>

<h2>5. Deposit</h2>
<div class="clause"><span class="clause-num">5.1</span> The tenant has paid a deposit of <strong>£${data.depositAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> which will be protected in a government-approved tenancy deposit scheme.</div>
<div class="clause"><span class="clause-num">5.2</span> The deposit may be used at the end of the tenancy to cover: unpaid rent; damage beyond fair wear and tear; cleaning costs where the property is not returned in a reasonable condition; and any other breach of the tenant's obligations.</div>
<div class="clause"><span class="clause-num">5.3</span> Any deductions will be agreed with the tenant. Disputes about deductions will be resolved through the deposit scheme's free dispute resolution service.</div>

<h2>6. Ending the Tenancy</h2>
<div class="clause"><span class="clause-num">6.1</span> Either party may end this tenancy by giving at least <strong>${data.noticePeriod} months'</strong> written notice.</div>
<div class="clause"><span class="clause-num">6.2</span> Following the Renters Rights Act 2025, no-fault eviction (previously under Section 21) is no longer available. Possession may only be sought on the grounds set out in Schedule 2 of the Housing Act 1988 (as amended).</div>
<div class="clause"><span class="clause-num">6.3</span> Any notice served by the landlord to seek possession must comply with the prescribed form and procedure in force at the time of service.</div>

<h2>7. General</h2>
<div class="clause"><span class="clause-num">7.1</span> This agreement is governed by the laws of England and Wales.</div>
<div class="clause"><span class="clause-num">7.2</span> If any clause of this agreement is found to be unenforceable, the remaining clauses shall continue in full force.</div>
<div class="clause"><span class="clause-num">7.3</span> The landlord and tenant agree that the property will be used solely as a private residential dwelling and not for any business or commercial purpose.</div>
<div class="clause"><span class="clause-num">7.4</span> This agreement constitutes the entire agreement between the parties. Any changes must be agreed in writing and signed by both parties.</div>
${data.specialConditions ? `<div class="clause"><span class="clause-num">7.5</span> <strong>Special conditions:</strong> ${data.specialConditions}</div>` : ''}

<h2>8. Signatures</h2>
<p>By signing below, both parties confirm they have read and understood this agreement and agree to be bound by its terms.</p>
<div class="signature-grid">
  <div>
    <div class="sig-space"></div>
    <div class="sig-box">
      <strong>Landlord: ${data.landlordName || '___________'}</strong><br>
      <span class="sig-label">Signature</span>
    </div>
    <div style="margin-top:16px;">Date: ___________________</div>
  </div>
  <div>
    <div class="sig-space"></div>
    <div class="sig-box">
      <strong>Tenant: ${data.tenantName}</strong><br>
      <span class="sig-label">Signature</span>
    </div>
    <div style="margin-top:16px;">Date: ___________________</div>
  </div>
</div>

<div class="footer">
  Generated by LetFlowUK · app.letflowuk.com · ${today}<br>
  This document is provided for guidance purposes. For complex tenancies, seek independent legal advice.
</div>

</body>
</html>`
}

export default function Agreements() {
  const { user } = useAuth()
  const { isPro, planLoading } = usePlan()
  const [tenants, setTenants] = useState<any[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    landlordName: '',
    landlordAddress: '',
    depositScheme: 'DPS (Deposit Protection Service)',
    depositRef: '',
    startDate: '',
    endDate: '',
    isPeriodic: true,
    noticePeriod: 2,
    includesFurniture: false,
    billsIncluded: '',
    specialConditions: '',
  })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: props } = await supabase.from('properties').select('id, address').eq('landlord_id', user.id)
      if (!props) { setLoading(false); return }
      const ids = props.map((p: any) => p.id)
      const { data: t } = await supabase
        .from('tenants')
        .select('id, name, email, room:rooms(id, name, monthly_rent, property:properties(address))')
        .in('property_id', ids)
        .is('left_at', null)
      setTenants(t || [])
      setLoading(false)
    }
    load()
  }, [user])

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)
  const room = selectedTenant?.room as any
  const property = room?.property as any

  const handleGenerate = () => {
    if (!selectedTenant) return
    setGenerating(true)
    const html = generateAST({
      landlordName: form.landlordName,
      landlordAddress: form.landlordAddress,
      tenantName: selectedTenant.name,
      tenantEmail: selectedTenant.email,
      propertyAddress: property?.address || '',
      roomName: room?.name || '',
      monthlyRent: room?.monthly_rent || 0,
      depositAmount: room?.monthly_rent || 0,
      depositScheme: form.depositScheme,
      depositRef: form.depositRef,
      startDate: form.startDate,
      endDate: form.endDate,
      isPeriodic: form.isPeriodic,
      noticePeriod: form.noticePeriod,
      includesFurniture: form.includesFurniture,
      billsIncluded: form.billsIncluded,
      specialConditions: form.specialConditions,
    })
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setTimeout(() => { w.print(); setGenerating(false) }, 500)
    } else {
      setGenerating(false)
    }
  }

  if (planLoading || loading) return (
    <Layout>
      <div className='flex items-center justify-center h-64'>
        <div className='w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin' />
      </div>
    </Layout>
  )

  if (!isPro) return (
    <Layout>
      <div className='p-8 max-w-2xl'>
        <div className='flex items-center gap-3 mb-6'>
          <FileText size={20} className='text-gray-400' />
          <div>
            <h1 className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Tenancy Agreements</h1>
            <p className='text-sm mt-0.5' style={{ color: 'var(--text-secondary)' }}>Generate RRA 2025-compliant AST agreements pre-filled with your tenant data.</p>
          </div>
        </div>
        <div className='card p-8 text-center'>
          <div className='w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4'>
            <FileText size={22} className='text-gray-400' />
          </div>
          <h2 className='font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>Pro feature</h2>
          <p className='text-sm mb-6' style={{ color: 'var(--text-secondary)' }}>Generate AST agreements pre-filled with your tenant and property data.</p>
          <Link href='/dashboard/billing' className='inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors'>
            ⚡ Upgrade to Pro
          </Link>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className='p-8 max-w-3xl'>
        <div className='flex items-center gap-3 mb-6'>
          <FileText size={20} className='text-gray-400' />
          <div>
            <h1 className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Tenancy Agreements</h1>
            <p className='text-sm mt-0.5' style={{ color: 'var(--text-secondary)' }}>Generate an RRA 2025-compliant AST pre-filled with your tenant and property data.</p>
          </div>
        </div>

        <div className='space-y-5'>
          {/* Tenant selector */}
          <div className='card p-5'>
            <h2 className='text-sm font-medium mb-4' style={{ color: 'var(--text-primary)' }}>1. Select tenant</h2>
            {tenants.length === 0 ? (
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>No active tenants found. <Link href='/dashboard/tenants' className='underline'>Add a tenant</Link> first.</p>
            ) : (
              <select
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
                className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
              >
                <option value=''>— Choose a tenant —</option>
                {tenants.map(t => {
                  const r = t.room as any
                  const p = r?.property as any
                  return <option key={t.id} value={t.id}>{t.name} · {p?.address?.split(',')[0]} · {r?.name} · £{r?.monthly_rent}/mo</option>
                })}
              </select>
            )}

            {selectedTenant && (
              <div className='mt-4 grid grid-cols-3 gap-3'>
                <div className='rounded-xl p-3' style={{ background: 'var(--color-background-secondary)' }}>
                  <div className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>Property</div>
                  <div className='text-sm font-medium truncate' style={{ color: 'var(--text-primary)' }}>{property?.address?.split(',').slice(0,2).join(',')}</div>
                </div>
                <div className='rounded-xl p-3' style={{ background: 'var(--color-background-secondary)' }}>
                  <div className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>Room</div>
                  <div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{room?.name}</div>
                </div>
                <div className='rounded-xl p-3' style={{ background: 'var(--color-background-secondary)' }}>
                  <div className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>Monthly rent</div>
                  <div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>£{room?.monthly_rent?.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* Landlord details */}
          <div className='card p-5'>
            <h2 className='text-sm font-medium mb-4' style={{ color: 'var(--text-primary)' }}>2. Your details</h2>
            <div className='grid grid-cols-1 gap-3'>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Full name</label>
                <input value={form.landlordName} onChange={e => setForm(f => ({ ...f, landlordName: e.target.value }))}
                  placeholder='e.g. John Smith'
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Correspondence address</label>
                <input value={form.landlordAddress} onChange={e => setForm(f => ({ ...f, landlordAddress: e.target.value }))}
                  placeholder='e.g. 1 Example Road, Derby, DE1 1AA'
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Tenancy details */}
          <div className='card p-5'>
            <h2 className='text-sm font-medium mb-4' style={{ color: 'var(--text-primary)' }}>3. Tenancy details</h2>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Start date</label>
                <input type='date' value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Type</label>
                <select value={form.isPeriodic ? 'periodic' : 'fixed'}
                  onChange={e => setForm(f => ({ ...f, isPeriodic: e.target.value === 'periodic' }))}
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                >
                  <option value='periodic'>Periodic (rolling monthly)</option>
                  <option value='fixed'>Fixed term</option>
                </select>
              </div>
              {!form.isPeriodic && (
                <div>
                  <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>End date</label>
                  <input type='date' value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                    style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Notice period (months)</label>
                <select value={form.noticePeriod}
                  onChange={e => setForm(f => ({ ...f, noticePeriod: Number(e.target.value) }))}
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                >
                  <option value={1}>1 month</option>
                  <option value={2}>2 months</option>
                  <option value={3}>3 months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Deposit details */}
          <div className='card p-5'>
            <h2 className='text-sm font-medium mb-4' style={{ color: 'var(--text-primary)' }}>4. Deposit details</h2>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Protection scheme</label>
                <select value={form.depositScheme} onChange={e => setForm(f => ({ ...f, depositScheme: e.target.value }))}
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                >
                  <option>DPS (Deposit Protection Service)</option>
                  <option>MyDeposits</option>
                  <option>TDS (Tenancy Deposit Scheme)</option>
                </select>
              </div>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Scheme reference (optional)</label>
                <input value={form.depositRef} onChange={e => setForm(f => ({ ...f, depositRef: e.target.value }))}
                  placeholder='e.g. DPS1234567'
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Additional options */}
          <div className='card p-5'>
            <h2 className='text-sm font-medium mb-4' style={{ color: 'var(--text-primary)' }}>5. Additional options</h2>
            <div className='space-y-3'>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input type='checkbox' checked={form.includesFurniture}
                  onChange={e => setForm(f => ({ ...f, includesFurniture: e.target.checked }))}
                  className='w-4 h-4 rounded accent-gray-900'
                />
                <span className='text-sm' style={{ color: 'var(--text-primary)' }}>Property is furnished (inventory will be attached)</span>
              </label>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Bills included (optional)</label>
                <input value={form.billsIncluded} onChange={e => setForm(f => ({ ...f, billsIncluded: e.target.value }))}
                  placeholder='e.g. Water and council tax included. Gas, electric, broadband not included.'
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Special conditions (optional)</label>
                <textarea value={form.specialConditions} onChange={e => setForm(f => ({ ...f, specialConditions: e.target.value }))}
                  placeholder='Any additional terms specific to this tenancy...'
                  rows={2}
                  className='w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none'
                  style={{ borderColor: 'var(--card-border)', background: 'var(--color-background-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedTenantId || generating}
            className='w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-medium py-3.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          >
            <Download size={16} />
            {generating ? 'Generating...' : 'Generate & Download AST'}
          </button>

          <p className='text-xs text-center' style={{ color: 'var(--text-muted)' }}>
            Opens in a new tab ready to print or save as PDF. RRA 2025 compliant.
          </p>
        </div>
      </div>
    </Layout>
  )
}

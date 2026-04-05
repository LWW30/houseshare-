import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, getTenantsByProperty, type Property, type Tenant } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Loader2, CheckCircle2, XCircle, Clock, Zap, AlertCircle, ExternalLink, RefreshCw, Building2 } from 'lucide-react'
import { useRouter } from 'next/router'

interface DDMandate { id: string; tenant_id: string; gc_mandate_id?: string; status: 'pending_setup'|'active'|'cancelled'|'failed'|'expired'; monthly_amount: number; created_at: string }
interface TenantWithDD extends Tenant { dd_mandate_active?: boolean; gc_mandate_id?: string; mandate?: DDMandate }

const MANDATE_STATUS = {
  active: { label: 'Active', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  pending_setup: { label: 'Awaiting setup', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  expired: { label: 'Expired', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
  none: { label: 'Not set up', icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-100' },
}

export default function DirectDebitPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<TenantWithDD[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [settingUp, setSettingUp] = useState<string|null>(null)
  const [collecting, setCollecting] = useState<string|null>(null)
  const [flash, setFlash] = useState<{type:'success'|'error';msg:string}|null>(null)

  useEffect(() => {
    if (router.query.dd_setup === 'success') { setFlash({ type: 'success', msg: 'Direct Debit mandate set up successfully. It will activate within 1-2 working days.' }); router.replace('/dashboard/direct-debit', undefined, { shallow: true }) }
    if (router.query.dd_setup === 'cancelled') { setFlash({ type: 'error', msg: 'Direct Debit setup was cancelled.' }); router.replace('/dashboard/direct-debit', undefined, { shallow: true }) }
  }, [router.query])

  useEffect(() => { if (!user) return; loadData() }, [user])

  const loadData = async () => {
    if (!user) return
    setDataLoading(true)
    try {
      const props = await getProperties(user.id)
      setProperties(props)
      if (props.length === 0) { setDataLoading(false); return }
      const allTenants: TenantWithDD[] = []
      for (const pid of props.map(p => p.id)) { const ts = await getTenantsByProperty(pid); allTenants.push(...(ts as TenantWithDD[])) }
      const { data: gcData } = await supabase.from('tenants').select('id, dd_mandate_active, gc_mandate_id').in('id', allTenants.map(t => t.id))
      const { data: mandateData } = await supabase.from('dd_mandates').select('*').in('tenant_id', allTenants.map(t => t.id)).order('created_at', { ascending: false })
      const gcMap = Object.fromEntries((gcData||[]).map(t => [t.id, t]))
      const mandateMap = Object.fromEntries((mandateData||[]).map(m => [m.tenant_id, m]))
      setTenants(allTenants.map(t => ({ ...t, ...gcMap[t.id], mandate: mandateMap[t.id] })))
    } catch(e) { console.error(e) }
    setDataLoading(false)
  }

  const handleSetupDD = async (tenant: TenantWithDD) => {
    setSettingUp(tenant.id)
    try {
      const res = await fetch('/api/gocardless/create-mandate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant.id }) })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch { throw new Error('GoCardless not configured. Add GOCARDLESS_ACCESS_TOKEN to Vercel environment variables.') }
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      window.location.href = data.authorisation_url
    } catch(err: any) { setFlash({ type: 'error', msg: err.message || 'Failed to start DD setup' }) }
    setSettingUp(null)
  }

  const handleCollectRent = async (tenant: TenantWithDD) => {
    const { data: payment } = await supabase.from('rent_payments').select('id').eq('tenant_id', tenant.id).in('status', ['pending','overdue','late']).order('due_date', { ascending: false }).limit(1).single()
    if (!payment) { setFlash({ type: 'error', msg: 'No outstanding payment found for ' + tenant.name }); return }
    setCollecting(tenant.id)
    try {
      const res = await fetch('/api/gocardless/collect-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rent_payment_id: payment.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFlash({ type: 'success', msg: 'Payment submitted via Direct Debit. Charge date: ' + data.charge_date })
      await loadData()
    } catch(err: any) { setFlash({ type: 'error', msg: err.message || 'Failed to collect payment' }) }
    setCollecting(null)
  }

  const activeTenants = tenants.filter(t => t.dd_mandate_active)
  const unenrolled = tenants.filter(t => !t.mandate)

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Direct Debit</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Collect rent automatically via GoCardless BACS Direct Debit</p>
          </div>
          <button onClick={loadData} disabled={dataLoading} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCw size={12} className={dataLoading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>

        {flash && (
          <div className={"mb-5 rounded-2xl px-4 py-3 flex items-center gap-3 border " + (flash.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800')}>
            {flash.type === 'success' ? <CheckCircle2 size={15} className="flex-shrink-0" /> : <AlertCircle size={15} className="flex-shrink-0" />}
            <p className="text-sm flex-1">{flash.msg}</p>
            <button onClick={() => setFlash(null)} className="text-xs opacity-60 hover:opacity-100">x</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4"><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active mandates</div><div className="text-2xl font-semibold text-green-600">{activeTenants.length}</div><div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>collecting automatically</div></div>
          <div className="card p-4"><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Not enrolled</div><div className="text-2xl font-semibold text-amber-500">{unenrolled.length}</div><div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>tenants need setup</div></div>
          <div className="card p-4"><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Monthly via DD</div><div className="text-2xl font-semibold text-green-600">£{activeTenants.reduce((s,t) => s+(t.room?.monthly_rent||0),0).toLocaleString()}</div><div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>collected automatically</div></div>
        </div>

        {activeTenants.length === 0 && (
          <div className="mb-6 card p-5 border-dashed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0"><Zap size={18} className="text-blue-500" /></div>
              <div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Set up Direct Debit for hands-free rent collection</h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>Send your tenant a GoCardless-hosted setup link. Once they authorise it, rent is collected automatically each month. No chasing, no failed transfers. Powered by GoCardless BACS.</p>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> FCA-regulated</span>
                  <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Bank-level security</span>
                  <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Direct Debit Guarantee applies</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : tenants.length === 0 ? (
          <div className="card p-12 text-center"><Building2 size={28} className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No tenants yet</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add tenants to your properties first.</p></div>
        ) : (
          <div className="space-y-2">
            {tenants.map(tenant => {
              const status = tenant.dd_mandate_active ? 'active' : tenant.mandate?.status || 'none'
              const cfg = MANDATE_STATUS[status as keyof typeof MANDATE_STATUS] || MANDATE_STATUS.none
              const StatusIcon = cfg.icon
              return (
                <div key={tenant.id} className="card px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">{tenant.name.split(' ').map(n=>n[0]).join('')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{tenant.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{(tenant.property as any)?.address?.split(',')[0]} · {tenant.room?.name} · £{tenant.room?.monthly_rent}/mo</div>
                  </div>
                  <div className={"flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border " + cfg.bg + ' ' + cfg.color + ' ' + cfg.border + ' flex-shrink-0'}>
                    <StatusIcon size={11} />{cfg.label}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {status === 'active' && (
                      <button onClick={() => handleCollectRent(tenant)} disabled={collecting === tenant.id} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                        {collecting === tenant.id ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}Collect rent
                      </button>
                    )}
                    {(status === 'none' || status === 'cancelled' || status === 'failed' || status === 'expired') && (
                      <button onClick={() => handleSetupDD(tenant)} disabled={settingUp === tenant.id} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                        {settingUp === tenant.id ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                        {status === 'none' ? 'Set up DD' : 'Re-setup DD'}
                      </button>
                    )}
                    {status === 'pending_setup' && (
                      <button onClick={() => handleSetupDD(tenant)} disabled={settingUp === tenant.id} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                        {settingUp === tenant.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}Resend link
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <p>Direct Debit collections take 3 working days. GoCardless charges a small transaction fee. <a href="https://gocardless.com/pricing" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700 inline-flex items-center gap-0.5">View GoCardless pricing <ExternalLink size={10} /></a></p>
        </div>
      </div>
    </Layout>
  )
}

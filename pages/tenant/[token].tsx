import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import StatusBadge from '../../components/StatusBadge'
import { getTenantByToken, getTenantPayments, getTenantBills, type Tenant, type RentPayment, type SharedBill } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { Building2, Calendar, PoundSterling, Loader2, Wrench, Plus, X, CheckCircle2, Clock, AlertCircle, FileText, Download, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { format, isSameMonth, differenceInDays, isPast } from 'date-fns'

const categoryEmoji: Record<string,string> = { broadband:'📡', council_tax:'🏛️', electricity:'⚡', gas:'🔥', water:'💧', other:'📋' }
type Priority = 'low'|'medium'|'high'|'urgent'
interface MaintenanceRequest { id:string; title:string; description:string; priority:Priority; status:'open'|'in_progress'|'resolved'; created_at:string; resolved_at?:string }
interface TenantDocument { id:string; name:string; category:string; expiry_date?:string; file_path:string; uploaded_at:string }
const PRIORITY_BADGE: Record<Priority,string> = { low:'bg-gray-100 text-gray-600', medium:'bg-amber-50 text-amber-700', high:'bg-orange-50 text-orange-700', urgent:'bg-red-50 text-red-700' }
const STATUS_CFG = { open:{label:'Open',icon:AlertCircle,color:'text-red-500'}, in_progress:{label:'In progress',icon:Clock,color:'text-amber-500'}, resolved:{label:'Resolved',icon:CheckCircle2,color:'text-green-500'} }

export default function TenantPortal() {
  const router = useRouter()
  const { token } = router.query
  const [tenant, setTenant] = useState<Tenant|null>(null)
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [bills, setBills] = useState<SharedBill[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([])
  const [documents, setDocuments] = useState<TenantDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [maintForm, setMaintForm] = useState({title:'',description:'',priority:'medium' as Priority})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({})
  const toggleSection = (k:string) => setCollapsed(p=>({...p,[k]:!p[k]}))

  useEffect(() => {
    if (!token || typeof token !== 'string') return
    async function load() {
      const t = await getTenantByToken(token as string)
      if (!t) { setNotFound(true); setLoading(false); return }
      setTenant(t)
      const [pays, bs] = await Promise.all([getTenantPayments(t.id), getTenantBills(t.property_id)])
      setPayments(pays); setBills(bs)
      const { data: maint } = await supabase.from('maintenance_requests').select('*').eq('property_id', t.property_id).eq('submitted_by_tenant_id', t.id).order('created_at', { ascending: false })
      setMaintenance(maint || [])
      const { data: docs } = await supabase.from('compliance_documents').select('id,name,category,expiry_date,file_path,uploaded_at').eq('property_id', t.property_id).in('category', ['gas_safe','epc','eicr','fire_risk','tenancy_agreement']).order('uploaded_at', { ascending: false })
      setDocuments(docs || [])
      setLoading(false)
    }
    load()
  }, [token])

  const handleSubmitMaint = async () => {
    if (!tenant || !maintForm.title.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase.from('maintenance_requests').insert({ property_id: tenant.property_id, title: maintForm.title, description: maintForm.description, priority: maintForm.priority, status: 'open', submitted_by_tenant_id: tenant.id, submitted_by_tenant_name: tenant.name }).select().single()
    if (!error && data) { setMaintenance(p=>[data,...p]); setSubmitted(true); setShowForm(false); setMaintForm({title:'',description:'',priority:'medium'}); setTimeout(()=>setSubmitted(false),4000) }
    setSubmitting(false)
  }

  const handleDownloadDoc = async (doc: TenantDocument) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
  if (notFound) return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><div className="text-center"><div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 size={20} className="text-gray-400" /></div><h1 className="font-semibold text-gray-900 mb-2">Link not found</h1><p className="text-sm text-gray-500">This link may have expired. Contact your landlord for a new one.</p></div></div>
  if (!tenant) return null

  const now = new Date()
  const currentPayment = payments.find(p => isSameMonth(new Date(p.due_date), now))
  const currentBills = bills.filter(b => !b.paid && isSameMonth(new Date(b.due_date), now))
  const billsShare = currentBills.reduce((s,b) => s+(b.amount/(b.split_ways||1)), 0)
  const rentAmount = currentPayment?.amount || tenant.room?.monthly_rent || 0
  const openIssues = maintenance.filter(r => r.status !== 'resolved').length

  const SectionHdr = ({id,label,count,urgent}:{id:string;label:string;count?:number;urgent?:boolean}) => (
    <button className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors" onClick={()=>toggleSection(id)}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-gray-900">{label}</span>
        {count!==undefined&&count>0&&<span className={"text-xs px-2 py-0.5 rounded-full font-medium "+(urgent?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600')}>{count}</span>}
      </div>
      {collapsed[id]?<ChevronDown size={15} className="text-gray-400"/>:<ChevronUp size={15} className="text-gray-400"/>}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center"><Building2 size={14} className="text-white"/></div>
            <div><div className="font-semibold text-sm">LetFlow</div><div className="text-xs text-gray-400">Tenant portal</div></div>
          </div>
          {openIssues>0&&<span className="text-xs bg-amber-400 text-amber-900 px-2 py-1 rounded-full font-semibold">{openIssues} open issue{openIssues!==1?'s':''}</span>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {submitted&&<div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3"><CheckCircle2 size={15} className="text-green-600 flex-shrink-0"/><p className="text-sm text-green-800">Maintenance request submitted. Your landlord has been notified.</p></div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-600 flex-shrink-0">{tenant.name.split(' ').map((n:string)=>n[0]).join('')}</div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900">{tenant.name}</h1>
              <div className="text-sm text-gray-500 mt-0.5 truncate">{tenant.room?.name} · {tenant.property?.address}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1"><PoundSterling size={11}/>£{tenant.room?.monthly_rent}/month</span>
                {tenant.tenancy_start&&<span className="flex items-center gap-1"><Calendar size={11}/>Since {format(new Date(tenant.tenancy_start),'MMM yyyy')}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHdr id="month" label={format(now,'MMMM yyyy') + ' — what you owe'} />
          {!collapsed.month&&<div className="px-5 pb-5 space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Rent</span><div className="flex items-center gap-3"><span className="text-sm font-semibold text-gray-900">£{rentAmount}</span>{currentPayment&&<StatusBadge status={currentPayment.status}/>}</div></div>
            {currentBills.map(b=><div key={b.id} className="flex items-center justify-between"><span className="text-sm text-gray-600">{categoryEmoji[b.category]} {b.name} <span className="text-gray-400 text-xs">(your share)</span></span><span className="text-sm font-semibold text-gray-900">£{(b.amount/(b.split_ways||1)).toFixed(2)}</span></div>)}
            {billsShare>0&&<div className="border-t border-gray-100 pt-3 flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">Total this month</span><span className="text-lg font-bold text-gray-900">£{(rentAmount+billsShare).toFixed(2)}</span></div>}
          </div>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50">
            <SectionHdr id="maint" label="Maintenance" count={openIssues} urgent={openIssues>0}/>
            <button onClick={()=>setShowForm(true)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-4 py-2 mr-2 bg-gray-50 rounded-xl border border-gray-200 transition-colors flex-shrink-0"><Plus size={12}/>Report issue</button>
          </div>
          {!collapsed.maint&&<>
            {showForm&&<div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-gray-900">Report a new issue</span><button onClick={()=>setShowForm(false)}><X size={15} className="text-gray-400"/></button></div>
              <div className="space-y-3">
                <input className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Issue title *" value={maintForm.title} onChange={e=>setMaintForm(f=>({...f,title:e.target.value}))}/>
                <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none resize-none" placeholder="Describe the issue..." rows={3} value={maintForm.description} onChange={e=>setMaintForm(f=>({...f,description:e.target.value}))}/>
                <div className="grid grid-cols-4 gap-2">{(['low','medium','high','urgent'] as Priority[]).map(p=><button key={p} onClick={()=>setMaintForm(f=>({...f,priority:p}))} className={"py-1.5 rounded-lg text-xs font-medium border transition-all "+(maintForm.priority===p?'border-gray-900 bg-gray-900 text-white':'border-gray-200 text-gray-600 hover:border-gray-400')}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}</div>
                <button onClick={handleSubmitMaint} disabled={submitting||!maintForm.title.trim()} className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-gray-700 transition-colors">{submitting?<Loader2 size={13} className="animate-spin"/>:<Send size={13}/>}Submit request</button>
              </div>
            </div>}
            {maintenance.length===0?<div className="px-5 py-8 text-center"><Wrench size={24} className="text-gray-300 mx-auto mb-2"/><p className="text-sm text-gray-400">No maintenance requests yet</p></div>:
            <div className="divide-y divide-gray-50">{maintenance.map(req=>{const cfg=STATUS_CFG[req.status];const Icon=cfg.icon;return(<div key={req.id} className="px-5 py-3.5"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap mb-0.5"><span className="text-sm font-medium text-gray-900">{req.title}</span><span className={"text-xs px-2 py-0.5 rounded-full font-medium "+PRIORITY_BADGE[req.priority]}>{req.priority}</span></div>{req.description&&<p className="text-xs text-gray-500 line-clamp-2 mb-1">{req.description}</p>}<p className="text-xs text-gray-400">Reported {format(new Date(req.created_at),'d MMM yyyy')}{req.resolved_at&&' · Resolved '+format(new Date(req.resolved_at),'d MMM')}</p></div><div className="flex items-center gap-1 flex-shrink-0"><Icon size={13} className={cfg.color}/><span className={"text-xs font-medium "+cfg.color}>{cfg.label}</span></div></div></div>)})}</div>}
          </>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHdr id="payments" label="Rent payment history"/>
          {!collapsed.payments&&(payments.length===0?<div className="px-5 py-6 text-center text-sm text-gray-400">No payments recorded yet.</div>:
          <div className="divide-y divide-gray-50">{payments.map(p=><div key={p.id} className="px-5 py-3.5 flex items-center justify-between"><div><div className="text-sm font-medium text-gray-900">{format(new Date(p.due_date),'MMMM yyyy')}</div><div className="text-xs text-gray-400 mt-0.5">Due {format(new Date(p.due_date),'d MMM')}{p.paid_date&&' · Paid '+format(new Date(p.paid_date),'d MMM')}</div></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-gray-900">£{p.amount}</span><StatusBadge status={p.status}/></div></div>)}</div>)}
        </div>

        {bills.length>0&&<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHdr id="bills" label="House bills — your share"/>
          {!collapsed.bills&&<div className="divide-y divide-gray-50">{bills.map(b=><div key={b.id} className="px-5 py-3.5 flex items-center justify-between"><div><div className="flex items-center gap-2"><span>{categoryEmoji[b.category]}</span><span className="text-sm font-medium text-gray-900">{b.name}</span></div><div className="text-xs text-gray-400 mt-0.5">Your share of £{b.amount} · due {format(new Date(b.due_date),'d MMM')}</div></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-gray-900">£{(b.amount/(b.split_ways||1)).toFixed(2)}</span><span className={"text-xs px-2 py-0.5 rounded-full font-medium "+(b.paid?'bg-green-100 text-green-700':'bg-amber-50 text-amber-700')}>{b.paid?'Paid':'Unpaid'}</span></div></div>)}</div>}
        </div>}

        {documents.length>0&&<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHdr id="docs" label="Property documents"/>
          {!collapsed.docs&&<div className="divide-y divide-gray-50">{documents.map(doc=>{const expired=doc.expiry_date&&isPast(new Date(doc.expiry_date));const days=doc.expiry_date?differenceInDays(new Date(doc.expiry_date),now):null;return(<div key={doc.id} className="px-5 py-3.5 flex items-center gap-3"><div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-gray-500"/></div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>{doc.expiry_date&&<div className={"text-xs "+(expired?'text-red-500':days!==null&&days<60?'text-amber-600':'text-gray-400')}>{expired?'Expired':days!==null&&days<60?'Expires in '+days+' days':'Valid until '+format(new Date(doc.expiry_date),'d MMM yyyy')}</div>}</div><button onClick={()=>handleDownloadDoc(doc)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors flex-shrink-0"><Download size={11}/>View</button></div>)})}</div>}
        </div>}

        <p className="text-center text-xs text-gray-400 pb-4">Powered by LetFlow · UK HMO Management</p>
      </div>
    </div>
  )
}import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import StatusBadge from '../../components/StatusBadge'
import { getTenantByToken, getTenantPayments, getTenantBills, type Tenant, type RentPayment, type SharedBill } from '../../lib/supabase'
import { Building2, Phone, Mail, Calendar, PoundSterling, Loader2 } from 'lucide-react'
import { format, isSameMonth } from 'date-fns'

const categoryEmoji: Record<string, string> = {
  broadband: '📡', council_tax: '🏛️', electricity: '⚡', gas: '🔥', water: '💧', other: '📋',
}

export default function TenantPortal() {
  const router = useRouter()
  const { token } = router.query
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [bills, setBills] = useState<SharedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token || typeof token !== 'string') return
    async function load() {
      const t = await getTenantByToken(token as string)
      if (!t) { setNotFound(true); setLoading(false); return }
      setTenant(t)
      const [pays, bs] = await Promise.all([
        getTenantPayments(t.id),
        getTenantBills(t.property_id),
      ])
      setPayments(pays)
      setBills(bs)
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={20} className="text-gray-400" />
        </div>
        <h1 className="font-semibold text-gray-900 mb-2">Link not found</h1>
        <p className="text-sm text-gray-500">This link may have expired. Contact your landlord for a new one.</p>
      </div>
    </div>
  )

  if (!tenant) return null

  const now = new Date()

  // Current month's rent payment
  const currentPayment = payments.find(p => isSameMonth(new Date(p.due_date), now))

  // Current month's unpaid bills share
  const currentBills = bills.filter(b => !b.paid && isSameMonth(new Date(b.due_date), now))
  const billsShareTotal = currentBills.reduce((s, b) => s + (b.amount / (b.split_ways || 1)), 0)

  // Total due this month
  const rentAmount = currentPayment?.amount || tenant.room?.monthly_rent || 0
  const totalDue = rentAmount + billsShareTotal

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">HouseShare</div>
            <div className="text-xs text-gray-400">Tenant portal</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Tenant card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-medium text-gray-600">
              {tenant.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{tenant.name}</h1>
              <div className="text-sm text-gray-500 mt-0.5">
                {tenant.room?.name} · {tenant.property?.address}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <PoundSterling size={11} /> £{tenant.room?.monthly_rent}/month rent
                </span>
                {tenant.tenancy_end && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> until {format(new Date(tenant.tenancy_end), 'MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* This month summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-medium text-sm text-gray-900 mb-4">
            {format(now, 'MMMM yyyy')} — what you owe
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rent</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">£{rentAmount}</span>
                {currentPayment && <StatusBadge status={currentPayment.status} />}
              </div>
            </div>
            {currentBills.map(b => (
              <div key={b.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {categoryEmoji[b.category]} {b.name} <span className="text-gray-400 text-xs">(your share)</span>
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  £{(b.amount / (b.split_ways || 1)).toFixed(2)}
                </span>
              </div>
            ))}
            {billsShareTotal > 0 && (
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total this month</span>
                <span className="text-lg font-bold text-gray-900">£{totalDue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment history */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-medium text-sm text-gray-900">Rent payment history</h2>
          </div>
          {payments.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No payments recorded yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map(p => (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(p.due_date), 'MMMM yyyy')}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Due {format(new Date(p.due_date), 'd MMM')}
                      {p.paid_date && ` · Paid ${format(new Date(p.paid_date), 'd MMM')}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">£{p.amount}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All bills */}
        {bills.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-medium text-sm text-gray-900">House bills — your share</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {bills.map(b => (
                <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{categoryEmoji[b.category]}</span>
                      <span className="text-sm font-medium text-gray-900">{b.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Your share of £{b.amount} · due {format(new Date(b.due_date), 'd MMM')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      £{(b.amount / (b.split_ways || 1)).toFixed(2)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.paid ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {b.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">Powered by HouseShare</p>
      </div>
    </div>
  )
}

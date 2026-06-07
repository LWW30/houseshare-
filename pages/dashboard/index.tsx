import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import RRABanner from '../../components/RRABanner'
import { useAuth } from '../../lib/useAuth'
import { usePlan } from '../../lib/usePlan'
import { getProperties, getRentPayments, getSharedBills, getExpenses, signOut, type Property, type RentPayment, type SharedBill } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { format, differenceInDays, isPast, addDays, isWithinInterval } from 'date-fns'
import { Building2, ShieldCheck, PoundSterling, Bell, ChevronRight, LogOut, AlertTriangle, Clock, Users, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

const categoryEmoji: Record<string, string> = { broadband: '📶', wifi: '📶', council_tax: '🏛️', tax: '🏛️', electricity: '⚡', electric: '⚡', gas: '🔥', water: '💧', sky: '📺', other: '📋' }

function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const { isPro, planLoading } = usePlan()
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [bills, setBills] = useState<SharedBill[]>([])
  const [tenantCount, setTenantCount] = useState(0)
  const [roomCount, setRoomCount] = useState(0)
  const [documents, setDocuments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const props = await getProperties(user!.id)
        setProperties(props)
        if (props.length > 0) {
          const ids = props.map(p => p.id)
          const month = new Date().toISOString().slice(0, 7)
          const [pays, bs, docData, exps] = await Promise.all([
            getRentPayments(ids, month),
            getSharedBills(ids),
            supabase.from('compliance_documents').select('*').eq('landlord_id', user!.id),
            getExpenses(user!.id),
          ])
          setPayments(pays); setBills(bs); setDocuments(docData.data || []); setExpenses(exps)
          const uniqueTenants = new Set(pays.map(p => p.tenant_id))
          setTenantCount(uniqueTenants.size)
          let totalRooms = 0
          for (const pid of ids) {
            const { count } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('property_id', pid)
            totalRooms += count || 0
          }
          setRoomCount(totalRooms)
        }
      } catch (e) { console.error(e) }
      finally { setDataLoading(false) }
    }
    load()
  }, [user])

  const [expiringCerts, setExpiringCerts] = useState<{cert_type: string, expiry_date: string, property_name: string}[]>([])
  useEffect(() => {
    if (!user) return
    supabase.from('compliance_certs').select('cert_type, expiry_date, property_id').eq('landlord_id', user.id)
      .then(({ data }) => {
        if (!data) return
        const soon = data.filter(c => differenceInDays(parseISO(c.expiry_date), new Date()) < 90)
        setExpiringCerts(soon.map(c => ({ ...c, property_name: '' })))
      })
  }, [user])

  const handleSignOut = async () => { await signOut(); router.push('/login') }

  if (loading || dataLoading) return (
    <Layout>
      
      <div className='flex items-center justify-center h-64'><div className='w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin' /></div></Layout>
  )

  const now = new Date()
  const monthLabel = format(now, 'MMMM yyyy')
  const totalExpected = payments.reduce((s, p) => s + p.amount, 0)
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const overdueRentCount = payments.filter(p => p.status === 'overdue' || p.status === 'late').length
  const today = new Date()
  const overdueBillsCount = bills.filter(b => !b.paid && b.due_date && new Date(b.due_date) < today).length
  const overdueCount = overdueRentCount + overdueBillsCount
  const attentionCount = overdueCount
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0
  const thisMonth = new Date().toISOString().slice(0, 7)
  const totalExpensesThisMonth = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s: number, e: any) => s + e.amount, 0)
  const netProfitThisMonth = totalCollected - totalExpensesThisMonth
  const occupancyRate = roomCount > 0 ? Math.round((tenantCount / roomCount) * 100) : 0
  const vacantRooms = roomCount - tenantCount
  const expiredDocs = documents.filter(d => d.expiry_date && isPast(new Date(d.expiry_date)))
  const soonDocs = documents.filter(d => d.expiry_date && !isPast(new Date(d.expiry_date)) && differenceInDays(new Date(d.expiry_date), now) < 60)
  const next7Days = payments.filter(p => p.status !== 'paid' && isWithinInterval(new Date(p.due_date), { start: now, end: addDays(now, 7) }))
  const unpaidBills = bills.filter(b => !b.paid).slice(0, 4)

  if (properties.length === 0) return (
    <Layout>
      <div className='p-8 max-w-2xl'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>{greeting()}</h1>
          <div className='flex items-center gap-3'>
            {isPro ? (
              <span className='text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-700 border border-purple-200'>⚡ Pro</span>
            ) : (
              <Link href='/dashboard/billing' className='text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors'>Free plan</Link>
            )}
            <div className='flex items-center gap-3'>
            {isPro ? (
              <span className='text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-700 border border-purple-200'>⚡ Pro</span>
            ) : (
              <Link href='/dashboard/billing' className='text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors'>Free plan</Link>
            )}
            <button onClick={handleSignOut} className='flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700'><LogOut size={14} />Sign out</button>
          </div>
          </div>
        </div>
        <div className='space-y-4'>
          <div className='card p-6'>
            <h2 className='font-semibold mb-1' style={{ color: 'var(--text-primary)' }}>Welcome to LetFlowUK 👋</h2>
            <p className='text-sm mb-5' style={{ color: 'var(--text-secondary)' }}>Follow these steps to get your portfolio set up.</p>
            <div className='space-y-1'>
              <Link href='/dashboard/properties' className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group'>
                <div className='w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0'>1</div>
                <div className='flex-1'><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>Add your first property</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>Enter address and set up rooms</div></div>
                <span className='text-gray-400 group-hover:text-gray-700'>â</span>
              </Link>
              <Link href='/dashboard/properties' className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group'>
                <div className='w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-semibold flex-shrink-0'>2</div>
                <div className='flex-1'><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>Add rooms with monthly rent</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>Each room tracks rent separately</div></div>
                <span className='text-gray-400 group-hover:text-gray-700'>â</span>
              </Link>
              <Link href='/dashboard/tenants' className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group'>
                <div className='w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-semibold flex-shrink-0'>3</div>
                <div className='flex-1'><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>Add tenants</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>They get a welcome email with their portal link</div></div>
                <span className='text-gray-400 group-hover:text-gray-700'>â</span>
              </Link>
              <Link href='/dashboard/bills' className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group'>
                <div className='w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-semibold flex-shrink-0'>4</div>
                <div className='flex-1'><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>Add shared bills</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>Gas, electric, broadband â split automatically</div></div>
                <span className='text-gray-400 group-hover:text-gray-700'>â</span>
              </Link>
            </div>
          </div>
          <div className='card p-5' style={{ background: 'var(--color-background-secondary)' }}>
            <div className='flex items-start gap-3'>
              <div className='w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0'><ShieldCheck size={14} className='text-white' /></div>
              <div className='flex-1'>
                <div className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>RRA 2025 compliance checklist</div>
                <div className='text-xs mt-0.5' style={{ color: 'var(--text-secondary)' }}>26-item checklist covering Renters Rights Act obligations â Pro feature</div>
              </div>
              <Link href='/dashboard/billing' className='text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0'>Upgrade</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className='p-8 max-w-5xl'>
        {expiringCerts.length > 0 && (
          <div
            className="mb-6 rounded-xl p-4 flex items-center gap-3 cursor-pointer"
            style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}
            onClick={() => window.location.href = '/dashboard/compliance'}
          >
            <AlertTriangle size={18} style={{ color: '#B45309', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: '#92400E', fontSize: 14 }}>
                {expiringCerts.length} compliance certificate{expiringCerts.length > 1 ? 's' : ''} expiring soon
              </p>
              <p style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>
                Click to view and renew â fines for non-compliance can exceed £30,000
              </p>
            </div>
          </div>
        )}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>{greeting()}</h1>
            <p className='mt-1 text-sm' style={{ color: 'var(--text-secondary)' }}>{monthLabel} portfolio snapshot</p>
          </div>
          <button onClick={handleSignOut} className='flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700'><LogOut size={14} />Sign out</button>
        </div>

        <RRABanner />
        {!isPro && properties.length >= 2 && (
          <div className='mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl px-5 py-4 flex items-center justify-between'>
            <div>
              <div className='text-sm font-medium text-purple-900'>You've reached the free plan limit</div>
              <div className='text-xs text-purple-600 mt-0.5'>Upgrade to Pro for unlimited properties, maintenance tracking and more</div>
            </div>
            <Link href='/dashboard/billing' className='text-xs font-semibold bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors flex-shrink-0 ml-4'>
              Upgrade to Pro
            </Link>
          </div>
        )}

        {expiredDocs.length > 0 && (
          <Link href='/dashboard/documents'><div className='mb-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-red-100 cursor-pointer' style={{animation:'certFlash 1.6s ease-in-out infinite'}}><AlertTriangle size={16} className='text-red-600 flex-shrink-0' /><div className='flex-1'><span className='text-sm font-medium text-red-800'>{expiredDocs.length} compliance document{expiredDocs.length > 1 ? 's' : ''} expired </span><span className='text-xs text-red-600'>{expiredDocs.map(d => d.name).join(', ')}</span></div><ChevronRight size={14} className='text-red-400' /></div></Link>
        )}
        {soonDocs.length > 0 && (
          <Link href='/dashboard/documents'><div className='mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-amber-100 transition-colors cursor-pointer'><Clock size={16} className='text-amber-600 flex-shrink-0' /><div className='flex-1'><span className='text-sm font-medium text-amber-800'>{soonDocs.length} document{soonDocs.length > 1 ? 's' : ''} expiring soon </span><span className='text-xs text-amber-600'>{soonDocs.map(d => d.name).join(', ')}</span></div><ChevronRight size={14} className='text-amber-400' /></div></Link>
        )}

        
  {(() => {
    const steps = [
      { label: 'Add your first property', done: properties.length > 0, href: '/dashboard/properties' },
      { label: 'Add rooms with monthly rent', done: roomCount > 0, href: '/dashboard/properties' },
      { label: 'Add your first tenant', done: tenantCount > 0, href: '/dashboard/tenants' },
      { label: 'Upload a compliance document', done: documents.length > 0, href: '/dashboard/documents' },
      { label: 'Track your first rent payment', done: payments.length > 0, href: '/dashboard/payments' },
    ]
    const doneCount = steps.filter(s => s.done).length
    if (doneCount === steps.length) return null
    const pct = Math.round((doneCount / steps.length) * 100)
    return (
      <div className='mb-6 card overflow-hidden'>
        <div className='px-5 py-4 border-b flex items-center justify-between' style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <h2 className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>Getting started</h2>
            <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{doneCount} of {steps.length} steps complete</p>
          </div>
          <span className='text-sm font-semibold' style={{ color: pct === 100 ? '#16a34a' : 'var(--text-secondary)' }}>{pct}%</span>
        </div>
        <div className='h-1 bg-gray-100'>
          <div className='h-1 bg-green-500 transition-all duration-500' style={{ width: pct + '%' }} />
        </div>
        <div className='divide-y' style={{ borderColor: 'var(--card-border)' }}>
          {steps.map((step, i) => (
            <Link key={i} href={step.href} className='flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group'>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${step.done ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-gray-400'}`}>
                {step.done && <svg className='w-3 h-3 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={3}><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>}
              </div>
              <span className={`text-sm flex-1 ${step.done ? 'line-through' : ''}`} style={{ color: step.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>{step.label}</span>
              {!step.done && <ChevronRight size={14} className='text-gray-400 group-hover:text-gray-600 transition-colors' />}
            </Link>
          ))}
        </div>
      </div>
    )
  })()}

      <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
          <Link href='/dashboard/properties' className='card p-5 cursor-pointer hover:border-gray-400 transition-colors block'><div className='flex items-center justify-between mb-3'><span className='text-xs font-medium uppercase tracking-wide' style={{ color: 'var(--text-muted)' }}>Properties</span><Building2 size={15} className='text-gray-400' /></div><div className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>{properties.length}</div><div className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{tenantCount} tenant{tenantCount !== 1 ? 's' : ''}</div></Link>
          <Link href='/dashboard/tenants' className='card p-5 cursor-pointer hover:border-gray-400 transition-colors block'><div className='flex items-center justify-between mb-3'><span className='text-xs font-medium uppercase tracking-wide' style={{ color: 'var(--text-muted)' }}>Occupancy</span><Users size={15} className='text-gray-400' /></div><div className='text-2xl font-semibold text-green-600'>{occupancyRate}%</div><div className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{vacantRooms} vacant</div></Link>
          <Link href='/dashboard/payments' className='card p-5 cursor-pointer hover:border-gray-400 transition-colors block'><div className='flex items-center justify-between mb-3'><span className='text-xs font-medium uppercase tracking-wide' style={{ color: 'var(--text-muted)' }}>Collected</span><PoundSterling size={15} className='text-green-500' /></div><div className='text-2xl font-semibold text-green-600'>£{totalCollected.toLocaleString()}</div><div className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{collectionRate}% of £{totalExpected.toLocaleString()}</div></Link>
          <Link href='/dashboard/profit-loss' className='card p-5 cursor-pointer hover:border-gray-400 transition-colors block'><div className='flex items-center justify-between mb-3'><span className='text-xs font-medium uppercase tracking-wide' style={{ color: 'var(--text-muted)' }}>Net profit</span><TrendingDown size={15} className={netProfitThisMonth >= 0 ? 'text-green-500' : 'text-red-400'} /></div><div className={`text-2xl font-semibold ${netProfitThisMonth >= 0 ? 'text-green-600' : 'text-red-500'}`}>£{Math.abs(netProfitThisMonth).toLocaleString()}</div><div className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{totalExpensesThisMonth > 0 ? 'after £' + totalExpensesThisMonth.toLocaleString() + ' expenses' : 'no expenses logged'}</div></Link>
          <Link href='/dashboard/payments' className='card p-5 cursor-pointer hover:border-gray-400 transition-colors block' style={overdueCount > 0 ? {animation:'attFlash 1.8s ease-in-out infinite'} : {}}><div className='flex items-center justify-between mb-3'><span className='text-xs font-medium uppercase tracking-wide' style={{ color: 'var(--text-muted)' }}>Attention</span><Bell size={15} className={overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} /></div><div className='text-2xl font-semibold' style={{ color: overdueCount > 0 ? '#dc2626' : 'var(--text-primary)' }}>{attentionCount}</div><div className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{overdueCount} overdue</div></Link>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='md:col-span-2 card'>
            <div className='px-5 py-4 border-b flex items-center justify-between' style={{ borderColor: 'var(--card-border)' }}><h2 className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>Rent status {monthLabel}</h2><Link href='/dashboard/payments' className='text-xs flex items-center gap-1 hover:text-gray-900' style={{ color: 'var(--text-muted)' }}>View all <ChevronRight size={12} /></Link></div>
            {payments.length === 0 ? (
              <div className='px-5 py-8 text-center text-sm' style={{ color: 'var(--text-muted)' }}>No payments this month. <Link href='/dashboard/tenants' className='underline' style={{ color: 'var(--text-primary)' }}>Add tenants</Link></div>
            ) : (
              <div className='divide-y' style={{ borderColor: 'var(--card-border)' }}>
                {payments.slice(0, 6).map(p => (
                  <div key={p.id} className='px-5 py-3.5 flex items-center gap-4'>
                    <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0'>{p.tenant?.name.split(' ').map((n: string) => n[0]).join('')}</div>
                    <div className='flex-1 min-w-0'><div className='text-sm font-medium truncate' style={{ color: 'var(--text-primary)' }}>{p.tenant?.name}</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>{p.tenant?.property?.address?.split(' ').slice(0,3).join(' ')} · {p.tenant?.room?.name}</div></div>
                    <div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>£{p.amount}</div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className='space-y-4'>
            {next7Days.length > 0 && (<div className='card'><div className='px-5 py-4 border-b' style={{ borderColor: 'var(--card-border)' }}><h2 className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>Due in next 7 days</h2></div><div className='divide-y' style={{ borderColor: 'var(--card-border)' }}>{next7Days.slice(0, 3).map(p => (<div key={p.id} className='px-5 py-3 flex items-center justify-between'><div><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{p.tenant?.name}</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>Due {format(new Date(p.due_date), 'd MMM')}</div></div><span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>£{p.amount}</span></div>))}</div></div>)}
            <div className='card'>
              <div className='px-5 py-4 border-b flex items-center justify-between' style={{ borderColor: 'var(--card-border)' }}><h2 className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>Unpaid bills</h2><Link href='/dashboard/bills' className='text-xs flex items-center gap-1' style={{ color: 'var(--text-muted)' }}>View all <ChevronRight size={12} /></Link></div>
              {unpaidBills.length === 0 ? (<div className='px-5 py-6 text-center text-sm' style={{ color: 'var(--text-muted)' }}>All bills paid</div>) : (<div className='divide-y' style={{ borderColor: 'var(--card-border)' }}>{unpaidBills.map(b => (<div key={b.id} className='px-5 py-3 flex items-center justify-between'><div className='flex items-center gap-2'><span className='text-base'>{categoryEmoji[b.category]}</span><div><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{b.name}</div><div className='text-xs' style={{ color: 'var(--text-muted)' }}>Due {format(new Date(b.due_date), 'd MMM')}</div></div></div><span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>£{b.amount}</span></div>))}</div>)}
              <div className='px-5 py-3 border-t' style={{ borderColor: 'var(--card-border)' }}><Link href='/dashboard/bills' className='btn-secondary w-full text-center block text-xs'>+ Add bill</Link></div>
            </div>
            {vacantRooms > 0 && (<div className='card px-5 py-4'><div className='flex items-center gap-3'><div className='w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0'><Users size={16} className='text-amber-600' /></div><div><div className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{vacantRooms} vacant room{vacantRooms !== 1 ? 's' : ''}</div><Link href='/dashboard/tenants' className='text-xs text-amber-600 hover:underline'>Add a tenant</Link></div></div></div>)}
          </div>
        </div>
      </div>
    </Layout>
  )
}

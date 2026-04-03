import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../lib/useAuth'
import { getProperties, getRentPayments, getSharedBills, signOut, type Property, type RentPayment, type SharedBill } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { format, differenceInDays, isPast, addDays, isWithinInterval } from 'date-fns'
import { Building2, PoundSterling, Bell, ChevronRight, LogOut, AlertTriangle, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

const categoryEmoji: Record<string, string> = {
  broadband: 'ð¡', council_tax: 'ðï¸', electricity: 'â¡', gas: 'ð¥', water: 'ð§', other: 'ð',
}

function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [bills, setBills] = useState<SharedBill[]>([])
  const [tenantCount, setTenantCount] = useState(0)
  const [roomCount, setRoomCount] = useState(0)
  const [documents, setDocuments] = useState<any[]>([])
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
          const [pays, bs, docData] = await Promise.all([
            getRentPayments(ids, month),
            getSharedBills(ids),
            supabase.from('compliance_documents').select('*').eq('landlord_id', user!.id),
          ])
          setPayments(pays)
          setBills(bs)
          setDocuments(docData.data || [])

          // Count tenants from payments (most reliable since payments RLS works)
          const uniqueTenants = new Set(pays.map(p => p.tenant_id))
          setTenantCount(uniqueTenants.size)

          // Count rooms separately
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

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading || dataLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  const now = new Date()
  const monthLabel = format(now, 'MMMM yyyy')
  const totalExpected = payments.reduce((s, p) => s + p.amount, 0)
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const overdueCount = payments.filter(p => p.status === 'overdue' || 
p.status === 'late').length 
const unpaidBillsCount = bills.filter(b => !b.paid).length
const attentionCount = overdueCount + unpaidBillsCount
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0
  const occupancyRate = roomCount > 0 ? Math.round((tenantCount / roomCount) * 100) : 0
  const vacantRooms = roomCount - tenantCount

  const expiredDocs = documents.filter(d => d.expiry_date && isPast(new Date(d.expiry_date)))
  const soonDocs = documents.filter(d => d.expiry_date && !isPast(new Date(d.expiry_date)) && differenceInDays(new Date(d.expiry_date), now) < 60)
  const next7Days = payments.filter(p => p.status !== 'paid' && isWithinInterval(new Date(p.due_date), { start: now, end: addDays(now, 7) }))
  const unpaidBills = bills.filter(b => !b.paid).slice(0, 4)

  if (properties.length === 0) {
    return (
      <Layout>
        <div className="p-8 max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{greeting()} ð</h1>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
              <LogOut size={14} /> Sign out
            </button>
          </div>
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={24} className="text-gray-400" />
            </div>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Add your first property</h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Start by adding a house share property. You can then add rooms and tenants.
            </p>
            <Link href="/dashboard/properties" className="btn-primary inline-flex items-center gap-2">
              <Building2 size={14} /> Add your first property
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{greeting()} ð</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{monthLabel} â portfolio snapshot</p>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Compliance alerts */}
        {expiredDocs.length > 0 && (
          <Link href="/dashboard/documents">
            <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-red-100 transition-colors cursor-pointer">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-red-800">{expiredDocs.length} compliance document{expiredDocs.length > 1 ? 's' : ''} expired â </span>
                <span className="text-xs text-red-600">{expiredDocs.map(d => d.name).join(', ')}</span>
              </div>
              <ChevronRight size={14} className="text-red-400" />
            </div>
          </Link>
        )}
        {soonDocs.length > 0 && (
          <Link href="/dashboard/documents">
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-amber-100 transition-colors cursor-pointer">
              <Clock size={16} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-amber-800">{soonDocs.length} document{soonDocs.length > 1 ? 's' : ''} expiring soon â </span>
                <span className="text-xs text-amber-600">{soonDocs.map(d => `${d.name} in ${differenceInDays(new Date(d.expiry_date), now)}d`).join(', ')}</span>
              </div>
              <ChevronRight size={14} className="text-amber-400" />
            </div>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Properties</span>
              <Building2 size={15} className="text-gray-400" />
            </div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{properties.length}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{tenantCount} tenant{tenantCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Occupancy</span>
              <Users size={15} className="text-gray-400" />
            </div>
            <div className={`text-2xl font-semibold ${occupancyRate === 100 ? 'text-green-600' : occupancyRate < 75 ? 'text-amber-600' : ''}`} style={{ color: occupancyRate >= 75 && occupancyRate < 100 ? 'var(--text-primary)' : undefined }}>
              {occupancyRate}%
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{vacantRooms} vacant</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Collected</span>
              <PoundSterling size={15} className="text-green-500" />
            </div>
            <div className="text-2xl font-semibold text-green-600">£{totalCollected.toLocaleString()}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{collectionRate}% of £{totalExpected.toLocaleString()}</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Attention</span>
              <Bell size={15} className={overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} />
            </div>
            <div className={`text-2xl font-semibold ${overdueCount > 0 ? 
'text-red-600' : 'text-gray-900'}`}>{attentionCount}</div>
            <div className="text-xs mt-1" style={{ color: 
'var(--text-muted)' }}>{overdueCount} overdue · {unpaidBillsCount} 
bills unpaid</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rent status */}
          <div className="md:col-span-2 card">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Rent status â {monthLabel}</h2>
              <Link href="/dashboard/payments" className="text-xs flex items-center gap-1 hover:text-gray-900" style={{ color: 'var(--text-muted)' }}>
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {payments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No payments this month.{' '}
                <Link href="/dashboard/tenants" className="underline" style={{ color: 'var(--text-primary)' }}>Add tenants</Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                {payments.slice(0, 6).map(p => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                      {p.tenant?.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.tenant?.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.tenant?.room?.name}</div>
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>£{p.amount}</div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {next7Days.length > 0 && (
              <div className="card">
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
                  <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Due in next 7 days</h2>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {next7Days.slice(0, 3).map(p => (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.tenant?.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Due {format(new Date(p.due_date), 'd MMM')}</div>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>£{p.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Unpaid bills</h2>
                <Link href="/dashboard/bills" className="text-xs flex items-center gap-1 hover:text-gray-900" style={{ color: 'var(--text-muted)' }}>
                  View all <ChevronRight size={12} />
                </Link>
              </div>
              {unpaidBills.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>All bills paid ð</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {unpaidBills.map(b => (
                    <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{categoryEmoji[b.category]}</span>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Due {format(new Date(b.due_date), 'd MMM')} · {b.property?.name}</div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>£{b.amount}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
                <Link href="/dashboard/bills" className="btn-secondary w-full text-center block text-xs">+ Add bill</Link>
              </div>
            </div>

            {vacantRooms > 0 && (
              <div className="card px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {vacantRooms} vacant room{vacantRooms !== 1 ? 's' : ''}
                    </div>
                    <Link href="/dashboard/tenants" className="text-xs text-amber-600 hover:underline">Add a tenant â</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

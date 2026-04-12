import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import StatusBadge from '../../../components/StatusBadge'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, getRentPayments, getSharedBills, markRentPaid, updateOverduePayments, type Property, type RentPayment, type SharedBill } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Check, ChevronDown, Loader2, Bell } from 'lucide-react'

function getMonths() {
  const r = []
  const n = new Date()
  for (let i = 0; i < 13; i++) {
    const d = new Date(n.getFullYear(), n.getMonth() + i, 1)
    r.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
  }
  return r
}
const MONTHS = getMonths()

const monthLabel = (m: string) => format(new Date(m + '-01'), 'MMMM yyyy')

export default function PaymentsPage() {
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [bills, setBills] = useState<SharedBill[]>([])
  const [month, setMonth] = useState(MONTHS[0])
  const [dataLoading, setDataLoading] = useState(true)
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [updatingOverdue, setUpdatingOverdue] = useState(false)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [reminderSent, setReminderSent] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getProperties(user.id).then(props => {
      setProperties(props)
      setPropertiesLoaded(true)
      if (props.length > 0) {
        getSharedBills(props.map(p => p.id)).then(bs => setBills(bs))
      }
    })
  }, [user])

  useEffect(() => {
    if (!propertiesLoaded) return
    if (properties.length === 0) { setDataLoading(false); return }
    setDataLoading(true)
    const ids = properties.map(p => p.id)
    getRentPayments(ids, month).then(data => {
      setPayments(data)
      setDataLoading(false)
    })
  }, [propertiesLoaded, properties, month])

  const handleMarkPaid = async (id: string) => {
    setMarkingPaid(id)
    try {
      await markRentPaid(id)
      setPayments(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'paid', paid_date: new Date().toISOString().split('T')[0] } : p
      ))
    } catch (e) { console.error(e) }
    finally { setMarkingPaid(null) }
  }

  const handleUpdateOverdue = async () => {
    setUpdatingOverdue(true)
    try {
      await updateOverduePayments()
      const ids = properties.map(p => p.id)
      const pays = await getRentPayments(ids, month)
      setPayments(pays)
    } catch (e) { console.error(e) }
    finally { setUpdatingOverdue(false) }
  }

  const handleSendReminder = async (p: RentPayment) => {
    if (!p.tenant?.id || !user) return
    setSendingReminder(p.id)
    try {
      const res = await fetch('/api/reminders/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: p.tenant.id, paymentId: p.id, landlordId: user.id })
      })
      const data = await res.json()
      if (data.sent || data.reason === 'no_email_or_resend_error') {
        setReminderSent(p.id)
        setTimeout(() => setReminderSent(null), 4000)
      }
    } catch (e) { console.error(e) }
    setSendingReminder(null)
  }

  const monthBills = bills.filter(b => b.due_date.startsWith(month) && !b.paid)
  const totalRent = payments.reduce((s, p) => s + p.amount, 0)
  const totalBillsShare = payments.length > 0 ? monthBills.reduce((s, b) => s + b.amount, 0) : 0
  const totalExpected = totalRent + totalBillsShare
  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const outstanding = totalExpected - collected

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Payments</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Track rent and bills month by month</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleUpdateOverdue} disabled={updatingOverdue} className="btn-secondary flex items-center gap-2 text-xs">
              {updatingOverdue ? <Loader2 size={12} className="animate-spin" /> : null}
              Refresh statuses
            </button>
            <div className="relative">
              <select value={month} onChange={e => setMonth(e.target.value)} className="appearance-none input pr-8 font-medium">
                {MONTHS.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Expected</div>
            <div className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>£{totalExpected.toLocaleString()}</div>
            {totalBillsShare > 0 && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Rent £{totalRent} + Bills £{totalBillsShare}</div>}
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Collected</div>
            <div className="text-xl font-semibold text-green-600">£{collected.toLocaleString()}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Outstanding</div>
            <div className={`text-xl font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>£{outstanding.toLocaleString()}</div>
          </div>
        </div>
        {monthBills.length > 0 && (
          <div className="mb-6 card p-4">
            <div className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Unpaid shared bills this month</div>
            <div className="space-y-2">
              {monthBills.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>{b.name} · {b.property?.address?.split(' ').slice(0,3).join(' ')} — £{(b.amount / (b.split_ways || 1)).toFixed(2)}/tenant x {b.split_ways} tenants</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>£{b.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {dataLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : payments.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>No payments for {monthLabel(month)}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Payments are created automatically when you add tenants.</p>
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: 'var(--card-border)' }}>
            <div className="px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              <div className="col-span-3">Tenant</div><div className="col-span-2">Room</div><div className="col-span-2">Rent</div>
              <div className="col-span-2">Bills share</div><div className="col-span-1">Total</div><div className="col-span-2 text-right">Status</div>
            </div>
            {payments.map(p => {
              const tenantBillsShare = monthBills.filter(b => b.property_id === p.property_id).reduce((s, b) => s + (b.amount / (b.split_ways || 1)), 0)
              const tenantTotal = p.amount + tenantBillsShare
              return (
                <div key={p.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                      {p.tenant?.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.tenant?.name}</span>
                  </div>
                  <div className="col-span-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.tenant?.property?.address?.split(' ').slice(0,3).join(' ')} · {p.tenant?.room?.name}</div>
                  <div className="col-span-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>£{p.amount}</div>
                  <div className="col-span-2 text-sm" style={{ color: tenantBillsShare > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {tenantBillsShare > 0 ? `£${tenantBillsShare.toFixed(2)}` : '—'}
                  </div>
                  <div className="col-span-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>£{tenantTotal.toFixed(0)}</div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <StatusBadge status={p.status} />
                    {p.status !== 'paid' && (
                      <button onClick={() => handleMarkPaid(p.id)} disabled={markingPaid === p.id} title="Mark rent as paid"
                        className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
                        {markingPaid === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                    )}
                    {p.status !== 'paid' && (
                      <button
                        onClick={() => handleSendReminder(p)}
                        disabled={sendingReminder === p.id}
                        title="Send payment reminder email"
                        className={`p-1.5 rounded-lg transition-colors ${reminderSent === p.id ? 'bg-green-50 text-green-600' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'}`}>
                        {sendingReminder === p.id ? <Loader2 size={12} className="animate-spin" /> : reminderSent === p.id ? <Check size={12} /> : <Bell size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
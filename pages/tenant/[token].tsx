import { useEffect, useState } from 'react'
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

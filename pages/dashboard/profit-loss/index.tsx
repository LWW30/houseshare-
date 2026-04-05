import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, getRentPayments, getSharedBills, getExpenses, type Property } from '../../../lib/supabase'
import { EXPENSE_CATEGORIES } from '../../../lib/supabase'
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import { TrendingUp, TrendingDown, Building2, Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

function fmt(n: number) { return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 }) }

export default function ProfitLossPage() {
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [filterProp, setFilterProp] = useState('')
  const [months, setMonths] = useState(6)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [rentByMonth, setRentByMonth] = useState<Record<string, number>>({})
  const [expByMonth, setExpByMonth] = useState<Record<string, number>>({})
  const [expByCategory, setExpByCategory] = useState<Record<string, number>>({})
  const [allExpenses, setAllExpenses] = useState<any[]>([])

  useEffect(() => { if (user) loadData() }, [user, filterProp, months])

  async function loadData() {
    if (!user) return
    setDataLoading(true)
    try {
      const props = await getProperties(user.id)
      setProperties(props)

      const propIds = filterProp ? [filterProp] : props.map(p => p.id)
      if (propIds.length === 0) { setDataLoading(false); return }

      // Get last N months
      const now = new Date()
      const from = startOfMonth(subMonths(now, months - 1))
      const fromStr = format(from, 'yyyy-MM')

      const [pays, bills, exps] = await Promise.all([
        Promise.all(propIds.map(id => getRentPayments([id]))).then(a => a.flat()),
        Promise.all(propIds.map(id => getSharedBills([id]))).then(a => a.flat()),
        getExpenses(user.id, filterProp || undefined),
      ])

      // Rent collected by month (paid payments only, within range)
      const rentMap: Record<string, number> = {}
      pays.filter(p => p.status === 'paid' && p.due_date >= fromStr + '-01').forEach(p => {
        const m = p.due_date.substring(0, 7)
        rentMap[m] = (rentMap[m] || 0) + p.amount
      })

      // Bills (paid) by month within range
      bills.filter(b => b.paid && b.due_date >= fromStr + '-01').forEach(b => {
        const m = b.due_date.substring(0, 7)
        rentMap[m] = (rentMap[m] || 0) // bills are costs not income
      })

      // Expenses by month and category
      const expMap: Record<string, number> = {}
      const catMap: Record<string, number> = {}
      const filteredExps = exps.filter(e => e.date >= fromStr + '-01')
      filteredExps.forEach(e => {
        const m = e.date.substring(0, 7)
        expMap[m] = (expMap[m] || 0) + e.amount
        catMap[e.category] = (catMap[e.category] || 0) + e.amount
      })

      setRentByMonth(rentMap)
      setExpByMonth(expMap)
      setExpByCategory(catMap)
      setAllExpenses(filteredExps)
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  // Build month list
  const now = new Date()
  const monthList = eachMonthOfInterval({
    start: startOfMonth(subMonths(now, months - 1)),
    end: startOfMonth(now)
  }).map(d => format(d, 'yyyy-MM')).reverse()

  const totalIncome = Object.values(rentByMonth).reduce((s, v) => s + v, 0)
  const totalExp = Object.values(expByMonth).reduce((s, v) => s + v, 0)
  const netProfit = totalIncome - totalExp
  const margin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0

  if (loading) return <Layout><div className="flex justify-center py-24"><Loader2 className="animate-spin text-gray-400" /></div></Layout>

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Profit & Loss</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Income vs expenses — shareable with your accountant</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input text-sm py-1.5" style={{ width: 'auto' }} value={filterProp} onChange={e => setFilterProp(e.target.value)}>
              <option value="">All properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address.split(',')[0]}</option>)}
            </select>
            <select className="input text-sm py-1.5" style={{ width: 'auto' }} value={months} onChange={e => setMonths(Number(e.target.value))}>
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total income</div>
            <div className="text-2xl font-semibold text-green-500">{fmt(totalIncome)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>rent collected</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total expenses</div>
            <div className="text-2xl font-semibold text-red-400">{fmt(totalExp)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{allExpenses.length} logged</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net profit</div>
            <div className={`text-2xl font-semibold ${netProfit >= 0 ? 'text-green-500' : 'text-red-400'}`}>
              {netProfit < 0 ? '-' : ''}{fmt(netProfit)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>income − expenses</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Margin</div>
            <div className={`text-2xl font-semibold ${margin >= 0 ? 'text-green-500' : 'text-red-400'}`}>{margin}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>of income kept</div>
          </div>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Month-by-month table */}
            <div className="card overflow-hidden mb-6">
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Month by month</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Month</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-green-500">Income</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-red-400">Expenses</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {monthList.map(m => {
                      const inc = rentByMonth[m] || 0
                      const exp = expByMonth[m] || 0
                      const net = inc - exp
                      const isExpanded = expanded[m]
                      const monthExps = allExpenses.filter(e => e.date.startsWith(m))
                      return (
                        <>
                          <tr
                            key={m}
                            className="hover:opacity-80 transition-opacity"
                            style={{ cursor: monthExps.length > 0 ? 'pointer' : 'default' }}
                            onClick={() => monthExps.length > 0 && setExpanded(p => ({ ...p, [m]: !p[m] }))}
                          >
                            <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                              <div className="flex items-center gap-2">
                                {format(new Date(m + '-01'), 'MMMM yyyy')}
                                {monthExps.length > 0 && (
                                  isExpanded ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-green-500">{inc > 0 ? fmt(inc) : '—'}</td>
                            <td className="px-4 py-3.5 text-right font-medium text-red-400">{exp > 0 ? fmt(exp) : '—'}</td>
                            <td className={`px-5 py-3.5 text-right font-semibold ${net >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                              {inc === 0 && exp === 0 ? '—' : (net < 0 ? '-' : '') + fmt(net)}
                            </td>
                          </tr>
                          {isExpanded && monthExps.map(e => {
                            const cat = EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] || EXPENSE_CATEGORIES.other
                            return (
                              <tr key={e.id} style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))' }}>
                                <td className="pl-10 pr-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {cat.emoji} {e.description}
                                </td>
                                <td className="px-4 py-2 text-right text-xs text-green-500">—</td>
                                <td className="px-4 py-2 text-right text-xs text-red-400">{fmt(e.amount)}</td>
                                <td className="px-5 py-2" />
                              </tr>
                            )
                          })}
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-5 py-3.5 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Total</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-green-500">{fmt(totalIncome)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-red-400">{fmt(totalExp)}</td>
                      <td className={`px-5 py-3.5 text-right font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {netProfit < 0 ? '-' : ''}{fmt(netProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Expense breakdown by category */}
            {Object.keys(expByCategory).length > 0 && (
              <div className="card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown size={14} style={{ color: 'var(--text-muted)' }} />
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Expenses by category</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(expByCategory)
                    .sort(([,a],[,b]) => b - a)
                    .map(([key, total]) => {
                      const cat = EXPENSE_CATEGORIES[key as keyof typeof EXPENSE_CATEGORIES] || EXPENSE_CATEGORIES.other
                      const pct = totalExp > 0 ? (total / totalExp) * 100 : 0
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-base w-6 flex-shrink-0 text-center">{cat.emoji}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                              <div className="h-full rounded-full bg-red-400" style={{ width: pct + '%' }} />
                            </div>
                          </div>
                          <span className="text-xs w-10 text-right" style={{ color: 'var(--text-muted)' }}>{Math.round(pct)}%</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* HMRC note */}
            <div className="rounded-xl border px-5 py-4 text-xs leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>For your accountant:</strong> This report shows rent collected vs logged expenses. 
              Mortgage interest is allowable against income tax (not capital). 
              Improvements (not repairs) are capital expenditure. 
              Always verify with a qualified tax adviser. Not financial advice.
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
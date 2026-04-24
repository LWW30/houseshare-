import { useEffect, useState, useCallback } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { Download, FileText, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react'

type Quarter = { label: string; start: string; end: string }
type Row = { date: string; description: string; category: string; amount: number; type: 'income' | 'expense' }

function getUKTaxQuarters(year: number): Quarter[] {
  return [
    { label: `Q1 ${year}/${year+1}`, start: `${year}-04-06`, end: `${year}-07-05` },
    { label: `Q2 ${year}/${year+1}`, start: `${year}-07-06`, end: `${year}-10-05` },
    { label: `Q3 ${year}/${year+1}`, start: `${year}-10-06`, end: `${year+1}-01-05` },
    { label: `Q4 ${year}/${year+1}`, start: `${year+1}-01-06`, end: `${year+1}-04-05` },
  ]
}

function currentTaxYear() {
  const now = new Date()
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

export default function MTDPage() {
  const { user, loading: authLoading } = useAuth()
  const [taxYear, setTaxYear] = useState(currentTaxYear())
  const [qIdx, setQIdx]       = useState(0)
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const quarters = getUKTaxQuarters(taxYear)
  const quarter  = quarters[qIdx]

  const loadData = useCallback(async (q: Quarter) => {
    if (!user) return
    setLoading(true)
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, due_date, tenants(first_name, last_name), rooms(name, properties(name))')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('due_date', q.start)
      .lte('due_date', q.end)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, date, description, category')
      .eq('user_id', user.id)
      .gte('date', q.start)
      .lte('date', q.end)

    const incomeRows: Row[] = (payments || []).map((p: any) => ({
      date: p.due_date,
      description: `Rent – ${p.tenants?.first_name ?? ''} ${p.tenants?.last_name ?? ''} (${p.rooms?.properties?.name ?? ''} / ${p.rooms?.name ?? ''})`,
      category: 'Rental income',
      amount: p.amount,
      type: 'income' as const,
    }))

    const expenseRows: Row[] = (expenses || []).map((e: any) => ({
      date: e.date,
      description: e.description || e.category,
      category: e.category,
      amount: e.amount,
      type: 'expense' as const,
    }))

    setRows([...incomeRows, ...expenseRows].sort((a, b) => a.date.localeCompare(b.date)))
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading && user) loadData(quarter)
  }, [user, authLoading, qIdx, taxYear, loadData, quarter])

  const income  = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const profit  = income - expense

  const exportCSV = () => {
    const header = 'Date,Description,Category,Type,Amount (GBP)\n'
    const body = rows.map(r =>
      `${r.date},"${r.description}","${r.category}",${r.type},${r.amount.toFixed(2)}`
    ).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LetFlowUK-MTD-${quarter.label.replace(/\s/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const yearOptions = [currentTaxYear() - 1, currentTaxYear()].map(y => ({ value: y, label: `${y}/${y + 1}` }))

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Making Tax Digital</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>HMRC-aligned quarterly digital records for self-assessment</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors">
            <Download size={15} />Export CSV
          </button>
        </div>

        <div className="mb-6 p-4 rounded-2xl flex gap-3 border" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">MTD for Income Tax is now live.</span>{' '}
            Landlords with rental income over £50,000/year must keep digital records and submit quarterly updates to HMRC.
            Threshold drops to £30,000 in April 2027. Export this data each quarter for your accountant.
          </p>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tax year</label>
            <select value={taxYear} onChange={e => { setTaxYear(Number(e.target.value)); setQIdx(0) }}
              className="text-sm border rounded-xl px-3 py-2" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
              {yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Quarter</label>
            <div className="flex gap-1">
              {quarters.map((q, i) => (
                <button key={q.label} onClick={() => setQIdx(i)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${i === qIdx ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  Q{i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={14} className="text-green-600" />
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Income</p>
            </div>
            <p className="text-2xl font-semibold text-green-600">{fmt(income)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown size={14} className="text-red-500" />
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expenses</p>
            </div>
            <p className="text-2xl font-semibold text-red-500">{fmt(expense)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net profit</p>
            </div>
            <p className={`text-2xl font-semibold ${profit >= 0 ? 'text-blue-600' : ''}`} style={profit < 0 ? { color: 'var(--text-primary)' } : {}}>{fmt(profit)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {quarter.label} <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{quarter.start} → {quarter.end}</span>
          </p>
          {!loading && rows.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 size={13} />{rows.length} records
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading records…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-2xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}>
            <FileText className="mx-auto mb-3 opacity-30" size={32} />
            <p className="text-sm">No records for this period.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{r.date}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{r.description}</td>
                    <td className="px-4 py-3 text-xs hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{r.category}</td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${r.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Net profit for {quarter.label}</td>
                  <td className={`px-4 py-3 text-right font-semibold text-base tabular-nums ${profit >= 0 ? 'text-blue-600' : ''}`}>{fmt(profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="card p-4 mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>HMRC submission deadlines</p>
          <ul className="text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
            <li>Q1 (Apr–Jul): submit by 5 Aug &nbsp;|&nbsp; Q2 (Jul–Oct): 5 Nov &nbsp;|&nbsp; Q3 (Oct–Jan): 5 Feb &nbsp;|&nbsp; Q4 (Jan–Apr): 5 May</li>
            <li>Export the CSV each quarter and share with your accountant or submit via HMRC-compatible software.</li>
            <li>These figures feed into your annual Self Assessment return (SA105).</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
      }

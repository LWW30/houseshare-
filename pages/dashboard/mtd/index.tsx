import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { supabase } from '../../../lib/supabase'
import { Download, TrendingUp, TrendingDown, FileText, AlertCircle, Lock } from 'lucide-react'
import Link from 'next/link'

type Row = { date: string; description: string; category: string; amount: number; type: 'income' | 'expense' }

function currentTaxYear() {
  const now = new Date()
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

function getQ(year: number, idx: number) {
  const qs = [
    { l: 'Q1', s: year + '-04-06', e: year + '-07-05' },
    { l: 'Q2', s: year + '-07-06', e: year + '-10-05' },
    { l: 'Q3', s: year + '-10-06', e: (year+1) + '-01-05' },
    { l: 'Q4', s: (year+1) + '-01-06', e: (year+1) + '-04-05' },
  ]
  const q = qs[idx]
  return { label: q.l + ' ' + year + '/' + (year+1), start: q.s, end: q.e }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

export default function MTDPage() {
  const { user, loading: authLoading } = useAuth()
  const { isPro } = usePlan()
  const [taxYear, setTaxYear] = useState(currentTaxYear)
  const [qIdx, setQIdx] = useState(() => { const m = new Date().getMonth(); if (m >= 3 && m <= 5) return 0; if (m >= 6 && m <= 8) return 1; if (m >= 9) return 2; return 3 })
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    const q = getQ(taxYear, qIdx)
    let cancelled = false
    setRows([]); setLoading(true)
    Promise.all([
      supabase.from('payments').select('amount, due_date, tenants(first_name, last_name), rooms(name, properties(name))').eq('user_id', user.id).eq('status', 'paid').gte('due_date', q.start).lte('due_date', q.end),
      supabase.from('expenses').select('amount, date, description, category').eq('user_id', user.id).gte('date', q.start).lte('date', q.end),
    ]).then(([pRes, eRes]) => {
      if (cancelled) return
      const inc: Row[] = (pRes.data || []).map((p: any) => ({ date: p.due_date, description: 'Rent - ' + (p.tenants?.first_name || '') + ' ' + (p.tenants?.last_name || '') + ' (' + (p.rooms?.properties?.name || '') + ')', category: 'Rental income', amount: Number(p.amount), type: 'income' as const }))
      const exp: Row[] = (eRes.data || []).map((e: any) => ({ date: e.date, description: e.description || e.category, category: e.category, amount: Number(e.amount), type: 'expense' as const }))
      setRows([...inc, ...exp].sort((a, b) => a.date.localeCompare(b.date)))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, authLoading, taxYear, qIdx])

  const q = getQ(taxYear, qIdx)
  const income = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const profit = income - expense

  function exportCSV() {
    const blob = new Blob(['Date,Description,Category,Type,Amount\n' + rows.map(r => r.date + ',"' + r.description + '","' + r.category + '",' + r.type + ',' + r.amount.toFixed(2)).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'MTD-' + q.label.replace(/[/ ]/g, '-') + '.csv'; a.click()
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Making Tax Digital</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>HMRC-aligned quarterly digital records</p>
          </div>
          {isPro && rows.length > 0 && <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors"><Download size={15} />Export CSV</button>}
        </div>

        <div className="mb-6 p-4 rounded-2xl flex gap-3 border" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-amber-800"><span className="font-semibold">MTD for Income Tax is now live.</span> Landlords with rental income over £50,000/year must keep digital records and submit quarterly updates to HMRC. Threshold drops to £30,000 in April 2027.</p>
        </div>

        {!isPro ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock size={20} className="text-amber-600" /></div>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Pro feature</h2>
            <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>MTD quarterly records with CSV export are available on Pro. Upgrade to unlock all features.</p>
            <Link href="/dashboard/billing" className="inline-block bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">Upgrade to Pro — from £29/mo</Link>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-6 flex-wrap">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tax year</label>
                <select value={taxYear} onChange={e => setTaxYear(Number(e.target.value))} className="text-sm border rounded-xl px-3 py-2" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                  {[currentTaxYear() - 1, currentTaxYear()].map(y => <option key={y} value={y}>{y}/{y+1}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Quarter</label>
                <div className="flex gap-1">
                  {['Q1','Q2','Q3','Q4'].map((label, i) => (
                    <button key={i} onClick={() => setQIdx(i)} className={'px-3 py-2 rounded-xl text-sm font-medium transition-all border ' + (i === qIdx ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400')}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><div className="flex items-center gap-1.5 mb-2"><TrendingUp size={14} className="text-green-600" /><p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Income</p></div><p className="text-2xl font-semibold text-green-600">{fmt(income)}</p></div>
              <div className="card p-4"><div className="flex items-center gap-1.5 mb-2"><TrendingDown size={14} className="text-red-500" /><p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expenses</p></div><p className="text-2xl font-semibold text-red-500">{fmt(expense)}</p></div>
              <div className="card p-4"><div className="flex items-center gap-1.5 mb-2"><FileText size={14} style={{ color: 'var(--text-muted)' }} /><p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net profit</p></div><p className={'text-2xl font-semibold ' + (profit >= 0 ? 'text-blue-600' : 'text-red-500')}>{fmt(profit)}</p></div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q.label} <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{q.start} to {q.end}</span></p>
              {!loading && rows.length > 0 && <p className="text-xs text-green-600">{rows.length} records</p>}
            </div>

            {loading ? (
              <div className="card py-16 text-center"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin mx-auto mb-3" /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading records...</p></div>
            ) : rows.length === 0 ? (
              <div className="card py-16 text-center"><FileText className="mx-auto mb-3 opacity-20" size={32} style={{ color: 'var(--text-muted)' }} /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No records for this period.</p><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Mark payments as paid and add expenses to see them here.</p></div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{r.date}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{r.description}</td>
                        <td className="px-4 py-3 text-xs hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{r.category}</td>
                        <td className={'px-4 py-3 text-right font-medium tabular-nums ' + (r.type === 'income' ? 'text-green-600' : 'text-red-500')}>{r.type === 'income' ? '+' : '-'}{fmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}>
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Net profit for {q.label}</td>
                    <td className={'px-4 py-3 text-right font-semibold text-base tabular-nums ' + (profit >= 0 ? 'text-blue-600' : 'text-red-500')}>{fmt(profit)}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
            <div className="card p-4 mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>HMRC deadlines</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Q1: submit by 5 Aug · Q2: 5 Nov · Q3: 5 Feb · Q4: 5 May. Export CSV and share with your accountant each quarter.</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
              }

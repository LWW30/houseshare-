import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { getProperties, getExpenses, createExpense, deleteExpense, EXPENSE_CATEGORIES, type Property, type Expense, type ExpenseCategory } from '../../../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Plus, Trash2, X, Loader2, Receipt, TrendingDown, Building2, Filter, Download , Zap, Receipt } from 'lucide-react'

type FormState = {
  property_id: string
  category: ExpenseCategory
  description: string
  amount: string
  date: string
  notes: string
}

const BLANK: FormState = {
  property_id: '',
  category: 'repairs_maintenance',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function ExpensesPage() {
  const { isPro } = usePlan()
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK)
  const [saving, setSaving] = useState(false)
  const [filterProp, setFilterProp] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterTaxYear, setFilterTaxYear] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setDataLoading(true)
    try {
      const [props, exps] = await Promise.all([
        getProperties(user.id),
        getExpenses(user.id),
      ])
      setProperties(props)
      setExpenses(exps)
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!user || !form.description || !form.amount || !form.date) return
    setSaving(true)
    try {
      const exp = await createExpense({
        landlord_id: user.id,
        property_id: form.property_id || undefined,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        notes: form.notes || undefined,
      })
      setExpenses(prev => [exp, ...prev])
      setForm(BLANK)
      setShowForm(false)
      setFlash('Expense added')
      setTimeout(() => setFlash(null), 3000)
    } catch (e) { console.error(e) }
    setSaving(false)
  }


  function exportCSV() {
    const rows = [
      ['Date', 'Description', 'Category', 'Amount (GBP)', 'Property', 'Notes'],
      ...filtered.map(e => {
        const cat = EXPENSE_CATEGORIES[e.category] || EXPENSE_CATEGORIES.other
        return [
          e.date,
          e.description,
          cat.label,
          e.amount.toFixed(2),
          (e.property as any)?.address || '',
          e.notes || ''
        ]
      })
    ]
    const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'letflow-expenses-' + new Date().toISOString().slice(0,10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (e) { console.error(e) }
    setDeleting(null)
  }

  // Filtered expenses
  const filtered = expenses.filter(e => {
    if (filterProp && e.property_id !== filterProp) return false
    if (filterMonth && !e.date.startsWith(filterMonth)) return false
    return true
  })

  // Summary stats
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const totalThisMonth = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0)
  const lastMonth = subMonths(new Date(), 1).toISOString().slice(0, 7)
  const totalLastMonth = expenses.filter(e => e.date.startsWith(lastMonth)).reduce((s, e) => s + e.amount, 0)

  // By category totals (filtered)
  const byCategory = Object.entries(EXPENSE_CATEGORIES).map(([key, cfg]) => ({
    key,
    cfg,
    total: filtered.filter(e => e.category === key).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>


  const handleMTDExport = () => {
    const rows = [
      ['Date', 'Category', 'Description', 'Amount (£)', 'Property', 'VAT Eligible'],
      ...filtered.map(e => [
        e.date,
        e.category,
        e.description || '',
        e.amount.toFixed(2),
        properties.find(p => p.id === e.property_id)?.name || '',
        'No'
      ])
    ]
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const year = selectedYear || new Date().getFullYear()
    a.download = 'LetFlowUK-MTD-Expenses-' + year + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isPro) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-[var(--green)] flex items-center justify-center mb-5">
          <Receipt size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Expenses tracking is a Pro feature</h1>
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Log all HMRC-allowable property costs — repairs, insurance, mortgage interest and more. Syncs with your P&L report for your accountant.
        </p>
        <Link href="/dashboard/billing" className="btn-primary flex items-center gap-2 px-6 py-2.5">
          <Zap size={14} /> Upgrade to Pro — from £29/mo
        </Link>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>14-day free trial · Cancel any time</p>
      </div>
    </Layout>
  )


  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Expenses</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track property costs — all HMRC-allowable categories</p>
          </div>
          <div className="flex items-center gap-2">
            {expenses.length > 0 && (
              <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
                <Download size={15} />Export CSV
              </button>
            )}
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} />Add expense
            </button>
            <button onClick={handleMTDExport} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={15} />MTD Export
            </button>
          </div>
        </div>

        {flash && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
            ✅ {flash}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>This month</div>
            <div className="text-2xl font-semibold text-red-500">£{totalThisMonth.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {totalLastMonth > 0 && (
                <span className={totalThisMonth > totalLastMonth ? 'text-red-400' : 'text-green-500'}>
                  vs £{totalLastMonth.toFixed(0)} last month
                </span>
              )}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>All time total</div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>£{totalAll.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Showing</div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>£{filtered.reduce((s, e) => s + e.amount, 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{filtered.length} filtered</div>
          </div>
        </div>

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>By category</span>
            </div>
            <div className="space-y-2">
              {byCategory.map(({ key, cfg, total }) => {
                const pct = filtered.length > 0 ? (total / filtered.reduce((s, e) => s + e.amount, 0)) * 100 : 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-base w-6 flex-shrink-0">{cfg.emoji}</span>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{cfg.label}</span>
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full bg-red-400" style={{ width: pct + '%' }} />
                    </div>
                    <span className="text-sm font-medium w-20 text-right" style={{ color: 'var(--text-primary)' }}>£{total.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <select className="input text-sm py-1.5" style={{ width: 'auto' }} value={filterProp} onChange={e => setFilterProp(e.target.value)}>
            <option value="">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          <input type="month" className="input text-sm py-1.5" style={{ width: 'auto' }} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterTaxYear('') }} />
          <select className="input text-sm py-1.5" style={{ width: 'auto' }} value={filterTaxYear} onChange={e => { setFilterTaxYear(e.target.value); setFilterMonth('') }}>
            <option value="">All tax years</option>
            <option value="2025-26">2025–26 (6 Apr 2025 – 5 Apr 2026)</option>
            <option value="2024-25">2024–25 (6 Apr 2024 – 5 Apr 2025)</option>
            <option value="2023-24">2023–24 (6 Apr 2023 – 5 Apr 2024)</option>
          </select>
          {(filterProp || filterMonth) && (
            <button onClick={() => { setFilterProp(''); setFilterMonth('') }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Clear</button>
          )}
        </div>

        {/* Expenses list */}
        {dataLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Receipt size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {expenses.length === 0 ? 'No expenses logged yet' : 'No expenses match your filters'}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Log repair costs, insurance, mortgage interest and more</p>
            {expenses.length === 0 && (
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Add your first expense</button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map(exp => {
                const cat = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.other
                return (
                  <div key={exp.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                      {cat.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{exp.description}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cat.label}</span>
                        {exp.property && (
                          <>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              <Building2 size={10} />
                              {(exp.property as any).address?.split(',')[0]}
                            </span>
                          </>
                        )}
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(exp.date), 'd MMM yyyy')}</span>
                      </div>
                      {exp.notes && <div className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{exp.notes}</div>}
                    </div>
                    <div className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                      £{exp.amount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deleting === exp.id}
                      className="p-1.5 rounded-lg transition-colors flex-shrink-0 opacity-40 hover:opacity-100"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {deleting === exp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* HMRC note */}
        <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
          Expenses logged here can be shared with your accountant. Always verify allowable deductions with a qualified tax adviser.
        </p>
      </div>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add expense</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Description *</label>
                <input className="input" placeholder="e.g. Boiler repair" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (£) *</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => set('category', e.target.value as ExpenseCategory)}>
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.emoji} {cfg.label} — {cfg.hmrc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Property <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <select className="input" value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                  <option value="">Not property-specific</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input className="input" placeholder="Any extra details..." value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description || !form.amount || !form.date}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? 'Saving...' : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
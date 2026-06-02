import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, getSharedBills, createSharedBill, toggleBillPaid, type Property, type SharedBill } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { Plus, Check, X, Loader2, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const categoryEmoji: Record<string, string> = {
  broadband: '📶', wifi: '📶', council_tax: '🏛️', tax: '🏛️', electricity: '⚡', electric: '⚡', gas: '🔥', water: '💧', sky: '📺', other: '📋',
}
const categoryLabel: Record<string, string> = {
  broadband: 'Broadband', wifi: 'WiFi', council_tax: 'Council Tax', tax: 'Council Tax', electricity: 'Electricity',
  electric: 'Electricity', gas: 'Gas', water: 'Water', sky: 'Sky / TV', other: 'Other',
}

export default function BillsPage() {
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [bills, setBills] = useState<SharedBill[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<SharedBill | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', property_id: '', amount: '', due_date: '', category: 'broadband', split_ways: '3' })
  const [editForm, setEditForm] = useState({ name: '', amount: '', due_date: '', split_ways: '' })

  useEffect(() => {
    if (!user) return
    async function load() {
      const props = await getProperties(user!.id)
      setProperties(props)
      if (props.length > 0) {
        const bs = await getSharedBills(props.map(p => p.id))
        setBills(bs)
        // Auto-select first property in form
        setForm(f => ({ ...f, property_id: props[0].id }))
      }
      setDataLoading(false)
    }
    load()
  }, [user])

  const handleAdd = async () => {
    if (!form.name || !form.property_id || !form.amount || !form.due_date) {
      setError('Please fill in all required fields'); return
    }
    setSaving(true); setError('')
    try {
      const b = await createSharedBill({
        name: form.name, property_id: form.property_id,
        amount: parseFloat(form.amount), due_date: form.due_date,
        category: form.category, split_ways: parseInt(form.split_ways) || 1,
      })
      setBills(prev => [b, ...prev])
      setShowModal(false)
      setForm({ name: '', property_id: properties[0]?.id || '', amount: '', due_date: '', category: 'broadband', split_ways: '3' })
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!showEditModal) return
    setSaving(true)
    try {
      await supabase.from('shared_bills').update({
        name: editForm.name,
        amount: parseFloat(editForm.amount),
        due_date: editForm.due_date,
        split_ways: parseInt(editForm.split_ways) || 1,
      }).eq('id', showEditModal.id)
      setBills(prev => prev.map(b => b.id === showEditModal.id ? {
        ...b, name: editForm.name, amount: parseFloat(editForm.amount),
        due_date: editForm.due_date, split_ways: parseInt(editForm.split_ways),
      } : b))
      setShowEditModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (bill: SharedBill) => {
    if (!confirm(`Delete "${bill.name}"?`)) return
    await supabase.from('shared_bills').delete().eq('id', bill.id)
    setBills(prev => prev.filter(b => b.id !== bill.id))
  }

  const handleToggle = async (bill: SharedBill) => {
    await toggleBillPaid(bill.id, !bill.paid)
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, paid: !b.paid } : b))
  }

  const unpaid = bills.filter(b => !b.paid)
  const paid = bills.filter(b => b.paid)
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0)

  if (loading || dataLoading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  const BillRow = ({ b }: { b: SharedBill }) => (
    <div className="px-5 py-4 flex items-center gap-4">
      <span className="text-xl">{categoryEmoji[b.category]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{b.name}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {b.property?.name?.split(' ').slice(0,3).join(' ')} · {new Date(b.due_date) < new Date() ? <span style={{color:'#ef4444',fontWeight:600,whiteSpace:'nowrap'}}>overdue {format(new Date(b.due_date), 'd MMM yyyy')}</span> : <span>due {format(new Date(b.due_date), 'd MMM yyyy')}</span>}
        </div>
      </div>
      <div className="text-right mr-3">
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>£{b.amount}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          £{(b.amount / (b.split_ways || 1)).toFixed(2)} × {b.split_ways}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => handleToggle(b)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium border transition-colors ${
            b.paid ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-50' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          }`}>
          <Check size={11} /> {b.paid ? 'Paid' : 'Mark paid'}
        </button>
        <button onClick={() => { setShowEditModal(b); setEditForm({ name: b.name, amount: String(b.amount), due_date: b.due_date, split_ways: String(b.split_ways || 1) }) }}
          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
          <Edit2 size={12} />
        </button>
        {!b.paid && (
          <button onClick={() => handleMarkPaid(b)} disabled={markingPaid === b.id}
            title="Mark as paid"
            className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
            {markingPaid === b.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
        )}
        <button onClick={() => handleDelete(b)}
          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )

  const handleMarkPaid = async (b: any) => {
    setMarkingPaid(b.id)
    try {
      await supabase.from('shared_bills').update({ paid: true }).eq('id', b.id)
      setBills(prev => prev.map(bill => bill.id === b.id ? { ...bill, paid: true } : bill))
    } catch (e) { console.error(e) }
    setMarkingPaid(null)
  }

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Shared bills</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Track house bills and per-tenant splits</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Add bill
          </button>
        </div>

        {totalUnpaid > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="text-sm font-medium text-amber-800">{unpaid.length} unpaid bill{unpaid.length > 1 ? 's' : ''} — £{totalUnpaid.toLocaleString()} total</div>
          </div>
        )}

        {bills.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-gray-500 mb-4">No bills yet</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">Add first bill</button>
          </div>
        ) : (
          <>
            {unpaid.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Unpaid</h2>
                <div className="card divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {unpaid.map(b => <BillRow key={b.id} b={b} />)}
                </div>
              </div>
            )}
            {paid.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Paid</h2>
                <div className="card divide-y opacity-70" style={{ borderColor: 'var(--card-border)' }}>
                  {paid.map(b => <BillRow key={b.id} b={b} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Add modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Add shared bill</h2>
                <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              {error && <p className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>}
              <div className="space-y-4">
                <div><label className="label">Bill name *</label><input className="input" placeholder="e.g. Sky Broadband" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="label">Property *</label>
                  <select className="input" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                    <option value="">Select property...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Amount (£) *</label><input className="input" type="number" placeholder="38" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  <div><label className="label">Split between</label><input className="input" type="number" min="1" placeholder="3" value={form.split_ways} onChange={e => setForm(f => ({ ...f, split_ways: e.target.value }))} /></div>
                </div>
                <div><label className="label">Due date *</label><input className="input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Add bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Edit bill</h2>
                <button onClick={() => setShowEditModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="label">Bill name</label><input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Amount (£)</label><input className="input" type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  <div><label className="label">Split between</label><input className="input" type="number" value={editForm.split_ways} onChange={e => setEditForm(f => ({ ...f, split_ways: e.target.value }))} /></div>
                </div>
                <div><label className="label">Due date</label><input className="input" type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleEdit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

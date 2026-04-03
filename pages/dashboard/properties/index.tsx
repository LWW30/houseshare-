import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, createProperty, getRooms, createRoom, getTenantsByProperty, getSharedBills, createSharedBill, toggleBillPaid, type Property, type Room, type Tenant, type SharedBill } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { Building2, Plus, MapPin, ChevronDown, ChevronUp, X, Loader2, Edit2, Trash2, Check, FileText, Receipt } from 'lucide-react'
import { format } from 'date-fns'

const categoryEmoji: Record<string, string> = {
  broadband: '', council_tax: '', electricity: '', gas: '', water: '', other: '',
}
const categoryLabel: Record<string, string> = {
  broadband: 'Broadband', council_tax: 'Council Tax', electricity: 'Electricity',
  gas: 'Gas', water: 'Water', other: 'Other',
}

export default function PropertiesPage() {
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Record<string, Room[]>>({})
  const [tenants, setTenants] = useState<Record<string, Tenant[]>>({})
  const [bills, setBills] = useState<Record<string, SharedBill[]>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modals
  const [showPropModal, setShowPropModal] = useState(false)
  const [propStep, setPropStep] = useState<'details' | 'bills'>('details')
  const [newPropertyId, setNewPropertyId] = useState<string | null>(null)
  const [propBills, setPropBills] = useState<Array<{ name: string; category: string; amount: string; due_date: string }>>([])
  const [showEditPropModal, setShowEditPropModal] = useState<Property | null>(null)
  const [showRoomModal, setShowRoomModal] = useState<string | null>(null)
  const [showEditRoomModal, setShowEditRoomModal] = useState<Room | null>(null)
  const [showBillModal, setShowBillModal] = useState<string | null>(null)

  // Forms
  const [propForm, setPropForm] = useState({ name: '', address: '' })
  const [editPropForm, setEditPropForm] = useState({ name: '', address: '' })
  const [roomForm, setRoomForm] = useState({ name: '', monthly_rent: '' })
  const [editRoomForm, setEditRoomForm] = useState({ name: '', monthly_rent: '' })
  const [billForm, setBillForm] = useState({ name: '', category: 'broadband', amount: '', due_date: '', split_ways: '1' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getProperties(user.id).then(data => {
      setProperties(data)
      setDataLoading(false)
    })
  }, [user])

  const expandProperty = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!rooms[id]) {
      const [r, t, b] = await Promise.all([
        getRooms(id),
        getTenantsByProperty(id),
        getSharedBills([id]),
      ])
      setRooms(prev => ({ ...prev, [id]: r }))
      setTenants(prev => ({ ...prev, [id]: t }))
      setBills(prev => ({ ...prev, [id]: b }))
    }
  }

  const handleAddProperty = async () => {
    if (!propForm.name || !propForm.address || !user) return
    setSaving(true); setError('')
    try {
      const p = await createProperty(user.id, propForm.name, propForm.address)
      setProperties(prev => [p, ...prev])
      setNewPropertyId(p.id)
      setPropStep('bills')
      setSaving(false)
    } catch (e: any) { setError(e.message); setSaving(false) }
  }

  const handleFinishProperty = async () => {
    if (newPropertyId && propBills.length > 0) {
      for (const b of propBills) {
        if (b.name && b.amount && b.due_date) {
          await createSharedBill({
            name: b.name, property_id: newPropertyId,
            amount: parseFloat(b.amount), due_date: b.due_date,
            category: b.category, split_ways: 1,
          })
        }
      }
    }
    setShowPropModal(false)
    setPropStep('details')
    setNewPropertyId(null)
    setPropBills([])
    setPropForm({ name: '', address: '' })
  }

  const handleEditProperty = async () => {
    if (!showEditPropModal) return
    setSaving(true); setError('')
    try {
      await supabase.from('properties').update({ name: editPropForm.name, address: editPropForm.address }).eq('id', showEditPropModal.id)
      setProperties(prev => prev.map(p => p.id === showEditPropModal.id ? { ...p, ...editPropForm } : p))
      setShowEditPropModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteProperty = async (prop: Property) => {
    if (!confirm(`Delete "${prop.name}"? This will delete all rooms, tenants, payments and bills linked to it.`)) return
    await supabase.from('shared_bills').delete().eq('property_id', prop.id)
    await supabase.from('rent_payments').delete().eq('property_id', prop.id)
    await supabase.from('tenants').delete().eq('property_id', prop.id)
    await supabase.from('rooms').delete().eq('property_id', prop.id)
    await supabase.from('properties').delete().eq('id', prop.id)
    setProperties(prev => prev.filter(p => p.id !== prop.id))
  }

  const handleAddRoom = async () => {
    if (!roomForm.name || !roomForm.monthly_rent || !showRoomModal) return
    setSaving(true); setError('')
    try {
      const r = await createRoom(showRoomModal, roomForm.name, parseFloat(roomForm.monthly_rent))
      setRooms(prev => ({ ...prev, [showRoomModal]: [...(prev[showRoomModal] || []), r] }))
      setShowRoomModal(null)
      setRoomForm({ name: '', monthly_rent: '' })
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleEditRoom = async () => {
    if (!showEditRoomModal) return
    setSaving(true); setError('')
    try {
      await supabase.from('rooms').update({ name: editRoomForm.name, monthly_rent: parseFloat(editRoomForm.monthly_rent) }).eq('id', showEditRoomModal.id)
      const propId = showEditRoomModal.property_id
      setRooms(prev => ({ ...prev, [propId]: (prev[propId] || []).map(r => r.id === showEditRoomModal.id ? { ...r, name: editRoomForm.name, monthly_rent: parseFloat(editRoomForm.monthly_rent) } : r) }))
      setShowEditRoomModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Delete "${room.name}"?`)) return
    const { data: tenantData } = await supabase.from('tenants').select('id').eq('room_id', room.id)
    if (tenantData?.length) {
      await supabase.from('rent_payments').delete().in('tenant_id', tenantData.map(t => t.id))
      await supabase.from('tenants').delete().eq('room_id', room.id)
    }
    await supabase.from('rooms').delete().eq('id', room.id)
    setRooms(prev => ({ ...prev, [room.property_id]: (prev[room.property_id] || []).filter(r => r.id !== room.id) }))
  }

  const handleAddBill = async () => {
    if (!billForm.name || !billForm.amount || !billForm.due_date || !showBillModal) return
    setSaving(true); setError('')
    try {
      // Auto-set split_ways to number of tenants in this property
      const tenantCount = tenants[showBillModal]?.length || 1
      const b = await createSharedBill({
        name: billForm.name,
        property_id: showBillModal,
        amount: parseFloat(billForm.amount),
        due_date: billForm.due_date,
        category: billForm.category,
        split_ways: tenantCount,
      })
      setBills(prev => ({ ...prev, [showBillModal]: [...(prev[showBillModal] || []), b] }))
      setShowBillModal(null)
      setBillForm({ name: '', category: 'broadband', amount: '', due_date: '', split_ways: '1' })
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleToggleBill = async (bill: SharedBill) => {
    await toggleBillPaid(bill.id, !bill.paid)
    const propId = bill.property_id
    setBills(prev => ({ ...prev, [propId]: (prev[propId] || []).map(b => b.id === bill.id ? { ...b, paid: !b.paid } : b) }))
  }

  const handleDeleteBill = async (bill: SharedBill) => {
    if (!confirm(`Delete "${bill.name}"?`)) return
    await supabase.from('shared_bills').delete().eq('id', bill.id)
    setBills(prev => ({ ...prev, [bill.property_id]: (prev[bill.property_id] || []).filter(b => b.id !== bill.id) }))
  }

  if (loading || dataLoading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Properties</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{properties.length} property{properties.length !== 1 ? 's' : ''} in your portfolio</p>
          </div>
          <button onClick={() => setShowPropModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Add property
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>No properties yet</p>
            <button onClick={() => setShowPropModal(true)} className="btn-primary">Add your first property</button>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map(p => (
              <div key={p.id} className="card overflow-hidden">
                {/* Property header */}
                <div className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => expandProperty(p.id)}>
                    <Building2 size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => expandProperty(p.id)}>
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</h2>
                    <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={11} />{p.address}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{rooms[p.id]?.length ?? ''} rooms</span>
                    <button onClick={() => { setShowEditPropModal(p); setEditPropForm({ name: p.name, address: p.address }) }}
                      className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDeleteProperty(p)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => expandProperty(p.id)} className="text-gray-400">
                      {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {expanded === p.id && (
                  <div className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                    {/* Rooms section */}
                    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <Receipt size={12} /> Rooms
                        </h3>
                        <button onClick={() => setShowRoomModal(p.id)} className="text-xs btn-secondary flex items-center gap-1">
                          <Plus size={11} /> Add room
                        </button>
                      </div>
                      {(rooms[p.id]?.length ?? 0) === 0 ? (
                        <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>No rooms yet  add a room to start adding tenants.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {rooms[p.id].map(r => {
                            const tenant = tenants[p.id]?.find(t => t.room_id === r.id)
                            return (
                              <div key={r.id} className="rounded-xl p-3 flex items-start justify-between" style={{ background: 'var(--bg)' }}>
                                <div>
                                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
                                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>£{r.monthly_rent}/mo</div>
                                  <div className="text-xs mt-1">
                                    {tenant ? <span className="text-green-600 font-medium">{tenant.name}</span> : <span style={{ color: 'var(--text-muted)' }}>Vacant</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => { setShowEditRoomModal(r); setEditRoomForm({ name: r.name, monthly_rent: String(r.monthly_rent) }) }}
                                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"><Edit2 size={11} /></button>
                                  <button onClick={() => handleDeleteRoom(r)}
                                    className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors"><Trash2 size={11} /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bills section */}
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <FileText size={12} /> Shared Bills
                        </h3>
                        <button onClick={() => {
                          setShowBillModal(p.id)
                          const tc = tenants[p.id]?.length || 1
                          setBillForm(f => ({ ...f, split_ways: String(tc) }))
                        }} className="text-xs btn-secondary flex items-center gap-1">
                          <Plus size={11} /> Add bill
                        </button>
                      </div>
                      {(bills[p.id]?.length ?? 0) === 0 ? (
                        <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>No bills added yet. Add broadband, gas, electricity etc.</p>
                      ) : (
                        <div className="space-y-2">
                          {bills[p.id].map(b => (
                            <div key={b.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg)' }}>
                              <span className="text-lg">{categoryEmoji[b.category]}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.name}</div>
                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                  Due {format(new Date(b.due_date), 'd MMM')} x £{(b.amount / (b.split_ways || 1)).toFixed(2)}/tenant  {b.split_ways}
                                </div>
                              </div>
                              <div className="text-sm font-semibold mr-2" style={{ color: 'var(--text-primary)' }}>£{b.amount}</div>
                              <button onClick={() => handleToggleBill(b)}
                                className={`text-xs px-2.5 py-1 rounded-xl font-medium border transition-colors flex items-center gap-1 ${b.paid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                <Check size={10} /> {b.paid ? 'Paid' : 'Unpaid'}
                              </button>
                              <button onClick={() => handleDeleteBill(b)}
                                className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors"><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add property modal */}
        {showPropModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
              {propStep === 'details' ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="font-semibold">Add property</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Step 1 of 2  Property details</p>
                    </div>
                    <button onClick={() => { setShowPropModal(false); setPropStep('details') }}><X size={18} className="text-gray-400" /></button>
                  </div>
                  {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                  <div className="space-y-4">
                    <div><label className="label">Property name</label><input className="input" placeholder="e.g. 42 Chapel Street" value={propForm.name} onChange={e => setPropForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className="label">Full address</label><input className="input" placeholder="Full address including postcode" value={propForm.address} onChange={e => setPropForm(f => ({ ...f, address: e.target.value }))} /></div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowPropModal(false); setPropStep('details') }} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleAddProperty} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      {saving && <Loader2 size={14} className="animate-spin" />} Next: Add bills 
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="font-semibold">Add shared bills</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Step 2 of 2  Optional</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Add recurring bills for this property. You can also add them later.</p>

                  <div className="space-y-3 mb-4">
                    {propBills.map((b, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Bill name</label>
                            <input className="input" placeholder="e.g. Sky Broadband" value={b.name}
                              onChange={e => setPropBills(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                          </div>
                          <div>
                            <label className="label">Category</label>
                            <select className="input" value={b.category}
                              onChange={e => setPropBills(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                              {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Amount (£)</label>
                            <input className="input" type="number" placeholder="38" value={b.amount}
                              onChange={e => setPropBills(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                          </div>
                          <div>
                            <label className="label">Due date</label>
                            <input className="input" type="date" value={b.due_date}
                              onChange={e => setPropBills(prev => prev.map((x, j) => j === i ? { ...x, due_date: e.target.value } : x))} />
                          </div>
                        </div>
                        <button onClick={() => setPropBills(prev => prev.filter((_, j) => j !== i))}
                          className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setPropBills(prev => [...prev, { name: '', category: 'broadband', amount: '', due_date: '' }])}
                    className="btn-secondary w-full flex items-center justify-center gap-2 mb-4 text-sm">
                    <Plus size={13} /> Add a bill
                  </button>

                  <div className="flex gap-3">
                    <button onClick={handleFinishProperty} className="btn-secondary flex-1">Skip  add bills later</button>
                    <button onClick={handleFinishProperty} className="btn-primary flex-1">
                      {propBills.length > 0 ? 'Save bills & finish' : 'Finish'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Edit property modal */}
        {showEditPropModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Edit property</h2>
                <button onClick={() => setShowEditPropModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="label">Property name</label><input className="input" value={editPropForm.name} onChange={e => setEditPropForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Full address</label><input className="input" value={editPropForm.address} onChange={e => setEditPropForm(f => ({ ...f, address: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditPropModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleEditProperty} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add room modal */}
        {showRoomModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Add room</h2>
                <button onClick={() => setShowRoomModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="label">Room name</label><input className="input" placeholder="e.g. Room 1" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Monthly rent (£)</label><input className="input" type="number" placeholder="550" value={roomForm.monthly_rent} onChange={e => setRoomForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowRoomModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddRoom} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Add room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit room modal */}
        {showEditRoomModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Edit room</h2>
                <button onClick={() => setShowEditRoomModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="label">Room name</label><input className="input" value={editRoomForm.name} onChange={e => setEditRoomForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Monthly rent (£)</label><input className="input" type="number" value={editRoomForm.monthly_rent} onChange={e => setEditRoomForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditRoomModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleEditRoom} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add bill modal */}
        {showBillModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Add shared bill</h2>
                <button onClick={() => setShowBillModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <div className="space-y-4">
                <div><label className="label">Bill name *</label><input className="input" placeholder="e.g. Sky Broadband" value={billForm.name} onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Category</label>
                  <select className="input" value={billForm.category} onChange={e => setBillForm(f => ({ ...f, category: e.target.value }))}>
                    {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Amount (£) *</label><input className="input" type="number" placeholder="38" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  <div>
                    <label className="label">Split between</label>
                    <input className="input" type="number" min="1" value={billForm.split_ways} onChange={e => setBillForm(f => ({ ...f, split_ways: e.target.value }))} />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Auto-set to tenant count</p>
                  </div>
                </div>
                <div><label className="label">Due date *</label><input className="input" type="date" value={billForm.due_date} onChange={e => setBillForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowBillModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddBill} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Add bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

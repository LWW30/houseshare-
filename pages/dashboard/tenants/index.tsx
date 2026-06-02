import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import StatusBadge from '../../../components/StatusBadge'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { getProperties, getTenantsByProperty, createTenant, getRooms, generatePaymentsForTenant, type Property, type Tenant, type Room } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { Plus, Mail, Phone, Copy, Check, X, Loader2, Edit2, Trash2, LogOut , Zap } from 'lucide-react'
import { format, differenceInDays, isPast } from 'date-fns'

function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== 'undefined' ? `${window.location.origin}/tenant/${token}` : ''
  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Portal link'}
    </button>
  )
}

export default function TenantsPage() {
  const { isPro } = usePlan()
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingPortal, setSendingPortal] = useState<string | null>(null)
  const [portalSent, setPortalSent] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<Tenant | null>(null)
  const [showMarkLeftModal, setShowMarkLeftModal] = useState<Tenant | null>(null)
  const [filter, setFilter] = useState('active')
  const [error, setError] = useState('')
  const [leftDate, setLeftDate] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', property_id: '', room_id: '', tenancy_start: '', tenancy_end: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', tenancy_end: '' })

  useEffect(() => {
    if (!user) return
    async function load() {
      const props = await getProperties(user!.id)
      setProperties(props)
      const allTenants: Tenant[] = []
      for (const p of props) {
        const t = await getTenantsByProperty(p.id)
        // Attach property to each tenant manually since join may not work
        allTenants.push(...t.map(tenant => ({ ...tenant, property: p })))
      }
      setTenants(allTenants)
      setDataLoading(false)
    }
    load()
  }, [user])

  const handlePropertyChange = async (propertyId: string) => {
    setForm(f => ({ ...f, property_id: propertyId, room_id: '' }))
    if (propertyId) {
      const r = await getRooms(propertyId)
      setRooms(r)
    }
  }

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.property_id || !form.room_id || !form.tenancy_start) {
      setError('Please fill in all required fields'); return
    }
    setSaving(true); setError('')
    try {
      const t = await createTenant({
        name: form.name, email: form.email,
        phone: form.phone || undefined,
        property_id: form.property_id, room_id: form.room_id,
        tenancy_start: form.tenancy_start,
        tenancy_end: form.tenancy_end || undefined,
      })
      try { await generatePaymentsForTenant(t.id) } catch (_) {}
      // Send welcome email with portal link (best-effort)
      if (t.invite_token && form.email) {
        const prop = properties.find(p => p.id === form.property_id)
        const room = rooms.find(r => r.id === form.room_id)
        fetch('/api/tenants/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantName: form.name,
            tenantEmail: form.email,
            propertyAddress: prop?.address || '',
            roomName: room?.name || '',
            portalUrl: `${window.location.origin}/tenant/${t.invite_token}`,
            landlordName: user?.email?.split('@')[0] || 'Your landlord',
          })
        }).catch(() => {})
      }
      setTenants(prev => [...prev, t])
      setShowModal(false)
      setForm({ name: '', email: '', phone: '', property_id: '', room_id: '', tenancy_start: '', tenancy_end: '' })
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!showEditModal) return
    setSaving(true); setError('')
    try {
      await supabase.from('tenants').update({
        name: editForm.name, email: editForm.email,
        phone: editForm.phone || null,
        tenancy_end: editForm.tenancy_end || null,
        right_to_rent_checked: editForm.right_to_rent_checked || false,
        right_to_rent_date: editForm.right_to_rent_date || null,
        right_to_rent_doc_type: editForm.right_to_rent_doc_type || null,
      }).eq('id', showEditModal.id)
      setTenants(prev => prev.map(t => t.id === showEditModal.id ? { ...t, ...editForm } : t))
      setShowEditModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleMarkLeft = async () => {
    if (!showMarkLeftModal) return
    setSaving(true)
    try {
      await supabase.from('tenants').update({
        status: 'left', left_date: leftDate || new Date().toISOString().split('T')[0]
      }).eq('id', showMarkLeftModal.id)
      setTenants(prev => prev.map(t => t.id === showMarkLeftModal.id ? { ...t, status: 'left' as any, left_date: leftDate } : t))
      setShowMarkLeftModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Delete ${tenant.name}? This will also delete all their payment records.`)) return
    await supabase.from('rent_payments').delete().eq('tenant_id', tenant.id)
    await supabase.from('tenants').delete().eq('id', tenant.id)
    setTenants(prev => prev.filter(t => t.id !== tenant.id))
  }

    const handleResendPortal = async (t: Tenant) => {
    if (!t.email || !t.invite_token) return
    setSendingPortal(t.id)
    try {
      const prop = properties.find(p => p.id === t.property_id)
      await fetch('/api/tenants/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: t.name,
          tenantEmail: t.email,
          propertyAddress: prop?.address || '',
          roomName: t.room?.name || '',
          portalUrl: window.location.origin + '/tenant/' + t.invite_token,
          landlordName: '',
        })
      })
      setPortalSent(t.id)
      setTimeout(() => setPortalSent(null), 3000)
    } catch (_) {}
    setSendingPortal(null)
  }

  const filtered = filter === 'all' ? tenants : tenants.filter(t => (t as any).status === filter || (!((t as any).status) && filter === 'active'))

  const endingSoon = tenants.filter(t => {
    if (!(t as any).tenancy_end || (t as any).status === 'left') return false
    const days = differenceInDays(new Date((t as any).tenancy_end), new Date())
    return days >= 0 && days <= 60
  })

  if (loading || dataLoading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tenants</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{tenants.filter(t => !(t as any).status || (t as any).status === 'active').length} active tenants</p>
          </div>
          {!isPro && tenants.filter(t => t.status === 'active').length >= 4
            ? (
              <Link href="/dashboard/billing" className="btn-primary flex items-center gap-2">
                <Zap size={14} /> Upgrade to add more tenants
              </Link>
            ) : (
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={14} /> Add tenant
              </button>
            )}
        </div>

        <div className="flex gap-2 mb-6">
          {['active', 'left', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'}`}>
              {f === 'active' ? `Active (${tenants.filter(t => !(t as any).status || (t as any).status === 'active').length})` :
               f === 'left' ? `Left (${tenants.filter(t => (t as any).status === 'left').length})` :
               `All (${tenants.length})`}
            </button>
          ))}
        </div>

        {endingSoon.length > 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <span className="text-amber-600 mt-0.5">⏰</span>
            <div>
              <div className="text-sm font-medium text-amber-800">{endingSoon.length} tenancy{endingSoon.length > 1 ? ' agreements' : ''} ending within 60 days</div>
              <div className="text-xs text-amber-700 mt-0.5">{endingSoon.map(t => t.name).join(', ')}</div>
            </div>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No tenants found</p>
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: 'var(--card-border)' }}>
            {filtered.map(t => (
              <div key={t.id} className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                  {t.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                    {(t as any).status === 'left' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Left</span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t.property?.name} · {t.room?.name} · £{t.room?.monthly_rent}/mo
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <a href={`mailto:${t.email}`} className="flex items-center gap-1 hover:text-gray-700">
                    <Mail size={11} /> {t.email}
                  </a>
                </div>
                <div className="flex items-center gap-1.5">
                  <CopyLink token={t.invite_token} />
                <button
                  onClick={() => handleResendPortal(t)}
                  disabled={sendingPortal === t.id || !t.email}
                  title="Resend portal link by email"
                  className={`p-1.5 rounded-lg transition-colors ${portalSent === t.id ? 'bg-green-50 text-green-600' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}>
                  {sendingPortal === t.id ? <Loader2 size={13} className="animate-spin" /> : portalSent === t.id ? <Check size={13} /> : <Mail size={13} />}
                </button>
                  <button onClick={() => { setShowEditModal(t); setEditForm({ name: t.name, email: t.email, phone: t.phone || '', tenancy_end: t.tenancy_end || '' }) }}
                    className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  {(!(t as any).status || (t as any).status === 'active') && (
                    <button onClick={() => setShowMarkLeftModal(t)}
                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors" title="Mark as left">
                      <LogOut size={13} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(t)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Add tenant</h2>
                <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              {error && <p className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>}
              <div className="space-y-4">
                <div><label className="label">Full name *</label><input className="input" placeholder="Tenant's full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Email *</label><input className="input" type="email" placeholder="tenant@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" placeholder="07700 900000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Property *</label>
                  <select className="input" value={form.property_id} onChange={e => handlePropertyChange(e.target.value)}>
                    <option value="">Select property...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {rooms.length > 0 && (
                  <div><label className="label">Room *</label>
                    <select className="input" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
                      <option value="">Select room...</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name} — £{r.monthly_rent}/mo</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Start date *</label><input className="input" type="date" value={form.tenancy_start} onChange={e => setForm(f => ({ ...f, tenancy_start: e.target.value }))} /></div>
                  <div><label className="label">End date</label><input className="input" type="date" value={form.tenancy_end} onChange={e => setForm(f => ({ ...f, tenancy_end: e.target.value }))} /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Add tenant
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
                <h2 className="font-semibold">Edit tenant</h2>
                <button onClick={() => setShowEditModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <div className="space-y-4">
                <div><label className="label">Full name</label><input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Email</label><input className="input" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Tenancy end date</label><input className="input" type="date" value={editForm.tenancy_end} onChange={e => setEditForm(f => ({ ...f, tenancy_end: e.target.value }))} /></div>
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

        {/* Mark as left modal */}
        {showMarkLeftModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Mark as left</h2>
                <button onClick={() => setShowMarkLeftModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{showMarkLeftModal.name} will be marked as having left the property.</p>
              <div>
                <label className="label">Date they left</label>
                <input className="input" type="date" value={leftDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setLeftDate(e.target.value)} />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowMarkLeftModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleMarkLeft} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Mark as left
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

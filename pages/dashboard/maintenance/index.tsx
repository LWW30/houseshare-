import { useEffect, useState } from 'react'
import { usePlan } from '../../../lib/usePlan'
import { ProGate } from '../../../components/ProGate'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, type Property } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Wrench, AlertCircle, Clock, CheckCircle2, ChevronDown, ChevronUp, Loader2, Building2, MessageSquare, Filter } from 'lucide-react'

type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Status = 'open' | 'in_progress' | 'resolved'

interface MaintenanceRequest {
  id: string
  title: string
  description?: string
  priority: Priority
  status: Status
  submitted_by_tenant_name?: string
  landlord_notes?: string
  created_at: string
  resolved_at?: string
  property_id: string
  property?: { address: string }
}

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-gray-400' },
  medium: { label: 'Medium', color: 'text-amber-500' },
  high:   { label: 'High',   color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
}

const STATUS_CFG: Record<Status, { label: string; icon: any; color: string }> = {
  open:        { label: 'Open',        icon: AlertCircle,   color: 'text-red-500' },
  in_progress: { label: 'In progress', icon: Clock,         color: 'text-amber-500' },
  resolved:    { label: 'Resolved',    icon: CheckCircle2,  color: 'text-green-500' },
}

export default function MaintenancePage() {
  const { user, loading } = useAuth()
  const { isPro, planLoading } = usePlan()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterProp, setFilterProp] = useState<string>('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setDataLoading(true)
    try {
      const props = await getProperties(user.id)
      setProperties(props)
      if (props.length === 0) { setDataLoading(false); return }
      const propIds = props.map(p => p.id)
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, property:properties(address)')
        .in('property_id', propIds)
        .order('created_at', { ascending: false })
      if (!error) setRequests(data as MaintenanceRequest[])
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  async function updateStatus(id: string, status: Status) {
    setUpdatingId(id)
    const update: any = { status }
    if (status === 'resolved') update.resolved_at = new Date().toISOString()
    else update.resolved_at = null
    const { error } = await supabase.from('maintenance_requests').update(update).eq('id', id)
    if (!error) setRequests(prev => prev.map(r => r.id === id ? { ...r, ...update } : r))
    setUpdatingId(null)
  }

  async function saveNote(id: string) {
    const note = noteInput[id]?.trim()
    if (!note) return
    setUpdatingId(id)
    const { error } = await supabase.from('maintenance_requests').update({ landlord_notes: note }).eq('id', id)
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, landlord_notes: note } : r))
      setNoteInput(prev => ({ ...prev, [id]: '' }))
    }
    setUpdatingId(null)
  }

  const filtered = requests.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false
    if (filterProp && r.property_id !== filterProp) return false
    return true
  })

  const openCount = requests.filter(r => r.status === 'open').length
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length
  const resolvedCount = requests.filter(r => r.status === 'resolved').length

  if (loading) return <Layout><div className="flex justify-center py-24"><Loader2 className="animate-spin text-gray-400" /></div></Layout>

  return (
    <Layout>
      <ProGate feature="Maintenance tracking" description="Log and track tenant maintenance requests, update status and add landlord notes. Timestamped records protect you legally now Section 21 is abolished." isPro={isPro} planLoading={planLoading}>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Maintenance</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tenant-reported issues across all properties</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {([
            { label: 'Open', count: openCount, color: 'text-red-500', status: 'open' },
            { label: 'In progress', count: inProgressCount, color: 'text-amber-500', status: 'in_progress' },
            { label: 'Resolved', count: resolvedCount, color: 'text-green-500', status: 'resolved' },
          ] as const).map(s => (
            <button key={s.status} onClick={() => setFilterStatus(filterStatus === s.status ? '' : s.status)}
              className={`card p-4 text-left transition-all ${filterStatus === s.status ? 'outline outline-2 outline-green-500' : ''}`}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color}`}>{s.count}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <select className="input text-sm py-1.5" style={{ width: 'auto' }} value={filterProp} onChange={e => setFilterProp(e.target.value)}>
            <option value="">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address.split(',')[0]}</option>)}
          </select>
          <select className="input text-sm py-1.5" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          {(filterProp || filterStatus) && (
            <button onClick={() => { setFilterProp(''); setFilterStatus('') }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Clear</button>
          )}
        </div>

        {/* List */}
        {dataLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Wrench size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {requests.length === 0 ? 'No maintenance requests yet' : 'No requests match your filters'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tenants submit requests through their portal link
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(req => {
              const pri = PRIORITY_CFG[req.priority]
              const sta = STATUS_CFG[req.status]
              const StatusIcon = sta.icon
              const isExpanded = expanded === req.id
              return (
                <div key={req.id} className="card overflow-hidden">
                  <div
                    className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setExpanded(isExpanded ? null : req.id)}
                  >
                    {/* Priority dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${req.priority === 'urgent' ? 'bg-red-500' : req.priority === 'high' ? 'bg-orange-400' : req.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{req.title}</span>
                        <span className={`text-xs font-semibold ${pri.color}`}>{pri.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                        {req.submitted_by_tenant_name && <span>{req.submitted_by_tenant_name}</span>}
                        {req.property && <><span>·</span><span className="flex items-center gap-1"><Building2 size={10} />{req.property.address.split(',')[0]}</span></>}
                        <span>·</span>
                        <span>{format(new Date(req.created_at), 'd MMM yyyy')}</span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${sta.color}`}>
                      <StatusIcon size={13} />
                      {sta.label}
                    </div>
                    {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t pt-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
                      {req.description && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{req.description}</p>
                      )}

                      {/* Status controls */}
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Update status</div>
                        <div className="flex gap-2 flex-wrap">
                          {(['open', 'in_progress', 'resolved'] as Status[]).map(s => {
                            const sc = STATUS_CFG[s]
                            const Icon = sc.icon
                            return (
                              <button
                                key={s}
                                onClick={() => updateStatus(req.id, s)}
                                disabled={req.status === s || updatingId === req.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                  req.status === s
                                    ? 'border-gray-800 bg-gray-800 text-white'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {updatingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                                {sc.label}
                              </button>
                            )
                          })}
                        </div>
                        {req.resolved_at && (
                          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            Resolved {format(new Date(req.resolved_at), 'd MMM yyyy')}
                          </p>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><MessageSquare size={11} />Your notes</span>
                        </div>
                        {req.landlord_notes && (
                          <p className="text-sm mb-2 p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {req.landlord_notes}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            className="input text-sm flex-1"
                            placeholder={req.landlord_notes ? 'Update note...' : 'Add a note (contractor called, parts ordered, etc)'}
                            value={noteInput[req.id] || ''}
                            onChange={e => setNoteInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && saveNote(req.id)}
                          />
                          <button
                            onClick={() => saveNote(req.id)}
                            disabled={!noteInput[req.id]?.trim() || updatingId === req.id}
                            className="btn-primary text-sm px-4 disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
          </ProGate>
    </Layout>
  )
}
import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, type Property } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Loader2, Plus, AlertCircle, Clock, CheckCircle2, Wrench, X } from 'lucide-react'

type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Status = 'open' | 'in_progress' | 'resolved'

interface MaintenanceRequest {
  id: string
  property_id: string
  title: string
  description: string
  priority: Priority
  status: Status
  created_at: string
  resolved_at?: string
  property?: { address: string }
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_ICONS: Record<Status, any> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
}

const STATUS_COLORS: Record<Status, string> = {
  open: 'text-red-500',
  in_progress: 'text-yellow-500',
  resolved: 'text-green-500',
}

export default function MaintenancePage() {
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [form, setForm] = useState({
    property_id: '',
    title: '',
    description: '',
    priority: 'medium' as Priority,
  })

  useEffect(() => {
    if (!user) return
    getProperties(user.id).then(props => {
      setProperties(props)
      if (props.length > 0) {
        fetchRequests(props.map(p => p.id))
      } else {
        setDataLoading(false)
      }
    })
  }, [user])

  const fetchRequests = async (propertyIds: string[]) => {
    setDataLoading(true)
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, property:properties(address)')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
      if (!error && data) setRequests(data)
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.property_id || !form.title) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('maintenance_requests').insert({
        property_id: form.property_id,
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: 'open',
        user_id: user?.id,
      })
      if (!error) {
        setShowModal(false)
        setForm({ property_id: '', title: '', description: '', priority: 'medium' })
        fetchRequests(properties.map(p => p.id))
      }
    } catch (e) { console.error(e) }
    setSubmitting(false)
  }

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', id)
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const open = requests.filter(r => r.status === 'open').length
  const inProgress = requests.filter(r => r.status === 'in_progress').length
  const resolved = requests.filter(r => r.status === 'resolved').length

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Maintenance</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Track and resolve property issues</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Log issue
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 cursor-pointer" onClick={() => setFilter('open')} style={{ borderColor: filter === 'open' ? 'var(--accent)' : undefined }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-red-500" />
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Open</div>
            </div>
            <div className="text-2xl font-semibold text-red-500">{open}</div>
          </div>
          <div className="card p-4 cursor-pointer" onClick={() => setFilter('in_progress')} style={{ borderColor: filter === 'in_progress' ? 'var(--accent)' : undefined }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-yellow-500" />
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>In progress</div>
            </div>
            <div className="text-2xl font-semibold text-yellow-500">{inProgress}</div>
          </div>
          <div className="card p-4 cursor-pointer" onClick={() => setFilter('resolved')} style={{ borderColor: filter === 'resolved' ? 'var(--accent)' : undefined }}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-green-500" />
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Resolved</div>
            </div>
            <div className="text-2xl font-semibold text-green-500">{resolved}</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Requests list */}
        {dataLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Wrench size={32} className="mx-auto mb-4 text-gray-300" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {filter === 'all' ? 'No maintenance requests yet' : `No ${filter.replace('_',' ')} requests`}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Log an issue using the button above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const StatusIcon = STATUS_ICONS[req.status]
              return (
                <div key={req.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{req.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[req.priority]}`}>
                          {req.priority}
                        </span>
                      </div>
                      {req.description && (
                        <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{req.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{req.property?.address || 'Unknown property'}</span>
                        <span>·</span>
                        <span>{format(new Date(req.created_at), 'd MMM yyyy')}</span>
                        {req.resolved_at && (
                          <><span>·</span><span className="text-green-500">Resolved {format(new Date(req.resolved_at), 'd MMM')}</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusIcon size={16} className={STATUS_COLORS[req.status]} />
                      <select
                        value={req.status}
                        onChange={e => updateStatus(req.id, e.target.value as Status)}
                        className="text-xs input py-1 px-2"
                        style={{ minWidth: '110px' }}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="card p-6 w-full max-w-md" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Log maintenance issue</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Property *</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="input w-full">
                  <option value="">Select property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Issue title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Boiler not heating, Broken door lock"
                  className="input w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Details about the issue..."
                  className="input w-full"
                  rows={3}
                  style={{ resize: 'none' }} />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${form.priority === p ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
                      style={{ color: form.priority === p ? undefined : 'var(--text-secondary)' }}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.title} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Log issue
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
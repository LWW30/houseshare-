import { useEffect, useState, useRef } from 'react'
import { usePlan } from '../../../lib/usePlan'
import Layout from '../../../components/Layout'
import { useRouter } from 'next/router'
import { useAuth } from '../../../lib/useAuth'
import { getProperties, type Property } from '../../../lib/supabase'
import { supabase } from '../../../lib/supabase'
import { Upload, FileText, Trash2, Download, AlertTriangle, CheckCircle, Clock, Plus, X, Loader2 } from 'lucide-react'
import { format, differenceInDays, isPast } from 'date-fns'

type Document = {
  id: string
  name: string
  category: string
  property_id: string
  property_name: string
  expiry_date?: string
  file_path: string
  file_size: number
  uploaded_at: string
}

const CATEGORIES = [
  { value: 'gas_safe', label: 'Gas Safe Certificate', requiresExpiry: true },
  { value: 'epc', label: 'EPC (Energy Performance)', requiresExpiry: true },
  { value: 'eicr', label: 'EICR (Electrical)', requiresExpiry: true },
  { value: 'fire_risk', label: 'Fire Risk Assessment', requiresExpiry: true },
  { value: 'tenancy_agreement', label: 'Tenancy Agreement', requiresExpiry: false },
  { value: 'deposit_certificate', label: 'Deposit Protection', requiresExpiry: false },
  { value: 'insurance', label: 'Insurance Certificate', requiresExpiry: true },
  { value: 'other', label: 'Other Document', requiresExpiry: false },
]

const categoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value

function ComplianceStatus({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null
  const days = differenceInDays(new Date(expiryDate), new Date())
  if (days < 0) return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <AlertTriangle size={10} /> Expired
    </span>
  )
  if (days < 60) return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Expires in {days}d
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle size={10} /> Valid
    </span>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { isPro, planLoading } = usePlan()
  const [properties, setProperties] = useState<Property[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    category: 'gas_safe',
    property_id: '',
    expiry_date: '',
    custom_name: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const props = await getProperties(user!.id)
      setProperties(props)
      if (props.length > 0) {
        await loadDocuments(props)
      }
      setDataLoading(false)
    }
    load()
  }, [user])

  const loadDocuments = async (props: Property[]) => {
    try {
      const { data, error } = await supabase
        .from('compliance_documents')
        .select('*')
        .in('property_id', props.map(p => p.id))
        .order('uploaded_at', { ascending: false })
      if (error) throw error

      const docsWithProperty = (data || []).map((d: any) => ({
        ...d,
        property_name: props.find(p => p.id === d.property_id)?.name || 'Unknown',
      }))
      setDocuments(docsWithProperty)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !form.property_id || !form.category || !user) {
      setError('Please select a file and fill in all required fields')
      return
    }
    setUploading(true)
    setError('')

    try {
      const ext = selectedFile.name.split('.').pop()
      const filePath = `${user.id}/${form.property_id}/${Date.now()}.${ext}`

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)
      if (uploadError) throw uploadError

      // Save document record to database
      const docName = form.custom_name || categoryLabel(form.category)
      const { data, error: dbError } = await supabase
        .from('compliance_documents')
        .insert({
          landlord_id: user.id,
          property_id: form.property_id,
          name: docName,
          category: form.category,
          expiry_date: form.expiry_date || null,
          file_path: filePath,
          file_size: selectedFile.size,
          file_name: selectedFile.name,
        })
        .select()
        .single()
      if (dbError) throw dbError

      const prop = properties.find(p => p.id === form.property_id)
      setDocuments(prev => [{
        ...data,
        property_name: prop?.name || 'Unknown',
      }, ...prev])

      setShowModal(false)
      setSelectedFile(null)
      setForm({ category: 'gas_safe', property_id: '', expiry_date: '', custom_name: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('compliance_documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  const selectedCategory = CATEGORIES.find(c => c.value === form.category)

  const expiredDocs = documents.filter(d => d.expiry_date && isPast(new Date(d.expiry_date)))
  const soonDocs = documents.filter(d => d.expiry_date && !isPast(new Date(d.expiry_date)) && differenceInDays(new Date(d.expiry_date), new Date()) < 60)

  const filtered = filter === 'all' ? documents
    : filter === 'expired' ? expiredDocs
    : filter === 'soon' ? soonDocs
    : documents.filter(d => d.category === filter)

  if (loading || dataLoading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  if (!isPro && !planLoading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--text-primary)' }}>
          <span style={{ fontSize: 22 }}>⚡</span>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Compliance documents is a Pro feature</h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>Store Gas Safe, EICR, EPC certificates and tenancy agreements with expiry tracking and automated alerts.</p>
        <button onClick={() => router.push('/dashboard/billing')} className="btn-primary flex items-center gap-2 px-6 py-2.5">
          ⚡ Upgrade to Pro — £19/mo
        </button>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>14-day free trial · Cancel any time</p>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-500 mt-1">Compliance certificates and tenancy documents</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Upload document
          </button>
        </div>

        {/* Alerts */}
        {expiredDocs.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-red-800">
                {expiredDocs.length} expired document{expiredDocs.length > 1 ? 's' : ''}
              </div>
              <div className="text-xs text-red-600 mt-0.5">
                {expiredDocs.map(d => d.name).join(', ')} — renew immediately
              </div>
            </div>
          </div>
        )}

        {soonDocs.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <Clock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-amber-800">
                {soonDocs.length} document{soonDocs.length > 1 ? 's' : ''} expiring soon
              </div>
              <div className="text-xs text-amber-600 mt-0.5">
                {soonDocs.map(d => `${d.name} (${differenceInDays(new Date(d.expiry_date!), new Date())}d)`).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all', label: `All (${documents.length})` },
            { value: 'expired', label: `Expired (${expiredDocs.length})` },
            { value: 'soon', label: `Expiring soon (${soonDocs.length})` },
            { value: 'gas_safe', label: 'Gas Safe' },
            { value: 'epc', label: 'EPC' },
            { value: 'eicr', label: 'EICR' },
            { value: 'tenancy_agreement', label: 'Tenancy' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                filter === f.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {documents.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-2">No documents uploaded yet</p>
            <p className="text-xs text-gray-400 mb-4">Upload Gas Safe certificates, EPCs, EICRs and tenancy agreements</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">Upload first document</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">No documents in this category</div>
        ) : (
          <div className="card divide-y divide-gray-50">
            {filtered.map(doc => (
              <div key={doc.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{doc.name}</span>
                    <ComplianceStatus expiryDate={doc.expiry_date} />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {doc.property_name} · {categoryLabel(doc.category)} · {formatBytes(doc.file_size)}
                    {doc.expiry_date && ` · Expires ${format(new Date(doc.expiry_date), 'd MMM yyyy')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(doc)}
                    className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors" title="Download">
                    <Download size={14} />
                  </button>
                  <button onClick={() => handleDelete(doc)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-900">Upload document</h2>
                <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              {error && <p className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>}
              <div className="space-y-4">
                <div>
                  <label className="label">Document type *</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Property *</label>
                  <select className="input" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                    <option value="">Select property...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Custom name (optional)</label>
                  <input className="input" placeholder={categoryLabel(form.category)} value={form.custom_name}
                    onChange={e => setForm(f => ({ ...f, custom_name: e.target.value }))} />
                </div>
                {selectedCategory?.requiresExpiry && (
                  <div>
                    <label className="label">Expiry date *</label>
                    <input className="input" type="date" value={form.expiry_date}
                      onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="label">File *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    {selectedFile ? (
                      <div>
                        <FileText size={20} className="text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={20} className="text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Click to select a file</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 50MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleUpload} disabled={uploading || !selectedFile} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Upload</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

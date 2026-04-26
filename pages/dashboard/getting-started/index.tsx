import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { supabase } from '../../../lib/supabase'
import { Building2, BedDouble, Users, CheckCircle2, ChevronRight, Loader2, Zap, Play } from 'lucide-react'
type Step = 'welcome' | 'property' | 'rooms' | 'tenant' | 'done'
interface Room { name: string; rent: string }
export default function GettingStarted() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [roomIds, setRoomIds] = useState<string[]>([])
  const [propName, setPropName] = useState('')
  const [propAddress, setPropAddress] = useState('')
  const [rooms, setRooms] = useState<Room[]>([{ name: 'Room 1', rent: '' }, { name: 'Room 2', rent: '' }])
  const [tenantName, setTenantName] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [tenantRoom, setTenantRoom] = useState('0')
  const steps = [{ key: 'property', label: 'Property', icon: Building2 }, { key: 'rooms', label: 'Rooms', icon: BedDouble }, { key: 'tenant', label: 'Tenant', icon: Users }]
  const stepIdx = steps.findIndex(s => s.key === step)
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:border-gray-900 transition-colors'
  const inputStyle = { borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }
  const loadDemo = async () => {
    if (!user) return
    setDemoLoading(true)
    try {
      const res = await fetch('/api/load-demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
      if (res.ok) router.push('/dashboard?demo=1')
    } catch (e) { console.error(e) } finally { setDemoLoading(false) }
  }
  const saveProperty = async () => {
    if (!user || !propName.trim() || !propAddress.trim()) return
    setLoading(true)
    const { data, error } = await supabase.from('properties').insert({ name: propName.trim(), address: propAddress.trim(), user_id: user.id }).select().single()
    setLoading(false)
    if (error || !data) return
    setPropertyId(data.id); setStep('rooms')
  }
  const saveRooms = async () => {
    if (!user || !propertyId) return
    const valid = rooms.filter(r => r.name.trim() && r.rent)
    if (!valid.length) return
    setLoading(true)
    const { data, error } = await supabase.from('rooms').insert(valid.map(r => ({ name: r.name.trim(), monthly_rent: parseFloat(r.rent), property_id: propertyId, user_id: user.id }))).select()
    setLoading(false)
    if (error || !data) return
    setRoomIds(data.map((r: any) => r.id)); setStep('tenant')
  }
  const saveTenant = async (skip = false) => {
    if (!skip && user && tenantName.trim() && tenantEmail.trim()) {
      setLoading(true)
      await supabase.from('tenants').insert({ first_name: tenantName.trim().split(' ')[0], last_name: tenantName.trim().split(' ').slice(1).join(' ') || '', email: tenantEmail.trim(), room_id: roomIds[parseInt(tenantRoom)], user_id: user.id, property_id: propertyId })
      setLoading(false)
    }
    setStep('done')
  }
  const addRoom = () => setRooms(r => [...r, { name: 'Room ' + (r.length + 1), rent: '' }])
  const removeRoom = (i: number) => setRooms(r => r.filter((_, idx) => idx !== i))
  const updateRoom = (i: number, field: keyof Room, val: string) => setRooms(r => r.map((rm, idx) => idx === i ? { ...rm, [field]: val } : rm))
  return (
    <Layout>
      <div className="min-h-screen flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-lg">
          {step === 'welcome' && (
            <div>
              <div className="text-center mb-10">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg width="24" height="24" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="white"/><rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6"/><rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6"/><rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.3"/></svg>
                </div>
                <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to LetFlowUK</h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>HMO management built for UK landlords. Get set up in under 2 minutes.</p>
              </div>
              <div className="space-y-3">
                <button onClick={loadDemo} disabled={demoLoading} className="w-full p-5 rounded-2xl border-2 text-left hover:border-gray-400 group transition-all" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">{demoLoading ? <Loader2 size={18} className="text-amber-600 animate-spin" /> : <Play size={18} className="text-amber-600" />}</div>
                    <div className="flex-1"><p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>Show me a demo</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Load sample data and explore the dashboard instantly</p></div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </button>
                <button onClick={() => setStep('property')} className="w-full p-5 rounded-2xl border-2 border-gray-900 text-left group" style={{ background: 'var(--card-bg)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0"><Building2 size={18} className="text-white" /></div>
feat: getting started wizard with demo data loader                    <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </button>
              </div>
              <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>Already set up? <button onClick={() => router.push('/dashboard')} className="underline underline-offset-2" style={{ color: 'var(--text-secondary)' }}>Go to dashboard</button></p>
            </div>
          )}
          {step !== 'welcome' && step !== 'done' && (
            <div className="mb-8 flex items-center">
              {steps.map((s, i) => {
                const Icon = s.icon; const done = i < stepIdx; const active = i === stepIdx
                return (<div key={s.key} className="flex items-center flex-1"><div className={'flex items-center gap-2 ' + (active ? '' : 'opacity-50')}><div className={'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ' + (done ? 'bg-green-500' : active ? 'bg-gray-900' : 'bg-gray-200')}>{done ? <CheckCircle2 size={14} className="text-white" /> : <Icon size={14} className={active ? 'text-white' : 'text-gray-400'} />}</div><span className="text-xs font-medium hidden sm:block" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span></div>{i < steps.length - 1 && <div className={'flex-1 h-px mx-3 ' + (i < stepIdx ? 'bg-green-500' : 'bg-gray-200')} />}</div>)
              })}
            </div>
          )}
          {step === 'property' && (<div className="card p-6"><div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center"><Building2 size={16} className="text-white" /></div><div><h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add your property</h2><p className="text-xs" style={{ color: 'var(--text-muted)' }}>You can add more later</p></div></div><div className="space-y-4"><div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Property name *</label><input value={propName} onChange={e => setPropName(e.target.value)} placeholder="e.g. 14 Victoria Road" className={inputCls} style={inputStyle} /></div><div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full address *</label><input value={propAddress} onChange={e => setPropAddress(e.target.value)} placeholder="e.g. 14 Victoria Road, Manchester, M1 2AB" className={inputCls} style={inputStyle} /></div></div><button onClick={saveProperty} disabled={loading || !propName.trim() || !propAddress.trim()} className="w-full mt-6 py-3 rounded-xl font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : null}Next: Add rooms{!loading && <ChevronRight size={14} />}</button></div>)}
          {step === 'rooms' && (<div className="card p-6"><div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center"><BedDouble size={16} className="text-white" /></div><div><h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add rooms</h2><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Each room tracks rent separately</p></div></div><div className="space-y-3 mb-4">{rooms.map((room, i) => (<div key={i} className="flex gap-2 items-start"><input value={room.name} onChange={e => updateRoom(i, 'name', e.target.value)} placeholder="Room name" className="flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-gray-900" style={inputStyle} /><div className="relative w-32"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>£</span><input type="number" value={room.rent} onChange={e => updateRoom(i, 'rent', e.target.value)} placeholder="Rent" className="w-full pl-7 pr-3 py-2.5 rounded-xl border text-sm outline-none focus:border-gray-900" style={inputStyle} /></div>{rooms.length > 1 && <button onClick={() => removeRoom(i)} className="p-2.5 rounded-xl border text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" style={{ borderColor: 'var(--card-border)' }}>x</button>}</div>))}</div><button onClick={addRoom} className="w-full py-2 rounded-xl border border-dashed text-sm hover:border-gray-400 mb-6" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>+ Add another room</button><button onClick={saveRooms} disabled={loading || rooms.filter(r => r.name && r.rent).length === 0} className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : null}Next: Add a tenant{!loading && <ChevronRight size={14} />}</button></div>)}
          {step === 'tenant' && (<div className="card p-6"><div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center"><Users size={16} className="text-white" /></div><div><h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add your first tenant</h2><p className="text-xs" style={{ color: 'var(--text-muted)' }}>They will get a welcome email</p></div></div><div className="space-y-4"><div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full name</label><input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="e.g. Sarah Johnson" className={inputCls} style={inputStyle} /></div><div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email address</label><input type="email" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} placeholder="e.g. sarah@email.com" className={inputCls} style={inputStyle} /></div><div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Assign to room</label><select value={tenantRoom} onChange={e => setTenantRoom(e.target.value)} className={inputCls} style={inputStyle}>{rooms.filter(r => r.name && r.rent).map((r, i) => (<option key={i} value={i}>{r.name} - £{r.rent}/mo</option>))}</select></div></div><button onClick={() => saveTenant(false)} disabled={loading || !tenantName.trim() || !tenantEmail.trim()} className="w-full mt-6 py-3 rounded-xl font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : null}Add tenant and finish</button><button onClick={() => saveTenant(true)} className="w-full mt-2 py-2.5 rounded-xl text-sm" style={{ color: 'var(--text-muted)' }}>Skip for now</button></div>)}
          {step === 'done' && (<div className="text-center"><div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5"><CheckCircle2 size={32} className="text-white" /></div><h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>You are all set!</h2><p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Your property is set up and your tenant will receive a welcome email.</p><div className="space-y-3 text-left mb-8">{([{ label: 'Track rent payments', href: '/dashboard/payments', desc: 'Mark rent as paid, send reminders' }, { label: 'View MTD records', href: '/dashboard/mtd', desc: 'HMRC quarterly digital records', badge: 'New' }, { label: 'Generate an AST', href: '/dashboard/agreements', desc: 'RRA 2025 compliant agreement', pro: true }] as any[]).map((item) => (<a key={item.label} href={item.href} className="flex items-center gap-3 p-4 rounded-xl border hover:border-gray-400 group transition-all" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</span>{item.pro && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">Pro</span>}{item.badge && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{item.badge}</span>}</div><div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</div></div><ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" /></a>))}</div><button onClick={() => router.push('/dashboard')} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"><Zap size={14} /> Go to my dashboard</button></div>)}
        </div>
      </div>
    </Layout>
  )
      }

import { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { ShieldCheck, AlertTriangle, CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, Clock, Info } from 'lucide-react'
interface CheckItem { id: string; label: string; detail: string; urgency: 'critical' | 'important' | 'advisory'; link?: string; linkLabel?: string }
interface Section { id: string; title: string; icon: string; summary: string; items: CheckItem[] }
const RRA_SECTIONS: Section[] = [
  { id: 'possession', title: 'Possession & eviction', icon: '🏛️', summary: 'Section 21 no-fault evictions are abolished. All possession must now go through Section 8 with valid grounds.', items: [
    { id: 'no-s21', label: 'Stop using or relying on Section 21 notices', detail: 'Section 21 is abolished from 1 May 2026. You must use Section 8 with a valid possession ground.', urgency: 'critical', link: 'https://www.gov.uk/evict-tenants/section-8', linkLabel: 'Section 8 grounds on Gov.uk' },
    { id: 'rent-arrears-evidence', label: 'Keep a full rent payment history for every tenant', detail: 'Under the new Ground 8 rules, you need documented evidence of arrears. LetFlow records every payment.', urgency: 'critical' },
    { id: 'notice-periods', label: 'Know the new Section 8 notice periods', detail: 'Ground 8 requires 4 weeks notice. Most other grounds require 2 months. Check each ground carefully.', urgency: 'important' },
    { id: 'repeated-arrears', label: 'Document any pattern of late payment', detail: 'New Ground 8A covers repeated arrears even if currently caught up.', urgency: 'important' },
  ]},
  { id: 'tenancies', title: 'Tenancy agreements', icon: '📄', summary: 'Fixed-term tenancies are replaced with periodic tenancies.', items: [
    { id: 'no-fixed-term', label: 'Stop offering new fixed-term tenancies', detail: 'All new tenancies from 1 May 2026 must be periodic (rolling).', urgency: 'critical' },
    { id: 'periodic-notice', label: 'Update your tenancy agreements to periodic from the outset', detail: 'New agreements should be drafted as periodic from day one.', urgency: 'critical' },
    { id: 'existing-tenancies', label: 'Understand how existing fixed-term tenancies transition', detail: 'Fixed-term ASTs created before 1 May 2026 continue until their end date, then automatically become periodic.', urgency: 'important' },
    { id: 'tenancy-terms', label: 'Review tenancy agreement terms against the new statutory defaults', detail: 'The Act introduces new statutory rights. Review your standard clauses.', urgency: 'important' },
  ]},
  { id: 'rent', title: 'Rent increases', icon: '💷', summary: 'Rent increases are now restricted to once per year via a Section 13 notice only.', items: [
    { id: 's13-only', label: 'Only use Section 13 notices to increase rent', detail: 'Rent review clauses in tenancy agreements are now unenforceable.', urgency: 'critical' },
    { id: 'once-per-year', label: 'Limit rent increases to once every 12 months', detail: 'You cannot increase rent more than once in any 12-month period.', urgency: 'critical' },
    { id: 'rent-tribunal', label: 'Be aware tenants can challenge increases at the First-tier Tribunal', detail: 'Tenants can refer any rent increase to the tribunal.', urgency: 'important' },
    { id: 'market-rate', label: 'Ensure any increase is evidenced as market rate', detail: 'Keep records of comparable rents in your area.', urgency: 'advisory' },
  ]},
  { id: 'deposits', title: 'Deposits & payments', icon: '🏦', summary: 'Deposit rules are tightened. New restrictions on advance rent.', items: [
    { id: 'deposit-protected', label: 'Protect every deposit within 30 days of receipt', detail: 'Deposit protection within 30 days is a legal requirement.', urgency: 'critical' },
    { id: 'deposit-prescribed-info', label: 'Serve prescribed information on deposit protection', detail: 'You must give tenants written information about their deposit scheme within 30 days.', urgency: 'critical' },
    { id: 'advance-rent', label: 'Do not take more than 1 months advance rent', detail: 'The RRA prohibits taking more than 1 months rent in advance.', urgency: 'critical' },
    { id: 'deposit-cap', label: 'Ensure deposits do not exceed 5 weeks rent', detail: 'For annual rent under 50,000, the deposit cap is 5 weeks rent.', urgency: 'important' },
  ]},
  { id: 'compliance', title: 'Compliance & safety', icon: '📋', summary: 'Pre-existing compliance obligations now underpin every possession route.', items: [
    { id: 'gas-safety', label: 'Annual Gas Safety Certificate (CP12) current for all properties', detail: 'Without a valid Gas Safety Certificate, you cannot serve certain Section 8 notices.', urgency: 'critical' },
    { id: 'eicr', label: 'EICR (electrical safety report) valid and within 5 years', detail: 'Mandatory for all private rentals.', urgency: 'critical' },
    { id: 'epc', label: 'EPC rating of E or above', detail: 'Current minimum is E. Government proposals require C by 2030 for new tenancies.', urgency: 'important' },
    { id: 'how-to-rent', label: 'Serve the latest How to Rent guide at the start of every tenancy', detail: 'You must provide the current version of the How to Rent guide.', urgency: 'critical', link: 'https://www.gov.uk/government/publications/how-to-rent', linkLabel: 'Download latest How to Rent guide' },
    { id: 'smoke-co-alarms', label: 'Smoke alarm on every floor, CO alarm in rooms with combustion appliances', detail: 'Smoke alarms required on every storey.', urgency: 'critical' },
    { id: 'hmo-licence', label: 'HMO licence current if property requires one', detail: 'Properties occupied by 5 or more people from 2 or more households must have an HMO licence.', urgency: 'critical' },
  ]},
  { id: 'maintenance', title: 'Maintenance & repairs', icon: '🔧', summary: 'Retaliatory eviction protections are strengthened. A paper trail is critical.', items: [
    { id: 'log-everything', label: 'Log every maintenance request with a timestamp', detail: 'Under the RRA, eviction attempts following tenant complaints can be challenged as retaliatory. LetFlow logs prove you acted in good faith.', urgency: 'critical' },
    { id: 'response-time', label: 'Respond to emergency repairs within 24 hours', detail: 'Courts and tribunals consider response times. Emergency issues should be addressed same day.', urgency: 'important' },
    { id: 'damp-mould', label: 'Address damp and mould promptly', detail: 'Landlords must investigate damp and mould within 14 days and fix within a further 7 days for hazardous cases.', urgency: 'critical' },
    { id: 'inspection-records', label: 'Keep records of property inspections', detail: 'Document periodic inspections with dates and findings.', urgency: 'important' },
  ]},
]
const URGENCY = { critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }, important: { label: 'Important', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' }, advisory: { label: 'Advisory', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' } }
const STORAGE_KEY = 'rra_checklist_v1'
export default function RRAPage() {
  const { user } = useAuth()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<'all'|'incomplete'|'critical'>('all')
  const [daysLeft, setDaysLeft] = useState(0)
  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setChecked(JSON.parse(saved)) } catch {}
    setDaysLeft(Math.max(0, Math.floor((new Date('2026-05-01').getTime() - Date.now()) / 86400000)))
  }, [])
  const toggle = (id: string) => setChecked(prev => { const next = { ...prev, [id]: !prev[id] }; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}; return next })
  const allItems = RRA_SECTIONS.flatMap(s => s.items)
  const completedCount = allItems.filter(i => checked[i.id]).length
  const criticalItems = allItems.filter(i => i.urgency === 'critical')
  const criticalComplete = criticalItems.filter(i => checked[i.id]).length
  const pct = Math.round((completedCount / allItems.length) * 100)
  const getFiltered = (items: CheckItem[]) => filter === 'incomplete' ? items.filter(i => !checked[i.id]) : filter === 'critical' ? items.filter(i => i.urgency === 'critical' && !checked[i.id]) : items
  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1"><ShieldCheck size={20} className="text-amber-500" /><h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Renters Rights Act 2025</h1></div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your compliance checklist — updated for 1 May 2026</p>
          </div>
          {daysLeft > 0 && <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2"><Clock size={13} /><span className="text-xs font-semibold">{daysLeft} days left</span></div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4"><div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Overall progress</div><div className="flex items-baseline gap-1 mb-2"><span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{completedCount}</span><span className="text-sm" style={{ color: 'var(--text-muted)' }}>/ {allItems.length} complete</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: pct+'%', background: pct===100?'#16a34a':pct>60?'#d97706':'#dc2626' }} /></div><div className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{pct}% ready</div></div>
          <div className="card p-4"><div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Critical items</div><div className="flex items-baseline gap-1"><span className={"text-2xl font-semibold "+(criticalComplete<criticalItems.length?'text-red-600':'text-green-600')}>{criticalComplete}</span><span className="text-sm" style={{ color: 'var(--text-muted)' }}>/ {criticalItems.length} done</span></div></div>
          <div className="card p-4"><div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Effective date</div><div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>1 May 2026</div></div>
        </div>
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-3"><Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-700">This checklist is a practical guide — not legal advice. Progress is saved to your browser.</p></div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {([{key:'all',label:'All items'},{key:'incomplete',label:'Not done'},{key:'critical',label:'Critical only'}] as const).map(({key,label}) => (
            <button key={key} onClick={() => setFilter(key)} className={"px-3 py-1.5 rounded-full text-xs font-medium "+(filter===key?'bg-gray-900 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{label}</button>
          ))}
        </div>
        <div className="space-y-3">
          {RRA_SECTIONS.map(section => {
            const filtered = getFiltered(section.items)
            if (!filtered.length) return null
            const done = section.items.filter(i => checked[i.id]).length
            const spct = Math.round(done/section.items.length*100)
            const isExpanded = expanded[section.id] !== false
            return (
              <div key={section.id} className="card overflow-hidden">
                <button className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors" onClick={() => setExpanded(p=>({...p,[section.id]:!p[section.id]}))}>
                  <span className="text-lg flex-shrink-0">{section.icon}</span>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{section.title}</span>{done===section.items.length&&<CheckCircle2 size={14} className="text-green-500"/>}</div><p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{section.summary}</p></div>
                  <div className="flex items-center gap-3 flex-shrink-0"><div><div className="text-xs font-medium" style={{ color: done===section.items.length?'#16a34a':'var(--text-secondary)' }}>{done}/{section.items.length}</div><div className="w-16 bg-gray-100 rounded-full h-1 mt-1"><div className="h-1 rounded-full" style={{ width: spct+'%', background: spct===100?'#16a34a':spct>60?'#d97706':'#dc2626' }}/></div></div>{isExpanded?<ChevronUp size={15} style={{ color: 'var(--text-muted)' }}/>:<ChevronDown size={15} style={{ color: 'var(--text-muted)' }}/>}</div>
                </button>
                {isExpanded && <div className="border-t" style={{ borderColor: 'var(--card-border)' }}>{filtered.map((item,idx) => { const u=URGENCY[item.urgency]; const isChecked=!!checked[item.id]; return (<div key={item.id} className={"px-5 py-4 flex items-start gap-4 "+(idx<filtered.length-1?'border-b':'')+(isChecked?' opacity-60':'')} style={{ borderColor: 'var(--card-border)' }}><button onClick={()=>toggle(item.id)} className="flex-shrink-0 mt-0.5">{isChecked?<CheckCircle2 size={20} className="text-green-500"/>:<Circle size={20} style={{ color: 'var(--text-muted)' }}/>}</button><div className="flex-1 min-w-0"><div className="flex items-start gap-2 mb-1 flex-wrap"><span className={"text-sm font-medium "+(isChecked?'line-through':'')} style={{ color: isChecked?'var(--text-muted)':'var(--text-primary)' }}>{item.label}</span><span className={"inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border "+u.bg+' '+u.color+' '+u.border}><span className={"w-1.5 h-1.5 rounded-full "+u.dot}/>{u.label}</span></div><p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.detail}</p>{item.link&&!isChecked&&<a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"><ExternalLink size={11}/>{item.linkLabel||'Learn more'}</a>}</div></div>) })}</div>}
              </div>
            )
          })}
        </div>
        <div className="mt-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Last updated April 2026. <a href="https://www.gov.uk/government/collections/renters-rights-bill" target="_blank" rel="noopener noreferrer" className="underline">Read the Act on Gov.uk</a></div>
      </div>
    </Layout>
  )
}

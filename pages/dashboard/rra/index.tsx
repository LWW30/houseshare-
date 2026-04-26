import { useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { usePlan } from '../../../lib/usePlan'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/router'
import { ShieldCheck, CheckCircle2, Circle, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import Link from 'next/link'

type ChecklistItem = { id: string; category: string; text: string; detail: string }

const CHECKLIST: ChecklistItem[] = [
  // Section 21 Abolition
  { id: 'no_s21', category: 'Section 21 abolished', text: 'Do not issue any new Section 21 notices', detail: 'Section 21 "no-fault" eviction is abolished. All evictions must now use Section 8 with valid grounds.' },
  { id: 's8_grounds', category: 'Section 21 abolished', text: 'Familiarise yourself with the new Section 8 grounds', detail: 'New mandatory and discretionary grounds added. Ground 1A allows sale of property with 4 months notice.' },
  { id: 's8_notice', category: 'Section 21 abolished', text: 'Know the required notice periods for each Section 8 ground', detail: 'Different grounds require different notice periods — 2 weeks to 4 months depending on ground.' },
  // Tenancy Changes
  { id: 'fixed_term', category: 'Tenancy structure', text: 'Convert all new tenancies to periodic (rolling) agreements', detail: 'Fixed-term tenancies are abolished for new tenancies. All new tenancies start as periodic.' },
  { id: 'existing_ast', category: 'Tenancy structure', text: 'Existing fixed-term ASTs continue until expiry', detail: 'Existing fixed-term tenancies run their course. No action needed until they expire — they become periodic automatically.' },
  { id: 'break_clauses', category: 'Tenancy structure', text: 'Remove break clauses from new tenancy agreements', detail: 'Break clauses are no longer valid in periodic tenancies. Update your standard agreement template.' },
  // Rent Increases
  { id: 'rent_review', category: 'Rent increases', text: 'Can only increase rent once per year via Section 13', detail: 'Rent increases limited to annual Section 13 process. Contractual rent review clauses no longer enforceable.' },
  { id: 'rent_notice', category: 'Rent increases', text: 'Give 2 months written notice of any rent increase', detail: 'Must use the new prescribed Section 13 form. Tenants have right to challenge at the First-tier Tribunal.' },
  { id: 'above_market', category: 'Rent increases', text: 'Ensure increases are at or below market rate', detail: 'Tribunal will assess whether proposed rent is at market level. Above-market increases may be rejected.' },
  // Deposits
  { id: 'deposit_cap', category: 'Deposits', text: 'Check deposit cap still applies (5 weeks rent)', detail: 'Deposit cap unchanged at 5 weeks rent for annual rent under £50,000.' },
  { id: 'deposit_protect', category: 'Deposits', text: 'Protect deposit within 30 days in approved scheme', detail: 'Required: TDS, DPS, or mydeposits. Provide Prescribed Information within 30 days.' },
  { id: 'deposit_return', category: 'Deposits', text: 'Return deposit within 10 days of agreement on deductions', detail: 'Once deductions agreed (or no deductions), return within 10 days.' },
  // Pets
  { id: 'pets_default', category: 'Pets', text: 'Default position is tenants can keep pets', detail: 'Cannot blanket-ban pets. Must consider requests within 42 days and can only refuse with good reason.' },
  { id: 'pets_insurance', category: 'Pets', text: 'You can require pet damage insurance', detail: 'Landlords can require tenants to have pet insurance. Cannot charge a higher deposit for pets.' },
  { id: 'pets_reply', category: 'Pets', text: 'Reply to pet requests within 42 days', detail: 'Failure to respond within 42 days is treated as consent. Keep written records of all pet requests and decisions.' },
  // Safety & Compliance
  { id: 'gas_safe', category: 'Safety compliance', text: 'Annual gas safety check by registered engineer', detail: 'Gas Safe certificate must be renewed annually and shared with tenants before move-in and on renewal.' },
  { id: 'eicr', category: 'Safety compliance', text: 'EICR electrical inspection every 5 years', detail: 'Must be done by a qualified electrician. Share with tenants within 28 days of inspection.' },
  { id: 'epc', category: 'Safety compliance', text: 'EPC rating of E or above (C by 2030 proposed)', detail: 'Current minimum is E. Government proposals would require C by 2030 — begin planning upgrades now.' },
  { id: 'smoke_co', category: 'Safety compliance', text: 'Smoke alarm on each floor, CO alarm near heat sources', detail: 'Test at start of each tenancy. Required in all rented properties since 2022.' },
  { id: 'fire_risk', category: 'Safety compliance', text: 'Fire risk assessment for HMOs', detail: 'Required for all HMOs. Review annually or when significant changes made to the property.' },
  // Awaab's Law
  { id: 'awaab_damp', category: "Awaab's Law", text: 'Investigate damp and mould reports within 14 days', detail: "Awaab's Law requires landlords to begin investigating damp/mould within 14 days of a report." },
  { id: 'awaab_fix', category: "Awaab's Law", text: 'Fix damp and mould within specified timescales', detail: 'Emergency hazards: fix within 24 hours. Non-emergency: fix within 7 days of investigation completion.' },
  { id: 'awaab_records', category: "Awaab's Law", text: 'Keep records of all damp/mould reports and actions', detail: 'Document every report, inspection, and repair. Essential evidence if challenged by tenant or council.' },
  // Discrimination
  { id: 'no_dss', category: 'Equal treatment', text: 'Do not discriminate against benefit claimants', detail: '"No DSS" policies are unlawful. Cannot refuse tenants solely because they receive housing benefit or Universal Credit.' },
  { id: 'no_children', category: 'Equal treatment', text: 'Cannot refuse families with children without good reason', detail: 'Blanket "no children" policies are likely discriminatory under the Equality Act 2010.' },
  { id: 'disability_adjust', category: 'Equal treatment', text: 'Make reasonable adjustments for disabled tenants', detail: 'Must consider and make reasonable adjustments when requested by disabled tenants.' },
]

function groupByCategory(arr: ChecklistItem[]): Record<string, ChecklistItem[]> {
  return arr.reduce((acc: Record<string, ChecklistItem[]>, item: ChecklistItem) => {
    acc[item.category] = acc[item.category] ? [...acc[item.category], item] : [item]
    return acc
  }, {})
}

export default function RRAPage() {
  const { user, loading } = useAuth()
  const { isPro, planLoading } = usePlan()
  const router = useRouter()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // Load saved state from Supabase
  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('rra_checklist').eq('id', user.id).single().then(({ data }) => {
      if (data?.rra_checklist) setChecked(data.rra_checklist as Record<string, boolean>)
    })
  }, [user])

  const handleToggle = async (id: string) => {
    const newChecked = { ...checked, [id]: !checked[id] }
    setChecked(newChecked)
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, rra_checklist: newChecked })
    setSaving(false)
  }

  if (loading || planLoading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" /></div></Layout>

  if (!isPro) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>RRA 2025 checklist is a Pro feature</h1>
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Interactive checklist covering all Renters Rights Act obligations — Section 21 abolition, new eviction rules, rent increases and deposit caps.
        </p>
        <Link href="/dashboard/billing" className="btn-primary flex items-center gap-2 px-6 py-2.5">
          <Zap size={14} /> Upgrade to Pro — from £29/mo
        </Link>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>14-day free trial · Cancel any time</p>
      </div>
    </Layout>
  )

  const groups = groupByCategory(CHECKLIST)
  const total = CHECKLIST.length
  const done = CHECKLIST.filter(item => checked[item.id]).length

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>RRA 2025 Compliance</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Renters Rights Act 2025 — interactive checklist</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold" style={{ color: done === total ? '#16a34a' : 'var(--text-primary)' }}>{done}/{total}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{saving ? 'Saving...' : 'items complete'}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full mb-8 overflow-hidden" style={{ background: 'var(--card-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(done/total)*100}%`, background: done === total ? '#16a34a' : '#111827' }}
          />
        </div>

        <div className="space-y-4">
          {Object.entries(groups).map(([category, items]) => {
            const catDone = items.filter(i => checked[i.id]).length
            const isOpen = expanded[category] !== false // default open
            return (
              <div key={category} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(p => ({ ...p, [category]: !isOpen }))}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catDone === items.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {catDone}/{items.length}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                    {items.map(item => (
                      <div key={item.id} className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleToggle(item.id)} className="mt-0.5 flex-shrink-0">
                            {checked[item.id]
                              ? <CheckCircle2 size={18} className="text-green-500" />
                              : <Circle size={18} className="text-gray-300" />
                            }
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${checked[item.id] ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--text-primary)' }}>
                              {item.text}
                            </div>
                            <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                              {item.detail}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 rounded-2xl border text-xs leading-relaxed" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Disclaimer:</strong> This checklist is a guide only and does not constitute legal advice. The Renters Rights Act is subject to ongoing implementation — verify current requirements with a qualified solicitor. LetFlowUK accepts no liability for reliance on this checklist.
        </div>
      </div>
    </Layout>
  )
}

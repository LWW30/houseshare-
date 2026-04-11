import { useState, useEffect } from 'react'
import { usePlan } from '../../../lib/usePlan'
import { ProGate } from '../../../components/ProGate'
import Layout from '../../../components/Layout'
import { CheckCircle2, Circle, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Shield } from 'lucide-react'

type CheckItem = {
  id: string
  title: string
  detail: string
  required: boolean
  govLink?: string
}

type Section = {
  id: string
  title: string
  icon: string
  deadline: string
  items: CheckItem[]
}

const SECTIONS: Section[] = [
  {
    id: 'tenancy',
    title: 'Tenancy & Eviction',
    icon: '📋',
    deadline: '1 May 2026',
    items: [
      { id: 's21', title: 'Stop using Section 21 notices', detail: 'Section 21 no-fault evictions are abolished from 1 May 2026. All future evictions must use Section 8 grounds.', required: true, govLink: 'https://www.gov.uk/guidance/renters-rights-act' },
      { id: 's8', title: 'Understand new Section 8 grounds', detail: 'Familiarise yourself with the updated grounds for possession including new mandatory grounds 1A (selling) and 1B (moving in family).', required: true },
      { id: 'notice', title: 'Update notice periods', detail: 'Notice periods under Section 8 have changed. Ground 8 (rent arrears) now requires 4 weeks notice minimum.', required: true },
      { id: 'periodic', title: 'Prepare for periodic tenancies', detail: 'All fixed-term tenancies become periodic after their end date. You cannot contractually prevent tenants leaving with 2 months notice.', required: true },
    ]
  },
  {
    id: 'rent',
    title: 'Rent & Deposits',
    icon: '💷',
    deadline: '1 May 2026',
    items: [
      { id: 'rent_increase', title: 'Use correct rent increase procedure', detail: 'Rent increases can only happen once per year via a Section 13 notice. Tenants can challenge increases at the First-tier Tribunal.', required: true },
      { id: 'no_bidding', title: 'No rent bidding or pre-tenancy increases', detail: 'It is now illegal to accept rent above your advertised price or invite bidding wars between prospective tenants.', required: true },
      { id: 'deposit_cap', title: 'Confirm deposit is within 5-week cap', detail: 'Deposits remain capped at 5 weeks rent for properties under £50,000/yr. Ensure all current deposits comply.', required: true },
      { id: 'deposit_protect', title: 'Verify all deposits are protected', detail: 'All deposits must be in a government-approved scheme (DPS, MyDeposits, or TDS) within 30 days of receipt.', required: true, govLink: 'https://www.gov.uk/tenancy-deposit-protection' },
    ]
  },
  {
    id: 'pets',
    title: 'Pets & Alterations',
    icon: '🐾',
    deadline: '1 May 2026',
    items: [
      { id: 'pets_policy', title: 'Create a written pet request policy', detail: 'Tenants have a right to request a pet. You must respond within 28 days. Refusal requires a reasonable justification.', required: true },
      { id: 'pet_insurance', title: 'Consider pet damage insurance', detail: 'You can require tenants to take out pet damage insurance as a condition of keeping a pet. Update your tenancy agreements.', required: false },
      { id: 'alterations', title: 'Review your alterations policy', detail: 'Tenants have new rights to request reasonable alterations. You cannot blanket-prohibit all changes. Update clauses in agreements.', required: true },
    ]
  },
  {
    id: 'safety',
    title: 'Safety & Compliance',
    icon: '🔒',
    deadline: 'Ongoing',
    items: [
      { id: 'gas_safe', title: 'Annual Gas Safe certificate', detail: 'Annual gas safety check by a Gas Safe registered engineer. Certificate must be given to tenants within 28 days.', required: true, govLink: 'https://www.gassaferegister.co.uk/' },
      { id: 'eicr', title: 'Electrical Installation Condition Report (EICR)', detail: 'EICR required every 5 years for all private rented properties. Must be provided to tenants before they move in.', required: true },
      { id: 'epc', title: 'EPC rating E or above', detail: 'Minimum EPC rating of E required for new tenancies. Government plans to raise this to C by 2030 — plan ahead.', required: true },
      { id: 'smoke', title: 'Smoke and CO alarms installed', detail: 'Smoke alarm on every floor, CO alarm in any room with solid fuel burning appliance. Check alarms at start of tenancy.', required: true },
      { id: 'hmo', title: 'HMO licence (if applicable)', detail: 'HMOs with 5+ people from 2+ households require a mandatory licence. Some councils require licences for smaller HMOs.', required: true },
    ]
  },
  {
    id: 'admin',
    title: 'Admin & Communication',
    icon: '📬',
    deadline: '1 May 2026',
    items: [
      { id: 'how_to_rent', title: 'Provide How to Rent guide', detail: 'Must give tenants the current How to Rent checklist at the start of their tenancy. Updated version must be re-issued when it changes.', required: true, govLink: 'https://www.gov.uk/government/publications/how-to-rent' },
      { id: 'written_statement', title: 'Provide written statement of tenancy terms', detail: 'Under the Renters Rights Act, all tenants must receive a written statement of their tenancy terms from day one.', required: true },
      { id: 'register', title: 'Prepare for the Landlord Register', detail: 'A new national landlord register is expected. Keep property and landlord details ready. Fines for non-registration will apply.', required: false },
      { id: 'ombudsman', title: 'Join a landlord redress scheme', detail: 'All private landlords will be required to join an Ombudsman scheme. The scheme will handle tenant complaints.', required: true },
    ]
  },
]

const STORAGE_KEY = 'rra_checklist_v1'

export default function RRAPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ tenancy: true })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setChecked(JSON.parse(saved))
    } catch {}
  }, [])

  function toggle(id: string) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const allItems = SECTIONS.flatMap(s => s.items)
  const required = allItems.filter(i => i.required)
  const doneCount = required.filter(i => checked[i.id]).length
  const pct = required.length > 0 ? Math.round((doneCount / required.length) * 100) : 0

  return (
    <Layout>
      <ProGate feature="RRA 2025 compliance checklist" description="Interactive checklist covering all Renters Rights Act obligations — Section 21 abolition, new eviction rules, rent increases and deposit caps." isPro={isPro} planLoading={planLoading}>
      <div className="p-6 md:p-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <Shield size={28} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Renters Rights Act 2025</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Key changes take effect <strong>1 May 2026</strong>. Work through this checklist to make sure you are compliant.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {doneCount} of {required.length} required items complete
            </span>
            <span className={`text-sm font-semibold ${pct === 100 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border, #e5e7eb)' }}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: pct + '%' }}
            />
          </div>
          {pct === 100 && (
            <p className="text-xs mt-2 text-green-500">✅ All required items marked complete — well done!</p>
          )}
        </div>

        {/* Warning banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-amber-800">
            This checklist is a guide only. Always verify your obligations with a qualified solicitor or the official government guidance. 
            LetFlow is not a legal adviser.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {SECTIONS.map(section => {
            const isOpen = expanded[section.id]
            const sectionDone = section.items.filter(i => i.required && checked[i.id]).length
            const sectionRequired = section.items.filter(i => i.required).length
            return (
              <div key={section.id} className="card overflow-hidden">
                <button
                  className="w-full px-5 py-4 flex items-center gap-3 hover:opacity-80 transition-opacity"
                  onClick={() => setExpanded(p => ({ ...p, [section.id]: !p[section.id] }))}
                >
                  <span className="text-lg">{section.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{section.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                        {section.deadline}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {sectionDone}/{sectionRequired} required done
                    </div>
                  </div>
                  {sectionDone === sectionRequired
                    ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    : isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                  }
                </button>

                {isOpen && (
                  <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                    {section.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`px-5 py-4 flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity ${idx < section.items.length - 1 ? 'border-b' : ''}`}
                        style={{ borderColor: 'var(--border)' }}
                        onClick={() => toggle(item.id)}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {checked[item.id]
                            ? <CheckCircle2 size={18} className="text-green-500" />
                            : <Circle size={18} style={{ color: 'var(--text-muted)' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${checked[item.id] ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--text-primary)' }}>
                              {item.title}
                            </span>
                            {!item.required && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.detail}</p>
                          {item.govLink && (
                            <a
                              href={item.govLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs mt-1.5 text-blue-500 hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={10} />
                              Official guidance
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
          Your progress is saved locally in your browser. Last updated April 2026.
        </p>
      </div>
      
      </ProGate>
    </Layout>
  )
}
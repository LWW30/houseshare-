import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Home, Users, Receipt, FileText, Building2, Menu, X,
  FolderOpen, UserCircle, Wrench, CreditCard, ShieldCheck,
  Landmark, ScrollText, BarChart3, Settings,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePlan } from '../lib/usePlan'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'

type Badge = 'New' | 'Pro' | 'Soon'

type NavItem = {
  href: string
  label: string
  icon: any
  badge?: Badge
}

const nav: NavItem[] = [
  { href: '/dashboard',             label: 'Overview',           icon: Home },
  { href: '/dashboard/properties',  label: 'Properties',         icon: Building2 },
  { href: '/dashboard/tenants',     label: 'Tenants',            icon: Users },
  { href: '/dashboard/payments',    label: 'Payments',           icon: Receipt },
  { href: '/dashboard/bills',       label: 'Shared Bills',       icon: FileText },
  { href: '/dashboard/expenses',    label: 'Expenses',           icon: Receipt },
  { href: '/dashboard/profit-loss', label: 'Profit & Loss',      icon: BarChart3 },
  { href: '/dashboard/mtd',         label: 'MTD Records',        icon: Receipt,    badge: 'New' },
  { href: '/dashboard/maintenance', label: 'Maintenance',        icon: Wrench },
  { href: '/dashboard/documents',   label: 'Documents',          icon: FolderOpen },
  { href: '/dashboard/compliance',  label: 'Certificates',       icon: ShieldCheck },
  { href: '/dashboard/agreements',  label: 'Agreements',         icon: FileText,   badge: 'Pro' },
  { href: '/dashboard/notices',     label: 'Legal Notices',      icon: ScrollText, badge: 'Pro' },
  { href: '/dashboard/referencing', label: 'Referencing',        icon: UserCircle },
  { href: '/dashboard/direct-debit',label: 'Direct Debit',       icon: Landmark,   badge: 'Soon' },
  { href: '/dashboard/rra',         label: 'RRA 2025',           icon: ShieldCheck, badge: 'Pro' },
  { href: '/dashboard/settings',    label: 'Settings',           icon: Settings },
  { href: '/dashboard/billing',     label: 'Billing',            icon: CreditCard },
  { href: '/dashboard/profile',     label: 'Profile',            icon: UserCircle },
]

const badgeStyles: Record<Badge, string> = {
  New:  'bg-amber-400 text-amber-900',
  Pro:  'bg-purple-500 text-white',
  Soon: 'bg-gray-600 text-gray-200',
}

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-500">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" fill="white"/>
        <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6"/>
        <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6"/>
        <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.3"/>
      </svg>
    </div>
    <span className="font-semibold text-sm tracking-tight">LetFlowUK</span>
  </div>
)

export default function Sidebar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { isPro } = usePlan()
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    async function fetchNotifs() {
      const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', user.id)
      if (!props?.length) return
      const ids = props.map((p: any) => p.id)
      const [{ data: payments }, { data: bills }, { data: docs }, { data: maint }] = await Promise.all([
        supabase.from('rent_payments').select('status').in('property_id', ids).in('status', ['overdue', 'late']),
        supabase.from('shared_bills').select('id, due_date').in('property_id', ids).eq('paid', false),
        supabase.from('compliance_documents').select('expiry_date').eq('landlord_id', user.id),
        supabase.from('maintenance_requests').select('id').in('property_id', ids).in('status', ['open', 'in_progress']),
      ])

      const overdueRent = (payments || []).filter((p: any) => p.status === 'overdue' || p.status === 'late').length
      const expiredDocs = (docs || []).filter((d: any) => new Date(d.expiry_date) < new Date()).length

      setNotifs({
        '/dashboard/payments': overdueRent,
        '/dashboard/bills': (bills || []).length,
        '/dashboard/compliance': expiredDocs,
        '/dashboard/maintenance': (maint || []).length,
      })
    }
    fetchNotifs()
  }, [user])

  const NavLinks = () => (
    <>
      {nav.map(({ href, label, icon: Icon, badge }) => {
        const notifCount = notifs[href] || 0
        const active = router.pathname === href || router.pathname.startsWith(href + '/')
        return (
          <Link
            key={href + label}
            href={href}
            onClick={() => setOpen(false)}
            className={
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ' +
              (active
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-white/5')
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {notifCount > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full font-bold leading-none flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center">
                {notifCount}
              </span>
            )}
            {badge && (
              <span className={'text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none flex-shrink-0 ' + badgeStyles[badge]}>
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed top-0 left-0 h-full bg-gray-900 text-white flex-col"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="px-5 py-6 border-b border-gray-800">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="px-4 py-4 border-t border-gray-800 space-y-2">
          {isPro ? (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-500 text-white">Pro</span>
              <span className="text-xs text-gray-500">Active</span>
            </div>
          ) : (
            <Link href="/dashboard/billing" className="flex items-center gap-2 group">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-300 group-hover:bg-gray-600 transition-colors">Free plan</span>
              <span className="text-xs text-gray-500 group-hover:text-gray-400">Upgrade</span>
            </Link>
          )}
          <div className="text-xs text-gray-500">UK HMO Landlord Portal</div>
        </div>
      </aside>

      {/* Mobile header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 flex items-center justify-between"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '12px' }}
      >
        <Logo />
        <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 left-0 h-full w-64 bg-gray-900 pt-16 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              <NavLinks />
            </nav>
            <div className="px-4 py-4 border-t border-gray-800">
              <div className="text-xs text-gray-500">UK HMO Landlord Portal</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

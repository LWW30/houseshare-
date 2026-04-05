import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Home, Users, Receipt, FileText, Building2,
  Menu, X, FolderOpen, UserCircle, Wrench,
  CreditCard, ShieldCheck, Landmark, ScrollText, BarChart3,
} from 'lucide-react'
import { useState } from 'react'

const nav = [
  { href: '/dashboard',              label: 'Overview',       icon: Home },
  { href: '/dashboard/properties',   label: 'Properties',     icon: Building2 },
  { href: '/dashboard/tenants',      label: 'Tenants',        icon: Users },
  { href: '/dashboard/payments',     label: 'Payments',       icon: Receipt },
  { href: '/dashboard/direct-debit', label: 'Direct Debit',   icon: Landmark,     badge: 'New' as const },
  { href: '/dashboard/bills',        label: 'Shared Bills',   icon: FileText },
  { href: '/dashboard/maintenance',  label: 'Maintenance',    icon: Wrench },
  { href: '/dashboard/documents',    label: 'Documents',      icon: FolderOpen },
  { href: '/dashboard/expenses',     label: 'Expenses',       icon: Receipt },
  { href: '/dashboard/profit-loss',  label: 'Profit & Loss',  icon: BarChart3 },
  { href: '/dashboard/notices',      label: 'Legal Notices',  icon: ScrollText,   badge: 'New' as const },
  { href: '/dashboard/billing',      label: 'Billing',        icon: CreditCard },
  { href: '/dashboard/profile',      label: 'Profile',        icon: UserCircle },
]

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
    <span className="font-semibold text-sm tracking-tight">LetFlow</span>
  </div>
)

export default function Sidebar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const NavLinks = () => (
    <>
      {nav.map(({ href, label, icon: Icon, badge }) => {
        const active = router.pathname === href || router.pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              active ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badge && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-400 text-amber-900 leading-none flex-shrink-0">
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
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">UK HMO Landlord Portal</div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
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
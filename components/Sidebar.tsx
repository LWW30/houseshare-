import { useRouter } from 'next/router'
import {
  Home, Users, Receipt, Building2,
  Menu, X, FolderOpen, UserCircle, Wrench,
  CreditCard, ShieldCheck, Landmark, ScrollText,
  BarChart3, FileText, UserCheck, Settings,
  Banknote, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { usePlan } from '../lib/usePlan'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'

function Logo() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
        <Building2 size={14} className="text-gray-900" />
      </div>
      <span className="font-semibold text-white text-sm">LetFlowUK</span>
    </div>
  )
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string | null
}

const NAV: NavItem[] = [
  { href: '/dashboard',             label: 'Overview',            icon: Home },
  { href: '/dashboard/properties',  label: 'Properties',          icon: Building2 },
  { href: '/dashboard/tenants',     label: 'Tenants',             icon: Users },
  { href: '/dashboard/referencing', label: 'Referencing',         icon: UserCheck },
  { href: '/dashboard/payments',    label: 'Payments',            icon: Receipt },
  { href: '/dashboard/direct-debit',label: 'Direct Debit',        icon: Banknote },
  { href: '/dashboard/bills',       label: 'Shared Bills',        icon: Landmark },
  { href: '/dashboard/maintenance', label: 'Maintenance',         icon: Wrench },
  { href: '/dashboard/documents',   label: 'Documents',           icon: FolderOpen },
  { href: '/dashboard/expenses',    label: 'Expenses',            icon: BarChart3 },
  { href: '/dashboard/profit-loss', label: 'Profit & Loss',       icon: BarChart3 },
  { href: '/dashboard/agreements',  label: 'Tenancy Agreements',  icon: FileText,    badge: 'Pro' },
  { href: '/dashboard/notices',     label: 'Legal Notices',       icon: ScrollText,  badge: 'Pro' },
  { href: '/dashboard/rra',         label: 'RRA 2025',            icon: ShieldCheck, badge: 'Pro' },
  { href: '/dashboard/billing',     label: 'Billing',             icon: CreditCard },
  { href: '/dashboard/settings',    label: 'Settings',            icon: Settings },
  { href: '/dashboard/profile',     label: 'Profile',             icon: UserCircle },
]

export default function Sidebar() {
  const router = useRouter()
  const { plan } = usePlan()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const isPro = plan === 'pro'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavLinks = () => (
    <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
      {NAV.map(item => {
        const isActive = item.href === '/dashboard'
          ? router.pathname === '/dashboard'
          : router.pathname.startsWith(item.href)
        const Icon = item.icon
        const locked = item.badge === 'Pro' && !isPro
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-white/15 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={15} className="flex-shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge === 'Pro' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                isPro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
              }`}>
                {isPro ? '⚡' : 'Pro'}
              </span>
            )}
            {item.href === '/dashboard/direct-debit' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 font-semibold">Soon</span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 flex items-center justify-between" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '12px' }}>
        <Logo />
        <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-gray-900 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 44px))' }}>
        <NavLinks />
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-1.5 text-xs text-gray-500">{user?.email}</div>
          <div className="mt-1 px-3 py-1.5 flex items-center justify-between">
            <span className={`text-xs font-semibold ${isPro ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isPro ? '⚡ Pro · Active' : 'Free plan'}
            </span>
            {!isPro && (
              <Link href="/dashboard/billing" onClick={() => setOpen(false)} className="text-xs text-blue-400 hover:text-blue-300">Upgrade ↗</Link>
            )}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0 bg-gray-900 min-h-screen">
        <div className="p-3 border-b border-white/10">
          <Logo />
        </div>
        <NavLinks />
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-1 text-xs text-gray-500 truncate">{user?.email}</div>
          <div className="mt-1 px-3 py-1 flex items-center justify-between">
            <span className={`text-xs font-semibold ${isPro ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isPro ? '⚡ Pro · Active' : 'Free plan'}
            </span>
            {!isPro && (
              <Link href="/dashboard/billing" className="text-xs text-blue-400 hover:text-blue-300">Upgrade ↗</Link>
            )}
          </div>
          <p className="px-3 py-1 text-[10px] text-gray-600">UK HMO Landlord Portal</p>
        </div>
      </aside>

      {/* Mobile content offset */}
      <div className="md:hidden" style={{ height: 'max(56px, calc(env(safe-area-inset-top) + 44px))' }} />
    </>
  )
}
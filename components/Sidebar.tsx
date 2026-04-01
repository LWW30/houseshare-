import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Users, Receipt, FileText, Building2, Menu, X, FolderOpen, UserCircle } from 'lucide-react'
import { useState } from 'react'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/payments', label: 'Payments', icon: Receipt },
  { href: '/dashboard/bills', label: 'Shared Bills', icon: FileText },
  { href: '/dashboard/documents', label: 'Documents', icon: FolderOpen },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
]

export default function Sidebar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const NavLinks = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = router.pathname === href || router.pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              active ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      <aside className="hidden md:flex fixed top-0 left-0 h-full bg-gray-900 text-white flex-col" style={{ width: 'var(--sidebar-width)' }}>
        <div className="px-5 py-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">HouseShare</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavLinks />
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">UK Landlord Portal</div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">HouseShare</span>
        </div>
        <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div className="absolute top-0 left-0 h-full w-64 bg-gray-900 pt-16 px-3 py-4" onClick={e => e.stopPropagation()}>
            <nav className="space-y-0.5"><NavLinks /></nav>
            <div className="px-3 py-4 mt-4 border-t border-gray-800">
              <div className="text-xs text-gray-500">UK Landlord Portal</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

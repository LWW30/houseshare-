import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Home, Users, Receipt, FileText, Building2,
  Menu, X, FolderOpen, UserCircle, Wrench,
  CreditCard, ShieldCheck, Landmark, ScrollText, BarChart3, Settings,
} from 'lucide-react'
import { useState } from 'react'
import { usePlan } from '../lib/usePlan'


type Badge = 'New' | 'Pro' | 'Soon'


const nav: { href: string; label: string; icon: any; badge?: Badge }[] = [
  { href: '/dashboard',             label: 'Overview',       icon: Home },
  { href: '/dashboard/properties',  label: 'Properties',     icon: Building2 },
  { href: '/dashboard/tenants',     label: 'Tenants',        icon: Users },
  { href: '/dashboard/agreements', label: 'Agreements',    icon: FileText,  badge: 'Pro' as Badge },
  { href: '/dashboard/referencing', label: 'Referencing',    icon: UserCircle,  badge: null },
  { href: '/dashboard/payments',    label: 'Payments',       icon: Receipt },
  { href: '/dashboard/direct-debit',label: 'Direct Debit',   icon: Landmark,    badge: 'Soon' },
  { href: '/dashboard/bills',       label: 'Shared Bills',   icon: FileText },
  { href: '/dashboard/maintenance', label: 'Maintenance',    icon: Wrench },
  { href: '/dashboard/documents',   label: 'Documents',      icon: FolderOpen },
  { href: '/dashboard/expenses',    label: 'Expenses',       icon: Receipt },
  { href: '/dashboard/profit-loss', label: 'Profit & Loss',  icon: BarChart3 },
  { href: '/dashboard/mtd',          label: 'MTD Records',    icon: Receipt,     badge: 'New' as Badge },
  { href: '/dashboard/notices',     label: 'Legal Notices',  icon: ScrollText,  badge: 'Pro' },
  { href: '/dashboard/agreements',  label: 'Tenancy Agreements', icon: FileText, badge: 'Pro' },
  { href: '/dashboard/compliance', label: 'Certificates',   icon: ShieldCheck, badge: null },
  { href: '/dashboard/rra',         label: 'RRA 2025',       icon: ShieldCheck, badge: 'Pro' },
  { href: '/dashboard/settings',    label: 'Settings',        icon: Settings,    badge: null },
  { href: '/dashboard/billing',     label: 'Billing',        icon: CreditCard },
  { href: '/dashboard/profile',     label: 'Profile',        icon: UserCircle },
]


const badgeStyles: Record<Badge, string> = {
  New:  'bg-amber-400 text-amber-900',

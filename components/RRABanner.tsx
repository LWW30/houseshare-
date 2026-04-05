import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShieldCheck, X, Clock } from 'lucide-react'

const DISMISS_KEY = 'rra_banner_dismissed_v1'
const RRA_DATE = new Date('2026-05-01T00:00:00Z')

export default function RRABanner() {
  const [dismissed, setDismissed] = useState(true)
  const [daysLeft, setDaysLeft] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDismissed = localStorage.getItem(DISMISS_KEY) === '1'
    setDismissed(isDismissed)
    const diff = RRA_DATE.getTime() - Date.now()
    setDaysLeft(Math.max(0, Math.floor(diff / 86400000)))
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (!mounted || dismissed || daysLeft <= 0) return null

  const isUrgent = daysLeft <= 14

  return (
    <div className={`mb-6 rounded-2xl px-5 py-4 flex items-center gap-4 border ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-amber-100'}`}>
        <ShieldCheck size={17} className={isUrgent ? 'text-red-600' : 'text-amber-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-sm font-semibold ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
            Renters Rights Act 2025 takes effect in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            <Clock size={10} />
            1 May 2026
          </span>
        </div>
        <p className={`text-xs leading-relaxed ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
          Section 21 abolished. New rules on eviction, rent increases, pets and deposits.{' '}
          <Link href="/dashboard/notices" className="underline font-medium hover:no-underline">
            Check your compliance checklist
          </Link>
        </p>
      </div>
      <button
        onClick={dismiss}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isUrgent ? 'hover:bg-red-100 text-red-400' : 'hover:bg-amber-100 text-amber-400'}`}
      >
        <X size={15} />
      </button>
    </div>
  )
}
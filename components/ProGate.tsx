import { useRouter } from 'next/router'
import { Zap } from 'lucide-react'

interface ProGateProps {
  feature: string
  description: string
  children: React.ReactNode
  isPro: boolean
  planLoading: boolean
}

export function ProGate({ feature, description, children, isPro, planLoading }: ProGateProps) {
  const router = useRouter()

  if (planLoading) return null

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-5">
          <Zap size={22} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {feature} is a Pro feature
        </h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <button
          onClick={() => router.push('/dashboard/billing')}
          className="btn-primary flex items-center gap-2 px-6 py-2.5"
        >
          <Zap size={14} />
          Upgrade to Pro — £19/mo
        </button>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          14-day free trial · Cancel any time
        </p>
      </div>
    )
  }

  return <>{children}</>
}

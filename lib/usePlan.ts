import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth'

export type Plan = 'free' | 'pro'

export function usePlan() {
  const { user, loading: authLoading } = useAuth()
  const [plan, setPlan] = useState<Plan>('free')
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setPlanLoading(false); return }

    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setPlan((data?.plan as Plan) || 'free')
        setPlanLoading(false)
      })
  }, [user, authLoading])

  const isPro = plan === 'pro'
  return { plan, isPro, planLoading }
}

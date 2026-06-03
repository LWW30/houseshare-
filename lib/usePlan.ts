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
    if (!user) {
      setPlanLoading(false)
      return
    }

    async function fetchPlan() {
      // Developer override — always Pro for owner account
      if (user?.email === 'lukewwalker12@gmail.com') {
        setPlan('pro')
        setPlanLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user!.id)
          .maybeSingle()

        if (error) {
          // Table might not have row yet — default to free
          setPlan('free')
        } else if (!data) {
          // No profile row — create one with defaults
          await supabase.from('profiles').upsert({
            id: user!.id,
            plan: 'free',
          })
          setPlan('free')
        } else {
          setPlan((data.plan as Plan) || 'free')
        }
      } catch {
        setPlan('free')
      } finally {
        setPlanLoading(false)
      }
    }

    fetchPlan()
  }, [user, authLoading])

  const isPro = plan === 'pro'
  return { plan, isPro, planLoading }
}

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth(redirectIfNoAuth = true) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
      if (!user && redirectIfNoAuth) {
        router.replace('/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user && redirectIfNoAuth) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

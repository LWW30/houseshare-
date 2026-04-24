import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOTAL_FOUNDING_SPOTS = 50

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_price_id', process.env.STRIPE_FOUNDING_PRICE_ID || '')

    const used = count ?? 0
    const spots = Math.max(0, TOTAL_FOUNDING_SPOTS - used)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    res.json({ spots, used, total: TOTAL_FOUNDING_SPOTS })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

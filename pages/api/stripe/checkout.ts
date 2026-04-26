import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const PRICE_IDS: Record<string, string> = {
  monthly:  process.env.STRIPE_PRO_MONTHLY_PRICE_ID  || process.env.STRIPE_PRO_PRICE_ID || '',
  annual:   process.env.STRIPE_PRO_ANNUAL_PRICE_ID   || '',
  founding: process.env.STRIPE_FOUNDING_PRICE_ID     || '',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    let userEmail: string | undefined
    let userId: string | undefined

    // Try Bearer token first (localStorage-based auth)
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data, error } = await supabaseAnon.auth.getUser(token)
      if (!error && data.user) {
        userEmail = data.user.email
        userId = data.user.id
      }
    }

    // Fallback: cookie-based session
    if (!userId) {
      const supabase = createPagesServerClient({ req, res })
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        userEmail = session.user.email
        userId = session.user.id
      }
    }

    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    const { plan = 'monthly' } = req.body as { plan?: string }
    const priceId = PRICE_IDS[plan] || PRICE_IDS.monthly
    if (!priceId) return res.status(400).json({ error: 'Price not configured for: ' + plan })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.letflowuk.com'
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl + '/dashboard/billing?success=1',
      cancel_url: appUrl + '/dashboard/billing',
      allow_promotion_codes: true,
      metadata: { supabase_user_id: userId, plan },
      subscription_data: { metadata: { supabase_user_id: userId, plan } },
    })
    res.json({ url: checkoutSession.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

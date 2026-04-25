import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const PRICE_IDS: Record<string, string> = {
  monthly:  process.env.STRIPE_PRO_MONTHLY_PRICE_ID  || process.env.STRIPE_PRO_PRICE_ID || '',
  annual:   process.env.STRIPE_PRO_ANNUAL_PRICE_ID   || '',
  founding: process.env.STRIPE_FOUNDING_PRICE_ID     || '',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    // Get user from Bearer token (sent by billing page)
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) return res.status(401).json({ error: 'Not authenticated — no token provided' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Invalid session — please sign in again' })

    const { plan = 'monthly' } = req.body as { plan?: string }
    const priceId = PRICE_IDS[plan] || PRICE_IDS.monthly

    if (!priceId) {
      return res.status(400).json({ error: 'Price not configured for plan: ' + plan + '. Contact support.' })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.letflowuk.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl + '/dashboard/billing?success=1',
      cancel_url: appUrl + '/dashboard/billing',
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
      allow_promotion_codes: true,
    })

    res.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

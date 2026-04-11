import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const supabase = createServerSupabaseClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return res.status(401).json({ error: 'Not authenticated' })

    const appUrl = 'https://houseshare-five.vercel.app'

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing`,
      metadata: { supabase_user_id: session.user.id },
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: session.user.id },
      },
    })

    res.json({ url: checkoutSession.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

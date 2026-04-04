import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabase = createServerSupabaseClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_PRO_PRICE_ID,
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?cancelled=1`,
    customer_email: session.user.email,
    client_reference_id: session.user.id,
    metadata: { user_id: session.user.id },
    subscription_data: {
      trial_period_days: 30,
      metadata: { user_id: session.user.id },
    },
  })

  res.json({ url: checkoutSession.url })
}
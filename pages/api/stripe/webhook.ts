import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req as any) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']!
  const rawBody = await getRawBody(req)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      await supabaseAdmin.from('profiles').upsert({
        id: session.metadata!.user_id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items.data[0].price.id,
        plan: 'pro',
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        subscription_status: sub.status,
      })
    } else if (['customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      const sub = event.data.object as Stripe.Subscription
      const isActive = ['active', 'trialing'].includes(sub.status)
      await supabaseAdmin.from('profiles')
        .update({ plan: isActive ? 'pro' : 'free', subscription_status: sub.status })
        .eq('stripe_customer_id', sub.customer as string)
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }

  res.json({ received: true })
}
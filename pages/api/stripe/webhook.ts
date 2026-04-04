import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function buffer(readable: NextApiRequest) {
  const chunks: Buffer[] = []
  for await (const chunk of readable as any) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  const sig = req.headers['stripe-signature']!
  const buf = await buffer(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const session = event.data.object as any

  switch (event.type) {
    case 'checkout.session.completed': {
      const subscription = await stripe.subscriptions.retrieve(session.subscription)
      await supabaseAdmin.from('profiles').upsert({
        id: session.metadata.user_id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_price_id: subscription.items.data[0].price.id,
        plan: 'pro',
        trial_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
        subscription_status: subscription.status,
      })
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const isActive = ['active', 'trialing'].includes(sub.status)
      await supabaseAdmin.from('profiles')
        .update({
          plan: isActive ? 'pro' : 'free',
          subscription_status: sub.status,
          stripe_subscription_id: sub.id,
        })
        .eq('stripe_customer_id', sub.customer)
      break
    }
  }

  res.json({ received: true })
}
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const GC_BASE = 'https://api.gocardless.com'
const GC_HEADERS = { 'Authorization': `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json' }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { rent_payment_id } = req.body
  if (!rent_payment_id) return res.status(400).json({ error: 'rent_payment_id required' })

  try {
    const { data: payment, error: paymentError } = await supabaseAdmin.from('rent_payments').select('*, tenant:tenants(*, room:rooms(name))').eq('id', rent_payment_id).single()
    if (paymentError || !payment) return res.status(404).json({ error: 'Payment not found' })

    const tenant = payment.tenant as any
    if (!tenant?.gc_mandate_id || !tenant?.dd_mandate_active) return res.status(400).json({ error: 'Tenant does not have an active Direct Debit mandate' })
    if (payment.status === 'paid') return res.status(400).json({ error: 'Payment already marked as paid' })

    const gcRes = await fetch(`${GC_BASE}/payments`, { method: 'POST', headers: GC_HEADERS, body: JSON.stringify({ payments: { amount: Math.round(payment.amount * 100), currency: 'GBP', description: `Rent - ${tenant.room?.name} - ${payment.due_date}`, metadata: { rent_payment_id, tenant_id: tenant.id }, links: { mandate: tenant.gc_mandate_id } } }) })
    const gcData = await gcRes.json()
    if (!gcRes.ok) throw new Error(gcData.error?.message || 'Failed to create GoCardless payment')

    await supabaseAdmin.from('dd_payments').insert({ rent_payment_id, tenant_id: tenant.id, gc_payment_id: gcData.payments.id, amount: payment.amount, status: 'pending_submission', gc_charge_date: gcData.payments.charge_date })
    await supabaseAdmin.from('rent_payments').update({ status: 'pending', notes: `DD submitted — charge date: ${gcData.payments.charge_date}` }).eq('id', rent_payment_id)

    return res.status(200).json({ success: true, gc_payment_id: gcData.payments.id, charge_date: gcData.payments.charge_date })
  } catch (err: any) {
    console.error('GoCardless collect-payment error:', err)
    return res.status(500).json({ error: err.message })
  }
}

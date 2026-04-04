import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const config = { api: { bodyParser: false } }
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req as any) { chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk) }
  return Buffer.concat(chunks).toString('utf8')
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try { return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature)) } catch { return false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const signature = req.headers['webhook-signature'] as string
  if (!signature) return res.status(400).json({ error: 'Missing signature' })
  const rawBody = await getRawBody(req)
  if (!verifySignature(rawBody, signature, process.env.GOCARDLESS_WEBHOOK_SECRET!)) return res.status(498).json({ error: 'Invalid signature' })

  let payload: any
  try { payload = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  for (const event of payload.events || []) {
    try { await processEvent(event) } catch (err) { console.error('Error processing GC event:', event.id, err) }
  }
  return res.status(200).json({ success: true })
}

async function processEvent(event: any) {
  const { resource_type, action, links } = event

  if (resource_type === 'mandates') {
    const mandateId = links?.mandate
    if (action === 'created' || action === 'active') {
      const { data: mandate } = await supabaseAdmin.from('dd_mandates').select('id, tenant_id').eq('gc_mandate_id', mandateId).maybeSingle()
      if (!mandate) {
        const { data: byRequest } = await supabaseAdmin.from('dd_mandates').select('id, tenant_id').eq('gc_billing_request_id', links?.billing_request).maybeSingle()
        if (byRequest) {
          await supabaseAdmin.from('dd_mandates').update({ gc_mandate_id: mandateId, status: 'active' }).eq('id', byRequest.id)
          await supabaseAdmin.from('tenants').update({ dd_mandate_active: true, gc_mandate_id: mandateId }).eq('id', byRequest.tenant_id)
        }
      } else {
        await supabaseAdmin.from('dd_mandates').update({ status: 'active' }).eq('id', mandate.id)
        await supabaseAdmin.from('tenants').update({ dd_mandate_active: true }).eq('id', mandate.tenant_id)
      }
    }
    if (['cancelled', 'failed', 'expired'].includes(action)) {
      await supabaseAdmin.from('dd_mandates').update({ status: action }).eq('gc_mandate_id', mandateId)
      await supabaseAdmin.from('tenants').update({ dd_mandate_active: false }).eq('gc_mandate_id', mandateId)
    }
  }

  if (resource_type === 'payments') {
    const gcPaymentId = links?.payment
    if (action === 'confirmed' || action === 'paid_out') {
      const { data: ddPayment } = await supabaseAdmin.from('dd_payments').select('rent_payment_id').eq('gc_payment_id', gcPaymentId).maybeSingle()
      if (ddPayment?.rent_payment_id) {
        await supabaseAdmin.from('rent_payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', ddPayment.rent_payment_id)
        await supabaseAdmin.from('dd_payments').update({ status: 'confirmed' }).eq('gc_payment_id', gcPaymentId)
      }
    }
    if (['failed', 'cancelled', 'charged_back'].includes(action)) {
      const { data: ddPayment } = await supabaseAdmin.from('dd_payments').select('rent_payment_id').eq('gc_payment_id', gcPaymentId).maybeSingle()
      if (ddPayment?.rent_payment_id) {
        await supabaseAdmin.from('rent_payments').update({ status: 'overdue' }).eq('id', ddPayment.rent_payment_id)
        await supabaseAdmin.from('dd_payments').update({ status: action }).eq('gc_payment_id', gcPaymentId)
      }
    }
  }
}

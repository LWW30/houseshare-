import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const GC_BASE = 'https://api.gocardless.com'
const GC_HEADERS = { 'Authorization': `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json' }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { tenant_id } = req.body
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' })

  try {
    const { data: tenant, error: tenantError } = await supabaseAdmin.from('tenants').select('*, room:rooms(monthly_rent, name), property:properties(address)').eq('id', tenant_id).single()
    if (tenantError || !tenant) return res.status(404).json({ error: 'Tenant not found' })

    let gcCustomerId = tenant.gc_customer_id
    if (!gcCustomerId) {
      const customerRes = await fetch(`${GC_BASE}/customers`, { method: 'POST', headers: GC_HEADERS, body: JSON.stringify({ customers: { email: tenant.email, given_name: tenant.name.split(' ')[0], family_name: tenant.name.split(' ').slice(1).join(' ') || tenant.name.split(' ')[0], metadata: { tenant_id } } }) })
      const customerData = await customerRes.json()
      if (!customerRes.ok) throw new Error(customerData.error?.message || 'Failed to create GoCardless customer')
      gcCustomerId = customerData.customers.id
      await supabaseAdmin.from('tenants').update({ gc_customer_id: gcCustomerId }).eq('id', tenant_id)
    }

    const billingReqRes = await fetch(`${GC_BASE}/billing_requests`, { method: 'POST', headers: GC_HEADERS, body: JSON.stringify({ billing_requests: { mandate_request: { scheme: 'bacs', metadata: { tenant_id } }, links: { customer: gcCustomerId } } }) })
    const billingReqData = await billingReqRes.json()
    if (!billingReqRes.ok) throw new Error(billingReqData.error?.message || 'Failed to create billing request')

    const flowRes = await fetch(`${GC_BASE}/billing_request_flows`, { method: 'POST', headers: GC_HEADERS, body: JSON.stringify({ billing_request_flows: { redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/direct-debit?dd_setup=success`, exit_uri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/direct-debit?dd_setup=cancelled`, prefilled_customer: { email: tenant.email, given_name: tenant.name.split(' ')[0], family_name: tenant.name.split(' ').slice(1).join(' ') || '' }, links: { billing_request: billingReqData.billing_requests.id } } }) })
    const flowData = await flowRes.json()
    if (!flowRes.ok) throw new Error(flowData.error?.message || 'Failed to create billing request flow')

    await supabaseAdmin.from('dd_mandates').insert({ tenant_id, gc_billing_request_id: billingReqData.billing_requests.id, status: 'pending_setup', monthly_amount: tenant.room?.monthly_rent || 0 })

    return res.status(200).json({ authorisation_url: flowData.billing_request_flows.authorisation_url, billing_request_id: billingReqData.billing_requests.id })
  } catch (err: any) {
    console.error('GoCardless create-mandate error:', err)
    return res.status(500).json({ error: err.message })
  }
}

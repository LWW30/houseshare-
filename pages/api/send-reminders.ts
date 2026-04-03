import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Basic auth check - only allow internal calls
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const today = new Date()
    const month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0')

    // Get all due-soon and overdue payments with tenant email
    const { data: payments, error } = await supabase
      .from('rent_payments')
      .select(`
        id, amount, status, due_date,
        tenant:tenants(name, email),
        room:rooms(name, property:properties(address))
      `)
      .in('status', ['due_soon', 'overdue'])
      .gte('due_date', month + '-01')

    if (error) throw error

    const results = []
    for (const payment of payments || []) {
      const tenant = payment.tenant as any
      if (!tenant?.email || !tenant.email.includes('@')) continue

      const isOverdue = payment.status === 'overdue'
      const subject = isOverdue
        ? `Overdue rent reminder — ${tenant.name}`
        : `Rent due soon — ${tenant.name}`

      const body = isOverdue
        ? `Hi ${tenant.name},\n\nYour rent of £${payment.amount} is now overdue. Please pay as soon as possible to avoid any issues.\n\nProperty: ${(payment.room as any)?.property?.address}\nRoom: ${(payment.room as any)?.name}\nAmount: £${payment.amount}\n\nIf you've already paid, please ignore this message.\n\nThanks`
        : `Hi ${tenant.name},\n\nThis is a reminder that your rent of £${payment.amount} is due soon.\n\nProperty: ${(payment.room as any)?.property?.address}\nRoom: ${(payment.room as any)?.name}\nAmount: £${payment.amount}\nDue: ${payment.due_date}\n\nIf you've already paid, please ignore this message.\n\nThanks`

      // Log the reminder (in production, integrate Resend/SendGrid here)
      const { error: logError } = await supabase
        .from('reminder_logs')
        .insert({
          tenant_id: (payment.tenant as any)?.id,
          payment_id: payment.id,
          type: isOverdue ? 'overdue' : 'due_soon',
          sent_at: new Date().toISOString(),
        })

      results.push({ tenant: tenant.name, status: payment.status, logged: !logError })
    }

    return res.status(200).json({ 
      success: true, 
      processed: results.length,
      results 
    })
  } catch (error: any) {
    console.error('Reminder error:', error)
    return res.status(500).json({ error: error.message })
  }
}